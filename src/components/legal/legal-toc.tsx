"use client";

import { useEffect, useState } from "react";

interface TocItem {
  id: string;
  label: string;
}

// Scroll-spy table of contents: a continuous left rail where the active section's
// segment is highlighted (brand-colored left border + dark text).
export function LegalToc({
  items,
  updated,
}: {
  items: TocItem[];
  updated: string;
}): React.JSX.Element {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-96px 0px -65% 0px" }
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="hidden md:block">
      <div className="sticky top-24">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Sommaire
        </p>
        <nav>
          <ul className="space-y-2.5 border-l border-border">
            {items.map((item) => {
              const isActive = item.id === activeId;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`-ml-px block border-l py-1 pl-4 text-sm transition-colors ${
                      isActive
                        ? "border-primary font-medium text-amber-950"
                        : "border-transparent text-muted-foreground hover:text-amber-950"
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <p className="mt-8 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          Dernière mise à jour : {updated}
        </p>
      </div>
    </aside>
  );
}
