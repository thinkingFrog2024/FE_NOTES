//背景：react的优先级调度器 
/*选择 MessageChannel 的原因，是首先异步得是个宏任务，因为宏任务中会在下次事件循环中执行，不会阻塞当前页面的更新。MessageChannel 是一个宏任务。
没选常见的 setTimeout，是因为MessageChannel 能较快执行，在 0～1ms 内触发，像 setTimeout 即便设置 timeout 为 0 还是需要 4～5ms。相同时间下，MessageChannel 能够完成更多的任务。
*/

/*MessageChanne设计初衷是为了方便 我们在不同的上下文之间进行通讯，例如web Worker,iframe 它提供了两个端口（port1 和 port2），通过这些端口，消息可以在两个独立的线程之间双向传递 */

/*
ImmediatePriority : 立即执行的优先级，级别最高
UserBlockingPriority : 用户阻塞级别的优先级
NormalPriority : 正常的优先级
LowPriority : 低优先级
IdlePriority : 最低阶的优先级

*/


/**
 * 使用raf控制wookLoop的运行时长
 */

c/**
* React调度器核心实现
* 模拟React 16.x之后的Fiber架构中的调度器行为
*/

// 任务优先级常量
const ImmediatePriority = 1; // 最高优先级，立即执行（如用户输入）
const UserBlockingPriority = 2; // 用户阻塞优先级（如滚动、拖拽）
const NormalPriority = 3; // 正常优先级（如渲染列表、网络请求）
const LowPriority = 4; // 低优先级（如分析统计）
const IdlePriority = 5; // 最低优先级（如console.log）

// 任务状态
const TaskState = {
Idle: 'idle',
Scheduled: 'scheduled',
Running: 'running',
Completed: 'completed',
Cancelled: 'cancelled'
};

/**
 * 任务类 - 表示一个可调度的工作单元
 */
class Task {
constructor(priority, callback, options = {}) {
    this.id = Math.random().toString(36).substring(2, 9); // 生成唯一ID
    this.priority = priority; // 任务优先级
    this.callback = callback; // 任务执行函数
    this.options = options; // 任务配置
    
    // 计算任务过期时间
    const currentTime = performance.now();
    this.expirationTime = currentTime + this._getTimeoutForPriority(priority);
    
    this.state = TaskState.Idle; // 任务初始状态
    this.progress = 0; // 任务进度（用于支持中断恢复）
    this.scheduledTime = null; // 任务调度时间
    this.startTime = null; // 任务开始执行时间
    this.endTime = null; // 任务结束时间
}

// 根据优先级获取超时时间
_getTimeoutForPriority(priority) {
    switch (priority) {
    case ImmediatePriority:
        return -1; // 立即过期，必须马上执行
    case UserBlockingPriority:
        return 250; // 250ms后过期
    case NormalPriority:
        return 5000; // 5s后过期
    case LowPriority:
        return 10000; // 10s后过期
    case IdlePriority:
        return 1073741823; // 超大值，几乎不会过期
    default:
        return 5000;
    }
}

// 执行任务
execute(deadline) {
    if (this.state === TaskState.Completed || this.state === TaskState.Cancelled) {
    return true; // 已完成或已取消的任务直接返回
    }
    
    this.state = TaskState.Running;
    this.startTime = performance.now();
    
    try {
    // 执行任务回调，传入deadline和当前任务
    const shouldContinue = this.callback({
        timeRemaining: () => deadline.timeRemaining(),
        didTimeout: deadline.didTimeout,
        task: this
    });
    
    // 如果回调返回true，表示任务需要继续执行
    if (shouldContinue === true) {
        this.progress = (this.progress + 1) % 100; // 更新进度
        return false;
    }
    
    // 任务完成
    this.state = TaskState.Completed;
    this.endTime = performance.now();
    return true;
    } catch (error) {
    // 任务执行出错
    this.state = TaskState.Cancelled;
    this.endTime = performance.now();
    console.error(`Task execution failed:`, error);
    return true;
    }
}

// 取消任务
cancel() {
    if (this.state !== TaskState.Completed && this.state !== TaskState.Cancelled) {
    this.state = TaskState.Cancelled;
    this.endTime = performance.now();
    return true;
    }
    return false;
}
}

/**
 * 时间切片类 - 管理每一帧的时间分配
 */
class TimeSlice {
constructor() {
    this.frameDuration = 16; // 假设16ms一帧（对应60fps）
    this.deadline = 0; // 当前帧的截止时间
    this.timeRemaining = this._timeRemaining.bind(this);
    this.didTimeout = false;
}

// 开始新的一帧
startNewFrame(timestamp) {
    this.deadline = timestamp + this.frameDuration;
    this.didTimeout = false;
}

// 检查是否超时
checkTimeout(task) {
    const currentTime = performance.now();
    this.didTimeout = currentTime >= task.expirationTime;
    return this.didTimeout;
}

// 获取剩余时间
_timeRemaining() {
    const remaining = this.deadline - performance.now();
    return remaining > 0 ? remaining : 0;
}
}

/**
 * React调度器核心类
 */
