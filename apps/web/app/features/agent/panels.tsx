// The engine's ways in, one panel each: what it is for, the steps to connect, then the details folded away.
// Addresses are the site's configured public address (`base`); what visitors copy carries the site's tag
// (CopyTag) when it has one.
import { Fragment, useState } from "react";
import { PUBLIC_INTERFACE_VERSION } from "@aihot/contracts/http-policy";
import { MCP_TOOL_NAMES as T, MCP_TOOLS } from "@aihot/contracts/mcp";
import { feedCategoryLabel, feedCategoryLabelIn, PUBLIC_API_CATEGORY_KEYS } from "@aihot/contracts/taxonomy";
import { ACCESS, AGENT, EDITION_TIMES, EDITION_WHEN, POLICY, REPORTS, SITE, subjectAfter, withSubject } from "@aihot/site";
import { ENGLISH } from "@aihot/contracts/english";
import { CodeBlock, CopyButton } from "./CodeBlock";
import { PillTabs } from "../../components/ui/Tabs";
import type { AgentPanelProps } from "../../modules";
import { AGENT_PARTS, GUIDE_CLIENTS, TAG } from "./module-parts";
import { Address, Ask, Block, Bullets, Details, Mono, PanelHead, Step, Steps, Table, Tips } from "./parts";
import { Link } from "../../lib/link";
import { feedPath, L, shownIn, useLocale, useT } from "../../lib/i18n";

const V = PUBLIC_INTERFACE_VERSION;

/** Every MCP tool: the engine's and the modules'. */
export const mcpToolCount = () => MCP_TOOLS.length + AGENT_PARTS.reduce((n, a) => n + (a.tools?.length ?? 0), 0);
const link = "text-accent hover:underline";

/** When each report comes out, in English: "daily at 08:00 (GMT+8)". */
const WHEN_EN = ENGLISH?.editionWhen ?? EDITION_WHEN;

/** An address on this site as the copy buttons copy it, with the tag. */
function addressOf({ base, tag }: AgentPanelProps, path: string): string {
  return TAG && tag ? `${base}${path}?${TAG.query}=${tag}` : `${base}${path}`;
}

const MCP_CLIENTS = [
  { key: "claude", label: "Claude Code" },
  { key: "codex", label: "Codex" },
  { key: "json", label: L("JSON 配置", "JSON config") },
  { key: "other", label: L("其他客戶端", "Other clients") },
] as const;

