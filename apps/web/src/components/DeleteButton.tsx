import { useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../api/client";
import { useDocs } from "../auth/DocsProvider";
import { ConfirmDialog } from "./ConfirmDialog";

export function DeleteButton({ id, title }: { id: string; title?: string }) {
  const navigate = useNavigate();
  const { reload } = useDocs();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onConfirm() {
    setBusy(true);
    try {
      await api.deleteDoc(id);
      await reload();
      navigate("/");
    } catch {
      // 失敗時は何もせずダイアログを閉じる(従来どおり)
    }
    setBusy(false);
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
