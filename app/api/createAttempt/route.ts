import { NextRequest } from "next/server";
import { CreateAttemptSchema } from "@/lib/schema";
import { createAttempt } from "@/lib/sheets";
import { jsonRes } from "@/lib/util";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = CreateAttemptSchema.safeParse(body);
  if (!parsed.success) return jsonRes({ error: "bad_request" }, 400);
  const r = await createAttempt(parsed.data);
  return jsonRes({ attemptId: r.id, started_at: r.started_at });
}
