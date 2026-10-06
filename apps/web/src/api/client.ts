import type {
  AuthStatus,
  Doc,
  DocMeta,
  FolderInfo,
  Role,
  TemplateInfo,
  UserDetail,
  UserInfo,
} from "@f-docbase/shared";

/** API が `{ error }` を返した(または通信に失敗した)ときの例外。 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** エラーからユーザー向けメッセージを取り出す。 */
export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof ApiError && e.message ? e.message : fallback;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body instanceof FormData) {
    init.body = body;
  } else if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  const res = await fetch(path, init);
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (data as { error?: unknown } | null)?.error;
    throw new ApiError(res.status, typeof msg === "string" ? msg : `リクエストに失敗しました (${res.status})`);
  }
  return data as T;
}

/** ドキュメント id(/ 区切り)を URL パス用にエンコードする。 */
export const encodeId = (id: string) => id.split("/").map(encodeURIComponent).join("/");

/** アプリ内のドキュメント閲覧 URL。 */
export const docHref = (id: string) => `/docs/${encodeId(id)}`;

const docUrl = (id: string) => `/api/docs/${encodeId(id)}`;
const userUrl = (username: string) => `/api/users/${encodeURIComponent(username)}`;

export const api = {
  // 認証
  authStatus: () => request<AuthStatus>("GET", "/api/auth/status"),
  login: (username: string, password: string) => request<UserInfo>("POST", "/api/auth/login", { username, password }),
  setup: (username: string, password: string) => request<UserInfo>("POST", "/api/auth/setup", { username, password }),
  logout: () => request<{ ok: true }>("POST", "/api/auth/logout"),

  // ドキュメント
  listDocs: () => request<DocMeta[]>("GET", "/api/docs"),
  getDoc: (id: string) => request<Doc>("GET", docUrl(id)),
  createDoc: (doc: { id: string; title: string; tags: string[]; content: string }) =>
    request<{ id: string }>("POST", "/api/docs", doc),
  updateDoc: (id: string, doc: { title: string; tags: string[]; content: string }) =>
    request<{ ok: true }>("PUT", docUrl(id), doc),
  patchDoc: (id: string, patch: { to?: string; title?: string }) => request<{ ok: true }>("PATCH", docUrl(id), patch),
  deleteDoc: (id: string) => request<{ ok: true }>("DELETE", docUrl(id)),

  // フォルダ
  listFolders: () => request<FolderInfo[]>("GET", "/api/folders"),
  createFolder: (path: string) => request<{ ok: true }>("POST", "/api/folders", { path }),
  renameFolder: (from: string, to: string) => request<{ ok: true }>("PATCH", "/api/folders", { from, to }),
  deleteFolder: (path: string) => request<{ ok: true }>("DELETE", "/api/folders", { path }),

  // テンプレート・画像
  listTemplates: () => request<TemplateInfo[]>("GET", "/api/templates"),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ url: string }>("POST", "/api/upload", fd);
  },

  // ユーザー
  listUsers: () => request<UserDetail[]>("GET", "/api/users"),
  createUser: (u: { username: string; password: string; role: Role }) => request<unknown>("POST", "/api/users", u),
  updateUser: (username: string, patch: { role?: Role; password?: string }) =>
    request<{ ok: true }>("PATCH", userUrl(username), patch),
  deleteUser: (username: string) => request<{ ok: true }>("DELETE", userUrl(username)),
};
