# AI Translator (AutoHotkey v2) — Design

## Goal

A lightweight Windows desktop tool that translates selected text in any editor (Obsidian, Typora, VS Code, etc.) using the same AI endpoint already in use by `ai.html`, and replaces the selection in place.

## Non-Goals

- No translation history, no model picker, no GUI window
- No cross-platform support (Windows only)
- No auto-start on boot (user can drop a shortcut into `shell:startup`)

## Decisions Locked In (Brainstorming Outcome)

- Target: native desktop editors, primarily `.md`-based notes
- Interaction: global hotkey + automatic paste-over-selection (no per-call dialog)
- Direction: default Chinese → English (configurable via ini)
- Stack: AutoHotkey v2 (user already has the runtime; single `.ahk` file)

## Architecture

Five small units in one `ai-translator.ahk` file (~200-400 lines):

1. **Hotkey Handler** — listens for `Ctrl+Alt+T` (configurable in ini); dispatches to the translation pipeline
2. **Clipboard Conductor** — saves `ClipboardAll`, sends `Ctrl+C` to capture the selection, reads the clipboard, writes the translated text, sends `Ctrl+V`, then restores the original `ClipboardAll` after a short delay
3. **AI Client** — uses `ComObjCreate("WinHttp.WinHttpRequest.5.1")` to `POST` the endpoint, `stream: false`, with explicit timeouts; parses the response with the built-in `JSON.Load()` helper
4. **Settings Loader** — reads `ai-translator.ini` next to the script on launch; writes defaults if missing; supports hot-reload via `Ctrl+Alt+R`
5. **Tray Icon** — minimal tray icon with menu (Reload config · Open config dir · About · Exit); also surfaces errors via tray balloon

Splitting these units up keeps the HTTP layer swap-in-place: changing endpoint, model, or prompt is an `.ini` edit, not a code change.

## Trigger & Clipboard Sequence

When the user has text selected and presses the hotkey:

| # | Action | Why |
|---|---|---|
| 1 | `ClipboardAll := ClipboardAll()` | Preserve whatever the user last copied |
| 2 | `Send "^c"` | Selection → clipboard (universal across editors) |
| 3 | `Sleep 80` | Clipboard needs a tick to settle |
| 4 | Read clipboard, bail with toast if empty | Silent skip on accidental press |
| 5 | Show translucent "译…" pill (only after 500 ms) | Visual feedback only when noticeably slow |
| 6 | Call AI client, await translated text | See "AI Request" section |
| 7 | Write translated text to clipboard | Prepare paste |
| 8 | `Send "^v"` | Replace selection |
| 9 | `Sleep 200` | Let paste settle |
| 10 | `ClipboardAll := saved` (delayed restore) | Don't pollute user's next `Ctrl+V` |
| 11 | Brief "✓" pulse | Confirms completion |

### Why `Ctrl+C` → `Ctrl+V` instead of reading selection directly

UIA-based selection reading is brittle across editors. The simulated `Ctrl+C` / `Ctrl+V` pair works in every editor that supports standard shortcuts, and the user gets the natural `Ctrl+Z` undo for free — pasting is just a paste, undoing it is just an undo.

### `stream: false`

Translation outputs are short paragraphs. Waiting 1–3 s for the full response is fine; SSE parsing in AHK is more code for no user-facing benefit.

### Concurrency guard

A single global `isTranslating := false` flag. Re-triggers while a request is in flight are silently dropped; otherwise we could overwrite `ClipboardAll` mid-restore and lose the user's copy.

## AI Request

Mirrors `ai.html` so the same prompt and model work in both places.

**Body** (JSON):

```json
{
  "model": "MiniMax-M3",
  "max_tokens": 8192,
  "system": "请将以下中文翻译成英文:",
  "messages": [{ "role": "user", "content": "<selected text>" }],
  "stream": false
}
```

**Headers**:

- `content-type: application/json`
- `anthropic-version: 2023-06-01`

**Response extraction**:

- `response.content[0].text` is the primary path
- Fallback: `response.content[0].thinking`, then empty string
- If `response` itself is missing or not an object: treat as parse failure

**Timeouts** (via `WinHttpRequest.SetTimeouts`):

- resolve: 3000 ms
- connect: 3000 ms
- send: 5000 ms
- receive: 10000 ms

## Error Handling

The clipboard safety rule: **no error path may write to the clipboard or send `Ctrl+V`**. Otherwise the user's prior copy gets destroyed.

| Condition | User-visible behavior |
|---|---|
| Empty clipboard after step 3 | Toast pill: "未选中文本". Clipboard untouched. |
| HTTP 401 / 403 / 404 / 429 | Toast pill with the matching message (mapped identically to `ai.html`). Clipboard untouched. |
| HTTP 5xx | Toast pill: "服务异常,请稍后再试". Clipboard untouched. |
| Network timeout / connection failure | Toast pill: "网络不通,请检查连接". Clipboard untouched. |
| JSON parse failure or empty `content` | Toast pill: "返回内容异常". Clipboard untouched. |
| `WinHttpRequest` throws | Caught, reported via tray balloon; clipboard untouched. |

The pill auto-dismisses after ~1.5 s and never blocks input.

## Configuration File

Path: `ai-translator.ini` in `A_ScriptDir`. Created with defaults on first run.

```ini
[hotkey]
trigger=^!t                ; Ctrl+Alt+T
reload=^!r                 ; Ctrl+Alt+R reloads config

[api]
baseUrl=https://next-reader-psi.vercel.app/api/minimax
model=MiniMax-M3
maxTokens=8192
timeoutMs=10000

[prompt]
systemPrompt=请将以下中文翻译成英文:

[behavior]
restoreClipboard=true
```

### Future-proofing without building it now

- Adding a second `(hotkey, prompt)` pair (e.g. `Ctrl+Alt+S` for en→zh) is an `.ini` extension, not a code change.
- Variable interpolation in the system prompt (e.g. `${source}`) is deferred until a concrete need.

## Testing

End-to-end UI tests for AHK-on-Windows are out of reach without a real desktop session, so testing is a manual matrix the maintainer runs before each release.

| Scenario | Expected |
|---|---|
| Obsidian, select "中文测试", press hotkey | Selection replaced with English equivalent |
| Typora, select a multi-sentence paragraph, press hotkey | Full paragraph translated; punctuation preserved |
| VS Code `.md` file, select Chinese inside a code comment | Comment translated, surrounding code untouched |
| Selection mixes CN and EN | Whole selection translated to EN |
| Press hotkey with no selection | Toast appears; clipboard unchanged |
| Airplane mode + press hotkey | Toast "网络不通"; selection untouched |
| Selection > 500 chars | 1–3 s wait, then full replacement |
| Right after translation, `Ctrl+Z` | Original text restored |
| Pre-copy a URL, then translate a phrase, then `Ctrl+V` | The URL re-pastes (clipboard restored) |
| Edit `systemPrompt` in `.ini`, press `Ctrl+Alt+R`, then translate | New prompt takes effect on next call |

## File Layout

- `tools/ai-translator/ai-translator.ahk` — main script
- `tools/ai-translator/ai-translator.ini` — config (gitignored; first-run creates with defaults)
- `tools/ai-translator/README.md` — install + usage (≤30 lines)

One subdirectory keeps the script self-contained, out of the way of the other `.html` tools at the repo root.

## Open Questions

None at design time. Implementation may surface quirks (e.g. AHK v2 `WinHttpRequest` quirks, clipboard race under heavy load); these are tracked as implementation notes, not design changes.
