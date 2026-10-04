import type { Metadata } from "next";
import Link from "next/link";
import { listDocs, listFolders } from "@/lib/docs";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = { title: "f-docbase" };
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [allDocs, folders] = await Promise.all([listDocs(), listFolders()]);
  const docs = allDocs.map(({ id, title, tags }) => ({ id, title, tags }));

  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-gray-800">
              <span className="grid size-7 place-items-center rounded-md bg-brand-600 text-sm text-white">f</span>
              f-docbase
            </Link>
            <Link
              href="/new"
              className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              ＋ 新規作成
            </Link>
          </div>
        </header>
        <div className="flex">
          <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-72 shrink-0 overflow-y-auto border-r border-gray-200 bg-white md:block">
            <Sidebar docs={docs} folders={folders.map((f) => f.path)} />
          </aside>
          <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
