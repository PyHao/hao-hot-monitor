export type SourceKey = "weibo" | "douyin" | "bilibili" | "zhihu";

export interface HotspotItem {
  id: string;
  source: SourceKey;
  title: string;
  url: string;
  heat: number;
  mentions: number;
  tags: string[];
  fetchedAt: string;
}

export interface SourceState {
  source: SourceKey;
  label: string;
  ok: boolean;
  count: number;
  error?: string;
  fallback: boolean;
}

export interface AIInsight {
  overview: string;
  keySignals: string[];
  opportunities: string[];
  risks: string[];
  recommendedActions: string[];
}

export interface HotspotBundle {
  generatedAt: string;
  items: HotspotItem[];
  sourceStates: SourceState[];
  analysis: AIInsight;
}