import { NextRequest } from "next/server";
import { ItemsQuerySchema } from "@/lib/schema";
import { fetchBank } from "@/lib/sheets";
import { jsonRes } from "@/lib/util";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const skill = url.searchParams.get("skill") || "";
  const subtab = url.searchParams.get("subtab") || "";
  const parsed = ItemsQuerySchema.safeParse({ skill, subtab });
  if (!parsed.success) return jsonRes({ error: "bad_request" }, 400);
  const items = await fetchBank(parsed.data.skill, parsed.data.subtab);
  return jsonRes({ items });
}
