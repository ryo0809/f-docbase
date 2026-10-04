"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "./ConfirmDialog";

export function DeleteButton({ id, title }: { id: string; title?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onConfirm() {
    setBusy(true);
    const res = await fetch(`/api/docs/${id.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700"
      >
        削除
      </button>
      {open && (
        <ConfirmDialog
          title="ドキュメントを削除しますか?"
          target={title ?? id}
          busy={busy}
          onConfirm={onConfirm}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
