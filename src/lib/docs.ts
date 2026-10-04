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
