import type { Metadata } from "next";
import { HeroBanner } from "@/components/hero-banner";
import { AssetCard } from "@/components/asset-card";
import { EmptyState } from "@/components/empty-state";
import { getAssets } from "@/lib/notion/content";

export const metadata: Metadata = { title: "Galleries" };

export default async function GalleriesPage() {
  const assets = await getAssets();
  return (
    <>
      <HeroBanner eyebrow="Visual Asset Library" title="Galleries & Page Assets">
        <p>Portraits, forms, sigils, maps, banners, turnarounds, and ornamental pagework.</p>
      </HeroBanner>
      <section className="page-section">
        {assets.length ? (
          <div className="asset-grid">
            {assets.map((asset) => <AssetCard key={asset.id} asset={asset} />)}
          </div>
        ) : (
          <EmptyState title="No public assets yet" body="Mark an asset Public and add accessible alt text to place it here." />
        )}
      </section>
    </>
  );
}
