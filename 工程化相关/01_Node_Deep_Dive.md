# 目录

- [事件循环与异步io](#事件循环与异步io)
  - [事件循环](#事件循环)
    - [源码解析](#源码解析)
    - [大轮回](#大轮回)
    - [小轮回](#小轮回)
    - [poll阶段](#poll阶段)
    - [空转事件](#空转事件)
    - [定时事件运行原理](#定时事件运行原理)
    - [uv-async-t](#uv-async-t)
- [模块机制：cjs 与 esm](#模块机制cjs-与-esm)
  - [commonJS](#commonjs)
    - [五种引入模式](#五种引入模式)
    - [文件模块的加载](#文件模块的加载)
    - [内置模块](#内置模块)
  - [ECMA](#ecma)
  - [esm模块的本质](#esm模块的本质)
    - [加载一个esm模块](#加载一个esm模块)
    - [加载一个module](#加载一个module)
    - [加载一个cjs模块](#加载一个cjs模块)
    - [执行模块](#执行模块)
  - [cjs esm的识别 启用](#cjs-esm的识别-启用)
  - [在cjs模块里加载esm模块](#在cjs模块里加载esm模块)
  - [寻径规则](#寻径规则)

---

#  事件循环与异步io

### 事件循环

事件循环的是一种并发模型，他的本质就是一个**死循环**。这个死循环里面的大部分事件都阻塞在等待事件，也就是小轮回里面的check阶段。在等待时间内 libuv是处于等待状态的（这个等待状态是由libuv内部的epoll，kqueqe，IOCP等机制管理的），等待状态里不消耗cpu

> 

```
fs.readFile(filename, (err, content) => {
  // 这里就是 callback
});
```

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4665dd6450684797b6454e0dd43aa58f~tplv-k3u1fbpfcp-jj-mark:1210:0:0:0:q75.awebp)

事件循环那条线可以理解为公交路线。我们可以看到，除了始发站之外，剩下的站点都必须由**某个事件触发**，比如 kernel （操作系统内核，它负责处理 通知io事件）传过来的 epoll 事件，或者 libuv 自己内部的定时器事件。**也只有在各站点中，事件循环才能去做其他逻辑，比如执行一段代码**，或者这段代码里面有去做其他的 I/O 操作、定时器操作等。剩下时间都阻塞在 epoll 等待上面。**我们称这一个站点（节点）为一个 tick。**

```javascript
fs.readFile(filename, (err, content) => {
  fs.writeFile(filename, content, err => {
    // 假设这个 `writeFile` 写文件要持续 2 秒钟
  });

  setTimeout(() => {
    console.log('timer done!');
  }, 1000);
});
```

#### 源码解析

事件循环的主要代码：

```javascript
// 事件循环的主循环，将持续运行直到满足退出条件
do {
  // 如果环境变量指示正在停止事件循环，则退出循环
  if (env->is_stopping()) break;

  // 运行 libuv 的事件循环，UV_RUN_DEFAULT 是默认模式，处理所有待处理事件直到没有更多事件(这就是跑一轮事件循环)
  uv_run(env->event_loop(), UV_RUN_DEFAULT);

  // 再次检查是否指示停止事件循环，如果是，则退出循环
  if (env->is_stopping()) break;

  // 清空平台特定的任务队列，执行一些延迟任务
  platform->DrainTasks(isolate);

  // 检查 libuv 事件循环是否还有活跃的事件或计时器
  more = uv_loop_alive(env->event_loop());

  // 如果事件循环还有活跃的事件，并且没有指示停止，则继续循环
  if (more && !env->is_stopping()) continue;

  // 如果 EmitProcessBeforeExit 函数执行失败，则退出循环 在退出之前，应用程序可能需要执行一些清理操作，比如关闭打开的文件、断开网络连接、释放资源等。EmitProcessBeforeExit 函数的执行结果可以指示这些操作是否成功完成。EmitProcessBeforeExit 函数的调用是一个检查点，用于确定是否在事件循环结束之前执行特定的清理或序列化操作。  node程序在准备退出的时候需要确保资源被正确回收和释放  EmitProcessBeforeExit 函数的执行结果可以表明清理操作是否已经开始或完成。如果函数执行成功，它可能会返回一个非空值，表示清理操作已经启动或无需执行。如果返回空值或执行失败，可能需要采取其他措施。 执行失败的时候 可以由其他的一些钩子执行清理
    
  if (EmitProcessBeforeExit(env).IsNothing())
    break;
  //总的来说 以下这两步是有助于v8更好的管理内存
  // 创建一个新的 HandleScope 作用域，用于管理 V8 隔离环境中的句柄
  {
    HandleScope handle_scope(isolate);

    // 运行快照序列化回调，如果回调执行失败，则退出循环
    if (env->RunSnapshotSerializeCallback().IsEmpty()) {
      break;
    }
  }

  // 如果在发出事件或运行回调后，事件循环再次变得活跃，
  // 则重新检查是否有活跃的事件
  more = uv_loop_alive(env->event_loop());

} while (more == true && !env->is_stopping());
// 循环结束条件是：没有更多的事件要处理，并且环境变量没有指示正在停止
```

*  r = uv__loop_alive(loop)是怎样运行的？
  * 这个函数通过检查一下几个条件判断事件循环还有没有活跃事件
    1. 是否还存在活跃的句柄
    2. 是否存在等待处理的回调事件。这些事件可能已经触发但是还没有执行（检查pending队列？）
    3. 检查是否存在定时器会在未来的某个时间点触发（这是怎么做到的？）

* EmitProcessBeforeExit(env).IsNothing()怎么使用的？

  * 这个函数在node的事件循环结束之前被调用，EmitProcessBeforeExit(env)的目的是触发beforeExit事件，这个事件用于通知应用程序事件循环即将结束 。`.IsNothing()`：检查是否有任何事件监听器被注册到 `beforeExit` 事件。如果没有，返回 `true`，表示没有监听器；如果有，返回 `false`，表示有监听器。如果这段代码返回了真，就代表没有注册beforeExit事件的监听器，事件循环可能会决定结束，毕竟不用再等待监听器。如果返回了false，事件循环会继续执行beforeExit的回调，事件循环会继续检查是否由其他挂起的事件或者io操作。如果没有 会准备退出

    > 这里的继续检查是否由其他挂起的事件或者io操作 是由于beforeExit的回调函数里面可能出现异步事件或者io操作

  * 在没有更多的事件等待处理（这是由事件循环模型本身决定的退出）  beforeExit函数会被触发(另一种通过代码显式控制进程退出的方法 即执行process.exit(0)  )

    > 关于process.exit(0)
    >
    > 1. 这个0代表退出码，代表成功退出，其他值表示出错了
    > 2. 执行这段代码 就是请求node立即终止当前进程。但是后续行为也要分情况
    >    1. 当进程里还有正在执行的异步操作（已经进入事件队列的回调函数）：node将会等待这些事件完成，理论上beforeExit的触发会延迟直到这些操作处理完毕，但是事实上beforeExit可能不会触发 因为退出流程已经开始 。
    >    2. 进程里没有正在执行的异步函数：这是beforeExit才会触发，这里的关键点是**`beforeExit` 事件是在确认没有更多挂起的异步操作之后，但在实际退出之前触发的**，这就意味着，如果在调用结束进程之前事件循环里没有其他挂起的事件，**beforeExit可能在process.exit(0)之前就触发**
    >    3. 未触发的定时器/未开始的io操作（还没有进入事件队列的回调函数）：这些操作将不会进行

    
    > 关于句柄（Handle）：
    >
    > 句柄是一个基于c语言层面的概念，在c语言中 句柄通常表现为指向特定数据结构的指针 libuv提供了以下类型的句柄：
    >
    > - `uv_tcp_t`：用于管理 TCP 网络连接。
    > - `uv_udp_t`：用于管理 UDP 网络通信。
    > - `uv_timer_t`：用于创建定时器。
    > - `uv_fs_event_t`：用于监听文件系统的变化。
    > - `uv_pipe_t`：用于跨平台的管道通信
    >
    > 这些句柄的创建和关闭通常是通过调用libuv提供的api完成的 比如uv_tcp_init`、`uv_timer_start、`uv_close
    >
    > 句柄是一个代表底层资源（文件 进程 线程 通信端口）的引用 或者标识符 。操作系统使用句柄·来管理资源，并通过句柄来跟踪资源的状态或访问权限。
    >
    > 活跃的句柄：已经被创建并且尚未关闭的句柄。活跃句柄意味着他们正在被事件循环监视 比如打开的文件描述符 网络连接 定时器 事件监听器

    
    ```javascript
    console.log('程序开始');
    
    // 设置一个定时器，1 秒后结束进程
    setTimeout(() => {
      console.log('定时器触发，准备退出');
      process.exit(0); // 显式调用 process.exit() 来结束进程
    }, 1000);
    
    // 这个监听器可能永远不会被触发，因为进程可能在定时器结束后立即退出
    //用于执行一些清理工作，比如关闭数据库连接、释放资源等，这些操作需要在进程退出前完成，但不需要等待任何 I/O 操作完成
    process.on('beforeExit', (code) => {
      console.log(`准备退出，退出码：${code}`);
    });
    //用于执行最后的清理工作，如记录日志、发送通知等，这些操作通常在进程退出前的最后时刻进行。
    process.on('exit', (code) => {
      console.log(`正在退出，退出码：${code}`);
    });
    ```




`uv_run()` 中的 `UV_RUN_DEFAULT` 代表执行事件循环直到`uv__loop_alive` 函数检查不到东西了。 

所以实际上上面这段代码有两层循环，第一层 `uv_run()` 里面实际的事件循环，在这里姑且称之为**小轮回** ；然后在上面这段代码中肉眼可见的 `do-while`，实际上就是包在小乘轮回外面的另一层循环，我姑且称之为**大轮回**。

##### 大轮回

等一次 `uv_run()` 之后，去跑 V8 Platform 中的一些任务，跑完之后，谁知道有没有新的事件放进去，所以得判断一下 `uv_loop_alive()` 现在是否还是为 `0`，若不为 `0`，则直接 `continue`进入下一大波的事件循环；如果真的为 `0` 了，那就是一些扫尾工作，比如看看有没有 `process.on('beforeExit')` 事件，若没有就可以直接退出事件循环了，若有，那就说明在这中间还有可能被丢入新的事件（比如 `setTimeout()` 等），那么在做一些事情（如执行 `v8.startupSnapshot` 的序列化回调）之后，再判断一下 `uv_loop_alive()` 里面是否有货，如果有，那么事件循环还得继续。进入下一轮循环。

**大乘轮回的存在是为了保证小乘轮回结束后，程序是真的要结束了，还是有可能会再丢事件进去，重新来一轮小乘轮回。**

##### 小轮回

```javascript
// 定义 uv_run 函数，它接收一个事件循环对象 loop 和一个运行模式 mode
int uv_run(uv_loop_t* loop, uv_run_mode mode) {
  int timeout;           // 用于存储超时时间
  int r;                 // 用于存储循环存活状态和其他返回值
  int ran_pending;      // 标记是否有 pending 回调被运行    
  
  // 检查事件循环是否有活跃的事件或计时器 这个就是占据大部分时间的等待阶段
  r = uv__loop_alive(loop);
  // 如果没有活跃的事件，更新当前时间
  if (!r)
    uv__update_time(loop);

  // 只要事件循环还存活且没有停止标志，就继续运行
  while (r != 0 && loop->stop_flag == 0) {
    //更新loop最后处理时间
    uv__update_time(loop);
    //定时器阶段(timers阶段)
    // 执行定时事件，大概流程就是在定时事件的小根堆里遍历出相较于之前更新的"loop最后处理时间" 已过期的事件，并依次执行其回调；
    uv__run_timers(loop);
    //io阶段(我觉得叫pending阶段更准确 这个函数并不是只处理io事件的回调函数 而是pending队列里的所有操作)
    // 检查pending队列 查找准备好但是还没有执行的回调 执行所有找到的回调函数 如果至少执行了一个回调函数 那么返回非零值 如果一个都没有执行 返回0
    ran_pending = uv__run_pending(loop);
    //idle阶段
    // 运行 idle 回调，它们在 I/O 事件处理之间运行 这个函数的运行期间即为空转阶段（idle phase） 空转阶段用于执行一些不需要立即执行的低优先级任务 周期性工作 垃圾收集 
    uv__run_idle(loop);
    //prepare阶段
    // 运行 prepare 回调，主要是内部用途 比如准备事件循环的下一轮迭代
    uv__run_prepare(loop);

    timeout = 0; // 初始化超时时间
    // 获取尚未触发的离现在最近的定时器的时间间隔（uv_backend_timeout），即事件循环到下一次循环的最长时间；
    if ((mode == UV_RUN_ONCE && !ran_pending) || mode == UV_RUN_DEFAULT)
      timeout = uv_backend_timeout(loop);
    //poll阶段 轮询阶段
    // 根据 epoll、kqueue 等 I/O 多路复用机制，去监听等待 I/O 事件触发，并以上一步获取的时间间隔作为最大监听时间，一旦有 I/O 事件发生，比如数据可读或可写，相应的回调函数就会被加入到待处理队列中，以便在事件循环的后续阶段被调用。若超时还未有事件触发，则直接取消此次等待，因为若时间到了还没有事件触发，而定时器触发时间到了，那 libuv 就要停下来去处理下一轮定时器了；这个函数的执行期间就是poll I/O阶段
    uv__io_poll(loop, timeout);
	// 处理已经完成的 I/O 事件的回调函数
    // 这一步骤是必要的，以确保及时执行 I/O 完成时的回调
    ran_pending = uv__run_pending(loop);
    // 更新空闲时间指标，即使没有事件被处理（不重要 也看不懂）
    uv__metrics_update_idle_time(loop);
	//check阶段
    // 运行 check 回调，也就是setImediate
    uv__run_check(loop);
    //closing阶段 
    // 运行正在关闭的句柄的回调 对其进行扫尾工作
    uv__run_closing_handles(loop);

    // 对于 UV_RUN_ONCE 模式（之跑一个tick），确保至少执行一个回调（则再次更新一遍 loop 最后处理时间并执行定时器事件，毕竟"现在"新的系统时间经过刚才一系列流程后又过了一会儿，这个时候就要把新时间内触发的定时器都搞完；）
    if (mode == UV_RUN_ONCE) {
      uv__update_time(loop);
      uv__run_timers(loop);
    }

    // 再次检查事件循环是否有活跃的事件或计时器
    r = uv__loop_alive(loop);
    // 如果是 UV_RUN_ONCE 或 UV_RUN_NOWAIT 模式，跳出循环
    if (mode == UV_RUN_ONCE || mode == UV_RUN_NOWAIT)
      break;
  }

  // 清除停止标志，确保它是零
  if (loop->stop_flag != 0)
    loop->stop_flag = 0;

  // 返回事件循环的存活状态
  return r;
}
```


**poll阶段**

事件循环在以下条件会退出poll阶段

1. 检测到至少一个 I/O 事件已经就绪并准备好被处理。

2. 超时时间到了

   关于这里的超时时间 ：poll阶段的超时是为了平衡效率和响应速度，超时机制确保了事件循环不会无限期的等待io事件，事件循环可以及时退出poll阶段处理其他事情 影响超时时间设置的可能有以下原因：

   1. 定时器事件：如果事件循环里有定时器存在 poll阶段会根据定时器到期时间设置一个超时时间 确保定时器能够及时被处理
   2. 立即回调：如果有setImediate设置的立即回调 ，poll阶段也会设置超时时间 确保及时执行立即回调
   3. 活跃的句柄：如果有句柄处于活跃状态（比如网络来连接或者文件描述符），poll阶段会设置超时时间以便定期检查这些句柄的状态
   4. 关闭句柄：如果有句柄正在关闭 poll阶段会设置超时时间以便关闭操作能及时完成
   5. 用户配置：用户可能通过调用 `uv_loop_configure` 函数配置事件循环的行为，这可能影响 "poll" 阶段的超时时间
   6. 系统资源：系统资源的限制，就比如文件描述符的限制（操作系统对每个进程可以打开的文件描述符数量有限制，如果进程里的文件描述符接近或者达到这个限制 poll阶段可能无法有效的监听新的文件描述符 因此会设置一个超时时间防止资源耗尽） 也可能影响超时时间



##### 空转事件

若事件循环中存在空转事件，小乘轮回中会强行设置 `timeout` 为 `0`，即不阻塞 I/O 等待，可以马上开始进入下一轮轮回。

Node.js v18.12.1 中，只有一个地方用到了空转事件，那就是 `setImmediate()`。**为什么它能所谓的"immediate"？就是通过一个空的空转事件来让小乘轮回强制不等待 I/O。**

设置超时时间为 0 并不意味着 I/O 操作不会被处理，而是改变了事件循环的行为，使其在某些条件下立即继续执行，而不是等待 I/O 事件。。在事件循环的 poll 阶段之后，I/O 操作可能仍在进行中，并且当它们"准备就绪"时，操作系统会通知应用程序。当操作系统通知应用程序 I/O 事件已经就绪时，如果事件发生在事件循环的 poll 阶段之后，应用程序将在事件循环的下一次迭代中接收并处理这些事件。

1. **超时时间的含义**：在 Node.js 的事件循环中，超时时间通常用于决定在 poll 阶段等待 I/O 事件的最长时间。如果超时时间为 0，事件循环将不会在 poll 阶段等待。
2. **立即检查 I/O 事件**：即使超时时间为 0，事件循环仍然会检查是否有已经准备就绪（指的是一个 I/O 资源（如套接字、文件描述符等）已经处于可进行读取或写入操作的状态。）的 I/O 事件。如果有，这些事件会在 poll 阶段被立即处理。
3. **空转事件的优先级**：如果存在空转事件（如 `setImmediate` 回调），并且超时时间为 0，事件循环会优先执行这些空转事件，因为它们需要在当前迭代结束前被处理。
4. **轮询机制**：在某些操作系统和 I/O 模型中，I/O 事件的检测是轮询进行的。即使超时时间为 0，事件循环也会在 poll 阶段快速轮询 I/O 事件。
5. **I/O 事件的即时性**：I/O 事件通常具有即时性，即当它们准备就绪时，操作系统会尽快通知应用程序。因此，即使超时时间为 0，这些事件也不会被遗漏。
6. **事件循环的迭代**：在处理完当前迭代的所有事件后，事件循环会重新开始新一轮的迭代。在新的迭代中，事件循环会再次检查并处理 I/O 事件。
7. **非阻塞 I/O**：Node.js 使用非阻塞 I/O 模型，这意味着即使在 poll 阶段没有立即处理 I/O 事件，应用程序也不会被阻塞，仍然可以响应其他类型的事件和回调。
8. **效率和响应性**：将超时时间设置为 0 可以提高事件循环的效率和响应性，确保应用程序能够快速响应用户输入和其他事件。
9. **特殊情况的处理**：在某些特殊情况下，如果 I/O 事件在 poll 阶段没有被处理，它们会在事件循环的下一轮迭代中被处理。



##### 定时事件运行原理

在 Node.js 的事件循环中，定时事件（例如由 `setTimeout` 创建的定时器）是通过一个优先队列来管理的，这个队列经常用小根堆（min-heap）（一种特殊的二叉树结构）数据结构实现。以下是定时事件处理的大概流程：

1. **创建定时器**：当调用 `setTimeout` 函数时，Node.js 会在其内部的小根堆中插入一个节点，该节点包含了定时器的到期时间和对应的回调函数。
2. **维护小根堆**：小根堆会根据定时器的到期时间来维护节点的顺序，确保最早到期的定时器总是位于堆顶。
3. **更新循环时间**：每次事件循环开始时，Node.js 会记录一个"loop最后处理时间"，这通常是当前时间。
4. **遍历小根堆**：在事件循环的 timers 阶段，Node.js 会遍历小根堆，查找所有已经到期（即到期时间小于或等于"loop最后处理时间"）的定时器。
5. **执行回调**：对于所有已过期的定时器，Node.js 将依次执行它们的回调函数。这些回调会被添加到宏任务（macro-task）队列中，并在 timers 阶段按到期时间顺序执行。
6. **调整堆结构**：执行完所有已过期的定时器回调后，小根堆的结构会根据剩余定时器的到期时间进行调整，以确保下一次迭代时能够高效地找到下一个最早到期的定时器。
7. **处理剩余定时器**：如果 timers 阶段结束时还有剩余的定时器未执行，它们将保持在小根堆中，等待下一个事件循环迭代时再次检查。
8. **超时计算**：在 poll 阶段，Node.js 会根据小根堆中最早到期的定时器来计算超时时间。如果 poll 阶段没有检测到 I/O 事件，但存在即将到期的定时器，事件循环将等待直到定时器到期或有 I/O 事件发生。



小乘轮回的最终返回值是最后一次获取的"是否有活跃事件"。通常情况下，都是没有活跃事件才会退出这个轮回的。不过，若是其中途被终止（`uv_stop()`）（这个函数会设置一个标志，使得事件循环在当前轮次结束后立即停止，即使还有活跃的事件。）或是模式为 `UV_RUN_ONCE` （如果是这个模式，事件循环将只处理一轮中的待处理事件，然后立即退出，不管是否还有活跃的事件。即使在 poll 阶段有 I/O 事件准备就绪，`UV_RUN_ONCE` 也会限制事件循环只运行一轮。）等，还是会出现有活跃事件的，这个时候外部在用 libuv 的时候就要考虑是否要重新回到新的一轮小乘轮回（通过再次调用 `uv_run` 来实现，以处理剩余的事件）。

在大多数情况下，所有的 I/O 回调函数都会在 Poll I/O 后立即调用。但是，还存在一些情况，需要将这样的回调函数推迟到下一次循环迭代中调用。如果上一次循环延迟了任何 I/O 回调函数，则会在此时调用它。

比如如果在 Poll I/O 阶段超时，但 I/O 事件在超时之后准备就绪，这些事件可能会在下一次事件循环迭代中的 Poll I/O 阶段被处理。如果事件循环因为调用了 `uv_stop()` 或者因为使用了 `UV_RUN_ONCE` 模式而退出，即使有未执行的 I/O 事件，这些事件也会被推迟到下一次事件循环迭代。

>  



![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/13b56e860d144e84b875c52fc9dae5de~tplv-k3u1fbpfcp-jj-mark:1210:0:0:0:q75.awebp)

##### uv-async-t

`uv_async_t` 是 libuv 提供的一种机制，允许从非 libuv 线程（即非事件循环线程）向 libuv 事件循环发送通知。这在需要从这些非 libuv 线程触发事件循环中的回调函数时非常有用。`uv_async_t` 可以看作是一种跨线程的通信机制(`uv_async_t` 允许跨线程的通信，无论发送信号的线程是否由 libuv 直接管理.)

> 非libuv线程
>
> 在libuv的事件循环中，所有的IO操作，定时器，事件监听都是在一个或者多个libuv管理的线程里执行的
>
> 而非libuv线程指的是不直接和libuv线程进行交互的线程 可能是用户级线程，第三方库线程

Node.js 中 `vm` 模块执行的超时就借助了 `uv_async_t` 的能力。因为 `vm` 在执行用户代码的时候，是在主事件循环上执行的( `vm` 模块允许代码在与主事件循环不同的上下文中运行，但它并不是在另一个线程上执行。)，这个时候，只有一个上帝视角的线程才能在超时的时候终止它的执行。这个上帝视角在 Node.js 中被称作 **`Watchdog`，看门狗**。看门狗在其析构函数（销毁对象时释放资源的函数）中，就是通过 `uv_async_t` 来终止看门狗自身的事件循环。就像这样：

> 在主线程里设置定时器可以终止同步操作吗？
>
> 并不能 在定时器等待一定时间之后 定时器的会点函数 进入任务队列 这个时候同步任务还排在任务队列里 定时器的回调函数并不能执行

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/82c07f4031d74087b91e8051a8a5e8b3~tplv-k3u1fbpfcp-jj-mark:1210:0:0:0:q75.awebp)

这里的静电棒通知 就是使用uv_async_t实现

而开门狗析构就是前面操作的收尾逻辑

> 既然看门狗析构函数的作用是释放资源 为什么不在这个地方杀死看门狗循环？
>
> 既然是两条线程，在彼此不知道彼此状态的情况下，去操作另一个线程持有的对象，或者另一个线程正在处理的对象是很危险的，即线程不安全。谁知道那条事件循环是不是正在执行什么关键的操作，比如释放内存、新建内存之类的。直接就去杀掉事件循环，去终止线程，会导致状态不可知。所以要由主事件循环去发一个事件通知说要把自己杀了，看门狗事件循环自然会在死循环阻塞等通知的时候接到这个通知，然后它就可以在自己的安全领域内把自己杀掉了，杀掉后，看门狗的线程自然就跳出了事件循环，线程自然就结束了。而主事件循环内只需静静等待那条线程结束就可安全地做后续事情了。


> nodejs的线程
>
> **单线程是对你而言。对底层可不是，只不过其他线程对你不开放的。**






# 模块机制：cjs 与 esm



### **commonJS**

在js用于服务端代码编写的过程中 急需一个模块化生态系统来管理模块代码 CommonJS就这样诞生了 nodeJS就采用了CJS作为了模块系统的基础 在编写服务器端代码时 由于需要引入的一般是本地模块 所以同步导入的设计并不会多大影响性能（这样同步导入大文件的方式可能会造成主线程阻塞 由于node的单线程特性 程序会卡在那里 但是异步操作依旧可以进行）



在nodejs里 每个文件都是模块 **每一个 CJS 模块最终会被加载成一个 `Module` 类的实例**，被放在 Node.js 内部的内存中，并在"必要"的时候传递给各模块。

**require.main**

这个听起来像是require对象下的main属性 但是require是一个函数哎？

事实上 **require是当前模块的Module实例上的方法 而require.main是一个全局变量** 指向当前模块（文件）在模块树上的入口点，也就是启动整个应用程序的模块。



```javascript
// test2.js
console.log(module);
console.log(require.main);

// test.js
require('./test2');
console.log(module);
process.nextTick(() => {
    console.log(module);
});
```

执行test之后 会有四次关于Module实例的输出

1. 输出test2的实例 此时test2模块自身代码没有执行完 loaded为false  
2. 输出入口模块test的实例 loaded也是false
3. 第三次输出的还是test的实例 但是这个时候test2执行完毕 执行上下文回到test test2的实例里面的loaded变成true
4. 下一步是执行 `process.nextTick()`，将回调函数进去，以供下一个 Tick 执行。至此，`test.js` 模块也加载完毕，后面就是正式进入事件循环了



#### 五种引入模式

1. 引入本地js文件
2. 引入第三方模块
3. 引入内置模块
4. 引入c++编写的.node拓展文件
5. 引入json文件

CommonJS 模块本质是 `vm` 模块下对于用户代码的 IIFE 泡芙（在 Node.js 的早期版本中，CommonJS 模块的实现确实使用了 `vm` 模块来创建一个沙箱环境，以确保模块代码不会污染全局命名空间。每个模块的代码都被包裹在一个函数中，这个函数在模块的上下文中立即执行，其作用域与全局作用域隔离。这样，模块的 `exports` 对象就相当于 IIFE 的返回值，而模块内部定义的变量则被限制在函数作用域内，不会泄漏到全局作用域。）

cjs模块在nodejs中 本质就是一个module实例 实际上 这个实例是一个函数执行的结果

nodejs在加载模块 也就是通过require引入的时候 就会在内部预先声明这个对象 就比如const module  =  ....

然后nodejs会在目标模块的代码前后都加上一段代码 是之变成一个函数 

```javascript
(function (exports, require, module, __filename, __dirname) {
  // 实际模块代码
  module.exports = {
      ....
  }
});
```

然后会在require内部执行这个函数

```javascript
const module = {
  exports: {},
};

const result = compiledWrapper(module.exports,
                               <针对新模块的 `require` 函数>,
                               module,
                               <解析出来的文件名>,
                               <解析出来的目录名>);

```

一套操作下来之后，最先定义好的 `module` 对象就在用户模块代码中被赋值了。

一套流程行云流水，总结成粗糙的流程图如下：

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ebeb9d2824b546bda04e83ca208d77ae~tplv-k3u1fbpfcp-jj-mark:1210:0:0:0:q75.awebp)

所以，CommonJS 模块就是一个 `exports` 对象传入被编译的模块函数中执行挂载操作得到的终态。



##### **文件模块的加载**

Module对象的构造函数

```javascript
function Module(id = '', parent) {
  this.id = id;
  this.path = path.dirname(id);
  setOwnProperty(this, 'exports', {});
  moduleParentCache.set(this, parent);
  updateChildren(parent, this, false);
  this.filename = null;
  this.loaded = false;
  this.children = [];
}
```

通过 `setOwnProperty()` 把 `exports` 挂载到 `module` 对象中。这里的 `setOwnProperty` 是对下面代码的封装：

```javascript
ObjectDefineProperty(obj, key, {
  __proto__: null,
  configurable: true,
  enumerable: true,
  value,
  writable: true,
});
```

在 `require()` 一个模块的时候，当前序逻辑都执行完了后（如不使用缓存、是一个内置模块等），会实例化一个 `Module` 对象

```javascript
const module = new Module(filename, parent);
```

此处的 `filename` 即寻径后得到的文件名，用于加载模块源码。`parent` 即当前发起 `require()` 函数的模块所属的 `Module` 实例。然后调用 `module` 对象中的 `load` 函数进行内里的逻辑，如读取模块代码、编译模块并执行等等。这些都是 `Module` 的成员方法

> 关于module.exports 和 exports
>
> 设置了module.exports 之后 exports就没有用了？
>
> 这是因为module.exports对象本来是对exports的引用 指定module.exports之后就指向了新的对象

在cjs中 node支持三种类型的模块

1. js
2. json 同步读取对应文件之后 使用JSON.parse得到内容 然后挂载到module.exports
3. node 使用c++的拓展机制进行加载

这些逻辑被放在Module静态对象里

```javascript
Module._extensions['.js'] = function(module, filename) { ... }
Module._extensions['.json'] = function(...) { ... }
Module._extensions['.node'] = function(...) { ... }
```

如果想要加载ts模块

```javascript
const Module = require('module');

Module._extensions['.ts'] = function(module, filename) {
  // 读取 TypeScript 源文件，加上函数前后缀，编译 TypeScript 函数并执行，传入 `module` 得到结果
};

// 或者
require.extensions['.ts'] = ...; // 此处等同 `Module._extensions`
```

在 Node.js [默认的 _extension['.js'\] 中](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fnodejs%2Fnode%2Fblob%2Fv18.14.0%2Flib%2Finternal%2Fmodules%2Fcjs%2Floader.js%23L1235)，会先判断一些缓存逻辑，通过文件名看之前是否加载过该模块。然后就是流程图中的读取文件内容。

```javascript
content = fs.readFileSync(filename, 'utf8');
```

唯一一个可以异步编写的地方也用了同步的 API

接下来判断这个模块是不是合法的cjs模块 大概逻辑就是

```javascript
const pkg = readPackageScope(filename);  // 读取对应的 `package.json`
if (pkg?.data?.type === 'module') {
  ...
  throw err;
}
```

接下来调用`module._compile()` 去编译并执行模块函数，得到最终结果了。

这个 大概就是 先加上前后缀 通过vm中的script类加载执行 得到函数对象

最后传入this并调用函数 最终挂到module.exports上



就是每个新的模块中，`require()` 函数都是现做的，通过 `makeRequireFunction()`，里面主要涉及一些安全策略相关的逻辑，然后才是 `require()` 函数本体；若无策略相关逻辑，那么 `makeRequireFunction()` 返回的 `require()` 函数就是对 `Module.prototype.require()` 的透传。除此之外，`makeRequireFunction()` 还为返回的 `require` 中注入了诸如 `require.resolve()` 等函数，供大家使用。



##### **内置模块**

用户侧代码怎样加载内置模块

内置模块与文件模块加载逻辑的区别是在前文中提到的 `Module._load()` 中体现的

```javascript
Module._load = function(request, parent, isMain) {
  ...
  
  if (String.prototype.startsWith(request, 'node:')) {
    const id = String.prototype.slice(request, 5);  // 去掉 node: 前缀
    const module = loadBuiltinModule(id, request);
    if (!module?.canBeRequiredByUsers) {
      throw new ERR_UNKNOWN_BUILTIN_MODULE(request);
    }
    return module.exports;
  }
  
  ...寻径及缓存等逻辑...
  
  const mod = loadBuiltinModule(filename, request);
  if (mod?.canBeRequiredByUsers &&
      BuiltinModule.canBeRequiredWithoutScheme(filename)) {
    return mod.exports;
  }
  
  ...
  
  文件模块加载逻辑
}
```

大概逻辑就是，先判断是否有 `node:` 前缀，这是在 Node.js v14.18.0 中首次提出来的，大家可以显式地[通过 node: 前缀来说明此次加载的是一个内置模块](https://link.juejin.cn/?target=https%3A%2F%2Fnodejs.org%2Fdist%2Flatest-v18.x%2Fdocs%2Fapi%2Fmodules.html%23core-modules)，毕竟如果你的 `node_modules` 目录下有同名包的情况下，不显式声明会找到犄角旮旯里去。若有 `node:` 前缀，则直接通过 `loadBuiltinModule()` 去加载对应模块并返回。然后是一系列的寻径逻辑，得到 `filename`，这个 `filename` 有可能是个文件路径，也有可能没找到对应文件，直接是个标识符（如 `fs` 等）。这个时候，再拿着 `filename` 去尝试通过 `loadBuiltinModule()` 加载对应内置模块。如果存在对应内置模块，则判断一下当前启动策略是否允许通过无 `node:` 前缀方式加载内置模块，若都合法，则也返回 `mod.exports`。`loadBuiltModule()` 函数在未找到对应内置模块的情况下，是无返回（即 `undefined`）的，所以自然会走到后面文件模块加载逻辑。

这点代码归结为流程图，就是这样的：

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/128d6525780c4bdda9e92cbced89f4e2~tplv-k3u1fbpfcp-jj-mark:1210:0:0:0:q75.awebp)

`loadBuiltinModule()` 函数逻辑

```javascript
function loadBuiltinModule(filename, request) {
  const mod = BuiltinModule.map.get(filename);
  if (mod?.canBeRequiredByUsers) {
    debug('load built-in module %s', request);
    // compileForPublicLoader() throws if mod.canBeRequiredByUsers is false:
    mod.compileForPublicLoader();
    return mod;
  }
}
```

直接从 `BuiltinModule` 的 `map` 中获取对应标识（如 `fs`、`path` 等）的内置模块，然后看是不是存在且能被用户所 `require()`。若可以，那就将其编译为用户侧可用的模块，否则直接不返回。这个 `BuiltinModule` 是另一种模块实例，与文件模块的 `Module` 相对应。在 Node.js 初始化的时候，会通过 C++ 侧代码把所有的内置模块名放到 `map` 中，并为其实例化一个对应的 `BuiltinModule`：

```javascript
const {
  builtinIds,
} = internalBinding('builtins');  // 从 C++ 侧代码中获取内置模块 ID 数组

class BuiltinModule {
  ...
  
  static map = new SafeMap(
    ArrayPrototypeMap(builtinIds, (id) => [id, new BuiltinModule(id)])
  );
  
  ...
}
```

## 

### **ECMA**

在模块化需求增长时 大家认为应该提出一种内置于js语言层面的规范 这个规范在浏览器 服务端都可以使用 于是就提出了能够实现异步加载 动态导入 循环依赖 静态分析的ECMA

全部引入import * as all from '...'

天然不支持引入json文件 如果需要引入json文件`import data from './data.json' assert { type: "json" };`


import **静态加载不支持掺杂在逻辑里 但是可以使用动态加载**

1. import()函数 这是一个返回promise的函数 需要使用.then接收 多用于模块动态导入

   ```javascript
   if(true){
       import('./test.js').then()
   }
   ```
   
   

2. import动态加载 通常用于惰性执行代码 这种方法得到的是import()执行完成之后返回的promise 当模块加载执行完毕之后 promise的状态从pendind变成fulfilled  vue里的路由就这样写
    

**两者的区别**

1. this的行为不同
   1. 在cjs中 模块函数的内部指向模块本身 cjs的模块通常被设计一个对象 所以也就是指向对象本身 在模块顶层 则指向全局对象 global或者window es6模块里面顶层this将指向undefined（）全局作用域里的this指向全局对象

```javascript
it(true){
    require(...)
}
//cjs是支持在逻辑判断里require的 但是如果require的文件过大 下面的代码会被阻塞
//esm基于编译时 在编译时就需要知道引入什么模块 所以不能掺杂逻辑判断     //如果一定要在逻辑里import 需要使用函数模式
if(true){
     import('...').then(res=>{
         ...
     })
    }            
```



2. cjs是基于运行时地同步加载 esm是基于编译时的异步加载

3. cjs值可以修改 esm不可修改
   - **值的可变性**: 当你从一个 CJS 模块导入一个值时，你得到的是一个**指向原始值的引用**（对于原始类型）或一个实际的副本（对于对象）。这意味着如果你导入一个可变对象并修改它，原始模块中的对象也会被修改。
   - **不可变性**: ESM 提供了一种不可变（immutable）的导入方式。当你从一个 ESM 模块导入一个值时，你得到的**是一个只读的引用**。这意味着你不能修改通过 `import` 导入的值（除非该值本身是可变的，例如对象或数组，并且你修改的是对象的属性或数组的元素）

	

4. cjs不可以tree shaking（因为cjs是基于运行的）



## **esm模块的本质**

ECMAScript modules 本质是一个 C++ 侧实现的 JavaScript 对象 `ModuleWrap` 往下看 就是v8里面的Module

> v8里 每一种内置js类型 c++侧都有对应的类去继承 根据生命周期 又被不同的句柄所表示 在v8里 Module对象对应的就是ECMA里面的模块 当然和cjs里面的Module不同 并且根据生命周期分为Local<Module>(当前闭包作用域里有效的模块对象)  Clobal<Module> 长生命周期的模块对象

其实在每个ModileWrap里面 都隐藏了Module对象

```javascript
class ModuleWrap {
  #module;
  ModuleWrap(<参数>) {
    this.#module = new Module(<参数>);
  }
  
  foo() {
    this.#module.bar();
  }
}
```

(这里的#module 就是v8的Module对象 内部封装了一些方法 而modileWrap就是套着皮的Module 在里面封装了一些v8对模块的方法)

### **加载一个esm模块**

在加载之前 node会初始化与i个 esm loader 通过调用这个loader里面的import()来加载主ESM。在这个方法里会把主入口作为一个ModuleJob去加载执行任务 -这个ModuleJob就是用来加载一个ModuleWrap


**模块加载任务**

1. 任务构造函数

   在`ModuleJob`构造函数中 会为其异步创建一个`ModuleWrap` 对象 

2. 依赖树->需要加载的模块的集合 

   总的来讲 就是把依赖树 变成了 需要加载的一系列模块 

   ```javascript
   const jobsInGraph = new SafeSet();
   const addJobsToDependencyGraph = async (moduleJob) => {
     if (jobsInGraph.has(moduleJob)) {
       return;
     }
     jobsInGraph.add(moduleJob);
     const dependencyJobs = await moduleJob.linked;
     return SafePromiseAllReturnVoid(dependencyJobs, addJobsToDependencyGraph);
   };
   await addJobsToDependencyGraph(this);
   ```

3. 完成初始化

   分析依赖并创建新的`ModuleJob`是其初始化逻辑 意在去重，每一个`ModuleJob`都有一个"已经初始化"的promise状态

   若是根模块 其初始化promise状态会在做完整个以来分子 创建新的`ModuleJob` 并生成拍平的集合后被resolve 集合中的其他模块 不用单独分析依赖树（在link（））里面已经分析过了 所以不需要单独初始化 在根模块初始化完成之后 他们就自然初始化完成了 （其实根模块初始化过程的最后 会手动将集合里所有ModuleJob的初始化状态设置成已完成）	

**模块类型映射**

在`ModuleJob`中 node会根据不同的文件类型 执行不同的代码逻辑 最终返回不同的modulewrap实例 esm里面有一个translator的Map

```javascript
translators.set('module', ...);
translators.set('commonjs', ...);
translators.set('builtin', ...);
translators.set('json', ...);
translators.set('wasm', ...);
```



### 加载一个module

把源码进行简单处理 然后实例化

```javascript
const module = new ModuleWrap(url, undefined, source, 0, 0);
```

创建好之后 设置两个回调函数到一个map里面和这个`ModuleWrap` 关联起来 

```javascript
moduleWrap.callbackMap.set(module, {
  initializeImportMeta: (meta, wrap) => this.importMetaInitialize(meta, { url }),
  importModuleDynamically,
});
```

1. 当 `import.meta` 好了之后会触发的回调，由 V8 控制时机；
2. 当在模块里面执行动态导入 `await import()` 时候会触发的回调。

Node.js 会设置这两类回调的整体回调函数到 V8 的 `Isolate` 对象中，V8 会在相应时机触发。而这两个整体回调中则又会通过 `Map` 的关联信息调用到对应的真实回调中。`import.meta` 那个就不细讲了，这个 `importModuleDynamically` 就是对于 `esmLoader.import()` 的透传。



### 加载一个cjs模块

不行了哥们真看不懂了


### 执行模块

通过Module.prototype.evaluate()来执行 第一个参数是timeout 主模块是-1 就算死循环也没有问题

在 `evaluate()` 中，主要有三种逻辑：

1. 限时 WatchDog 相关逻辑，仅在 `vm.Module` 中被使用；
2. 通过 V8 的 `Module::Evaluate()` 去执行模块得到结果；
3. 若该模块的运行时上下文（`vm.Context`）非主环境上下文，则手动触发微任务——`microtask_queue->PerformCheckpoint(isolate)`。

其实如果没有 `vm` 那茬子事，整个 `evaluate()` 实际上就是透传调用 V8 的 `Module::Evaluate()` 执行模块得到结果。



------

**定义全局变量**

全局变量 在引入的文件中也可以访问

通过global.name定义了一个name全局变量 可以在其他模块里访问 但是要注意代码执行顺序

可以使用`globalThis`API定义全局变量 会自动判断环境



------

## 



**cjs esm的识别 启用**

1. .mjs文件会被认为是esm .cjs会被认为是cjs
2 .js文件要看理他最近的package.json


**cjs下的import**

cjs模块里是无法使用import语法的 同理esm里没有require


**在esm模块里import cjs 模块**

把文件拓展名修改成mjs是可以运行的 但是由于入口文件时esm 所以那个cjs模块里的require.mian是undefined


**在cjs模块里加载esm模块**

ECMAScript module 可以通过 `import` 加载 CommonJS 模块，而反过来 CommonJS 模块是无法通过 `require()` 来加载 ECMAScript module 的。这里涉及到一个本质问题，那就是**模块加载的异同步**。CommonJS 的 `require()` 机制是完全同步的，而 ECMAScript module 的 `import` 机制则是异步的。

`import` 是异步的，那么在内部通过同步的方式模拟一个 `require` 流程是没问题的，所以 ECMAScript module 下可以通过 `import` 去加载 CommonJS 模块；反过来不行，一个同步的东西是无法加载异步内容的，至少无法通过比较正统的方式解决。

CommonJS 虽然无法通过 `require` 去加载一个 ECMAScript module，但不意味着它无法加载 ECMAScript module。实际上，Node.js 的 CommonJS 模块虽然不支持 `import` 语法，但它却支持 `import()` 函数。我们仍可以在 CommonJS 中通过 `import()` 函数来加载一个 ECMAScript module。





#### **寻径规则**

古早巡警规则

1. 若是以 `./` 或 `../` 等相对路径前缀开头的标识，则认为是一个相对路径，直接以当前模块文件为始去寻径；
2. 否则，认为其是一个三方模块或内置模块；
   - 若是可被加载的内置模块，则使用该内置模块；
   - 否则，从当前文件目录的 `node_modules` 目录下寻找对应模块（包）；
   - 若无法找到，设当前目录为上级目录，重新执行 `b`；
   - 若一直到根目录还无法找到，那就是找不到了。

在内置模块的判断上加上了：是否以node：为前缀 并且能在用户侧加载的内置模块   或者  没有前缀 node可以通过无前缀方式加载 并且用户侧可加载


**寻径基路径 *

基路径数组会由一个函数生成 生成逻辑：

1. 若是内置模块，则不需要基路径，为 `null`；
2. 若不是以相对路径标识开头（`./`、`../`），则：
   - 基路径为从当前目录开始往前的每一级目录，并为每一级目录都加上 `node_modules` 一层（参考[源码](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fnodejs%2Fnode%2Fblob%2Fv18.14.0%2Flib%2Finternal%2Fmodules%2Fcjs%2Floader.js%23L720-L756)）；
   - 除了上述的基路径之外，还包括 `HOME` 环境变量下诸如 `.node_modules`、`.node_libraries` 等目录，包括 Global 包所安装的目录等（参考[文档](https://link.juejin.cn/?target=https%3A%2F%2Fnodejs.org%2Fdist%2Flatest-v18.x%2Fdocs%2Fapi%2Fmodules.html%23loading-from-the-global-folders)和[源码](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fnodejs%2Fnode%2Fblob%2Fv18.14.0%2Flib%2Finternal%2Fmodules%2Fcjs%2Floader.js%23L1354-L1382)）；
3. 若是以相对路径标识开头，则基路径为当前模块的目录地址。


有了基路径数组之后 开始正式寻径逻辑

1. 如果是以#开头的模块标识 会读取最近的上层作用域中的package.json文件 获取import字段里的映射关系 根据映射关系进行寻径

   ```javascript
   {
     "import": {
       "#config": "./config.development.js"
     }
   }
   ```
    

2. 读取对应的package.json 看看包名是否和当前的request相等 比如name为example 在加载example/index时 就会在当前包的根目录下寻找 index.js

3. 拿到基路径数组 开始寻径

   1. 若 `request` 是个绝对路径，则忽略原来所有基路径，并仅以一个空字符串作为基路径；
   2. 从数组中拿到下一个基路径；
   3. 用基路径加上 `request` 变成一个新路径；
   4. 在新路径中找是否存在最近的上层 `package.json`，并判断是否有 `exports` 字段做映射，若有映射，直接计算映射相关内容，最终若计算成功则直接返回，这是为了兼容 ESM 的 [exports 语法糖](https://link.juejin.cn/?target=https%3A%2F%2Fnodejs.org%2Fdist%2Flatest-v18.x%2Fdocs%2Fapi%2Fpackages.html%23package-entry-points)，而且这段逻辑也是直接复用了 ECMAScript module 的相关逻辑；
   5. 判断新路径状态，若新路径不以目录符号 `/` 结尾，则：
      - 若是一个文件，则寻径成功；
      - 否则，尝试加上各种后缀名再看看文件存不存在，若任一存在，则寻径成功；
      - 否则，继续后续逻辑；
   6. 若新路径是个目录，则：
      - 若当前目录有 `package.json`，则尝试使用 `main`，若一切安好，则寻径成功；
      - 否则尝试 `index` 加上各种后缀看看文件存不存在，若存在，则寻径成功，否则继续后续逻辑；
   7. 最后，若还没寻径成功，则失败。


