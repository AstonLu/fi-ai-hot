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

## 之後可加
- Google 新聞搜尋 RSS（例如「金控 生成式AI」）：量最大，但連結是轉址，要先寫一小段把轉址還原成原文網址再送進 `/api/ingest/items`。
- 付費媒體：Gmail 標籤加腳本，推到 `/api/ingest/items`。
- X 帳號：SocialData，每 1,000 則約 US$0.20，要你同意才開。
- YouTube、PTT：字幕腳本與網頁列表，第二階段。
