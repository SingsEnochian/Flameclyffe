import type {
  BlockObjectResponse,
  PageObjectResponse,
  RichTextItemResponse
} from "@notionhq/client/build/src/api-endpoints";
import type { Character, ContentBlock, ImageAsset, RichTextMark } from "@/lib/types";
import { slugify } from "@/lib/slug";

function property(page: PageObjectResponse, name: string) {
  return page.properties[name];
}

export function richTextPlain(items: RichTextItemResponse[] | undefined): string {
  return items?.map((item) => item.plain_text).join("") ?? "";
}

export function richTextMarks(items: RichTextItemResponse[] | undefined): RichTextMark[] {
  return (items ?? []).map((item) => ({
    text: item.plain_text,
    href: item.href,
    bold: item.annotations.bold,
    italic: item.annotations.italic,
    underline: item.annotations.underline,
    strikethrough: item.annotations.strikethrough,
    code: item.annotations.code
  }));
}

export function getTitle(page: PageObjectResponse, name: string): string {
  const value = property(page, name);
  return value?.type === "title" ? richTextPlain(value.title) : "";
}

export function getText(page: PageObjectResponse, name: string): string {
  const value = property(page, name);
  return value?.type === "rich_text" ? richTextPlain(value.rich_text) : "";
}

export function getSelect(page: PageObjectResponse, name: string): string {
  const value = property(page, name);
  return value?.type === "select" ? value.select?.name ?? "" : "";
}

export function getMultiSelect(page: PageObjectResponse, name: string): string[] {
  const value = property(page, name);
  return value?.type === "multi_select" ? value.multi_select.map((option) => option.name) : [];
}

export function getCheckbox(page: PageObjectResponse, name: string): boolean {
  const value = property(page, name);
  return value?.type === "checkbox" ? value.checkbox : false;
}

export function getNumber(page: PageObjectResponse, name: string): number | null {
  const value = property(page, name);
  return value?.type === "number" ? value.number : null;
}

export function getFileUrl(page: PageObjectResponse, name: string): string | null {
  const value = property(page, name);
  if (value?.type !== "files" || value.files.length === 0) return null;
  const first = value.files[0];
  if (first.type === "external") return first.external.url;
  if (first.type === "file") return first.file.url;
  return null;
}

export function parseCharacter(page: PageObjectResponse): Character {
  const name = getTitle(page, "Name") || "Untitled Character";
  return {
    id: page.id,
    slug: getText(page, "Slug") || slugify(name),
    name,
    role: getText(page, "Role"),
    summary: getText(page, "Summary"),
    canonStatus: getSelect(page, "Canon Status"),
    status: getSelect(page, "Status"),
    portraitUrl: getFileUrl(page, "Portrait"),
    featured: getCheckbox(page, "Featured"),
    sortOrder: getNumber(page, "Sort Order"),
    houses: getMultiSelect(page, "House / Affiliation"),
    books: getMultiSelect(page, "Books"),
    skills: getMultiSelect(page, "Magic / Skills"),
    relationshipTags: getMultiSelect(page, "Relationship Tags")
  };
}

export function parseAsset(page: PageObjectResponse): ImageAsset {
  const name = getTitle(page, "Asset Name") || "Untitled Asset";
  return {
    id: page.id,
    slug: getText(page, "Slug") || slugify(name),
    name,
    type: getSelect(page, "Asset Type"),
    imageUrl: getFileUrl(page, "Image"),
    altText: getText(page, "Alt Text") || name,
    caption: getText(page, "Caption"),
    aspectRatio: getSelect(page, "Aspect Ratio") || "Landscape",
    focalPoint: getSelect(page, "Focal Point") || "Centre",
    canonStatus: getSelect(page, "Canon Status"),
    featured: getCheckbox(page, "Featured"),
    displayOrder: getNumber(page, "Display Order"),
    tags: getMultiSelect(page, "Tags")
  };
}

function blockRichText(block: BlockObjectResponse): RichTextItemResponse[] | undefined {
  switch (block.type) {
    case "paragraph":
      return block.paragraph.rich_text;
    case "heading_1":
      return block.heading_1.rich_text;
    case "heading_2":
      return block.heading_2.rich_text;
    case "heading_3":
      return block.heading_3.rich_text;
    case "bulleted_list_item":
      return block.bulleted_list_item.rich_text;
    case "numbered_list_item":
      return block.numbered_list_item.rich_text;
    case "quote":
      return block.quote.rich_text;
    case "callout":
      return block.callout.rich_text;
    case "code":
      return block.code.rich_text;
    default:
      return undefined;
  }
}

function iconText(block: BlockObjectResponse): string | undefined {
  if (block.type !== "callout" || !block.callout.icon) return undefined;
  if (block.callout.icon.type === "emoji") return block.callout.icon.emoji;
  return undefined;
}

export function parseBlock(block: BlockObjectResponse, children: ContentBlock[] = []): ContentBlock {
  const base: ContentBlock = {
    id: block.id,
    type: "unsupported",
    children
  };

  if (
    block.type === "paragraph" ||
    block.type === "heading_1" ||
    block.type === "heading_2" ||
    block.type === "heading_3" ||
    block.type === "bulleted_list_item" ||
    block.type === "numbered_list_item" ||
    block.type === "quote" ||
    block.type === "callout" ||
    block.type === "code"
  ) {
    base.type = block.type;
    base.richText = richTextMarks(blockRichText(block));
  }

  if (block.type === "callout") {
    base.icon = iconText(block);
  }

  if (block.type === "code") {
    base.language = block.code.language;
  }

  if (block.type === "divider") {
    base.type = "divider";
  }

  if (block.type === "image") {
    base.type = "image";
    base.imageUrl =
      block.image.type === "external" ? block.image.external.url : block.image.file.url;
    base.caption = richTextMarks(block.image.caption);
  }

  if (block.type === "bookmark") {
    base.type = "bookmark";
    base.url = block.bookmark.url;
    base.caption = richTextMarks(block.bookmark.caption);
  }

  return base;
}
