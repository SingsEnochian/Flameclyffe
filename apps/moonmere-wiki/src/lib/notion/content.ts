import {
  collectPaginatedAPI,
  isFullBlock,
  isFullPage
} from "@notionhq/client";
import type { BlockObjectResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { cache } from "react";
import { env, isNotionConfigured } from "@/lib/env";
import { getNotionClient } from "@/lib/notion/client";
import { parseAsset, parseBlock, parseCharacter } from "@/lib/notion/parsers";
import { mockAssets, mockCharacterBlocks, mockCharacters, mockOverviewBlocks } from "@/lib/mock-data";
import type { Character, ContentBlock, HubPage, ImageAsset } from "@/lib/types";

const orderByNumberThenName = <T extends { name: string }>(
  getOrder: (item: T) => number | null
) => (a: T, b: T): number => {
  const left = getOrder(a) ?? Number.MAX_SAFE_INTEGER;
  const right = getOrder(b) ?? Number.MAX_SAFE_INTEGER;
  return left - right || a.name.localeCompare(b.name);
};

async function queryAllPublicPages(dataSourceId: string): Promise<PageObjectResponse[]> {
  const notion = getNotionClient();
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: {
        property: "Public",
        checkbox: { equals: true }
      },
      start_cursor: cursor,
      page_size: 100
    });

    for (const result of response.results) {
      if (isFullPage(result)) pages.push(result);
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages;
}

export const getCharacters = cache(async (): Promise<Character[]> => {
  if (!isNotionConfigured || !env.characterDataSourceId) return mockCharacters;

  try {
    const pages = await queryAllPublicPages(env.characterDataSourceId);
    const characters = pages.map(parseCharacter);
    return characters.sort(orderByNumberThenName((character) => character.sortOrder));
  } catch (error) {
    console.error("Unable to load public characters from Notion:", error);
    return mockCharacters;
  }
});

export const getCharacterBySlug = cache(async (slug: string): Promise<Character | null> => {
  const characters = await getCharacters();
  return characters.find((character) => character.slug === slug) ?? null;
});

export const getAssets = cache(async (): Promise<ImageAsset[]> => {
  if (!isNotionConfigured || !env.assetDataSourceId) return mockAssets;

  try {
    const pages = await queryAllPublicPages(env.assetDataSourceId);
    const assets = pages.map(parseAsset).filter((asset) => Boolean(asset.imageUrl));
    return assets.sort(orderByNumberThenName((asset) => asset.displayOrder));
  } catch (error) {
    console.error("Unable to load public visual assets from Notion:", error);
    return mockAssets;
  }
});

async function getNestedBlocks(blockId: string): Promise<ContentBlock[]> {
  const notion = getNotionClient();
  const raw = await collectPaginatedAPI(notion.blocks.children.list, { block_id: blockId });
  const blocks: ContentBlock[] = [];

  for (const item of raw) {
    if (!isFullBlock(item)) continue;
    const block = item as BlockObjectResponse;
    const children = block.has_children ? await getNestedBlocks(block.id) : [];
    blocks.push(parseBlock(block, children));
  }

  return blocks;
}

export const getPageBlocks = cache(async (pageId: string): Promise<ContentBlock[]> => {
  if (!isNotionConfigured) return [];
  try {
    return await getNestedBlocks(pageId);
  } catch (error) {
    console.error(`Unable to load Notion blocks for ${pageId}:`, error);
    return [];
  }
});

export const getCharacterBlocks = cache(async (character: Character): Promise<ContentBlock[]> => {
  if (!isNotionConfigured || character.id.startsWith("mock-")) {
    return mockCharacterBlocks[character.slug] ?? [];
  }
  return getPageBlocks(character.id);
});

export const getHubPage = cache(
  async (id: string | undefined, fallbackTitle: string): Promise<HubPage> => {
    if (!id || !isNotionConfigured) {
      return {
        id: id ?? `mock-${fallbackTitle}`,
        title: fallbackTitle,
        blocks: fallbackTitle === "Overview" ? mockOverviewBlocks : []
      };
    }

    const notion = getNotionClient();
    try {
      const page = await notion.pages.retrieve({ page_id: id });
      let title = fallbackTitle;
      if (isFullPage(page)) {
        const titleProperty = Object.values(page.properties).find(
          (value) => value.type === "title"
        );
        if (titleProperty?.type === "title") {
          title = titleProperty.title.map((item) => item.plain_text).join("") || fallbackTitle;
        }
      }
      return { id, title, blocks: await getPageBlocks(id) };
    } catch (error) {
      console.error(`Unable to load Notion page ${id}:`, error);
      return { id, title: fallbackTitle, blocks: [] };
    }
  }
);
