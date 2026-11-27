// Brings the live sources' site full text in line with industry/sources.json, as an admin edit would:
// each changed source is re-derived by the worker, so its existing articles show (or stop showing) the body.
// The seed only adds missing sources and never edits existing ones; this is the deliberate way to apply the pack's choice.
// node --env-file=.env scripts/sync-fulltext.ts          (lists what would change)
// node --env-file=.env scripts/sync-fulltext.ts --apply  (applies it)
import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { updateSource } from "@aihot/backend/admin/sources";

const apply = process.argv.includes("--apply");
const { sources } = JSON.parse(readFileSync(path.join(REPO_ROOT, "industry/sources.json"), "utf8")) as { sources: { id: string; site_fulltext?: boolean }[] };
try {
  const live = await sql<{ id: string; site_fulltext: boolean; updated_at: Date }[]>`SELECT id, site_fulltext, updated_at FROM sources`;
  const byId = new Map(live.map((r) => [r.id, r]));
  for (const s of sources) {
    const row = byId.get(s.id);
    const want = s.site_fulltext ?? false;
    if (!row || row.site_fulltext === want) continue;
    if (apply) await updateSource(s.id, { patch: { site_fulltext: want }, version: new Date(row.updated_at).toISOString(), reason: "industry/sources.json" }, "sync-fulltext");
    console.log(`${s.id}: site_fulltext ${row.site_fulltext} -> ${want}${apply ? "" : " (dry run)"}`);
  }
} finally {
  await stopBoss();
  await closeDb();
}
