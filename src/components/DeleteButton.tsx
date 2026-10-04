"use client";

import { useRouter } from "next/navigation";

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  async function onClick() {
    if (!confirm(`「${id}」を削除しますか?`)) return;
    const res = await fetch(`/api/docs/${id.split("/").map(encodeURIComponent).join("/")}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    }
  }
  return (
    <button onClick={onClick} className="rounded border border-red-300 px-3 py-1 text-red-600">
      削除
    </button>
  );
}
