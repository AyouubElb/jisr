// Shared building blocks for the /legal/* pages. Layout inspired by a centered
// hero band + sticky table-of-contents + anchored sections with an accent rule.

import { LegalToc } from "@/components/legal/legal-toc";

interface TocItem {
  id: string;
  label: string;
}

export function LegalHero({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}): React.JSX.Element {
  return (
    <div className="border-b border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 sm:py-20">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight text-amber-950 sm:text-4xl md:text-5xl">
          {title}
        </h1>
      </div>
    </div>
  );
}

export function LegalLayoutGrid({
  toc,
  updated,
  children,
}: {
  toc: TocItem[];
  updated: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="grid grid-cols-1 gap-12 md:grid-cols-[200px_1fr] md:gap-16">
        <LegalToc items={toc} updated={updated} />
        <div className="min-w-0 max-w-2xl">{children}</div>
      </div>
    </div>
  );
}

export function LegalSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="mb-3 text-xl font-bold tracking-tight text-amber-950 sm:text-2xl">
        {heading}
      </h2>
      <div className="mb-4 h-0.5 w-10 rounded-full bg-primary" />
      <div className="space-y-3 text-[15px] leading-relaxed text-foreground/75">
        {children}
      </div>
    </section>
  );
}

export function LegalList({
  items,
}: {
  items: React.ReactNode[];
}): React.JSX.Element {
  return (
    <ul className="ml-5 list-disc space-y-1.5 marker:text-primary/60">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
