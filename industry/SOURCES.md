# 第一批來源說明

`sources.json` 共 39 個來源，31 個預設開啟。所有網址都還沒有實際連線驗證，上線後請在後台「來源」頁逐一按「預覽抓取」，抓到的是文章而不是導覽列、日期正確再留著。

## AI
- `json-aihot-selected`：直接讀 aihot.news 公開 API 的精選（`/api/v1/items?mode=selected&window=24h`），每小時一次，原文連結當作條目網址，跟自己的官方來源可以去重。上線前請先讀 aihot.news 的使用條款，確認允許這樣轉用；回應裡的 attribution 欄位建議保留。
- 原本範本附的 18 個官方 AI 部落格照留，T1 的那幾個能讓官方一手消息優先當代表稿。

## 金融業 AI 導入
- 監理：Fed 演講與新聞稿（開啟）、Bank of England、FSB、BIS（關閉，網址待確認）、金管會新聞稿（網頁列表，選擇器是猜的，關閉）。
- 國際媒體：Finextra、Fintech Futures、Banking Dive、Payments Dive、The Financial Brand、PYMNTS（開啟）、Insurance Journal（關閉）。
- 電子報：Fintech Business Weekly、Net Interest、Fintech Brainfood（開啟）、This Week in Fintech（關閉）。只收公開版，付費全文之後走 Gmail 標籤轉進來。
- 台灣：iThome（開啟）、數位時代（關閉）。

## Google 新聞搜尋
台灣金控、銀行、保險導入 AI 的中文報導，主要靠 Google 新聞搜尋的 RSS。在後台新增 `rss` 來源，`feedUrl` 填搜尋網址，例如：

```json
{ "feedUrl": "https://news.google.com/rss/search?q=%E9%87%91%E6%8E%A7+AI+when:7d&hl=zh-TW&gl=TW&ceid=TW:zh-Hant" }
```

`modules/google-news/` 會自動處理 `news.google.com` 的訂閱：
- 每則的連結是 Google 的轉址頁。模組把它還原成原文網址，用原文網址當條目網址和去重鍵；同一篇文章從 iThome 等來源進來時算同一篇。
- 標題去掉 Google 加的「 - 媒體名」，媒體名記成作者。Google 的描述只是標題加媒體名，不留。
- 每則只還原一次，結果存在 `google_news_links`，30 天後刪除。每輪最多還原 40 則新連結（每則 2 個請求），其餘下一輪再還原。
- 還原失敗的條目這一輪不收，下一輪再試。這一輪要還原的新連結全部失敗、而且不只一則時，整輪算失敗，後台會顯示原因。
- 原文網站擋自動程式（例如天下雜誌的 Cloudflare）時，不繞過；文章只用標題做預篩，預篩規則允許只有標題的條目 PASS。

Google 新聞 RSS 的版權聲明寫明只供個人、非商業的閱讀器使用。這個站只顯示標題、摘要和原文連結；上線前請自己確認可以接受。

## 之後可加
- 付費媒體：Gmail 標籤加腳本，推到 `/api/ingest/items`。
- X 帳號：SocialData，每 1,000 則約 US$0.20，要你同意才開。
- YouTube、PTT：字幕腳本與網頁列表，第二階段。
