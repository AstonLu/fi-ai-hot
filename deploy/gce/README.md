# 部署到 Google Cloud 主機

主機用 Google Cloud 的 e2-small（美國 us-west1，2 GB 記憶體，30 GB 標準硬碟），網址 fin-ai.astonlu.com。映像檔由 GitHub 打包好，主機只負責下載與執行，不在主機上編譯。

## 費用

| 項目 | 每月估計 | 備註 |
| --- | --- | --- |
| e2-small 主機 | 約 US$12 到 13 | 想省可改 e2-micro，但 1 GB 記憶體容易不夠 |
| 固定對外 IP | 約 US$3.7 | 機器開著就計費；刪主機時要一併釋放，閒置的 IP 照樣計費 |
| Gemini 模型 | 約 US$3 到 8 | 依每天進來的金融文章數量而定 |

全部記在同一個 Google Cloud 帳單帳戶，由 Google Builders Hub 每月的雲端額度抵扣。額度綁在帳單帳戶上，專案要連到領了額度的那個帳單帳戶。

## 需要你做、涉及帳單的步驟

1. 到 Google Builders Hub 的福利頁，把每張雲端額度卡都套到同一個帳單帳戶，勾「一律使用這個帳單帳戶」。
2. 到「帳單 → 預算與快訊」建預算：選 Alerts only，不要選 Spend cap（它用扣額度前的金額計算，會提早暫停服務）；Credits 維持預設，金額 US$10，提醒 50%、90%、100%。
3. 建專案 fi-ai-hot，連到上面那個帳單帳戶。
4. 開 Cloud Shell 建主機與固定 IP：

   ```
   gcloud config set project fi-ai-hot
   gcloud compute addresses create fin-ai-ip --region=us-west1
   gcloud compute instances create intel \
     --zone=us-west1-b --machine-type=e2-small --address=fin-ai-ip \
     --image-family=debian-12 --image-project=debian-cloud \
     --boot-disk-size=30GB --boot-disk-type=pd-standard \
     --tags=http-server,https-server
   gcloud compute firewall-rules create allow-web --allow=tcp:80,tcp:443 --target-tags=http-server,https-server
   gcloud compute addresses describe fin-ai-ip --region=us-west1 --format='value(address)'
   ```

5. 在 Google AI Studio 建 Gemini 金鑰，專案選 fi-ai-hot。

## 免費的步驟

1. Cloudflare 的 DNS 新增 A 記錄：名稱 fin-ai，指向固定 IP，Proxy 狀態選僅限 DNS。開代理會擋住 Caddy 的憑證續期。
2. GitHub 建兩把權杖，到期日 90 天：
   - fine-grained，只選 fi-ai-hot，Contents 唯讀，給主機下載程式。
   - classic，只勾 read:packages，給主機下載私有映像檔。
3. 推到 main 後，GitHub 的「Image」流程會自動打包映像檔到 ghcr.io/astonlu/fi-ai-hot。
4. 在 Cloud Shell 連進主機，下載程式（Username 填 GitHub 帳號，Password 貼第一把權杖）：

   ```
   gcloud compute ssh intel --zone=us-west1-b
   sudo apt-get update && sudo apt-get install -y git
   git clone https://github.com/AstonLu/fi-ai-hot.git intel && cd intel
   ```

5. 裝 Docker 並登入映像檔庫（貼第二把權杖），跑完後登出再連一次：

   ```
   read -s -p "image token: " T; echo; bash deploy/gce/setup-vm.sh AstonLu "$T"; unset T
   ```

6. 寫設定檔並啟動。第一次先只抓文章、不呼叫模型：

   ```
   cd ~/intel && cp .env.example .env
   read -s -p "Gemini key: " K; echo
   sed -i -e "s|^SITE_URL=.*|SITE_URL=https://fin-ai.astonlu.com|" \
     -e "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$(openssl rand -hex 8)|" \
     -e "s|^SESSION_SECRET=.*|SESSION_SECRET=$(openssl rand -hex 32)|" \
     -e "s|^IMG_PROXY_SIGN_SECRET=.*|IMG_PROXY_SIGN_SECRET=$(openssl rand -hex 32)|" \
     -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" \
     -e "s|^LLM_API_KEY=.*|LLM_API_KEY=$K|" \
     -e "s|^TRUST_PROXY=.*|TRUST_PROXY=true|" \
     -e "s|^MODEL_CALLS_ENABLED=.*|MODEL_CALLS_ENABLED=false|" .env; unset K
   printf 'APP_IMAGE=ghcr.io/astonlu/fi-ai-hot:latest\nSITE_DOMAIN=fin-ai.astonlu.com\nPORT=127.0.0.1:3000\n' >> .env
   docker compose -f docker-compose.yml -f deploy/gce/compose.gce.yml pull
   docker compose -f docker-compose.yml -f deploy/gce/compose.gce.yml --profile https up -d
   grep ADMIN_PASSWORD .env
   ```

   最後一行是後台密碼，後台在 https://fin-ai.astonlu.com/admin 。

## 確認抓取、再打開模型

啟動 15 分鐘後看抓取紀錄：

```
docker compose -f docker-compose.yml -f deploy/gce/compose.gce.yml logs worker --since 20m | grep -iE "collect|fetch|error|fail" | tail -30
```

確認來源抓得到，再打開模型：

```
sed -i "s|^MODEL_CALLS_ENABLED=.*|MODEL_CALLS_ENABLED=true|" .env
docker compose -f docker-compose.yml -f deploy/gce/compose.gce.yml --profile https up -d
```

若紀錄出現 Gemini 不接受 JSON 格式的錯誤，在 `.env` 加一行 `LLM_JSON_MODE=false` 再啟動一次。後台「設定」可以設付費呼叫的上限。

## 改後台密碼

```
cd ~/intel && read -s -p "new admin password: " P; echo; sed -i "s|^ADMIN_PASSWORD=.*|ADMIN_PASSWORD=$P|" .env; unset P
docker compose -f docker-compose.yml -f deploy/gce/compose.gce.yml --profile https up -d
```

密碼至少 12 字，不要用 |、& 或 \。

## 更新

推新的程式到 main，等 GitHub 打包完成，在主機上跑：

```
cd ~/intel && git pull
docker compose -f docker-compose.yml -f deploy/gce/compose.gce.yml pull
docker compose -f docker-compose.yml -f deploy/gce/compose.gce.yml --profile https up -d
```

`git pull` 會再問一次 GitHub 帳號與第一把權杖。

## 記憶體

`docker stats` 看各服務用量。e2-small 夠用；若改成 e2-micro 後經常頂到上限、網頁變很慢，就換回 e2-small。改法是先停機，在主控台「編輯」改機器類型，再開機。
