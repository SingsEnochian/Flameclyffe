import Image from "next/image";
import type { ReactNode } from "react";

export function HeroBanner({
  eyebrow,
  title,
  children,
  imageUrl = "/moonmere-banner.svg",
  imageAlt = "The Moonmere Gate beneath three moons in an emerald and gold landscape."
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  imageUrl?: string;
  imageAlt?: string;
}) {
  return (
    <header className="hero-banner">
      <Image
        src={imageUrl}
        alt={imageAlt}
        fill
        priority
        sizes="(max-width: 900px) 100vw, calc(100vw - 280px)"
        className="hero-image"
      />
      <div className="hero-scrim" />
      <div className="hero-copy">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {children ? <div className="hero-summary">{children}</div> : null}
      </div>
    </header>
  );
}
