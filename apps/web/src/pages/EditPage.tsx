import { useLocation } from "react-router";
import { api } from "../api/client";
import { Editor } from "../components/Editor";
import { docIdFromPath } from "../hooks/docId";
import { useAsync } from "../hooks/useAsync";
import { NotFoundPage } from "./NotFoundPage";

export function EditPage() {
  const id = docIdFromPath(useLocation().pathname, "/edit/");
  const { data: doc, loading } = useAsync(() => api.getDoc(id), [id]);

  if (loading && !doc) return null;
  if (!doc) return <NotFoundPage />;
  return <Editor key={id} mode="edit" initial={{ id, title: doc.title, tags: doc.tags, content: doc.content }} />;
}
