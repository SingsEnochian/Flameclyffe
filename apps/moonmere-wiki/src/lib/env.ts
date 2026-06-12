const clean = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const env = {
  notionToken: clean(process.env.NOTION_TOKEN),
  characterDataSourceId: clean(process.env.NOTION_CHARACTER_DATA_SOURCE_ID),
  assetDataSourceId: clean(process.env.NOTION_ASSET_DATA_SOURCE_ID),
  revalidateSecret: clean(process.env.REVALIDATE_SECRET),
  pages: {
    overview: clean(process.env.NOTION_OVERVIEW_PAGE_ID),
    bookOne: clean(process.env.NOTION_BOOK_ONE_PAGE_ID),
    cosmology: clean(process.env.NOTION_COSMOLOGY_PAGE_ID),
    timeline: clean(process.env.NOTION_TIMELINE_PAGE_ID),
    windmere: clean(process.env.NOTION_WINDMERE_PAGE_ID),
    magic: clean(process.env.NOTION_MAGIC_PAGE_ID),
    visualLibrary: clean(process.env.NOTION_VISUAL_LIBRARY_PAGE_ID)
  }
};

export const isNotionConfigured = Boolean(
  env.notionToken && env.characterDataSourceId && env.assetDataSourceId
);
