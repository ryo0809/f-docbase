import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

export const DOCS_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.DOCS_DIR ?? "docs");
export const TEMPLATES_DIR = path.resolve(/*turbopackIgnore: true*/ "templates");
export const ASSETS_DIR = path.join(DOCS_DIR, "assets");

export type DocMeta = {
  id: string; // docs/ からの相対パス(拡張子なし、/ 区切り)
  title: string;
  tags: string[];
  updated: string;
};

export type Doc = DocMeta & { content: string };

/** id を docs/ 配下の絶対パスに解決する。docs/ 外を指す場合は例外。 */
export function resolveDocPath(id: string): string {
  if (!id || id.includes("\0")) throw new Error("invalid id");
  const full = path.resolve(DOCS_DIR, `${id}.md`);
  if (!full.startsWith(DOCS_DIR + path.sep)) throw new Error("invalid id");
  return full;
}

/** 任意の相対パスを base 配下に解決する。base 外を指す場合は例外。 */
export function resolveInside(base: string, rel: string): string {
  const full = path.resolve(base, rel);
  if (!full.startsWith(base + path.sep)) throw new Error("invalid path");
  return full;
}

function toMeta(id: string, data: Record<string, unknown>, mtime: Date): DocMeta {
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
  const updated =
    data.updated instanceof Date
      ? data.updated.toISOString()
      : typeof data.updated === "string"
        ? data.updated
        : mtime.toISOString();
  return {
    id,
    title: typeof data.title === "string" && data.title ? data.title : path.posix.basename(id),
    tags,
    updated,
  };
}

async function walk(dir: string, base: string): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    if (e.name === "assets" && dir === base) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full, base)));
    else if (e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

export async function listDocs(): Promise<DocMeta[]> {
  const files = await walk(DOCS_DIR, DOCS_DIR);
  const metas = await Promise.all(
    files.map(async (f) => {
      const [raw, stat] = await Promise.all([fs.readFile(f, "utf8"), fs.stat(f)]);
      const id = path.relative(DOCS_DIR, f).replace(/\\/g, "/").replace(/\.md$/, "");
      return toMeta(id, matter(raw).data, stat.mtime);
    }),
  );
  return metas.sort((a, b) => a.id.localeCompare(b.id));
}

export async function readDoc(id: string): Promise<Doc | null> {
  const file = resolveDocPath(id);
  try {
    const [raw, stat] = await Promise.all([fs.readFile(file, "utf8"), fs.stat(file)]);
    const parsed = matter(raw);
    return { ...toMeta(id, parsed.data, stat.mtime), content: parsed.content };
  } catch {
    return null;
  }
}

export async function writeDoc(
  id: string,
  input: { title: string; tags: string[]; content: string },
  opts: { create?: boolean } = {},
): Promise<void> {
  const file = resolveDocPath(id);
  if (opts.create) {
    try {
      await fs.access(file);
      throw new Error("already exists");
    } catch (e) {
      if ((e as Error).message === "already exists") throw e;
    }
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  const body = matter.stringify(input.content, {
    title: input.title,
    tags: input.tags,
    updated: new Date().toISOString(),
  });
  await fs.writeFile(file, body, "utf8");
}

export async function deleteDoc(id: string): Promise<void> {
  await fs.unlink(resolveDocPath(id));
}

export type Template = { id: string; title: string; content: string };

export async function listTemplates(): Promise<Template[]> {
  let names: string[];
  try {
    names = (await fs.readdir(TEMPLATES_DIR)).filter((n) => n.endsWith(".md"));
  } catch {
    return [];
  }
  return Promise.all(
    names.map(async (n) => {
      const parsed = matter(await fs.readFile(path.join(TEMPLATES_DIR, n), "utf8"));
      const id = n.replace(/\.md$/, "");
      return {
        id,
        title: typeof parsed.data.title === "string" ? parsed.data.title : id,
        content: parsed.content,
      };
    }),
  );
}

export type FolderInfo = { path: string; docCount: number };

/** フォルダパスを正規化し docs/ 配下の絶対パスに解決する。不正な場合は例外。 */
export function normalizeFolder(rel: string): { rel: string; full: string } {
  const clean = rel.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const segs = clean.split("/");
  if (!clean || segs.some((s) => !s || s === "." || s === ".." || s.includes("\0"))) throw new Error("invalid folder");
  if (segs[0] === "assets") throw new Error("assets は予約済みのフォルダ名です");
  return { rel: clean, full: resolveInside(DOCS_DIR, clean) };
}

async function walkDirs(dir: string, out: string[] = []): Promise<string[]> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory() || (e.name === "assets" && dir === DOCS_DIR)) continue;
    const full = path.join(dir, e.name);
    out.push(path.relative(DOCS_DIR, full).replace(/\\/g, "/"));
    await walkDirs(full, out);
  }
  return out;
}