export function McpPanel(props: AgentPanelProps) {
  const t = useT();
  const locale = useLocale();
  const tools = shownIn(locale, AGENT_PARTS.flatMap((p) => p.tools ?? []), (tool) => tool.does);
  const url = addressOf(props, "/api/mcp");
  const name = SITE.mcpPrefix;
  const [client, setClient] = useState<string>("claude");
  return (
    <>
      <PanelHead label={`MCP · ${V}`} title={t(`填一個地址，Agent 多出 ${mcpToolCount()} 個工具`, `Add one URL and your agent gets ${mcpToolCount()} new tools`)}>
        {t("標準 Streamable HTTP，匿名只讀，不用 token，也不讀你的登入狀態。適合 Claude 桌面版、Cursor、Cherry Studio 這類支援遠端 MCP 的客戶端。", `Standard Streamable HTTP, anonymous and read-only: no token needed, and it never accesses your account. Works with clients that support remote MCP, such as Claude Desktop, Cursor and Cherry Studio.${ENGLISH ? ` The news tools answer in English when your agent passes lang "en".` : ""}`)}
      </PanelHead>
      <Steps>
        <Step n={1} title={t("複製服務地址", "Copy the server URL")}>
          <Address url={url} />
          {TAG && <p className="mt-2 text-ui-label text-ink-3">{t(TAG.mcp)}</p>}
        </Step>
        <Step n={2} title={t("加到你的客戶端", "Add it to your client")}>
          <PillTabs className="mt-3" size="xs" layoutId="agent-mcp-client" label={t("客戶端", "Client")} active={client} onSelect={setClient} items={MCP_CLIENTS.map((c) => ({ key: c.key, label: t(c.label) }))} />
          {client === "claude" && <CodeBlock className="mb-0 mt-3" lang="bash" code={`claude mcp add --transport http ${name} '${url}'`} />}
          {client === "codex" && <CodeBlock className="mb-0 mt-3" lang="bash" code={`codex mcp add ${name} --url '${url}'`} />}
          {client === "json" && <CodeBlock className="mb-0 mt-3" title={t("Cursor、Cherry Studio 等用 JSON 配置的客戶端", "Cursor, Cherry Studio and other clients set up with JSON")} lang="json" code={JSON.stringify({ mcpServers: { [name]: { type: "http", url } } }, null, 2)} />}
          {client === "other" && <p className="mt-3">{t(`在客戶端的 MCP 或聯結器設定裡新建一項：名稱填 ${name}，地址填上面的網址，認證選“無”，不要填 API Key。只支援本地命令的客戶端，先用它自帶的遠端 MCP 代理。`, `In your client's MCP or connector settings, add a new entry: name it ${name}, paste the URL above, set authentication to "None", and leave the API key empty. If your client only runs local commands, go through its built-in remote MCP proxy.`)}</p>}
        </Step>
        <Step n={3} title={t("讓 Agent 調一次", "Test it with your agent")}>
          <Ask text={t(`請呼叫 ${T.latest}，告訴我過去 24 小時最重要的${subjectAfter(" 5 條", "資訊")}，並附 ${SITE.name} 連結。`, `Call ${T.latest} with lang "en" and tell me the 5 most important ${SITE.subject} news stories of the past 24 hours, with ${SITE.name} links.`)} />
          <p className="mt-2 text-ui-label text-ink-3">{t(`客戶端顯示呼叫了 ${T.latest}，回答裡有時間範圍、中文摘要和 ${new URL(props.base).host} 連結，就是連上了。`, `If your client shows a call to ${T.latest} and the answer has a time range, summaries and ${new URL(props.base).host} links, you're connected. Without lang "en" the tool answers in Chinese.`)}</p>
        </Step>
      </Steps>

      <Block title={t(`${mcpToolCount()} 個工具`, `${MCP_TOOLS.length + tools.length} tools available in English`)}>
        <Table
          head={[t("工具", "Tool"), t("能做什麼", "What it does"), t("可以這樣問", "Try asking")]}
          minWidth={600}
          rows={[
            [<Mono>{T.latest}</Mono>, t("過去 24 小時或最近 7 天的精選、全部資訊", "Top picks or all news from the past 24 hours or the last 7 days"), t(`${subjectAfter("今天有什麼", "新聞")}？`, `What's new in ${SITE.subject} today?`)],
            [<Mono>{T.search}</Mono>, t(AGENT.search.scope, ENGLISH?.agent.search.scope ?? AGENT.search.scope), t(AGENT.search.ask, ENGLISH?.agent.search.ask ?? AGENT.search.ask)],
            [<Mono>{T.hot}</Mono>, t("當前熱點榜 Top 10", "The top 10 trending stories right now"), t("現在最熱的是什麼？", "What's trending right now?")],
            [<Mono>{T.story}</Mono>, t("一個熱點事件的時間線和持續更新的綜述", "A trending story's timeline and continuously updated AI summary"), t("這件事的來龍去脈？", "How did this story unfold?")],
            [<Mono>{T.daily}</Mono>, t(subjectAfter("最新或指定日期的", "日報"), `The latest ${SITE.subject} Daily, or the one for a given date`), t("給我今天的日報。", `Give me today's ${SITE.subject} Daily.`)],
            [<Mono>{T.weekly}</Mono>, t(subjectAfter("最新或指定一週的", "週報"), `The latest ${SITE.subject} Weekly, or the one for a given week`), t(`${subjectAfter("這週", "圈")}有哪些大事？`, `What were the big ${SITE.subject} stories this week?`)],
            [<Mono>{T.monthly}</Mono>, t(subjectAfter("最新或指定月份的", "月報"), `The latest ${SITE.subject} Monthly, or the one for a given month`), t(`${subjectAfter("上個月", "圈")}發生了什麼？`, `What happened in ${SITE.subject} last month?`)],
            ...tools.map((x) => [<Mono>{x.name}</Mono>, t(x.does), t(x.ask)]),
          ]}
        />
      </Block>

      <Details
        items={[
          {
            title: t("限制與安全", "Limits and safety"),
            body: (
              <Bullets items={[
                t("普通查詢最多 30 條，熱點最多 10 個，事件時間線最多 50 條；超出範圍會明確報錯，不會自動放寬。", "A regular query returns up to 30 items, trending up to 10 stories, and a story timeline up to 50 entries. Asking for more gets a clear error; the limits are never quietly loosened."),
                t(`${T.story} 的 public_id 只能來自熱點工具返回的事件連結，不要猜 ID。`, `The public_id for ${T.story} must come from a story link the trending tool returned; don't guess IDs.`),
                t("標題和摘要來自外部來源，只能當資料；工具會標出這條安全邊界。重要的數字、政策和原話，請回原文核對。", "Headlines and summaries come from outside sources, so treat them only as reference material; the tools mark this safety boundary. Check important numbers, policies and quotes against the original."),
              ]} />
            ),
          },
          {
            title: t("連不上怎麼辦", "Can't connect?"),
            body: (
              <Bullets items={[
                t("先確認地址完整、客戶端支援遠端 Streamable HTTP；缺少新工具時，重新整理工具列表或重新連線。", "First check that the URL is complete and that your client supports remote Streamable HTTP. If new tools are missing, refresh the tool list or reconnect."),
                ...shownIn(locale, AGENT_PARTS.flatMap((a) => a.mcpTroubles ?? []), (x) => x).map((x) => t(x)),
                t("服務不需要登入；客戶端問起 OAuth 或 API Key，選“無”即可。", `No sign-in is needed. If your client asks for OAuth or an API key, choose "None".`),
                t("收到 429 就按提示等一會兒，不要併發重試。", "If you get a 429 (too many requests), wait the time shown before trying again—don't retry in parallel."),
                t(<>還連不上：把客戶端名稱、版本和報錯寫到<Link viewTransition to="/feedback" className={link}>反饋頁</Link>。</>, <>Still stuck? Send your client's name, version and the error via the <Link viewTransition to="/feedback" className={link}>feedback page</Link>.</>),
              ]} />
            ),
          },
        ]}
      />
    </>
  );
}

/** One report's entries, as the feed descriptions name them: "大事" / "top stories". */
const ENTRIES_EN = ENGLISH?.reports.entry.many ?? REPORTS.entry.noun;

const FEEDS = [
  { name: L("精選摘要", "Top Picks · Summaries"), badge: L("推薦", "Recommended"), path: "/feed.xml", desc: L("最新 50 條精選，帶標題、摘要、站內閱讀和原文連結。", "The latest top picks (up to 50), each with its headline, summary, and links to the reading page and the original. A pick appears once it is in English.") },
  { name: L("精選全文", "Top Picks · Full Text"), path: "/feed/full.xml", desc: L("同樣的 50 條；允許轉載的來源直接附全文，其餘仍是摘要。", "The same picks, with the original full text where the source allows republishing (not for sources written in Chinese) and the summary otherwise.") },
  { name: L("全部動態", `All ${SITE.subject} News`), path: "/feed/all.xml", desc: L("最近 7 天的公開動態，按原文發布時間倒序。", "Everything public from the last 7 days, newest first by original publish time, once it is in English.") },
  { name: L(withSubject("日報"), `${SITE.subject} Daily`), path: "/feed/daily.xml", desc: L(`${EDITION_WHEN.daily}（北京時間）一期：頭條導語加整期目錄，保留最近 30 期。`, `New issue ${WHEN_EN.daily}: the lead story's intro plus the full table of contents. Keeps the last 30 issues.`) },
  { name: L(withSubject("週報"), `${SITE.subject} Weekly`), path: "/feed/weekly.xml", desc: L(`${EDITION_WHEN.weekly}（北京時間）一期：總述加按欄目分好的${REPORTS.entry.noun}，保留最近 12 期。`, `New issue ${WHEN_EN.weekly}: an overview plus the ${ENTRIES_EN} grouped by section. Keeps the last 12 issues.`) },
  { name: L(withSubject("月報"), `${SITE.subject} Monthly`), path: "/feed/monthly.xml", desc: L(`${EDITION_WHEN.monthly}（北京時間）一期：總述加按欄目分好的${REPORTS.entry.noun}，保留最近 12 期。`, `New issue ${WHEN_EN.monthly}: an overview plus the ${ENTRIES_EN} grouped by section. Keeps the last 12 issues.`) },
];

/** The category feeds, under the names the feeds themselves use. */
const FEED_CATEGORIES = PUBLIC_API_CATEGORY_KEYS.map((key) => [key, L(feedCategoryLabel(key), feedCategoryLabelIn(key, "en"))] as const);

export function RssPanel(props: AgentPanelProps) {
  const t = useT();
  const locale = useLocale();
  const { base } = props;
  const lead = `${[t("相容主流 RSS 2.0 閱讀器，也能接 n8n、Zapier 這類自動化工具。地址長期不變", "Works with any mainstream RSS 2.0 reader, and with automation tools like n8n and Zapier. The feed URLs won't change"), ...shownIn(locale, AGENT_PARTS.flatMap((a) => a.rssLead ?? []), (x) => x).map((x) => t(x))].join(t("；", "; "))}${t("。", ".")}`;
  return (
    <>
      <PanelHead label="RSS" title={t("複製地址，用閱讀器訂閱", "Copy a feed URL into your reader")}>
        {lead}
      </PanelHead>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FEEDS.map((f) => ({ ...f, path: feedPath(f.path, locale) })).map((f) => (
          <div key={f.path} className="card flex flex-col p-4">
            <div className="flex items-center gap-2">
              <span className="text-ui-body font-semibold text-ink">{t(f.name)}</span>
              {f.badge && <span className="inline-flex h-[18px] items-center rounded-full bg-accent-soft px-2 text-ui-caption-sm font-medium text-accent">{t(f.badge)}</span>}
            </div>
            <p className="mt-1 flex-1 text-ui-label leading-[1.7] text-ink-3">{t(f.desc)}</p>
            <div className="mt-3 flex items-center gap-2 border-t border-line-soft pt-3">
              <code className="mono min-w-0 flex-1 truncate text-ui-caption text-ink-4">{base}{f.path}</code>
              <CopyButton text={addressOf(props, f.path)} label={t("複製地址", "Copy feed URL")} className="shrink-0" />
            </div>
          </div>
        ))}
      </div>
      {TAG && <p className="mt-3 text-ui-caption-lg text-ink-4">{t(TAG.rss)}</p>}

      <Block title={t("按分類訂閱", "Subscribe by category")}>
        <Table
          head={[t("分類", "Category"), t("摘要", "Summary"), t("全文", "Full text")]}
          minWidth={420}
          rows={FEED_CATEGORIES.map(([slug, label]) => [
            <span className="font-medium text-ink">{t(label)}</span>,
            ...[`/feed/category/${slug}.xml`, `/feed/full/category/${slug}.xml`].map((path) => feedPath(path, locale)).map((path) => (
              <span className="inline-flex items-center gap-2"><Mono>{path}</Mono><CopyButton text={addressOf(props, path)} className="!h-6 !px-1.5" /></span>
            )),
          ])}
        />
      </Block>

      <Block title={t("重新整理多快合適", "How often to refresh")}>
        <p>{t("閱讀器會帶著上次的 ETag 來問，內容沒變時只回一個很小的 304，不重複下載。30 分鐘重新整理一次就夠，更快也拿不到新的內容。", "Your reader sends the ETag from its last check; if nothing has changed, it gets a tiny 304 response and skips downloading again. Refreshing every 30 minutes is plenty—faster checks won't bring newer items.")}</p>
        <p className="mt-3 text-ui-label text-ink-3">{t(`條目連結指向站內閱讀頁，原文連結在摘要裡。能匿名訂閱不等於所有用途都獲許可${POLICY.terms.notes ? `：${POLICY.terms.notes.rss}` : ""}，見`, `Item links open the reading page on this site; the link to the original is in the summary. Subscribing anonymously doesn't mean every use is allowed${ENGLISH?.termsNotes ? `: ${ENGLISH.termsNotes.rss}` : ""}. See `)}<Link viewTransition to="/terms" className={link}>{t(POLICY.terms.name, ENGLISH?.policyLinks.terms ?? POLICY.terms.name)}</Link>{t("。", ".")}</p>
      </Block>
    </>
  );
}

