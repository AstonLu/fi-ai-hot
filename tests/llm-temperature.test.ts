// Failure mode: a model that rejects every temperature but its own default (Claude Haiku 5.5 and later)
// is sent one anyway, so every call is refused with a 400.
import { stub, tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { z } from "zod";
import { closeDb } from "@aihot/backend/db";
import { chatJson } from "@aihot/backend/providers/llm";

let last: Record<string, unknown> = {};
const server = await stub((_hit, req) => {
  last = JSON.parse(req.body) as Record<string, unknown>;
  return { choices: [{ message: { content: JSON.stringify({ value: "ok" }) } }] };
});
process.env.LLM_BASE_URL = `${server.url}/v1`;
process.env.LLM_API_KEY = "test-key";
process.env.LLM_MODEL = "test-model";
const T = tag();
const request = (name: string) => ({
  model: "default", purpose: "summarize_article", subject: `temperature:${T}:${name}`, promptVersion: "temperature-test",
  system: "Return the requested value.", user: `${T}:${name}`, schema: z.object({ value: z.string() }), temperature: 0.2,
});
after(async () => { await server.close(); await closeDb(); });

test("LLM_OMIT_TEMPERATURE=true sends no temperature", async () => {
  process.env.LLM_OMIT_TEMPERATURE = "true";
  try {
    const result = await chatJson(request("omitted"));
    assert.equal(result.data.value, "ok");
    assert.equal("temperature" in last, false);
  } finally {
    delete process.env.LLM_OMIT_TEMPERATURE;
  }
});

test("without it the call's own temperature is sent", async () => {
  await chatJson(request("sent"));
  assert.equal(last.temperature, 0.2);
});
