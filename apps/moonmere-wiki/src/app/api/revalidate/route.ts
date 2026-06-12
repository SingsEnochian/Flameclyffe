import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  if (!env.revalidateSecret) {
    return NextResponse.json({ ok: false, error: "REVALIDATE_SECRET is not configured." }, { status: 503 });
  }

  const secret = request.headers.get("x-revalidate-secret");
  if (secret !== env.revalidateSecret) {
    return NextResponse.json({ ok: false, error: "Invalid secret." }, { status: 401 });
  }

  let path = "/";
  try {
    const body = (await request.json()) as { path?: unknown };
    if (typeof body.path === "string" && body.path.startsWith("/")) path = body.path;
  } catch {
    // Empty bodies safely refresh the home route.
  }

  revalidatePath(path, "page");
  return NextResponse.json({ ok: true, revalidated: path, at: new Date().toISOString() });
}
