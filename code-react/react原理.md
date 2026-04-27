# React 底层原理与架构演进

## 目录

- [一、React 核心原理](#一react-核心原理)
  - [1.1 虚拟DOM (Virtual DOM)](#11-虚拟dom-virtual-dom)
  - [1.2 Fiber 架构](#12-fiber-架构)
  - [1.3 Reconciliation 协调算法](#13-reconciliation-协调算法)
  - [1.4 渲染流程](#14-渲染流程)
- [二、React 架构演变历史](#二react-架构演变历史)
  - [2.1 React 0.x - 15: Stack Reconciler 时代](#21-react-0x---15-stack-reconciler-时代)
  - [2.2 React 16: Fiber 架构的诞生](#22-react-16-fiber-架构的诞生)
  - [2.3 React 17: 渐进式升级](#23-react-17-渐进式升级)
  - [2.4 React 18: 并发特性](#24-react-18-并发特性)
  - [2.5 React 19: 新特性展望](#25-react-19-新特性展望)
- [三、架构演变的深层考量](#三架构演变的深层考量)
- [四、性能优化手段](#四性能优化手段)

***

## 一、React 核心原理

### 1.1 虚拟DOM (Virtual DOM)

#### 1.1.1 什么是虚拟DOM

虚拟DOM是真实DOM的JavaScript对象表示。它是React的核心概念之一，本质上是一个轻量级的JavaScript对象树。

```javascript
// 真实DOM元素
const realDOM = document.createElement('div');
realDOM.className = 'container';
realDOM.innerHTML = '<p>Hello</p>';

// 虚拟DOM表示
const virtualDOM = {
  type: 'div',
  props: {
    className: 'container',
    children: {
      type: 'p',
      props: {
        children: 'Hello'
      }
    }
  }
};
```

#### 1.1.2 为什么需要虚拟DOM

**核心优势：**

1. **批量更新（Batching）**: 将多次状态变更合并为一次DOM操作
2. **跨浏览器兼容**: 抽象了不同浏览器的差异
3. **声明式编程**: 开发者只需描述UI应该是什么样子，不需要关心如何更新
4. **Diff算法优化**: 通过对比找出最小变更集 diff本质上 其实是弥补虚拟dom带来的大量的dom操作

#### 1.1.3 虚拟DOM的工作流程

```
State/Props 变更 → 生成新的 Virtual DOM → Diff 对比旧 Virtual DOM → 计算最小变更 → 批量更新真实 DOM
```

**详细步骤：**

```javascript
// 1. 初始渲染
const oldVNode = render(<App />);

// 2. 状态变化触发重新渲染
setState({ count: count + 1 });

// 3. 生成新的Virtual DOM
const newVNode = render(<App />);

// 4. Diff算法对比
const patches = diff(oldVNode, newVNode);

// 5. 应用补丁到真实DOM
patch(domElement, patches);
```

### 1.2 Fiber 架构

#### 1.2.1 Fiber是什么

Fiber是React 16中引入的新协调引擎，它是对Stack Reconciler的重写。Fiber不仅是一个数据结构，还是一个工作单元。

**Fiber节点的数据结构：**

```javascript
function FiberNode(tag, pendingProps, key, mode) {
  // 实例属性
  this.tag = tag;                    // 组件类型标记
  this.key = key;                    // 唯一键值
  this.elementType = null;           // 元素类型函数/类
  this.type = null;                  // 函数/类本身
  this.stateNode = null;             // 真实DOM或组件实例

  // Fiber结构
  this.return = null;                // 指向父Fiber
  this.child = null;                 // 第一个子Fiber
  this.sibling = null;               // 下一个兄弟Fiber
  this.index = 0;                    // 在父节点中的索引

  this.ref = null;                   // ref引用

  // 新的props
  this.pendingProps = pendingProps;
  this.memoizedProps = null;         // 上次渲染使用的props

  // 更新队列
  this.updateQueue = null;
  this.memoizedState = null;         // 上次渲染使用的state

  // 副作用
  this.mode = mode;                  // 并发模式标志
  this.effects = null;               // 子树的副作用列表
  this.effectTag = NoEffect;         // 副作用类型标记
  this.deletions = null;             // 要删除的子节点

  // 调度相关
  this.lanes = NoLanes;              // 优先级车道
  this.childLanes = NoLanes;         // 子树的优先级车道

  // 双缓存
  this.alternate = null;             // 指向workInProgress或current fiber
}
```

#### 1.2.2 Fiber的双缓存机制

React使用双缓存技术来优化渲染过程：

```javascript
// current树：正在屏幕上显示的Fiber树
// workInProgress树：正在构建中的新Fiber树

function performUnitOfWork(fiber) {
  // 1. 开始阶段：处理当前fiber
  beginWork(fiber);

  // 2. 如果有子节点，返回子节点
  if (fiber.child) {
    return fiber.child;
  }

  // 3. 如果没有子节点，完成当前fiber
  let temp = fiber;
  while (temp) {
    completeWork(temp);

    if (temp.sibling) {
      return temp.sibling;
    }
    temp = temp.return;
  }
}
```

**双缓存的优势：**

- 避免在构建过程中直接修改current树
- 可以随时中断和恢复工作
- 完成后直接切换指针，实现无缝替换

#### 1.2.3 Fiber树的结构示例

```jsx
function App() {
  return (
    <div className="app">
      <Header />
      <Main>
        <Sidebar />
        <Content />
      </Main>
      <Footer />
    </div>
  );
}

// 对应的Fiber树结构：
/*
        App (root)
          |
        div (host)
       / | \
      Hdr Main Ftr
         / \
       Sdb Cont
*/
```

#### 1.2.4 工作循环（Work Loop）深度解析

Fiber 的核心是**可中断的工作循环**，这是 React 实现并发渲染的基石。

**工作循环的本质 —— 深度优先遍历的可中断版本：**

```javascript
// React 源码中的核心工作循环
function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYieldToHost()) {
    // performUnitOfWork 处理单个 Fiber 节点
    workInProgress = performUnitOfWork(workInProgress);
  }
}

// 同步模式下的工作循环（不可中断）
function workLoopSync() {
  while (workInProgress !== null) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}
```

**performUnitOfWork 的两阶段处理 —— beginWork 与 completeWork：**

```javascript
function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;

  // ========== 阶段一：beginWork（向下遍历） ==========
  // 根据组件类型调用不同的处理函数
  let next = beginWork(current, unitOfWork, renderLanes);

  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    // 如果没有子节点，进入完成阶段
    next = completeUnitOfWork(unitOfWork);
  }

  return next;
}

// completeUnitOfWork：向上回溯，完成当前节点及其兄弟/父节点
function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;

    // ========== 阶段二：completeWork（节点完成） ==========
    // 根据 tag 类型执行不同的完成逻辑
    completeWork(current, completedWork, renderLanes);

    // 收集副作用到 effectList
    if (returnFiber !== null && (returnFiber.flags & ChildDeletion) === NoFlags) {
      if ((completedWork.flags & Deletion) !== NoFlags) {
        returnFiber.flags |= Deletion | ChildDeletion;
      }
      if ((completedWork.flags & Placement) !== NoFlags) {
        if (returnFiber.flags & Placement) {
          // 父节点已经有Placement标记，不需要重复标记
        } else {
          returnFiber.flags |= Placement;
        }
      }

      // 将当前节点的副作用链表挂载到父节点的 effectList 上
      if (completedWork.effectTagList !== null) {
        if (returnFiber.lastEffect === null) {
          returnFiber.firstEffect = completedWork.firstEffect;
          returnFiber.lastEffect = completedWork.lastEffect;
        } else {
          returnFiber.lastEffect.nextEffect = completedWork.firstEffect;
          returnFiber.lastEffect = completedWork.lastEffect;
        }
      }

      // 处理自身的 effect
      if (completedWork.flags & (Placement | Update)) {
        if (returnFiber.lastEffect === null) {
          returnFiber.firstEffect = completedWork;
          returnFiber.lastEffect = completedWork;
        } else {
          returnFiber.lastEffect.nextEffect = completedWork;
          returnFiber.lastEffect = completedWork;
        }
        completedWork.nextEffect = null;
      }
    }

    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      // 有兄弟节点，返回兄弟继续处理
      workInProgress = siblingFiber;
      return siblingFiber;
    }
    // 没有兄弟了，回到父节点
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);

  // 返回null表示整棵树处理完毕
  return null;
}
```

**beginWork 内部 —— 根据组件类型分发：**

```javascript
function beginWork(current, workInProgress, renderLanes) {
  // 1. 检查是否可以复用（bailout优化）
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;

    if (
      oldProps === newProps &&
      !hasLegacyContextChanged() &&
      (updateQueue === null || updateQueue.baseState === null)
    ) {
      // props和context都没变，尝试bailout
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }

  // 2. 根据 tag 分发到不同的更新逻辑
  switch (workInProgress.tag) {
    case FunctionComponent: {
      return updateFunctionComponent(
        current,
        workInProgress,
        SortedLanes,
        renderLanes
      );
    }
    case ClassComponent: {
      return updateClassComponent(
        current,
        workInProgress,
        SortedLanes,
        renderLanes
      );
    }
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return updateHostText(current, workInProgress);
    case Fragment:
      return updateFragment(current, workInProgress);
    // ... 更多类型
    default:
      throw new Error('Unknown unit of work tag');
  }
}
```

**Bailout 优化 —— 跳过无需更新的子树：**

```javascript
function bailoutOnAlreadyFinishedWork(current, workInProgress, lanes) {
  // 关键优化：检查子树是否有待处理的更新
  if (!includesSomeLane(renderLanes, workInProgress.childLanes)) {
    // 子树完全没有需要处理的更新，直接复用
    if (current !== null) {
      workInProgress.child = current.child;
      workInProgress.memoizedProps = current.memoizedProps;
      workInProgress.memoizedState = current.memoizedState;
      workInProgress.updateQueue = current.updateQueue;
      workInProgress.dependencies = current.dependencies;
    }
    // 返回null，跳过整个子树
    return null;
  }

  // 子树有部分更新需要处理，克隆子节点但保留引用
  cloneChildFibers(current, workInProgress);
  return workInProgress.child;
}
```

**遍历过程的可视化：**

```
以如下组件树为例：
        App
       / | \
     A   B   C
         / \
        D   E

工作循环的遍历顺序（深度优先）：
1. beginWork(App) → 进入App
2. beginWork(A)   → 进入A
3. completeWork(A) → A无子节点，完成A
4. beginWork(B)   → 进入B（A的兄弟）
5. beginWork(D)   → 进入D（B的子节点）
6. completeWork(D) → D无子节点，完成D
7. beginWork(E)   → 进入E（D的兄弟）
8. completeWork(E) → E无子节点，完成E
9. completeWork(B) → B的所有子节点完成，完成B
10. beginWork(C)   → 进入C（B的兄弟）
11. completeWork(C) → C无子节点，完成C
12. completeWork(App) → App的所有子节点完成，完成App
13. 整棵树构建完毕！
```

#### 1.2.5 副作用系统（Side Effects / Effect）详解

Fiber 的副作用系统是实现高效 DOM 更新的核心机制。每个 Fiber 节点通过 `flags`（原 `effectTag`）来标记需要执行的副作用操作。

**副作用标记位（Flags）的定义：**

```javascript
// 副作用类型标记（使用位运算，支持组合）
export const NoFlags = 0b000000000000000000000;              // 无副作用

// 副作用标记
export const Placement = 0b000000000000000000010;            // 插入DOM
export const Update = 0b000000000000000000100;               // 更新属性
export const Deletion = 0b000000000000000001000;             // 删除节点
export const ChildDeletion = 0b000000000000000010000;        // 删除子节点

export const Passive = 0b000000000000001000000;               // useEffect
export const Ref = 0b000000000000010000000;                  // ref变更
export const Snapshot = 0b000000000000100000000;              // 快照（getSnapshotBeforeUpdate）
export const Callback = 0b000000000001000000000;              // componentDidUpdate回调
export const LayoutMask = Snapshot | Callback;                // Layout阶段effect

// 生命周期相关
export const MountPassiveDevtools = 0b000000010000000000000;
export const UnmountPassiveDevtools = 0b000000100000000000000;
export const PassiveMask = MountPassiveDevtools | UnmountPassiveDevtools;

// hydration相关
export const Hydrating = 0b000001000000000000000;
export const HydratingAndUpdate = Hydrating | Update;
```

**Effect List 的链表结构：**

```javascript
// Fiber节点上的effect相关字段
class FiberNode {
  // 当前节点的副作用标记
  flags = NoFlags;

  // 子树的副作用标记（用于快速判断是否需要遍历子树）
  subtreeFlags = NoFlags;

  // 副作用链表指针
  firstEffect = null;   // 指向第一个有副作用的子节点
  lastEffect = null;    // 指向最后一个有副作用的子节点
  nextEffect = null;    // 指向下一个有副作用的节点（单向链表）

  // 删除的子节点（单独维护，因为删除的节点不在新树上）
  deletions = null;
}
```

**Effect List 的构建过程：**

```javascript
// 在completeUnitOfWork中构建effect list
function appendAllChildren(parent, workInProgress) {
  let node = workInProgress.child;
  while (node !== null) {
    if (node.tag === HostComponent || node.tag === HostText) {
      appendAllChildrenToContainer(parent, node);
    } else if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }

    if (node === workInProgress) {
      return;
    }

    while (node.sibling === null) {
      if (node.return === null || node.return === workInProgress) {
        return;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}
```

**Commit 阶段的副作用处理：**

```javascript
function commitRoot(root) {
  const { finishedWork } = root;
  
  if ((finishedWork.flags & Marked) === NoFlags) {
    // 没有任何副作用需要处理
    commitBeforeMutationEffects_begin();
    
    // ========== 第一阶段：Before Mutation ==========
    // DOM变更前执行（getSnapshotBeforeUpdate、useLayoutEffect清理等）
    commitBeforeMutationEffects(finishedWork);
    
    // ========== 第二阶段：Mutation（真正的DOM操作）==========
    // 这个阶段会实际修改DOM
    commitMutationEffects(finishedWork);
    
    // 切换current指针（双缓存切换的关键时刻！）
    root.current = finishedWork;
    
    // ========== 第三阶段：Layout（DOM变更后）==========
    // 可以安全地读取DOM布局信息
    commitLayoutEffects(finishedWork);
  }

  // 重置状态
  root.current.finishedWork = null;
}

// Mutation阶段的详细实现
function commitMutationEffects_begin(root) {
  while (nextEffect !== null) {
    const flags = nextEffect.flags;

    // 处理删除
    if (flags & ContentReset) {
      commitResetTextContent(nextEffect);
    }
    if (flags & Ref) {
      markRef(nextEffect);
    }
    if (flags & Deletion) {
      const prevSibling = nextEffect.sibling;
      const nextSibling = nextEffect.nextEffect;
      // 执行删除操作
      commitDeletion(root, nextEffect, nearestMountedAncestor);
      nextEffect = prevSibling || nextSibling;
      continue;
    }

    // 处理插入/移动
    const isParent = (flags & Placement) !== NoFlags;
    const isContentReset = (flags & ContentReset) !== NoFlags;
    const isCallback = (flags & Callback) !== NoFlags;

    if (isParent || isContentReset || isCallback) {
      // 执行实际的DOM操作
      commitReconciliationEffects(nextEffect);
    }

    // 处理更新
    if (flags & Update) {
      const current = nextEffect.alternate;
      commitWork(current, nextEffect);
    }

    nextEffect = nextEffect.nextEffect;
  }
}
```

**不同类型副作用的处理示例：**

```javascript
// Placement（插入）的处理
function commitPlacement(finishedWork) {
  // 1. 获取父级DOM节点
  const parentFiber = getHostParentFiber(finishedWork);
  const parentStateNode = parentFiber.stateNode;

  // 2. 获取兄弟DOM节点（用于insertBefore定位）
  const before = getHostSibling(finishedWork);

  // 3. 根据节点类型执行不同的插入逻辑
  if (isHostParent(finishedWork)) {
    // 原生DOM节点：直接插入
    insertOrAppendPlacementNodeIntoContainer(
      finishedWork,
      before,
      parent
    );
  } else {
    // 组件节点：递归找到真实的DOM节点并插入
    insertOrAppendPlacementNode(
      finishedWork,
      before,
      parent
    );
  }
}

// Update（更新）的处理
function commitWork(current, finishedWork) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent: {
      // 处理useEffect
      commitHookEffectListUnmount(
        flags | HookHasEffect,
        finishedWork
      );
      break;
    }
    case HostComponent: {
      const instance = finishedWork.stateNode;
      if (instance != null) {
        const newProps = finishedWork.memoizedProps;
        const oldProps = current !== null ? current.memoizedProps : newProps;
        const type = finishedWork.type;
        const updatePayload = finishedWork.updateQueue;

        // 应用属性差异到真实DOM
        finishedWork.updateQueue = null;
        if (updatePayload !== null) {
          commitUpdate(
            instance,
            updatePayload,
            type,
            oldProps,
            newProps,
            finishedWork
          );
        }
      }
      break;
    }
    case HostText: {
      const textInstance = finishedWork.stateNode;
      const newText = finishedWork.memoizedProps;
      const oldText = current !== null ? current.memoizedProps : newText;
      // 更新文本内容
      commitTextUpdate(textInstance, oldText, newText);
      break;
    }
  }
}

// Deletion（删除）的处理
function commitDeletion(finishedWork, nearestMountedAncestor) {
  // 递归卸载组件（触发componentWillUnmount、清理effects等）
  unmountHostComponents(finishedWork);

  // 从DOM中移除
  const parent = getHostParentFiber(finishedWork);
  removeChild(parent.stateNode, finishedWork.stateNode);
}
```

#### 1.2.6 调度器与时间切片原理

React 的调度器（Scheduler）是一个独立于 React Core 的包，负责管理任务的优先级调度和时间切片。

**Scheduler 的核心数据结构：**

```javascript
// 任务队列：使用最小堆（Min-Heap）实现优先级队列
var taskQueue = [];
var timerQueue = [];

// 任务对象结构
var newTask = {
  id: taskIdCounter++,           // 唯一ID
  callback,                      // 要执行的回调函数
  priorityLevel,                 // 优先级等级
  startTime,                     // 计划开始时间
  expirationTime,                // 过期时间
  sortIndex: expirationTime,     // 排序依据（默认按过期时间）
};

// 优先级等级定义（从高到低）
var ImmediatePriority = 1;       // 同步任务，不可中断
var UserBlockingPriority = 2;    // 用户阻塞任务（点击、输入）
var NormalPriority = 3;          // 正常优先级
var LowPriority = 4;             // 低优先级
var IdlePriority = 5;            // 空闲时执行
```

**调度器的核心流程：**

```javascript
function requestHostCallback(callback) {
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    port.postMessage(null);  // 通过MessageChannel触发宏任务
  }
}

port.onmessage = function () {
  if (scheduledHostCallback !== null) {
    var currentTime = getCurrentTime();
    // 计算本帧的截止时间（deadline）
    startTime = currentTime;
    deadline = currentTime + yieldInterval;  // 默认5ms
    
    var hasMoreWork = true;
    try {
      // 执行任务，直到时间片用完或没有更多任务
      hasMoreWork = scheduledHostCallback(startTime, currentTime);
    } finally {
      if (hasMoreWork) {
        // 还有任务，下一帧继续
        port.postMessage(null);
      } else {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      }
    }
  }
};
```

**时间切片的实现细节：**

```javascript
// shouldYieldToHost：判断是否应该让出主线程
function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;

  if (timeElapsed < yieldInterval) {
    // 时间片还没用完
    return false;
  }

  // 检查是否有更高优先级的任务需要处理
  if (needsPainting()) {
    // 浏览器需要绘制，让出控制权
    return true;
  }

  // 检查是否有输入事件等待处理
  if (hasInputEvent()) {
    return true;
  }

  // 时间片用完
  return timeElapsed >= yieldInterval;
}

// 动态调整时间切片长度
let yieldInterval = 5;  // 默认5ms

function forceFrameRate(fps) {
  if (fps < 0 || fps > 125) {
    console.warn('forceFrameRate takes a positive int between 0 and 125');
    return;
  }
  if (fps > 0) {
    yieldInterval = Math.floor(1000 / fps);
  } else {
    yieldInterval = 5;  // reset
  }
}
```

**MessageChannel vs requestAnimationFrame vs setTimeout：**

```javascript
// React选择MessageChannel的原因：

// 方案1：setTimeout(fn, 0)
// 问题：Chrome中最小延迟4ms，精度不够；会被节流
setTimeout(callback, 0);  // 实际延迟约4-5ms

// 方案2：requestAnimationFrame
// 问题：只在浏览器重绘前触发，如果浏览器标签页不活跃就不会执行
requestAnimationFrame(callback);

// 方案3：MessageChannel ✅（React的选择）
// 优势：
// - 精度高，可以立即触发
// - 是宏任务，不会阻塞渲染
// - 在不活跃标签页也能正常工作
const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = function () {
  // 这里执行调度回调
  performWorkUntilDeadline();
};

// 触发调度
function schedulePerformWorkUntilDeadline() {
  port.postMessage(null);
}
```

**任务调度的完整生命周期：**

```javascript
// 1. 创建调度任务
function scheduleCallback(priorityLevel, callback, options) {
  const currentTime = getCurrentTime();

  var startTime;
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay;
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay;
    } else {
      startTime = currentTime;
    }
  } else {
    startTime = currentTime;
  }

  var timeout;
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = IMMEDIATE_PRIORITY_TIMEOUT;  // -1（立即过期）
      break;
    case UserBlockingPriority:
      timeout = USER_BLOCKING_PRIORITY_TIMEOUT;  // 250ms
      break;
    case IdlePriority:
      timeout = IDLE_PRIORITY_TIMEOUT;  // 永不过期
      break;
    case LowPriority:
      timeout = LOW_PRIORITY_TIMEOUT;  // 10000ms
      break;
    case NormalPriority:
    default:
      timeout = NORMAL_PRIORITY_TIMEOUT;  // 5000ms;
      break;
  }

  var expirationTime = startTime + timeout;

  var newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1,
  };

  if (startTime > currentTime) {
    // 延迟任务：放入timerQueue
    newTask.sortIndex = startTime;
    push(timerQueue, newTask);
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // 这是timerQueue中最早的任务，设置定时器
      if (isHostTimeoutScheduled === null) {
        isHostTimeoutScheduled = true;
        // 使用setTimeout设置延迟执行
        requestHostTimeout(handleTimeout, startTime - currentTime);
      }
    }
  } else {
    // 即时任务：放入taskQueue
    newTask.sortIndex = expirationTime;
    push(taskQueue, newTask);
    // 开始调度
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }

  return newTask;
}

// 2. 刷新任务队列
function flushWork(initialTime) {
  isHostCallbackScheduled = false;
  isPerformingWork = true;

  try {
    // 将timerQueue中到期的任务移入taskQueue
    advanceTimers(initialTime);
    return flushWorkHelper(initialTime);
  } finally {
    isPerformingWork = false;
    // 检查是否还有剩余任务
    if (scheduleHostCallbackIfNeeded !== null) {
      scheduleHostCallbackIfNeeded = true;
      requestHostCallback(flushWork);
    } else {
      // 所有任务完成
      const remainingTime = getTimeRemaining();
      if (remainingTime <= 0) {
        // 时间已到，可能还有timerQueue中的任务
        advanceTimers(getCurrentTime());
      }
    }
  }
}

// 3. 实际执行任务的辅助函数
function flushWorkHelper(initialTime) {
  currentTime = initialTime;

  let currentTask = peek(taskQueue);
  while (currentTask !== null) {
    if (currentTask.expirationTime > currentTime && shouldYieldToHost()) {
      // 任务还没过期且时间片用完，中断执行
      break;
    }

    const callback = currentTask.callback;
    if (callback !== null) {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      
      // 执行回调
      const continuationCallback = callback(currentTask.expirationTime);
      
      if (typeof continuationCallback === 'function') {
        // 任务返回了一个函数（说明任务还没完成），放回队列
        currentTask.callback = continuationCallback;
      } else {
        // 任务已完成，从队列移除
        pop(taskQueue);
      }
    } else {
      pop(taskQueue);
    }
    
    currentTask = peek(taskQueue);
  }

  // 返回是否还有未完成的任务
  return currentTask !== null;
}
```

#### 1.2.7 更新队列与状态管理机制

每个 Fiber 节点都维护着一个更新队列（Update Queue），用于存储所有待处理的 state 更新。

**Update 对象的数据结构：**

```javascript
const update = {
  lane,                    // 优先级车道
  action,                  // 更新动作（setState的参数）
  eagerReducer: null,      // 优化的reducer（用于提前计算）
  eagerState: null,        // 优化的state（用于提前计算）
  next: null,              // 指向下一个update（环形链表）
};
```

**Update Queue 的结构：**

```javascript
// 单向环形链表结构
class UpdateQueue {
  baseState = null;           // 基础状态（上次计算的结果）
  firstBaseUpdate = null;     // 第一个基础更新
  lastBaseUpdate = null;      // 最后一个基础更新
  shared = {
    pending: null,            // 待处理的更新（来自多个setState调用）
  };
  fibers = null;              // 关联的fiber列表
}
```

**更新入队的过程：**

```javascript
function dispatchSetState(fiber, queue, action) {
  // 1. 获取当前更新的优先级lane
  const lane = requestUpdateLane(fiber);

  // 2. 创建update对象
  const update = {
    lane,
    action,
    eagerReducer: null,
    eagerState: null,
    next: null,
  };

  // 3. 入队（追加到环形链表尾部）
  if (queue.pending === null) {
    // 第一个update，指向自己形成环
    update.next = update;
  } else {
    update.next = queue.pending.next;
    queue.pending.next = update;
  }
  queue.pending = update;

  // 4. 优化：尝试提前计算eager state
  const alternate = fiber.alternate;
  if (
    fiber.lanes === NoLanes &&
    (alternate === null || alternate.lanes === NoLanes)
  ) {
    const lastRenderedReducer = queue.lastRenderedReducer;
    if (lastRenderedReducer !== null) {
      let prevEagerState;
      if (queue.lastRenderedStateOverride !== null) {
        prevEagerState = queue.lastRenderedStateOverride;
      } else {
        prevEagerState = queue.lastRenderedState;
      }
      const eagerState = lastRenderedReducer(action, prevEagerState);
      update.eagerReducer = lastRenderedReducer;
      update.eagerState = eagerState;
      
      if (Object.is(eagerState, prevEagerState)) {
        // state没变，可以直接bailout
        return;
      }
    }
  }

  // 5. 调度更新
  const eventTime = requestEventTime();
  const root = markUpdate(fiber);
  scheduleUpdateOnFiber(fiber, lane, eventTime);
}
```

**更新处理的完整流程：**

```javascript
function processUpdateQueue(workInProgress, props, instance, renderLanes) {
  const queue = workInProgress.updateQueue;
  let baseQueue = queue.baseQueue;
  let pendingQueue = queue.shared.pending;

  // 1. 合并pending updates到baseQueue
  if (pendingQueue !== null) {
    const pending = pendingQueue;
    queue.shared.pending = null;

    const lastPendingUpdate = pending;
    const firstPendingUpdate = pending.next;

    if (baseQueue !== null) {
      const lastBaseUpdate = baseQueue.next;
      lastBaseUpdate.next = firstPendingUpdate;
      pending.next = lastBaseUpdate;
    }

    baseQueue = pending;
    queue.baseQueue = baseQueue;
  }

  // 2. 处理baseQueue中的所有updates
  if (baseQueue !== null) {
    const first = baseQueue.next;
    let newState = queue.baseState;
    let newBaseState = null;
    let newBaseQueueFirst = null;
    let newBaseQueueLast = null;
    let update = first;

    do {
      const updateLane = update.lane;
      if (!isSubsetOfLanes(renderLanes, updateLane)) {
        // 优先级不够，跳过这个update（保留到下次处理）
        const clone = {
          lane: updateLane,
          action: update.action,
          eagerReducer: update.eagerReducer,
          eagerState: update.eagerState,
          next: null,
        };
        if (newBaseQueueLast === null) {
          newBaseQueueFirst = newBaseQueueLast = clone;
          newBaseState = newState;
        } else {
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }
      } else {
        // 优先级足够，处理这个update
        if (newBaseQueueLast !== null) {
          const clone = {
            lane: NoLane,
            action: update.action,
            eagerReducer: update.eagerReducer,
            eagerState: update.eagerState,
            next: null,
          };
          newBaseQueueLast = newBaseQueueLast.next = clone;
        }

        // 使用eager state优化
        if (update.eagerReducer === lastRenderedReducer) {
          newState = update.eagerState;
        } else {
          // 正常计算新state
          action = update.action;
          if (action instanceof Function) {
            newState = action(newState);
          } else {
            newState = action;
          }
        }
      }
      update = update.next;
    } while (update !== null && update !== first);

    if (newBaseQueueLast === null) {
      newBaseState = newState;
    } else {
      newBaseQueueLast.next = newBaseQueueFirst;
    }

    queue.baseState = newBaseState;
    queue.baseQueue = newBaseQueueLast;
    queue.lastRenderedState = newState;
  }

  return [newState, queue];
}
```

**Hooks 状态与 Fiber 的关联：**

```javascript
// Hook的数据结构
function Hook(memoizedState, baseState, baseQueue, queue, next) {
  this.memoizedState = memoizedState;  // 最新的状态值
  this.baseState = baseState;          // 基础状态
  this.baseQueue = baseQueue;          // 基础更新队列
  this.queue = queue;                  // 当前更新队列
  this.next = next;                    // 下一个hook（链表结构）
}

// Fiber节点上存储hooks链表
const fiber = {
  memoizedState: hook1,  // 第一个hook
};

// hooks链表示例：useState + useEffect + useState
/*
  fiber.memoizedState → hook1(useState: count)
                          ↓
                        hook2(useEffect: effect)
                          ↓
                        hook3(useState: name)
*/
```

#### 1.2.8 中断恢复与错误处理机制

Fiber 架构的一个关键能力是**可中断性**——渲染过程可以被暂停并在之后恢复。

**中断点的保存与恢复：**

```javascript
// 全局变量保存中断时的状态
let workInProgress = null;       // 当前正在处理的Fiber
let workInProgressRoot = null;   // 当前正在处理的根Fiber
let workInProgressRootRenderLanes = NoLanes;  // 当前的渲染lanes
let workInProgressRootExitStatus = RootIncomplete;  // 渲染退出状态
let workInProgressRootFatalError = null;  // 致命错误
let workInProgressRootSkippedLanes = NoLanes;  // 被跳过的lanes
let workInProgressRootInterleavedUpdatedLanes = NoLanes;  // 交错更新的lanes
let workInProgressRootPingedLanes = NoLanes;  // 被ping的lanes

// 中断发生时
function interruptWork() {
  // 保存当前进度到root上
  workInProgressRoot = workInProgress;
  // workInProgress树已经包含了所有中间状态
  // 下次恢复时直接从这里继续
}

// 恢复工作时
function restoreWork(root, lanes) {
  // 从之前中断的地方恢复
  prepareFreshStack(root, lanes);
  workLoopConcurrent();  // 继续工作循环
}

function prepareFreshStack(root, lanes) {
  root.finishedWork = null;
  root.finishedLanes = NoLanes;

  // 克隆current树作为workInProgress树的起点
  const workInProgress = createWorkInProgress(root.current, null);
  root.workInProgress = workInProgress;
  workInProgressRoot = root;
  workInProgressRootRenderLanes = lanes;
  workInProgressRootInterleavedUpdatedLanes = root.pendingLanes;
  
  return workInProgress;
}
```

**错误边界的 Fiber 层面实现：**

```javascript
// 错误捕获机制
function renderRootSync(root, lanes) {
  let exitStatus = RootInProgress;

  do {
    try {
      workLoopSync();
      break;
    } catch (thrownValue) {
      handleError(root, thrownValue);  // 处理错误
    }
  } while (true);

  return exitStatus;
}

function renderRootConcurrent(root, lanes) {
  let exitStatus = RootInProgress;

  do {
    try {
      workLoopConcurrent();
      break;
    } catch (thrownValue) {
      handleError(root, thrownValue);
    }
  } while (true);

  return exitStatus;
}

// 错误处理器
function handleError(root, thrownValue) {
  do {
    try {
      // 1. 向上查找最近的Error Boundary
      const errorBoundary = findNearestErrorBoundary(workInProgress);
      
      if (errorBoundary !== null) {
        // 2. 找到了Error Boundary
        const errorInfo = createErrorInfo(thrownValue);
        
        // 3. 标记Error Boundary需要触发componentDidCatch
        errorBoundary.flags |= ShouldCapture;
        
        // 4. 将错误信息附加到Error Boundary上
        errorBoundary.captureError = {
          value: thrownValue,
          stack: errorInfo.componentStack,
        };
        
        // 5. 跳过当前子树，直接complete Error Boundary
        workInProgress = errorBoundary;
        completeUnitOfWork(errorBoundary);
        return;
      }
      
      // 6. 没有找到Error Boundary，抛出到最顶层
      throw thrownValue;
    } catch (error) {
      // 继续向上查找
      thrownValue = error;
      workInProgress = workInProgress.return;
    }
  } while (workInProgress !== null);
}

// 查找最近的Error Boundary
function findNearestErrorBoundary(workInProgress) {
  let node = workInProgress;
  while (node !== null) {
    const tag = node.tag;
    
    // ClassComponent 且实现了 getDerivedStateFromError 或 componentDidCatch
    if (tag === ClassComponent) {
      const prototype = node.type.prototype;
      if (
        typeof prototype.getDerivedStateFromError === 'function' ||
        typeof prototype.componentDidCatch === 'function'
      ) {
        return node;
      }
    }
    
    node = node.return;
  }
  
  return null;
}
```

**高优先级更新打断低优先级更新的处理：**

```javascript
// 场景：用户在过渡更新过程中触发了点击事件
function checkForForceUpdatePriority() {
  // 检查是否有更高优先级的更新进入
  const pendingLanes = workInProgressRoot.pendingLanes;
  
  if (pendingLanes !== NoLanes) {
    const nextLanes = getNextLanes(pendingLanes, NoLanes);
    const newCallbackPriority = getHighestPriorityLane(nextLanes);
    const currentCallbackPriority = getHighestPriorityLane(workInProgressRootRenderLanes);
    
    if (newCallbackPriority < currentCallbackPriority) {
      // 发现了更高优先级的更新！
      // 放弃当前的渲染工作
      workInProgressRootExitStatus = RootInProgress;
      
      // 标记哪些lanes已经完成了
      const alreadyFinishedLanes = workInProgressRoot.renderedLanes;
      workInProgressRootSkippedLanes |= alreadyFinishedLanes;
      
      // 重新调度，优先处理高优先级更新
      ensureRootIsScheduled(root, currentTime);
      return true;  // 表示被打断了
    }
  }
  
  return false;
}

// 被打断后的重新渲染
function handleForceUpdate(root) {
  // 之前的workInProgress作废
  const finishedWork = root.finishedWork;
  
  if (finishedWork !== null) {
    // 完成提交（如果有部分完成的话）
    commitRoot(root);
  }
  
  // 以最新的状态重新开始渲染
  prepareFreshStack(root, root.pendingLanes);
  workLoopConcurrent();
}
```

### 1.3 Reconciliation 协调算法

#### 1.3.1 Diff算法的核心原则

React的Diff算法遵循三个策略：

1. **只对同层节点进行比较**：不会跨层级移动DOM
2. **不同类型的元素会产生不同的树**：如果节点类型改变，会销毁重建
3. **通过key标识子元素**：开发者可以通过key来提示哪些元素是稳定的

#### 1.3.2 Diff算法的具体实现

**Tree Diff（树对比）：**

```javascript
function reconcileChildren(returnFiber, currentFirstChild, newChild) {
  if (typeof newChild === 'object' && newChild !== null) {
    switch (newChild.$$typeof) {
      case REACT_ELEMENT_TYPE:
        return placeSingleElement(
          returnFiber,
          currentFirstChild,
          newChild
        );
      case REACT_PORTAL_TYPE:
        // 处理Portal
        break;
    }

    if (isArray(newChild)) {
      return reconcileChildrenArray(
        returnFiber,
        currentFirstChild,
        newChild
      );
    }
  }

  // 处理文本节点等...
}
```

**Component Diff（组件对比）：**

```javascript
function reconcileSingleElement(returnFiber, currentFirstChild, element) {
  const key = element.key;
  let child = currentFirstChild;

  while (child !== null) {
    if (child.key === key) {
      switch (child.tag) {
        case FunctionComponent:
        case ClassComponent:
        case HostComponent: {
          if (child.elementType === element.type) {
            // 类型相同，复用并更新props
            deleteRemainingChildren(returnFiber, child.sibling);
            const existing = useFiber(child, element.props);
            existing.return = returnFiber;
            return existing;
          }
          // 类型不同，删除所有旧节点
          deleteRemainingChildren(returnFiber, child);
          break;
        }
      }
    } else {
      deleteChild(returnFiber, child);
    }
    child = child.sibling;
  }

  // 创建新节点
  const created = createFiberFromElement(element, returnFiber.mode, lanes);
  created.return = returnFiber;
  return created;
}
```

**Element Diff（元素对比）- 同层列表Diff：**

这是最复杂的部分，使用了\*\*最长递增子序列（LIS）\*\*算法：

```javascript
function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren) {
  // 第一轮遍历：处理更新的节点
  let resultingFirstChild = null;
  let previousNewFiber = null;
  let oldFiber = currentFirstChild;
  let lastPlacedIndex = 0;
  let newIdx = 0;
  let nextOldFiber = null;

  for (; oldFiber !== null && newIdx < newChildren.length; newIdx++) {
    if (oldFiber.index > newIdx) {
      nextOldFiber = oldFiber;
      oldFiber = null;
    } else {
      nextOldFiber = oldFiber.sibling;
    }

    const newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx]);

    if (newFiber === null) {
      if (oldFiber === null) {
        oldFiber = nextOldFiber;
      }
      break;
    }

    if (shouldTrackSideEffects) {
      if (oldFiber && newFiber.alternate === null) {
        newFiber.flags = Placement;
      }
    }

    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

    if (previousNewFiber === null) {
      resultingFirstChild = newFiber;
    } else {
      previousNewFiber.sibling = newFiber;
    }
    previousNewFiber = newFiber;
    oldFiber = nextOldFiber;
  }

  // 第二轮遍历：处理新增的节点
  if (newIdx === newChildren.length) {
    deleteRemainingChildren(returnFiber, oldFiber);
    return resultingFirstChild;
  }

  if (oldFiber === null) {
    for (; newIdx < newChildren.length; newIdx++) {
      const newFiber = createChild(returnFiber, newChildren[newIdx]);
      if (newFiber === null) continue;

      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
    return resultingFirstChild;
  }

  // 第三轮：处理移动的节点（使用LIS算法）
  const existingChildren = mapRemainingChildren(returnFiber, oldFiber);

  for (; newIdx < newChildren.length; newIdx++) {
    const newFiber = updateFromMap(
      existingChildren,
      returnFiber,
      newIdx,
      newChildren[newIdx]
    );

    if (newFiber !== null) {
      if (shouldTrackSideEffects) {
        if (newFiber.alternate !== null) {
          newFiber.flags = Placement;
        }
      }

      lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);

      if (previousNewFiber === null) {
        resultingFirstChild = newFiber;
      } else {
        previousNewFiber.sibling = newFiber;
      }
      previousNewFiber = newFiber;
    }
  }

  // 标记未匹配的旧节点为删除
  if (shouldTrackSideEffects) {
    existingChildren.forEach((child) => deleteChild(returnFiber, child));
  }

  return resultingFirstChild;
}
```

#### 1.3.3 Key的作用与最佳实践

**为什么需要Key：**

```jsx
// ❌ 不好的做法：使用index作为key
{items.map((item, index) => (
  <Item key={index} data={item} />
))}

// ✅ 好的做法：使用稳定的唯一ID
{items.map(item => (
  <Item key={item.id} data={item} />
))}
```

**Key的底层机制：**

```javascript
// React如何使用key进行复用判断
function updateSlot(returnFiber, oldFiber, newChild) {
  const key = oldFiber !== null ? oldFiber.key : null;

  if (typeof newChild === 'string' || typeof newChild === 'number') {
    // 文本节点只能复用没有key或者key为null的旧节点
    if (key !== null) {
      return null;
    }
    return updateTextNode(returnFiber, oldFiber, '' + newChild);
  }

  if (typeof newChild === 'object' && newChild !== null) {
    switch (newChild.$$typeof) {
      case REACT_ELEMENT_TYPE: {
        if (newChild.key === key) {
          switch (oldFiber.tag) {
            case FunctionComponent:
            case ClassComponent:
            case HostComponent:
              // key相同，检查type是否相同
              if (newChild.type === oldFiber.type) {
                return updateElement(returnFiber, oldFiber, newChild);
              }
              break;
          }
        }
        return null;
      }
    }
  }

  return null;
}
```

### 1.4 渲染流程

#### 1.4.1 完整的渲染生命周期

```
┌─────────────────────────────────────────────────────────────┐
│                     Render Phase                            │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐    │
│  │  Schedule    │ → │  Reconcile   │ → │   Commit     │    │
│  │  (调度)       │   │  (协调/Diff)  │   │  (提交)      │    │
│  └──────────────┘   └──────────────┘   └──────────────┘    │
│                                                              │
│  可中断                 可中断               不可中断         │
└─────────────────────────────────────────────────────────────┘
```

#### 1.4.2 调度器（Scheduler）

React 18引入了优先级调度系统：

```javascript
// 优先级等级
const ImmediatePriority = 1;     // 同步任务（用户交互）
const UserBlockingPriority = 2;  // 用户阻塞（点击、输入）
const NormalPriority = 3;        // 正常优先级
const LowPriority = 4;           // 低优先级（数据分析）
const IdlePriority = 5;          // 空闲时执行（离屏渲染）

// 调度示例
function scheduleCallback(priorityLevel, callback, options) {
  const currentTime = getCurrentTime();

  const startTime = options?.delay ?? currentTime;
  const timeout = computeTimeout(priorityLevel);

  const newNode = {
    callback,
    priorityLevel,
    startTime,
    expirationTime: startTime + timeout,
    sortIndex: -1,
  };

  if (startTime > currentTime) {
    // 延迟任务
    newNode.sortIndex = startTime;
    push(timerQueue, newNode);
  } else {
    // 即时任务
    newNode.sortIndex = expirationTime;
    push(taskQueue, newNode);

    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true;
      requestHostCallback(flushWork);
    }
  }

  return newNode;
}
```

#### 1.4.3 Lane模型（车道模型）

Lane是React 18中用于表示优先级的位运算系统：

```javascript
export const TotalLanes = 31;

// 同步车道：用于离散事件（点击、键盘）
export const SyncLane = 0b0000000000000000000000000000001;
export const SyncDefaultLanes = 0b0000000000000000000000000000011;

// 输入连续车道：用于连续事件（拖动、滚动）
export const InputContinuousHydrationLane = 0b0000000000000000000000000000100;
export const InputContinuousLane = 0b0000000000000000000000000001000;

// 默认车道：正常更新
export const DefaultHydrationLane = 0b0000000000000000000000000010000;
export const DefaultLane = 0b0000000000000000000000000100000;

// 过渡车道：非紧急更新（搜索建议等）
export const TransitionHydrationLane = 0b0000000000000000000000001000000;
export const TransitionLanes = 0b0000000000001111111111110000000;

// 重试车道
export const RetryLanes = 0b0000111111110000000000000000000;

// 选择性水合车道
export const SelectiveHydrationLane = 0b0001000000000000000000000000000;

// 空闲车道
export const IdleHydrationLane = 0b0010000000000000000000000000000;
export const IdleLanes = 0b1100000000000000000000000000000;

// 离屏车道
export const OffscreenLane = 0b1000000000000000000000000000000;

// Lane操作工具函数
function getHighestPriorityLanes(lanes) {
  return lanes & -lanes;  // 获取最低位的1，即最高优先级
}

function mergeLanes(a, b) {
  return a | b;  // 合并lanes
}

function removeLanes(set, subset) {
  return set & ~subset;  // 移除特定lanes
}

function isSubsetOfLanes(set, subset) {
  return (set & subset) === subset;  // 判断是否包含
}
```

***

## 二、React 架构演变历史

### 2.1 React 0.x - 15: Stack Reconciler 时代

#### 2.1.1 Stack Reconciler的工作方式

```javascript
// Stack Reconciler 使用递归调用栈
function renderComponent(component) {
  // 1. 调用render方法获取Virtual DOM
  const vnode = component.render();

  // 2. 递归渲染子组件（同步、不可中断）
  if (vnode.component) {
    renderComponent(vnode.component);  // 递归调用
  }

  // 3. 更新DOM
  updateDOM(vnode);
}
```

**特点：**

- 使用 JavaScript 调用栈进行递归
- 一旦开始就无法中断
- 更新是同步的、原子的

#### 2.1.2 Stack Reconciler的问题

**问题1：主线程阻塞**

```javascript
// 大型组件树的渲染会阻塞主线程
function LargeComponentTree() {
  return (
    <div>
      {Array(10000).fill(0).map((_, i) => (
        <HeavyComponent key={i} data={largeData[i]} />
      ))}
    </div>
  );

  // 问题：这10000个组件必须一次性渲染完才能响应用户输入
  // 用户会感受到明显的卡顿
}
```

**问题2：无法实现优先级调度**

```javascript
// 所有更新都是同等优先级
setState({ type: 'typing' });      // 用户输入 - 应该高优先级
setState({ data: analytics });     // 数据分析 - 可以低优先级
// 但两者都会立即执行，无法区分优先级
```

**问题3：无法实现时间切片**

```javascript
// 无法将工作分解成小块
function render() {
  // 必须一次性完成整个树的渲染
  // 无法让出控制权给浏览器处理高优先级任务
  for (let i = 0; i < components.length; i++) {
    processComponent(components[i]);  // 不能被打断
  }
}
```

### 2.2 React 16: Fiber 架构的诞生

#### 2.2.1 Fiber的设计目标

React团队在2016年发布了关于Fiber的[官方说明](https://github.com/acdlite/react-fiber-architecture)，明确了设计目标：

1. **可中断的渲染**：将渲染工作分解为小单元
2. **优先级调度**：不同更新可以有不同的优先级
3. **并发渲染**：准备支持后台渲染
4. **更好的错误处理**：错误边界(Error Boundaries)

#### 2.2.2 Fiber的实现原理

**工作循环（Work Loop）：**

```javascript
function workLoop(isYieldy) {
  while (workInProgress !== null && !shouldYield()) {
    workInProgress = performUnitOfWork(workInProgress);
  }
}

function shouldYield() {
  // 检查是否有更高优先级的任务
  // 或者时间片是否用完
  const currentTime = getCurrentTime();
  if (currentTime >= deadline) {
    return true;  // 需要让出主线程
  }
  return false;
}
```

**Fiber的两个阶段：**

```javascript
// 阶段1：Render/Reconciliation阶段（可中断）
function renderRoot(root) {
  do {
    try {
      workLoopSync();  // 或 workLoopConcurrent()
      break;
    } catch (thrownValue) {
      handleError(root, thrownValue);
    }
  } while (true);

  // 准备提交
  const finishedWork = root.current.alternate;
  root.finishedWork = finishedWork;
}

// 阶段2：Commit阶段（不可中断）
function commitRoot(root) {
  const finishedWork = root.finishedWork;

  // 1. Before Mutation阶段（DOM变更前）
  commitBeforeMutationEffects(finishedWork);

  // 2. Mutation阶段（DOM变更）
  commitMutationEffects(finishedWork);

  // 切换current指针
  root.current = finishedWork;

  // 3. Layout阶段（DOM变更后，可读取布局信息）
  commitLayoutEffects(finishedWork);
}
```

#### 2.2.3 React 16的其他重要改进

**Error Boundaries（错误边界）：**

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

// 使用
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>
```

**Portal（传送门）：**

```jsx
class Modal extends React.Component {
  render() {
    return ReactDOM.createPortal(
      this.props.children,
      document.getElementById('modal-root')
    );
  }
}
```

**Fragments（片段）：**

```jsx
// React 16.2+
function Columns() {
  return (
    <>
      <td>Hello</td>
      <td>World</td>
    </>
  );
}
```

### 2.3 React 17: 渐进式升级

#### 2.3.1 渐进式升级的策略

React 17的主要目标是允许React应用的渐进式升级：

```javascript
// 嵌套不同版本的React成为可能
// 外层使用React 17
import React17 from 'react17';

// 内层可以使用React 16
import React16 from 'react16';

function App() {
  return (
    <React17.Component>
      {/* 这个组件内部可以使用React 16 */}
      <LegacyComponent />
    </React17.Component>
  );
}
```

**事件系统的改进：**

```javascript
// React 16及之前：事件委托到document
document.addEventListener('click', reactEventHandler);

// React 17+：事件委托到根容器
rootContainer.addEventListener('click', reactEventHandler);

// 这使得多个React版本可以共存
```

#### 2.3.2 其他改进

- 改进的`onChange`事件处理
- 移除了事件池化（Event Pooling）
- 更好的堆栈跟踪

### 2.4 React 18: 并发特性

#### 2.4.1 Concurrent Mode（并发模式）

**什么是并发：**

```javascript
// 并发 ≠ 并行
// 并发：多个任务交替执行（时间分片）
// 并行：多个任务同时执行（多核CPU）

// React的并发：
// - 单线程环境
// - 通过时间切片实现"同时"处理多个任务
// - 高优先级任务可以打断低优先级任务
```

**开启并发模式：**

```jsx
// React 18 创建根节点的方式改变
// 旧方式（不支持并发）
ReactDOM.render(<App />, container);

// 新方式（支持并发）
const root = ReactDOM.createRoot(container);
root.render(<App />);
```

#### 2.4.2 自动批处理（Automatic Batching）

```javascript
// React 17：只有在事件处理函数中才会批处理
function handleClick() {
  setState1(prev => prev + 1);  // 不会立即re-render
  setState2(prev => prev + 1);  // 不会立即re-render
  // 只会在事件结束时统一re-render一次
}

// 但这些情况不会批处理：
fetchData().then(() => {
  setState1(data1);  // 立即re-render
  setState2(data2);  // 再次re-render
});

setTimeout(() => {
  setState1(data1);  // 立即re-render
  setState2(data2);  // 再次re-render
});

// React 18：所有更新都会自动批处理
function handleClick() {
  fetch('/api').then(() => {
    setState1(data1);  // 不会立即re-render
    setState2(data2);  // 不会立即re-render
    // 统一re-render一次 ✅
  });
}

// 如果需要退出批处理
import { flushSync } from 'react-dom';

flushSync(() => {
  setImmediate(data);  // 强制同步更新
});
```

#### 2.4.3 Transitions（过渡）

```jsx
import { useState, useTransition } from 'react';

function SearchComponent() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const value = e.target.value;

    // 紧急更新：更新输入框（高优先级）
    setInput(value);

    // 过渡更新：搜索结果（低优先级）
    startTransition(() => {
      const results = search(value);  // 可能很耗时
      setResults(results);
    });
  }

  return (
    <div>
      <input value={input} onChange={handleChange} />
      {isPending ? <Spinner /> : <ResultList items={results} />}
    </div>
  );
}
```

**Transitions的实现原理：**

```javascript
// 底层使用Transition lane
function startTransition(scope) {
  const prevTransition = ReactCurrentBatchConfig.transition;
  ReactCurrentBatchConfig.transition = {};
  
  try {
    scope();
  } finally {
    ReactCurrentBatchConfig.transition = prevTransition;
  }
}

// 在setState时检测transition上下文
function dispatchSetState(fiber, queue, action) {
  const lane = requestUpdateLane(fiber);
  
  // 如果在transition中，使用低优先级lane
  if (ReactCurrentBatchConfig.transition !== null) {
    if (currentEventPriority === DiscreteEventPriority) {
      // 使用Transition lane而非Discrete lane
      lane = claimNextTransitionLane();
    }
  }
  
  const update = {
    lane,
    action,
    eagerReducer: null,
    eagerState: null,
    next: null,
  };

  enqueueUpdate(fiber, queue, update);
  scheduleUpdateOnFiber(fiber, lane, eventTime);
}
```

#### 2.4.4 Suspense 与数据获取

**Suspense的基本用法：**

```jsx
import { Suspense } from 'react';

function ProfilePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ProfileDetails />
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />
      </Suspense>
    </Suspense>
  );
}
```

**配合数据获取库：**

```javascript
// 使用React Cache和Server Components
import { cache } from 'react';

const getUserData = cache(async (id) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
});

async function UserProfile({ userId }) {
  const user = await getUserData(userId);
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// 在父组件中使用Suspense
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile userId={123} />
    </Suspense>
  );
}
```

#### 2.4.5 useDeferredValue 和 useId

```jsx
import { useState, useDeferredValue, useId } from 'react';

function SearchExample() {
  const [value, setValue] = useState('');
  
  // 延迟更新：value会立即更新，但deferredValue会延迟更新
  const deferredValue = useDeferredValue(value);
  
  const id = useId();  // 生成唯一稳定ID
  
  return (
    <div>
      <label htmlFor={id}>搜索：</label>
      <input
        id={id}
        value={value}
        onChange={e => setValue(e.target.value)}
      />
      
      {/* 使用延迟的值进行昂贵计算 */}
      <ExpensiveList query={deferredValue} />
    </div>
  );
}
```

### 2.5 React 19: 新特性展望

#### 2.5.1 Server Components（服务器组件）

```jsx
// ServerComponent.server.jsx - 在服务器上运行
import db from './database';
import ClientComponent from './ClientComponent.client';

async function BlogPost({ id }) {
  // 直接访问数据库（只在服务器端执行）
  const post = await db.posts.find(id);
  
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      
      {/* 只有交互部分才发送给客户端 */}
      <ClientComponent postId={post.id} />
    </article>
  );
}
```

**Server Components的优势：**

- 减少客户端JS bundle大小
- 直接访问后端资源
- 自动代码分割
- 流式渲染

#### 2.5.2 Compiler（React Compiler）

```jsx
// 以前需要手动优化
function TodoList({ todos }) {
  // 手动memoization
  const filteredTodos = useMemo(() => {
    return todos.filter(todo => !todo.completed);
  }, [todos]);

  return (
    <ul>
      {filteredTodos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

// 使用React Compiler后，自动优化
function TodoList({ todos }) {
  // Compiler自动添加memoization
  const filteredTodos = todos.filter(todo => !todo.completed);
  
  return (
    <ul>
      {filteredTodos.map(todo => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
```

***

## 三、架构演变的深层考量

### 3.1 从同步到异步的转变动机

#### 3.1.1 用户体验的挑战

**问题场景：**

```javascript
// 场景：大型列表的筛选
function FilterableList({ items }) {
  const [filter, setFilter] = useState('');

  return (
    <>
      <input 
        value={filter}
        onChange={(e) => setFilter(e.target.value)}  // 每次输入都触发更新
      />
      <ul>
        {items.filter(item => item.includes(filter)).map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}

// 问题：当items有10000条时，每次按键都会导致：
// 1. 重新渲染10000个li元素
// 2. 主线程被占用50ms+
// 3. 用户输入卡顿，体验极差
```

**解决方案演进：**

```javascript
// 方案1：防抖（Debounce）- 牺牲实时性
const debouncedFilter = debounce(filter, 300);

// 方案2：时间切片（Time Slicing）- React的选择
// 将10000个元素的渲染分散到多个帧
function renderWithTimeSlicing(items) {
  const chunkSize = 20;  // 每次只处理20个
  let index = 0;

  function renderChunk() {
    const end = Math.min(index + chunkSize, items.length);
    
    for (; index < end; index++) {
      renderItem(items[index]);
    }

    if (index < items.length) {
      // 让出主线程，下一帧继续
      requestAnimationFrame(renderChunk);
    }
  }

  renderChunk();
}
```

#### 3.1.2 性能瓶颈的分析

**JavaScript单线程的限制：**

```javascript
// 浏览器的主线程职责：
// 1. 执行JavaScript
// 2. 计算样式（Style）
// 3. 布局计算（Layout）
// 4. 绘制（Paint）
// 5. 处理用户输入事件

// 60fps的要求：每帧只有16.67ms
// 如果JS执行超过这个时间，就会掉帧

// 典型的帧时间分配：
// JS执行: ~10ms
// Style: ~1ms
// Layout: ~2ms
// Paint: ~3ms
// 总计: ~16ms

// 当JS执行超过16ms时：
// JS执行: ~30ms  ← 卡顿发生！
// 其他工作被迫推迟
```

### 3.2 优先级系统的设计哲学

#### 3.2.1 更新的分类

```javascript
// React将更新分为不同的优先级类别：

// 1. 离散事件（Discrete Events）- 最高优先级
// 点击、键盘输入、聚焦等精确的用户交互
// 特点：用户期望立即响应
document.addEventListener('click', handleClick);

// 2. 连续事件（Continuous Events）- 高优先级
// 拖动、滚动、缩放等持续的用户交互
// 特点：需要流畅的视觉反馈
window.addEventListener('scroll', handleScroll);

// 3. 默认更新（Default Updates）- 中等优先级
// 网络请求回调、setTimeout等
// 特点：重要但不是紧急的
fetch('/api/data').then(handleResponse);

// 4. 过渡更新（Transition Updates）- 低优先级
// UI状态转换、搜索建议等
// 特点：可以被延迟或中断
startTransition(() => setSearchResults(results));

// 5. 空闲更新（Idle Updates）- 最低优先级
// 分析、日志记录等
// 特点：不影响用户体验
scheduleIdleTask(() => logAnalytics());
```

#### 3.2.2 优先级的实现机制

**Lane优先级系统：**

```javascript
// React 18使用位运算来高效管理优先级

// 示例：合并多个更新
const updates = [
  { lane: SyncLane, action: () => setUserInput(text) },
  { lane: TransitionLane, action: () => setSearchResults(list) },
];

// 合并后的优先级由最高优先级决定
const mergedLanes = updates.reduce((acc, update) => {
  return acc | update.lane;
}, NoLanes);

// 获取最高优先级
const highestPriorityLane = getHighestPriorityLanes(mergedLanes);

// 调度时根据优先级决定执行时机
if (includesSomeLane(mergedLanes, SyncLane)) {
  // 同步执行，不可中断
  performSyncWorkOnRoot();
} else if (includesSomeLane(mergedLanes, TransitionLanes)) {
  // 可中断，可延迟
  scheduleCallback(NormalPriority, performConcurrentWorkOnRoot);
}
```

### 3.3 并发渲染的设计权衡

#### 3.3.1 一致性的保证

**React的一致性模型：**

```javascript
// React保证：用户看到的界面总是一致的
// 即使渲染被中断，也不会出现中间状态

// 错误示例（如果不保证一致性）：
function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <span>{count}</span>  {/* 显示0 */}
      <button onClick={() => {
        setCount(1);  {/* 中间状态：显示1 */}
        setCount(2);  {/* 最终状态：显示2 */}
      }}>
        Increment
      </button>
    </div>
  );
}

// React保证用户只会看到0或2，永远不会看到1
// 因为所有的state更新会被批处理
```

**并发下的一致性挑战：**

```javascript
// 场景：高优先级更新打断低优先级更新
function List({ items }) {
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState('');

  return (
    <div>
      <input 
        value={filter}
        onChange={(e) => startTransition(() => setFilter(e.target.value))}
      />
      {items
        .filter(item => item.name.includes(filter))
        .map(item => (
          <div 
            key={item.id}
            onClick={() => setSelectedId(item.id)}  // 高优先级
          >
            {item.name}
          </div>
        ))
      }
    </div>
  );
}

// 问题：如果用户在筛选过程中点击某个项目？
// React的处理：
// 1. 放弃当前的过渡渲染
// 2. 以点击时的状态为基础重新开始渲染
// 3. 保证最终状态的一致性
```

#### 3.3.2 可恢复性的实现

**Fiber的可恢复性：**

```javascript
// 每个Fiber节点都保存了足够的信息以支持恢复

function performUnitOfWork(workInProgress) {
  const current = workInProgress.alternate;
  
  // 开始工作
  const next = beginWork(current, workInProgress, renderLanes);
  
  if (next === null) {
    // 如果没有子节点，完成当前工作
    completeUnitOfWork(workInProgress);
  } else {
    // 返回下一个要处理的节点
    workInProgress = next;
  }
  
  return workInProgress;
}

// 当被中断时，可以从workInProgress恢复
function resumeWork(root) {
  // workInProgress树保存了所有中间状态
  prepareFreshStack(root, lanes);
  workLoopConcurrent();
}
```

### 3.4 向后兼容的设计决策

#### 3.4.1 渐进式采用的策略

```javascript
// React 18完全向后兼容
// 旧的API继续工作，只是行为略有优化

// 旧的创建方式仍然有效（但不支持并发特性）
ReactDOM.render(<App />, container);

// 新的方式支持并发特性
const root = ReactDOM.createRoot(container);
root.render(<App />);

// 旧的useEffect行为不变
useEffect(() => {
  console.log('Still works the same way');
}, []);

// 新的特性是可选的
const [isPending, startTransition] = useTransition();
```

#### 3.4.2 特性检测与降级

```javascript
// React内部的特性检测
const supportsConcurrency = typeof MessageChannel !== 'undefined';
const supportsUserTiming = !!performance?.mark;

if (supportsConcurrency) {
  // 使用MessageChannel实现调度
  const channel = new MessageChannel();
  channel.port1.onMessage = performWorkUntilDeadline;
  
  requestHostCallback = (callback) => {
    scheduledHostCallback = callback;
    channel.port2.postMessage(null);
  };
} else {
  // 降级到setTimeout
  requestHostCallback = (callback) => {
    setTimeout(callback, 0);
  };
}
```

***

## 四、性能优化手段

### 4.1 组件级别的优化

#### 4.1.1 React.memo

```jsx
// 基础用法
const ExpensiveComponent = React.memo(function MyComponent(props) {
  /* 使用props渲染 */
});

// 自定义比较函数
const areEqual = (prevProps, nextProps) => {
  /*
  如果把 nextProps 传入 render 的返回结果与
  将 prevProps 传入 render 的返回结果一致则返回 true，
  否则返回 false
  */
};

const CustomMemoComponent = React.memo(MyComponent, areEqual);

// 使用场景
function ParentComponent({ items }) {
  return (
    <ul>
      {items.map(item => (
        <ListItem 
          key={item.id} 
          item={item}
          onClick={() => handleItemClick(item.id)}
        />
      ))}
    </ul>
  );
}

const ListItem = React.memo(function ListItem({ item, onClick }) {
  console.log(`Rendering ${item.id}`);  // 只在item变化时打印
  
  return (
    <li onClick={() => onClick(item.id)}>
      {item.name}
    </li>
  );
});
```

**React.memo的实现原理：**

```javascript
function memo(type, compare) {
  const elementType = {
    $$typeof: REACT_MEMO_TYPE,
    type,
    compare: compare === undefined ? null : compare,
  };

  return elementType;
}

// 在渲染时使用compare函数
function updateSimpleMemoComponent(current, workInProgress, nextProps) {
  const Component = workInProgress.type;
  
  if (current !== null) {
    const prevProps = current.memoizedProps;
    
    // 使用自定义比较函数或浅比较
    let compare = Component.compare;
    compare = compare !== null ? compare : shallowEqual;
    
    if (compare(prevProps, nextProps)) {
      // props相等，复用
      return bailoutOnAlreadyFinishedWork(current, workInProgress);
    }
  }
  
  // 正常渲染
  return updateFunctionComponent(current, workInProgress, nextProps);
}
```

#### 4.1.2 useMemo 和 useCallback

**useMemo的使用场景：**

```jsx
function ProductList({ products, filter }) {
  // ❌ 不必要的重复计算
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(filter.toLowerCase())
  ).sort((a, b) => a.price - b.price);

  // ✅ 缓存计算结果
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
      .sort((a, b) => a.price - b.price);
  }, [products, filter]);  // 依赖项不变时返回缓存值

  return (
    <ul>
      {filteredProducts.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </ul>
  );
}
```

**useCallback的使用场景：**

```jsx
function ParentComponent() {
  const [count, setCount] = useState(0);

  // ❌ 每次渲染都创建新函数
  const handleClick = () => {
    console.log('Clicked!', count);
  };

  // ✅ 缓存函数引用
  const handleClick = useCallback(() => {
    console.log('Clicked!', count);
  }, [count]);  // count不变时返回同一个函数

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
      <ChildComponent onClick={handleClick} />
    </div>
  );
}

// ChildComponent使用React.memo
const ChildComponent = React.memo(function ChildComponent({ onClick }) {
  console.log('Child rendered');
  return <button onClick={onClick}>Click me</button>;
});
```

**底层实现：**

```javascript
function useMemo(create, deps) {
  const hook = updateWorkInProgressHook();
  const nextDeps = deps === undefined ? null : deps;

  // 检查依赖是否变化
  if (hook.memoizedState !== null) {
    const prevDeps = hook.memoizedState[1];
    if (nextDeps !== null) {
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 依赖没变，返回缓存的值
        return hook.memoizedState[0];
      }
    }
  }

  // 依赖变了，重新计算
  const nextValue = create();
  hook.memoizedState = [nextValue, nextDeps];
  return nextValue;
}

function useCallback(callback, deps) {
  return useMemo(() => callback, deps);
}
```

### 4.2 列表渲染优化

#### 4.2.1 虚拟滚动（Virtual Scrolling）

```jsx
import { FixedSizeList as List } from 'react-window';

function VirtualizedList({ items }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      Item {items[index]}
    </div>
  );

  return (
    <List
      height={500}
      itemCount={items.length}
      itemSize={35}
      width={300}
    >
      {Row}
    </List>
  );
}

// 对于变高列表
import { VariableSizeList as List } from 'react-window';

function VariableHeightList({ items }) {
  const getSize = (index) => {
    // 根据内容动态计算高度
    return items[index].height || 50;
  };

  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].content}
    </div>
  );

  return (
    <List
      height={600}
      itemCount={items.length}
      itemSize={getSize}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

**虚拟滚动的原理：**

```javascript
class VirtualScroller {
  constructor(options) {
    this.containerHeight = options.height;
    this.itemCount = options.itemCount;
    this.itemSize = options.itemSize;
    this.scrollTop = 0;
  }

  getVisibleRange() {
    const startIndex = Math.floor(this.scrollTop / this.itemSize);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.containerHeight / this.itemSize),
      this.itemCount - 1
    );

    return { startIndex, endIndex };
  }

  getOffset(index) {
    return index * this.itemSize;
  }

  getTotalSize() {
    return this.itemCount * this.itemSize;
  }

  render() {
    const { startIndex, endIndex } = this.getVisibleRange();
    const offsetY = this.getOffset(startIndex);
    const totalSize = this.getTotalSize();

    return (
      <div style={{ height: this.containerHeight, overflow: 'auto' }}
           onScroll={this.handleScroll}>
        <div style={{ height: totalSize, position: 'relative' }}>
          <div style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            width: '100%'
          }}>
            {this.renderItems(startIndex, endIndex)}
          </div>
        </div>
      </div>
    );
  }
}
```

#### 4.2.2 Key的正确使用

```jsx
// ❌ 错误：使用数组索引作为key
function BadKeyExample({ items }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item.text}</li>
      ))}
    </ul>
  );
}

// 问题：当列表顺序变化时
// 初始状态：[A, B, C] -> keys: [0, 1, 2]
// 插入D到开头：[D, A, B, C] -> keys: [0, 1, 2, 3]
// React认为：
//   0号位置从A变成D -> 需要更新
//   1号位置从B变成A -> 需要更新
//   2号位置从C变成B -> 需要更新
//   新增3号位置C -> 需要插入
// 结果：所有元素都更新了！效率很低

// ✅ 正确：使用唯一且稳定的ID
function GoodKeyExample({ items }) {
  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
}

// 结果：React能正确识别D是新增的，其他元素保持不变
```

### 4.3 状态管理优化

#### 4.3.1 状态拆分

```jsx
// ❌ 不好的做法：所有状态放在一个对象里
function BadForm() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    bio: '',
    avatar: null,
    preferences: {},
    // ...更多字段
  });

  // 任何字段的变化都会导致整个组件重渲染
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form>
      <input 
        value={form.username}
        onChange={e => handleChange('username', e.target.value)}
      />
      {/* 其他字段... */}
    </form>
  );
}

// ✅ 好的做法：按更新频率和使用范围拆分状态
function GoodForm() {
  // 经常变化的输入状态
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 很少变化的复杂状态
  const [preferences, setPreferences] = useReducer(preferencesReducer, initialPrefs);

  // 独立的文件上传状态
  const [avatar, setAvatar] = useState(null);

  return (
    <form>
      <UsernameField value={username} onChange={setUsername} />
      <EmailField value={email} onChange={setEmail} />
      <PasswordField value={password} onChange={setPassword} />
      <PreferencesPanel preferences={preferences} dispatch={setPreferences} />
      <AvatarUpload avatar={avatar} onUpload={setAvatar} />
    </form>
  );
}
```

#### 4.3.2 使用useReducer替代多个useState

```jsx
// 当状态逻辑复杂时，使用useReducer
function complexReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    
    case 'VALIDATE':
      const errors = validate(state);
      return { ...state, errors };
    
    case 'RESET':
      return initialState;
    
    case 'SUBMIT':
      return { ...state, isSubmitting: true };
    
    default:
      return state;
  }
}

function ComplexForm() {
  const [state, dispatch] = useReducer(complexReducer, initialState);

  // 批量更新
  const handleBatchUpdate = (updates) => {
    Object.entries(updates).forEach(([field, value]) => {
      dispatch({ type: 'SET_FIELD', field, value });
    });
  };

  // 复杂的状态转换
  const handleSubmit = async () => {
    dispatch({ type: 'VALIDATE' });
    if (Object.keys(state.errors).length === 0) {
      dispatch({ type: 'SUBMIT' });
      await submitForm(state);
      dispatch({ type: 'RESET' });
    }
  };
}
```

#### 4.3.3 Context优化

```jsx
// ❌ 问题：Context值变化会导致所有消费者重渲染
const ThemeContext = createContext({ theme: 'light' });

function App() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);
  const [locale, setLocale] = useState('zh');

  // 所有状态放在一个context
  const value = { theme, user, locale, setTheme, setUser, setLocale };

  return (
    <AppContext.Provider value={value}>
      <Header />  {/* 只用到theme，但user/locale变化也会重渲染 */}
      <Sidebar />  {/* 只用到user，但theme/locale变化也会重渲染 */}
      <Footer />  {/* 只用到locale，但theme/user变化也会重渲染 */}
    </AppContext.Provider>
  );
}

// ✅ 解决方案1：拆分Context
const ThemeContext = createContext(null);
const UserContext = createContext(null);
const LocaleContext = createContext(null);

function App() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState(null);
  const [locale, setLocale] = useState('zh');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <UserContext.Provider value={{ user, setUser }}>
        <LocaleContext.Provider value={{ locale, setLocale }}>
          <Header />  {/* 只订阅ThemeContext */}
          <Sidebar />  {/* 只订阅UserContext */}
          <Footer />  {/* 只订阅LocaleContext */}
        </LocaleContext.Provider>
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}

// ✅ 解决方案2：拆分静态值和动态值
const ThemeStaticContext = createContext({
  colors: { primary: '#007bff', secondary: '#6c757d' },
  fonts: { sans: 'Arial', mono: 'monospace' }
});

function App() {
  const [theme, setTheme] = useState('light');
  
  // 静态值（从不变化）单独提供
  const staticValue = useMemo(() => ({
    colors: themeColors[theme],
    fonts: defaultFonts
  }), []);  // 空依赖，永不变化

  return (
    <ThemeStaticContext.Provider value={staticValue}>
      <ThemeProvider value={theme} onChange={setTheme}>
        <Children />
      </ThemeProvider>
    </ThemeStaticContext.Provider>
  );
}

// ✅ 解决方案3：使用选择器模式
function useContextSelector(Context, selector) {
  const context = useContext(Context);
  const selected = selector(context);
  const [selectedState, setSelectedState] = useState(selected);

  useEffect(() => {
    const newSelected = selector(context);
    // 只有选择的值真正变化时才更新
    if (!shallowEqual(selectedState, newSelected)) {
      setSelectedState(newSelected);
    }
  }, [context, selector, selectedState]);

  return selectedState;
}

// 使用
function Header() {
  const theme = useContextSelector(AppContext, ctx => ctx.theme);
  // 只有theme变化时才重渲染
}
```

### 4.4 代码分割与懒加载

#### 4.4.1 React.lazy 和 Suspense

```jsx
import { lazy, Suspense } from 'react';

// 懒加载路由组件
const Home = lazy(() => import('./pages/Home'));
const About = lazy(() => import('./pages/About'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

// 自定义加载状态
function PageLoader() {
  return (
    <div className="page-loader">
      <Spinner />
      <p>Loading...</p>
    </div>
  );
}
```

**基于条件的懒加载：**

```jsx
function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(false);

  // 条件性地加载管理员组件
  const AdminTools = lazy(() =>
    import('./admin/AdminTools')
  );

  return (
    <div>
      <CommonTools />
      {isAdmin && (
        <Suspense fallback={<div>Loading admin tools...</div>}>
          <AdminTools />
        </Suspense>
      )}
    </div>
  );
}
```

**预加载策略：**

```jsx
function Navigation() {
  const [hoveredLink, setHoveredLink] = useState(null);

  // 鼠标悬停时预加载
  useEffect(() => {
    if (hoveredLink === '/dashboard') {
      import('./pages/Dashboard');  // 预加载
    }
  }, [hoveredLink]);

  return (
    <nav>
      <Link 
        to="/" 
        onMouseEnter={() => setHoveredLink('/')}
      >
        Home
      </Link>
      <Link 
        to="/dashboard"
        onMouseEnter={() => setHoveredLink('/dashboard')}
      >
        Dashboard
      </Link>
    </nav>
  );
}
```

#### 4.4.2 动态导入的高级用法

```javascript
// 带命名的动态chunk
const HeavyComponent = lazy(() => import(
  /* webpackChunkName: "heavy-component" */
  './components/HeavyComponent'
));

// 带注释的魔法注释
const Module = lazy(() => import(
  /* webpackPrefetch: 1 */
  /* webpackChunkName: "prefetched-module" */
  './modules/PrefetchedModule'
));

// 带超时的错误处理
function LazyComponentWithErrorHandling() {
  return (
    <ErrorBoundary fallback={<ComponentError />}>
      <Suspense fallback={<ComponentLoader />}>
        <LazyComponent />
      </Suspense>
    </ErrorBoundary>
  );
}

// 动态加载多个模块
async function loadModulesOnDemand(featureFlags) {
  const modules = {};

  if (featureFlags.chart) {
    modules.chart = await import('./charts/ChartLibrary');
  }
  
  if (featureFlags.editor) {
    modules.editor = await import('./editors/RichTextEditor');
  }

  return modules;
}
```

### 4.5 渲染优化技巧

#### 4.5.1 避免不必要的渲染

**组件拆分原则：**

```jsx
// ❌ 整体组件频繁重渲染
function ExpensiveParent({ items, user, settings }) {
  const [filter, setFilter] = useState('');

  // filter变化导致整个组件重渲染
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div>
      <input 
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      
      <UserInfo user={user} />  {/* 不需要重渲染 */}
      <SettingsPanel settings={settings} />  {/* 不需要重渲染 */}
      
      <ItemList items={filteredItems} />  {/* 需要重渲染 */}
    </div>
  );
}

// ✅ 拆分组件，隔离变化
function OptimizedParent({ items, user, settings }) {
  const [filter, setFilter] = useState('');

  return (
    <div>
      <SearchBar value={filter} onChange={setFilter} />
      
      {/* 这些组件不受filter影响 */}
      <UserInfo user={user} />
      <SettingsPanel settings={settings} />
      
      {/* 只有这个受影响 */}
      <FilteredItemList items={items} filter={filter} />
    </div>
  );
}

// 独立组件，有自己的状态
function FilteredItemList({ items, filter }) {
  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);

  return <ItemList items={filteredItems} />;
}
```

**提升状态（Lifting State Up） vs 降低状态：**

```jsx
// 有时不应该提升状态，而应该降低它
function Form() {
  // ❌ 状态在父组件，导致兄弟组件不必要的重渲染
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div>
      <EmailField value={email} onChange={setEmail} />
      <PasswordField value={password} onChange={setPassword} />
      <SubmitButton 
        email={email} 
        password={password} 
        // email/password任一变化都重渲染
      />
    </div>
  );
}

// ✅ 使用refs收集表单数据，避免中间状态导致的重渲染
function OptimizedForm() {
  const formRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData.entries());
    submitForm(data);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <EmailField name="email" />
      <PasswordField name="password" />
      <SubmitButton />
    </form>
  );
}
```

#### 4.5.2 列表优化实战

**大数据量列表的完整优化方案：**

```jsx
import { useState, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';

// 行组件使用React.memo
const MemoizedRow = React.memo(function Row({ index, style, data }) {
  const item = data.items[index];
  const handleClick = data.onItemClick;
  
  return (
    <div style={style} onClick={() => handleClick(item.id)}>
      {item.content}
    </div>
  );
}, (prev, next) => {
  // 自定义比较：只关心数据和回调
  return prev.index === next.index && 
         prev.data.items[prev.index] === next.data.items[next.index] &&
         prev.data.onItemClick === next.data.onItemClick;
});

function OptimizedVirtualizedList({ items, onItemClick }) {
  const [filter, setFilter] = useState('');
  const listRef = useRef();

  // 过滤数据
  const filteredItems = useMemo(() => {
    if (!filter) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);

  // 稳定的回调引用
  const handleItemClick = useCallback((id) => {
    onItemClick(id);
  }, [onItemClick]);

  // 滚动到指定项
  const scrollToItem = useCallback((index) => {
    listRef.current?.scrollToItem(index);
  }, []);

  const rowRenderer = useCallback(({ index, style }) => (
    <MemoizedRow
      index={index}
      style={style}
      data={{
        items: filteredItems,
        onItemClick: handleItemClick
      }}
    />
  ), [filteredItems, handleItemClick]);

  return (
    <div>
      <input
        placeholder="过滤..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
      />
      
      <List
        ref={listRef}
        height={600}
        itemCount={filteredItems.length}
        itemSize={50}
        width="100%"
      >
        {rowRenderer}
      </List>
    </div>
  );
}
```

### 4.6 网络请求优化

#### 4.6.1 数据缓存与去重

```javascript
// 自定义Hook：带缓存的数据获取
function useCachedData(url, options = {}) {
  const { staleTime = 5 * 60 * 1000, enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!enabled);
  const [error, setError] = useState(null);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    if (!enabled) return;

    // 检查缓存
    const cached = cacheRef.current.get(url);
    if (cached && Date.now() - cached.timestamp < staleTime) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(url);
        const result = await response.json();
        
        if (!cancelled) {
          setData(result);
          cacheRef.current.set(url, {
            data: result,
            timestamp: Date.now()
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [url, staleTime, enabled]);

  return { data, loading, error, refetch: () => {} };
}

// 使用
function UserProfile({ userId }) {
  const { data: user, loading } = useCachedData(
    `/api/users/${userId}`,
    { staleTime: 10 * 60 * 1000 }  // 10分钟内不重新请求
  );

  if (loading) return <UserSkeleton />;
  if (!user) return <ErrorMessage />;

  return <UserCard user={user} />;
}
```

#### 4.6.2 请求去重与取消

```javascript
// 请求去重
const pendingRequests = new Map();

function deduplicatedFetch(url, options = {}) {
  // 如果已有相同的请求在进行中，返回同一个Promise
  if (pendingRequests.has(url)) {
    return pendingRequests.get(url);
  }

  const promise = fetch(url, options)
    .then(response => {
      pendingRequests.delete(url);
      return response.json();
    })
    .catch(error => {
      pendingRequests.delete(url);
      throw error;
    });

  pendingRequests.set(url, promise);
  return promise;
}

// 可取消的请求
function useCancellableRequest() {
  const abortControllerRef = useRef();

  const request = useCallback(async (url, options = {}) => {
    // 取消上一个请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request cancelled');
        return null;
      }
      throw error;
    }
  }, []);

  // 组件卸载时取消请求
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return request;
}

// 使用于搜索场景
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const cancellableRequest = useCancellableRequest();

  const handleSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const data = await cancellableRequest(
      `/api/search?q=${encodeURIComponent(searchQuery)}`
    );

    if (data) {
      setResults(data.results);
    }
  }, [cancellableRequest]);

  // 防抖 + 取消
  const debouncedSearch = useMemo(
    () => debounce(handleSearch, 300),
    [handleSearch]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="搜索..."
      />
      <SearchResults results={results} />
    </div>
  );
}
```

### 4.7 性能监控与分析

#### 4.7.1 React DevTools Profiler

```jsx
import { Profiler } from 'react';

function onRenderCallback(
  id,              // 发生提交的Profiler树的"id"
  phase,           // "mount"（挂载）或 "update"（更新）
  actualDuration,  // 本次更新 committed 花费的渲染时间
  baseDuration,    // 不使用优化的情况下渲染整棵子树需要的时间
  startTime,       // React开始渲染的时间戳
  commitTime,      // React committed的时间戳
  interactions     // 属于本次更新的interactions的集合
) {
  // 记录或存储渲染性能数据...
  if (actualDuration > 50) {  // 超过50ms的渲染
    console.warn(`Slow render in ${id}: ${actualDuration}ms`);
    
    // 发送到监控系统
    sendPerformanceMetric({
      component: id,
      duration: actualDuration,
      phase,
      timestamp: Date.now(),
    });
  }
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Navigation />
      <main>
        <Profiler id="Content" onRender={onRenderCallback}>
          <HomePage />
        </Profiler>
      </main>
      <Footer />
    </Profiler>
  );
}
```

#### 4.7.2 自定义性能指标收集

```javascript
// 性能指标收集器
class PerformanceCollector {
  constructor() {
    this.metrics = [];
    this.observers = [];
  }

  // 收集渲染指标
  collectRenderMetrics(componentName, metrics) {
    const entry = {
      type: 'render',
      component: componentName,
      timestamp: performance.now(),
      actualDuration: metrics.actualDuration,
      baseDuration: metrics.baseDuration,
      url: window.location.pathname,
    };

    this.metrics.push(entry);
    this.notifyObservers(entry);

    // 超过阈值时报警
    if (metrics.actualDuration > 100) {
      this.reportSlowRender(entry);
    }
  }

  // 收集交互指标
  collectInteractionMetrics(interactionType, details) {
    const entry = {
      type: 'interaction',
      interaction: interactionType,
      ...details,
      timestamp: performance.now(),
    };

    this.metrics.push(entry);
  }

  // Web Vitals集成
  setupWebVitals() {
    if ('PerformanceObserver' in window) {
      // FCP (First Contentful Paint)
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntriesByName('first-contentful-paint')) {
          this.collectInteractionMetrics('fcp', { value: entry.startTime });
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });

      // LCP (Largest Contentful Paint)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.collectInteractionMetrics('lcp', { value: lastEntry.startTime });
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // FID (First Input Delay)
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.collectInteractionMetrics('fid', { value: entry.processingStart - entry.startTime });
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // CLS (Cumulative Layout Shift)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        }
        this.collectInteractionMetrics('cls', { value: clsScore });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    }
  }

  reportSlowRender(metric) {
    // 发送到错误追踪服务
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric),
      }).catch(console.error);
    }
  }

  subscribe(observer) {
    this.observers.push(observer);
  }

  notifyObservers(data) {
    this.observers.forEach(observer => observer(data));
  }

  getReport() {
    return {
      totalRenders: this.metrics.filter(m => m.type === 'render').length,
      slowRenders: this.metrics.filter(m => m.actualDuration > 50).length,
      averageRenderTime: this.calculateAverageRenderTime(),
      webVitals: this.extractWebVitals(),
    };
  }
}

// 全局实例
const perfCollector = new PerformanceCollector();
perfCollector.setupWebVitals();
export default perfCollector;
```

### 4.8 服务端渲染优化

#### 4.8.1 SSR与 hydration

```javascript
// 传统SSR流程
// 1. 服务器生成HTML
// 2. 发送HTML到客户端
// 3. 客户端下载JS
// 4. Hydration：React接管DOM，绑定事件

// 问题：hydration可能很慢
// 解决方案1：选择性Hydration（React 18）
import { hydrateRoot } from 'react-dom/client';

hydrateRoot(document.getElementById('root'), <App />);

// React会优先hydrating用户可见的部分
// 其他部分延迟hydration

// 解决方案2：流式SSR
import { renderToPipeableStream } from 'react-dom/server';

function handleRequest(req, res) {
  const stream = renderToPipeableStream(
    <App />,
    {
      bootstrapScripts: ['/main.js'],
      onShellReady() {
        res.statusCode = 200;
        res.setHeader('Content-type', 'text/html');
        stream.pipe(res);
      },
      onShellError(error) {
        res.statusCode = 500;
        res.send('<h1>Something went wrong</h1>');
      },
    }
  );
}
```

#### 4.8.2 ISR (Incremental Static Regeneration)

```javascript
// Next.js风格的ISR
// 页面在构建时预渲染，但在请求时可以更新

export async function getStaticProps() {
  return {
    props: {
      posts: await getPosts(),
    },
    revalidate: 60,  // 每60秒重新生成一次
  };
}

// 工作原理：
// 1. 用户请求页面
// 2. 返回缓存的静态HTML（快速响应）
// 3. 后台触发重新生成
// 4. 下一个请求获得最新内容
```

***

## 总结

### React性能优化检查清单

#### ✅ 组件层面

- [ ] 使用 `React.memo` 包装纯展示组件
- [ ] 合理使用 `useMemo` 缓存昂贵的计算
- [ ] 使用 `useCallback` 缓存传递给子组件的回调
- [ ] 避免在render中创建对象/数组/函数
- [ ] 合理拆分组件，隔离状态变化

#### ✅ 列表渲染

- [ ] 为列表项提供稳定的 `key`
- [ ] 大数据量列表使用虚拟滚动
- [ ] 避免在列表中使用匿名函数作为事件处理器

#### ✅ 状态管理

- [ ] 按更新频率和使用范围拆分状态
- [ ] 复杂状态逻辑使用 `useReducer`
- [ ] 拆分Context避免不必要的重渲染
- [ ] 考虑使用外部状态管理库（Redux/Zustand/Jotai）

#### ✅ 代码分割

- [ ] 路由级别使用 `React.lazy` 懒加载
- [ ] 大型组件按需加载
- [ ] 实现预加载策略提升用户体验

#### ✅ 网络请求

- [ ] 实现请求缓存和去重
- [ ] 快速连续请求使用取消机制
- [ ] 配合Suspense处理异步数据
- [ ] 实现乐观更新提升感知性能

#### ✅ 监控与分析

- [ ] 使用React DevTools Profiler定位性能瓶颈
- [ ] 收集Core Web Vitals指标
- [ ] 设置性能预算和告警
- [ ] 定期审查和优化慢组件

### 最佳实践总结

1. **过早优化是万恶之源**：先用Profiler识别真正的瓶颈，再针对性优化
2. **优化要有数据支撑**：不要凭感觉优化，用数字说话
3. **关注用户体验**：技术指标最终服务于用户体验（FCP、LCP、FID、CLS）
4. **保持代码可维护性**：不要为了微小的性能收益牺牲代码清晰度
5. **利用React的最新特性**：Concurrent Features、Transitions、Suspense等

### 学习资源推荐

- [React官方文档](https://react.dev/)
- [React Fiber Architecture](https://github.com/acdlite/react-fiber-architecture)
- [React Deep Dive系列](https://github.com/nicehash/react-deep-dive)
- [React源码解析](https://react.jokcy.me/)
- [性能优化指南](https://web.dev/performance/)

