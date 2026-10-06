import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listFolders, listTemplates } from "@/lib/docs";
import { can } from "@/lib/roles";
import { Editor } from "@/components/Editor";

export const dynamic = "force-dynamic";

export default async function NewPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "edit")) redirect("/");
  const { template } = await searchParams;
  const templates = await listTemplates();
  const selected = templates.find((t) => t.id === template);

  if (!selected) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-1 text-xl font-bold">テンプレートを選択</h1>
        <p className="mb-4 text-sm text-gray-500">雛形を選んで新しいドキュメントを書き始めます。</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/new?template=${encodeURIComponent(t.id)}`}
                className="block h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:border-brand-400 hover:shadow"
              >
                <div className="mb-1 text-2xl">📝</div>
                <div className="font-semibold">{t.title}</div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Editor
      key={selected.id}
      mode="create"
      folders={(await listFolders()).map((f) => f.path)}
      initial={{ id: "", title: selected.id === "blank" ? "" : selected.title, tags: [], content: selected.content }}
    />
  );
}
