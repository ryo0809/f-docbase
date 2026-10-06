import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/interface/http/app";
import { createContainer } from "../src/container";
import { createTestDependencies } from "./support/in-memory";

type Api = ReturnType<typeof makeApi>;

function makeApi() {
  const deps = createTestDependencies();
  const app = createApp(() => createContainer(deps));
  const env = {} as never;

  /** Cookie を持つクライアント(ブラウザ1つ分) */
  function client() {
    let cookie = "";
    async function call(method: string, path: string, body?: unknown, init: RequestInit = {}) {
      const headers = new Headers(init.headers);
      if (cookie) headers.set("Cookie", cookie);
      let payload: BodyInit | undefined = init.body ?? undefined;
      if (body !== undefined) {
        headers.set("Content-Type", "application/json");
        payload = JSON.stringify(body);
      }
      const res = await app.request(path, { ...init, method, headers, body: payload }, env);
      const set = res.headers.get("set-cookie");
      if (set) cookie = set.startsWith("docbase_session=;") || /Max-Age=0/i.test(set) ? "" : set.split(";")[0]!;
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        json = undefined;
      }
      return { status: res.status, json, headers: res.headers, text };
    }
    return {
      get: (p: string) => call("GET", p),
      post: (p: string, b?: unknown) => call("POST", p, b),
      put: (p: string, b?: unknown) => call("PUT", p, b),
      patch: (p: string, b?: unknown) => call("PATCH", p, b),
      del: (p: string, b?: unknown) => call("DELETE", p, b),
      raw: call,
    };
  }
  return { deps, client };
}

async function loginAs(api: Api, username: string, password = "password-1") {
  const c = api.client();
  expect((await c.post("/api/auth/login", { username, password })).status).toBe(200);
  return c;
}

