# React 面试题集



##### jsx是什么？

jsx是一种react.createElement 的语法糖（17版本之后进行了更新 不一定转换成这个函数了） 允许我们在html里面编写js代码 不能被浏览器直接识别 需要webpack babel这样的编译工具转换成js

可以把标签转换成正是因为需要调用这个函数 所以需要在顶部引入import React from 'react'

在17版本之后 使用的是jsx-runtime模块里面的jsx函数

```javascript
import {jsx as _jsx} from 'react/jsx-runtime';

function App() {
  return _jsx('h1', { children: 'hello,lyllovelemon' });
}
```

 



##### 为什么要求组件的首字母大写

在调用createElement的时候 大写首字母 则会被认为是一个变量 否则会认为是字符串





##### 为什么React组件只能有一个根元素

因为创建组件的时候 调用的是createElement这个函数 它接收三个参数，分别是type元素类型，props元素属性，children子元素 

从jsx到真实DOM需要经历*jsx->虚拟DOM->真实DOM*。如果组件首字母为小写，它会被当成字符串进行传递，在创建虚拟DOM的时候，就会把它当成一个html标签，而html没有app这个标签，就会报错。组件首字母为大写，它会当成一个变量进行传递，React知道它是个自定义组件就不会报错

```javascript
// JSX 代码
const element = <div>
  <h1>Hello</h1>
  <p>World</p>
</div>;

// 编译后
const element = React.createElement(
  "div",
  null,
  React.createElement("h1", null, "Hello"),
  React.createElement("p", null, "World")
);
```



##### react组件为什么只有一个根元素

组件必须返回单个根节点的要求源自其 ** 虚拟 DOM 协调算法（Reconciliation）** 的实现机制

React组件的返回值最后会编译为createElememnt函数，而组件函数的返回值只能是1个，而不能·是两个调用，如果不用单独的根节点包裹，就会并列返回多个值，这在js中是不允许的

在react的把dom树转换成链表的过程中 假设一个组件有两个根节点 那么会无法处理 因为react对于组件的处理是：给组件实例添加一个child属性 这个属性里面保存组件的根节点 而并没有处理组件有两个根节点的情况 ，假设react后续添加了对于这个问题的处理 比如在编译的时候检测外层有多个根组件就添加一个fragment标签进行包裹 或者处理组件的时候假设有多个根组件就使用sibling指针来处理或许可以解决这个问题 

并且 在react源码里面的设计 组件函数必须只能返回单个根节点来进行前后虚拟dom的关联和虚拟dom到真实dom的映射

React组件怎样可以返回多个组件

- 使用HOC（高阶函数）

- 使用React.Fragment,可以让你将元素列表加到一个分组中，而且不会创建额外的节点（类似vue的template)

-  使用数组返回

  ```react
  renderList(){
    this.state.list.map((item,key)=>{
      return (<React.Fragment>
        <tr key={item.id}>
          <td>{item.name}</td>
          <td>{item.age}</td>
          <td>{item.address}</td>
        </tr>	
      </React.Fragment>)
    })
  }
  ```

  

##### react有哪些生命周期 





##### react有哪些内置的常用组件

1. Protal
2. Fragment
3. context 
4. Transition





介绍redux的使用 原理

* 跨层级状态共享与通信
* 需要持久化的全局数据
* 包括Store Reducer Action





##### 对react的理解 





##### 介绍HOC设计模式

这个设计模式的核心在于：设计一个函数接受一个组件作为参数 并且返回一个新的组件。这种设计模式通常用于提取公共逻辑 比如设计一个函数 接受一个组件 返回一个添加了过渡效果的组件。或者在这个函数里面进行权限验证 来决定是否渲染组件。（其实就是vue文档里面提到的无渲染组件 不过还是可以添加一些渲染的 ）



##### mini-react包括哪些模块

1. 渲染器：react元素转换成真实dom
2. 协调器：对比新旧虚拟节点 生成fiber
3. 状态管理
4. 调度器：处理任务优先级

"我实现了三个核心模块：渲染器负责创建和更新 DOM，协调器通过递归比较 Virtual DOM 差异，调度器实现了基本的任务优先级排序。其中最复杂的是 Hooks 系统，需要调用顺序问题。"





##### 你认为react和vue在哪里很相似？

我认为这两者在控制渲染性能时的策略很相似 。

这两个框架为了提升渲染性能，把更新包装成任务，并且通过异步队列控制任务的执行。在vue中 是通过微任务队列控制 ，react则是使用宏任务。这是因为vue里面渲染任务。。。。，

在vue的源码里面 更新任务会被添加进queue，一个数组中，然后创建一个立即完成的promise并且给这个promise添加成功回调函数 在这个回调函数中将会根据优先级对任务进行遍历执行。假设存在nextTick nextTick内的函数将会作为.then函数返回的promise的成功回调，这里假设浏览器不支持promise vue会尝试降级到seTImeediate 否则将会使用宏队列 。



并且为了提升用户体验 他们都对任务优先级做了区分，在执行任务队列之前 会先按顺序排列 确保高优先级先执行





##### 为什么react要求每次渲染的时候 hook的调用顺序要相同？

