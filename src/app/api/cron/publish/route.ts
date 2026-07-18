import { NextResponse } from "next/server";
import { publishScheduledProducts } from "@/modules/catalog/server/admin";

export const runtime = "nodejs";

// Vercel Cron calls this with `Authorization: Bearer ${CRON_SECRET}` on
// whatever schedule is configured in vercel.json. Flips draft products whose
// publishAt has passed to active — see the comment on publishAt in
// catalog/schema.ts for why collections don't need this (their visibility is
// computed dynamically, nothing to flip).
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publishedProductIds = await publishScheduledProducts();
  return NextResponse.json({ published: publishedProductIds });
}
