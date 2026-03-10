
// 例子 1: 基本复制
// 数组: [1, 2, 3, 4, 5]
// target: 0 (要把东西贴到索引 0 的位置)
// start: 3 (从索引 3 开始复制，也就是值 4)
// end: 4 (复制到索引 4 结束，不包含 4，也就是只复制值 4)
// 结果: 把 4 复制到索引 0 的位置 -> [4, 2, 3, 4, 5]
const arr1 = [1, 2, 3, 4, 5];
console.log("Original arr1:", arr1);
arr1.copyWithin(0, 3, 4);
console.log("arr1.copyWithin(0, 3, 4):", arr1); 


// 例子 2: 复制一段
// 数组: [1, 2, 3, 4, 5]
// target: 0 (贴到开头)
// start: 3 (从索引 3 开始复制，即值 4, 5)
// end: 默认到结尾
// 结果: 把 [4, 5] 复制到索引 0, 1 的位置 -> [4, 5, 3, 4, 5]
const arr2 = [1, 2, 3, 4, 5];
console.log("\nOriginal arr2:", arr2);
arr2.copyWithin(0, 3);
console.log("arr2.copyWithin(0, 3):", arr2);


// 例子 3: 负数索引
// 数组: [1, 2, 3, 4, 5]
// target: -2 (倒数第2个位置，即索引 3)
// start: -3 (倒数第3个位置，即索引 2，值 3)
// end: -1 (倒数第1个位置，即索引 4，不包含)
// 结果: 把 3 复制到索引 3 的位置 -> [1, 2, 3, 3, 5]
const arr3 = [1, 2, 3, 4, 5];
console.log("\nOriginal arr3:", arr3);
arr3.copyWithin(-2, -3, -1);
console.log("arr3.copyWithin(-2, -3, -1):", arr3);
