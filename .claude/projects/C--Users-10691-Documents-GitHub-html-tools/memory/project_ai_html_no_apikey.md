---
name: ai.html API Key not required currently
description: Vercel-side auth is configured, so the client API Key field in ai.html is unnecessary for now
type: project
---

ai.html 工具当前不需要客户端 API Key —— Vercel 端已经配置了认证,serverless function `https://next-reader-psi.vercel.app/api/minimax` 自己处理鉴权。

**Why:** 用户在 2026-10-13 反馈"API key 暂时没必要了,因为在 Vercel 上设置了"。

**How to apply:** 当用户报告 ai.html 相关问题或在调试时,不必再追问 API Key 是否设置 / 要求设置。如果以后 Vercel 配置变更,用户会主动告知。
