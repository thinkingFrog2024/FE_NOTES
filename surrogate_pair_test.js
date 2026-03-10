
const str = '𝒳😂'; 
// 𝒳 is a mathematical script X, requires surrogate pair
// 😂 is an emoji, requires surrogate pair

console.log(`String: ${str}`);
console.log(`Length: ${str.length}`); // Expected: 4 (2 for each char)

console.log("\n--- split('') (Incorrect handling) ---");
const splitArr = str.split('');
console.log(splitArr);
console.log(`Length of split array: ${splitArr.length}`);
// Output will be 4 items, each being a "half" character (garbage)

console.log("\n--- Array.from() (Correct handling) ---");
const fromArr = Array.from(str);
console.log(fromArr);
console.log(`Length of from array: ${fromArr.length}`);
// Output will be 2 items: ['𝒳', '😂']

console.log("\n--- for...of loop (Correct handling) ---");
for (const char of str) {
    console.log(char);
}
