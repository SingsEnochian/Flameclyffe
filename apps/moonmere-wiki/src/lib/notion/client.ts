import { Client } from "@notionhq/client";
import { env } from "@/lib/env";

let client: Client | null = null;

export function getNotionClient(): Client {
  if (!env.notionToken) {
    throw new Error("NOTION_TOKEN is not configured.");
  }

  client ??= new Client({ auth: env.notionToken });
  return client;
}
