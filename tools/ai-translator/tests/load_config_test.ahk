#Requires AutoHotkey v2.0
#Include ../src/load_config.ahk

FAILED := 0

Assert(cond, msg) {
    if !(cond) {
        MsgBox "FAIL: " msg, "load_config_test", "T1"
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
    MsgBox "load_config_test: " FAILED " failure(s)", "load_config_test", "T1"
    ExitApp 1
}
MsgBox "load_config_test: PASS", "load_config_test", "T1"
ExitApp 0