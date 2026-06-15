import Link from "next/link";
import { HeroBanner } from "@/components/hero-banner";
import { CharacterCard } from "@/components/character-card";
import { AssetCard } from "@/components/asset-card";
import { NotionRenderer } from "@/components/notion-renderer";
import { SectionHeading } from "@/components/section-heading";
import { getAssets, getCharacters, getHubPage } from "@/lib/notion/content";
import { pageMap } from "@/lib/page-map";

const archiveCards = [
  {
    href: "/moonmere-waystation",
    glyph: "☾",
    eyebrow: "Lost Gate",
    title: "Moonmere Waystation",
    body: "The Outwalker lodge, healer-house, and dormant Terra Aeterna threshold hidden in domestic architecture."
  },
  {
    href: "/books",
    glyph: "Ⅰ",
    eyebrow: "Book Spine",
    title: "Seven-Book Arc",
    body: "From public severing and moonfall to false bond war, treaty law, and crownless packs."
  },
  {
    href: "/characters",
    glyph: "◌",
    eyebrow: "People",
    title: "Characters",
    body: "Eira, Ceredan, Iestyn, Windmere court, healers, witnesses, Outwalkers, and divine pressure points."
  },
  {
    href: "/magic",
    glyph: "◇",
    eyebrow: "Systems",
    title: "Moonwrit & Merewrit",
    body: "Healing, witness, bond law, Luna jurisdiction, corrupted Alpha-runes, and the language the lake remembered."
  },
  {
    href: "/windmere",
    glyph: "⌁",
    eyebrow: "Place",
    title: "Windmere & Locations",
    body: "Lake, pack hall, border roads, groves, ritual rooms, hidden thresholds, and the politics of polished cruelty."
  },
  {
    href: "/timeline",
    glyph: "↟",
    eyebrow: "Chronology",
    title: "Timeline",
    body: "Old Luna law, Caerwyn settlement, birth signs, rejection rite, Moonfall, judgement, and restoration."
  }
];

export default async function HomePage() {
  const [characters, assets, overview] = await Promise.all([
    getCharacters(),
    getAssets(),
    getHubPage(pageMap.overview.id, pageMap.overview.title)
  ]);

  const featuredCharacters = characters.filter((item) => item.featured).slice(0, 4);
  const featuredAssets = assets.filter((item) => item.featured).slice(0, 6);

  return (
    <>
      <HeroBanner eyebrow="Moonmere Archive" title="The Luna Who Called Down the Moon">
        <p>
          Enter through the Waystation: an illustrated archive of Luna law, three moons,
          erased offices, living gates, and the road to Terra Aeterna.
        </p>
        <div className="hero-actions">
          <Link className="button gold" href="/moonmere-waystation">Open the lost gate</Link>
          <Link className="button ghost" href="/characters">Meet the witnesses</Link>
        </div>
      </HeroBanner>

      <section className="front-hall reading-panel">
        <p className="eyebrow dark">Illustrated Front Hall</p>
        <h2>Begin at the table of contents.</h2>
        <p>
          This wiki is the public face of the living Notion archive: art-rich, parchment-built,
          and arranged so every major shelf has a clear door.
        </p>
        <div className="toc-grid" aria-label="Moonmere Archive table of contents">
          {archiveCards.map((card) => (
            <Link href={card.href} className="toc-card" key={card.href}>
              <span className="toc-glyph" aria-hidden="true">{card.glyph}</span>
              <span className="eyebrow dark">{card.eyebrow}</span>
              <strong>{card.title}</strong>
              <span>{card.body}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="reading-panel intro-panel">
        <NotionRenderer blocks={overview.blocks} />
      </section>

      <section className="page-section">
        <SectionHeading
          eyebrow="People of Windmere"
          title="Featured Characters"
          action={<Link className="text-link" href="/characters">View all →</Link>}
        />
        <div className="character-grid">
          {featuredCharacters.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      </section>

      <section className="page-section">
        <SectionHeading
          eyebrow="Moonmere Archive"
          title="Featured Visuals"
          action={<Link className="text-link" href="/galleries">View gallery →</Link>}
        />
        <div className="asset-grid">
          {featuredAssets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
        </div>
      </section>
    </>
  );
}
