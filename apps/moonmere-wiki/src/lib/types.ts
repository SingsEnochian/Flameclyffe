export type CanonStatus = "Locked" | "Working Canon" | "Exploratory" | "Retired" | string;

export type ImageAsset = {
  id: string;
  slug: string;
  name: string;
  type: string;
  imageUrl: string | null;
  altText: string;
  caption: string;
  aspectRatio: "Banner" | "Landscape" | "Portrait" | "Square" | "Transparent Ornament" | string;
  focalPoint: "Centre" | "Top" | "Bottom" | "Left" | "Right" | string;
  canonStatus: CanonStatus;
  featured: boolean;
  displayOrder: number | null;
  tags: string[];
};

export type Character = {
  id: string;
  slug: string;
  name: string;
  role: string;
  summary: string;
  canonStatus: CanonStatus;
  status: string;
  portraitUrl: string | null;
  featured: boolean;
  sortOrder: number | null;
  houses: string[];
  books: string[];
  skills: string[];
  relationshipTags: string[];
  visualAssets?: ImageAsset[];
};

export type RichTextMark = {
  text: string;
  href?: string | null;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};

export type ContentBlock = {
  id: string;
  type:
    | "paragraph"
    | "heading_1"
    | "heading_2"
    | "heading_3"
    | "bulleted_list_item"
    | "numbered_list_item"
    | "quote"
    | "callout"
    | "divider"
    | "image"
    | "code"
    | "bookmark"
    | "unsupported";
  richText?: RichTextMark[];
  children?: ContentBlock[];
  imageUrl?: string;
  caption?: RichTextMark[];
  language?: string;
  icon?: string;
  url?: string;
};

export type HubPage = {
  id: string;
  title: string;
  blocks: ContentBlock[];
};
