import type { Metadata } from "next";
import { HubPage } from "@/components/hub-page";
import { getHubPage } from "@/lib/notion/content";
import { pageMap } from "@/lib/page-map";

export const metadata: Metadata = { title: "Series Timeline" };

export default async function TimelinePage() {
  const page = await getHubPage(pageMap.timeline.id, pageMap.timeline.title);
  return (
    <HubPage
      page={page}
      eyebrow="Chronology"
      summary="A structured chronology for the Moonmere archive, from old law to Moonfall and the crownless future."
    />
  );
}