describe("HTTP API", () => {
  let api: Api;
  let owner: ReturnType<Api["client"]>;

  // オーナー(owner)・開発メンバー(dev)・一般メンバー(view)を用意する
  beforeEach(async () => {
    api = makeApi();
    owner = api.client();
    expect((await owner.post("/api/auth/setup", { username: "owner", password: "password-1" })).status).toBe(201);
    for (const [username, role] of [
      ["dev", "developer"],
      ["view", "viewer"],
    ]) {
      expect((await owner.post("/api/users", { username, password: "password-1", role })).status).toBe(201);
    }
  });

  describe("認証", () => {
    it("初期設定の前は setupRequired、後は user を返す", async () => {
      const fresh = makeApi().client();
      expect((await fresh.get("/api/auth/status")).json).toEqual({ setupRequired: true, user: null });
      expect((await owner.get("/api/auth/status")).json).toEqual({
        setupRequired: false,
        user: { username: "owner", role: "owner" },
      });
    });

    it("初期設定は1回だけ", async () => {
      const res = await api.client().post("/api/auth/setup", { username: "second", password: "password-1" });
      expect(res.status).toBe(409);
    });

    it("ログイン失敗は 401(ユーザーの有無を区別しない)", async () => {
      const c = api.client();
      const a = await c.post("/api/auth/login", { username: "owner", password: "wrong-password" });
      const b = await c.post("/api/auth/login", { username: "nobody", password: "password-1" });
      expect([a.status, b.status]).toEqual([401, 401]);
      expect(a.json).toEqual(b.json);
    });

    it("Cookie は HttpOnly で、ログアウトすると使えなくなる", async () => {
      const c = api.client();
      const res = await c.raw("POST", "/api/auth/login", { username: "owner", password: "password-1" });
      expect(res.headers.get("set-cookie")).toMatch(/HttpOnly/i);
      expect((await c.get("/api/docs")).status).toBe(200);
      await c.post("/api/auth/logout");
      expect((await c.get("/api/docs")).status).toBe(401);
    });

    it("未ログインでは API を使えない", async () => {
      const c = api.client();
      for (const path of ["/api/docs", "/api/folders", "/api/users", "/api/templates", "/api/assets/x.png"]) {
        expect((await c.get(path)).status).toBe(401);
      }
    });

    it("偽造した Cookie は受け付けない", async () => {
      const res = await api.client().raw("GET", "/api/docs", undefined, { headers: { Cookie: "docbase_session=abc.def" } });
      expect(res.status).toBe(401);
    });

    it("ロールの変更と削除は、次のリクエストからすぐ反映される", async () => {
      const dev = await loginAs(api, "dev");
      expect((await dev.post("/api/docs", { id: "x", title: "x" })).status).toBe(201);
      await owner.patch("/api/users/dev", { role: "viewer" });
      expect((await dev.post("/api/docs", { id: "y", title: "y" })).status).toBe(403);
      await owner.del("/api/users/dev");
      expect((await dev.get("/api/docs")).status).toBe(401);
    });
  });

  describe("ロールごとの権限", () => {
    it("オーナーは全部、開発メンバーは削除以外、一般メンバーは閲覧だけ", async () => {
      const dev = await loginAs(api, "dev");
      const view = await loginAs(api, "view");

      const create = async (who: typeof owner, id: string) => (await who.post("/api/docs", { id, title: id })).status;
      expect(await create(owner, "o")).toBe(201);
      expect(await create(dev, "d")).toBe(201);
      expect(await create(view, "v")).toBe(403);

      expect((await view.get("/api/docs")).status).toBe(200);
      expect((await view.get("/api/docs/o")).status).toBe(200);
      expect((await view.put("/api/docs/o", { title: "t" })).status).toBe(403);
      expect((await dev.put("/api/docs/o", { title: "t" })).status).toBe(200);

      expect((await view.post("/api/folders", { path: "f" })).status).toBe(403);
      expect((await dev.post("/api/folders", { path: "f" })).status).toBe(201);
      expect((await dev.del("/api/folders", { path: "f" })).status).toBe(403);
      expect((await owner.del("/api/folders", { path: "f" })).status).toBe(200);

      expect((await dev.del("/api/docs/o")).status).toBe(403);
      expect((await owner.del("/api/docs/o")).status).toBe(200);

      expect((await dev.get("/api/users")).status).toBe(403);
      expect((await view.get("/api/users")).status).toBe(403);
      expect((await owner.get("/api/users")).status).toBe(200);
    });
  });

  describe("ドキュメント", () => {
    it("作成・取得・更新・一覧", async () => {
      const dev = await loginAs(api, "dev");
      expect((await dev.post("/api/docs", { id: "要件定義書/EC", title: "EC", tags: ["a", "b"], content: "# hi" })).json).toEqual({
        id: "要件定義書/EC",
      });
      const got = await dev.get(`/api/docs/${encodeURIComponent("要件定義書")}/EC`);
      expect(got.json).toMatchObject({ id: "要件定義書/EC", title: "EC", tags: ["a", "b"], content: "# hi" });

      api.deps.clock.advance(60_000);
      await dev.put("/api/docs/%E8%A6%81%E4%BB%B6%E5%AE%9A%E7%BE%A9%E6%9B%B8/EC", { title: "EC2", tags: [], content: "new" });
      const list = (await dev.get("/api/docs")).json;
      expect(list).toEqual([
        { id: "要件定義書/EC", title: "EC2", tags: [], updated: "2026-10-06T00:01:00.000Z" },
      ]);
    });

    it("同じ id は作れない・存在しないものは 404・不正な id は 400", async () => {
      const dev = await loginAs(api, "dev");
      await dev.post("/api/docs", { id: "a", title: "a" });
      expect((await dev.post("/api/docs", { id: "a", title: "a" })).status).toBe(409);
      expect((await dev.get("/api/docs/none")).status).toBe(404);
      expect((await dev.put("/api/docs/none", { title: "t" })).status).toBe(404);
      expect((await dev.post("/api/docs", { id: "../x", title: "t" })).status).toBe(400);
      expect((await dev.post("/api/docs", { id: "assets/x", title: "t" })).status).toBe(400);
      expect((await dev.get("/api/docs/%E0%A4%A")).status).toBe(400);
    });

    it("名称変更・移動(タイトルも変えられる)", async () => {
      const dev = await loginAs(api, "dev");
      await dev.post("/api/docs", { id: "a", title: "A", content: "body" });
      await dev.post("/api/docs", { id: "b", title: "B" });
      expect((await dev.patch("/api/docs/a", { to: "b" })).status).toBe(409);
      expect((await dev.patch("/api/docs/a", { to: "dir/a2", title: "A2" })).status).toBe(200);
      expect((await dev.get("/api/docs/a")).status).toBe(404);
      expect((await dev.get("/api/docs/dir/a2")).json).toMatchObject({ title: "A2", content: "body" });
      expect((await dev.patch("/api/docs/none", { to: "x" })).status).toBe(404);
    });
  });

  describe("フォルダ", () => {
    it("空フォルダとドキュメントの親フォルダを一覧する", async () => {
      await owner.post("/api/folders", { path: "empty" });
      await owner.post("/api/docs", { id: "a/b/doc", title: "d" });
      expect((await owner.get("/api/folders")).json).toEqual([
        { path: "a", docCount: 1 },
        { path: "a/b", docCount: 1 },
        { path: "empty", docCount: 0 },
      ]);
    });

    it("作成の重複・不正な名前を拒否する", async () => {
      await owner.post("/api/folders", { path: "x" });
      expect((await owner.post("/api/folders", { path: "x" })).status).toBe(409);
      expect((await owner.post("/api/folders", { path: "assets" })).status).toBe(400);
      expect((await owner.post("/api/folders", { path: "a/../b" })).status).toBe(400);
    });

    it("名称変更で、配下のフォルダとドキュメントも移る", async () => {
      await owner.post("/api/folders", { path: "old/sub" });
      await owner.post("/api/docs", { id: "old/doc", title: "d" });
      expect((await owner.patch("/api/folders", { from: "old", to: "new" })).status).toBe(200);
      expect((await owner.get("/api/docs")).json.map((d: { id: string }) => d.id)).toEqual(["new/doc"]);
      expect((await owner.get("/api/folders")).json).toEqual([
        { path: "new", docCount: 1 },
        { path: "new/sub", docCount: 0 },
      ]);
    });

    it("名称変更できない場合", async () => {
      await owner.post("/api/folders", { path: "a" });
      await owner.post("/api/folders", { path: "b" });
      expect((await owner.patch("/api/folders", { from: "a", to: "a/child" })).status).toBe(400);
      expect((await owner.patch("/api/folders", { from: "a", to: "b" })).status).toBe(409);
      expect((await owner.patch("/api/folders", { from: "none", to: "c" })).status).toBe(404);
    });

    it("空のフォルダだけ削除できる", async () => {
      await owner.post("/api/docs", { id: "full/doc", title: "d" });
      await owner.post("/api/folders", { path: "parent/child" });
      expect((await owner.del("/api/folders", { path: "full" })).status).toBe(409);
      expect((await owner.del("/api/folders", { path: "parent" })).status).toBe(409);
      expect((await owner.del("/api/folders", { path: "parent/child" })).status).toBe(200);
      expect((await owner.del("/api/folders", { path: "parent" })).status).toBe(200);
      expect((await owner.del("/api/folders", { path: "none" })).status).toBe(404);
    });
  });

  describe("ユーザー管理", () => {
    it("作成の検証(ユーザー名・パスワード・ロール・重複)", async () => {
      expect((await owner.post("/api/users", { username: "ab", password: "password-1", role: "viewer" })).status).toBe(400);
      expect((await owner.post("/api/users", { username: "abc", password: "short", role: "viewer" })).status).toBe(400);
      expect((await owner.post("/api/users", { username: "abc", password: "password-1", role: "admin" })).status).toBe(400);
      expect((await owner.post("/api/users", { username: "dev", password: "password-1", role: "viewer" })).status).toBe(409);
      const created = await owner.post("/api/users", { username: "abc", password: "password-1", role: "viewer" });
      expect(created.json).toMatchObject({ username: "abc", role: "viewer" });
      expect(JSON.stringify(created.json)).not.toContain("password");
    });

    it("一覧にパスワードのハッシュを含めない", async () => {
      const res = await owner.get("/api/users");
      expect(res.json).toHaveLength(3);
      expect(res.text).not.toMatch(/pbkdf2|passwordHash|password_hash/);
    });

    it("パスワードの変更後は、新しいパスワードでログインできる", async () => {
      expect((await owner.patch("/api/users/view", { password: "new-password-9" })).status).toBe(200);
      expect((await api.client().post("/api/auth/login", { username: "view", password: "password-1" })).status).toBe(401);
      expect((await api.client().post("/api/auth/login", { username: "view", password: "new-password-9" })).status).toBe(200);
      expect((await owner.patch("/api/users/view", { password: "short" })).status).toBe(400);
    });

    it("自分自身のロール変更・削除はできない", async () => {
      expect((await owner.patch("/api/users/owner", { role: "viewer" })).status).toBe(400);
      expect((await owner.del("/api/users/owner")).status).toBe(400);
    });

    it("最後のオーナーは、他のオーナーからも降格・削除できない", async () => {
      await owner.post("/api/users", { username: "owner2", password: "password-1", role: "owner" });
      const owner2 = await loginAs(api, "owner2");
      expect((await owner2.patch("/api/users/owner", { role: "viewer" })).status).toBe(200);
      // owner2 が最後のオーナーになった。owner(いまは一般)には、もう操作する権限がない
      expect((await owner.del("/api/users/owner2")).status).toBe(403);
      expect(api.deps.users.rows.get("owner2")?.role).toBe("owner");
    });

    it("存在しないユーザーは 404", async () => {
      expect((await owner.patch("/api/users/nobody", { role: "viewer" })).status).toBe(404);
      expect((await owner.del("/api/users/nobody")).status).toBe(404);
    });
  });

  describe("画像", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);

    function upload(c: ReturnType<Api["client"]>, name: string, bytes: Uint8Array) {
      const fd = new FormData();
      fd.append("file", new File([bytes as unknown as ArrayBuffer], name, { type: "image/png" }));
      return c.raw("POST", "/api/upload", undefined, { body: fd });
    }

    it("アップロードして取得できる(一般メンバーは取得だけ)", async () => {
      const dev = await loginAs(api, "dev");
      const view = await loginAs(api, "view");
      const res = await upload(dev, "shot.png", png);
      expect(res.status).toBe(200);
      expect(res.json.url).toMatch(/^\/api\/assets\/id\d+\.png$/);

      const got = await view.raw("GET", res.json.url);
      expect(got.status).toBe(200);
      expect(got.headers.get("content-type")).toBe("image/png");
      expect(got.headers.get("content-security-policy")).toBe("script-src 'none'");
      expect((await upload(view, "x.png", png)).status).toBe(403);
    });

    it("対応外の形式と、存在しない画像", async () => {
      expect((await upload(owner, "evil.html", png)).status).toBe(400);
      expect((await owner.get("/api/assets/none.png")).status).toBe(404);
    });

    it("file がないリクエストは 400", async () => {
      expect((await owner.post("/api/upload", {})).status).toBe(400);
    });
  });

  it("テンプレートを返す", async () => {
    const res = await owner.get("/api/templates");
    expect(res.json.map((t: { id: string }) => t.id)).toEqual(["blank", "design", "requirements"]);
    expect(res.json[2].title).toBe("要件定義書");
  });

  it("存在しない API は 404", async () => {
    expect((await owner.get("/api/nothing")).status).toBe(404);
  });
});
