// リポジトリ直下の templates/*.md を、Worker に同梱できる TS モジュールに変換する。
// templates/ が正本(create-design スキルも参照する)。生成物は Git 管理外。
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const dir = join(root, "templates");
const out = join(root, "apps", "api", "src", "infrastructure", "templates", "templates.generated.ts");

const templates = readdirSync(dir)
  .filter((n) => n.endsWith(".md"))
  .sort()
  .map((n) => {
    const { data, content } = matter(readFileSync(join(dir, n), "utf8"));
    const id = n.replace(/\.md$/, "");
    return { id, title: typeof data.title === "string" ? data.title : id, content };
  });

// 生成物は Git 管理外なので、クリーンなクローンでは出力先のフォルダがない
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  `// scripts/gen-templates.mjs が生成するファイル。直接編集しない。\nexport const TEMPLATES = ${JSON.stringify(templates, null, 2)} as const;\n`,
);
console.log(`generated ${templates.length} templates`);
