import { describe, expect, it } from "vitest";
import { compareByOrder } from "@f-docbase/shared";
import { Asset, MAX_ASSET_BYTES } from "../src/domain/asset/asset";
import { Document } from "../src/domain/document/document";
import { DocumentId } from "../src/domain/document/document-id";
import { FolderPath } from "../src/domain/folder/folder-path";
import { deriveFolders } from "../src/domain/folder/folder-tree";
import { ConflictError, ValidationError } from "../src/domain/shared/errors";
import { User } from "../src/domain/user/user";
import { Username } from "../src/domain/user/username";

const now = new Date("2026-10-06T00:00:00.000Z");

describe("DocumentId", () => {
  it("正規化する(区切り・.md・前後の /)", () => {
    expect(DocumentId.create("\\要件定義書\\EC.md").value).toBe("要件定義書/EC");
    expect(DocumentId.create("/a/b/").value).toBe("a/b");
  });

  it.each(["", "..", "a/../b", "a//b", "a/./b", "assets/x", "a\u0000b"])("不正なパスを拒否する: %j", (raw) => {
    expect(() => DocumentId.create(raw)).toThrow(ValidationError);
  });

  it("フォルダと名前を取り出せる", () => {
    const id = DocumentId.create("a/b/c");
    expect(id.folder).toBe("a/b");
    expect(id.name).toBe("c");
    expect(DocumentId.create("c").folder).toBe("");
  });
});

describe("Document", () => {
  const id = DocumentId.create("a/doc");

  it("タイトルが空なら名前を使い、タグを整える", () => {
    const doc = Document.create(id, { title: "  ", tags: [" x ", "x", ""], content: "" }, now);
    expect(doc.title).toBe("doc");
    expect(doc.tags).toEqual(["x"]);
  });

  it("本文が長すぎると拒否する", () => {
    expect(() => Document.create(id, { title: "t", tags: [], content: "a".repeat(400_001) }, now)).toThrow(ValidationError);
  });

  it("移動では更新日時を変えず、タイトルが変わったときだけ更新する", () => {
    const later = new Date(now.getTime() + 1000);
    const doc = Document.create(id, { title: "t", tags: [], content: "" }, now);
    expect(doc.moveTo(DocumentId.create("b/doc")).updatedAt).toEqual(now);
    expect(doc.retitle("t", later).updatedAt).toEqual(now);
    expect(doc.retitle("u", later).updatedAt).toEqual(later);
  });
});

describe("FolderPath / deriveFolders", () => {
  it("assets は予約済み", () => {
    expect(() => FolderPath.create("assets")).toThrow(ValidationError);
  });

  it("配下かどうかを判定する", () => {
    expect(FolderPath.create("a/b").isInside(FolderPath.create("a"))).toBe(true);
    expect(FolderPath.create("ab").isInside(FolderPath.create("a"))).toBe(false);
    expect(FolderPath.create("a").isInside(FolderPath.create("a"))).toBe(false);
  });

  it("空フォルダと、ドキュメントの親フォルダ(祖先を含む)をまとめる", () => {
    expect(deriveFolders([{ path: "empty/deep", order: 0 }], ["a/b/doc", "a/other", "root"])).toEqual([
      { path: "a", docCount: 2, order: 0 },
      { path: "a/b", docCount: 1, order: 0 },
      { path: "empty", docCount: 0, order: 0 },
      { path: "empty/deep", docCount: 0, order: 0 },
    ]);
  });

  it("保存されている並び順を、フォルダに付ける(祖先として導かれたものにも)", () => {
    const tree = deriveFolders(
      [
        { path: "a", order: 2 },
        { path: "a/b", order: 1 },
      ],
      ["a/b/doc"],
    );
    expect(tree).toEqual([
      { path: "a", docCount: 1, order: 2 },
      { path: "a/b", docCount: 1, order: 1 },
    ]);
  });
});

describe("並び順", () => {
  const items = (...xs: [string, number][]) => xs.map(([name, order]) => ({ name, order }));

  it("設定済みは昇順で先に、未設定(0)は、その後ろに名前順で並べる", () => {
    const sorted = items(["b", 0], ["c", 2], ["a", 0], ["d", 1]).sort(compareByOrder);
    expect(sorted.map((x) => x.name)).toEqual(["d", "c", "a", "b"]);
  });

  it("別のフォルダへ移すと並び順が未設定に戻り、同じフォルダでの名称変更では保たれる", () => {
    const base = Document.create(DocumentId.create("a/doc"), { title: "t", tags: [], content: "" }, now);
    const ordered = Document.restore({ ...base.toSummary(), content: "", sortOrder: 3 });
    expect(ordered.moveTo(DocumentId.create("a/renamed")).sortOrder).toBe(3);
    expect(ordered.moveTo(DocumentId.create("b/doc")).sortOrder).toBe(0);
    expect(ordered.edit({ title: "u", tags: [], content: "x" }, now).sortOrder).toBe(3);
  });
});

describe("User", () => {
  const owner = User.register(Username.create("alice"), "owner", "h", now);

  it("ユーザー名の形式を検証する", () => {
    expect(() => Username.create("ab")).toThrow(ValidationError);
    expect(() => Username.create("a b c")).toThrow(ValidationError);
    expect(Username.tryCreate("ab")).toBeNull();
  });

  it("最後のオーナーは降格も削除もできない", () => {
    expect(() => owner.withRole("viewer", 1)).toThrow(ConflictError);
    expect(() => owner.assertRemovable(1)).toThrow(ConflictError);
    expect(owner.withRole("viewer", 2).role).toBe("viewer");
    expect(() => owner.assertRemovable(2)).not.toThrow();
  });
});

describe("Asset", () => {
  const bytes = new Uint8Array([1, 2, 3]);

  it("拡張子で種類を決める", () => {
    const a = Asset.upload("photo.PNG", bytes, "x1", now);
    expect(a.name).toBe("x1.png");
    expect(a.contentType).toBe("image/png");
  });

  it("対応外の形式・空・大きすぎるファイルを拒否する", () => {
    expect(() => Asset.upload("a.exe", bytes, "x", now)).toThrow(ValidationError);
    expect(() => Asset.upload("a.png", new Uint8Array(), "x", now)).toThrow(ValidationError);
    expect(() => Asset.upload("a.png", new Uint8Array(MAX_ASSET_BYTES + 1), "x", now)).toThrow(ValidationError);
  });
});
