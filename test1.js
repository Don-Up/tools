const text = "Hello, world. This is a test, and object.method() should not split.";
const parts = text.split(/(?<=[.,])\s+/);
console.log(parts);