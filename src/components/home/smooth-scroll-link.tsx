"use client";

import type { AnchorHTMLAttributes } from "react";

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
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) return;

    e.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", href);
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
