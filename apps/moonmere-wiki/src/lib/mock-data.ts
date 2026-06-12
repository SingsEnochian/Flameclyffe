import type { Character, ImageAsset, ContentBlock } from "@/lib/types";

export const mockCharacters: Character[] = [
  {
    id: "mock-eira",
    slug: "eira-catrine-windmere",
    name: "Eira Catrine Windmere",
    role: "Healer; restored Luna; protagonist",
    summary:
      "A small, wiry Windmere healer whose public rejection awakens the erased Luna office and calls the moon down upon the pack.",
    canonStatus: "Locked",
    status: "Active",
    portraitUrl: null,
    featured: true,
    sortOrder: 1,
    houses: ["Windmere", "House Fell"],
    books: ["Book One", "Book Two", "Book Three"],
    skills: ["Healing", "Moonwrit", "Merewrit", "Witness Law", "Wolf-running"],
    relationshipTags: ["Fell Household", "Caerwyn Household", "Romantic Path"]
  },
  {
    id: "mock-iestyn",
    slug: "iestyn-rhydian-caerwyn",
    name: "Iestyn Rhydian Caerwyn",
    role: "Heir-Fang; Alpha-line heir; Eira’s false mate recognition",
    summary:
      "Windmere’s disciplined Heir-Fang, raised to mistake obedience for virtue and destined to choose the system over the person he knows.",
    canonStatus: "Working Canon",
    status: "Active",
    portraitUrl: null,
    featured: true,
    sortOrder: 2,
    houses: ["Windmere", "House Caerwyn"],
    books: ["Book One", "Book Two", "Book Three"],
    skills: ["Wolf-running", "Ritual"],
    relationshipTags: ["Caerwyn Household", "Antagonist"]
  }
];

export const mockAssets: ImageAsset[] = [
  {
    id: "mock-banner",
    slug: "moonmere-series-banner",
    name: "Moonmere Series Banner",
    type: "Style Board",
    imageUrl: "/moonmere-banner.svg",
    altText:
      "An emerald night landscape with three moons, golden runes, wolves, a luminous gate, and a still lake.",
    caption: "The Moonmere Gate beneath the three moons.",
    aspectRatio: "Banner",
    focalPoint: "Centre",
    canonStatus: "Working Canon",
    featured: true,
    displayOrder: 1,
    tags: ["Windmere", "Aurel", "Glaswren", "Mawr"]
  }
];

export const mockOverviewBlocks: ContentBlock[] = [
  {
    id: "mock-overview-1",
    type: "paragraph",
    richText: [
      {
        text: "A restoration epic wearing werewolf fur. Eira does not become powerful because a better man chooses her. She becomes powerful because an erased sacred office returns through her body, blood, refusal, and memory."
      }
    ]
  },
  { id: "mock-overview-divider", type: "divider" },
  {
    id: "mock-overview-2",
    type: "heading_2",
    richText: [{ text: "The old question" }]
  },
  {
    id: "mock-overview-3",
    type: "quote",
    richText: [{ text: "Can she restore a world that taught wolves to confuse domination with destiny?" }]
  }
];

export const mockCharacterBlocks: Record<string, ContentBlock[]> = {
  "eira-catrine-windmere": [
    {
      id: "eira-overview",
      type: "heading_2",
      richText: [{ text: "Overview" }]
    },
    {
      id: "eira-copy",
      type: "paragraph",
      richText: [
        {
          text: "Very petite, wiry, scrappy, quick, and work-shaped rather than court-polished. She is small enough to be underestimated and sharp enough to make that mistake expensive."
        }
      ]
    }
  ],
  "iestyn-rhydian-caerwyn": [
    {
      id: "iestyn-overview",
      type: "heading_2",
      richText: [{ text: "Core tension" }]
    },
    {
      id: "iestyn-copy",
      type: "paragraph",
      richText: [
        {
          text: "He believes restraint, sacrifice, and obedience make him good. Windmere has trained him to endure the loss of personal freedom as proof that he deserves power."
        }
      ]
    },
    {
      id: "iestyn-quote",
      type: "quote",
      richText: [{ text: "I thought duty made the choice clean." }]
    }
  ]
};
