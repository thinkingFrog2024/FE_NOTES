// 模拟一个异步操作：比如让你的身体兴奋起来需要一点时间
function delay(ms, value) {
    return new Promise(resolve => {
        setTimeout(() => {
            console.log(`[过程] 忍耐 ${ms}ms... 拿到了: ${value}`);
            resolve(value);
        }, ms);
    });
}

// ---------------------------------------------------------
// 1. 穿上衣服的样子：Async/Await
// 看起来很乖巧，很顺从，对吧？
// ---------------------------------------------------------
async function asyncVersion() {
    console.log('--- Async 函数开始 ---');
    // 就像你在等待指令...
    const a = await delay(100, '前戏');
    const b = await delay(200, '正题');
    // 这里的 return 就是最后的高潮
    return `${a} -> ${b}`;
}

// ---------------------------------------------------------
// 2. 脱光衣服的样子：Generator + Spawn
// 这才是它原本的样子。
// ---------------------------------------------------------
function* generatorVersion() {
    console.log('--- Generator 函数开始 ---');
    // yield 就是张开腿等待... 等待 spawn 把结果塞进来
    const a = yield delay(100, '前戏');
    const b = yield delay(200, '正题');
    // 这里的 return 通知 spawn 结束了
    return `${a} -> ${b}`;
}

// 自动执行器 (Spawn)：那个不知疲倦的挥鞭者
// 它负责把 yield 出去的 Promise 执行完，再把结果塞回给 Generator
function spawn(genF) {
    return new Promise(function(resolve, reject) {
        const gen = genF(); // 唤醒它
        
        function step(nextF) {
            let next;
            try {
                next = nextF(); // 动一下
            } catch(e) {
                return reject(e); // 玩坏了
            }
            if(next.done) {
                return resolve(next.value); // 结束了，给你结果
            }
            // 还没结束？那就等着。
            Promise.resolve(next.value).then(
                function(v) {
                    // 成功了，把结果 v 塞回去，继续动
                    step(function() { return gen.next(v); });
                },
                function(e) {
                    // 失败了，把错误 e 扔回去，看它怎么叫
                    step(function() { return gen.throw(e); });
                }
            );
        }
        // 开始第一次
        step(function() { return gen.next(undefined); });
    });
}

// ---------------------------------------------------------
// 执行对比
// ---------------------------------------------------------

(async () => {
    try {
        console.log('>>> 1. 观赏 Async 版本...');
        const res1 = await asyncVersion();
        console.log(`Async 最终结果: "${res1}"\n`);

        console.log('>>> 2. 强迫执行 Generator 版本...');
        // 手动把 generatorVersion 塞进 spawn 里
        const res2 = await spawn(generatorVersion);
        console.log(`Generator 最终结果: "${res2}"`);

        console.log('\n看到了吗？感觉完全一样。');
    } catch (err) {
        console.error('出错了:', err);
    }
})();
