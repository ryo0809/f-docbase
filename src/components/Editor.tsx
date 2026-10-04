"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "./Markdown";

type Props = {
  mode: "create" | "edit";
  initial: { id: string; title: string; tags: string[]; content: string };
  /** 新規作成時の保存先(フォルダの作成・名称変更はフォルダ管理でのみ行う) */
  folders?: string[];
};

export function Editor({ mode, initial, folders = [] }: Props) {
  const router = useRouter();
  const [folder, setFolder] = useState("");
  const [title, setTitle] = useState(initial.title);
  // 新規作成時のファイル名はタイトルから決める(ファイル名の変更はフォルダ管理側で行う)
  const name = title.replace(/[/\\:*?"<>|#%]/g, " ").replace(/\s+/g, " ").trim().replace(/\.md$/, "");
  const id = mode === "edit" ? initial.id : folder ? `${folder}/${name}` : name;
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [content, setContent] = useState(initial.content);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  async function upload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) {
      setError((await res.json()).error ?? "upload failed");
      return;
    }
    const { url } = await res.json();
    const md = `![${file.name}](${url})`;
    const el = area.current;
    const pos = el?.selectionStart ?? content.length;
    setContent((c) => c.slice(0, pos) + md + c.slice(pos));
  }

  function onPaste(e: React.ClipboardEvent) {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      upload(file);
    }
  }

  function onDrop(e: React.DragEvent) {
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      e.preventDefault();
      upload(file);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    const body = {
      title,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      content,
    };
    const res =
      mode === "create"
        ? await fetch("/api/docs", { method: "POST", body: JSON.stringify({ id, ...body }) })
        : await fetch(`/api/docs/${id.split("/").map(encodeURIComponent).join("/")}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
    setSaving(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "save failed");
      return;
    }
    router.push(`/docs/${id.split("/").map(encodeURIComponent).join("/")}`);
    router.refresh();
  }

  const input =
    "rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500";

  return (
    <div className="flex h-[calc(100vh-3.5rem-3rem)] flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
        {mode === "create" && (
          <label className="space-y-1">
            <span className="block text-xs font-semibold text-gray-500">保存先フォルダ</span>
            <select className={`${input} w-56`} value={folder} onChange={(e) => setFolder(e.target.value)}>
              <option value="">📁 ルート</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  📁 {f}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="min-w-48 flex-1 space-y-1">
          <span className="block text-xs font-semibold text-gray-500">タイトル</span>
          <input
            className={`${input} w-full`}
            placeholder="ドキュメントのタイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        {mode === "edit" && (
          <label className="space-y-1">
            <span className="block text-xs font-semibold text-gray-500">タグ</span>
            <input className={`${input} w-56`} placeholder="カンマ区切り" value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
        <button
          onClick={save}
          disabled={saving || !title.trim()}
          className="rounded-md bg-brand-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">
            Markdown(画像は貼り付け / ドロップで追加)
          </div>
          <textarea
            ref={area}
            className="min-h-0 flex-1 resize-none p-4 font-mono text-sm leading-relaxed focus:outline-none"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={onPaste}
            onDrop={onDrop}
            spellCheck={false}
          />
        </div>
        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500">プレビュー</div>
          <div className="min-h-0 flex-1 overflow-auto p-6">
            <Markdown content={content} />
          </div>
        </div>
      </div>
    </div>
  );
}
