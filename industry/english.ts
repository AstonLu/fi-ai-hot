// 英文版用的行业词：类别、标签、主题和公司的英文名。键是 taxonomy.ts、topics.json 里的中文写法或 key；
// 换行业时和它们一起改。网页英文页和英文的公开接口都读这里，没写到的词照原样显示；tests/industry-english.standalone.test.ts 检查都写到了。
import type { CATEGORIES } from "./taxonomy.ts";

type CategoryKey = (typeof CATEGORIES)[number]["key"];

/** 类别：筛选标签、分类 RSS 标题、日报栏目。 */
export const CATEGORY_EN: Record<CategoryKey, { label: string; feedLabel: string; section: string }> = {
  industry: { label: "Industry", feedLabel: "Industry News", section: "Industry news" },
  paper: { label: "Papers", feedLabel: "Papers", section: "Research papers" },
  opinion: { label: "Opinion", feedLabel: "Opinion", section: "Opinions & interviews" },
  "fin-ai": { label: "Finance AI", feedLabel: "AI in Finance", section: "AI adoption in financial services" },
  "fin-reg": { label: "Regulation", feedLabel: "Financial AI Regulation", section: "Financial AI regulation" },
};

/** 标签（含 TAG_DISPLAY 里给读者看的短词）。 */
export const TAG_EN: Record<string, string> = {
  产品更新: "Product updates", 模型发布: "Model releases", "论文/研究": "Research", 论文: "Papers", "开源/仓库": "Open source", 开源: "Open source",
  "教程/实践": "Tutorials", 教程: "Tutorials", "现象/趋势": "Trends", 趋势: "Trends", 大佬观点: "Opinion", "评测/基准": "Benchmarks", 评测: "Benchmarks",
  "安全/对齐": "Safety", 安全: "Safety", 行业动态: "Industry", "政策/监管": "Policy", 政策: "Policy", "非AI/通用工具": "General tools", 其他: "Other",
  Agent: "Agents", 编码: "Coding", 推理: "Reasoning", 多模态: "Multimodal", 语音: "Voice", 视频: "Video", 图像生成: "Image generation", RAG: "RAG",
  端侧: "On-device", "数据/训练": "Data & training", 数据与训练: "Data & training", 搜索: "Search", "部署/工程": "Engineering", 工程部署: "Engineering",
  开源生态: "Open source", 具身智能: "Embodied AI", "MCP/工具调用": "MCP & tool use", "MCP 与工具调用": "MCP & tool use",
  // 這個站的標籤是繁體，另外列一份；金融業 AI 導入的標籤也在這裡。
  產品更新: "Product updates", 模型發布: "Model releases", "AI 導入案例": "AI adoption cases", 金融監理: "Financial regulation", "調查/數據": "Surveys & data", 調查數據: "Surveys & data", "論文/研究": "Research", 論文: "Papers", "開源/倉庫": "Open source", 開源: "Open source", "教程/實踐": "Tutorials", 教學: "Tutorials", "現象/趨勢": "Trends", 趨勢: "Trends", 大佬觀點: "Opinion", "評測/基準": "Benchmarks", 評測: "Benchmarks", "安全/對齊": "Safety", 行業動態: "Industry", 產業動態: "Industry", "政策/監管": "Policy", 編碼: "Coding", 多模態: "Multimodal", 語音: "Voice", 影片: "Video", 影像生成: "Image generation", 端側: "On-device", "資料/訓練": "Data & training", 資料與訓練: "Data & training", 搜尋: "Search", 開源生態: "Open source", 具身智慧: "Embodied AI", "MCP/工具呼叫": "MCP & tool use", "MCP 與工具呼叫": "MCP & tool use", "客服/對話": "Customer service", "風控/反詐": "Risk & fraud", 財富管理: "Wealth management", 投資研究: "Investment research", "法遵/RegTech": "Compliance & RegTech", 核保理賠: "Underwriting & claims", 營運自動化: "Operations automation", 資料治理: "Data governance", 資安: "Cybersecurity", 模型風險: "Model risk", "人才/組織": "Talent & organization", "成本/ROI": "Cost & ROI",
};

