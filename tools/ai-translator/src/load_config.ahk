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