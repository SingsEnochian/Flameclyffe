import type { Metadata } from "next";
import { HubPage } from "@/components/hub-page";
import { getHubPage } from "@/lib/notion/content";
import { pageMap } from "@/lib/page-map";

export const metadata: Metadata = { title: "Windmere" };

export default async function WindmerePage() {
  const page = await getHubPage(pageMap.windmere.id, pageMap.windmere.title);
  return (
    <HubPage
      page={page}
      eyebrow="Lake · Wind · Witness"
      summary="An elegant old territory of pale stone, black water, silver flags, inherited grace, and tradition polished into authority."
    />
  );
}
