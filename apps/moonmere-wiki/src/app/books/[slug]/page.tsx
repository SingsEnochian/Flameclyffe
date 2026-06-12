import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HubPage } from "@/components/hub-page";
import { getHubPage } from "@/lib/notion/content";
import { bookPageMap } from "@/lib/page-map";

export const revalidate = 900;

export function generateStaticParams() {
  return Object.keys(bookPageMap).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const book = bookPageMap[slug];
  return { title: book?.title ?? "Book not found" };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = bookPageMap[slug];
  if (!book) notFound();
  const page = await getHubPage(book.id, book.title);
  return (
    <HubPage
      page={page}
      eyebrow={book.subtitle}
      summary="Birth signs, hidden childhood, healer work, Windmere politics, public rejection, severing, moonfall, and the waking Moonmere Gate."
    />
  );
}
