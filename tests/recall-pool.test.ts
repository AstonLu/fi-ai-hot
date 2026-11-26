// Recall must keep the same evidence through a query-plan change: discovery defines the window,
// live stories and membership roles define eligibility, and the latest analysis (revision, then id)
// excludes composites even before publication catches up. Shared reports retain every fact.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { recallFacts } from "@aihot/backend/events/recall";
import { reportText } from "@aihot/backend/events/relate";

const T = `recall-${tag()}`;
const title = `${T}模型发布全新版本详细说明`;
after(closeDb);

test("recall preserves window, live-story, membership and latest-analysis evidence", async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode)
    VALUES (${T}, 'Recall fixture', 'rss', 'T1', 'editorial')`;
  const [live] = await sql<{ id: number }[]>`INSERT INTO stories (public_id, title, first_report_at, latest_at)
    VALUES (${randomUUID()}, ${title}, now(), now()) RETURNING id`;
  const [merged] = await sql<{ id: number }[]>`INSERT INTO stories (public_id, title, first_report_at, latest_at, merged_into)
    VALUES (${randomUUID()}, ${title}, now(), now(), ${live!.id}) RETURNING id`;
  const expected: number[] = [];
  for (const [index, scenario] of ["single", "missing-analysis", "unknown-scope", "composite", "latest-single", "latest-composite", "higher-revision", "old-discovery", "boundary", "recent-discovery", "mention", "merged", "shared"].entries()) {
    const id = `${T}-${scenario}`;
    await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at, published_at)
      VALUES (${id}, ${T}, ${id}, ${`https://example.org/${id}`}, ${title},
        now() - CASE WHEN ${scenario} = 'old-discovery' THEN interval '15 days'
          WHEN ${scenario} = 'boundary' THEN interval '14 days' + interval '1 minute'
          WHEN ${scenario} = 'recent-discovery' THEN interval '14 days' - interval '1 minute' ELSE interval '1 day' END,
        now(), now() - interval '1 year')`;
    const [fact] = await sql<{ id: number }[]>`INSERT INTO facts (public_id, story_id, title)
      VALUES (${`${T}-fact-${index}`}, ${scenario === "merged" ? merged!.id : live!.id}, ${title}) RETURNING id`;
    await sql`INSERT INTO fact_articles (fact_id, article_id, role)
      VALUES (${fact!.id}, ${id}, ${scenario === "mention" ? "mention" : index % 2 ? "primary" : "report"})`;
    if (scenario !== "missing-analysis") {
      await sql`INSERT INTO analyses (article_id, input_revision, origin, title_zh, output)
        VALUES (${id}, ${scenario === "higher-revision" ? 2 : 1}, 'rule', ${title},
          ${sql.json(scenario === "unknown-scope" ? {} : { scope: ["composite", "latest-single"].includes(scenario) ? "composite" : "single" })})`;
      if (["latest-single", "latest-composite", "higher-revision"].includes(scenario)) {
        await sql`INSERT INTO analyses (article_id, input_revision, origin, title_zh, output)
          VALUES (${id}, 1, 'rule', ${title}, ${sql.json({ scope: scenario === "latest-single" ? "single" : "composite" })})`;
        await sql`INSERT INTO publications (article_id, analysis_id, title, source_id, channel, url, discovered_at, timeline_at, sort_at)
          SELECT a.id, (SELECT min(id) FROM analyses WHERE article_id = a.id), a.title, a.source_id, 'news', a.url,
            a.discovered_at, a.timeline_at, a.timeline_at FROM articles a WHERE a.id = ${id}`;
      }
    }
    if (!["composite", "latest-composite", "old-discovery", "boundary", "mention", "merged"].includes(scenario)) expected.push(fact!.id);
    if (scenario === "shared") {
      const [second] = await sql<{ id: number }[]>`INSERT INTO facts (public_id, story_id, title)
        VALUES (${`${T}-shared-fact`}, ${live!.id}, ${title}) RETURNING id`;
      await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${second!.id}, ${id}, 'primary')`;
      expected.push(second!.id);
    }
  }
  const recalled = await recallFacts(`${T}-query`, title, 0, 1000);
  assert.deepEqual(recalled.map(r => r.factId).sort((a, b) => a - b), expected.sort((a, b) => a - b));
  assert.ok(recalled.every(r => r.score === 1 && r.storyId === live!.id && r.factTitle === title));
});

