import { NextRequest } from "next/server";
import { FinalizeSchema } from "@/lib/schema";
import { finalizeAttempt } from "@/lib/sheets";
import { jsonRes } from "@/lib/util";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = FinalizeSchema.safeParse(body);
  if (!parsed.success) return jsonRes({ error: "bad_request" }, 400);
  const r = await finalizeAttempt(parsed.data.attemptId, parsed.data.endedBy, { subtabL: parsed.data.subtabL, subtabR: parsed.data.subtabR });
  return jsonRes(r);
}

