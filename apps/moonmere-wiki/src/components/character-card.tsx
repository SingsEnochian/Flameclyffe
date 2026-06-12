import Image from "next/image";
import Link from "next/link";
import type { Character } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

export function CharacterCard({ character }: { character: Character }) {
  return (
    <article className="character-card">
      <Link href={`/characters/${character.slug}`} className="card-image-link">
        <div className="card-image portrait-frame">
          <Image
            src={character.portraitUrl ?? "/moonmere-placeholder.svg"}
            alt={character.portraitUrl ? `${character.name} portrait` : "Moonmere placeholder artwork"}
            fill
            sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 320px"
            className="object-cover"
          />
        </div>
      </Link>
      <div className="card-copy">
        <div className="card-meta-row">
          <StatusPill value={character.canonStatus || "Working Canon"} />
          {character.featured ? <span className="featured-mark">✦ Featured</span> : null}
        </div>
        <h3><Link href={`/characters/${character.slug}`}>{character.name}</Link></h3>
        <p className="card-role">{character.role}</p>
        <p>{character.summary || "Character summary pending editorial review."}</p>
        <div className="tag-row">
          {character.houses.slice(0, 3).map((house) => <span key={house}>{house}</span>)}
        </div>
      </div>
    </article>
  );
}
