import { analyzeHotspots } from "./openrouter";
import type { HotspotBundle, HotspotItem, SourceKey, SourceState } from "./types";

type FetcherResult = {
  items: HotspotItem[];
  sourceState: SourceState;
};

const SOURCE_LABELS: Record<SourceKey, string> = {
  weibo: "微博热搜",
  douyin: "抖音热点",
  bilibili: "B站热榜",
  zhihu: "知乎热榜",
};

const SOURCE_ENDPOINTS: Record<
  SourceKey,
  {
    url: string;
    fallbackSeed: Array<{ title: string; heat: number; tags: string[] }>;
    parse: (payload: any, fetchedAt: string) => HotspotItem[];
  }
> = {
  weibo: {
    url: "https://weibo.com/ajax/side/hotSearch",
    fallbackSeed: [
      { title: "AI 工具链再次刷屏", heat: 982_300, tags: ["AI", "工具", "生产力"] },
      { title: "春季消费观察", heat: 754_600, tags: ["消费", "趋势", "商业"] },
      { title: "城市夜游新玩法", heat: 612_100, tags: ["文旅", "本地生活"] },
      { title: "大模型接入成本下降", heat: 541_900, tags: ["AI", "基础设施"] },
      { title: "高考志愿策略讨论", heat: 438_200, tags: ["教育", "决策"] },
    ],
    parse: (payload, fetchedAt) => {
      const items = payload?.data?.realtime ?? payload?.data?.band_list ?? payload?.data ?? [];
      return normalizeItems("weibo", items, fetchedAt, (entry, index) => ({
        title: entry?.word ?? entry?.title ?? entry?.note ?? entry?.item_name ?? `微博热议 ${index + 1}`,
        heat: toNumber(entry?.raw_hot ?? entry?.num ?? entry?.hot ?? entry?.heat ?? entry?.score ?? 0),
        mentions: toNumber(entry?.num ?? entry?.raw_hot ?? entry?.hot ?? entry?.heat ?? 0),
        tags: ["微博", entry?.icon_desc ?? entry?.category ?? "实时"].filter(Boolean),
      }));
    },
  },
  douyin: {
    url: "https://www.douyin.com/aweme/v1/web/hot/search/list/?board_type=0&count=10",
    fallbackSeed: [
      { title: "短视频运营玩法更新", heat: 876_200, tags: ["内容", "运营"] },
      { title: "本地探店新榜单", heat: 645_000, tags: ["生活方式", "本地"] },
      { title: "AI 配音效率流行", heat: 533_700, tags: ["AI", "视频"] },
      { title: "轻量健身打卡挑战", heat: 451_100, tags: ["健康", "挑战"] },
      { title: "直播电商选品变化", heat: 389_500, tags: ["直播", "电商"] },
    ],
    parse: (payload, fetchedAt) => {
      const items = payload?.data?.word_list ?? payload?.data?.list ?? payload?.data?.items ?? [];
      return normalizeItems("douyin", items, fetchedAt, (entry, index) => ({
        title: entry?.word ?? entry?.hot_word ?? entry?.title ?? entry?.word_name ?? `抖音热点 ${index + 1}`,
        heat: toNumber(entry?.hot_value ?? entry?.hot_score ?? entry?.score ?? entry?.view ?? 0),
        mentions: toNumber(entry?.hot_value ?? entry?.score ?? 0),
        tags: ["抖音", entry?.tag_name ?? entry?.label ?? "短视频"].filter(Boolean),
      }));
    },
  },
  bilibili: {
    url: "https://api.bilibili.com/x/web-interface/popular?ps=12&pn=1",
    fallbackSeed: [
      { title: "UP 主内容工业化流程", heat: 711_400, tags: ["B站", "内容", "创作"] },
      { title: "数码新品横评", heat: 598_900, tags: ["数码", "测评"] },
      { title: "游戏大更新讨论", heat: 557_700, tags: ["游戏", "社区"] },
      { title: "学习区效率工具推荐", heat: 421_200, tags: ["学习", "工具"] },
      { title: "纪录片式剪辑风格流行", heat: 388_300, tags: ["视频", "审美"] },
    ],
    parse: (payload, fetchedAt) => {
      const items = payload?.data?.list ?? payload?.data?.items ?? [];
      return normalizeItems("bilibili", items, fetchedAt, (entry, index) => ({
        title: entry?.title ?? entry?.show_name ?? entry?.name ?? `B站热榜 ${index + 1}`,
        heat: toNumber(entry?.stat?.view ?? entry?.play ?? entry?.view ?? entry?.hot ?? 0),
        mentions: toNumber(entry?.stat?.danmaku ?? entry?.stat?.like ?? entry?.view ?? 0),
        tags: ["B站", entry?.tname ?? entry?.rcmd_reason ?? "视频"].filter(Boolean),
      }));
    },
  },
  zhihu: {
    url: "https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=12&desktop=true",
    fallbackSeed: [
      { title: "AI 会如何改变知识工作", heat: 809_700, tags: ["知乎", "AI", "职业"] },
      { title: "普通人如何判断经济周期", heat: 633_800, tags: ["经济", "投资"] },
      { title: "高质量表达训练方法", heat: 501_500, tags: ["写作", "表达"] },
      { title: "产品经理如何看数据", heat: 402_000, tags: ["产品", "数据"] },
      { title: "为什么信息越多越焦虑", heat: 355_400, tags: ["心理", "效率"] },
    ],
    parse: (payload, fetchedAt) => {
      const items = payload?.data ?? payload?.data?.data ?? [];
      return normalizeItems("zhihu", items, fetchedAt, (entry, index) => ({
        title: entry?.target?.title ?? entry?.title ?? entry?.question?.title ?? `知乎热榜 ${index + 1}`,
        heat: toNumber(entry?.detail_text?.match(/\d+/g)?.join("") ?? entry?.follower_count ?? entry?.metrics?.score ?? 0),
        mentions: toNumber(entry?.follower_count ?? entry?.metrics?.score ?? 0),
        tags: ["知乎", entry?.target?.excerpt ?? entry?.type ?? "问答"].filter(Boolean),
      }));
    },
  },
};

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
    if (normalized) {
      return Number(normalized[0]);
    }
  }

  return 0;
}