/** 空フォルダも含めた全フォルダ(配下を含むドキュメント数つき)。 */
export async function listFolders(): Promise<FolderInfo[]> {
  const [dirs, docs] = await Promise.all([walkDirs(DOCS_DIR), listDocs()]);
  return dirs
    .sort((a, b) => a.localeCompare(b))
    .map((p) => ({ path: p, docCount: docs.filter((d) => d.id.startsWith(p + "/")).length }));
}

export async function createFolder(rel: string): Promise<void> {
  const { full } = normalizeFolder(rel);
  try {
    await fs.access(full);
    throw new Error("already exists");
  } catch (e) {
    if ((e as Error).message === "already exists") throw new Error("同名のフォルダが既に存在します");
  }
  await fs.mkdir(full, { recursive: true });
}

/** フォルダ名の変更 / 移動。配下のドキュメントはまとめて新しいパスに移る。 */
export async function renameFolder(from: string, to: string): Promise<void> {
  const src = normalizeFolder(from);
  const dst = normalizeFolder(to);
  if (src.rel === dst.rel) return;
  if (dst.rel.startsWith(src.rel + "/")) throw new Error("自分自身の配下には移動できません");
  const stat = await fs.stat(src.full).catch(() => null);
  if (!stat?.isDirectory()) throw new Error("フォルダが見つかりません");
  if (await fs.stat(dst.full).catch(() => null)) throw new Error("移動先に同名のフォルダ / ファイルが既に存在します");
  await fs.mkdir(path.dirname(dst.full), { recursive: true });
  await fs.rename(src.full, dst.full);
}

/** 空のフォルダのみ削除できる。 */
export async function deleteFolder(rel: string): Promise<void> {
  const { full } = normalizeFolder(rel);
  if ((await fs.readdir(full)).length > 0) throw new Error("フォルダが空ではありません");
  await fs.rmdir(full);
}

/** ドキュメントの名称変更 / 移動。to は移動先を含む新しい id、title を渡すとタイトルも更新する。 */
export async function moveDoc(from: string, to: string, title?: string): Promise<void> {
  const src = resolveDocPath(from);
  const dst = resolveDocPath(to.replace(/\\/g, "/").replace(/^\/+|\.md$/g, ""));
  if (to.split("/").some((s) => s === "..")) throw new Error("invalid id");
  if (!(await fs.stat(src).catch(() => null))) throw new Error("ドキュメントが見つかりません");
  if (src !== dst) {
    if (await fs.stat(dst).catch(() => null)) throw new Error("移動先に同名のドキュメントが既に存在します");
    await fs.mkdir(path.dirname(dst), { recursive: true });
    await fs.rename(src, dst);
  }
  if (title !== undefined) {
    const parsed = matter(await fs.readFile(dst, "utf8"));
    if (parsed.data.title !== title) {
      await fs.writeFile(dst, matter.stringify(parsed.content, { ...parsed.data, title, updated: new Date().toISOString() }), "utf8");
    }
  }
}
