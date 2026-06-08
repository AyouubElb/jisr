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

  // On a sub-page (e.g. /legal/*) the anchor target lives on the homepage, so
  // point the href at /#id and let the browser do a real navigation + jump.
  const resolvedHref = pathname === "/" ? href : `/${href}`;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    // Off the homepage: let the plain /#id navigation happen (browser scrolls).
    if (pathname !== "/") return;

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
