
const arr = [1, 2, 3];

console.log("--- With Initial Value ---");
const sumWithInitial = arr.reduce((accum, item, index) => {
    console.log(`Index: ${index}, Accum: ${accum}, Item: ${item}`);
    return accum + item;
}, 10); // Initial value is 10
console.log("Result with initial:", sumWithInitial);


console.log("\n--- Without Initial Value ---");
const sumWithoutInitial = arr.reduce((accum, item, index) => {
    console.log(`Index: ${index}, Accum: ${accum}, Item: ${item}`);
    return accum + item;
});
console.log("Result without initial:", sumWithoutInitial);