react内部使用链表来维护组件的hooks对象，在渲染的时候 react将会维护一个全局索引代表当前运行hook的位置 并且根据这个位置来确定上次渲染的hook对象 对比这两个对象的属性值来决定策略，这个特性使得开发者必须保持hooks调用顺序一致 否则就会引起前后状态混乱





##### 介绍fiber

* 链表代替递归 每个节点包括child sibling return 指针
* 异步渲染 可以中断或者恢复
* 双缓存技术 交替渲染

" 我用 JavaScript 对象实现了 Fiber 节点，每个节点包含指向子节点、兄弟节点和父节点的指针。与递归渲染不同，Fiber 架构允许暂停和恢复渲染过程。例如，我通过 `requestIdleCallback` 实现了基本的时间分片，在浏览器空闲时执行渲染任务，提高了页面响应性。

在渲染过程中 仅更新产生更新的的组件 通过优先遍历child节点 再遍历sibling节点 当需要更新的节点为更新头结点的sibling节点的时候 更新结束 



传统递归渲染的做法是：向函数传入当前要渲染的节点及其父节点，先渲染当前要渲染的这个节点 再判断这个节点是否具有子节点 有就对子节点进行递归调用 这样的调用过程是不能打断的。

在fiber架构中 是先将节点处理成虚拟dom树 再把树型结构处理成链表结构 ，通过给dom树的每个节点添加parent,child,sibling指针 ，实现可以中断 恢复 的渲染任务，并且通过requestIdlecallback实现时间分片， 





##### 优先级渲染是怎么实现的

优先级渲染是通过fiber架构和调度器共同实现的 

fiber架构实现了任务的拆分 中断 

调度器实现了任务排序和执行：维护一个任务队列 这个任务队列按照任务的优先级进行排序 

时间分片实现了避免每个任务占用过长时间阻塞主线程 

模拟一个简易调度器 其中使用messageChanne实现宏任务：

```javascript

const ImmediatePriority = 1; // 立即执行的优先级, 级别最高 [点击事件，输入框，]
const UserBlockingPriority = 2; // 用户阻塞级别的优先级, [滚动，拖拽这些]
const NormalPriority = 3; // 正常的优先级 [redner 列表 动画 网络请求]
const LowPriority = 4; // 低优先级  [分析统计]
const IdlePriority = 5;// 最低阶的优先级, 可以被闲置的那种 [console.log]

// 获取当前时间
function getCurrentTime() {
    return performance.now();
}

class SimpleScheduler {
    constructor() {
        this.taskQueue = []; // 任务队列
        this.isPerformingWork = false; // 当前是否在执行任务

        // 使用 MessageChannel 处理任务调度
        const channel = new MessageChannel();
        this.port = channel.port2;
        channel.port1.onmessage = this.performWorkUntilDeadline.bind(this);
    }

    // 调度任务
    scheduleCallback(priorityLevel, callback) {
        const curTime = getCurrentTime();
        let timeout;
        // 根据优先级设置超时时间
        switch (priorityLevel) {
            case ImmediatePriority:
                timeout = -1;
                break;
            case UserBlockingPriority:
                timeout = 250;
                break;
            case LowPriority:
                timeout = 10000;
                break;
            case IdlePriority:
                timeout = 1073741823;
                break;
            case NormalPriority:
            default:
                timeout = 5000;
                break;
        }

        const task = {
            callback,
            priorityLevel,
            expirationTime: curTime + timeout // 直接根据当前时间加上超时时间
        };

        this.push(this.taskQueue, task); // 将任务加入队列
        this.schedulePerformWorkUntilDeadline();
    }

    // 通过 MessageChannel 调度执行任务
    schedulePerformWorkUntilDeadline() {
        if (!this.isPerformingWork) {
            this.isPerformingWork = true;
            this.port.postMessage(null); // 触发 MessageChannel 调度
        }
    }

    // 执行任务
    performWorkUntilDeadline() {
        this.isPerformingWork = true;
        this.workLoop();
        this.isPerformingWork = false;
    }

    // 任务循环
    workLoop() {
        let curTask = this.peek(this.taskQueue);
        while (curTask) {
            const callback = curTask.callback;
            if (typeof callback === 'function') {
                callback(); // 执行任务
            }
            this.pop(this.taskQueue); // 移除已完成任务
            curTask = this.peek(this.taskQueue); // 获取下一个任务
        }
    }

    // 获取队列中的任务
    peek(queue) {
        return queue[0] || null;
    }

    // 向队列中添加任务
    push(queue, task) {
        queue.push(task);
        queue.sort((a, b) => a.expirationTime - b.expirationTime); // 根据优先级排序，优先级高的在前 从小到大
    }

    // 从队列中移除任务
    pop(queue) {
        return queue.shift();
    }
}

// 测试
const scheduler = new SimpleScheduler();

scheduler.scheduleCallback(LowPriority, () => {
    console.log('Task 1: Low Priority');
});

scheduler.scheduleCallback(ImmediatePriority, () => {
    console.log('Task 2: Immediate Priority');
});

```



requestIdlecallback的执行阶段：

在浏览器的一帧里面 是这样安排的：

