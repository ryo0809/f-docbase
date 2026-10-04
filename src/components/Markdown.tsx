"use client";

import { useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";

function Mermaid({ chart }: { chart: string }) {
  const id = "m" + useId().replace(/:/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled) {
          setSvg(svg);
          setError("");
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
        document.getElementById("d" + id)?.remove();
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [chart, id]);

  if (error) {
    return <pre className="text-red-600 text-xs whitespace-pre-wrap">Mermaid error: {error}</pre>;
  }
  return <div className="my-4 flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />;
}

type Heading = { id: string; text: string; level: number };

export function Markdown({ content, toc = false }: { content: string; toc?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    if (!toc || !ref.current) return;
    const hs = Array.from(ref.current.querySelectorAll<HTMLElement>("h1, h2, h3")).filter((h) => h.id);
    setHeadings(hs.map((h) => ({ id: h.id, text: h.textContent ?? "", level: Number(h.tagName[1]) })));
  }, [content, toc]);

  return (
    <div className="flex gap-8">
      <div
        ref={ref}
        className="prose max-w-none min-w-0 flex-1 prose-headings:scroll-mt-20 prose-a:text-brand-700 prose-pre:bg-gray-50 prose-pre:text-gray-800 prose-code:before:content-none prose-code:after:content-none prose-img:rounded-md"
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug, [rehypeHighlight, { plainText: ["mermaid"] }]]}
          components={{
            pre({ children }) {
              const child = (Array.isArray(children) ? children[0] : children) as
                | { props?: { className?: string; children?: unknown } }
                | undefined;
              if (child?.props?.className?.includes("language-mermaid")) {
                return <Mermaid chart={String(child.props.children).replace(/\n$/, "")} />;
              }
              return <pre>{children}</pre>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
      {toc && headings.length > 0 && (
        <nav className="hidden w-56 shrink-0 text-sm xl:block">
          <div className="sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto border-l border-gray-200 pl-4">
            <div className="mb-2 text-xs font-semibold tracking-wide text-gray-400">目次</div>
            <ul className="space-y-1">
              {headings.map((h) => (
                <li key={h.id} style={{ paddingLeft: (h.level - 1) * 12 }}>
                  <a href={`#${h.id}`} className="text-gray-600 hover:text-brand-700">
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      )}
    </div>
  );
}
