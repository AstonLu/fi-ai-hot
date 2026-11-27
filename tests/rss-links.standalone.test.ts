// Atom entry publication and update times stay separate; link bases follow the fetched document URL,
// for RSS items too (Baidu's ERNIE blog feed gives site-relative item links).
import assert from "node:assert/strict";
import http from "node:http";
import { after, test } from "node:test";
import { config } from "@aihot/backend/config";
import { fetchRss } from "@aihot/backend/sources/rss";

const entry = (links: string, base = "") => `<entry${base}><id>urn:test:entry</id><title>Research update</title><updated>2026-10-01T00:00:00Z</updated>${links}</entry>`;
const feed = (entries: string, base = "") => `<feed xmlns="http://www.w3.org/2005/Atom"${base}><id>urn:test:feed</id><title>News</title><updated>2026-10-01T00:00:00Z</updated><author><name>Publisher</name></author>${entries}</feed>`;
const pages: Record<string, string> = {
  "/feed-base": feed(entry('<link href="article-1"/>'), ' xml:base="https://publisher.example/news/"'),
  "/entry-base": feed(entry('<link href="article-1"/>', ' xml:base="https://publisher.example/stories/"'), ' xml:base="https://feed.example/"'),
  "/link-base": feed(entry('<link xml:base="https://publisher.example/articles/" href="article-1"/>')),
  "/news/inherited.xml": feed(entry('<link xml:base="../articles/" href="article-1"/>', ' xml:base="stories/"'), ' xml:base="../publisher/"'),
  "/news/feed.xml": feed(entry('<link href="article-1"/>')),
  "/absolute": feed(entry('<link rel="self" href="entry.xml"/><link rel="alternate" href="https://publisher.example/article-1"/>'), ' xml:base="https://feed.example/"'),
  "/fallback": feed(entry('<link rel="related" href="article-1"/>')),
  "/missing": feed(entry("") + entry('<link rel="alternate"/>')),
  "/dates": feed(entry('<link href="undated"/>') + entry('<link href="published"/><published>2020-02-15T00:00:00Z</published>') + entry('<link href="invalid"/><published>unknown</published>')),
  "/rss/feed.xml": `<rss version="2.0"><channel><title>Blog</title><item><title>Release notes</title><link>/blog/zh/posts/release/</link></item><item><title>Elsewhere</title><link>https://publisher.example/post</link></item></channel></rss>`,
  // FINRA's news releases wrap each title in a link and give two-digit years.
  "/linked-titles.xml": `<rss version="2.0"><channel><title>News Releases</title><item><title><a href="/media/fine" hreflang="en">FINRA Fines Webull &amp; Co $4.2 Million</a></title><link>https://publisher.example/media/fine</link><pubDate>Thu, 05 Nov 26 12:00:00 +0000</pubDate></item></channel></rss>`,
  // Any other markup stays skipped: the parser drops its text order, and a script is not a headline.
  "/marked-up-titles.xml": `<rss version="2.0"><channel><title>News</title>${["<script>debug()</script><style>b{}</style>", "<script>debug()</script>", "<b>New</b><b>research</b>", '<a href="/x">FINRA fines <em>Webull</em> today</a>', "<xhtml:script>debug()</xhtml:script>", "<noscript>Enable JavaScript</noscript>", "<a>Before <![CDATA[Headline]]> after</a>", "<a><![CDATA[New]]><![CDATA[research]]></a>"].map((title, i) => `<item><title>${title}</title><link>https://publisher.example/${i}</link></item>`).join("")}</channel></rss>`,
  // Taiwan's FSC escapes "&" inside a CDATA link, where the parser leaves entities as written.
  "/cdata-links.xml": `<rss version="2.0"><channel><title>新聞稿</title><item><title>公平待客</title><link><![CDATA[https://publisher.example/home.jsp?id=96&amp;dataserno=202611260002&amp;dtable=News]]></link></item><item><title>Plain</title><link>https://publisher.example/home.jsp?id=1&amp;page=2</link></item></channel></rss>`,
  "/fragments": feed(entry('<link href="notes#first"/>') + entry('<link href="notes#second"/>'), ' xml:base="https://publisher.example/"'),
};
const server = http.createServer((req, res) => {
  if (req.url === "/old/feed.xml" || req.url === "/old/rss.xml") {
    res.writeHead(302, { location: req.url === "/old/rss.xml" ? "/rss/feed.xml" : "/news/feed.xml" });
    return res.end();
  }
  res.setHeader("content-type", "application/atom+xml");
  res.end(pages[req.url!] ?? "");
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const root = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
const previousPrivateFetch = config.allowPrivateNetworkFetch;
config.allowPrivateNetworkFetch = true;
after(async () => {
  config.allowPrivateNetworkFetch = previousPrivateFetch;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function read(path: string) {
  return (await fetchRss({ config: { feedUrl: root + path }, participation_mode: "editorial" } as never)).candidates;
}

test("Atom article links honor absolute xml:base on feed, entry and link", async () => {
  for (const [path, expected] of [
    ["/feed-base", "https://publisher.example/news/article-1"],
    ["/entry-base", "https://publisher.example/stories/article-1"],
    ["/link-base", "https://publisher.example/articles/article-1"],
  ]) assert.equal((await read(path!))[0]!.url, expected);
});

test("relative xml:base values compose through feed, entry and link", async () => {
  assert.equal((await read("/news/inherited.xml"))[0]!.url, root + "/publisher/articles/article-1");
});

test("relative Atom links use the final document URL after redirects", async () => {
  assert.equal((await read("/old/feed.xml"))[0]!.url, root + "/news/article-1");
});

test("relative RSS item links resolve against the final document URL; absolute ones are kept", async () => {
  assert.deepEqual((await read("/old/rss.xml")).map((item) => item.url), [root + "/blog/zh/posts/release/", "https://publisher.example/post"]);
});

test("RSS item links read the same whether the feed escapes them in CDATA or in plain XML", async () => {
  assert.deepEqual((await read("/cdata-links.xml")).map((item) => item.url), [
    "https://publisher.example/home.jsp?id=96&dataserno=202611260002&dtable=News",
    "https://publisher.example/home.jsp?id=1&page=2",
  ]);
});

test("absolute alternate links and the first-link fallback keep working", async () => {
  assert.equal((await read("/absolute"))[0]!.url, "https://publisher.example/article-1");
  assert.equal((await read("/fallback"))[0]!.url, root + "/article-1");
  assert.deepEqual(await read("/missing"), []);
});

test("resolved Atom article URLs keep their fragments, which sources of page sections use as identity", async () => {
  const items = await read("/fragments");
  assert.deepEqual(items.map((item) => item.url), ["https://publisher.example/notes#first", "https://publisher.example/notes#second"]);
});

// An edited Atom entry may have no publication time. Using updated can admit an old post as news.
test("Atom update time never substitutes for missing or malformed publication time", async () => {
  const [unknown, published, invalid] = await read("/dates");
  assert.equal(unknown!.publishedAt, null);
  assert.equal(invalid!.publishedAt, null);
  assert.equal(published!.publishedAt?.toISOString(), "2020-02-15T00:00:00.000Z");
  for (const item of [unknown, published, invalid]) {
    assert.equal(item!.sourceUpdatedAt?.toISOString(), "2026-10-01T00:00:00.000Z");
  }
});

test("an RSS title that is only a link reads as the link's text", async () => {
  const [item] = await read("/linked-titles.xml");
  assert.equal(item!.title, "FINRA Fines Webull & Co $4.2 Million");
  assert.equal(item!.publishedAt?.toISOString(), "2026-11-05T12:00:00.000Z");
});

test("RSS titles with richer markup are still skipped rather than read as partial text", async () => {
  assert.deepEqual(await read("/marked-up-titles.xml"), []);
});
