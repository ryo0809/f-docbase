// テスト用のメモリ上の実装。D1 の代わりに、use case と HTTP をそのまま動かすために使う。

import type { Dependencies } from "../../src/container";
import { Asset } from "../../src/domain/asset/asset";
import type { AssetRepository } from "../../src/domain/asset/asset-repository";
import { Document, type DocumentSummary } from "../../src/domain/document/document";
import { DocumentId } from "../../src/domain/document/document-id";
import type { DocumentRepository } from "../../src/domain/document/document-repository";
import type { FolderPath } from "../../src/domain/folder/folder-path";
import type { FolderRepository } from "../../src/domain/folder/folder-repository";
import { ConflictError, NotFoundError } from "../../src/domain/shared/errors";
import type { User } from "../../src/domain/user/user";
import type { UserRepository } from "../../src/domain/user/user-repository";
import type { Username } from "../../src/domain/user/username";
import { HmacSessionTokenService } from "../../src/infrastructure/crypto/hmac-session-token-service";
import { Pbkdf2PasswordHasher } from "../../src/infrastructure/crypto/pbkdf2-password-hasher";
import { BundledTemplateCatalog } from "../../src/infrastructure/system";

export class InMemoryUsers implements UserRepository {
  readonly rows = new Map<string, User>();

  async find(username: Username) {
    return this.rows.get(username.value) ?? null;
  }
  async list() {
    return [...this.rows.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  async count() {
    return this.rows.size;
  }
  async countOwners() {
    return [...this.rows.values()].filter((u) => u.isOwner()).length;
  }
  async add(user: User) {
    if (this.rows.has(user.username.value)) throw new ConflictError("そのユーザー名はすでに使われています");
    this.rows.set(user.username.value, user);
  }
  async addIfEmpty(user: User) {
    if (this.rows.size > 0) return false;
    this.rows.set(user.username.value, user);
    return true;
  }
  async update(user: User) {
    this.rows.set(user.username.value, user);
  }
  async remove(username: Username) {
    this.rows.delete(username.value);
  }
}

/** ドキュメントとフォルダは、フォルダの名称変更で一緒に動くため、同じ入れ物で持つ。 */
export class InMemoryContent implements DocumentRepository, FolderRepository {
  readonly docs = new Map<string, Document>();
  /** パス → 並び順 */
  readonly folders = new Map<string, number>();

  async list(): Promise<DocumentSummary[]> {
    return [...this.docs.values()].map((d) => d.toSummary()).sort((a, b) => a.id.value.localeCompare(b.id.value));
  }
  async find(id: DocumentId) {
    return this.docs.get(id.value) ?? null;
  }
  async exists(id: DocumentId) {
    return this.docs.has(id.value);
  }
  async insert(doc: Document) {
    if (this.docs.has(doc.id.value)) throw new ConflictError("同名のドキュメントが既に存在します");
    this.docs.set(doc.id.value, doc);
  }
  async update(doc: Document, previousId: DocumentId = doc.id) {
    if (!this.docs.has(previousId.value)) throw new NotFoundError("ドキュメントが見つかりません");
    this.docs.delete(previousId.value);
    this.docs.set(doc.id.value, doc);
  }
  async delete(id: DocumentId) {
    return this.docs.delete(id.value);
  }

  async setOrder(ids: DocumentId[] | FolderPath[]) {
    // DocumentRepository と FolderRepository の両方に setOrder があるため、型で振り分ける
    ids.forEach((x, i) => {
      if ("folder" in x) {
        const doc = this.docs.get(x.value);
        if (doc) this.docs.set(x.value, Document.restore({ ...doc.toSummary(), content: doc.content, sortOrder: i + 1 }));
      } else {
        if (!this.folders.has(x.value)) this.folders.set(x.value, 0);
        this.folders.set(x.value, i + 1);
      }
    });
  }

  async listExplicit() {
    return [...this.folders].map(([path, order]) => ({ path, order }));
  }
  async add(path: FolderPath) {
    if (!this.folders.has(path.value)) this.folders.set(path.value, 0);
  }
  async remove(path: FolderPath) {
    this.folders.delete(path.value);
  }
  async rename(from: FolderPath, to: FolderPath) {
    const parentOf = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
    const move = (p: string) => (p === from.value || p.startsWith(from.value + "/") ? to.value + p.slice(from.value.length) : p);
    const folders = [...this.folders].map(([p, order]) => [move(p), order] as const);
    this.folders.clear();
    folders.forEach(([p, order]) => this.folders.set(p, p === to.value && parentOf(from.value) !== parentOf(to.value) ? 0 : order));
    for (const [id, doc] of [...this.docs]) {
      const next = move(id);
      if (next !== id) {
        this.docs.delete(id);
        // フォルダごとの移動では、配下のドキュメントの並び順を保つ
        this.docs.set(next, Document.restore({ ...doc.toSummary(), id: DocumentId.create(next), content: doc.content }));
      }
    }
  }
}

export class InMemoryAssets implements AssetRepository {
  readonly rows = new Map<string, Asset>();

  async add(asset: Asset) {
    this.rows.set(asset.name, asset);
  }
  async find(name: string) {
    return this.rows.get(name) ?? null;
  }
}

/** 時刻を進められる時計 */
export class FakeClock {
  constructor(private current = new Date("2026-10-06T00:00:00.000Z")) {}
  now() {
    return this.current;
  }
  advance(ms: number) {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export function createTestDependencies(): Dependencies & { users: InMemoryUsers; content: InMemoryContent; clock: FakeClock } {
  const content = new InMemoryContent();
  const clock = new FakeClock();
  let n = 0;
  return {
    users: new InMemoryUsers(),
    documents: content,
    folders: content,
    content,
    assets: new InMemoryAssets(),
    // テストでは反復回数を減らして速くする
    hasher: new Pbkdf2PasswordHasher(1000),
    tokens: new HmacSessionTokenService({ get: async () => "test-secret-test-secret" }, clock),
    templates: new BundledTemplateCatalog(),
    clock,
    ids: { next: () => `id${++n}` },
  };
}
