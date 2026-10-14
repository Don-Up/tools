# AI Translator (AutoHotkey v2)

Lightweight hotkey-driven AI translation for any Windows editor. Select text, press `Ctrl+Alt+T`, get a translation back in place.

## Requirements

- Windows 10/11
- AutoHotkey v2 installed (https://www.autohotkey.com/)

## Install

1. Drop `ai-translator.ahk` anywhere (e.g. `Documents\ai-translator\`).
2. Double-click the script to run. A tray icon appears.
3. (Optional) Copy the script to `shell:startup` to launch on login.

## Usage

1. Select text in any editor (Obsidian, Typora, VS Code, etc.).
2. Press **Ctrl+Alt+T**.
3. Wait 1–3 s; the selection is replaced with the translation.
4. Press **Ctrl+Z** to undo if you don't like the result.

Default prompt translates Chinese → English. Edit `ai-translator.ini` next to the script (right-click tray → "Open config dir") to change prompt / endpoint / hotkey. Press **Ctrl+Alt+R** to reload config without restarting.

## Troubleshooting

- "未选中文本" toast: nothing was selected when you pressed the hotkey.
- "网络不通,请检查连接": check your internet connection.
- "API Key 无效或已过期" / "无权访问" / etc.: contact the maintainer; same errors match `ai.html`.

Full design rationale: `docs/superpowers/specs/2026-10-14-ai-translator-ahk-design.md`.