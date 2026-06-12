import Image from "next/image";
import type { ReactNode } from "react";
import type { ContentBlock, RichTextMark } from "@/lib/types";

function RichText({ items }: { items: RichTextMark[] | undefined }) {
  if (!items?.length) return null;
  return (
    <>
      {items.map((item, index) => {
        let node: ReactNode = item.code ? <code>{item.text}</code> : item.text;
        if (item.bold) node = <strong>{node}</strong>;
        if (item.italic) node = <em>{node}</em>;
        if (item.underline) node = <u>{node}</u>;
        if (item.strikethrough) node = <s>{node}</s>;
        if (item.href) {
          node = (
            <a href={item.href} target="_blank" rel="noreferrer">
              {node}
            </a>
          );
        }
        return <span key={`${item.text}-${index}`}>{node}</span>;
      })}
    </>
  );
}

function Children({ blocks }: { blocks: ContentBlock[] | undefined }) {
  if (!blocks?.length) return null;
  return <NotionRenderer blocks={blocks} nested />;
}

function Block({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p>
          <RichText items={block.richText} />
          <Children blocks={block.children} />
        </p>
      );
    case "heading_1":
      return <h1><RichText items={block.richText} /></h1>;
    case "heading_2":
      return <h2><RichText items={block.richText} /></h2>;
    case "heading_3":
      return <h3><RichText items={block.richText} /></h3>;
    case "bulleted_list_item":
      return (
        <li>
          <RichText items={block.richText} />
          <Children blocks={block.children} />
        </li>
      );
    case "numbered_list_item":
      return (
        <li>
          <RichText items={block.richText} />
          <Children blocks={block.children} />
        </li>
      );
    case "quote":
      return <blockquote><RichText items={block.richText} /></blockquote>;
    case "callout":
      return (
        <aside className="notion-callout">
          {block.icon ? <span aria-hidden="true">{block.icon}</span> : null}
          <div><RichText items={block.richText} /></div>
        </aside>
      );
    case "divider":
      return <div className="moon-divider" aria-hidden="true"><span>◌</span><span>●</span><span>◌</span></div>;
    case "image":
      if (!block.imageUrl) return null;
      return (
        <figure className="notion-image">
          <div className="notion-image-frame">
            <Image
              src={block.imageUrl}
              alt={block.caption?.map((item) => item.text).join("") || "Notion content image"}
              fill
              unoptimized
              sizes="(max-width: 900px) 100vw, 900px"
              className="object-contain"
            />
          </div>
          {block.caption?.length ? <figcaption><RichText items={block.caption} /></figcaption> : null}
        </figure>
      );
    case "code":
      return (
        <pre><code data-language={block.language}><RichText items={block.richText} /></code></pre>
      );
    case "bookmark":
      return block.url ? (
        <a className="bookmark-card" href={block.url} target="_blank" rel="noreferrer">
          <span>{block.caption?.map((item) => item.text).join("") || block.url}</span>
          <span aria-hidden="true">↗</span>
        </a>
      ) : null;
    default:
      return null;
  }
}

export function NotionRenderer({
  blocks,
  nested = false
}: {
  blocks: ContentBlock[];
  nested?: boolean;
}) {
  const output: ReactNode[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    if (block.type === "bulleted_list_item" || block.type === "numbered_list_item") {
      const listType = block.type;
      const items: ContentBlock[] = [];
      while (index < blocks.length && blocks[index].type === listType) {
        items.push(blocks[index]);
        index += 1;
      }
      const Tag = listType === "bulleted_list_item" ? "ul" : "ol";
      output.push(
        <Tag key={`${listType}-${items[0].id}`}>
          {items.map((item) => <Block key={item.id} block={item} />)}
        </Tag>
      );
      continue;
    }

    output.push(<Block key={block.id} block={block} />);
    index += 1;
  }

  return <div className={nested ? "notion-content nested" : "notion-content"}>{output}</div>;
}
