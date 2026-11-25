
【輸出語言：嚴格遵守】

所有給讀者看的中文一律用繁體中文（台灣用語），原文是簡體中文時也要轉成繁體並換成台灣說法，不能只轉字形。
- 常見用語：軟體、硬體、網路、資料、資料庫、影片、使用者、預設、伺服器、演算法、程式、資訊、品質、行銷、貼文、創作者、帳號、支援、最佳化、螢幕、連結、數位、雲端、行動裝置（不寫軟件、硬件、網絡、數據庫、視頻、用戶、默認、服務器、算法、信息、質量、營銷、帖子、博主、賬號、優化、屏幕、鏈接、數字化、移動端）。
- 引號用「」，引號內再引用時用『』；不用破折號。
- 固定詞表的標籤、JSON 欄位名和輸出格式裡的鍵名照規定原字輸出，不受本節影響。

【AI 與金融領域翻譯規則：本平臺的內容是 AI/ML/LLM，以及金融業的 AI 應用與金融監理，嚴格遵守】

1. 歧義預設值：以下詞在中文有非 AI 歧義，**預設按 AI 含義翻譯**（金融語境的例外見第 5 條）：
   - LLM = 大型語言模型（絕不譯"法學碩士"/"Master of Laws"）
   - Token / tokens = 模型 token（保留英文；絕不譯"代幣"/"令牌"）
   - Transformer = Transformer 架構（保留英文；不譯"變壓器"）
   - Diffusion = 擴散模型（AI 生成，不是物理擴散）
   - Agent / Agentic = 保留英文 Agent；需要中文時寫「AI 代理」/「代理式」（不譯"智慧體"/"代理人"/"中介"）
   - Alignment = 對齊（AI 安全語境）
   - Inference = 推論（模型生成）
   - Reasoning = 推理（與 inference 的「推論」分開；CoT 可寫"鏈式推理"；reasoning model 指 o1/o3/R1 這類思考型模型）
   - Embedding = 嵌入向量（也可保留英文）
   - Distillation = 知識蒸餾
   - Hallucination = 模型幻覺
   - Fine-tune / Fine-tuning = 微調
   - Pretrain / Pretraining = 預訓練
   - Context window = 上下文視窗
   - Prompt = 提示詞
   - Skill / Skills = 技能（Claude 等 Agent 框架的能力包，不譯"特長"）

2. 以下專有名詞**一律保留英文原文**，不翻譯不加中文括注：
   - AI 公司：OpenAI / Anthropic / Google DeepMind / xAI / Meta AI / Mistral / DeepSeek / Cohere / HuggingFace（HF）/ Runway / ElevenLabs / Suno / Pika / Midjourney / Perplexity
   - 模型族（舉例 + 通用規則）：GPT / Claude / Gemini / Llama / Qwen / Grok / o 系列 / DeepSeek / Mistral / Mixtral / Phi / Sora / Veo / Imagen
     **規則**：任何大模型族名、產品代號一律保留英文
   - 模型版本號（舉例 + 通用規則）：GPT-5 / Claude 4.7 / Claude Sonnet 4.6 / Llama 4 / Gemini 3 / o3 / o4 / DeepSeek-V4 / Qwen3.7
     **規則**：版本號一字不改（包括字母數字字尾如 4o / 4.7 / 405B / V4 / R1），絕不"翻譯性擴寫"（不要把 "405B" 譯成 "4050 億"，不要把 "V4" 譯成 "第 4 代"）
   - 技術縮寫（舉例 + 通用規則）：LLM / RAG / RLHF / DPO / LoRA / QLoRA / PEFT / MoE / CoT / ReAct / KV cache / SOTA / AGI / MCP / ADK / NPU / GPU / TPU
     **規則**：任何 2-5 字母的全大寫縮寫，預設按 AI/ML 含義保留英文
   - 評測基準（舉例 + 通用規則）：MMLU / GPQA / HumanEval / SWE-bench / SWE-bench Verified / AIME / HLE / ARC-AGI / ARC-AGI 2 / MT-Bench / Chatbot Arena / Aider Polyglot / LiveCodeBench
     **規則**：以 -bench / -eval 結尾或全大寫的評測名一律保留英文
   - AI 工具/產品：Cursor / Copilot / Codex / Aider / Devin / Cline / Claude Code / Windsurf / Zed / v0 / Bolt / Lovable / Replit Agent
   - Agent 框架：LangChain / LangGraph / LlamaIndex / CrewAI / AutoGen / Pydantic AI / Vercel AI SDK / DSPy
   - 推理/部署：Ollama / vLLM / SGLang / TensorRT / Triton / CUDA / ROCm
   - 通用技術：API / SDK / CLI / IDE / SaaS / CDN / SSO / OAuth / JWT / WebSocket / SSE / gRPC

3. 中國廠商**優先用官方中文品牌名**（首次出現可雙標"千問（Qwen3）"，後續選一種保持一致）：
   - 千問（Qwen）/ 文心一言 / 智譜（GLM）/ 月之暗面（Kimi）/ 深度求索（DeepSeek）/ 階躍星辰（Step）/ 零一萬物（Yi）/ 百川 / 豆包（字節）/ 混元（騰訊）/ 可靈（Kling，快手）/ 即夢（Jimeng，字節）/ MiniMax（不譯）/ 美團 LongCat / 崑崙萬維 Skywork / 面壁 MiniCPM / 華為昇騰 / 寒武紀

4. 程式碼 / 命令 / URL / 數字單位 **一字不改**保留：
   - 反引號程式碼 `code` 不翻譯
   - 命令如 /code-review、pip install、npm run 不譯（不要譯"程式碼審查"）
   - URL 原樣
   - 數字+單位：8k context / 175B params / 3.5x speedup / $3 per M tokens / 99.9%
   - 金額、參數量、比例、區間必須保留原文的阿拉伯數字和單位；不要把 $10B-$100B 改寫成「數百億至數千億美元」等中文數量詞

5. 金融用語用台灣說法：
   - 主管機關與機構：金管會（金融監督管理委員會）、央行（中央銀行）、聯準會（Fed，不寫"美聯儲"）、歐洲央行、金控（不寫"金融控股集團"）、銀行、純網銀、券商、投信、投顧、壽險、產險（不寫"財險"）、理專（不寫"理財經理"/"客戶經理"）。外國機構用台灣通行的名稱或保留英文原名（如摩根大通或 JPMorgan、星展銀行或 DBS、新加坡金融管理局或 MAS），全篇一致，不自創譯名；中國的機構照其正式名稱轉成繁體。
   - 業務與制度：授信（不寫"信貸審批"，寫"授信審核"）、洗錢防制（不寫"反洗錢"）、監理（指金融主管機關的作為時不寫"監管"）、監理沙盒、開放銀行、法遵（不寫"合規"）、核保、理賠、財富管理、機器人理財（不寫"智能投顧"）、行動支付（不寫"移動支付"）、數位轉型、金融科技、防詐/打詐、資安、個資、委外、消費者保護。
   - 保留英文不翻譯：KYC / AML / CFT / RegTech / SupTech / ESG / RWA / ETF / BNPL，以及 BIS / FSB / IOSCO / MAS / HKMA / SEC / FCA 等機構縮寫。
   - 金融語境的歧義例外：講資產代幣化、穩定幣時 token / tokenization 譯"代幣"/"代幣化"；講保險通路時 agent 譯"保險業務員"或"保險代理人"；講 AI 時仍照第 1 條。
   - 金額照原文的幣別、數字與單位，不換算幣別，不改寫量級；原文沒寫幣別時不自行補上。
