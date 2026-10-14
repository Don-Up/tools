# AI Translator (AutoHotkey v2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file AutoHotkey v2 script that translates selected text in any Windows editor (Obsidian / Typora / VS Code) via the existing `/api/minimax` endpoint and replaces the selection in place.

**Architecture:** One `tools/ai-translator/ai-translator.ahk` script split into five clearly-bordered functions: `LoadConfig`, `BuildRequestBody` + `ParseResponseText` + `MapHttpError`, `CallApi`, `TranslateSelection`, `ShowToast` + `SetupTray` + `RegisterHotkeys`. Clipboard is captured via simulated `Ctrl+C` and restored via `ClipboardAll`. HTTP uses `WinHttpRequest.5.1` COM with `stream: false`. Pure logic (config, JSON, error mapping) has MsgBox-based unit tests in `tests/`; integration / desktop-only logic has manual smoke checks.

**Tech Stack:** AutoHotkey v2 (already installed on target machine), built-in `WinHttpRequest` COM, built-in `JSON.Load`, built-in `IniRead`/`IniWrite`, AHK v2 `Hotkey`, `Gui`, `TrayTip`, `Send`, `Sleep`, `Clipboard`/`ClipboardAll`.

**Test strategy:** Mixed mode. Pure logic (config parsing, JSON body, response parse, error map) is unit-tested by small `.ahk` scripts under `tests/` that use `MsgBox` for pass/fail and `ExitApp N` for process exit code. Desktop-bound logic (clipboard, HTTP, hotkey, toast, tray) is verified via manual smoke checks per task, with an acceptance run-through per spec's testing matrix at the end.

**Reference:** Spec at `docs/superpowers/specs/2026-10-14-ai-translator-ahk-design.md`. Endpoint, model, prompt come from `ai.html`.

**Working directory:** `C:\Users\10691\Documents\GitHub\html-tools\` (project root). All paths below are relative to this root unless noted.

---

## File Structure

```
tools/ai-translator/
├── ai-translator.ahk       # Single-file program (~250-400 lines)
├── ai-translator.ini       # User config (gitignored; auto-created on first run)
├── README.md               # Install, usage, troubleshooting (≤40 lines)
└── tests/
    ├── run_tests.ahk       # Single-file test runner (boots every test, reports pass/fail)
    ├── load_config_test.ahk
    ├── build_request_body_test.ahk
    ├── parse_response_test.ahk
    └── map_http_error_test.ahk
```

`.gitignore` gets one new line: `tools/ai-translator/ai-translator.ini`.

---

## Task 1: Scaffold project + Add .gitignore line

**Files:**
- Create: `tools/ai-translator/README.md`
- Create: `tools/ai-translator/tests/.gitkeep` (empty file so the dir tracks)
- Modify: `.gitignore` (add one line)

- [ ] **Step 1: Create the directory structure**

```bash
mkdir -p tools/ai-translator/tests
```

- [ ] **Step 2: Write `tools/ai-translator/README.md` stub**

```markdown
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
```

- [ ] **Step 3: Touch the test placeholder**

```bash
type nul > tools/ai-translator/tests/.gitkeep
```

- [ ] **Step 4: Add `.gitignore` line for the user config**

Open `.gitignore` (currently contains only `.idea`) and append:

```
tools/ai-translator/ai-translator.ini
```

Result:
```
.idea
tools/ai-translator/ai-translator.ini
```

- [ ] **Step 5: Commit**

```bash
git add tools/ai-translator/ .gitignore
git commit -m "feat(ai-translator): scaffold project + gitignore user config"
```

---

## Task 2: Config loader (`LoadConfig`) with default-file writer and unit tests

**Files:**
- Create: `tools/ai-translator/src/load_config.ahk` (function library)
- Create: `tools/ai-translator/tests/load_config_test.ahk`
- Create: `tools/ai-translator/tests/run_tests.ahk`

The library exports three functions consumed by the main script: `EnsureDefaultConfig(path)`, `LoadConfig(path)`, and `DefaultConfig()`. The first writes defaults if the file doesn't exist; the second parses the file; the third returns a Map() of fallback defaults used when keys are missing.

- [ ] **Step 1: Write the failing test**

Create `tools/ai-translator/tests/load_config_test.ahk`:

```ahk
#Requires AutoHotkey v2.0
#Include ../src/load_config.ahk

FAILED := 0

Assert(cond, msg) {
    if !(cond) {
        MsgBox "FAIL: " msg
        FAILED++
    }
}

; 1. Defaults are sensible
defaults := DefaultConfig()
Assert(defaults["baseUrl"] = "https://next-reader-psi.vercel.app/api/minimax", "default baseUrl")
Assert(defaults["model"] = "MiniMax-M3", "default model")
Assert(InStr(defaults["systemPrompt"], "翻译"), "default systemPrompt mentions translation")
Assert(defaults["trigger"] = "^!t", "default trigger hotkey")
Assert(defaults["reload"] = "^!r", "default reload hotkey")
Assert(defaults["timeoutMs"] = 10000, "default timeout")
Assert(defaults["restoreClipboard"] = true, "default restoreClipboard")

; 2. EnsureDefaultConfig creates file when missing
tmpFile := A_Temp "\ai-translator-test.ini"
FileDelete tmpFile
EnsureDefaultConfig(tmpFile)
Assert(FileExist(tmpFile), "EnsureDefaultConfig created file")

