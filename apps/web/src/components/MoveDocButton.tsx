import { useState } from "react";
import { useNavigate } from "react-router";
import { docHref } from "../api/client";
import { useDocs } from "../auth/DocsProvider";
import { MoveDocDialog } from "./MoveDocDialog";

export function MoveDocButton({ doc, folders }: { doc: { id: string; title: string }; folders: string[] }) {
  const navigate = useNavigate();
  const { reload } = useDocs();
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
          onDone={async (newId) => {
            setOpen(false);
            await reload();
            navigate(docHref(newId));
          }}
        />
      )}
    </>
  );
}
