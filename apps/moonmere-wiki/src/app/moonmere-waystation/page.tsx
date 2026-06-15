import type { Metadata } from "next";
import Link from "next/link";
import { HeroBanner } from "@/components/hero-banner";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Moonmere Waystation",
  description: "The lost gate between the Luna world and Terra Aeterna."
};

const details = [
  ["Public face", "Outwalker lodge, healer-house, map room, archive rest, and safe roof at the edge of reliable roads."],
  ["Hidden function", "Dormant moon-gate keyed to true Luna authority rather than Alpha blood."],
  ["Architecture", "Domestic sacred machinery: lanterns, lofts, herb terraces, carved thresholds, water, stone, and living trees."],
  ["Story rule", "Eira does not merely discover the gate. The gate recognizes her."],
  ["Ceredan link", "Ceredan has likely repaired its lanterns, slept under its roof, and noticed its maps do not behave."],
  ["Terra Aeterna link", "The Waystation preserves an old interworld treaty by becoming beautiful, useful, and forgettable." ]
];

export default function MoonmereWaystationPage() {
  return (
    <>
      <HeroBanner eyebrow="Lost Gate" title="Moonmere Waystation">
        <p>
          The Outwalker rest-house built around a dormant moon-gate: a healer shelter,
          archive nook, map room, and forgotten threshold to Terra Aeterna.
        </p>
        <div className="hero-actions">
          <Link className="button gold" href="/windmere">Return to Windmere</Link>
          <Link className="button ghost" href="/galleries">View visual library</Link>
        </div>
      </HeroBanner>

      <section className="reading-panel gate-panel">
        <p className="eyebrow dark">Canon Lock</p>
        <h2>The lost gate survived by becoming a house.</h2>
        <p>
          The Moonmere Waystation is the lost threshold between the Luna world and Terra
          Aeterna: an Outwalker lodge built around a dormant moon-gate, remembered by
          stone, tree, lantern, and water long after its purpose was forgotten.
        </p>
        <blockquote>
          Luna domestic architecture hides cosmic machinery. Cozy rooms, kitchens,
          sleeping lofts, map tables, and lamp-lit thresholds are how sacred mechanics survived.
        </blockquote>
      </section>

      <section className="page-section">
        <SectionHeading eyebrow="Archive Notes" title="What the Waystation Holds" />
        <div className="toc-grid compact-toc">
          {details.map(([label, body]) => (
            <article className="toc-card" key={label}>
              <span className="eyebrow dark">{label}</span>
              <strong>{label}</strong>
              <span>{body}</span>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