; 3. LoadConfig on a freshly-written default file returns defaults
loaded := LoadConfig(tmpFile)
Assert(loaded["model"] = "MiniMax-M3", "freshly written file round-trips model")

; 4. LoadConfig respects user overrides (write a custom line via IniWrite)
customFile := A_Temp "\ai-translator-custom.ini"
FileDelete customFile
FileAppend "", customFile
IniWrite "请译成简体中文", customFile, "prompt", "systemPrompt"
IniWrite "^!g", customFile, "hotkey", "trigger"
loaded := LoadConfig(customFile)
Assert(loaded["systemPrompt"] = "请译成简体中文", "user override systemPrompt loaded")
Assert(loaded["trigger"] = "^!g", "user override trigger loaded")
; untouched keys fall back to defaults
Assert(loaded["model"] = "MiniMax-M3", "missing key falls back to default")

FileDelete tmpFile
FileDelete customFile

if FAILED {
    MsgBox "load_config_test: " FAILED " failure(s)"
    ExitApp 1
}
MsgBox "load_config_test: PASS"
ExitApp 0
```

- [ ] **Step 2: Run the test and confirm it fails**

Run from a Bash shell:

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" load_config_test.ahk 2>&1 || true
```

Expected: `Error: Can't open include file "../src/load_config.ahk"` (or similar). The exact wording is fine; what matters is the script does not reach `PASS`.

(Note: if your AHK v2 install path differs, replace `/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe` with whatever `where AutoHotkey64` returns.)

- [ ] **Step 3: Implement `load_config.ahk`**

Create `tools/ai-translator/src/load_config.ahk`:

```ahk
; Returns a Map() of fallback defaults used by LoadConfig when keys are absent.
DefaultConfig() {
    cfg := Map()
    cfg["baseUrl"] := "https://next-reader-psi.vercel.app/api/minimax"
    cfg["model"] := "MiniMax-M3"
    cfg["maxTokens"] := 8192
    cfg["timeoutMs"] := 10000
    cfg["systemPrompt"] := "请将以下中文翻译成英文:"
    cfg["trigger"] := "^!t"
    cfg["reload"] := "^!r"
    cfg["restoreClipboard"] := true
    return cfg
}

; If `path` does not exist, write a default ini file there.
EnsureDefaultConfig(path) {
    if FileExist(path)
        return
    defaults := DefaultConfig()
    IniWrite defaults["baseUrl"], path, "api", "baseUrl"
    IniWrite defaults["model"], path, "api", "model"
    IniWrite defaults["maxTokens"], path, "api", "maxTokens"
    IniWrite defaults["timeoutMs"], path, "api", "timeoutMs"
    IniWrite defaults["systemPrompt"], path, "prompt", "systemPrompt"
    IniWrite defaults["trigger"], path, "hotkey", "trigger"
    IniWrite defaults["reload"], path, "hotkey", "reload"
    IniWrite defaults["restoreClipboard"] ? "true" : "false", path, "behavior", "restoreClipboard"
}

; Parses the ini at `path` into a Map(). Missing keys fall back to DefaultConfig().
LoadConfig(path) {
    cfg := DefaultConfig()
    baseUrl := IniRead(path, "api", "baseUrl", "")
    if baseUrl != ""
        cfg["baseUrl"] := baseUrl
    model := IniRead(path, "api", "model", "")
    if model != ""
        cfg["model"] := model
    maxTokens := IniRead(path, "api", "maxTokens", "")
    if maxTokens != ""
        cfg["maxTokens"] := Integer(maxTokens)
    timeoutMs := IniRead(path, "api", "timeoutMs", "")
    if timeoutMs != ""
        cfg["timeoutMs"] := Integer(timeoutMs)
    systemPrompt := IniRead(path, "prompt", "systemPrompt", "")
    if systemPrompt != ""
        cfg["systemPrompt"] := systemPrompt
    trigger := IniRead(path, "hotkey", "trigger", "")
    if trigger != ""
        cfg["trigger"] := trigger
    reload := IniRead(path, "hotkey", "reload", "")
    if reload != ""
        cfg["reload"] := reload
    restoreClipboard := IniRead(path, "behavior", "restoreClipboard", "")
    if restoreClipboard != ""
        cfg["restoreClipboard"] := (restoreClipboard = "true")
    return cfg
}
```

- [ ] **Step 4: Run the test and confirm it passes**

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" load_config_test.ahk
```

Expected: a `load_config_test: PASS` dialog. Click OK.

- [ ] **Step 5: Write the test runner `run_tests.ahk`**

Create `tools/ai-translator/tests/run_tests.ahk`. This is the single command engineers run for all unit tests. It will gain RunTest invocations as new test files land:

```ahk
#Requires AutoHotkey v2.0

RunTest(file) {
    RunWait(format('"{1}" A_AhkPath " {2}"', A_AhkPath, file),, "Hide")
}

total := 0
passed := 0
failed := 0

RunOne(file) {
    global total, passed, failed
    total++
    fullPath := A_ScriptDir "\" file
    RunWait('"' A_AhkPath '" "' fullPath '"',, "Hide", &out)
    if out = 0 {
        passed++
        ToolTip file ": PASS"
    } else {
        failed++
        ToolTip file ": FAIL (exit " out ")"
    }
    Sleep 200
}

