
const inventory = [
  { name: "asparagus", type: "vegetables", quantity: 5 },
  { name: "bananas", type: "fruit", quantity: 0 },
  { name: "goat", type: "meat", quantity: 23 },
  { name: "cherries", type: "fruit", quantity: 5 },
  { name: "fish", type: "meat", quantity: 22 },
];

console.log("--- Object.groupBy (formerly Array.prototype.group) ---");
// Group by 'type'
const resultObj = Object.groupBy(inventory, ({ type }) => type);
console.log(JSON.stringify(resultObj, null, 2));
/*
Expected output:
{
  "vegetables": [{ name: "asparagus", type: "vegetables", quantity: 5 }],
  "fruit": [{ name: "bananas", ... }, { name: "cherries", ... }],
  "meat": [{ name: "goat", ... }, { name: "fish", ... }]
}
*/

console.log("\n--- Map.groupBy (formerly Array.prototype.groupToMap) ---");
// Group by quantity > 5 (boolean keys)
// Map keys can be anything, unlike Object keys which are strings/symbols
const resultMap = Map.groupBy(inventory, ({ quantity }) => quantity > 5);
console.log("Keys:", [...resultMap.keys()]);
console.log("Value for true (quantity > 5):", JSON.stringify(resultMap.get(true), null, 2));
console.log("Value for false (quantity <= 5):", JSON.stringify(resultMap.get(false), null, 2));
