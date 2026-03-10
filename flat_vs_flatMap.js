
// 1. flat(depth) - 只是纯粹地“拍平”数组
const nestedArr = [1, [2, [3, 4]]];

console.log("--- flat() 演示 ---");
console.log("原数组:", JSON.stringify(nestedArr));
console.log("flat() 默认拉平一层:", JSON.stringify(nestedArr.flat())); // [1, 2, [3, 4]]
console.log("flat(2) 拉平两层:", JSON.stringify(nestedArr.flat(2))); // [1, 2, 3, 4]


// 2. flatMap(fn) - 先 map 再 flat(1)
// 场景：把一句话拆成单词，并且去掉空格
const sentences = ["Hello world", "  ", "Java Script"];

console.log("\n--- flatMap() 演示 ---");

// 如果只用 map：得到的是数组的数组
const mapped = sentences.map(s => s.split(" "));
console.log("map 结果:", JSON.stringify(mapped));
// [["Hello","world"],["",""],["Java","Script"]]

// 如果用 flatMap：一步到位，map 后自动拍平一层
const flatMapped = sentences.flatMap(s => s.split(" "));
console.log("flatMap 结果:", JSON.stringify(flatMapped));
// ["Hello","world","","","Java","Script"] (注意：flatMap 只能拉平一层)

// flatMap 的一个妙用：同时实现 map 和 filter
// 比如：只要正数，并且翻倍
const numbers = [1, -2, 3, -4];
const doubledPositive = numbers.flatMap(num => {
    if (num < 0) return []; // 返回空数组，会被 flat 拍平消失
    return [num * 2];       // 返回包含一个元素的数组，会被 flat 拍平取出来
});
console.log("flatMap 过滤并翻倍:", JSON.stringify(doubledPositive)); // [2, 6]
