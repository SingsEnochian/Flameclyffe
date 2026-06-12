import Image from "next/image";
import type { CSSProperties } from "react";
import type { ImageAsset } from "@/lib/types";
import { StatusPill } from "@/components/status-pill";

function focalPoint(value: string): CSSProperties["objectPosition"] {
  const map: Record<string, CSSProperties["objectPosition"]> = {
    Centre: "center",
    Top: "center top",
    Bottom: "center bottom",
    Left: "left center",
    Right: "right center"
  };
  return map[value] ?? "center";
}

function ratioClass(value: string): string {
  return `ratio-${value.toLowerCase().replace(/\s+/g, "-")}`;
}

export function AssetCard({ asset }: { asset: ImageAsset }) {
  return (
    <figure className="asset-card">
      <div className={`asset-image ${ratioClass(asset.aspectRatio)}`}>
        <Image
          src={asset.imageUrl ?? "/moonmere-placeholder.svg"}
          alt={asset.altText}
          fill
          unoptimized={Boolean(asset.imageUrl?.startsWith("https://"))}
          sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 420px"
          style={{ objectPosition: focalPoint(asset.focalPoint) }}
          className="object-cover"
        />
      </div>
      <figcaption>
        <div className="card-meta-row">
          <span className="asset-type">{asset.type || "Visual Asset"}</span>
          <StatusPill value={asset.canonStatus || "Working Canon"} />
        </div>
        <h3>{asset.name}</h3>
        {asset.caption ? <p>{asset.caption}</p> : null}
      </figcaption>
    </figure>
  );
}