1. 处理事件的回调函数 比如click函数  这也就是浏览器事件循环的宏任务阶段
2. 处理计时器的回调函数 也就是事件循环的微任务阶段  
3. 开始帧
4. 执行Raf回调函数（正是因为Raf回调将会在渲染前一步执行 并且在浏览器的每一帧都会执行 所以可以保证动画流畅稳定 ）
5. 进行渲染
6. 假设还有时间 将执行requestIdlecallback

![image-20250607145337960](https://typora-crazy050115.oss-cn-beijing.aliyuncs.com/image-20250607145337960.png)

 这个函数的参数是一个回调函数 回调函数的参数是一个deadline对象 这个对象有两个属性 timeRemaining表示剩下的空闲时间 didTimeout是否因为超时而被强制执行

另一个参数是配置项 可以配置最大超时时间 

```javascript
const total = 1000; // 定义需要生成的函数数量，即1000个任务
const arr = [];    // 存储任务函数的数组

// 生成1000个函数并将其添加到数组中
function generateArr() {
    for (let i = 0; i < total; i++) {
        // 每个函数的作用是将一个 <div> 元素插入到页面的 body 中
        arr.push(function() {
            document.body.innerHTML += `<div>${i + 1}</div>`; // 将当前索引 + 1 作为内容
        });
    }
}
generateArr(); // 调用函数生成任务数组

// 用于调度和执行任务的函数
function workLoop(deadline) {
    // 检查当前空闲时间是否大于1毫秒，并且任务数组中还有任务未执行
    if (deadline.timeRemaining() > 1 && arr.length > 0) {
        const fn = arr.shift(); // 从任务数组中取出第一个函数
        fn(); // 执行该函数，即插入对应的 <div> 元素到页面中
    }
    // 再次使用 requestIdleCallback 调度下一个空闲时间执行任务
    requestIdleCallback(workLoop);
}

// 开始调度任务，在浏览器空闲时执行 workLoop
requestIdleCallback(workLoop,{ timeout: 1000});

```

##### react调度器实现

- **高优先级任务**：使用 `MessageChannel` 或 `postMessage`
  （触发宏任务，在浏览器绘制前执行，确保即时响应）
- **低优先级任务**：使用 `requestAnimationFrame`
  （在浏览器绘制前执行，避免阻塞关键渲染）
- **兜底方案**：使用 `setTimeout`
  （兼容不支持上述 API 的旧浏览器）

react使用小顶堆管理任务队列 确保优先级最高的任务在堆顶

插入新任务的时候 会比较新任务和当前任务的优先级

```javascript
  insertTaskIntoQueue(taskQueue, newTask);
  
  // 如果新任务优先级高于当前正在执行的任务
  if (newTask.priorityLevel > currentPriorityLevel) {
    // 标记当前任务需要中断
    needsInterrupt = true;
    
    // 通过 MessageChannel 立即调度执行
    scheduleHostCallback(flushWork);
  }
}
```

要实现中断恢复 就要实现记住被打断的节点是哪个 以及这个节点的上下文 react是使用一个全局变量保存了这个节点和上下文解决的

这样的动画看起来很流畅 因为使用的是空闲时间渲染 所以没有影响到交互和渲染 和raf不同 raf保证的是动画进行的平均 视觉效果更好 





##### 为什么React不用原生requestIdleCallback实现呢？

1. `兼容性差` `Safari` 并不支持(如下附图) [caniuse.com/?search=req…](https://link.juejin.cn?target=https%3A%2F%2Fcaniuse.com%2F%3Fsearch%3DrequestIdleCallback)
2. `控制精细度` React 要根据组件优先级、更新的紧急程度等信息，更精确地安排渲染的工作
3. `执行时机`requestIdleCallback(callback) 回调函数的执行间隔是 50ms（W3C规定），也就是 20FPS，1秒内执行20次，间隔较长。
4. 每个浏览器实现该API的方式不同，导致执行时机有差异有的快有的慢、

在浏览器不支持requestIdlecallback的时候 后备方案可以是messageChhanel setTimeout 但是message的执行更快 setTimeout即使时间设置为0也需要等待

##### 生命周期

生命周期指的是组件实例从创建到销毁的流程，函数组件没有生命周期，只有类组件才有，因为只有class组件会创建组件实例

组件的生命周期可以分为**挂载、更新、卸载**阶段

1. 挂载阶段
   - `componentWillMount()`：在组件即将被挂载到 DOM 之前调用，不过这个方法在后续版本中已被标记为不安全。
   - `render()`：负责返回 JSX 元素，用于构建 DOM 结构。
   - `componentDidMount()`：组件成功挂载到 DOM 之后调用，适合在此进行数据获取、事件监听等初始化操作。
2. 更新阶段
   - `componentWillReceiveProps(nextProps)`：当组件接收到新的 props 时调用，同样也被标记为不安全。
   - `shouldComponentUpdate(nextProps, nextState)`：用于判断组件是否需要更新，可通过返回`false`来阻止不必要的渲染。
   - `componentWillUpdate(nextProps, nextState)`：在组件即将更新之前调用，已被标记为不安全。
   - `render()`：重新返回 JSX 元素，更新 DOM。
   - `componentDidUpdate(prevProps, prevState)`：组件更新完成后调用，可在此进行 DOM 操作或状态更新。
3. 卸载阶段
   - `componentWillUnmount()`：在组件即将被卸载之前调用，适合进行资源清理工作，比如取消定时器、移除事件监听等。



在react18里面引入了并发渲染 废弃了不安全的生命周期

- `getDerivedStateFromProps(props, state)`：静态方法，用于替代`componentWillReceiveProps`，在组件实例化和接收到新 props 时调用。
- `getSnapshotBeforeUpdate(prevProps, prevState)`：在 DOM 更新之前调用，可返回一个值传递给`componentDidUpdate`。

1. 被废弃的方法
   - `componentWillMount()`
   - `componentWillReceiveProps()`
   - `componentWillUpdate()`
     这些方法被标记为不安全，主要是因为在并发模式下，组件的渲染可能会被中断和重新启动，而这些方法在这个过程中可能会导致一些问题。

##### react事件机制

通过合成事件和事件委托实现了

合成事件：react基于浏览器的事件机制实现了一套自身的事件机制 符合w3c规范 包括事件触发 事件冒泡 时间捕获 时间合成 事件派发。

使用onClick绑定在节点上面的就是合成事件

使用addeventlistener添加的就是原生事件 由于原生事件绑定是绑定在节点上面的所以相较于合成事件内存开销更大

原生事件先触发 合成事件后触发 ，用户操作首先触发原生DOM事件 当原生事件冒泡到跟容器 react就会拦截原生事件 生成合成事件对象 

```react
<div id="root">
  <button id="btn">Click me</button>
</div>

<script>
  // 原生事件：直接绑定到按钮
  const btn = document.getElementById('btn');
  btn.addEventListener('click', () => {
    console.log('原生事件触发'); // 先输出
  });

  // React 组件（合成事件）
  ReactDOM.createRoot(document.getElementById('root')).render(
    <button onClick={() => {
      console.log('合成事件触发'); // 后输出
    }}>Click me</button>
  );
</script>
```

即使合成事件被打断  原生事件仍会按 DOM 树冒泡到根节点，只是 React 不再处理合成事件的传播。

```react
function Parent() {
  // 合成事件：父组件的点击处理
  const handleParentClick = () => console.log('Parent 合成事件触发');
  return (
    <div onClick={handleParentClick}>
      <Child />
    </div>
  );
}

function Child() {
  const handleChildClick = (e) => {
    e.stopPropagation(); // 阻止合成事件冒泡到 Parent
    
    // 手动绑定原生事件：子组件的点击处理
    const btn = useRef();
    useEffect(() => {
      btn.current.addEventListener('click', () => {
        console.log('Child 原生事件触发'); // 会触发，且冒泡到根节点
      });
    }, []);

    return <button ref={btn}>Click me</button>;
  };
  return <button onClick={handleChildClick}>Click me</button>;
}
```



- **统一 API**：所有浏览器的事件属性和方法（如`e.preventDefault()`、`e.stopPropagation()`）行为一致。
- **事件池（Event Pooling）**：React 17 之前会复用事件对象以节省内存（`e.persist()`可保留引用），React 17 + 已移除该优化。
- **自动绑定**：事件处理函数中的`this`默认指向组件实例（类组件需手动绑定）。



React事件的设计动机(作用)：

- **在底层磨平不同浏览器的差异，React实现了统一的事件机制，我们不再需要处理浏览器事件机制方面的兼容问题，在上层面向开发者暴露稳定、统一的、与原生事件相同的事件接口**
- **React把握了事件机制的主动权，实现了对所有事件的中心化管控**
- **React引入事件池避免垃圾回收，在事件池中获取或释放事件对象，避免频繁的创建和销毁**

**虽然合成事件不是原生DOM事件，但它包含了原生DOM事件的引用，可以通过e.nativeEvent访问**

**DOM事件流是怎么工作的**，一个页面往往会绑定多个事件，页面接收事件的顺序叫事件流

W3C标准事件的传播过程：

1. 事件捕获
2. 处于目标
3. 事件冒泡

在react16李阿敏 事件绑定在document上面 17以后的版本绑定在container上面 

事件绑定 事件触发

- **React所有的事件绑定在container上**(react17以后),而不是绑定在DOM元素上（作用：减少内存开销，所有的事件处理都在container上，其他节点没有绑定事件）
- React自身实现了一套冒泡机制，不能通过return false阻止冒泡
- React通过**SytheticEvent**实现了**事件合成**

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6ad1c0b6ee9c42578b6fc7b46a3a2e39~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=1740&h=1054&s=45104&e=webp&b=2b2a33)





实现事件绑定的过程

1. **识别事件属性**：
   - React 解析 JSX 中的事件属性（如`onClick`、`onChange`）。
   - 通过`registrationNameModule`映射到对应的原生事件（如`onClick` → `click`）。
2. **事件委托绑定**：
   - 在组件挂载时，React 在根 DOM 节点注册对应的原生事件监听器（如`addEventListener('click', ...)`）。
3. **事件处理函数存储**：
   - React 将用户定义的事件处理函数（如`handleClick`）存储在内部映射表中，与特定 DOM 节点关联。

1. 建立合成事件和原生事件的映射：**registrationNameModule,** 它建立了React事件到plugin的映射，它包含React支持的所有事件的类型，用于判断一个组件的prop是否是事件类型 这里的plugin用于注册事件：把原生事件和raect事件映射  事件处理：在事件触发前后执行额外逻辑 兼容处理

   ```javascript
   {
      onBlur:SimpleEventPlugin,
      onClick:SimpleEventPlugin,
      onClickCapture:SimpleEventPlugin,
      onChange:ChangeEventPlugin,
      onChangeCapture:ChangeEventPlugin,
      onMouseEnter:EnterLeaveEventPlugin,
      onMouseLeave:EnterLeaveEventPlugin,
      ...  
   }
   
   ```

   

2. **registrationNameDependencies，** 这个对象记录了React事件到原生事件的映射

   ```javascript
   {
     onBlur: ['blur'],
     onClick: ['click'],
     onClickCapture: ['click'],
     onChange: ['blur', 'change', 'click', 'focus', 'input', 'keydown', 'keyup', 'selectionchange'],
     onMouseEnter: ['mouseout', 'mouseover'],
     onMouseLeave: ['mouseout', 'mouseover'],
   }
   ```

**为什么针对同一个事件，即使可能存在多次回调，document（container）也只需要注册一次监听**

因为React注册到document(container)上的并不是一个某个DOM节点具体的回调逻辑，而是一个统一的事件分发函数dispatchEvent - > 事件委托思想

**dispatchEvent是怎么实现事件分发的**

事件触发的本质是对dispatchEvent函数的调用

![img](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/2c8b7a2369a943118f865cb9369638b4~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=1188&h=821&s=205871&e=png&b=ebebeb)



**React类组件事件处理为什么要手动绑定this**

react组件会被编译为React.createElement,在createElement中，它的this丢失了，并不是由组件实例调用的，因此需要手动绑定this

对于函数组件 会自动捕获外层的this

为什么不能通过return false**阻止事件的默认行为**

因为React基于浏览器的事件机制实现了一套自己的事件机制，和原生DOM事件不同，它采用了事件委托的思想，通过dispatch统一分发事件处理函数

##### 怎么实现useState useEffect

```javascript
/**
 * Hook 节点结构
 * 每个 Hook 对应一个 HookNode，存储状态和待处理的更新
 */
class HookNode {
  constructor(initialState) {
    // 当前存储的状态值
    this.memoizedState = initialState;
    // 存储待处理的更新队列（支持多次调用 setState 合并）
    this.queue = [];
    // 指向下一个 Hook 节点，形成链表结构
    this.next = null;
  }
}

/**
 * Fiber 节点结构
 * React 16+ 内部使用的协调单元，这里简化表示一个组件实例
 */
class Fiber {
  constructor(type, props) {
    this.type = type;         // 组件函数或类
    this.props = props;       // 组件属性
    this.memoizedState = null; // 第一个 Hook 节点
    this.alternate = null;    // 用于双缓冲的上一次渲染的 Fiber
    this.effects = [];        // 存储副作用函数（模拟 useEffect）
  }
}

// 全局变量：当前执行上下文
let currentlyRenderingFiber = null; // 当前正在渲染的 Fiber
let workInProgressHook = null;      // 当前正在处理的 Hook
let isBatchingUpdates = false;      // 是否处于批量更新模式
const updateQueue = [];             // 待处理的更新队列

/**
 * 主渲染函数
 * 初始化或更新组件树
 */
function render(Component, props, container) {
  // 获取或创建根 Fiber 节点
  let fiber = container._rootFiber;
  if (!fiber) {
    // 首次渲染创建新 Fiber
    fiber = new Fiber(Component, props);
    container._rootFiber = fiber;
  } else {
    // 复用旧 Fiber 作为备用版本（双缓冲）
    fiber.alternate = { ...fiber };
    fiber.props = props;
    fiber.effects = []; // 重置副作用
  }
  
  // 调度这个 Fiber 的更新
  scheduleUpdateOnFiber(fiber);
}

/**
 * 调度 Fiber 更新
 * 将 Fiber 添加到更新队列，根据批量模式决定是否立即处理
 */
function scheduleUpdateOnFiber(fiber) {
  updateQueue.push(fiber);
  if (!isBatchingUpdates) {
    // 非批量模式下立即处理更新
    flushUpdateQueue();
  }
}

/**
 * 处理更新队列
 * 批量处理所有待更新的 Fiber
 */
function flushUpdateQueue() {
  isBatchingUpdates = true;
  try {
    // 处理队列中的所有更新
    while (updateQueue.length > 0) {
      const fiber = updateQueue.shift();
      reconcileChildren(fiber);
    }
  } finally {
    // 处理完毕后退出批量模式
    isBatchingUpdates = false;
  }
}

/**
 * 协调子节点
 * 执行组件函数并处理 Hooks
 */
function reconcileChildren(fiber) {
  // 设置当前渲染上下文
  currentlyRenderingFiber = fiber;
  // 如果有旧的 Hooks 链表，从中恢复
  workInProgressHook = fiber.alternate?.memoizedState || null;
  
  // 执行组件函数（触发 Hook 调用）
  const children = fiber.type(fiber.props);
  
  // 执行所有副作用（模拟 useEffect）
  fiber.effects.forEach(effect => effect());
  
  return children;
}

/**
 * useState 核心实现
 */
function useState(initialState) {
  // 获取或创建当前 Hook 节点
  let hook;
  if (workInProgressHook) {
    // 复用现有 Hook（更新阶段）
    hook = workInProgressHook;
    workInProgressHook = workInProgressHook.next;
  } else {
    // 创建新 Hook（初始化阶段）
    hook = new HookNode(
      // 支持函数形式的初始值
      typeof initialState === 'function' ? initialState() : initialState
    );
    
    // 将新 Hook 添加到 Hooks 链表末尾
    if (!currentlyRenderingFiber.memoizedState) {
      // 第一个 Hook
      currentlyRenderingFiber.memoizedState = hook;
    } else {
      // 找到链表末尾并添加
      let lastHook = currentlyRenderingFiber.memoizedState;
      while (lastHook.next) {
        lastHook = lastHook.next;
      }
      lastHook.next = hook;
    }
  }
  
  // 处理待更新的队列（应用所有待处理的更新）
  let baseState = hook.memoizedState;
  if (hook.queue.length > 0) {
    hook.memoizedState = hook.queue.reduce((state, action) => {
      // 支持函数形式的更新
      return typeof action === 'function' ? action(state) : action;
    }, baseState);
    hook.queue = []; // 清空队列
  }
  
  // 创建 setState 函数
  const setState = (action) => {
    // 将更新添加到队列
    hook.queue.push(action);
    
    // 调度 Fiber 更新
    scheduleUpdateOnFiber(currentlyRenderingFiber);
  };
  
  return [hook.memoizedState, setState];
}

/**
 * 示例组件：计数器
 */
function Counter({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  
  // 模拟 useEffect（简化版）
  currentlyRenderingFiber.effects.push(() => {
    console.log(`Count is now: ${count}`);
  });
  
  return {
    count,
    increment: () => setCount(c => c + 1),
    decrement: () => setCount(c => c - 1)
  };
}

/**
 * 测试代码
 */
function testComplexUseState() {
  const container = { _rootFiber: null };
  
  console.log('First render:');
  const component = render(Counter, { initialCount: 0 }, container);
  
  console.log('\nUpdating state:');
  component.increment();
  component.decrement();
  
  console.log('\nSecond render:');
  flushUpdateQueue();
}

// 执行测试
testComplexUseState();    
```

在mini-raetc里面 每个组件的state其实是存储在一个componentStates二维数组里面 根据组件id 获取对应组件的状态数组 在通过全局保存的状态索引来找到对应的state 而setState函数调用就是修改这个数组元素 并且引起组件更新 

```javascript
// 前续代码（useState 实现部分保持不变）...

/**
 * Effect 节点结构
 * 用于存储单个副作用的相关信息
 */
class Effect {
  constructor(create, deps) {
    this.create = create;     // 副作用创建函数（传入 useEffect 的第一个参数）
    this.deps = deps;         // 依赖数组（传入 useEffect 的第二个参数）
    this.destroy = null;      // 清理函数（由 create 函数返回，用于卸载时清理副作用）
    this.next = null;         // 指向下一个 Effect，形成链表结构
  }
}

// 全局变量：当前执行上下文
let currentlyRenderingFiber = null; // 当前正在渲染的 Fiber
let workInProgressHook = null;      // 当前正在处理的 Hook
let workInProgressEffect = null;    // 当前正在处理的 Effect

/**
 * useEffect 核心实现
 * @param {Function} create - 副作用创建函数
 * @param {Array} deps - 依赖数组，控制副作用何时重新执行
 */
function useEffect(create, deps) {
  // 获取或创建当前 Hook 节点
  let hook;
  if (workInProgressHook) {
    // 复用现有 Hook（更新阶段）
    hook = workInProgressHook;
    workInProgressHook = workInProgressHook.next;
  } else {
    // 创建新 Hook（初始化阶段）
    hook = {
      memoizedState: null,    // 存储当前 Hook 的状态（对于 useEffect 是 Effect 链表）
      next: null
    };
    
    // 将新 Hook 添加到 Hooks 链表
    if (!currentlyRenderingFiber.memoizedState) {
      currentlyRenderingFiber.memoizedState = hook;
    } else {
      let lastHook = currentlyRenderingFiber.memoizedState;
      while (lastHook.next) {
        lastHook = lastHook.next;
      }
      lastHook.next = hook;
    }
  }
  
  // 获取上一次渲染的 Effect
  const prevEffect = hook.memoizedState;
  
  // 创建新的 Effect 对象
  const effect = {
    create,
    deps,
    // 保存上一次的清理函数（用于在重新执行副作用前调用）
    destroy: prevEffect ? prevEffect.destroy : null,
    next: null
  };
  
  // 将 Effect 添加到当前 Fiber 的副作用队列
  if (!currentlyRenderingFiber.effects) {
    currentlyRenderingFiber.effects = [effect];
  } else {
    currentlyRenderingFiber.effects.push(effect);
  }
  
  // 更新 Hook 存储的 Effect
  hook.memoizedState = effect;
  
  // 判断是否需要执行副作用
  const shouldRun = 
    !prevEffect ||                // 首次渲染
    !areDepsEqual(deps, prevEffect.deps); // 依赖数组变化
  
  if (shouldRun) {
    // 将副作用加入待执行队列（在渲染完成后执行）
    currentlyRenderingFiber.effects.push(() => {
      // 执行前先清理上一次的副作用（如果有）
      if (prevEffect && prevEffect.destroy) {
        prevEffect.destroy();
      }
      
      // 执行新的副作用，并保存返回的清理函数
      const destroy = effect.create();
      effect.destroy = destroy;
    });
  }
}

/**
 * 辅助函数：比较两个依赖数组是否相等
 * @param {Array} nextDeps - 新的依赖数组
 * @param {Array} prevDeps - 旧的依赖数组
 * @returns {boolean} - 是否相等
 */
function areDepsEqual(nextDeps, prevDeps) {
  // 没有依赖数组或长度不同时认为不相等
  if (!nextDeps || !prevDeps) return false;
  if (nextDeps.length !== prevDeps.length) return false;
  
  // 逐项比较依赖值
  for (let i = 0; i < nextDeps.length; i++) {
    if (nextDeps[i] !== prevDeps[i]) return false;
  }
  
  return true;
}

/**
 * 修改后的 render 函数
 * 增加副作用执行阶段
 */
function render(Component, props, container) {
  let fiber = container._rootFiber;
  if (!fiber) {
    fiber = new Fiber(Component, props);
    container._rootFiber = fiber;
  } else {
    fiber.alternate = { ...fiber };
    fiber.props = props;
    fiber.effects = []; // 重置副作用队列
  }
  
  // 执行组件函数（创建阶段，收集副作用）
  reconcileChildren(fiber);
  
  // 执行所有需要同步执行的副作用
  commitRoot(fiber);
  
  return fiber;
}

/**
 * 提交阶段
 * 执行所有收集到的副作用
 */
function commitRoot(fiber) {
  // 遍历执行所有副作用
  fiber.effects.forEach(effect => {
    if (typeof effect === 'function') {
      effect(); // 执行副作用函数
    }
  });
}

/**
 * 示例组件：带副作用的计数器
 */
function CounterWithEffect({ initialCount }) {
  const [count, setCount] = useState(initialCount);
  
  // 每次 count 变化时执行
  useEffect(() => {
    console.log(`Counter is now: ${count}`);
    
    // 返回清理函数（可选）
    return () => {
      console.log(`Cleaning up counter: ${count}`);
    };
  }, [count]); // 依赖 count，只有 count 变化时才重新执行
  
  // 只在挂载时执行一次的副作用（通过空依赖数组实现）
  useEffect(() => {
    console.log('Component mounted');
    
    return () => {
      console.log('Component will unmount');
    };
  }, []); // 空依赖数组表示只在挂载和卸载时执行
  
  return {
    count,
    increment: () => setCount(c => c + 1),
    decrement: () => setCount(c => c - 1)
  };
}

/**
 * 测试代码
 */
function testUseEffect() {
  const container = { _rootFiber: null };
  
  console.log('First render:');
  const component = render(CounterWithEffect, { initialCount: 0 }, container);
  
  console.log('\nUpdating state:');
  component.increment();
  
  console.log('\nSecond render:');
  flushUpdateQueue();
  
  // 模拟卸载
  console.log('\nUnmounting:');
  container._rootFiber.effects.forEach(effect => {
    if (effect.destroy) {
      effect.destroy();
    }
  });
}

// 执行测试
testUseEffect();  
```



对于useEffect 则是把effct回调函数和依赖项保存在当前的fiber节点的effectHooks数组中 在performWorkOfUnit函数中 当处理完当前节点的子节点 兄弟节点之后 对effect进行遍历 比较依赖项 

##### 为什么通过链表实现fiber架构

##### act fiber 渲染中断恢复机制的实现思路

Fiber 渲染过程可分解为两个阶段：



1. **协调阶段（Reconciliation）**：可中断的工作，构建 Fiber 树
2. **提交阶段（Commit）**：不可中断的工作，将变更应用到 DOM

我们的实现主要针对协调阶段，通过以下步骤实现中断与恢复：



1. **工作循环（WorkLoop）**：每次处理一个 Fiber 节点
2. **中断控制**：通过 `isInterrupted` 标志决定是否暂停
3. **上下文保存**：将当前处理的 Fiber 节点和相关状态存入缓存
4. **恢复机制**：从缓存中读取上下文，从中断位置继续执行

```javascript
// 全局变量：当前工作中的 Fiber 节点和中断标志
let workInProgress = null;
let isInterrupted = false;
let savedContext = null;

// Fiber 节点结构
class FiberNode {
  constructor(type, props, parent) {
    this.type = type;      // 组件类型
    this.props = props;    // 组件属性
    this.parent = parent;  // 父 Fiber 节点
    this.child = null;     // 第一个子 Fiber 节点
    this.sibling = null;   // 下一个兄弟 Fiber 节点
    this.alternate = null; // 对应的旧 Fiber 节点（用于 diff）
    this.stateNode = null; // 对应的 DOM 节点或组件实例
    this.effectTag = null; // 副作用标签（如插入、更新、删除）
  }
}

// 调度渲染工作
function scheduleWork(rootFiber) {
  workInProgress = rootFiber;
  
  // 如果有保存的上下文，恢复工作
  if (savedContext) {
    workInProgress = savedContext.workInProgress;
    isInterrupted = false;
    savedContext = null;
  }
  
  // 请求浏览器空闲时执行工作循环
  requestIdleCallback(workLoop);
}

// 工作循环：处理 Fiber 节点
function workLoop(deadline) {
  // 只要有时间且未被中断，就继续处理 Fiber 节点
  while (workInProgress && !isInterrupted && deadline.timeRemaining() > 1) {
    workInProgress = performUnitOfWork(workInProgress);
  }
  
  // 如果工作未完成但被中断，保存上下文
  if (workInProgress && isInterrupted) {
    savedContext = {
      workInProgress,
      // 保存其他必要的上下文信息（如当前的 hooks 状态等）
    };
    console.log('渲染被中断，上下文已保存');
    return;
  }
  
  // 如果所有工作都完成了，进入提交阶段
  if (!workInProgress) {
    commitRoot();
  } else {
    // 时间不足但未被中断，继续请求调度
    requestIdleCallback(workLoop);
  }
}

  // 模拟可能导致中断的条件（如长时间运行）
  if (Math.random() > 0.8) { // 20% 的概率触发中断
    isInterrupted = true;
  }
}

// 协调子节点，生成新的 Fiber 树
function reconcileChildren(fiber, children) {
  // 实际的 diff 算法实现
  // 简化版：创建新的 Fiber 节点
null;
    children.forEach((child, index) => {
      const newFiber = new FiberNode(
        typeof child === 'string' ? 
// 恢复渲染的方法
function resumeRender() {
  if (savedContext) {
    scheduleWork(null); // 传入 null 表示使用保存的上下文
  }
}
```

### react18有哪些更新

1. setState自动批处理

在react17中，只有react事件会进行批处理，原生js事件、promise，setTimeout、setInterval不会

react18，将所有事件都进行批处理，即多次setState会被合并为1次执行，提高了性能，在数据层，将多个状态更新合并成一次处理（在视图层，将多次渲染合并成一次渲染）

2. 引入了新的root API，支持new concurrent renderer(并发模式的渲染)

```javascript
//React 17
import React from "react"
import ReactDOM from "react-dom"
import App from "./App"

const root = document.getElementById("root")
ReactDOM.render(<App/>,root)

// 卸载组件
ReactDOM.unmountComponentAtNode(root)  

// React 18
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
const root = document.getElementById("root")
ReactDOM.createRoot(root).render(<App/>)

// 卸载组件
root.unmount()  

```

3. 去掉了对IE浏览器的支持，react18引入的新特性全部基于现代浏览器

4. flushSync

   批量更新是一个破坏性的更新，如果想退出批量更新，可以使用flushSync

   ```react
   import React,{useState} from "react"
   import {flushSync} from "react-dom"
   
   const App=()=>{
     const [count,setCount]=useState(0)
     const [count2,setCount2]=useState(0)
   
     return (
       <div className="App">
         <button onClick=(()=>{
           // 第一次更新
           flushSync(()=>{
             setCount(count=>count+1)
           })
           // 第二次更新
           flushSync(()=>{
             setCount2(count2=>count2+1)
           })
         })>点击</button>
         <span>count:{count}</span>
         <span>count2:{count2}</span>	
       </div>	
     )
   }
   export default App
   
   
   ```

   5. react组件返回值更新

      1. 在react17中，返回空组件只能返回null，显式返回undefined会报错
      2. 在react18中，支持null和undefined返回

   6. strict mode更新:当你使用严格模式时，React会对每个组件返回两次渲染，以便你观察一些意想不到的结果,在react17中去掉了一次渲染的控制台日志，以便让日志容易阅读。react18取消了这个限制，第二次渲染会以浅灰色出现在控制台日志

   7. Suspense不再需要fallback捕获

   8. 支持useId 在服务器和客户端生成相同的唯一一个id，避免hydrating的不兼容

   9. useSyncExternalStore:用于解决外部数据撕裂问题

   10. useInsertionEffect:这个hooks执行时机在DOM生成之后，useLayoutEffect执行之前，它的工作原理大致与useLayoutEffect相同，此时无法访问DOM节点的引用，一般用于提前注入脚本

   11. Concurrent Mode:

   12. 在**concurrent模式**中，React可以同时更新多个状态

       区别就是使**同步不可中断更新**变成了**异步可中断更新**

   

   ##### react的设计思想

   1. 组件化：组件符合开放封闭原则 封闭是针对渲染工作流而言的 每一个组件的状态都是自己维护 只处理自己的渲染逻辑 开放是针对组件通信而言 指的是不同组件可以通过单项数据流进行通信
   2. 数据驱动视图：不应该直接控制dom进行更新 而是修改组件的state 或者props 使用数据驱动视图更新 
   3. 虚拟dom：react为了在实现跨平台的同时保证高效性 需要使用一套与平台无关的虚拟don 而一套与平台有关的api 所以react使用了虚拟dom描述真实页面的结构 并且使用diff算法 fiber架构来确保高效率
   4. fiber架构：react使用一个类似于requestIdleCallback的api来执行渲染和更新 ，通过判断剩余时间来确定需不需要执行当前的任务 这个任务拆分就要使用fiber架构来实现 flber架构可以把前文提到的虚拟dom树从树结构转换成链表结构 是react实现优先级 恢复 中断的重要架构 
   5. 

   

