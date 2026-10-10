function countChineseCharacters(str) {
    // CJK Unified Ideographs Extension B 需要特殊处理
    const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf]|[\ud800-\udbff][\udc00-\udfff]/g;
    const matches = str.match(chineseRegex);
    return matches ? matches.length : 0;
}

// Examples
console.log(countChineseCharacters("Hello 你好世界"));        // 4
console.log(countChineseCharacters("中文测试"));              // 4
console.log(countChineseCharacters("Mixed 文本 English")); // 2
console.log(countChineseCharacters("No chinese here!"));     // 0