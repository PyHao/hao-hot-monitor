# AI Hot Monitor

## 启动

1. 复制环境变量模板：
   - 将 `.env.local.example` 复制为 `.env.local`
2. 填入你的 OpenRouter Key：
   - `OPENROUTER_API_KEY`
3. 安装依赖并启动：
   - `npm install`
   - `npm run dev`
4. 浏览器打开：
   - http://localhost:3000

## OpenRouter 配置

项目在 [lib/openrouter.ts](lib/openrouter.ts) 中读取以下环境变量：

- `OPENROUTER_API_KEY`：必填，没有它时会自动走本地规则分析
- `OPENROUTER_MODEL`：可选，默认 `openai/gpt-4o-mini`
- `OPENROUTER_SITE_URL`：可选，默认 `http://localhost:3000`
- `OPENROUTER_APP_NAME`：可选，默认 `hao-hot-monitor`

## 说明

当前版本已经包含网页、热点聚合 API 和 OpenRouter 分析链路。没有配置 Key 也能启动，只是 AI 分析会使用本地回退结果。