function makeId(source: SourceKey, title: string, index: number): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-+|-+$/g, "");
  return `${source}-${index + 1}-${normalized || "item"}`;
}

function normalizeItems(
  source: SourceKey,
  entries: any[],
  fetchedAt: string,
  extractor: (entry: any, index: number) => { title: string; heat: number; mentions: number; tags: string[] },
): HotspotItem[] {
  return entries.slice(0, 12).map((entry, index) => {
    const extracted = extractor(entry, index);
    const safeHeat = extracted.heat > 0 ? extracted.heat : 100_000 - index * 1_111;
    return {
      id: makeId(source, extracted.title, index),
      source,
      title: extracted.title,
      url: entry?.url ?? entry?.target?.url ?? entry?.link ?? "#",
      heat: safeHeat,
      mentions: extracted.mentions > 0 ? extracted.mentions : Math.max(1, Math.round(safeHeat / 12_000)),
      tags: Array.from(new Set(extracted.tags.filter(Boolean))).slice(0, 4),
      fetchedAt,
    };
  });
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        Accept: "application/json,text/plain,*/*",
        Referer: "https://www.google.com/",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function loadSource(source: SourceKey): Promise<FetcherResult> {
  const config = SOURCE_ENDPOINTS[source];
  const fetchedAt = new Date().toISOString();

  try {
    const payload = await fetchJson(config.url);
    const items = config.parse(payload, fetchedAt);
    if (!items.length) {
      throw new Error("Empty response");
    }

    return {
      items,
      sourceState: {
        source,
        label: SOURCE_LABELS[source],
        ok: true,
        count: items.length,
        fallback: false,
      },
    };
  } catch (error) {
    const items = config.fallbackSeed.map((entry, index) => ({
      id: makeId(source, entry.title, index),
      source,
      title: `${entry.title} · 示例回退`,
      url: "#",
      heat: entry.heat,
      mentions: Math.max(1, Math.round(entry.heat / 12_000)),
      tags: entry.tags,
      fetchedAt,
    }));

    return {
      items,
      sourceState: {
        source,
        label: SOURCE_LABELS[source],
        ok: false,
        count: items.length,
        fallback: true,
        error: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

export async function getHotspotBundle(): Promise<HotspotBundle> {
  const loaded = await Promise.all((Object.keys(SOURCE_ENDPOINTS) as SourceKey[]).map((source) => loadSource(source)));
  const items = loaded.flatMap((entry) => entry.items).sort((left, right) => right.heat - left.heat);
  const sourceStates = loaded.map((entry) => entry.sourceState);
  const analysis = await analyzeHotspots(items);

  return {
    generatedAt: new Date().toISOString(),
    items,
    sourceStates,
    analysis,
  };
}