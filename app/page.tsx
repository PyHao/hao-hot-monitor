"use client";

import { useEffect, useMemo, useState } from "react";
import type { HotspotBundle, HotspotItem, SourceKey } from "../lib/types";

type ViewState = {
  loading: boolean;
  error: string | null;
  bundle: HotspotBundle | null;
};

const SOURCE_LABELS: Record<SourceKey, string> = {
  weibo: "微博",
  douyin: "抖音",
  bilibili: "B站",
  zhihu: "知乎",
};

const SOURCE_ACCENTS: Record<SourceKey, string> = {
  weibo: "#ff6f61",
  douyin: "#ffb84d",
  bilibili: "#7bdcff",
  zhihu: "#b7ff6a",
};

async function fetchBundle(): Promise<HotspotBundle> {
  const response = await fetch("/api/hotspots", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`);
  }

  return response.json() as Promise<HotspotBundle>;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("zh-CN", { notation: value >= 10_000 ? "compact" : "standard" }).format(value);
}

function buildMetrics(items: HotspotItem[]) {
  const grouped = new Map<SourceKey, number>();
  for (const item of items) {
    grouped.set(item.source, (grouped.get(item.source) ?? 0) + 1);
  }

  return {
    total: items.length,
    sources: grouped.size,
    peak: items[0]?.heat ?? 0,
  };
}

export default function HomePage() {
  const [state, setState] = useState<ViewState>({ loading: true, error: null, bundle: null });

  const load = async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const bundle = await fetchBundle();
      setState({ loading: false, error: null, bundle });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "未知错误",
        bundle: null,
      });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(() => buildMetrics(state.bundle?.items ?? []), [state.bundle]);
  const topItems = state.bundle?.items.slice(0, 12) ?? [];

  return (
    <main className="shell">
      <div className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          <div className="brand-copy">
            <small>OpenRouter Hot Radar</small>
            <h1>热点信号台</h1>
          </div>
        </div>

        <div className="status-pill">
          <span className="status-dot" />
          <span>{state.loading ? "正在刷新信号" : `已更新 ${state.bundle ? new Date(state.bundle.generatedAt).toLocaleTimeString("zh-CN") : "-"}`}</span>
        </div>
      </div>

      <section className="hero-grid">
        <article className="panel hero-panel">
          <div className="hero-title">
            <div className="eyebrow">实时聚合 / AI 研判 / 手动刷新</div>
            <h2>把微博、抖音、B站、知乎的热度，压缩成一张可执行的决策面板。</h2>
            <p>
              页面会先尝试拉取各平台热点，再交给 OpenRouter 做统一研判。如果 AI 密钥尚未配置，系统会自动退回本地规则分析，保证前台依然可用。
            </p>

            <div className="hero-actions">
              <button className="action-button action-primary" onClick={load} type="button">
                立即刷新
              </button>
              <a className="action-button action-secondary" href="#signals">
                查看信号
              </a>
            </div>

            <div className="signal-stats" aria-label="热点指标">
              <div className="stat-card">
                <span>聚合条数</span>
                <strong>{metrics.total || 0}</strong>
              </div>
              <div className="stat-card">
                <span>来源数</span>
                <strong>{metrics.sources || 0}</strong>
              </div>
              <div className="stat-card">
                <span>峰值热度</span>
                <strong>{metrics.peak ? formatNumber(metrics.peak) : "-"}</strong>
              </div>
              <div className="stat-card">
                <span>AI 模式</span>
                <strong>{state.bundle ? "OpenRouter" : "待加载"}</strong>
              </div>
            </div>
          </div>
        </article>

        <aside className="panel summary-panel">
          <div className="summary-head">
            <div>
              <h3>AI 总结</h3>
              <p>{state.bundle?.analysis.overview ?? "等待数据加载后生成研判摘要。"}</p>
            </div>
          </div>

          <div className="analysis-block">
            <h4>关键观察</h4>
            <ul className="analysis-list">
              {(state.bundle?.analysis.keySignals ?? ["暂无数据"])
                .slice(0, 4)
                .map((item) => (
                  <li key={item}>{item}</li>
                ))}
            </ul>
          </div>

          <div className="analysis-block">
            <h4>机会</h4>
            <ul className="analysis-list">
              {(state.bundle?.analysis.opportunities ?? ["暂无数据"]).slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="analysis-block">
            <h4>风险与动作</h4>
            <ul className="analysis-list">
              {(state.bundle?.analysis.risks ?? ["暂无数据"]).slice(0, 2).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <ul className="analysis-list" style={{ marginTop: 12 }}>
              {(state.bundle?.analysis.recommendedActions ?? ["暂无数据"]).slice(0, 2).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section id="signals" className="section">
        <div className="section-head">
          <div>
            <div className="section-title">
              <h3>信号切片</h3>
            </div>
            <p className="section-subtitle">按热度排序的跨平台热点，便于快速扫描和复盘。</p>
          </div>
          <p className="meta-line">{state.bundle ? `生成于 ${new Date(state.bundle.generatedAt).toLocaleString("zh-CN")}` : "等待刷新"}</p>
        </div>

        {state.loading && !state.bundle ? (
          <div className="panel loading-card">正在抓取热点并生成 AI 研判...</div>
        ) : (
          <div className="source-grid">
            {topItems.map((item) => (
              <article
                className="source-card"
                key={item.id}
                style={{
                  ["--accent" as never]: SOURCE_ACCENTS[item.source],
                }}
              >
                <div className="source-label">
                  <span aria-hidden>◆</span>
                  <span>{SOURCE_LABELS[item.source]}</span>
                </div>
                <h4 className="source-title">{item.title}</h4>
                <div className="source-meta">
                  <span>热度 {formatNumber(item.heat)}</span>
                  <span>{item.mentions} 次提及</span>
                </div>
                <div className="tags">
                  {item.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="wide-grid section">
        <article className="timeline panel">
          <div className="section-title">
            <h3>来源状态</h3>
          </div>
          <p className="helper-text">如果某个来源抓取失败，会自动切到示例数据，保证界面和分析链路持续可用。</p>

          {(state.bundle?.sourceStates ?? []).map((source) => (
            <div className="timeline-item" key={source.source}>
              <strong>
                {SOURCE_LABELS[source.source]} {source.ok ? "在线" : "回退"}
              </strong>
              <p>
                返回 {source.count} 条信号{source.error ? `，原因：${source.error}` : ""}
              </p>
            </div>
          ))}
        </article>

        <article className="notes-panel panel">
          <div className="section-title">
            <h3>当前说明</h3>
          </div>
          <p>这套 MVP 已经把前台、热点聚合和 OpenRouter 分析串起来了。</p>
          <ul className="notes-list">
            <li>未配置 OpenRouter Key 时，会自动使用本地规则生成摘要。</li>
            <li>后续可以继续加登录、数据库、历史趋势和定时任务。</li>
            <li>等网页版稳定后，再进入 Agent Skills 开发阶段。</li>
          </ul>

          {state.error ? <div className="error-banner">{state.error}</div> : null}
        </article>
      </section>
    </main>
  );
}