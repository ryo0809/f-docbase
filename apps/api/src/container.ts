// 依存関係の組み立て(composition root)。具体的な実装(D1・Web Crypto)を選ぶのはここだけ。

import { AuthenticateUseCase } from "./application/auth/authenticate";
import { GetAuthStatusUseCase } from "./application/auth/get-auth-status";
import { LoginUseCase } from "./application/auth/login";
import { SetupOwnerUseCase } from "./application/auth/setup-owner";
import { GetAssetUseCase, UploadAssetUseCase } from "./application/asset/asset-usecases";
import {
  CreateDocumentUseCase,
  DeleteDocumentUseCase,
  GetDocumentUseCase,
  ListDocumentsUseCase,
  MoveDocumentUseCase,
  UpdateDocumentUseCase,
} from "./application/document/document-usecases";
import {
  CreateFolderUseCase,
  DeleteFolderUseCase,
  ListFoldersUseCase,
  RenameFolderUseCase,
} from "./application/folder/folder-usecases";
import type { Clock, IdGenerator, SessionTokenService, TemplateCatalog } from "./application/ports/ports";
import { ReorderSiblingsUseCase } from "./application/order/reorder-siblings";
import { ListTemplatesUseCase } from "./application/template/list-templates";
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  ListUsersUseCase,
  UpdateUserUseCase,
} from "./application/user/user-usecases";
import type { AssetRepository } from "./domain/asset/asset-repository";
import type { DocumentRepository } from "./domain/document/document-repository";
import type { FolderRepository } from "./domain/folder/folder-repository";
import type { PasswordHasher } from "./domain/user/password-hasher";
import type { UserRepository } from "./domain/user/user-repository";
import { HmacSessionTokenService } from "./infrastructure/crypto/hmac-session-token-service";
import { Pbkdf2PasswordHasher } from "./infrastructure/crypto/pbkdf2-password-hasher";
import { D1AssetRepository } from "./infrastructure/d1/d1-asset-repository";
import { D1DocumentRepository } from "./infrastructure/d1/d1-document-repository";
import { D1FolderRepository } from "./infrastructure/d1/d1-folder-repository";
import { D1SessionSecret } from "./infrastructure/d1/d1-session-secret";
import { D1UserRepository } from "./infrastructure/d1/d1-user-repository";
import { BundledTemplateCatalog, SystemClock, TimestampIdGenerator } from "./infrastructure/system";

/** use case を組み立てる材料(リポジトリなど)。テストでは、メモリ上の実装に差し替える。 */
export type Dependencies = {
  users: UserRepository;
  documents: DocumentRepository;
  folders: FolderRepository;
  assets: AssetRepository;
  hasher: PasswordHasher;
  tokens: SessionTokenService;
  templates: TemplateCatalog;
  clock: Clock;
  ids: IdGenerator;
};

export function createContainer(d: Dependencies) {
  return {
    auth: {
      authenticate: new AuthenticateUseCase(d.users, d.tokens),
      status: new GetAuthStatusUseCase(d.users),
      login: new LoginUseCase(d.users, d.hasher, d.tokens),
      setupOwner: new SetupOwnerUseCase(d.users, d.hasher, d.tokens, d.clock),
    },
    documents: {
      list: new ListDocumentsUseCase(d.documents),
      get: new GetDocumentUseCase(d.documents),
      create: new CreateDocumentUseCase(d.documents, d.folders, d.clock),
      update: new UpdateDocumentUseCase(d.documents, d.clock),
      move: new MoveDocumentUseCase(d.documents, d.folders, d.clock),
      delete: new DeleteDocumentUseCase(d.documents),
    },
    folders: {
      list: new ListFoldersUseCase(d.folders, d.documents),
      create: new CreateFolderUseCase(d.folders, d.documents),
      rename: new RenameFolderUseCase(d.folders, d.documents),
      delete: new DeleteFolderUseCase(d.folders, d.documents),
    },
    users: {
      list: new ListUsersUseCase(d.users),
      create: new CreateUserUseCase(d.users, d.hasher, d.clock),
      update: new UpdateUserUseCase(d.users, d.hasher),
      delete: new DeleteUserUseCase(d.users),
    },
    assets: {
      upload: new UploadAssetUseCase(d.assets, d.clock, d.ids),
      get: new GetAssetUseCase(d.assets),
    },
    order: { reorder: new ReorderSiblingsUseCase(d.folders, d.documents) },
    templates: { list: new ListTemplatesUseCase(d.templates) },
  };
}

export type Container = ReturnType<typeof createContainer>;

/** 本番用: D1 と Web Crypto を使う。 */
export function createD1Container(db: D1Database): Container {
  const clock = new SystemClock();
  return createContainer({
    users: new D1UserRepository(db),
    documents: new D1DocumentRepository(db),
    folders: new D1FolderRepository(db),
    assets: new D1AssetRepository(db),
    hasher: new Pbkdf2PasswordHasher(),
    tokens: new HmacSessionTokenService(new D1SessionSecret(db), clock),
    templates: new BundledTemplateCatalog(),
    clock,
    ids: new TimestampIdGenerator(),
  });
}
