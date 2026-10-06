"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** サイドメニュー下部の管理ページへのリンク。ドキュメント管理・ユーザー管理は管理ページのタブで切り替える。 */
export function AdminNav() {
  const active = usePathname().startsWith("/admin");
  return (
    <nav className="shrink-0 border-t border-gray-200 p-4">
      <Link
        href="/admin"
        className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
          active ? "bg-brand-50 font-medium text-brand-700" : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <span>⚙</span> 管理
      </Link>
    </nav>
  );
}
