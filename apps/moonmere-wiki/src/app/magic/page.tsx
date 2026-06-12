import type { Metadata } from "next";
import { HubPage } from "@/components/hub-page";
import { getHubPage } from "@/lib/notion/content";
import { pageMap } from "@/lib/page-map";

export const metadata: Metadata = { title: "Magic & Runes" };
export const revalidate = 900;

export default async function MagicPage() {
  const page = await getHubPage(pageMap.magic.id, pageMap.magic.title);
  return (
    <HubPage
      page={page}
      eyebrow="Moonwrit · Merewrit"
      summary="Healing, witness, bond law, elemental questions, sacred jurisdiction, and the old grammar beneath Windmere’s edited rites."
    />
  );
}
