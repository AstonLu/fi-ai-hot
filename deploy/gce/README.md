# 部署到 Google Cloud 免費主機

主機用 Google Cloud 永久免費的 e2-micro（美國 us-west1，1 GB 記憶體，30 GB 硬碟）。映像檔由 GitHub 打包好，主機只負責下載與執行，不在主機上編譯。

## 會花錢的只有兩項

| 項目 | 每月估計 | 備註 |
| --- | --- | --- |
| 對外 IP | 約 US$3.7 | 機器開著就計費，免費額度不含 |
| Gemini 模型 | 約 US$3 到 8 | 依每天進來的金融文章數量而定 |

兩項都記在同一個 Google Cloud 帳單帳戶，可用 Google AI Pro 每月 US$10 的額度抵。額度能否抵 Gemini 要看第一張帳單確認。

## 你要自己做的步驟（涉及帳單）

1. 在 Google Developer Program 的福利頁啟用每月雲端額度，選定要入帳的帳單帳戶（需要信用卡）。
2. 在 Google Cloud 主控台「帳單 → 預算與快訊」設 US$10 的預算提醒。
3. 建主機（在 Cloud Shell 執行，區域一定要是 us-west1、us-central1 或 us-east1 才免費）：

   ```
   gcloud compute instances create intel \
     --zone=us-west1-b --machine-type=e2-micro \
     --image-family=debian-12 --image-project=debian-cloud \
     --boot-disk-size=30GB --boot-disk-type=pd-standard \
     --tags=http-server,https-server
   gcloud compute firewall-rules create allow-web --allow=tcp:80,tcp:443 --target-tags=http-server,https-server
   ```

   硬碟要選標準永久磁碟（pd-standard），選平衡型就不在免費範圍。
4. 在 Google AI Studio 建一把 Gemini 金鑰，專案選上面那個綁好帳單的專案。

## 免費的步驟

1. 推到 main 後，GitHub 的「Image」流程會自動打包映像檔到 ghcr.io/<帳號>/<repo>。
2. 在 GitHub 建一把只有 read:packages 權限的 token，給主機下載私有映像檔用。
3. SSH 進主機：

   ```
   git clone https://github.com/<帳號>/<repo>.git intel && cd intel
   bash deploy/gce/setup-vm.sh <帳號> <剛才的 token>
   node scripts/init-env.ts   # 或手動複製 .env.example 成 .env
   ```

   主機沒有 Node 的話，直接複製 `.env.example` 成 `.env`，自己填 ADMIN_PASSWORD、SESSION_SECRET、IMG_PROXY_SIGN_SECRET、POSTGRES_PASSWORD（用 `openssl rand -hex 32` 產生）。
4. 在 `.env` 補上：

   ```
   LLM_API_KEY=<Gemini 金鑰>
   APP_IMAGE=ghcr.io/<帳號>/<repo>:latest
   SITE_DOMAIN=<你的網域>
   SITE_URL=https://<你的網域>
   PORT=127.0.0.1:3000
   TRUST_PROXY=true
   ```

5. 把網域的 A 紀錄指向主機的對外 IP，然後啟動：

   ```
   docker compose -f docker-compose.yml -f deploy/gce/compose.gce.yml pull
   docker compose -f docker-compose.yml -f deploy/gce/compose.gce.yml --profile https up -d
   ```

## 更新

推新的程式到 main，等 GitHub 打包完成，在主機上再跑一次第 5 步的兩行。

## 先試抓取、不花模型錢

第一次可以先把 `.env` 的 `COLLECT_ENABLED` 設成 true、`MODEL_CALLS_ENABLED` 設成 false，確認抓得到來源，再打開模型。後台「設定」可以設付費呼叫的上限。

## 記憶體不夠時

`docker stats` 若顯示經常頂到上限、網頁變很慢，把主機改成 e2-small（2 GB），每月約多 US$12，不在免費範圍。改法是先停機，在主控台「編輯」改機器類型，再開機。
