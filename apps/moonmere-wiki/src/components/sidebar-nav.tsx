import Link from "next/link";

const navItems = [
  { href: "/", label: "Overview", glyph: "✦" },
  { href: "/moonmere-waystation", label: "Waystation", glyph: "☾" },
  { href: "/characters", label: "Characters", glyph: "◌" },
  { href: "/books", label: "Books", glyph: "▥" },
  { href: "/windmere", label: "Windmere", glyph: "⌁" },
  { href: "/magic", label: "Magic & Runes", glyph: "◇" },
  { href: "/timeline", label: "Timeline", glyph: "↟" },
  { href: "/galleries", label: "Galleries", glyph: "▧" }
];

function NavLinks() {
  return (
    <nav aria-label="Primary navigation" className="nav-list">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href} className="nav-link">
          <span aria-hidden="true" className="nav-glyph">{item.glyph}</span>
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function SidebarNav() {
  return (
    <>
      <aside className="sidebar">
        <Link href="/" className="brand-mark" aria-label="Moonmere Archive home">
          <span className="brand-moon" aria-hidden="true">☾</span>
          <span className="brand-title">The Luna Who Called Down the Moon</span>
          <span className="brand-subtitle">Moonmere Archive</span>
        </Link>
        <div className="sidebar-rule" />
        <NavLinks />
        <blockquote className="sidebar-quote">
          “The wind carries witness. The mere keeps oath.”
        </blockquote>
      </aside>

      <details className="mobile-nav">
        <summary>
          <span>☾ Moonmere Archive</span>
          <span aria-hidden="true">Menu</span>
        </summary>
        <NavLinks />
      </details>
    </>
  );
}
