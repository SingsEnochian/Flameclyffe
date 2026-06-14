import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeroBanner } from "@/components/hero-banner";
import { NotionRenderer } from "@/components/notion-renderer";
import { AssetCard } from "@/components/asset-card";
import { StatusPill } from "@/components/status-pill";
import { getAssets, getCharacterBlocks, getCharacterBySlug, getCharacters } from "@/lib/notion/content";

export async function generateStaticParams() {
  const characters = await getCharacters();
  return characters.map((character) => ({ slug: character.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  return character
    ? { title: character.name, description: character.summary }
    : { title: "Character not found" };
}

export default async function CharacterPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  const [blocks, assets] = await Promise.all([getCharacterBlocks(character), getAssets()]);
  const relatedAssets = assets.filter((asset) =>
    asset.tags.some((tag) => character.name.toLowerCase().includes(tag.toLowerCase())) ||
    asset.slug.includes(character.slug.split("-")[0])
  );

  return (
    <>
      <HeroBanner
        eyebrow={character.role || "Character"}
        title={character.name}
        imageUrl={character.portraitUrl ?? "/moonmere-banner.svg"}
        imageAlt={character.portraitUrl ? `${character.name} portrait` : "Moonmere Gate banner"}
      >
        <p>{character.summary}</p>
        <div className="hero-status-row">
          <StatusPill value={character.canonStatus || "Working Canon"} />
          {character.status ? <span>{character.status}</span> : null}
        </div>
      </HeroBanner>

      <section className="character-facts reading-panel compact-panel">
        <dl>
          <div><dt>Affiliation</dt><dd>{character.houses.join(", ") || "Unrecorded"}</dd></div>
          <div><dt>Books</dt><dd>{character.books.join(", ") || "Unrecorded"}</dd></div>
          <div><dt>Skills</dt><dd>{character.skills.join(", ") || "Unrecorded"}</dd></div>
          <div><dt>Relationships</dt><dd>{character.relationshipTags.join(", ") || "Unrecorded"}</dd></div>
        </dl>
      </section>

      <section className="reading-panel">
        <NotionRenderer blocks={blocks} />
      </section>

      {relatedAssets.length ? (
        <section className="page-section">
          <h2 className="standalone-heading">Image Gallery</h2>
          <div className="asset-grid">
            {relatedAssets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
          </div>
        </section>
      ) : null}
    </>
  );
}