class ReactScheduler {
constructor() {
    // 任务队列和当前执行状态
    this.taskQueue = [];
    this.isPerformingWork = false;
    this.currentTask = null;
    
    // 时间切片管理器
    this.timeSlice = new TimeSlice();
    
    // 使用MessageChannel实现微任务调度
    const channel = new MessageChannel();
    this.port1 = channel.port1;
    this.port2 = channel.port2;
    this.port1.onmessage = this._performWorkUntilDeadline.bind(this);
    
    // 优先级观察者（用于调试和性能监控）
    this.priorityObservers = [];
}

// 注册优先级变化观察者
addPriorityObserver(observer) {
    this.priorityObservers.push(observer);
}

// 移除优先级观察者
removePriorityObserver(observer) {
    const index = this.priorityObservers.indexOf(observer);
    if (index !== -1) {
    this.priorityObservers.splice(index, 1);
    }
}

// 通知优先级变化
_notifyPriorityChange(task, oldPriority) {
    this.priorityObservers.forEach(observer => {
    if (typeof observer.onPriorityChange === 'function') {
        observer.onPriorityChange(task, oldPriority);
    }
    });
}

// 调度任务
scheduleCallback(priority, callback, options = {}) {
    const currentTime = performance.now();
    const task = new Task(priority, callback, options);
    task.scheduledTime = currentTime;
    
    // 将任务加入队列并按过期时间排序
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => a.expirationTime - b.expirationTime);
    
    // 如果当前没有正在执行的任务，则启动调度
    if (!this.isPerformingWork) {
    this.isPerformingWork = true;
    this._startWorkLoop();
    }
    
    return task;
}

// 取消任务
cancelCallback(task) {
    const index = this.taskQueue.indexOf(task);
    if (index !== -1) {
    this.taskQueue.splice(index, 1);
    }
    return task.cancel();
}

// 提升任务优先级
increaseCallbackPriority(task, newPriority) {
    if (task.priority <= newPriority) {
    return false; // 新优先级不高于当前优先级，无需提升
    }
    
    const oldPriority = task.priority;
    task.priority = newPriority;
    
    // 重新计算过期时间
    const currentTime = performance.now();
    const timeout = task._getTimeoutForPriority(newPriority);
    task.expirationTime = currentTime + timeout;
    
    // 重新排序任务队列
    this.taskQueue.sort((a, b) => a.expirationTime - b.expirationTime);
    
    // 通知优先级变化
    this._notifyPriorityChange(task, oldPriority);
    
    return true;
}

// 开始工作循环
_startWorkLoop() {
    // 使用requestAnimationFrame触发调度，确保在渲染前执行
    requestAnimationFrame(timestamp => {
    // 设置当前帧的截止时间
    this.timeSlice.startNewFrame(timestamp);
    
    // 使用MessageChannel在下一个微任务中执行工作循环
    this.port2.postMessage(null);
    });
}

// 执行任务直到时间切片结束
_performWorkUntilDeadline() {
    // 工作循环，处理任务队列
    this._workLoop();
    
    // 如果任务队列中还有未完成的任务，继续调度
    if (this.taskQueue.length > 0) {
    this._startWorkLoop();
    } else {
    // 所有任务完成，重置状态
    this.isPerformingWork = false;
    this.currentTask = null;
    }
}

// 工作循环核心逻辑
_workLoop() {
    while (this.taskQueue.length > 0) {
    // 获取队列中最早过期的任务（优先级最高的）
    this.currentTask = this.taskQueue[0];
    
    // 检查任务是否已过期
    const didTimeout = this.timeSlice.checkTimeout(this.currentTask);
    
    // 只有当任务过期或有足够的剩余时间时才执行
    if (didTimeout || this.timeSlice.timeRemaining() > 0) {
        // 执行任务
        const isTaskFinished = this.currentTask.execute(this.timeSlice);
        
        if (isTaskFinished) {
        // 任务完成，从队列中移除
        this.taskQueue.shift();
        } else {
        // 任务需要中断，等待下一帧继续
        break;
        }
    } else {
        // 时间切片已用完，中断工作循环
        break;
    }
    }
}

// 获取当前调度器状态（用于调试）
getStatus() {
    return {
    taskCount: this.taskQueue.length,
    isPerformingWork: this.isPerformingWork,
    currentTask: this.currentTask ? {
        id: this.currentTask.id,
        priority: this.currentTask.priority,
        progress: this.currentTask.progress,
        state: this.currentTask.state
    } : null,
    timeRemaining: this.timeSlice.timeRemaining()
    };
}
}

// 创建全局调度器实例
const scheduler = new ReactScheduler();

// 导出优先级常量和调度器
export {
ImmediatePriority,
UserBlockingPriority,
NormalPriority,
LowPriority,
IdlePriority,
scheduler
};

// 示例用法
if (typeof window !== 'undefined') {
window.ReactScheduler = {
    scheduler,
    ImmediatePriority,
    UserBlockingPriority,
    NormalPriority,
    LowPriority,
    IdlePriority
};
}


//react调度器的核心：
//接受任务 将任务添加到执行列表
//取消任务：把任务的状态修改成已经取消
//执行队列里里面的任务：这里的过程分为 开始清空 并且在时间耗尽时推出 假设还有没有完成的任务  将任务添加到下一帧执行

//其余的功能 ：修改任务的优先级
// React源码简化示例
function workLoopConcurrent(deadline) {
    while (workInProgress !== null && 
           (deadline.timeRemaining() > 0 || shouldYieldToHost())) {
      // 处理一个Fiber节点
      performUnitOfWork(workInProgress);
    }
    
    // 如果还有未完成的工作，返回true表示需要继续
    return workInProgress !== null;
  }