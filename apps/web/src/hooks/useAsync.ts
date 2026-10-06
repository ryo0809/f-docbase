import { useCallback, useEffect, useState, type DependencyList } from "react";

type State<T> = { loading: boolean; data: T | null; error: Error | null };

/** 画面表示時にデータを取得する小さなフック。deps が変わると再取得する。 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<State<T>>({ loading: true, data: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then(
      (data) => {
        if (!cancelled) setState({ loading: false, data, error: null });
      },
      (error: Error) => {
        if (!cancelled) setState({ loading: false, data: null, error });
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
