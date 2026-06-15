"use client";

import type { AnchorHTMLAttributes } from "react";
import { usePathname } from "next/navigation";

interface SmoothScrollLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: `#${string}`;
}

export function SmoothScrollLink({
  href,
  onClick,
  children,
  ...props
}: SmoothScrollLinkProps): React.JSX.Element {
  const pathname = usePathname();
  const id = href.slice(1);

  // Home matches both the legacy "/" and the locale-prefixed "/en", "/fr"
  // (no trailing segment). Sub-pages (e.g. /en/legal/*) anchor back to home.
  const isHome = pathname === "/" || /^\/(en|fr)\/?$/.test(pathname);
  const resolvedHref = isHome ? href : `/${href}`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    if (!isHome) return;

    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", href);
  };

  return (
    <a href={resolvedHref} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
