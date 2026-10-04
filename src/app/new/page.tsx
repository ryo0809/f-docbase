import Link from "next/link";
import { listTemplates } from "@/lib/docs";
import { Editor } from "@/components/Editor";

export const dynamic = "force-dynamic";

export default async function NewPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  const templates = await listTemplates();
  const selected = templates.find((t) => t.id === template);

  if (!selected) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-bold">テンプレートを選択</h1>
        <ul className="grid max-w-xl gap-2">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/new?template=${encodeURIComponent(t.id)}`}
                className="block rounded border border-gray-200 px-4 py-3 hover:border-blue-500"
              >
                {t.title}
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
      initial={{ id: "", title: selected.id === "blank" ? "" : selected.title, tags: [], content: selected.content }}
    />
  );
}
