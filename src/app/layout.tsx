import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "f-docbase" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <div className="mx-auto flex h-12 max-w-7xl items-center justify-between px-4">
            <Link href="/" className="font-bold">
              f-docbase
            </Link>
            <Link href="/new" className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
              新規作成
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4">{children}</main>
      </body>
    </html>
  );
}
