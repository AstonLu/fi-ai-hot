// Google 新聞搜尋的 RSS（news.google.com/rss/search?q=…）當一般 rss 來源用：每則的連結是 Google 的轉址頁，
// 這個模組把它還原成原文網址，標題去掉 Google 加的「 - 媒體名」（見 backend/links.ts）。媒體名記成作者，
// 卡片上顯示它，不顯示搜尋的來源名（relays）。
import { defineServerModule } from "@aihot/backend/modules";
import { GOOGLE_NEWS, handles, pruneLinks, resolveListing } from "./backend/links.ts";

/** `origin` is Google News; the tests point it at a local stand-in. */
export function googleNewsModule(origin = GOOGLE_NEWS) {
  return defineServerModule({
    name: "google-news",
    listing: (source, found) => resolveListing(source, found, origin),
    relays: (source) => handles(source, origin),
    retention: async (now) => ({ googleNewsLinks: await pruneLinks(now) }),
  });
}

export const googleNews = googleNewsModule();
