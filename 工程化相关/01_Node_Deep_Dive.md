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

  * 这个函数在node的事件循环结束之前被调用，EmitProcessBeforeExit(env)的目的是触发beforeExit事件，这个事件用于通知应用程序事件循环即将结束 。`.IsNothing()`：检查是否有任何事件监听器被注册到 `beforeExit` 事件。如果没有，返回 `true`，表示没有监听器；如果有，返回 `false`，表示有监听器。如果这段代码返回了真，就代表没有注册beforeExit事件的监听器，事件循环可能会决定结束，毕竟不用再等待监听器。如果返回了false，事件循环会继续执行beforeExit的回调，事件循环会继续检查是否由其他挂起的事件或者io操作。如果没有 会准备退出。

    > 这里的继续检查是否由其他挂起的事件或者io操作 是由于beforeExit的回调函数里面可能出现异步事件或者io操作

  * 在没有更多的事件等待处理（这是由事件循环模型本身决定的退出）  beforeExit函数会被触发(另一种通过代码显式控制进程退出的方法 即执行process.exit(0) ）

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
    > 这些句柄的创建和关闭通常是通过调用libuv提供的api完成的 比如uv_tcp_init`、`uv_timer_start`、`uv_close
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
    // 更新loop最后处理时间
    uv__update_time(loop);
    //定时器阶段(timers阶段)
    // 执行定时事件，大概流程就是在定时事件的小根堆里遍历出相较于之前更新的“loop最后处理时间” 已过期的事件，并依次执行其回调；
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

    // 对于 UV_RUN_ONCE 模式（之跑一个tick），确保至少执行一个回调（则再次更新一遍 loop 最后处理时间并执行定时器事件，毕竟“现在”新的系统时间经过刚才一系列流程后又过了一会儿，这个时候就要把新时间内触发的定时器都搞完；）
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

Node.js v18.12.1 中，只有一个地方用到了空转事件，那就是 `setImmediate()`。**为什么它能所谓的“immediate”？就是通过一个空的空转事件来让小乘轮回强制不等待 I/O。**

设置超时时间为 0 并不意味着 I/O 操作不会被处理，而是改变了事件循环的行为，使其在某些条件下立即继续执行，而不是等待 I/O 事件。。在事件循环的 poll 阶段之后，I/O 操作可能仍在进行中，并且当它们“准备就绪”时，操作系统会通知应用程序。当操作系统通知应用程序 I/O 事件已经就绪时，如果事件发生在事件循环的 poll 阶段之后，应用程序将在事件循环的下一次迭代中接收并处理这些事件。

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
3. **更新循环时间**：每次事件循环开始时，Node.js 会记录一个“loop最后处理时间”，这通常是当前时间。
4. **遍历小根堆**：在事件循环的 timers 阶段，Node.js 会遍历小根堆，查找所有已经到期（即到期时间小于或等于“loop最后处理时间”）的定时器。
5. **执行回调**：对于所有已过期的定时器，Node.js 将依次执行它们的回调函数。这些回调会被添加到宏任务（macro-task）队列中，并在 timers 阶段按到期时间顺序执行。
6. **调整堆结构**：执行完所有已过期的定时器回调后，小根堆的结构会根据剩余定时器的到期时间进行调整，以确保下一次迭代时能够高效地找到下一个最早到期的定时器。
7. **处理剩余定时器**：如果 timers 阶段结束时还有剩余的定时器未执行，它们将保持在小根堆中，等待下一个事件循环迭代时再次检查。
8. **超时计算**：在 poll 阶段，Node.js 会根据小根堆中最早到期的定时器来计算超时时间。如果 poll 阶段没有检测到 I/O 事件，但存在即将到期的定时器，事件循环将等待直到定时器到期或有 I/O 事件发生。



小乘轮回的最终返回值是最后一次获取的“是否有活跃事件”。通常情况下，都是没有活跃事件才会退出这个轮回的。不过，若是其中途被终止（`uv_stop()`）（这个函数会设置一个标志，使得事件循环在当前轮次结束后立即停止，即使还有活跃的事件。）或是模式为 `UV_RUN_ONCE` （如果是这个模式，事件循环将只处理一轮中的待处理事件，然后立即退出，不管是否还有活跃的事件。即使在 poll 阶段有 I/O 事件准备就绪，`UV_RUN_ONCE` 也会限制事件循环只运行一轮。）等，还是会出现有活跃事件的，这个时候外部在用 libuv 的时候就要考虑是否要重新回到新的一轮小乘轮回（通过再次调用 `uv_run` 来实现，以处理剩余的事件）。

在大多数情况下，所有的 I/O 回调函数都会在 Poll I/O 后立即调用。但是，还存在一些情况，需要将这样的回调函数推迟到下一次循环迭代中调用。如果上一次循环延迟了任何 I/O 回调函数，则会在此时调用它。

比如如果在 Poll I/O 阶段超时，但 I/O 事件在超时之后准备就绪，这些事件可能会在下一次事件循环迭代中的 Poll I/O 阶段被处理。如果事件循环因为调用了 `uv_stop()` 或者因为使用了 `UV_RUN_ONCE` 模式而退出，即使有未执行的 I/O 事件，这些事件也会被推迟到下一次事件循环迭代。

>  



![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/13b56e860d144e84b875c52fc9dae5de~tplv-k3u1fbpfcp-jj-mark:1210:0:0:0:q75.awebp)

##### uv-async-t

`uv_async_t` 是 libuv 提供的一种机制，允许从非 libuv 线程（即非事件循环线程）向 libuv 事件循环发送通知。这在需要从这些非 libuv 线程触发事件循环中的回调函数时非常有用。`uv_async_t` 可以看作是一种跨线程的通信机制(`uv_async_t` 允许跨线程的通信，无论发送信号的线程是否由 libuv 直接管理。)

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



在nodejs里 每个文件都是模块 **每一个 CJS 模块最终会被加载成一个 `Module` 类的实例**，被放在 Node.js 内部的内存中，并在“必要”的时候传递给各模块。

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

所以，CommonJS 模块本质就是一个 `exports` 对象传入被编译的模块函数中执行挂载操作得到的终态。



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



就是每个新的模块中，`require()` 函数都是现做的，通过 `makeRequireFunction()`，里面主要涉及一些安全策略相关的逻辑，然后才是 `require()` 函数本体；若无策略相关逻辑，那么 `makeRequireFunction()` 返回的 `require()` 函数就是对 `Module.prototype.require()` 的透传。除此之外，`makeRequireFunction()` 还为返回的 `require()` 中注入了诸如 `require.resolve()` 等函数，供大家使用。



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

​	

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

   分析依赖并创建新的`ModuleJob`是其初始化逻辑 意在去重，每一个`ModuleJob`都有一个“已经初始化”的promise状态

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
2. .js文件要看理他最近的package.json



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



![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c6ebf0f442854d7fbaccb76316f821f4~tplv-k3u1fbpfcp-jj-mark:1512:0:0:0:q75.awebp)

> 为什么这个替换只出现在“`Map` 中不存在该链表”的情况下做判断？
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
2. **`has_outstanding()`**：这是 `ImmediateInfo` 类的一个成员函数，用来检查是否还有未执行的立即回调。如果返回 `true`，则表示还有未处理的立即回调；如果返回 `false`，则表示所有立即回调都已处理完毕。
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
// SymbolSpecies 是一个内置符号，用于指定构造函数返回的对象的默认“species”。
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

这里面的 `zeroFill` 与之前 `Timer` 里面的那个 `timeoutInfo` 类似，是为了打破 C++ 侧与 JavaScript 侧性能桎梏的简单标识。如果 `zeroFill[0]` 为 `0` 时，Node.js 内部在创建 `ArrayBuffer` 时，并不会对其对应创建出来的内存块进行初始化置零操作，而读取、操作一块未被初始化的内存，是“不安全”的，所以这个函数名为 `createUnsafeBuffer()`。既然 `createUnsafeBuffer()` 不安全，也就是说它创建出来的 `FastBuffer` 不能直接用，我们得对这块内存进行初始化，这就是后面紧跟着的 `_fill()` 做的事了。

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
