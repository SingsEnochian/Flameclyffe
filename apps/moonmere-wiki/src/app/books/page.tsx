import Link from "next/link";
import type { Metadata } from "next";
import { HeroBanner } from "@/components/hero-banner";
import { bookPageMap } from "@/lib/page-map";

export const metadata: Metadata = { title: "Books" };

export default function BooksPage() {
  return (
    <>
      <HeroBanner eyebrow="Series Architecture" title="The Seven-Book Arc">
        <p>Each volume opens another chamber of the Luna restoration, from public severing to crownless law.</p>
      </HeroBanner>
      <section className="page-section">
        <div className="book-grid">
          {Object.entries(bookPageMap).map(([slug, book], index) => (
            <Link href={`/books/${slug}`} className="book-card" key={slug}>
              <span className="book-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <p className="eyebrow dark">{book.subtitle}</p>
                <h2>{book.title}</h2>
                <p>Open volume →</p>
              </div>
            </Link>
          ))}
          {Array.from({ length: 6 }, (_, index) => (
            <div className="book-card dormant" key={index}>
              <span className="book-number">{String(index + 2).padStart(2, "0")}</span>
              <div>
                <p className="eyebrow dark">Future volume</p>
                <h2>Archive chamber not yet opened</h2>
                <p>Mapped in the series spine.</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
