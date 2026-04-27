# 目录

- [npm与包](#npm与包)
- [时序相关的异步api](#时序相关的异步api)
  - [settimeout](#settimeout)
    - [node中的setTimeout（）](#nodesettimeout)
    - [一个定时器？](#一个定时器)
    - [uv_timer_t](#uv_timer_t)
    - [node里面针对timer的定时器](#node里面针对timer的定时器)
    - [定时器回调](#定时器回调)
    - [processTimers()（dispatcher）](#processtimersdispatcher)
    - [Timeout](#timeout)
    - [timeout.ref()与timeout.unref()](#timeoref与timeounref)
    - [怎样解决之前提到的执行顺序问题](#怎样解决之前提到的执行顺序问题)
  - [setImmediate](#setimmediate)
    - [outstandingQueue?](#outstandingqueue)
    - [执行时机的真相](#执行时机的真相)
  - [微任务的理论执行时机](#微任务的理论执行时机)
  - [process.nextTick()](#processnexttick)
- [按字节存取：Buffer](#按字节存取buffer)
  - [Buffer的本质是什么？](#buffer的本质是什么)
  - [ArrayBuffer 与 FastBuffer](#arraybuffer-与-fastbuffer)
  - [池化的工作机制](#池化的工作机制)
  - [Buffer.alloc()是池化的吗](#bufferalloc是池化的吗)
  - [createUnsafeBuffer()](#createunsafebuffer)
  - [_fill()](#_fill)

---

> 本文是 [01_Node_Deep_Dive.md](./01_Node_Deep_Dive.md) 的续篇，主要涵盖 npm与包、时序相关的异步API、以及 Buffer 相关内容。

# npm与包

在npm发展史里面 npm2 和npm3是一个很大的分水岭 区别就在于npm3使用了 **扁平化**

1. 减少冗余的依赖体积
2. 解决目录层级太深 写起来不方便（当然有些情况是解决不了的）
3. 前段工程化 构建包体积剪枝




# 时序相关的异步api

还记得之前在事件循环相关章节中提到的 `libuv` 设计概览吗？

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6963e0029b2841bb8c71a2a1744dc5a5~tplv-k3u1fbpfcp-jj-mark:1210:0:0:0:q75.awebp)

## settimeout

setTimeout这个api似乎任何环境都可以使用 这样说来 这个api是由v8引擎提供的？

实际上 这个api并不是ECMAScript语言规范的一部分 而是浏览器里的一个api

#### node中的setTimeout（）

node里面的setTimeout返回的实际上是一个对象，详细一点来说，setTimeout实际上是生成一个Timeout类的实例，在这个实例的内部控制定时器并且触发回调，这个函数返回的也是这个实例。

```javascript
function setTimeout(callback, after, arg1, arg2, arg3) {
  // ...
  //这里的args是根据前面的arg1, arg2, arg3 具体代码就不提了
  const timeout = new Timeout(callback, after, args, false, true);
  insert(timeout, timeout._idleTimeout);

  return timeout;
}
```

此处的insert函数，会把新生成的Timeout实例插入两个对象里面：

1. 一个Map，键名是timeout（超时时间），键值是一条链表，在链表里存储了所有超时时间相同的Timeout实例。链表里额外存储一个最近的最终超时时间（这是一个时间戳）。
2. 一个优先队列，权重是最终超时时间（注意这里的到期时间，是一个绝对值 而非相对值。就比如在5毫秒时添加了一个在5毫秒之后到期的定时器，这个定时器的到期时间会被认为10毫秒 ）。（真实优先队列内部的数据结构并不是这样的。）

就比如我在0ms时添加了一个延迟时间为4ms的定时器A，在1ms时添加了一个延迟时间4ms的定时器B，在2ms时添加了一个延迟时间为3ms的定时器C，那么Map解构中应该有两个键，一个键名为4ms，键值包含两个Timeout实例（AB），最近超时时间为A在未来触发的那个时候的时间戳，另一个键名为3ms，同理最近超时时间为C在未来触发的那个时候的时间戳。而且由于A对应的时间戳小于C，所以键名为4ms的链表在优先队列的权重更高。

这两个对象看起来像这样：

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/215f05b6c49340b2b4b7301fa07af719~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp)

```javascript
// 定义一个插入定时器项的函数，参数包括定时器项 item，毫秒数 msecs，以及可选的开始时间 start，默认值为当前 libuv 的时间。
function insert(item, msecs, start = getLibuvNow()) {
  // 截断毫秒数，以确保不会假设有亚毫秒级定时器的准确性。
  msecs = MathTrunc(msecs); // MathTrunc 是一个假设的函数，用于向下取整数值。
  item._idleStart = start; // 记录定时器项的开始时间。

  // 如果已经有一个对应毫秒数的定时器列表，就使用它；如果没有，就需要创建一个新的列表。
  //这里也可以看出来键值是timeout 也就是延迟时间
  let list = timerListMap[msecs];
  if (list === undefined) {
    // 如果没有找到对应的列表，记录调试信息。
    debug('no %d list was found in insert, creating a new one', msecs);
    
    // 计算定时器的到期时间。
    //从这里也可以看出来 到期时间应该是一个时间戳
    const expiry = start + msecs;
    // 创建一个新的定时器列表，并将其与毫秒数关联起来。
    timerListMap[msecs] = list = new TimersList(expiry, msecs);
    // 将新的定时器列表插入到定时器列表队列中。
    timerListQueue.insert(list);

    // 如果下一个到期时间比新列表的到期时间还要晚，那么就需要重新安排定时器。
    if (nextExpiry > expiry) {
      scheduleTimer(msecs); // 安排定时器，以便在到期时执行。
      nextExpiry = expiry; // 更新下一个到期时间为新列表的到期时间。
    }
  }

  // 将定时器项追加到对应毫秒数的定时器列表中。
  L.append(list, item);
}
```

> 为什么在 `Map` 中，用链表就可以了，不用优先队列或其他一些有序列表?
>
> 首先我们要知道，一个链表里面只会存一个最近超时时间，而且链表里面的元素，也就是Timeout实例，里面是并没有记录这个实例的绝对超时时间的，那么还怎么保证在执行回调时候的顺序不错？因为时间是单向的，后面进来的实例一定是后面添加的，绝对超时时间必然比之前的晚。



![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c6ebf0f442854d7fbaccb76316f821f4~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp)

> 为什么这个替换只出现在"Map 中不存在该链表"的情况下做判断？
>
> 如果Map里面存在该链表，也就是存在相同最近超时时间的定时器，这时直接追加就好。如果不存在，就要创建一个新的，再看这个新的定时器会不会最近触发了

##### 一个定时器？

一次setTimeout，生成一个Timeout类，其实setInterval也是这样的，只是Timeout类里面有一个是否循环字段不一样。

所以在javascrpt层，的确是一次setTimeout多一个定时器，而且定时器被Map，优先队列管理。但是，这是js侧的类，**并不参与实际调度**，只是在真正的libuv的定时器调度的时候，被引用一下而已。在libuv层，**只有一个定时器**，而这个定时器 就是句柄**uv_timer_t**

**uv_timer_t**

在libuv里，定时器是通过定时器句柄的形式进行操作的。在事件循环里面激活一个定时器：

```javascript
int uv_timer_start(uv_timer_t *handle, uv_timer_cb cb, uint64_t timeout, uint64_t repeat)
```

通过这个api，可以激活一个已经初始化好的定时器。在事件循环的过程里面，他会在超时时间到了之后触发传入的cb回调函数。最后一个代表的就是是否循环。但是，并不会根据这个参数区别setTimeout setInterval

##### node里面针对timer的定时器

timer就在事件循环的定时器阶段

在node里面针对Timer的单个定时器被存放在Environment类里。Environment是一个环境相关类。

```c
class Environment : public ... {
  ...
  inline uv_timer_t* timer_handle() { return &timer_handle_; }
  uv_timer_t timer_handle_;
};
```

在上文提到的scheduleTimer()里面 最终的调用就是这样：

```c
void Environment::ScheduleTimer(int64_t duration_ms) {
  if (started_cleanup_) return;//边界条件
  uv_timer_start(timer_handle(), RunTimers, duration_ms, 0);
}//如果这个定时器还没有激活，就把定时器触发时间改成最新时间并且激活；如果处于激活状态，就把触发时间改成最新时间。规则就是：只需要一个定时器触发最近一次定时时间，触发之后再取一个最近的定时事件开始计时
```

##### 定时器回调

在timer_handle_这个定时器里面，一旦定时器触发，执行的是传进去的RunTimers()回调函数。这个函数用于经历一系列逻辑之后调用到js侧的定时回调函数，在那个函数里才会去找对应的Timeout类并且触发对应的真实回调函数。

在Runtimers（）里面，参数是触发当前定时器的uv_timer_t句柄（可能会产生疑问，触发当前定时器的句柄？这个句柄不是只有一个？事实上这是一个和上下文有关的问题，这个句柄确实是只有一个的，但是在不同的时间 这个句柄在处理不同的定时器）

```c++
// 这是 libuv 定时器的回调函数，当定时器到期时被调用。
void Environment::RunTimers(uv_timer_t* handle（这是个指针，指向了全局句柄）) {
  // 从定时器句柄中获取当前环境对象的指针。
  Environment* env = Environment::from_timer_handle(handle);

  // ... 可能还有其他代码 ...

  // 获取当前进程对象的本地引用，这通常是一个全局对象，包含了 Node.js 进程的信息。
  Local<Object> process = env->process_object();

  // ... 可能还有其他代码 ...

  // 获取定时器回调函数的本地引用，这个函数将被调用来处理到期的定时器。
  Local<Function> cb = env->timers_callback_function();

  // ... 可能还有其他代码 ...

  // 获取当前时间的值，这通常是自纪元以来的毫秒数。
  Local<Value> arg = env->GetNow();

  // 循环调用定时器回调函数，直到没有更多的定时器需要处理。
  do {
    // 创建一个 TryCatch 作用域，用于捕获和处理 JavaScript 代码执行中的错误。
    TryCatchScope try_catch(env);
    try_catch.SetVerbose(true); // 设置为详细模式，以便捕获更多的错误信息。

    // 调用定时器回调函数，传递当前进程对象和当前时间作为参数。
    MaybeLocal<Value> ret = cb->Call(env->context(), process, 1, &arg);

    // ... 可能还有其他代码 ...

  } while (ret.IsEmpty() && ...); // 如果回调返回空值，继续循环。

  // ... 可能还有其他代码 ...

  // 获取回调函数返回的下一次超时时间（以毫秒为单位）。
  int64_t expiry_ms =
      ret.ToLocalChecked()->IntegerValue(env->context()).FromJust();

  // 获取 libuv 定时器句柄。
  uv_handle_t* h = reinterpret_cast<uv_handle_t*>(handle);

  // 如果返回的超时时间不为 0，即还有定时器需要处理。
  if (expiry_ms != 0) {
    // 计算下一次定时器应该触发的时间间隔。
    int64_t duration_ms =
        llabs(expiry_ms) - (uv_now(env->event_loop()) - env->timer_base());

    // 调用 Environment 类的 ScheduleTimer 方法来重新安排定时器。
    env->ScheduleTimer(duration_ms > 0 ? duration_ms : 1);

    // 根据定时器是否是重复的，增加或减少 libuv 定时器的引用计数。
    if (expiry_ms > 0)
      uv_ref(h);
    else
      uv_unref(h);
  } else {
    // 如果没有更多的定时器需要处理，减少 libuv 定时器的引用计数。
    uv_unref(h);
  }
}
```

这里面的核心逻辑大概就是：

```c++
void Environment::RunTimers(uv_timer_t* handle) {
    //主要就是获取 process 对象
    Local<Object> process = env->process_object();
    //拿到一个 cb 函数，并去执行该回调函数，传入的参数为当前时间，并且 this 对象为 process  cb 的返回值是由回调函数计算出来的下一次定时器触发时间。
    //这个 timers_callback_function() 是在 Node.js 启动的时候注册进去的。注册了两个个函数，分别是 processImmediate() 和 processTimers()
  Local<Function> cb = env->timers_callback_function();
  do {
    ret = cb->Call(env->context(), process, 1, &arg);
  } while (ret.IsEmpty() && ...);

  ...

  int64_t expiry_ms =
      ret.ToLocalChecked()->IntegerValue(env->context()).FromJust();
  //若非 0，则通过一定逻辑计算出真正下一次触发所需的时刻，并通过调用之前解释过的 env->ScheduleTimer() 函数重启定时器。


  if (expiry_ms != 0) {
    int64_t duration_ms =
        llabs(expiry_ms) - (uv_now(env->event_loop()) - env->timer_base());

    env->ScheduleTimer(duration_ms > 0 ? duration_ms : 1);

    if (expiry_ms > 0)
      uv_ref(h);
    else
      uv_unref(h);
  } 
  //若触发时间为 0，则说明之后没有 Timeout 定时器了，就不需要重新调度；
  else {
    uv_unref(h);
  }
}
```

###### processTimers()（dispatcher）

````c++
// processTimers 函数负责处理所有到期的定时器。
// 参数 now 是当前的时间戳。
function processTimers(now) {
  // 初始化 nextExpiry 为 Infinity，表示没有到期的定时器。
  nextExpiry = Infinity;

  // 定义一个变量 list 用于存储从优先队列中取出的链表。
  let list;
  // 定义一个标志变量 ranAtLeastOneList，用于记录是否已经运行过至少一个链表的定时器。
  let ranAtLeastOneList = false;

  // 循环遍历优先队列中的链表，直到没有更多的链表。
  while ((list = timerListQueue.peek()) != null) {
    // 如果链表的到期时间大于当前时间，说明这个链表的定时器还没有到期。
    if (list.expiry > now) {
      // 更新 nextExpiry 为这个链表的到期时间，并退出循环。
      nextExpiry = list.expiry;
      // 返回 nextExpiry 的值，如果 timeoutInfo[0] 大于 0，说明是重复定时器，返回正值；
      // 否则，返回负值，表示一次性定时器。
      return timeoutInfo[0] > 0 ? nextExpiry : -nextExpiry;
    }
    // 如果已经运行过至少一个链表的定时器，运行下一个 tick。
    if (ranAtLeastOneList)
      runNextTicks();
      //这块是为了node能够及时处理process.nexttick里面的函数	
      //在执行Timeout之前 看一下之前是不是已经执行过一次Timeout 如果执行过了 那么在nodejs的语义里面已经过了一个tick了 这个Timeout其实应该在下一个tick里面执行 所以这是模拟下一个tick 
    // 否则，标记 ranAtLeastOneList 为 true，并开始运行链表的定时器。
    else
      ranAtLeastOneList = true;
    // 调用 listOnTimeout 函数来处理链表上所有到期的定时器。
    listOnTimeout(list, now);
  }
  // 如果所有链表都处理完毕，返回 0，表示没有更多的定时器需要处理。
  return 0;
}
````



大概思路：从优先队列里面获得首元素（优先队列肯定是xiangu）

逻辑很简单，不断从 `timerListQueue` 这个优先队列中获取队首元素，也就是过期时间最近的那条链表。由于逻辑特性，链表头肯定是时间最近的元素。

判断一下，链表的过期时间是否大于当前时间。如果大于当前时间，则说明这个 `Timeout` 还未轮到执行，于是我将 `nextExpiry` 用该链表的过期时间替换。我们之前提到，该回调函数返回值是下一次过期时间。注意这里的返回先判断了一个 `timeoutInfo[0]` 的值大小，并以此返回正负的值。总之，如果 `Timer` 还不需要执行，则返回 `nextExpiry` 以让 `RunTimers()` 开启下一轮的 libuv 的定时器。



如果链表过期时间小于等于当前时间，则说明在当前状态下，该 `Timeout` 是需要被触发的。由于时间的不精确性，如时间循环卡了一下，导致一下子过了好几毫秒，而在这之前有好几条链表都会过期，那么我们就需要在一次 `processTimers` 里面持续执行 `Timeout` 直到获取的 `Timeout` 未过期。所以这里一整套逻辑都是被一个 `while` 所包围。

若不该，则说明该链表能处理的 `Timeout` 都处理完了。接下去扫尾，更新这条链表的最早过期时间，也就是当前 `Timeout` 的过期时间，更新完之后，再重排一下优先队列。

若是当前 `Timeout` 的确已经可以被触发的话，仍旧先走一遍 `runNextTicks()` 的逻辑，然后从链表中将当前 `Timeout` 移除。做了一系列额外逻辑后（如操作 `Timeout` 的 Reference 值等），就是通过 `try-catch` 去执行 `Timeout` 实例的 `_onTimeout()` 方法了。这里的 `_onTimeout()` 暂时不研究，它就是某个 `Timeout` 触发后真正要执行的函数，并且它内部会调用 `setTimeout()` 时传进去的回调。

到下一个 Tick 之后，就可以触发 JavaScript 侧的 `Timeout` 了。代码有点长，就不放出来了，有兴趣可以自己[读代码](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fnodejs%2Fnode%2Fblob%2Fv18.14.0%2Flib%2Finternal%2Ftimers.js%23L517)，也可以听我瞎逼逼。

触发的逻辑是在 `listOnTimeout()` 中。它所做的事情是从刚才拿出来的链表中不断获取第一个 `Timeout`。我们之前说过了，由于时间一往无前的特性，第一个 `Timeout` 肯定是该链表中最早触发的 `Timeout`，然后依次往后排。每次获取首个 `Timeout` 都先判断确认一下，该 `Timeout` 是否应该在当前时间点触发。

执行完 `Timeout` 后，先判断该 `Timeout` 是否需要重复执行（即 `setInterval()`）。若需要重复执行，则将该 `Timeout` 实例以新的一些参数重新调用 `insert()` 回到链表中。因为该链表已存在，所以不需要生成新的，又因为当前 `Timeout` 处理完之后，该条链表最后的时间不会超过 `100ms`（即当前链表对应的 `timeout`），所以新插入的 `Timeout` 在链表尾不会影响现有的时序。



> 当然 当前timer结束之后，再向链表里添加timer，这个timer必然是最后一个，最晚执行的



这样的处理或许直接把所有timer处理成一个优先队列更有效率 不过 在一些时候也会出现执行顺序问题

```javascript
'use strict';

setTimeout(() => {
  console.log(1);
}, 10);
setTimeout(() => {
  console.log(2);
}, 15);
let now = Date.now();
while (Date.now() - now < 100) {
  //
}
setTimeout(() => {
  console.log(3);
}, 10);
now = Date.now();
while (Date.now() - now < 100) {
  //
}
```

正常分析打印顺序应该是123 可是如果时间循环卡顿一下 将会变成1 3 2

**listOnTimeout**

```javascript
// 定义一个函数，用于处理链表中到期的定时器
function listOnTimeout(list, now) {
  // 获取链表对应的超时时间（毫秒）
  const msecs = list.msecs;

  // 初始化一个标志，用于记录是否至少有一个定时器被执行
  let ranAtLeastOneTimer = false;
  let timer;

  // 遍历链表中的所有定时器 
  while ((timer = L.peek(list)) != null) {
    // 计算当前时间与定时器开始时间的差值
    const diff = now - timer._idleStart;

    // 检查当前循环迭代是否过早，即下一个定时器是否还未到期
    if (diff < msecs) {
      // 如果是，则更新链表的到期时间，并重新调整链表在优先队列中的位置
      list.expiry = MathMax(timer._idleStart + msecs, now + 1);
      list.id = timerListId++;
      timerListQueue.percolateDown(1);
      debug('%d list wait because diff is %d', msecs, diff);
      return; // 退出函数，等待下一个事件循环迭代
    }

    // 如果已经执行了至少一个定时器，则运行下一个 tick 队列中的回调
    if (ranAtLeastOneTimer)
      runNextTicks();
    else
      ranAtLeastOneTimer = true;

    // 执行定时器到期时的实际逻辑
    L.remove(timer); // 从链表中移除定时器

    // ... 这里可能还有其他代码 ...

    // 如果定时器设置了重复执行
    let start;
    if (timer._repeat)
      start = getLibuvNow(); // 获取当前时间作为下一次超时的开始时间

    try {
      // 获取定时器的回调参数
      const args = timer._timerArgs;
      // 调用定时器的回调函数
      if (args === undefined)
        timer._onTimeout();
      else
        ReflectApply(timer._onTimeout, timer, args);
    } finally {
      // 如果定时器设置了重复执行，并且没有被取消
      if (timer._repeat && timer._idleTimeout !== -1) {
        timer._idleTimeout = timer._repeat; // 设置下一次超时时间
        insert(timer, timer._idleTimeout, start); // 重新插入定时器到管理结构中
      } else if (...) {
        // ... 这里可能还有其他代码 ...
      }
    }
  }
}
```

为什么是`list.expiry = MathMax(timer._idleStart + msecs, now + 1);` 这里为什么还需要比较？ 其实以前的node是没有这个比较过程的（不懂）



将 `processTimers()` 和 `listOnTimeout` 联立起来，去掉一些边角料逻辑，它的流程如下所示：

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5ddf478d4d764a72ba6f7788dd827528~tplv-k3u1fbpfcp-jj-mark:1890:0:0:0:q75.awebp)

**Timeout**

这到底是个什么东西？

其实是一个类 存储了一些元数据

```javascript
class Timeout {
  constructor(callback, after, args, isRepeat, isRefed) {
      //判断时间合法性 不合法修改成1
    after *= 1; // Coalesce to number or NaN
    if (!(after >= 1 && after <= TIMEOUT_MAX)) {
      if (after > TIMEOUT_MAX) {
        process.emitWarning(`${after} does not fit into` +
                            ' a 32-bit signed integer.' +
                            '\nTimeout duration was set to 1.',
                            'TimeoutOverflowWarning');
      }
      after = 1; // Schedule on next tick, follows browser behavior
    }

    this._idleTimeout = after;
    this._idlePrev = this;
    this._idleNext = this;
    this._idleStart = null;
    // This must be set to null first to avoid function tracking
    // on the hidden class, revisit in V8 versions after 6.2
    this._onTimeout = null;
      
    //也就是上文里面的最终执行的回调函数
    this._onTimeout = callback;
    this._timerArgs = args;
    //区别setTimeout 和setInterval
    this._repeat = isRepeat ? after : null;
    this._destroyed = false;

    if (isRefed)
      incRefCount();
    this[kRefed] = isRefed;

    ...
  }
}
```

**timeout.ref()与timeout.unref()**

如果现在有回调函数等待执行的定时器，而且事件循环里没有其他事情处理，node的执行生命周期会被这个定时器支撑。

举个例子：

```javascript
console.log('start');
const timer = setTimeout(() => {
  console.log('done');
}, 100);
```

咋这一百毫秒里面，生命周期由于定时器的存在，不会结束，如果

````javascript
console.log('start');
const timer = setTimeout(() => {
  timer.unref()
  console.log('done');
}, 100);
````

定时器将不会支持生命周期。

关于前面提到的timeoutInfo[0]，可以简单粗暴的把他认为是一个number，（并且这个数组里面其实也就只有这一个元素）。这个值会记录所有Timeout实例引用的次数。如果这个值变成0了，那么js侧就没有被引用的定时器了，那么Environment里面唯一的那个定时器也可以被unref了；

在 `Timeout` 的构造函数中，最后一个参数是 `isRefed`。`setTimeout()` 与 `setInterval()` 中传的都是 `true`。然后就会增加引用次数

```javascript
function incRefCount() {
  if (timeoutInfo[0]++ === 0)
    toggleTimerRef(true);
}
```

这里将会把引用次数加一，如果加一之前等于0，也就是之前没有被引用的定时器，那就需要巴c++侧的定时器ref了 下面那段代码就是在做这个

同理：

```javascript
function decRefCount() {
  if (--timeoutInfo[0] === 0)
    toggleTimerRef(false);
}
```



在之前说到的 nextExpire的正负问题 c++侧用的是这个值的绝对值，这个正负相当于一个标志，判断是ref还是unref。

说详细一点，当我们把链表跑完了，剩下没过期的定时器，这些跑完了的定时器会从引用次数里面把自己移除，这个时候就要检查引用次数，看还有没有被引用的定时器。存在就返回一个正的最近到期时间，否则返回一个负值。

```c++
// 如果回调函数返回的超时时间不为 0，即还有定时器需要处理。
if (expiry_ms != 0) {
    // 计算下一次定时器应该触发的时间间隔。
    // 这里使用 llabs 函数确保计算出的 duration_ms 为正值。
    int64_t duration_ms = llabs(expiry_ms) - (uv_now(env->event_loop()) - env->timer_base());

    // 调用 Environment 类的 ScheduleTimer 方法来重新安排定时器。
    // 如果计算出的 duration_ms 大于 0，则使用该值作为下一次触发的间隔，
    // 如果小于等于 0，则至少设置为 1 毫秒，以确保定时器不会被无限期推迟。
    //这里设置1毫秒的原因是 如果这里设置成0 或者负数 那么定时器是被规定在过去触发 那么会无限期延迟 并保证定时器不会被事件循环忽略 
    env->ScheduleTimer(duration_ms > 0 ? duration_ms : 1);

    // 根据定时器是否是重复的，增加或减少 libuv 定时器的引用计数。
    if (expiry_ms > 0) {
        // 如果返回的超时时间是正数，表示定时器是重复的，
        // 调用 uv_ref 增加 libuv 定时器的引用计数，确保定时器保持活动状态。
        uv_ref(h);
    } else {
        // 如果返回的超时时间是负数或零，表示定时器是一次性的，
        // 调用 uv_unref 减少 libuv 定时器的引用计数，可能使定时器停止。
        uv_unref(h);
    }
} else {
    // 如果回调函数返回的超时时间是 0，表示没有更多的定时器需要处理，
    // 调用 uv_unref 减少 libuv 定时器的引用计数。
    uv_unref(h);
}
```

**怎样解决之前提到的执行顺序问题**

```javascript
'use strict';

setTimeout(() => {
  console.log(1);
}, 10);
setTimeout(() => {
  console.log(2);
}, 15);
let now = Date.now();
while (Date.now() - now < 100) {
  //
}
setTimeout(() => {
  console.log(3);
}, 10);
now = Date.now();
while (Date.now() - now < 100) {
  //
}
```

这段代码的执行顺序 将会变成132

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5f3cf575f9b54e1fbca1ba6355746c03~tplv-k3u1fbpfcp-jj-mark:1890:0:0:0:q75.awebp)

在这个图上 也可以看出执行顺序问题 合理的执行问题应该如下图所示：

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/89040989b3cc4e16a1b155deb847c426~tplv-k3u1fbpfcp-jj-mark:1890:0:0:0:q75.awebp)

前者是在一条链表上一直找 后面是在好几条链表上反复横跳 修改起来其实很简单 不过会造成性能下降

1. 在每次 `listOnTimeout()` 最开始，都先获取第二超时的链表；
2. 在 `listOnTimeout()` 循环中，每次 `Timeout` 除了判断是否没过期，再额外判断一下与第二超时链表谁会先到期，若是第二链表先到期，则重排优先队列后退出 `listOnTimeout()`。

这个第二超时的链表也很好获取，由于优先队列的本质是一个小根堆，那么最先禅师的必然是head 第二超时的只可能在Head的两个子节点里面产生。

在node的[优先队列源码](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fnodejs%2Fnode%2Fblob%2Fv18.14.1%2Flib%2Finternal%2Fpriority_queue.js)里面 可以看到内部使用一个数组模拟堆结构。

```javascript
class PriorityQueue {
  #compare = (a, b) => a - b;
  #heap = new Array(64);
  ...
}
```

优先队列通常使用堆的1下标作为第一个元素 可以为这个优先队列补充一个方法比较23位元素的大小。

```javascript
  secondary() {
    // As the priority queue is a binary heap, the secondary element is
    // always the second or third element in the heap.
    switch (this.#size) {
      case 0:
      case 1:
        return undefined;

      case 2:
        return this.#heap[2] === undefined ? this.#heap[3] : this.#heap[2];

      default:
        return this.#compare(this.#heap[2], this.#heap[3]) < 0 ?
          this.#heap[2] :
          this.#heap[3];
    }
  }

```

修改源码：

```javascript
...
const secondaryList = timerListQueue.secondary();
while ((timer = L.peek(list)) != null) {
  ...
  if (diff < msecs || secondaryList?.expiry < timer._idleStart + msecs) {
    ...原逻辑
  }
  ...
}
```

## setImmediate

其实和之前的setTimeout setInterval差不多 只不过不需要insert了 实例变成Immediate

```javascript
function setImmediate(callback, arg1, arg2, arg3) {
  validateFunction(callback, 'callback');

  let i, args;
  switch (arguments.length) {
    case 1:
      break;
    case 2:
      args = [arg1];
      break;
    case 3:
      args = [arg1, arg2];
      break;
    default:
      args = [arg1, arg2, arg3];
      for (i = 4; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
      break;
  }

  return new Immediate(callback, args);
}
```

`Immediate`这个实例和`Timeout`大差不差 但是 在构造函数内部 他会把自己推入一个`Immediate`链表中。

```javascript
const immediateQueue = new ImmediateList();

...

class Immediate {
  constructor(...) {
    ...
    immediateQueue.append(this);
  }
}
```

这个链表只有追加 移除操作。

之前讲到的processImmediate（）这个函数就是用来处理setImmediate的回调函数的。作用很简单，遍历这条链表，挨个挨个执行回调函数。这里他做了一个防重入措施，在遍历之前，把这条链表复制给另一条 然后清空。

```javascript
function set() {
  console.log('hello');
  setImmediate(set);
}
set();
```

在这段代码里面 执行一个立即执行之后 会马上添加一个 那就会一直遍历这条链表 出不去了。

```javascript
// 创建一个新的 ImmediateList 对象，用于管理立即执行的任务列表
const outstandingQueue = new ImmediateList();

// ...

// 定义一个函数，用于处理所有待处理的立即执行任务
function processImmediate() {
  // 选择要处理的队列。如果 outstandingQueue 有任务，则优先处理 outstandingQueue，
  // 否则处理 immediateQueue。outstandingQueue 通常用于事件循环的下一个迭代，
  // 而 immediateQueue 用于当前迭代。
  const queue = outstandingQueue.head !== null ?
    outstandingQueue : immediateQueue;
  let immediate = queue.head;

  // 如果处理的队列不是 outstandingQueue（即处理 immediateQueue），则重置队列，
  // 并设置 immediateInfo[kHasOutstanding] 为 1，表示有待处理的 outstanding 任务。
  if (queue !== outstandingQueue) {
    queue.head = queue.tail = null; // 重置队列的头和尾指针
    immediateInfo[kHasOutstanding] = 1; // 标记有 outstanding 任务
  }
  
  // ... 遍历队列中的每个任务并执行
  // 这部分代码会遍历 queue 中的每个 immediate 任务，并执行它们的回调函数。
  // 通常，这些任务是由 process.nextTick() 安排的。
}
```

**outstandingQueue?**

当执行setImmedaite的回调函数时，也就是`Immediate.prototype._onImmediate()`，node使用的是try...finaly 并没有捕获错误，那么一旦回调函数里面抛出了错误，就会冒泡触发`uncaughtException` (node中用来捕获未被捕获的错误的)。然后这个遍历操作就会被打断。（当一个回调函数抛出错误，如果这个错误没有被捕获，他就会终端当前的执行流程，即使错误事件被处理，事件循环继续，已经抛出错误的回调也不会继续执行）

而这个队列就起到了保留现场的作用。每次遍历执行一次 `Immediate.prototype._onImmediate()` 后的 `finally` 中，都记录一下 `outstandingQueue` 的首元素为当前执行完的 `Immediate` 的下一个元素。

所以在执行逻辑里面，会先判断这个队列里面有没有东西，如果这个队列里面有东西 就代表了有抛错，并且这里记录了抛错的位置，那么会从这个位置开始执行。

祭出 libuv 的事件循环内部顺序图：

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1051c1a7f472405382f36ae2afae98eb~tplv-k3u1fbpfcp-jj-mark:1890:0:0:0:q75.awebp)

一次事件循环的逻辑顺序依次为：定时器事件、Pending 态 I/O 事件、空转事件、准备事件、Poll I/O 事件、复查事件及扫尾。

空转事件是在定时器事件后执行的。但这并不重要，`Immediate` 并不在该阶段执行。空转事件只是为了让 Poll for I/O 阶段不阻塞而已。它的事件回调是一个空的 Lambda 函数。当有至少一个 `Immediate` 被 `ref` 了，Node.js 就会激活这个空转句柄，让 I/O 不阻塞等待定时器事件；如果没有被 `ref` 了，则停止该句柄。

回调函数执行时机是在 Poll for I/O 阶段之后。实际上，Node.js 用[复查事件阶段](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fnodejs%2Fnode%2Fblob%2Fv18.14.1%2Fsrc%2Fenv.cc%23LL864C15-L864C71)来执行 `Immediate`——的确是在 Poll for I/O 阶段之后：

```c++
uv_check_start(immediate_check_handle(), CheckImmediate);
...
void Environment::CheckImmediate(uv_check_t* handle) {
  ...
  do {
    MakeCallback(env->isolate(),
                 env->process_object(),
                 env->immediate_callback_function(),
                 0,
                 nullptr,
                 {0, 0}).ToLocalChecked();
  } while (env->immediate_info()->has_outstanding() && env->can_call_into_js());
  ...
}
```

这个 `CheckImmediate()` 回调就是执行的关键了，其作用类似于 `setTimeout()` 中的 `RunTimers()`。它会不断去执行之前注册好的回调函数 `processImmediate()`，直到现场（`outstandingQueue`）空了。

1. **`env->immediate_info()`**：这是一个调用，返回一个指向 `ImmediateInfo` 对象的指针，该对象包含了关于立即回调的信息。
2. **`has_outstanding()`**：这是 `ImmediateInfo` 类的一个成员函数，用来检查是否还有未执行的立即回调。如果返回 `true`，则表示还有立即回调需要执行；如果返回 `false`，则表示所有立即回调都已处理完毕。
3. **`env->can_call_into_js()`**：这是 `Environment` 类的一个成员函数，用来检查当前环境是否处于可以安全调用 JavaScript 代码的状态。这可能涉及到检查当前线程是否在 Node.js 的事件循环中，以及是否有任何限制或条件阻止执行 JavaScript 代码。

将这两个条件用逻辑与运算符 `&&` 连接起来，意味着只有当两个条件都满足时，代码才会继续执行：

- **有未处理的立即回调**：`has_outstanding()` 返回 `true`，表示还有立即回调需要执行。
- **可以调用 JavaScript**：`can_call_into_js()` 返回 `true`，表示当前环境允许执行 JavaScript 代码

**执行时机的真相**

```java
setImmediate(() => {
  console.log('setImmediate');
});

setTimeout(() => {
  console.log('setTimeout');
}, 0);
```

结果是随机的，有时先 `setImmediate`，而有时则先执行 `setTimeout`。说好的定时器事件先执行呢？

libuv的设计的确是定时器阶段 在复查阶段之前 但是这个仅仅限于在一个Tick以内。setImmediate原理是不精确的，完全不能确定到底会在哪个Tick里面执行。

在第一个Tick里，由于这个Timeout的延迟时间是0 在Timeout的构造函数里面 会被设置成1，这时要是第一个Tick还没有超时，就到了复查阶段，immediate就先执行了，要是卡了一下 说不定就会先执行setTimeout了。

```javascript
setTimeout(() => {
  setImmediate(() => {
    console.log('setImmediate');
  });

  setTimeout(() => {
    console.log('setTimeout');
  }, 0);
}, 0);
```

这就铁定先执行 `setImmediate` 再执行 `setTimeout` 了，因为跑完外层 `Timeout` 后，直接就到后续阶段了，一路过去肯定是先执行复查阶段，然后再是下个 Tick 才能执行后续的 `Timeout`.

```javascript
setImmediate(() => {
  setImmediate(() => {
    console.log('setImmediate');
  });

  setTimeout(() => {
    console.log('setTimeout');
  }, 0);
}, 0);
```



```javascript
setImmediate(() => {
  setImmediate(() => {
    console.log('setImmediate');
  });

  setTimeout(() => {
    console.log('setTimeout');
  }, 0);
}, 0);
```

这样还是随机的

```javascript
// temp.js
setImmediate(() => {
  console.log('setImmediate');
});
require('fs').readFile('temp.js', () => {
  console.log('readFile');
});
```

首先，在这个 Tick 中的执行顺序肯定是先 Poll for I/O 然后再复查。但问题在于，Poll for I/O 阶段，它等待文件系统事件的时间为 `0`，`0` 时间内等不到事件，那么会继续执行后续逻辑。而对一个这种可读事件来说，通常不会在 `0` 的时间内完成触发，所以第一个 Tick 基本上都是直接在 Poll for I/O 阶段假模假式等你 `0` 毫秒，然后就直奔复查阶段去了。第一个 Tick 没读出来，那 `fs` 自然是在后续 Tick 中读出来了。所以如果没有一些特殊情况，上面的代码 `setImmediate` 总会先于 `readFile` 被输出。

```javascript
function imm() {
  setImmediate(() => {
    console.log('setImmediate');
    imm();
  });
}
imm();

require('fs').readFile('temp.js', () => {
  console.log('readFile');
  process.exit(0);
});
```

执行几次，会发现，输出了几行 `setImmediate` 后，终于读取成功了，然后输出 `readFile` 并退出了。这又是什么科学道理呢？虽然我们执行等待的时候等待时间为 `0`，但是整段 JavaScript 在每个 Tick 执行时间还是有纳秒、微妙、毫秒级别的耗时，所以到下几个 Tick 的时候，事件已经到了，不用等就能直接拿到。这个时候哪怕等待 `0` 也能直接拿到事件，于是终于等到了 `readFile()` 的回调函数出场了。



## 微任务的理论执行时机

等我之后看一下微任务呢


## process.nextTick()

```javascript
// 创建一个新的 FixedQueue 实例，用于存储 nextTick 回调。
const queue = new FixedQueue();

// ...

// 定义 nextTick 函数，它接受一个或多个参数。
function nextTick(callback) {
  // 验证 callback 是否是一个函数。
  validateFunction(callback, 'callback');

  // 如果 process._exiting 标志被设置，说明 Node.js 正在退出，
  // 则不再安排新的 nextTick 回调。
  if (process._exiting)
    return;

  // 定义一个变量 args，用于存储传递给 callback 的参数。
  let args;
  // 根据传入的参数数量，分配 args 数组，并复制参数到数组中。
  switch (arguments.length) {
    case 1: 
      // 如果只有一个 callback 参数，args 不需要初始化。
      break;
    case 2: 
      // 如果有两个参数，初始化 args 数组并设置第一个参数。
      args = [arguments[1]]; 
      break;
    case 3: 
      // 如果有三个参数，初始化 args 数组并设置前两个参数。
      args = [arguments[1], arguments[2]]; 
      break;
    case 4: 
      // 如果有四个参数，初始化 args 数组并设置前三个参数。
      args = [arguments[1], arguments[2], arguments[3]]; 
      break;
    default:
      // 如果有更多的参数，创建一个足够大的数组来存储所有参数。
      args = new Array(arguments.length - 1);
      // 复制所有参数到 args 数组，从第二个参数开始复制。
      for (let i = 1; i < arguments.length; i++)
        args[i - 1] = arguments[i];
  }

  // 如果队列是空的，设置 hasTickScheduled 标志为 true，表示有 nextTick 回调被安排。
  if (queue.isEmpty())
    setHasTickScheduled(true);

  // 创建一个对象 tickObject，用于存储 callback 和它的参数。
  const tickObject = {
    // ... 其他属性 ...
    callback,  // 存储回调函数。
    args      // 存储回调函数的参数。
  };

  // ... 可能还有其他代码 ...

  // 将 tickObject 推入队列中，等待在下一个事件循环迭代中执行。
  queue.push(tickObject);
}
```

# 按字节存取：Buffer

Buffer操作的是一块内存块里面的内容，如果需要按字节解析某块数据，`Buffer` 就很必须了。

**Buffer的本质是什么？**



在很多个大版本之前 node的Buffer内存完全由自己管理，通过malloc分配内存

```c++
data = static_cast<char*>(malloc(length));
```

并且把这块内存绑定给指定的v8对象做关联。

```c++
// 函数Alloc用于分配外部数组类型的内存，并将其与JavaScript对象关联
void Alloc(Environment* env,
           Handle<Object> obj,  // JavaScript对象的句柄
           char* data,  // 指向分配的内存的指针
           size_t length,  // 分配的内存长度（字节）
           enum ExternalArrayType type) {  // 外部数组的类型
  // 断言：确保对象没有已经存在的外部数组数据
  assert(!obj->HasIndexedPropertiesInExternalArrayData());
  
  // 调整V8引擎中外部分配的内存量
  env->isolate()->AdjustAmountOfExternalAllocatedMemory(length);
  
  // 根据外部数组的类型计算对象的索引属性数量
  size_t size = length / ExternalArraySize(type);
  
  // 将对象的索引属性设置为指向外部分配的数组数据
  obj->SetIndexedPropertiesToExternalArrayData(data, type, size);
  
  // 创建一个回调信息对象，用于在对象被垃圾回收时释放内存
  CallbackInfo::New(env->isolate(), obj, CallbackInfo::Free);
}
```



所以在很早的时候，Buffer的本质是一个Buffer对象以及一块和这个对象绑定的内存的组合。





在4.0之后，Buffer就变成基于 ECMAScript 中的 `ArrayBuffer` 来完成内存块的各种活动。内存就不是通过裸的 `malloc` 由 Node.js 直接管理了。



```javascript
// 定义 Buffer 构造函数，可以接受不同类型的参数来创建缓冲区。
function Buffer(arg, encodingOrOffset, length) {
  // 显示弃用警告，如果这个构造函数的使用方式已经被标记为弃用。
  showFlaggedDeprecation();

  // 常见情况：如果传入的 arg 参数是数字，表示要创建一个指定大小的缓冲区。
  if (typeof arg === 'number') {
    // 如果 encodingOrOffset 参数是字符串，这通常意味着使用错误的构造函数签名。
    // 因为当 arg 是数字时，encodingOrOffset 应该是编码类型，而不是字符串。
    if (typeof encodingOrOffset === 'string') {
      throw new ERR_INVALID_ARG_TYPE('string', 'string', arg);
    }
      
      
    // 使用 Buffer.alloc 方法创建一个新的缓冲区，大小为 arg 指定的数字。
    return Buffer.alloc(arg);
  }

  // 对于其他情况，使用 Buffer.from 方法来创建缓冲区。
  // 这个方法可以接受字符串、数组、缓冲区等作为输入，并根据提供的编码（如果提供了 encodingOrOffset）来创建缓冲区。
  return Buffer.from(arg, encodingOrOffset, length);
}

// 定义 Buffer 类的 SymbolSpecies 属性。
// SymbolSpecies 是一个内置符号，用于指定构造函数返回的对象的默认"species"。
// 在这里，它被设置为 FastBuffer，这是一个内部使用的快速路径构造函数。
ObjectDefineProperty(Buffer, SymbolSpecies, {
  __proto__: null,  // 确保这个属性没有原型链。
  enumerable: false,  // 这个属性不会出现在对象的属性枚举中。
  configurable: true,  // 这个属性是可以配置的，可以被删除或修改。
  get() { return FastBuffer; }  // 获取函数返回 FastBuffer 构造函数。
});
```

这段代码里面的细节并不需要注意，在这段代码里面出现的 `Buffer.alloc()` 和 `Buffer.from()` 内部都是返回 `FastBuffer`。那么为什么它的 `instanceOf` 或者 `constructor` 看出来居然是 `Buffer` 呢？

```javascript
FastBuffer.prototype.constructor = Buffer;
Buffer.prototype = FastBuffer.prototype;
addBufferPrototypeMethods(Buffer.prototype);
```



那 `FastBuffer` 又是什么呢 是个Uint8Array（这是一种javaScript的类型化数组 用于表示一个8未无符号整数的数组）

```javascript
class FastBuffer extends Uint8Array {
  // Using an explicit constructor here is necessary to avoid relying on
  // `Array.prototype[Symbol.iterator]`, which can be mutated by users.
  // eslint-disable-next-line no-useless-constructor
  constructor(bufferOrLength, byteOffset, length) {
    super(bufferOrLength, byteOffset, length);
  }
}
```

`Buffer` 的本质就是一个继承自 `Uint8Array` 的子类**，里面添加了许多子类的方法，如 `writeUint8()`**

```javascript
const a = Buffer.from('123');
console.log(a instanceof Uint8Array);  // true
console.log(a.byteOffset);  // 16
console.log(a.buffer);      // ArrayBuffer { byteLength: 8192, ... }
```

`ArrayBuffer` 是一个代表通用、固定长度的原始二进制数据缓冲区的 JavaScript 类型。它本身不能直接操作数据，而是提供了一个二进制内存缓冲区，可以通过类型化数组视图（如 `Uint8Array`、`Float32Array` 等）来访问和操作这些数据。`ArrayBuffer` 通常用于处理二进制数据，如文件读写、网络通信等场景。

`ArrayBuffer` 的特点：

1. **固定长度**：一旦创建，`ArrayBuffer` 的长度就固定不变。
2. **原始二进制数据**：它存储的是原始的二进制数据，不提供直接的数据访问方法。
3. **类型化数组视图**：可以通过创建类型化数组视图来解释 `ArrayBuffer` 中的数据。



在 Node.js 的 `Buffer` 实现中，为了提高性能和内存使用效率，会使用一个内部的 `ArrayBuffer` 池子。这个池子是一个预先分配的大块内存区域，它被分割成多个 `ArrayBuffer` 对象，用于支持 `Buffer` 对象的创建。

这我们就很容易想到 **`Buffer`** **是一个** **`Uint8Array`** **的子类，拥有很多** **`Buffer`** **特有的方法，其背后有一个大的** **`ArrayBuffer`** **池子，然后每次生成一个** **`Buffer`** **的时候，都用了这个池子的一段作为它的载体**。

`ArrayBuffer` 与 `FastBuffer`这我们就很容易想到 **`Buffer`** **是一个** **`Uint8Array`** **的子类，拥有很多** **`Buffer`** **特有的方法，其背后有一个大的** **`ArrayBuffer`** **池子，然后每次生成一个** **`Buffer`** **的时候，都用了这个池子的一段作为它的载体**。



**`ArrayBuffer` 与 `FastBuffer`**

既然某些情况下，一个 `Buffer` 背后是一个很大的 `ArrayBuffer`，那么很容易就可以推导出来该 `ArrayBuffer` 会被不同 `Buffer` 共用，根据 `byteOffset` 和 `length` 不同读不同内存段。


池化的工作机制：

1. **内存池**：Node.js 维护一个或多个内存池，每个池中包含一个预先分配的大 `ArrayBuffer`。
2. **分配内存**：当创建一个新的 `Buffer` 时，Node.js 会从内存池中分配一块内存，而不是创建一个新的 `ArrayBuffer`。
3. **回收内存**：当 `Buffer` 被销毁时，它的内存不会立即释放，而是返回到内存池中，以便再次使用。
4. **减少开销**：通过重用内存池中的内存，减少了内存分配和垃圾回收的频率，从而提高了性能。



```javascript
Buffer.alloc = function alloc(size, fill, encoding) {
  assertSize(size);
  if (fill !== undefined && fill !== 0 && size > 0) {
    const buf = createUnsafeBuffer(size);
    return _fill(buf, fill, 0, buf.length, encoding);
  }
  return new FastBuffer(size);
};
```



**Buffer.alloc()是池化的吗**

首先不管是否池化，FastBuffer的背后都是ArrayBuffer。在v8里面，如果要创建ArrayBuffer 就要在引擎初始化之前 指定一个叫`ArrayBuffer::Allocator` 的东西，用来在构造ArrayBuffer的时候，给他分配一块内存用。一般 v8提供一个默认的

但是node是继承了这个ArrayBuffer::Allocator 重载了Allocate方法 加了一些自己的东西

```c++
class NodeArrayBufferAllocator : public ... {
  ...

 private:
  uint32_t zero_fill_field_ = 1;//
  std::atomic<size_t> total_mem_usage_ {0};
  std::unique_ptr<v8::ArrayBuffer::Allocator> allocator_{
      v8::ArrayBuffer::Allocator::NewDefaultAllocator()};
};
```

那么在Allocate的时候究竟发生了什么？

```c++
void* NodeArrayBufferAllocator::Allocate(size_t size) {
  void* ret;
    //这块就是看内存需不需要初始化 也就是他的创建安不安全 如果是安全的，那直接透传调用 allocator_ 的 Allocate()，否则就调用它的 AllocateUninitialized()
  if (zero_fill_field_ || per_process::cli_options->zero_fill_all_buffers)
    ret = allocator_->Allocate(size);
  else
    ret = allocator_->AllocateUninitialized(size);
  if (LIKELY(ret != nullptr))
    //往 total_mem_usage_ 上加上申请的内存用量
    total_mem_usage_.fetch_add(size, std::memory_order_relaxed);
  return ret;
}
```





1. **不使用池化**：如果 `fill` 参数未定义、为 `0` 或 `size` 为 `0`，则直接创建一个新的 `FastBuffer` 实例。`FastBuffer` 是 `Uint8Array` 的一个子类，这里直接使用 `new FastBuffer(size)` 创建一个新的实例，相当于 `new Uint8Array(size)`，没有使用池化的内存。
2. **使用池化**：如果提供了 `fill` 参数，并且 `fill` 不是 `0` 且 `size` 大于 `0`，则使用 `createUnsafeBuffer(size)` 函数创建一个新的 `Buffer` 实例。这个函数可能会从内存池中分配内存，然后使用 `_fill()` 函数进行填充。这里的 `createUnsafeBuffer` 暗示了它可能会直接操作内存池中的 `ArrayBuffer`，而不总是安全的，因为它可能会绕过一些正常的内存管理检查。

**`createUnsafeBuffer()`**

```javascript
let zeroFill = getZeroFillToggle();
function createUnsafeBuffer(size) {
  zeroFill[0] = 0;
  try {
    return new FastBuffer(size);
  } finally {
    zeroFill[0] = 1;
  }
}
```

这里面的 `zeroFill` 与之前 `Timer` 里面的那个 `timeoutInfo` 类似，是为了打破 C++ 侧与 JavaScript 侧性能桎梏的简单标识。如果 `zeroFill[0]` 为 `0` 时，Node.js 内部在创建 `ArrayBuffer` 时，并不会对其对应创建出来的内存块进行初始化置零操作，而读取、操作一块未被初始化的内存，是"不安全"的，所以这个函数名为 `createUnsafeBuffer()`。既然 `createUnsafeBuffer()` 不安全，也就是说它创建出来的 `FastBuffer` 不能直接用，我们得对这块内存进行初始化，这就是后面紧跟着的 `_fill()` 做的事了。

**`_fill()`**

`_fill()` 做的事情[有两步](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fnodejs%2Fnode%2Fblob%2Fv18.14.2%2Flib%2Fbuffer.js%23L992-L1061)：

1. 根据不同需要填充的内容类型，最终都标准化为某种格式的数字、字符串等；
2. 到 C++ 侧代码，把填充内容最终填充到对应的 `ArrayBuffer` 中。

如果最终是数字：

```javascript
 // 检查传入的 value 参数是否为数字类型
if (typeof value === 'number') {
  // 执行 Out-Of-Bounds (OOB) 检查，确保指定的填充范围不会超出 Buffer 的边界

  // 获取 TypedArray 实例的字节长度
  // TypedArray.prototype.getByteLength 是一个方法，用于获取 TypedArray 实例的字节长度
  const byteLen = TypedArray.prototype.getByteLength(buf);

  // 计算填充的长度，即 end 参数和 offset 参数之间的差值
  const fillLength = end - offset;

  // 检查 offset 是否大于 end 参数，或者填充后的长度加上 offset 是否超出了 Buffer 的字节长度
  // 如果超出，抛出 ERR_BUFFER_OUT_OF_BOUNDS 错误
  if (offset > end || fillLength + offset > byteLen)
    throw new ERR_BUFFER_OUT_OF_BOUNDS();

  // 使用 TypedArray.prototype.fill 方法填充 Buffer
  // buf 是要填充的 Buffer 实例，value 是填充的值，offset 是填充的起始位置，end 是填充的结束位置
  TypedArray.prototype.fill.call(buf, value, offset, end);
}
```



如果是字符串：

```javascript
// 如果 value 不是数字，那么它可能是一个字符串或另一个 Buffer
else {
  // 调用内部的 bindingFill 函数来处理字符串或 Buffer 的填充
  // bindingFill 是一个底层的 C++ 函数，它与 Node.js 的 C++ 代码绑定
  const res = bindingFill(buf, value, offset, end, encoding);

  // 如果返回的结果是负数，表示填充过程中出现了错误
  if (res < 0) {
    // 如果返回结果是 -1，表示 value 参数的值无效
    if (res === -1)
      throw new ERR_INVALID_ARG_VALUE('value', value);

    // 如果返回的结果是其他的负数，表示填充超出了 Buffer 的范围
    throw new ERR_BUFFER_OUT_OF_BOUNDS();
  }
}
```

其中的`bindingFill`

填充数据是否是类 ArrayBuffer 的类型 

```c++
//判断 
if (Buffer::HasInstance(args[1])) {
    //把填充数据里面的元信息提取出来，展开给后续逻辑用
    //fill_obj_length 就是填充数据长度，ts_obj_data 就是目标内存块的地址，fill_obj_data 就是填充数据的地址
    SPREAD_BUFFER_ARG(args[1], fill_obj);
    str_length = fill_obj_length;
    //
    memcpy(
        ts_obj_data + start, fill_obj_data, std::min(str_length, fill_length));
    goto start_fill;
  }
```

如果填充数据不是字符串 node会把它强行当初Unit32

```c++
// 检查传入的第二个参数（args[1]）是否不是字符串类型
if (!args[1]->IsString()) {
  // 定义一个 uint32_t 类型的变量 val，用于存储转换后的无符号 32 位整数值
  uint32_t val;
  // 尝试将 args[1] 转换为 uint32_t 类型的值
  // Uint32Value 是 V8 引擎提供的方法，用于将 JavaScript 值转换为 C++ 的 uint32_t 类型
  if (!args[1]->Uint32Value(ctx).To(&val)) return;
  // 将 val 与 255 进行按位与操作，获取 val 的低 8 位
  // 这是因为 Buffer 中的每个字节都是 8 位的，所以我们只需要 val 的低 8 位
  int value = val & 255;
  // 使用 memset 函数将 ts_obj_data（指向 Buffer 内存的指针）从 start 位置开始
  // 用 value 填充 fill_length 长度的数据
  memset(ts_obj_data + start, value, fill_length);
  // 填充完成后，返回
  return;
}
```

如果是字符串 那么先将字符串按照编码类型给解码成裸内存里的数据 然后进行填充

```c++
 // 如果编码是UTF-8，则计算字符串的UTF-8长度
if (enc == UTF8) {
    str_length = str_obj->Utf8Length(env->isolate());
    // 使用node::Utf8Value将字符串转换为UTF-8编码，并获取其指针
    node::Utf8Value str(env->isolate(), args[1]);
    // 将字符串复制到目标缓冲区，复制长度为字符串长度和填充长度中的较小值
    memcpy(ts_obj_data + start, *str, std::min(str_length, fill_length));
}

// 如果编码是UCS-2，则计算字符串长度（每个字符2字节）
else if (enc == UCS2) {
    str_length = str_obj->Length() * sizeof(uint16_t);
    // 使用node::TwoByteValue将字符串转换为UCS-2编码，并获取其指针
    node::TwoByteValue str(env->isolate(), args[1]);
    // 如果系统是大端字节序，则交换字节序以匹配UCS-2的字节序
    if (IsBigEndian())
      SwapBytes16(reinterpret_cast<char*>(&str[0]), str_length);
