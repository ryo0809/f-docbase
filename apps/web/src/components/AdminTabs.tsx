import { Link, useLocation } from "react-router";

type Tab = { href: string; label: string };

/** 管理ページのタブ。表示中のタブを強調する。 */
export function AdminTabs({ tabs }: { tabs: Tab[] }) {
  const pathname = useLocation().pathname;
  return (
    <nav className="mb-6 flex gap-1 border-b border-gray-200">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            to={t.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${
              active
                ? "border-brand-600 font-medium text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
