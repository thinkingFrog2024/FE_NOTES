
console.log("--- 情况 1: 每个迭代器是独立的对象 (正常情况) ---");
let rangeNormal = {
  from: 1,
  to: 3,

  [Symbol.iterator]() {
    // 每次调用都返回一个新的对象！
    return {
      current: this.from,
      last: this.to,
      next() {
        if (this.current <= this.last) {
          return { done: false, value: this.current++ };
        } else {
          return { done: true };
        }
      }
    };
  }
};

let iter1 = rangeNormal[Symbol.iterator]();
let iter2 = rangeNormal[Symbol.iterator]();

console.log("iter1 next:", iter1.next().value); // 1
console.log("iter2 next:", iter2.next().value); // 1 (互不影响)
console.log("iter1 next:", iter1.next().value); // 2
console.log("iter2 next:", iter2.next().value); // 2


console.log("\n--- 情况 2: 对象本身就是迭代器 (问题情况) ---");
let rangeShared = {
  from: 1,
  to: 3,
  current: 1, // 状态保存在对象自己身上！

  [Symbol.iterator]() {
    // 每次调用都返回自己！
    this.current = this.from; // 重置一下
    return this;
  },

  next() {
    if (this.current <= this.to) {
      return { done: false, value: this.current++ };
    } else {
      return { done: true };
    }
  }
};

let sharedIter1 = rangeShared[Symbol.iterator]();
let sharedIter2 = rangeShared[Symbol.iterator](); // 这里调用会重置 current！

console.log("sharedIter1 === sharedIter2 ?", sharedIter1 === sharedIter2); // true

// 灾难开始了：
console.log("sharedIter1 next:", sharedIter1.next().value); // 1
console.log("sharedIter2 next:", sharedIter2.next().value); // 2 (iter2 抢走了 iter1 的下一个值！)
console.log("sharedIter1 next:", sharedIter1.next().value); // 3 (iter1 跳过了 2！)
