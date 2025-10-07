import { NextRequest } from "next/server";
import { SaveSkillSchema } from "../../../lib/schema";
import { saveSkillOverwrite } from "../../../lib/sheets";
import { jsonRes } from "../../../lib/util";


export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SaveSkillSchema.safeParse(body);
  if (!parsed.success) return jsonRes({ error: "bad_request" }, 400);
  const r = await saveSkillOverwrite(parsed.data.attemptId, parsed.data.skill, parsed.data.answers);
  return jsonRes(r);
}
