import { env } from "@/lib/env";

export const pageMap = {
  overview: { id: env.pages.overview, title: "Overview" },
  magic: { id: env.pages.magic, title: "Magic" },
  timeline: { id: env.pages.timeline, title: "Series Timeline" },
  windmere: { id: env.pages.windmere, title: "Windmere" },
  cosmology: { id: env.pages.cosmology, title: "Cosmology" },
  visualLibrary: { id: env.pages.visualLibrary, title: "Visual Library" }
} as const;

export const bookPageMap: Record<string, { id?: string; title: string; subtitle: string }> = {
  "the-luna-who-called-down-the-moon": {
    id: env.pages.bookOne,
    title: "The Luna Who Called Down the Moon",
    subtitle: "Book One"
  }
};
