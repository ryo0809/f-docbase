import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { readDoc } from "@/lib/docs";
import { can } from "@/lib/roles";
import { Editor } from "@/components/Editor";

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string[] }> }) {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "edit")) redirect("/");
  const id = (await params).id.map(decodeURIComponent).join("/");
  const doc = await readDoc(id).catch(() => null);
  if (!doc) notFound();
  return <Editor mode="edit" initial={{ id, title: doc.title, tags: doc.tags, content: doc.content }} />;
}