// Failure mode (production, 2026-11-26, no embedding key): reports of one news by different outlets,
// translated apart, shared too few bigrams to be recalled, so each opened its own card.
const SAME_NEWS = [
  { shown: { title: "麥肯錫：代理式 AI 與機構智慧將定義 2027 年銀行業", summary: "麥肯錫於 2026 年 11 月發布的報告指出，AI 代理將越來越多地自主處理資金交易，大型語言模型也正成為銀行的新分銷渠道。調查顯示，23% 的零售銀行客戶已用生成式 AI 處理金融需求，其中 74% 的 AI 使用者依賴 ChatGPT、Claude 或 Gemini，約為使用銀行自家聊天機器人者的兩倍。" },
    later: [
      { title: "麥肯錫報告：多數銀行的AI生產力提升尚未轉化為顯著獲利", summary: "麥肯錫2026年AI現況調查顯示，僅6%受訪機構表示AI對息稅前利潤（EBIT）有顯著貢獻，80%受訪者則報告個人生產力有所提升。報告指出，節省的個人時間未必降低成本或增加產出，銀行需重新設計流程、重組職務並串接內部資料，才能把效率轉為獲利。另有48%的銀行主管將資料準備列為最大的AI挑戰。" },
      { title: "麥肯錫：AI 代理若搬移 5 至 10% 活存，銀行存款獲利恐降 20%", summary: "麥肯錫《2026 全球銀行年度報告》預估，若 AI 代理把 5% 至 10% 的活存餘額轉往高收益金融產品，銀行存款相關獲利可能下降 20%。麥肯錫 6 月對 46,000 名主要國家金融消費者的調查顯示，23% 受訪者已用生成式 AI 處理金融事務，72% 的 AI 使用者願意至少交給 AI 代理一項金融任務。" },
    ] },
  { shown: { title: "富國銀行要求客戶自負 AI 代理操作風險", summary: "富國銀行於 11 月 24 日更新線上存取協議，明確客戶須自行負責其 AI 代理的使用風險，並需監控代理活動、妥善撤銷授權並保留證據。協議也保留了要求用戶登記代理、限制代理存取的權利。文中提到 Citi 有類似條款，達拉斯聯準銀行的調查顯示 11.4% 的受訪銀行人員表示已限制 AI 代理在網路銀行的活動。" },
    later: [{ title: "富國銀行條款將第三方 AI 代理的操作責任歸於客戶", summary: "富國銀行更新網銀服務條款第 15 條，於 11 月 24 日生效，規定經第三方 AI 代理發出的請求可能被視為客戶本人發出，客戶需自行監控代理並保留撤銷授權的證據。文章提到花旗、摩根大通、PNC 等也調整了條款，而 Hunton Andrews Kurth 的追蹤顯示另有四家大型銀行選擇直接阻擋客戶指定的 AI 代理。" }] },
  { shown: { title: "Standard Bank Group 如何以自動化流程評估生成式 AI 風險", summary: "Standard Bank Group 與 AWS Professional Services 合作，部署自動化評估系統，依國際 AI 標準與該行內部政策為每個生成式 AI 用例評分並產出報告。原文稱，該流程把原本人工約兩週的審查縮短為約兩小時產生的完整風險報告，修補後風險評分改善14%。" },
    later: [{ title: "南非標準銀行自動化生成式 AI 風險檢查", summary: "南非標準銀行要求生成式 AI 應用在交付客戶或員工前先經風險委員會核准，自動化流程負責蒐集大部分證據，最終決定仍由委員會做出。在六項評估中，系統約兩小時產出風險報告，人工審查則約需兩週，但此時間不含人工審閱與核准。該行報告用例風險分數改善14%，但未說明起始分數、計算方式與系統成本。" }] },
  { shown: { title: "國泰產險智能理賠平台獲Gartner 2026保險創新獎", summary: "國泰產險以Smart Claim智能理賠平台的「判決估損」應用獲得Gartner 2026年保險創新獎，是本屆唯一獲獎的台灣保險業者。導入後，體傷案件處理效率提升3倍，理賠金額評估差異降低66.7％，系統會擷取判決中的傷勢、醫療費用與裁定金額，自動檢索相似案例並提供精神慰撫金估算供理賠人員參考。" },
    later: [{ title: "國泰產險 AI 智能理賠獲 Gartner 2026 國際創新獎，為本屆唯一台灣保險業得獎者", summary: "國泰產險以 Smart Claim 智能理賠平台的「判決估損」應用，獲得 Gartner「2026 Eye on Innovation Awards for Insurance」肯定，是本屆唯一獲獎的台灣保險業者。體傷案件的精神慰撫金評估過去需要人工逐篇查找法院判決，現在 AI 會自動檢索相似案例並提供估算參考。" }] },
];

test("without embeddings, reports of one news by different outlets still recall each other's fact", async () => {
  const source = `${T}-outlets`;
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode) VALUES (${source}, 'Outlets fixture', 'rss', 'T2', 'editorial')`;
  const facts: number[] = [];
  for (const [index, news] of SAME_NEWS.entries()) {
    const id = `${T}-outlet-${index}`;
    await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at, published_at)
      VALUES (${id}, ${source}, ${id}, ${`https://example.org/${id}`}, ${news.shown.title}, now() - interval '1 day', now(), now() - interval '1 day')`;
    await sql`INSERT INTO analyses (article_id, input_revision, origin, title_zh, summary_zh, output)
      VALUES (${id}, 1, 'rule', ${news.shown.title}, ${news.shown.summary}, ${sql.json({ scope: "single" })})`;
    const [story] = await sql<{ id: number }[]>`INSERT INTO stories (public_id, title) VALUES (${randomUUID()}, ${news.shown.title}) RETURNING id`;
    const [fact] = await sql<{ id: number }[]>`INSERT INTO facts (public_id, story_id, title) VALUES (${`${T}-outlet-fact-${index}`}, ${story!.id}, ${news.shown.title}) RETURNING id`;
    await sql`INSERT INTO fact_articles (fact_id, article_id, role) VALUES (${fact!.id}, ${id}, 'report')`;
    facts.push(fact!.id);
  }
  for (const [index, news] of SAME_NEWS.entries()) {
    for (const later of news.later) {
      const recalled = await recallFacts(`${T}-outlet-query`, reportText(later.title, later.summary), 0.6, 10);
      assert.ok(recalled.some(r => r.factId === facts[index]), `${later.title} recalls ${news.shown.title}`);
    }
  }
});
