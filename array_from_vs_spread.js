
// 1. Array.from() 的强大：只要有 length 就行
// 这个对象看起来像数组，但没有 iterator 接口，也没有具体的索引值
const arrayLike = {
  length: 3
};

console.log("--- Array.from() ---");
// Array.from 会看到 length 是 3，就乖乖创建长度为 3 的数组
// 因为没有具体的值，所以填充 undefined
const arr1 = Array.from(arrayLike);
console.log("Array.from(arrayLike):", arr1); // [undefined, undefined, undefined]


// 2. 扩展运算符 (...) 的局限：必须要有 iterator 接口
console.log("\n--- Spread Operator (...) ---");
try {
  // 扩展运算符会尝试调用 arrayLike[Symbol.iterator]
  // 因为 arrayLike 没有这个接口，所以会直接报错！
  const arr2 = [...arrayLike];
  console.log("Spread result:", arr2);
} catch (e) {
  console.error("Spread failed:", e.message); // TypeError: arrayLike is not iterable
}

// 3. 只有当对象实现了 iterator，扩展运算符才有效
const iterableObj = {
  0: 'a',
  1: 'b',
  length: 2,
  [Symbol.iterator]: Array.prototype[Symbol.iterator] // 借用数组的迭代器
};
console.log("\n--- Spread with Iterator ---");
console.log("[...iterableObj]:", [...iterableObj]); // ['a', 'b']
