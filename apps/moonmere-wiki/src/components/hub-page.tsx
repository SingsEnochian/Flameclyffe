import { HeroBanner } from "@/components/hero-banner";
import { NotionRenderer } from "@/components/notion-renderer";
import { EmptyState } from "@/components/empty-state";
import type { HubPage as HubPageType } from "@/lib/types";

export function HubPage({
  page,
  eyebrow,
  summary
}: {
  page: HubPageType;
  eyebrow: string;
  summary: string;
}) {
  return (
    <>
      <HeroBanner eyebrow={eyebrow} title={page.title}>
        <p>{summary}</p>
      </HeroBanner>
      <section className="reading-panel">
        {page.blocks.length ? (
          <NotionRenderer blocks={page.blocks} />
        ) : (
          <EmptyState
            title="This shelf is ready"
            body="The mapped Notion page is empty or the integration has not been connected yet. The shell remains usable with mock content."
          />
        )}
      </section>
    </>
  );
}
