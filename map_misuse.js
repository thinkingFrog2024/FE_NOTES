
const myMap = new Map();

console.log("--- 1. 正确用法 vs 错误用法 ---");
// 正确用法：使用 set 方法
myMap.set('correct', '我是通过 .set() 存进去的');

// 错误用法：像操作普通对象一样直接赋值
myMap['wrong'] = '我是通过 [] 赋值的';

console.log("Map 的 size:", myMap.size); 
// 结果应该是 1。因为 'wrong' 并没有被存进 Map 的数据结构里，它只是挂在 Map 实例上的一个普通属性。

console.log("Map.has('correct'):", myMap.has('correct')); // true
console.log("Map.has('wrong'):", myMap.has('wrong'));     // false (看，Map 根本不承认它的存在)

console.log("\n--- 2. 键的类型限制 ---");
const keyObj = { id: 1 };

// 正确用法：Map 可以用对象作为键
myMap.set(keyObj, '对象作为键的值');

// 错误用法：[] 会把键强制转为字符串
myMap[keyObj] = '被转成字符串了'; 
// 这里实际上是 myMap['[object Object]'] = ...

console.log("Map.get(keyObj):", myMap.get(keyObj)); // '对象作为键的值'
console.log("直接访问属性:", myMap['[object Object]']); // '被转成字符串了'

console.log("\n--- 3. 迭代 ---");
// 只有通过 .set() 存进去的才能被迭代
for (let [key, value] of myMap) {
    console.log(`迭代到的键: ${key}, 值: ${value}`);
}
// 'wrong' 那个属性根本不会出现在这里！
