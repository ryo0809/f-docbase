"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoveDocDialog } from "./MoveDocDialog";

export function MoveDocButton({ doc, folders }: { doc: { id: string; title: string }; folders: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-gray-600 hover:border-brand-400 hover:text-brand-700"
      >
        移動
      </button>
      {open && (
        <MoveDocDialog
          doc={doc}
          folders={folders}
          onClose={() => setOpen(false)}
          onDone={(newId) => {
            setOpen(false);
            router.push(`/docs/${newId.split("/").map(encodeURIComponent).join("/")}`);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
