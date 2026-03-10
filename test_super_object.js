
const animal = {
  eat() {
    return "Nom nom";
  }
};

// 1. 成功的例子：使用方法简写语法
const rabbitCorrect = {
  __proto__: animal,
  eat() {
    // 这里的 super 能正常工作
    return super.eat() + " ...Chomp! (Correct)";
  }
};

try {
    console.log("简写语法结果:", rabbitCorrect.eat());
} catch (e) {
    console.error("简写语法报错:", e.message);
}

// 2. 失败的例子：使用普通函数语法
const rabbitWrong = {
  __proto__: animal,
  eat: function() {
    // 这里的 super 会报错
    try {
        return super.eat() + " ...Chomp! (Wrong)";
    } catch (e) {
        throw e;
    }
  }
};

try {
    console.log("普通函数语法结果:", rabbitWrong.eat());
} catch (e) {
    console.error("普通函数语法报错:", e.message);
}
