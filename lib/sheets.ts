import { google } from "googleapis";

const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  undefined,
  (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.readonly"]
);

const sheets = google.sheets({ version: "v4", auth });
const SPREADSHEET_ID = process.env.SHEETS_SPREADSHEET_ID as string;

async function getRows(range: string) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range });
  const rows = res.data.values || [];
  if (!rows.length) return [];
  const [header, ...data] = rows;
  return data.map(r => Object.fromEntries(header.map((h: string, i: number) => [h, r[i] ?? ""])));
}

async function appendRows(range: string, rows: any[]) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: rows }
  });
}

async function updateCells(range: string, rows: any[]) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: "RAW",
    requestBody: { values: rows }
  });
}

export async function fetchBank(skill: string, subtab: string) {
  const all = await getRows("Bank!A:Z");
  const items = all.filter(x => x.skill === skill && x.subtab === subtab).sort((a: any, b: any) => Number(a.order) - Number(b.order));
  return items;
}

export async function fetchAnswerKeys(skill: string, subtab: string) {
  const all = await getRows("AnswerKeys!A:Z");
  return all.filter(x => x.skill === skill && x.subtab === subtab).map(x => ({ q: Number(x.q_no), a: String(x.correct_answer || "").trim().toUpperCase() }));
}

export async function fetchConfig(key: string) {
  const all = await getRows("Config!A:Z");
  const row = all.find(x => x.key === key);
  if (!row) return null;
  try { return JSON.parse(row.json); } catch { return null; }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function createAttempt(payload: { user_email: string; test_id: string; meta?: any }) {
  const id = uid();
  const started = new Date().toISOString();
  await appendRows("Attempts!A:Z", [[id, payload.user_email, payload.test_id, started, "", "in_progress", "", "", "", "", "", JSON.stringify(payload.meta || {})]]);
  return { id, started_at: started };
}

export async function saveSkillOverwrite(attemptId: string, skill: string, answers: Array<{ q_no: number; response: string }>) {
  const rows = answers.map(x => [uid(), attemptId, skill, x.q_no, (x.response || "").toString().toUpperCase(), "", "", new Date().toISOString()]);
  await appendRows("Answers!A:Z", rows);
  return { ok: true };
}

export async function finalizeAttempt(attemptId: string, endedBy: string, opts: { subtabL?: string; subtabR?: string }) {
  const attempts = await getRows("Attempts!A:Z");
  const idx = attempts.findIndex((x: any) => x.id === attemptId);
  const submitted = new Date().toISOString();
  const allAns = await getRows("Answers!A:Z");
  const byAttempt = allAns.filter((x: any) => x.attempt_id === attemptId);
  const L = byAttempt.filter((x: any) => x.skill === "L").map(x => ({ q: Number(x.q_no), a: String(x.response || "").trim().toUpperCase() }));
  const R = byAttempt.filter((x: any) => x.skill === "R").map(x => ({ q: Number(x.q_no), a: String(x.response || "").trim().toUpperCase() }));

  let rawL = 0, rawR = 0, bandL = "", bandR = "", bandOverall = "";
  if (opts.subtabL) {
    const keyL = await fetchAnswerKeys("L", opts.subtabL);
    const map = new Map(keyL.map(k => [k.q, k.a]));
    rawL = L.reduce((s, it) => s + (map.get(it.q) === it.a ? 1 : 0), 0);
  }
  if (opts.subtabR) {
    const keyR = await fetchAnswerKeys("R", opts.subtabR);
    const map = new Map(keyR.map(k => [k.q, k.a]));
    rawR = R.reduce((s, it) => s + (map.get(it.q) === it.a ? 1 : 0), 0);
  }

  const cfg = (await fetchConfig("IELTS_BAND_LR_ACAD")) || {};
  function toBand(raw: number, arr: any[]) {
    if (!Array.isArray(arr)) return "";
    let out = 0;
    for (const [r, b] of arr) if (raw >= r) out = b;
    return String(out);
  }
  bandL = toBand(rawL, cfg.listening || []);
  bandR = toBand(rawR, cfg.reading || []);
  const bands = [bandL, bandR].filter(Boolean).map(Number);
  bandOverall = bands.length ? (Math.round((bands.reduce((a, b) => a + b, 0) / bands.length) * 2) / 2).toFixed(1) : "";

  if (idx >= 0) {
    const rowIndex = idx + 2;
    await updateCells(`Attempts!A${rowIndex}:L${rowIndex}`, [[attempts[idx].id, attempts[idx].user_email, attempts[idx].test_id, attempts[idx].started_at, submitted, "submitted", String(rawL), String(rawR), bandL, bandR, bandOverall, attempts[idx].meta_json]]);
  }
  return { submitted_at: submitted, raw_L: rawL, raw_R: rawR, band_L: bandL, band_R: bandR, band_overall: bandOverall };
}
