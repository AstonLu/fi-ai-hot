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
金融業導入 AI 的案例以英文報導最多、最早，台灣金控、銀行、保險的中文報導次之，日文選用。這些都靠 Google 新聞搜尋的 RSS 補上。在後台新增 `rss` 來源，`feedUrl` 填搜尋網址：`https://news.google.com/rss/search?q=<查詢，URL 編碼>&<語言參數>`。`when:7d` 的冒號不要編碼。

| 語言 | 語言參數 |
|---|---|
| 英文 | `hl=en-US&gl=US&ceid=US:en` |
| 繁中 | `hl=zh-TW&gl=TW&ceid=TW:zh-Hant` |
| 日文 | `hl=ja&gl=JP&ceid=JP:ja` |

建議的查詢（2026-11-26 實測，7 天內各有幾則到六十幾則；券商的查詢量少但準）：

| ID | 查詢 | 建議 |
|---|---|---|
| `gnews-en-bank-genai` | `bank "generative AI" when:7d` | 開 |
| `gnews-en-bank-agentic` | `bank ("AI agent" OR agentic) when:7d` | 開 |
| `gnews-en-big-banks-ai` | `(JPMorgan OR "Goldman Sachs" OR "Morgan Stanley" OR Citi OR "Bank of America" OR HSBC OR "Wells Fargo") ("generative AI" OR "AI agent" OR agentic OR "AI tool" OR "AI assistant") when:7d` | 開 |
| `gnews-en-insurer-ai` | `insurer ("generative AI" OR "AI agent" OR agentic) when:7d` | 開 |
| `gnews-en-wealth-ai` | `("wealth management" OR "asset manager") AI when:7d` | 開 |
| `gnews-en-agentic-payments` | `("agentic payments" OR "agentic commerce") (Visa OR Mastercard OR PayPal OR Stripe OR bank) when:7d` | 開 |
| `gnews-fhc-ai` | `金控 AI when:7d` | 開 |
| `gnews-bank-genai` | `銀行 生成式AI when:7d` | 開 |
| `gnews-insurance-ai` | `保險 AI 導入 when:7d` | 開 |
| `gnews-ja-bank-genai` | `銀行 生成AI when:7d` | 選用 |
| `gnews-ja-megabanks-genai` | `(三菱UFJ OR 三井住友 OR みずほ OR りそな) 生成AI when:7d` | 選用 |
| `gnews-ja-insurer-ai` | `(損保 OR 生保 OR 東京海上 OR 第一生命) AI 導入 when:7d` | 選用，雜訊較多 |
| `gnews-en-broker-ai-agents` | `("agentic trading" OR "AI trading agent" OR "AI agents" OR "AI assistant") (Robinhood OR Schwab OR "Interactive Brokers" OR eToro OR Webull OR Public.com OR "E*Trade") when:7d` | 開（券商） |
| `gnews-en-capital-markets-ai` | `("trading desk" OR "capital markets" OR "equity research") ("generative AI" OR "AI agent" OR agentic) when:7d` | 開（券商） |
| `gnews-tw-broker-genai` | `(證券 OR 券商) (導入 OR 推出 OR 上線) 生成式AI when:7d` | 開（券商） |
| `gnews-tw-brokers-ai` | `(凱基證 OR 元大證 OR 富邦證 OR 永豐金證 OR 國泰證 OR 群益 OR 統一證) (生成式AI OR AI助理 OR AI客服 OR AI理專 OR 導入AI) when:7d` | 開（券商） |
| `gnews-ja-brokers-ai` | `(野村 OR 大和証券 OR SBI証券 OR 楽天証券 OR マネックス OR 松井証券) (生成AI OR AIエージェント) (導入 OR 活用 OR 実証) when:7d` | 選用（券商） |

- 只寫公司名加 AI 的查詢（例如只列大銀行或券商名稱）會混進大量股市評論和 AI 主題 ETF，要再加「generative AI」「AI agent」「生成式AI」「導入」這類詞收窄。
- 「證券 AI」「金管會 AI」「メガバンク AI」「broker-dealer AI」實測多半是 AI 股市、券商研報、裁罰新聞或不相關的同名詞，不建議開。
- 同一篇文章被幾個查詢同時抓到時，用原文網址去重，只算一篇。

例如第一個查詢的採集配置：

```json
{ "feedUrl": "https://news.google.com/rss/search?q=bank+%22generative+AI%22+when:7d&hl=en-US&gl=US&ceid=US:en" }
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
