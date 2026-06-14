import type { Metadata } from "next";
import { HeroBanner } from "@/components/hero-banner";
import { CharacterCard } from "@/components/character-card";
import { EmptyState } from "@/components/empty-state";
import { getCharacters } from "@/lib/notion/content";

export const metadata: Metadata = { title: "Characters" };

export default async function CharactersPage() {
  const characters = await getCharacters();
  return (
    <>
      <HeroBanner eyebrow="Character Index" title="People of Windmere">
        <p>Individual pages, relationship arcs, accountability notes, and visual canon.</p>
      </HeroBanner>
      <section className="page-section">
        {characters.length ? (
          <div className="character-grid">
            {characters.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
        ) : (
          <EmptyState title="No public characters yet" body="Mark a Character Index row Public to open this shelf." />
        )}
      </section>
    </>
  );
}
