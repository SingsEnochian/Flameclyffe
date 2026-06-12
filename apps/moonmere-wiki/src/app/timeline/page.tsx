import type { Metadata } from "next";
import { HubPage } from "@/components/hub-page";
import { getHubPage } from "@/lib/notion/content";
import { pageMap } from "@/lib/page-map";

export const metadata: Metadata = { title: "Series Timeline" };
export const revalidate = 900;

export default async function TimelinePage() {
  const page = await getHubPage(pageMap.timeline.id, pageMap.timeline.title);
  return (
    <HubPage
      page={page}
      eyebrow="Chronology"
      summary="From the old Luna office and the Caerwyn Settlement to Eira’s birth signs, Moonfall, judgement, and the crownless future."
    />
  );
}