/** 主题（topics.json 的 slug）：名字和一句话介绍。 */
export const TOPIC_EN: Record<string, { name: string; definition: string }> = {
  openai: { name: "OpenAI / ChatGPT", definition: "The latest on GPT models, ChatGPT and Sora, plus OpenAI's strategy and people." },
  anthropic: { name: "Anthropic / Claude", definition: "Claude models, Claude Code and Anthropic's products, research and company news." },
  google: { name: "Google / Gemini", definition: "Gemini models and apps, Google DeepMind research and Google's AI products." },
  deepseek: { name: "DeepSeek", definition: "DeepSeek's model releases, papers, open weights and API changes." },
  qwen: { name: "Qwen", definition: "Alibaba's Qwen models, the Qwen app and Alibaba Cloud's AI news." },
  kimi: { name: "Moonshot AI / Kimi", definition: "Kimi models and apps from Moonshot AI, and the company's news." },
  minimax: { name: "MiniMax", definition: "MiniMax's models for text, speech, video and images, and its products." },
  zhipu: { name: "Zhipu GLM", definition: "Zhipu AI's GLM models, Z.ai products and company news." },
  xai: { name: "xAI / Grok", definition: "Grok models and apps from xAI, and the company's news." },
  meta: { name: "Meta / Llama", definition: "Meta's AI models, Llama, Meta AI products and its superintelligence lab." },
  microsoft: { name: "Microsoft / Copilot", definition: "Copilot, Microsoft's own models and its AI platform and research." },
  nvidia: { name: "NVIDIA", definition: "NVIDIA's AI chips, systems, software and models, and company news." },
  "hugging-face": { name: "Hugging Face", definition: "Hugging Face's platform, open-source libraries, models and datasets." },
  cursor: { name: "Cursor", definition: "The Cursor AI code editor: releases, models and company news." },
  openrouter: { name: "OpenRouter", definition: "OpenRouter's model marketplace, rankings and API changes." },
  agent: { name: "Agents", definition: "AI agents that plan and act: products, frameworks, research and real-world use." },
  coding: { name: "AI Coding", definition: "AI for writing software: coding models, coding agents, IDEs and how developers use them." },
  reasoning: { name: "Reasoning", definition: "How models reason: reasoning models, test-time compute and the research behind them." },
  multimodal: { name: "Multimodal", definition: "Models that see, hear and read together, and what they're used for." },
  "image-gen": { name: "Image Generation", definition: "Image generation and editing models and products." },
  video: { name: "AI Video", definition: "Video generation models, tools and how they're used." },
  voice: { name: "Voice & Audio", definition: "Speech recognition, voice synthesis, voice agents and music generation." },
  embodied: { name: "Embodied AI", definition: "Robots and AI in the physical world: models, hardware and research." },
  "on-device": { name: "On-device AI", definition: "Small models and AI running on phones, laptops and other devices." },
  "open-source": { name: "Open Source", definition: "Open-weight models, open-source AI projects and the community around them." },
  engineering: { name: "Engineering", definition: "Serving, deploying and building with AI models in production." },
  "data-training": { name: "Data & Training", definition: "Training data, training methods and the infrastructure behind new models." },
  safety: { name: "Safety & Alignment", definition: "AI safety, alignment, security and misuse: research and incidents." },
  mcp: { name: "MCP & Tool Use", definition: "The Model Context Protocol and how models call tools." },
  "model-releases": { name: "Model Releases", definition: "New models and model updates from every lab." },
  "product-updates": { name: "Product Updates", definition: "New AI products and features, and changes to existing ones." },
  papers: { name: "Research Papers", definition: "Papers, technical reports, benchmarks and datasets." },
  benchmarks: { name: "Benchmarks", definition: "New benchmarks, leaderboards and how models score on them." },
  tutorials: { name: "Tutorials", definition: "How-tos, prompts, workflows and hands-on lessons you can reuse." },
  opinions: { name: "Opinion", definition: "What leading people in AI think: essays, interviews and predictions." },
  trends: { name: "Trends", definition: "Patterns across the AI world: adoption, markets and how things are changing." },
  industry: { name: "Industry News", definition: "Funding, deals, people, partnerships, lawsuits and other company news." },
  policy: { name: "Policy & Regulation", definition: "AI laws, regulation, government policy and their effects." },
  "fsc-tw": { name: "Taiwan FSC", definition: "Taiwan's Financial Supervisory Commission on AI in finance: guidelines, sandboxes and supervision." },
  jpmorgan: { name: "JPMorgan", definition: "How JPMorgan Chase builds and uses AI across banking, markets and operations." },
  dbs: { name: "DBS", definition: "DBS Bank's AI programme: use cases, results and how it organises the work." },
  "fin-fraud": { name: "Risk & Fraud", definition: "AI for credit risk, fraud detection and anti-money laundering." },
  "fin-wealth": { name: "Wealth & Research", definition: "AI in wealth management, advisory and investment research." },
  "fin-service": { name: "Customer Service", definition: "AI assistants, chatbots and contact centres at banks and insurers." },
  "fin-regtech": { name: "Compliance & RegTech", definition: "AI for compliance, reporting and regulatory technology." },
  "fin-insurance": { name: "Underwriting & Claims", definition: "AI in insurance underwriting, pricing and claims." },
  "fin-ops": { name: "Operations Automation", definition: "AI that automates back-office and operations work in financial firms." },
  "fin-model-risk": { name: "Model Risk & Governance", definition: "Model risk management, AI governance and explainability in finance." },
  "fin-data": { name: "Data & Security", definition: "Data governance, privacy and cybersecurity around AI in finance." },
  "fin-talent": { name: "Talent & Organization", definition: "How financial firms staff, train and organise for AI." },
  "fin-roi": { name: "Cost & ROI", definition: "What AI costs financial firms and what it returns." },
  "fin-ai-cases": { name: "AI Adoption Cases", definition: "Named financial institutions putting AI into production, with results." },
  "fin-regulation": { name: "Financial Regulation", definition: "Regulators and central banks on AI: rules, guidance and speeches." },
  surveys: { name: "Surveys & Data", definition: "Surveys, reports and data on AI adoption in financial services." },
};

/** 主题分组（topics.json 的 groups）。 */
export const TOPIC_GROUP_EN: Record<string, { name: string; blurb: string }> = {
  company: { name: "Companies & Models", blurb: "Follow the key companies: model releases, product changes and moves" },
  field: { name: "Research Areas", blurb: "Go deep by area: agents, multimodal, embodied AI…" },
  genre: { name: "Content Types", blurb: "Browse by kind: new models, papers, tutorials, opinion…" },
};

/** 日报报头“N 个新模型”。 */
export const RELEASE_UNIT_EN = { one: "new model", many: "new models" };