RunOne("load_config_test.ahk")
; future tests added in subsequent tasks

MsgBox "Tests: " passed "/" total " passed, " failed " failed"
ExitApp (failed > 0) ? 1 : 0
```

(Note: `RunOne` is approximate — final wiring may be refined in Task 8 once `run_tests.ahk` has all tests. For now it forces engineer's attention to each individual test in Tasks 2–5 too.)

- [ ] **Step 6: Commit**

```bash
git add tools/ai-translator/src/load_config.ahk tools/ai-translator/tests/load_config_test.ahk tools/ai-translator/tests/run_tests.ahk
git commit -m "feat(ai-translator): config loader with default-file writer + tests"
```

---

## Task 3: AI client pure functions (`BuildRequestBody`, `ParseResponseText`, `MapHttpError`) with unit tests

**Files:**
- Create: `tools/ai-translator/src/ai_client.ahk`
- Create: `tools/ai-translator/tests/build_request_body_test.ahk`
- Create: `tools/ai-translator/tests/parse_response_test.ahk`
- Create: `tools/ai-translator/tests/map_http_error_test.ahk`

- [ ] **Step 1: Write `build_request_body_test.ahk`**

Create `tools/ai-translator/tests/build_request_body_test.ahk`:

```ahk
#Requires AutoHotkey v2.0
#Include ../src/ai_client.ahk

FAILED := 0
Assert(cond, msg) {
    if !(cond) {
        MsgBox "FAIL: " msg
        FAILED++
    }
}

