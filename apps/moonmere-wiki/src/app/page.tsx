import Link from "next/link";
import { HeroBanner } from "@/components/hero-banner";
import { CharacterCard } from "@/components/character-card";
import { AssetCard } from "@/components/asset-card";
import { NotionRenderer } from "@/components/notion-renderer";
import { SectionHeading } from "@/components/section-heading";
import { getAssets, getCharacters, getHubPage } from "@/lib/notion/content";
import { pageMap } from "@/lib/page-map";

export const revalidate = 900;

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
      <HeroBanner eyebrow="Series Wiki" title="The Luna Who Called Down the Moon">
        <p>
          A restoration epic wearing werewolf fur, kept in emerald shadow, soft gold,
          lakewater, and witness.
        </p>
        <div className="hero-actions">
          <Link className="button gold" href="/characters">Explore characters</Link>
          <Link className="button ghost" href="/galleries">Open the visual library</Link>
        </div>
      </HeroBanner>

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
