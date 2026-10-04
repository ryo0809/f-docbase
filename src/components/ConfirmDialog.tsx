"use client";

import { useEffect } from "react";

type Props = {
  title: string;
  /** 対象の名前など。強調して表示する */
  target?: string;
  message?: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** 削除などの破壊的操作の確認モーダル。 */
export function ConfirmDialog({ title, target, message, confirmLabel = "削除する", busy, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" onMouseDown={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-xl text-red-600">⚠</div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {target && <p className="mt-2 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium break-all text-gray-800">{target}</p>}
            <p className="mt-2 text-sm text-gray-500">{message ?? "この操作は取り消せません。"}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            autoFocus
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "削除中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