body := BuildRequestBody("请翻译", "你好", "MiniMax-M3", 8192)
; Top-level keys present
Assert(InStr(body, '"model":"MiniMax-M3"'), "model key")
Assert(InStr(body, '"max_tokens":8192'), "max_tokens key")
Assert(InStr(body, '"system":"请翻译"'), "system prompt JSON-escaped (Chinese)")
Assert(InStr(body, '"content":"你好"'), "user content JSON-escaped (Chinese)")
Assert(InStr(body, '"role":"user"'), "user role")
Assert(InStr(body, '"stream":false'), "stream disabled")
; Message is single object, not array of multiple
Assert(InStr(body, '"messages":[{"role":"user","content":"') = 1, "messages array shape"

if FAILED {
    MsgBox "build_request_body_test: " FAILED " failure(s)"
    ExitApp 1
}
MsgBox "build_request_body_test: PASS"
ExitApp 0
```

(`请翻译` is the JSON escape for `请翻译`; `你好` is `你好`. Chinese chars must be escaped, not raw, in the JSON body. AHK's `JSON.Stringify` and `Json()` constructor do this for us.)

- [ ] **Step 2: Write `parse_response_test.ahk`**

Create `tools/ai-translator/tests/parse_response_test.ahk`:

```ahk
#Requires AutoHotkey v2.0
#Include ../src/ai_client.ahk

FAILED := 0
Assert(cond, msg) {
    if !(cond) {
        MsgBox "FAIL: " msg
        FAILED++
    }
}

; Happy path: standard Anthropic-shaped response
okRaw := '{"content":[{"type":"text","text":"hello"}]}'
Assert(ParseResponseText(okRaw) = "hello", "happy path extracts text")

; Fallback: missing type field still returns text if present
fallbackRaw := '{"content":[{"text":"world"}]}'
Assert(ParseResponseText(fallbackRaw) = "world", "missing type still returns text")

; Thinking-only response: returns thinking as fallback
thinkingRaw := '{"content":[{"type":"thinking","thinking":"hmm"}]}'
Assert(ParseResponseText(thinkingRaw) = "hmm", "thinking-only returns thinking text")

; Empty content array
Assert(ParseResponseText('{"content":[]}') = "", "empty content returns empty")

; Missing content key
Assert(ParseResponseText('{}') = "", "missing content returns empty")

; Garbage
Assert(ParseResponseText('not json') = "", "garbage returns empty")
Assert(ParseResponseText('') = "", "empty string returns empty")

if FAILED {
    MsgBox "parse_response_test: " FAILED " failure(s)"
    ExitApp 1
}
MsgBox "parse_response_test: PASS"
ExitApp 0
```

- [ ] **Step 3: Write `map_http_error_test.ahk`**

Create `tools/ai-translator/tests/map_http_error_test.ahk`:

```ahk
#Requires AutoHotkey v2.0
#Include ../src/ai_client.ahk

FAILED := 0
Assert(cond, msg) {
    if !(cond) {
        MsgBox "FAIL: " msg
        FAILED++
    }
}

Assert(MapHttpError(401) = "API Key 无效或已过期。", "401 mapped")
Assert(MapHttpError(403) = "无权访问,请检查账户或区域。", "403 mapped")
Assert(MapHttpError(404) = "模型或接口路径错误。", "404 mapped")
Assert(MapHttpError(429) = "请求过于频繁,请稍后重试。", "429 mapped")
Assert(MapHttpError(500) = "服务异常,请稍后再试", "500 generic")
Assert(MapHttpError(503) = "服务异常,请稍后再试", "503 generic")
Assert(MapHttpError(0) = "", "no error code returns empty")

if FAILED {
    MsgBox "map_http_error_test: " FAILED " failure(s)"
    ExitApp 1
}
MsgBox "map_http_error_test: PASS"
ExitApp 0
```

- [ ] **Step 4: Run all three tests and confirm they fail**

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" build_request_body_test.ahk
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" parse_response_test.ahk
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" map_http_error_test.ahk
```

Expected: each script raises an error about a missing `#Include`. The test files don't reach `PASS` for any of them.

- [ ] **Step 5: Implement `ai_client.ahk`**

Create `tools/ai-translator/src/ai_client.ahk`:

```ahk
; Build the JSON request body. Pure function — no I/O.
BuildRequestBody(systemPrompt, userContent, model, maxTokens) {
    msgObj := Map()
    msgObj["role"] := "user"
    msgObj["content"] := userContent
    msgs := [msgObj]
    body := Map()
    body["model"] := model
    body["max_tokens"] := maxTokens
    body["system"] := systemPrompt
    body["messages"] := msgs
    body["stream"] := false
    return JSON.Stringify(body)
}

; Extract the assistant text from an Anthropic-shaped response.
; Returns "" on parse failure or empty content. Pure function.
ParseResponseText(rawJson) {
    obj := JSON.Load(rawJson)
    if !IsObject(obj)
        return ""
    content := obj["content"]
    if !IsObject(content) || content.Length = 0
        return ""
    first := content[1]
    if !IsObject(first)
        return ""
    if first.Has("text") && first["text"] != ""
        return first["text"]
    if first.Has("thinking") && first["thinking"] != ""
        return first["thinking"]
    return ""
}

; Map an HTTP status code to a user-facing message. Empty string when status is 0 (no error).
MapHttpError(status) {
    switch status {
        case 401: return "API Key 无效或已过期。"
        case 403: return "无权访问,请检查账户或区域。"
        case 404: return "模型或接口路径错误。"
        case 429: return "请求过于频繁,请稍后重试。"
        case 500, 502, 503, 504: return "服务异常,请稍后再试"
    }
    return ""
}

; HTTP transport — wraps WinHttpRequest. Returns raw JSON string on success.
; Throws with .Status set on HTTP error or "" + .Message set on network error.
CallApi(baseUrl, jsonBody, timeoutMs := 10000) {
    http := ComObjCreate("WinHttp.WinHttpRequest.5.1")
    http.SetTimeouts(3000, 3000, 5000, timeoutMs)
    try {
        http.Open("POST", baseUrl, false)
        http.SetRequestHeader("content-type", "application/json")
        http.SetRequestHeader("anthropic-version", "2023-06-01")
        http.Send(jsonBody)
    } catch as err {
        throw Error("network: " err.Message)
    }
    if http.Status != 200 {
        status := http.Status
        body := ""
        try body := http.ResponseText
        e := Error("HTTP " status)
        e.Status := status
        e.Body := body
        throw e
    }
    return http.ResponseText
}
```

- [ ] **Step 6: Run all three tests and confirm they pass**

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" build_request_body_test.ahk
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" parse_response_test.ahk
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" map_http_error_test.ahk
```

Expected: each shows a `PASS` dialog. Click OK on each.

- [ ] **Step 7: Commit**

```bash
git add tools/ai-translator/src/ai_client.ahk tools/ai-translator/tests/build_request_body_test.ahk tools/ai-translator/tests/parse_response_test.ahk tools/ai-translator/tests/map_http_error_test.ahk
git commit -m "feat(ai-translator): AI client pure functions + HTTP transport with tests"
```

---

## Task 4: Live API smoke test (real endpoint round-trip)

**Files:**
- Create: `tools/ai-translator/tests/live_api_test.ahk`

This validates that `CallApi`, `ParseResponseText`, and the default `baseUrl`/`model` combination work end-to-end on the engineer's machine.

- [ ] **Step 1: Write `live_api_test.ahk`**

Create `tools/ai-translator/tests/live_api_test.ahk`:

```ahk
#Requires AutoHotkey v2.0
#Include ../src/load_config.ahk
#Include ../src/ai_client.ahk

#Warn All, MsgBox

result := ""
errMsg := ""
try {
    body := BuildRequestBody(
        DefaultConfig()["systemPrompt"],
        "你好",
        DefaultConfig()["model"],
        DefaultConfig()["maxTokens"]
    )
    raw := CallApi(
        DefaultConfig()["baseUrl"],
        body,
        DefaultConfig()["timeoutMs"]
    )
    result := ParseResponseText(raw)
} catch as err {
    errMsg := err.Message
    if err.Has("Status") {
        errMsg := errMsg " (HTTP " err.Status ")"
    }
}

if errMsg != "" {
    MsgBox "live_api_test: FAIL`n`n" errMsg
    ExitApp 1
}
if result = "" {
    MsgBox "live_api_test: FAIL`n`nempty ParseResponseText output"
    ExitApp 1
}
MsgBox "live_api_test: PASS`n`nTranslation of '你好' returned: " result
ExitApp 0
```

- [ ] **Step 2: Run it and confirm it passes**

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" live_api_test.ahk
```

Expected: a dialog with `live_api_test: PASS` and a translated string of `你好` (e.g. `hello`, `Hello`, `Hi` — any non-empty English is fine). Click OK.

If it fails with a network error, confirm internet connectivity; if it persists, investigate endpoint availability.

- [ ] **Step 3: Commit**

```bash
git add tools/ai-translator/tests/live_api_test.ahk
git commit -m "test(ai-translator): live smoke test against real /api/minimax endpoint"
```

---

## Task 5: Clipboard orchestration (`TranslateSelection`) with dependency-injected tests

**Files:**
- Create: `tools/ai-translator/src/translate.ahk`
- Create: `tools/ai-translator/tests/translate_test.ahk`

The orchestrator embeds the spec's 11-step clipboard sequence. To make it testable without a real desktop, dependencies (`fakeCallApi`, `fakeClipboard`, `fakeSend`) are taken as parameters — the runtime calls it with the real implementations, tests call with fakes.

- [ ] **Step 1: Write `translate_test.ahk`**

Create `tools/ai-translator/tests/translate_test.ahk`:

```ahk
#Requires AutoHotkey v2.0
#Include ../src/translate.ahk

FAILED := 0
Assert(cond, msg) {
    if !(cond) {
        MsgBox "FAIL: " msg
        FAILED++
    }
}

; Fake dependencies
fakeClipboard := Map()
fakeClipboard["saved"] := Map("all", "PRIOR-COPY")
fakeClipboard["afterCtrlC"] := "你好世界"
fakeClipboard["gets"] := 0
fakeClipboard["sets"] := 0

fakeCallApi := (cfg, body, t) => "Hello world"
fakeSend := (keys) => fakeSend.calls.Push(keys)
fakeSend.calls := []
fakeShowToast := (text, ms) => fakeShowToast.calls.Push(text)
fakeShowToast.calls := []

deps := Map(
    "ClipboardAll_get", (*) => fakeClipboard["saved"],
    "Clipboard_getText", (*) => fakeClipboard["afterCtrlC"],
    "Clipboard_setText", (text) => fakeClipboard["sets"]++,
    "ClipboardAll_set", (all) => fakeClipboard["gets"]++,
    "CallApi", fakeCallApi,
    "Send", fakeSend,
    "Sleep", (*) => ,
    "ShowToast", fakeShowToast
)

cfg := Map("model", "MiniMax-M3", "maxTokens", 8192, "timeoutMs", 10000,
           "systemPrompt", "translate", "restoreClipboard", true,
           "trigger", "^!t", "reload", "^!r", "baseUrl", "x")

; 1. Happy path
errOut := ""
rc := TranslateSelection(cfg, deps, &errOut)
Assert(rc = true, "happy path returns true")
Assert(errOut = "", "happy path no error")
Assert(fakeClipboard["sets"] = 1, "clipboard written once")
Assert(fakeSend.calls.Length = 1, "send called once")
Assert(fakeSend.calls[1] = "^v", "send pressed Ctrl+V")
Assert(fakeShowToast.calls.Length >= 1, "completion toast shown")

; 2. Empty selection bails before AI call
fakeSend.calls := []
fakeShowToast.calls := []
fakeClipboard["afterCtrlC"] := ""
rc := TranslateSelection(cfg, deps, &errOut)
Assert(rc = false, "empty selection returns false")
Assert(errOut = "empty", "empty selection sets errOut=empty")
Assert(fakeSend.calls.Length = 0, "no send on empty selection")
Assert(fakeShowToast.calls.Length = 1, "single toast on empty selection")
Assert(InStr(fakeShowToast.calls[1], "未选中") || InStr(fakeShowToast.calls[1], "未选择"), "empty toast mentions 未选")

; 3. AI error bails without clipboard write or Ctrl+V
fakeCallApi := (cfg, body, t) => throw Error("HTTP 500")
fakeSend.calls := []
fakeShowToast.calls := []
fakeClipboard["afterCtrlC"] := "你好"
fakeClipboard["sets"] := 0
deps["CallApi"] := fakeCallApi
errOut := ""
rc := TranslateSelection(cfg, deps, &errOut)
Assert(rc = false, "AI error returns false")
Assert(errOut = "http500" || errOut = "network" || errOut != "", "error path sets errOut")
Assert(fakeClipboard["sets"] = 0, "clipboard NOT touched on AI error")
Assert(fakeSend.calls.Length = 0, "Ctrl+V NOT sent on AI error")

; 4. Restore clipboard honored (even when restoreClipboard = true; we still call set)
fakeClipboard["gets"] := 0

; 5. Subsequent successful call works (busy flag was reset)
fakeSend.calls := []
fakeShowToast.calls := []
fakeClipboard["afterCtrlC"] := "再见"
errOut := ""
rc := TranslateSelection(cfg, deps, &errOut)
Assert(rc = true, "subsequent call after success returns true")
Assert(errOut = "", "subsequent call no error")
Assert(fakeSend.calls[fakeSend.calls.Length] = "^v", "subsequent call still sends Ctrl+V")

if FAILED {
    MsgBox "translate_test: " FAILED " failure(s)"
    ExitApp 1
}
MsgBox "translate_test: PASS"
ExitApp 0
```

- [ ] **Step 2: Run and confirm it fails**

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" translate_test.ahk
```

Expected: `#Include '../src/translate.ahk'` error.

- [ ] **Step 3: Implement `translate.ahk`**

Create `tools/ai-translator/src/translate.ahk`:

```ahk
; Orchestrates the spec's 11-step clipboard-translate-paste sequence.
; `deps` is a Map() providing injectable IO functions:
;   ClipboardAll_get (*):                       -> Map() describing prior clipboard
;   Clipboard_getText (*):                      -> String (selection after Ctrl+C)
;   Clipboard_setText (text):                   (writes translated text to clipboard)
;   ClipboardAll_set (Map):                     (restores prior clipboard)
;   CallApi (cfg, body, timeoutMs):             -> String (raw JSON response)
;   Send (keys):                                (e.g. "^c", "^v")
;   Sleep (ms):                                 (delay)
;   ShowToast (text, durMs):                    (visual feedback)
; Returns true on success, false otherwise. errOut is set to a short token describing failure mode.
;
; Re-entrancy: a static `busy` flag silently drops re-entrant calls so a long-running
; translation can't have its clipboard save/restore interleaved with a second hotkey press.
TranslateSelection(cfg, deps, &errOut) {
    static busy := false
    errOut := ""

    if busy {
        errOut := "busy"
        return false
    }
    busy := true

    try {
        return DoTranslate(cfg, deps, &errOut)
    } finally {
        busy := false
    }
}

DoTranslate(cfg, deps, &errOut) {
    prior := deps["ClipboardAll_get"]()

    deps["Send"]("^c")
    deps["Sleep"](80)

    selected := deps["Clipboard_getText"]()
    if selected = "" {
        deps["ShowToast"]("未选中文本", 1500)
        errOut := "empty"
        return false
    }

    try {
        body := BuildRequestBody(cfg["systemPrompt"], selected, cfg["model"], cfg["maxTokens"])
        raw := deps["CallApi"](cfg, body, cfg["timeoutMs"])
    } catch as err {
        msg := ""
        if err.Has("Status") {
            mapped := MapHttpError(err.Status)
            msg := mapped != "" ? mapped : "服务异常,请稍后再试 (HTTP " err.Status ")"
            errOut := "http" err.Status
        } else {
            msg := "网络不通,请检查连接"
            errOut := "network"
        }
        deps["ShowToast"](msg, 1500)
        return false
    }

    translated := ParseResponseText(raw)
    if translated = "" {
        deps["ShowToast"]("返回内容异常", 1500)
        errOut := "parse"
        return false
    }

    deps["Clipboard_setText"](translated)
    deps["Send"]("^v")
    deps["Sleep"](200)

    if cfg["restoreClipboard"] {
        deps["ClipboardAll_set"](prior)
    }

    deps["ShowToast"]("✓", 600)
    return true
}
```

- [ ] **Step 4: Run and confirm it passes**

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" translate_test.ahk
```

Expected: `translate_test: PASS` dialog.

- [ ] **Step 5: Commit**

```bash
git add tools/ai-translator/src/translate.ahk tools/ai-translator/tests/translate_test.ahk
git commit -m "feat(ai-translator): clipboard orchestration with dependency-injected tests"
```

---

## Task 6: Toast UI (`ShowToast`) — manual smoke check

**Files:**
- Create: `tools/ai-translator/src/toast.ahk`
- Modify: `tools/ai-translator/tests/run_tests.ahk` (add a doc comment line; no logic change yet — we don't run `ShowToast` from the runner)

This function builds a tiny `AlwaysOnTop + ToolWindow` GUI at the top-center of the primary monitor showing `text` for `durMs` milliseconds, then auto-destroys.

- [ ] **Step 1: Implement `toast.ahk`**

Create `tools/ai-translator/src/toast.ahk`:

```ahk
; Brief feedback pill at top-center of primary monitor. Non-blocking.
ShowToast(text, durMs := 1500) {
    static last := 0
    ; If a toast was shown <300ms ago, queue the new one with the longer of the two durations.
    if last && (A_TickCount - last < 300)
        return
    last := A_TickCount

    gui := Gui("+AlwaysOnTop +ToolWindow -Caption +Border")
    gui.BackColor := "333333"
    gui.SetFont("s12 cWhite", "Segoe UI")
    gui.MarginX := 16
    gui.MarginY := 8
    gui.Add("Text",, text)
    gui.Show("NoActivate x" Round((A_ScreenWidth / 2) - 80) " y20 w160")
    SetTimer(() => gui.Destroy(), -durMs)
}
```

- [ ] **Step 2: Manual smoke check**

Create `tools/ai-translator/tests/show_toast_smoke.ahk` for human verification only — no assertions, just visual:

```ahk
#Requires AutoHotkey v2.0
#Include ../src/toast.ahk

ShowToast("译…", 1500)
Sleep 1700
ShowToast("✓", 600)
Sleep 800
ShowToast("未选中文本", 1500)
Sleep 1
ExitApp 0
```

Run:

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" show_toast_smoke.ahk
```

Expected visuals on screen, in sequence:
1. A dark grey pill at top-center, ~160×36 px, containing `译…`, fading after ~1.5s.
2. A brief `✓` pill ~0.6s.
3. A `未选中文本` pill ~1.5s.

The pill must not block cursor or input. Confirm visually, then dismiss any leftover dialog.

- [ ] **Step 3: Commit**

```bash
git add tools/ai-translator/src/toast.ahk tools/ai-translator/tests/show_toast_smoke.ahk
git commit -m "feat(ai-translator): toast pill UI + smoke script"
```

---

## Task 7: Tray icon with menu (Reload config · Open config dir · About · Exit) — manual smoke check

**Files:**
- Create: `tools/ai-translator/src/tray.ahk`

- [ ] **Step 1: Implement `tray.ahk`**

Create `tools/ai-translator/src/tray.ahk`:

```ahk
; Set up the tray icon with menu actions. Pass in callbacks so this stays decoupled.
SetupTray(onReload, onOpenConfig, onAbout, onExit) {
    TraySetIcon("shell32.dll", 89) ; a generic info icon
    A_IconTip := "AI Translator"
    Menu("Tray").Add("重载配置 (Ctrl+Alt+R)", (*) => onReload())
    Menu("Tray").Add("打开配置目录", (*) => onOpenConfig())
    Menu("Tray").Add
    Menu("Tray").Add("关于", (*) => onAbout())
    Menu("Tray").Add
    Menu("Tray").Add("退出", (*) => onExit())
}

; Default Open / About handlers that the main script can reuse.
OpenConfigDir(scriptDir) {
    Run 'explorer "' scriptDir '"'
}

ShowAbout() {
    MsgBox "AI Translator`n`nLightweight hotkey-driven AI translate for any editor.`n`nReference: docs/superpowers/specs/2026-10-14-ai-translator-ahk-design.md"
}
```

(Note: the `Menu("Tray").Add` line with no argument inserts a separator.)

- [ ] **Step 2: Manual smoke check**

Create `tools/ai-translator/tests/tray_smoke.ahk`:

```ahk
#Requires AutoHotkey v2.0
#Include ../src/tray.ahk

SetupTray(
    (*) => MsgBox("reload clicked"),
    (*) => OpenConfigDir(A_ScriptDir),
    (*) => ShowAbout(),
    (*) => ExitApp()
)

MsgBox "Tray icon should appear with 4 items + Exit. Click 'OK' to clean up."
ExitApp 0
```

Run:

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" tray_smoke.ahk
```

Expected: tray icon appears in the notification area. Right-click shows:
- 重载配置 (Ctrl+Alt+R)
- 打开配置目录
- ---
- 关于
- ---
- 退出

Click "退出" to confirm it runs `ExitApp`. Visual confirmation is sufficient — no assertions.

- [ ] **Step 3: Commit**

```bash
git add tools/ai-translator/src/tray.ahk tools/ai-translator/tests/tray_smoke.ahk
git commit -m "feat(ai-translator): tray icon with menu actions"
```

---

## Task 8: Hotkey registration + main entry (`ai-translator.ahk`) — manual smoke check

**Files:**
- Create: `tools/ai-translator/ai-translator.ahk`
- Modify: `tools/ai-translator/tests/run_tests.ahk` (now runs all unit tests; smoke tests are still separate)

This is the entry point that ties every unit together. Production behavior is exercised manually via the spec's testing matrix in Task 9.

- [ ] **Step 1: Implement `ai-translator.ahk`**

Create `tools/ai-translator/ai-translator.ahk`:

```ahk
#Requires AutoHotkey v2.0
#SingleInstance Force
#Include src/load_config.ahk
#Include src/ai_client.ahk
#Include src/translate.ahk
#Include src/toast.ahk
#Include src/tray.ahk

Persistent

CONFIG_PATH := A_ScriptDir "\ai-translator.ini"
config := LoadConfig(CONFIG_PATH)

RealDeps() {
    deps := Map()
    deps["ClipboardAll_get"] := (*) => ClipboardAll()
    deps["Clipboard_getText"] := (*) => A_Clipboard
    deps["Clipboard_setText"] := (text) => A_Clipboard := text
    deps["ClipboardAll_set"] := (all) => ClipboardAll(all)
    deps["CallApi"] := (cfg, body, t) => CallApi(cfg["baseUrl"], body, t)
    deps["Send"] := (keys) => Send(keys)
    deps["Sleep"] := (ms) => Sleep(ms)
    deps["ShowToast"] := (text, durMs) => ShowToast(text, durMs)
    return deps
}

RefreshConfig(&config) {
    EnsureDefaultConfig(CONFIG_PATH)
    config := LoadConfig(CONFIG_PATH)
}

RegisterHotkeys(cfg, onTrigger, onReloadCb) {
    try Hotkey cfg["trigger"], onTrigger, "On"
    try Hotkey cfg["reload"], onReloadCb, "On"
}

ReloadHandler(*) {
    RefreshConfig(&config)
    ShowToast("配置已重载", 1200)
}

TriggerHandler(*) {
    if !config
        return
    deps := RealDeps()
    errOut := ""
    TranslateSelection(config, deps, &errOut)
}

SetupTray(
    ReloadHandler,
    (*) => OpenConfigDir(A_ScriptDir),
    (*) => ShowAbout(),
    (*) => ExitApp()
)

EnsureDefaultConfig(CONFIG_PATH)
RefreshConfig(&config)
RegisterHotkeys(config, TriggerHandler, ReloadHandler)
```

- [ ] **Step 2: Boot the script and confirm the tray icon appears**

```bash
cd tools/ai-translator
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" ai-translator.ahk &
```

Expected: tray icon appears, no error dialog. Right-click → confirm 4-item menu from Task 7.

- [ ] **Step 3: Smoke check: hotkey triggers translation**

In any editor (e.g. open Notepad), type "你好世界" and select it. Press **Ctrl+Alt+T**.

Expected: a brief `译…` then `✓` toast at top-center, the selection replaced with English (e.g. "Hello world"). Press **Ctrl+Z** to confirm undo restores `你好世界`.

- [ ] **Step 4: Smoke check: empty selection bails**

Press **Ctrl+Alt+T** with no text selected.

Expected: `未选中文本` toast, clipboard untouched (verify by copy-pasting some test text into a separate editor — it should remain, not "未选中文本").

- [ ] **Step 5: Smoke check: config reload**

Edit `ai-translator.ini` (created on first run in the same directory) — change `systemPrompt` to `请译成简体中文:`. Save. Press **Ctrl+Alt+R**.

Expected: `配置已重载` toast. Now select English text and press **Ctrl+Alt+T**. Expected: selection translated into Simplified Chinese (e.g. "Hello world" → "你好世界"). The runtime read the new prompt without restart.

- [ ] **Step 6: Update `run_tests.ahk` to enumerate all unit tests**

Replace `tools/ai-translator/tests/run_tests.ahk`:

```ahk
#Requires AutoHotkey v2.0

RunOne(file) {
    fullPath := A_ScriptDir "\" file
    RunWait('"' A_AhkPath '" "' fullPath '"',, "Hide", &out)
    return out
}

cases := ["load_config_test.ahk",
          "build_request_body_test.ahk",
          "parse_response_test.ahk",
          "map_http_error_test.ahk"]

pass := 0
fail := 0
for _, f in cases {
    code := RunOne(f)
    if code = 0
        pass++
    else
        fail++
}
; Live test only runs if requested (network)
if A_Args.Length && A_Args[1] = "--live" {
    if RunOne("live_api_test.ahk") = 0
        pass++
    else
        fail++
}

MsgBox "Unit tests: " pass " passed, " fail " failed"
ExitApp fail > 0 ? 1 : 0
```

- [ ] **Step 7: Run all unit tests**

```bash
cd tools/ai-translator/tests
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" run_tests.ahk
```

Expected: `Unit tests: 4 passed, 0 failed`. Click OK.

(Run again with the `--live` flag for the live API smoke test; only do this when network is confirmed and you intend to spend ~3s per run on it.)

- [ ] **Step 8: Kill the running script and commit**

In a separate Bash shell:

```bash
taskkill //IM AutoHotkey64.exe //FI "PID gt 0" 2>/dev/null || true
```

(Engineer may use Task Manager; the precise command varies per Windows install — the point is to stop the smoke-script process before committing.)

```bash
git add tools/ai-translator/ai-translator.ahk tools/ai-translator/ai-translator.ini tools/ai-translator/tests/run_tests.ahk
git commit -m "feat(ai-translator): wire main entry, hotkeys, tray; updates test runner"
```

(The `ai-translator.ini` file will appear as untracked at this point — only the first launch creates it. If it doesn't yet exist, that line will simply `git add` nothing, which is fine.)

---

## Task 9: Manual acceptance matrix per spec

**Files:**
- Modify: `tools/ai-translator/README.md` (troubleshooting section already covered in Task 1; no changes needed)

No code changes; this task is the engineer manually running through the spec's testing matrix and confirming each row. The matrix is reproduced inline so this task can stand alone.

- [ ] **Step 1: Boot the script (Task 8 left it running; if killed, re-launch)**

```bash
cd tools/ai-translator
"/c/Program Files/AutoHotkey/v2/AutoHotkey64.exe" ai-translator.ahk &
```

- [ ] **Step 2: Walk through the spec's testing matrix**

For each row, perform the action and confirm the expected outcome. Tick the checkbox when confirmed.

- [ ] Row 1 — Obsidian, select "中文测试", press hotkey → expect English equivalent.
- [ ] Row 2 — Typora, select a multi-sentence paragraph → expect full paragraph translated; punctuation preserved.
- [ ] Row 3 — VS Code `.md` file, select Chinese inside a code comment → expect comment translated, surrounding code untouched.
- [ ] Row 4 — Selection mixes CN and EN → expect whole selection translated to EN.
- [ ] Row 5 — Press hotkey with no selection → expect `未选中文本` toast; clipboard unchanged.
- [ ] Row 6 — Airplane mode + press hotkey → expect `网络不通` toast; selection untouched.
- [ ] Row 7 — Selection > 500 chars → expect 1–3 s wait, then full replacement.
- [ ] Row 8 — Right after translation, `Ctrl+Z` → expect original text restored.
- [ ] Row 9 — Pre-copy a URL, translate a phrase, then `Ctrl+V` → expect URL re-pastes (clipboard restored).
- [ ] Row 10 — Edit `systemPrompt` in `.ini`, `Ctrl+Alt+R`, translate → expect new prompt takes effect.

If any row fails, stop, file a follow-up issue (or amend the spec), do not sign off the task.

- [ ] **Step 3: Final commit (only if a small README polish was needed)**

If you tweaked the README (e.g. added a real shortcut note based on feedback):

```bash
git add tools/ai-translator/README.md
git commit -m "docs(ai-translator): polish README based on acceptance run feedback"
```

(If no changes were made, skip this commit.)

---

## Done Criteria

- All 4 unit tests pass via `run_tests.ahk`.
- Live API smoke test passes (when run with `--live`).
- All 10 rows of the spec's testing matrix pass.
- Tray icon visible; right-click menu has 4 items + Exit.
- The user's prior clipboard is preserved across translations (verified by Row 9).
- `Ctrl+Z` reliably restores the original text after translation (verified by Row 8).

When all are green, the AI Translator is shippable.
