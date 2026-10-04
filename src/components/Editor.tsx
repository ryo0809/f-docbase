"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "./Markdown";

type Props = {
  mode: "create" | "edit";
  initial: { id: string; title: string; tags: string[]; content: string };
};

export function Editor({ mode, initial }: Props) {
  const router = useRouter();
  const [id, setId] = useState(initial.id);
  const [title, setTitle] = useState(initial.title);
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

  const input = "rounded border border-gray-300 px-2 py-1 text-sm";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${input} w-64`}
          placeholder="パス (例: requirements/login)"
          value={id}
          disabled={mode === "edit"}
          onChange={(e) => setId(e.target.value.replace(/^\/+|\.md$/g, ""))}
        />
        <input className={`${input} w-64`} placeholder="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className={`${input} w-56`} placeholder="タグ (カンマ区切り)" value={tags} onChange={(e) => setTags(e.target.value)} />
        <button
          onClick={save}
          disabled={saving || !id || !title}
          className="rounded bg-blue-600 px-4 py-1 text-sm text-white disabled:opacity-40"
        >
          保存
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        <textarea
          ref={area}
          className="h-full resize-none rounded border border-gray-300 p-3 font-mono text-sm"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={onPaste}
          onDrop={onDrop}
          spellCheck={false}
        />
        <div className="overflow-auto rounded border border-gray-200 p-4">
          <Markdown content={content} />
        </div>
      </div>
    </div>
  );
}