const RECIPES = [
  { key: "latest", label: L("盯最新資訊", "Watch the latest news") },
  { key: "sync", label: L("同步全部精選", "Sync all top picks") },
];

export function ApiPanel(props: AgentPanelProps) {
  const t = useT();
  const locale = useLocale();
  const { base, tag } = props;
  const userAgent = [ACCESS.userAgent, TAG && tag ? TAG.userAgent(tag) : null].filter(Boolean).join(" ");
  const curl = `curl --compressed${userAgent ? ` -A '${userAgent}'` : ""}`;
  let pace = t(`內容多久變一次：新資訊全天陸續進來，精選每天變幾次到幾十次，日報${EDITION_WHEN.daily}、週報${EDITION_WHEN.weekly}、月報${EDITION_WHEN.monthly}（北京時間）各一期。`, `How often things change: new stories come in all day, top picks change from a few to dozens of times a day, and the Daily comes out ${WHEN_EN.daily}, the Weekly ${WHEN_EN.weekly} and the Monthly ${WHEN_EN.monthly}.`);
  if (ACCESS.ratePerMinute) pace += t(`同一個 IP 每分鐘超過約 ${ACCESS.ratePerMinute} 次會收到 429，請按 Retry-After 等待，不要併發重試。`, ` More than about ${ACCESS.ratePerMinute} requests a minute from one IP get a 429: wait as Retry-After says, and don't retry in parallel.`);
  const [recipe, setRecipe] = useState<string>("latest");
  const recipes = shownIn(locale, AGENT_PARTS.flatMap((a) => a.recipes ?? []), (r) => r.label);
  // English pages show the English answer: lang=en on any reader's address.
  const items = `${base}/api/v1/items?mode=selected&window=24h&limit=20${locale === "en" && ENGLISH ? "&lang=en" : ""}`;
  return (
    <>
      <PanelHead label={`REST API · ${V}`} title={t("匿名 GET，拿來就能用", "Anonymous GET, ready to use")}>
        {t(<>不用 token；瀏覽器跨域、curl 和各語言預設的 HTTP 客戶端都能直接調。路徑是 /api/v1，欄位和錯誤碼以 <a href="/openapi-v1.json" className={link}>OpenAPI</a> 為準。</>, <>No token needed: call it straight from a browser (cross-origin works), curl or any language's standard HTTP client. The path is /api/v1, and the <a href="/openapi-v1.json" className={link}>OpenAPI</a> definition is the reference for fields and error codes.{ENGLISH ? " Add lang=en for titles, summaries and page links in English." : ""}</>)}
      </PanelHead>
      <CodeBlock className="mt-6" title={t("第一個請求", "Your first request")} lang="bash" code={`${curl} '${items}'`} />

      <Block title={t("按分類篩選", "Filter by category")}>
        <p>{t(<>在資訊請求中加上 <Mono>category</Mono>，只取對應分類；不傳則包含全部分類。返回條目的 <Mono>category</Mono> 也使用下表中的值。</>, <>Add <Mono>category</Mono> to a news request to get only that category; leave it out to get all of them. The <Mono>category</Mono> of returned items uses the values below too.</>)}</p>
        <Table head={[t("分類", "Category"), t("請求引數", "Parameter")]} rows={FEED_CATEGORIES.map(([key, name]) => [t(name), <Mono>{`category=${key}`}</Mono>])} />
      </Block>

      <Block title={t("用得省，也更快", "Lighter and faster")}>
        <Tips
          items={[
            { title: t("開壓縮", "Turn on compression"), text: t(<>curl 加 <Mono>--compressed</Mono>，其他客戶端開啟 gzip 或 br。JSON 壓縮後只有原來的 1/4 到 1/8。</>, <>Add <Mono>--compressed</Mono> to curl, or turn on gzip or br in other clients. Compressed JSON is 1/4 to 1/8 of its original size.</>) },
            { title: t("帶上 ETag", "Send the ETag"), text: t(<>儲存響應裡的 ETag，下次帶 <Mono>If-None-Match</Mono>；內容沒變時返回 304，不傳正文。</>, <>Save the ETag from the response and send it back as <Mono>If-None-Match</Mono>; if nothing has changed, you get a 304 with no body.</>) },
            { title: t("按節奏取", "Fetch at the right pace"), text: t(`資訊和熱點最快一分鐘一次；日報${EDITION_WHEN.daily} 後取一次，週報、月報出刊後取一次；往回翻頁翻到已有的那條就停。`, `News and trending at most once a minute; the Daily once a day after ${EDITION_TIMES.daily} (GMT+8), the Weekly and Monthly once after each new issue; when paging back, stop at the first item you already have.`) },
          ]}
        />
        <p className="mt-3 text-ui-label leading-[1.75] text-ink-3">{pace}</p>
      </Block>

      <Block title={t("介面一覽", "All endpoints")}>
        <Table
          head={[t("路徑", "Path"), t("用來做什麼", "What it's for"), t("多久取一次", "How often to fetch")]}
          minWidth={640}
          rows={[
            { group: t("資訊", "News") },
            [<Mono>/api/v1/items</Mono>, t("精選或最近 7 天全部動態，可按分類、時間窗、關鍵詞篩", "Top picks, or all news from the last 7 days; filter by category, time window or keyword"), t("最快 1 分鐘一次", "At most once a minute")],
            { group: t("熱點與事件", "Trending and stories") },
            [<Mono>/api/v1/hot-topics</Mono>, t("當前熱點榜 Top 10", "The top 10 trending stories right now"), t("最快 1 分鐘一次", "At most once a minute")],
            [<Mono>{"/api/v1/stories/{publicId}"}</Mono>, t("一個事件的報導時間線、AI 綜述和關聯事件", "A story's coverage timeline, AI summary and related stories"), t("需要時", "When needed")],
            { group: t("日報", "Daily") },
            [<Mono>/api/v1/dailies/latest</Mono>, t("最新一期日報", "The latest Daily"), t(`${EDITION_WHEN.daily} 後一次`, `Once a day, after ${EDITION_TIMES.daily} (GMT+8)`)],
            [<Mono>{"/api/v1/dailies/{date}"}</Mono>, t("指定日期日報；撤稿會移除引用", "The Daily for a given date; retracted stories are removed from it"), t("快取過期後須帶 ETag 驗證更新", "Once the cache expires, check for updates with the ETag")],
            [<Mono>/api/v1/dailies</Mono>, t("日報日期索引", "Index of Daily dates"), t("每天一次", "Once a day")],
            { group: t("週報與月報", "Weekly and Monthly") },
            [<Mono>/api/v1/weeklies/latest</Mono>, t("最新一期週報：頭條、總述和一週重點，按欄目分好", "The latest Weekly: the lead story, an overview and the week's key stories, grouped by section"), t(`${EDITION_WHEN.weekly} 後一次`, `Once a week, after ${EDITION_TIMES.weekly} on Mondays (GMT+8)`)],
            [<Mono>{"/api/v1/weeklies/{week}"}</Mono>, t("指定一週，ISO 周如 2026-W39；撤稿會移除引用", "A given week, as an ISO week like 2026-W39; retracted stories are removed from it"), t("快取過期後須帶 ETag 驗證更新", "Once the cache expires, check for updates with the ETag")],
            [<Mono>/api/v1/weeklies</Mono>, t("週報索引", "Index of Weekly issues"), t("每週一次", "Once a week")],
            [<Mono>/api/v1/monthlies/latest</Mono>, t("最新一期月報", "The latest Monthly"), t(`${EDITION_WHEN.monthly} 後一次`, `Once a month, after ${EDITION_TIMES.monthly} on the 1st (GMT+8)`)],
            [<Mono>{"/api/v1/monthlies/{month}"}</Mono>, t("指定月份，如 2026-09", "A given month, like 2026-09"), t("快取過期後須帶 ETag 驗證更新", "Once the cache expires, check for updates with the ETag")],
            [<Mono>/api/v1/monthlies</Mono>, t("月報索引", "Index of Monthly issues"), t("每月一次", "Once a month")],
            ...shownIn(locale, AGENT_PARTS.flatMap((a) => (a.api ? [a.api] : [])), (api) => api.group)
              .flatMap((api) => [{ group: t(api.group) }, ...api.rows.map(([path, does, often]) => [<Mono>{path}</Mono>, t(does), t(often)])]),
            { group: t("給 AI 助手", "For AI assistants") },
            [<Mono>/api/v1/agent</Mono>, t(`給 Agent 的使用說明，列出的地址返回整理好的中文 Markdown${GUIDE_CLIENTS ? `；${GUIDE_CLIENTS.zh} 用的就是它們` : ""}`, `Instructions for agents; the URLs it lists return clean Markdown, in English with lang=en${GUIDE_CLIENTS ? `, and they power ${GUIDE_CLIENTS.en}` : ""}`), t("需要時", "When needed")],
            { group: t("完整精選同步", "Full top picks sync") },
            [<Mono>/api/v1/selected/snapshot</Mono>, t("當前全部精選，分頁一次拿全", "All current top picks, paginated so you can fetch the full set"), t("只在第一次", "Only the first time")],
            [<Mono>/api/v1/selected/changes</Mono>, t("之後的新增、修改和撤選", "What's been added, changed or dropped from top picks since"), t("幾分鐘一次", "Every few minutes")],
          ]}
        />
      </Block>

      <Block title={t("常見用法", "Common recipes")}>
        <PillTabs size="xs" layoutId="agent-api-recipe" label={t("用法", "Recipe")} active={recipe} onSelect={setRecipe} items={[...RECIPES, ...recipes].map((r) => ({ key: r.key, label: t(r.label) }))} />
        {recipe === "latest" && (
          <>
            <CodeBlock className="mb-3 mt-3" lang="bash" code={t(`# 第一次：儲存響應頭裡的 ETag\n${curl} -i '${items}'\n# 之後最快每分鐘一次，帶上 ETag；返回 304 就是沒變化\n${curl} -i -H 'If-None-Match: <上次的 ETag>' '${items}'`, `# First time: save the ETag from the response headers\n${curl} -i '${items}'\n# After that, at most once a minute, with the ETag; a 304 means nothing changed\n${curl} -i -H 'If-None-Match: <last ETag>' '${items}'`)} />
            <p>{t(<>需要往回翻頁時，把 <Mono>page.nextCursor</Mono> 作為 cursor 傳回去，翻到已經有的那條就停，不要每次把 7 天重翻一遍。</>, <>To page back, pass <Mono>page.nextCursor</Mono> back as cursor and stop at the first item you already have. Don't page through all 7 days every time.</>)}</p>
          </>
        )}
        {recipe === "sync" && (
          <>
            <CodeBlock className="mb-3 mt-3" lang="bash" code={t(`# 第一次：分頁拿全。儲存第一頁響應裡的 cursor（每頁都一樣）\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500'\n# hasMore 為 true 就帶上 nextPage 繼續翻，直到翻完\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500&page=<上一頁的 nextPage>'\n# 之後：原樣傳回 cursor，只拿新增、修改和撤選\n${curl} '${base}/api/v1/selected/changes?cursor=<第一頁的 cursor>&limit=100'`, `# First time: page through everything. Save the cursor from the first page's response (it's the same on every page)\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500'\n# While hasMore is true, keep paging with nextPage until you reach the end\n${curl} '${base}/api/v1/selected/snapshot?fields=minimal&limit=500&page=<nextPage from the previous page>'\n# After that: send the cursor back as it is to get only what's been added, changed or dropped\n${curl} '${base}/api/v1/selected/changes?cursor=<cursor from the first page>&limit=100'`)} />
            <p>{t(<>每頁成功寫進本地後再儲存新的 cursor。cursor 是同步位置，不會自動過期；若返回 409 <Mono>snapshot_required</Mono>，說明增量無法續接，請重新拉取一次完整快照。</>, <>Save the new cursor only after each page is safely stored on your side. The cursor marks where your sync is and never expires on its own. If you get a 409 <Mono>snapshot_required</Mono>, incremental sync can't resume from there: fetch a full snapshot again.</>)}</p>
          </>
        )}
        {recipes.map((r) => recipe === r.key && <r.Body key={r.key} base={base} curl={curl} />)}
      </Block>

      <Block title={t("出錯了怎麼辦", "When something goes wrong")} id="agent-api-recovery">
        <dl className="grid grid-cols-[76px_minmax(0,1fr)] gap-x-3 gap-y-2.5">
          <dt className="mono text-ui-label text-ink">400</dt>
          <dd>{t("引數不對：按 OpenAPI 和返回的 code 修正，不要自動換成更寬的查詢。cursor 無效或滑出時間窗返回 invalid_cursor，從第一頁重來。", "Bad parameters: fix them using the OpenAPI definition and the returned code, and don't automatically switch to a broader query. An invalid or expired cursor (outside the time window) returns invalid_cursor—start again from the first page.")}</dd>
          <dt className="mono text-ui-label text-ink">409</dt>
          <dd>{t("snapshot_required：增量沒法安全續上，重新取一次完整快照。", "snapshot_required: incremental sync can't safely continue from here. Fetch a full snapshot again.")}</dd>
          <dt className="mono text-ui-label text-ink">429</dt>
          <dd>{t("請求太密：按 Retry-After 等待，不要併發重試。", "Too many requests: wait as Retry-After says, and don't retry in parallel.")}</dd>
          <dt className="mono text-ui-label text-ink">5xx</dt>
          <dd>{t("指數退避，先用上次成功的結果；公開服務不承諾 SLA。", "Back off exponentially and use your last good result in the meantime; the public service comes with no SLA.")}</dd>
          {shownIn(locale, AGENT_PARTS.flatMap((a) => a.apiErrors ?? []), ([status]) => status).map(([status, what]) => (
            <Fragment key={t(status)}>
              <dt className="mono text-ui-label text-ink">{t(status)}</dt>
              <dd>{what}</dd>
            </Fragment>
          ))}
        </dl>
        <p className="mt-4 text-ui-label text-ink-3">{t(`能匿名呼叫不等於所有用途都獲許可${POLICY.terms.notes ? `：${POLICY.terms.notes.api}` : ""}，見`, `Calling it anonymously doesn't mean every use is allowed${ENGLISH?.termsNotes ? `: ${ENGLISH.termsNotes.api}` : ""}. See `)}<Link viewTransition to="/terms" className={link}>{t(POLICY.terms.name, ENGLISH?.policyLinks.terms ?? POLICY.terms.name)}</Link>{t("。", ".")}</p>
      </Block>

    </>
  );
}
