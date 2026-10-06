import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DocMeta, FolderInfo } from "@f-docbase/shared";
import { api } from "../api/client";

type DocsState = {
  docs: DocMeta[];
  folders: FolderInfo[];
  /** ドキュメント・フォルダを変更した後に呼ぶ(旧 router.refresh() 相当) */
  reload: () => Promise<void>;
};

const DocsContext = createContext<DocsState | null>(null);

/** ログイン後の全画面で共有するドキュメント / フォルダ一覧(サイドバーや一覧画面が使う)。 */
export function DocsProvider({ children }: { children: ReactNode }) {
  const [docs, setDocs] = useState<DocMeta[]>([]);
  const [folders, setFolders] = useState<FolderInfo[]>([]);

  const reload = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([api.listDocs(), api.listFolders()]);
      setDocs(d);
      setFolders(f);
    } catch {
      // 取得に失敗しても直前の一覧を残す
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const value = useMemo(() => ({ docs, folders, reload }), [docs, folders, reload]);
  return <DocsContext.Provider value={value}>{children}</DocsContext.Provider>;
}

export function useDocs(): DocsState {
  const v = useContext(DocsContext);
  if (!v) throw new Error("useDocs must be used within DocsProvider");
  return v;
}
