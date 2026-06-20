import type { AIInsight, HotspotItem } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

function buildFallbackInsight(items: HotspotItem[]): AIInsight {
  const topItems = items.slice(0, 4);
  const sourceCounts = new Map<string, number>();
  for (const item of items) {
    sourceCounts.set(item.source, (sourceCounts.get(item.source) ?? 0) + 1);
  }

  const leadingSource = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";

  return {
    overview: `当前共聚合 ${items.length} 条信号，最密集的来源是 ${leadingSource}。系统已在无 OpenRouter 密钥或调用失败时自动切换到本地规则分析。`,
    keySignals: topItems.map((item) => `${item.title} (${item.source}, 热度 ${item.heat.toLocaleString("zh-CN")})`),
    opportunities: [
      "把持续上升的标题加入观察词表，形成二次预警。",
      "围绕高热主题生成日报，为内容选题或运营决策提供输入。",
      "对跨平台重复出现的主题建立合并聚类，减少噪音。",
    ],
    risks: [
      "如果某个平台抓取失败，短期内会退化为示例数据。",
      "AI 总结依赖输入质量，异常标题或低相关噪音会影响判断。",
      "热点本身变化很快，建议配合定时刷新。",
    ],
    recommendedActions: [
      "补充 OPENROUTER_API_KEY 后重新刷新，开启真实 AI 分析。",
      "把定时抓取间隔调到 3 到 5 分钟，形成更平滑的趋势线。",
      "后续增加历史库，支持按主题回看增量变化。",
    ],
  };
}

function extractJson(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) {
    return null;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    return trimmed.slice(firstObject, lastObject + 1);
  }

  return null;
}

function normalizeInsight(value: unknown, fallback: AIInsight): AIInsight {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const candidate = value as Partial<AIInsight>;
  const ensureArray = (input: unknown, fallbackList: string[]) =>
    Array.isArray(input) && input.every((entry) => typeof entry === "string") ? input : fallbackList;

  return {
    overview: typeof candidate.overview === "string" && candidate.overview.trim() ? candidate.overview.trim() : fallback.overview,
    keySignals: ensureArray(candidate.keySignals, fallback.keySignals),
    opportunities: ensureArray(candidate.opportunities, fallback.opportunities),
    risks: ensureArray(candidate.risks, fallback.risks),
    recommendedActions: ensureArray(candidate.recommendedActions, fallback.recommendedActions),
  };
}

export async function analyzeHotspots(items: HotspotItem[]): Promise<AIInsight> {
  const fallback = buildFallbackInsight(items);
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return fallback;
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "hao-hot-monitor",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: [
              "你是一个热点研判助手。",
              "请只输出 JSON，不要输出 markdown。",
              "JSON 结构必须包含 overview、keySignals、opportunities、risks、recommendedActions。",
              "每个数组字段都要返回字符串数组。",
            ].join(" "),
          },
          {
            role: "user",
            content: JSON.stringify(
              {
                instruction: "基于以下热点列表输出简洁、可执行的研判结论。",
                items: items.slice(0, 18).map((item) => ({
                  source: item.source,
                  title: item.title,
                  heat: item.heat,
                  mentions: item.mentions,
                  tags: item.tags,
                })),
              },
              null,
              2,
            ),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter request failed with ${response.status}`);
    }

    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsedContent = extractJson(content);

    if (!parsedContent) {
      return fallback;
    }

    const parsed = JSON.parse(parsedContent) as unknown;
    return normalizeInsight(parsed, fallback);
  } catch {
    return fallback;
  }
}