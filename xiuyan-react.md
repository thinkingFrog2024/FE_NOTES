### 01JSX代码是如何“摇身一变”成为DOM的？

React 17+ 引入了新的 JSX 转换（`react/jsx-runtime`），不再需要手动引入 `React`，编译后更简洁，但核心原理不变。它**不再依赖 `React.createElement`**，而是直接从 React 包中导入两个新的辅助函数：`jsx` 和 `jsxs`（用于静态子节点）。

- **`React.createElement`**：运行时函数，接收三个参数（`type`、`props`、`children`），需处理复杂的子节点扁平化逻辑（如将 `[a, b]` 展开为 `a, b`）。
- **`jsx`**：编译时辅助函数，接收两个参数（`type`、`props`），子节点直接作为 `props.children` 传递，无需扁平化，实现更轻量。

react的文档中 对jsx的描述是：

jsx是js的一种语法拓展 他和模板语言很接近 但是他充分具备js的能力

jsx会被编译成react.createElemebnt 这个函数将会返回一个叫React Element的对象

这个函数接受三个参数：type config children 

1. 二次处理key ref self source
2. 遍历config 处理props
3. 提取子元素 推入props.children数组
4. 格式化defaultProps

**实际上 这个函数就是格式化数据** ，然后使用**格式化好的数据来初始化ReactElememt对象 也就是虚拟dom**

##### 转换工具:

1. **Babel**：最常用的 JSX 编译器，通过`@babel/plugin-transform-react-jsx`插件实现转换。
2. **TypeScript**：内置支持 JSX 转换，通过`tsconfig.json`中的`jsx`选项配置。
3. **Vue 3**：使用`@vue/babel-plugin-jsx`插件支持 JSX 语法，编译为 Vue 的渲染函数

可以通过 Babel 插件自定义 JSX 的转换目标，例如：

```
// 配置Babel使用自定义JSX工厂函数（非React）
// .babelrc
{
  "plugins": [
    ["@babel/plugin-transform-react-jsx", {
      "pragma": "h", // 使用h函数替代React.createElement
      "pragmaFrag": "Fragment"
    }]
  ]
}
```



##### 02为什么React16要更改组件的生命周期？(上)

组件化是工程化思想在框架里面的落地

react对组件的描述是：封闭又开放的

封闭指的是：**在组件自身的渲染工作流（数据改变-》视图改变）里面 每个组件都只处理自身内部的渲染逻辑**

开放指的是：**reatc允许开发者基于单向数据流的原则完成组件之间的通信 而组件之间的通信又会改变通信双方/某一方的内部状态 进而影响渲染结果**



render就是raect的灵魂 生命周期则是躯干



react15里面的生命周期(针对于类组件)：

```
组件被创建并插入 DOM 时调用：

componentWillMount()：在组件挂载前调用，已废弃
render()：渲染组件
componentDidMount()：组件挂载后调用，可用于 DOM 操作、数据获取等

组件接收新的 props 或 state 时调用：

componentWillReceiveProps(nextProps)：接收新 props 前调用
shouldComponentUpdate(nextProps, nextState)：控制组件是否更新
componentWillUpdate(nextProps, nextState)：更新前调用，已废弃
render()：重新渲染
componentDidUpdate(prevProps, prevState)：更新后调用

组件从 DOM 中移除时调用：

componentWillUnmount()：卸载前调用，用于清理工作
```

1. **已废弃的钩子函数**：

   - `componentWillMount`
   - `componentWillReceiveProps`
   - `componentWillUpdate`

   这些函数在 React 16.3 后被标记为不安全，React 17 中已完全移除，被`UNSAFE_`前缀版本替代。

React 16 版本对生命周期进行了重大调整，主要是为了支持异步渲染（Async Rendering）。这些变化在 React 16.3 版本引入，16.4 版本进一步完善，并在 React 17 中完全移除了旧的不安全生命周期方法。

- **废弃旧生命周期方法**：
  - `componentWillMount` → 替换为 `constructor` 或 `componentDidMount`
  - `componentWillReceiveProps` → 替换为 `static getDerivedStateFromProps`
  - `componentWillUpdate` → 替换为 `getSnapshotBeforeUpdate`
- **新增生命周期方法**：
  - `static getDerivedStateFromProps(props, state)`：在组件实例化和接收新 props 时触发 这个钩子函数在16.3里面只会因为父组件更新而引起 在之后的版本中自身触发的更新也会调用
  - `getSnapshotBeforeUpdate`：在 DOM 更新前获取当前状态快照 返回值会作为第三个参数传递给`componentDidUpdate`
  - `componentDidCatch`：捕获子组件中的错误 只能捕获渲染期间、生命周期方法和构造函数中的错误
- **异步渲染相关**：
  - 引入 `componentDidCatch` 和 `getDerivedStateFromProps` 支持错误边界和异步渲染

componentWillUpdate为什么必须移除：对fiber有不好的影响



16的修改·就是为了配合fiber的异步渲染机制了



在react16里面引入了fiber 这是对react核心算法的一次总结 fiber会把原来同步的渲染变成异步的

为什么干掉同步渲染？ 因为同步递归的调用栈是非常深的 一定要等到最后的结果返回才能结束 也就是说 在这个过程里面 js无法执行 页面不能相应用户事件

而fiber架构 是把一个大型的任务拆解成多个很多个小的任务 一旦一个小人物完成执行 就把执行权交回主线程 查看有没有优先级更高的任务  这样 一个原本必须一次全部执行完成的任务 就变成多个慢慢执行的异步任务 

fiber架构的重要特征 就是可以被打断的异步渲染模式 根据可以被打断吗 react16的生命周期被划分成render commit两个阶段

在render阶段里面 运行纯函数 并且是可以打断 恢复的过程   因为这个过程对于用户而言其实是不可见的 打断 重启对用户而言也是无感知的

createCommit 是同步的 可以读取dom

commit可以运行副作用 提交dom 同步



由于render打断再执行 是从头执行这个任务 而并不是说 从中断的地方恢复执行 所以render阶段的生命周期 其实是有可能反复执行  也就是这几个钩子：

- `componentWillMount`
- `componentWillReceiveProps`
- `componentWillUpdate`

那么会导致以下问题：

- **副作用**（如 API 调用、DOM 操作）被重复执行
- **状态更新逻辑**被多次触发，导致数据不一致
- **性能问题**，特别是在这些方法中执行了复杂计算时

React 16 引入的新生命周期方法（如`getDerivedStateFromProps`和`getSnapshotBeforeUpdate`）虽然在异步渲染模式下可能会被多次调用，但它们被设计为**纯函数**，只负责数据转换或状态快照，**不允许包含副作用**。这正是 React 团队对生命周期进行调整的核心策略之一。





在16.3之前 context并不推荐使用 这是因为旧版本context语法较为复杂 并且不能**保证数据在生产者 消费之间的及时同步** 这是因为 如股票provider提供的数据发生了变化 **而shouldCompoenntUpdate返回了false 那么使用了这个值的后代组件不会进行更新**

而在之后的版本 改进了这一点 并且写法更舒服了



###  04数据是如何在React组件之间流动的？(上)

这个部分比较简单就不写了

redux：**redux是js状态容器 提供可预测的状态管理**

在**redux的工作流程里 数据流是严格单向的**

![image-20250627184552842](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627184552842.png)

### 06React-Hook设计动机与工作模式(上)



reacthooks系统是组件开发实践过程的一个改进点 背后其实是对类组件和函数组件两种组件形式的思考

早期没有hooks 函数组件内部就不能定义自己的状态 所以**早期的函数组件是一种无状态组件** 

* 类组件需要继承class 函数组件不需要
* 类组件有生命周期方法 
* 类组件可以获取实例化之后的this
* 类组件可以定义维护state

**函数组件会捕获render内部的状态** 这是两类组件最大的不同

![image-20250627185742787](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627185742787.png)



在类组件里面 **props是不可变的  但是this是可变的 this上的数据是可以修改的**

那么当开发者使用setTimeout打破了渲染和this.props在事件上的相连 那么就会导致获取的数据是更新之后的数据

在 React 类组件中，`this.props` 是通过实例属性访问的，而不是函数参数。这意味着当你在异步回调（如 setTimeout）中访问 `this.props` 时，你获取的是回调执行时的 `this.props` 值，而不是回调创建时的值。

而**函数组件使用闭包捕获避免了这个问题** 函数式组件真正的把渲染和数据绑定到一起了



早期函数组件很大的弊端就是维护不了状态 而useState正式一个可以为函数组件引入状态的api

**而useEffect则弥补了函数组件没有生命周期的问题：在useEffect里面执行副作用 可以模拟componentWillMount componentWillUpdate compoenntWillUnmount**



##### Hooks系统带来了哪些升级？ 解决了哪些问题？

1. 不必使用class类组件 this指向性的不确定和生命周期的行为会使得组件逻辑非常复杂

   ```
   change(){
   	this.set....
   }
   return(){
   	<button onClick={this.chanege}>....
   }
   这段代码会报错 原因是：把this.change注册成点击事件 在调用的时候并不会通过this调用 而是直接调用函数 导致方法内部this的丢失
   虽然我们可以为函数绑定this/使用箭头函数 但是这还是会造成很多负担
   ```

2. 业务逻辑混乱 难以拆分：**类组件的业务逻辑和生命周期耦合 会导致本来应该放在一起的逻辑拆分到不同的生命周期里面 ，在类组件里面 使用逻辑拆分一般使用HOC** renderProps 但是这两种方式滥用也会破坏组件结构 甚至导致嵌套地狱 而Hooks系统允许我们把组件逻辑变成自定义hook

3. 正式自定义Hook的出现 **可以直接在函数里面使用Hook 从而实现见到的逻辑复用** 

4. 在设计理念上 react的设计理念就是 view = f(date) 所以按照设计理念来讲 组件就是一个得到数据 返回视图的函数



![image-20250627191707289](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627191707289.png)





1. 只能在函数组件里面使用hook
2. 不可以在判断 循环里面调用hook

![image-20250627192038231](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627192038231.png)

1. 调用 `useState`

开发者在函数组件里写 `const [state, setState] = useState(initialState)` ，这是入口，触发 React 内部对状态管理的处理流程。

2. **通过 `resolveDispatcher` 获取 `dispatcher`**

- **作用：`dispatcher` 是 React 内部维护的 “调度器” 对象，它持有一系列和状态、更新相关的方法（比如 `useState` 实际执行逻辑、`useEffect` 相关逻辑等 ）。**
- **细节：在函数组件执行上下文里，`resolveDispatcher` 会找到当前组件对应的 `dispatcher` 。可以简单理解成，它要确定 “在哪个组件环境里处理这次 `useState` 调用”，保证状态能准确关联到对应的组件实例。**

3. 调用 `dispatcher.useState`

`dispatcher` 上的 `useState` 方法，是真正开始处理状态逻辑的起点。它会基于 React 内部的 Fiber 架构（组件的虚拟 DOM 表示，用于调度和渲染），**找到当前组件对应的 Fiber 节点，准备更新状态。**

4. 调用 `updateState`

是更具体的 “状态更新规划” 方法。它会判断是初始化状态（组件第一次渲染）还是更新状态（后续触发 ）：

- 初始化时，把 `initialState` 赋值给内部维护的状态变量。
- 更新时，接收新状态（或更新函数），**计算出 “待应用的新状态”，并标记 Fiber 节点为 “需要更新”，让 React 后续能调度渲染**。ps：这是一个等待执行的任务？

5. 调用 `updateReducer`

- **关联**：**`useState` 底层其实和 `useReducer` 是 “同构” 的，`useState` 可以看成 `useReducer` 的简化版**（固定了 reducer 逻辑，就是直接替换 / 合并状态 ）。
- **作用**：`updateReducer` 会按照 “reducer 模式” 处理状态变更 。对于 `useState` ，它用一个默认的 “简化 reducer”，接收当前状态和新状态（或更新函数），算出最终要设置的状态，然后触发后续的渲染调度。

6. 返回目标数组（如 `[state, useState]` ）

- 经过前面的流程，React 内部已经明确了当前最新的状态值，以及用来更新状态的 `setState` 函数（本质是绑定了当前组件调度逻辑的更新触发函数 ）。
- 把 `[当前状态值, 状态更新函数]` 返回给开发者，这样在组件里就能通过解构赋值拿到 `state` 和 `setState` ，用于渲染和触发状态更新。



dispatcher是什么？

`dispatcher` 是一个**对象**，包含了所有 React Hooks 的实现函数（如 `useState`、`useEffect`、`useRef` 等）。它的核心作用是：
**根据当前组件的渲染阶段（初始化 / 更新），分发并执行对应的 Hooks 逻辑**。

**React 函数组件是无状态的纯函数，每次渲染都会执行整个函数。为了让函数组件 “记住” 状态（如 `useState`）或处理副作用（如 `useEffect`），React 需要一个机制来：**



1. **存储状态：在多次渲染之间保持状态值。**
2. **关联 Hooks：确保每次渲染时，Hooks 的调用顺序和结果一致（即 “Hook 规则”）。**
3. **区分阶段：判断当前是组件的首次渲染（初始化）还是后续更新，执行不同的逻辑。**



`dispatcher` 就是这个机制的实现者，它让 React 能在函数组件的 “无状态” 外壳下，实现强大的状态管理和副作用控制。

````javascript
React 通过 resolveDispatcher 函数获取当前的 dispatcher：
function resolveDispatcher() {
  const dispatcher = ReactCurrentDispatcher.current;
  // 检查 dispatcher 是否存在（防止在 React 组件外调用 Hooks）
  if (__DEV__) {
    if (dispatcher === null) {
      console.error('Hooks can only be called inside the body of a function component.');
    }
  }
  return dispatcher;
}
````







![image-20250627192114224](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627192114224.png)

![image-20250627192238394](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627192238394.png)

### 09真正理解虚拟DOM：React选它，真的是为了性能吗？



dom更新的历史变迁：

原生js时期 dom更新需要使用原有的api实现 效率低下 并且开发困难

后来出现了jquery 是可以把数据绑定在节点上面 简化了更新的逻辑 但是工作量还是巨大的

之后引入了模板语法：使用js生成html字符串并且插入 这种全量更新的效率是非常低的

**为了改善研发效率 解决跨平台问题 我们引入了虚拟dom 向上对开发者暴露通用的js对象 向下根据不同的渲染平台使用不同的底层api**

**但是虚拟dom造成一个问题：重新生成一个新的虚拟dom树之后 程序并不知道哪些地方发生过更新 这样的话就只能全量更新** 

**所以框架引入diff算法 用于锁定发生修改的范围 diff算法本质就是js的运算 大量的js运算和少量dom操作带来的性能消耗才有可比性 所以 diff算法是使用性能消耗低的js操作 弥补高能耗的dom** 

但是数据量改变非常大的时候 那么差量更新计算出来的结果和全量更新接近 但是js消耗更多 这种情况下 虚拟dom的性能反而更差了 

dom操作模式的每一次革新 都是前端对效率和体验的进一步追求 **虚拟dom的出现 为数据驱动视图这一思想提供了载体 使得前端开发可以基于函数式ui的方式进行生命式的编程**



**虚拟dom是对真实dom的抽象层 如果没有这个抽象层 视图层将会和渲染平台紧密耦合**



### 10React中的“栈调和”(StackReconciler)过程是怎样的？

batch**:react的批处理机制 目的是多次更新触发一次渲染 能够避免组件呈现部分状态不更新 减少渲染次数**

react18之前 仅在 React **可控的同步事件**中自动批处理，比如：

- 合成事件（`onClick`、`onChange` 等 React 封装的事件）里的多次 `setState`。
- 生命周期（`componentDidMount` 等）里的状态更新

在 React **无法管控的异步场景**中，不会自动批处理

- `setTimeout`、`setInterval` 回调。
- `Promise` 回调、原生事件（`addEventListener` 绑定的事件）。
  这些场景下，每次 `setState` 都会触发一次渲染。

react18之后  **无论更新发生在何处**（同步 / 异步场景），React 都会尝试自动批处理 依赖 React 18 引入的**并发渲染（Concurrent Rendering）** 架构，通过调度器（Scheduler）统一管理更新，将同一 “事件循环周期” 内的更新合并。



![image-20250627193503375](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627193503375.png)

![image-20250627193546426](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627193546426.png)

![image-20250627193728888](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627193728888.png)

第三个要点则是：dom操作一般发生在相同的层级 所以只在同层级进行对比

![image-20250627193828120](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627193828120.png)

![image-20250627194002259](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627194002259.png)

![image-20250627194020868](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627194020868.png)

![image-20250627194113770](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627194113770.png)

### 11etState到底是同步的，还是异步的？



![image-20250627194502398](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627194502398.png)

![image-20250627194644837](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627194644837.png)

![image-20250627194806956](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627194806956.png)

![image-20250627195725464](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627195725464.png)

  ![image-20250627195911006](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627195911006.png)

![image-20250627200003018](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627200003018.png)



  ![image-20250627200043665](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627200043665.png)                             



![image-20250627200113699](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627200113699.png)



![image-20250627200239929](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627200239929.png)

 

![image-20250627200509564](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627200509564.png)

![image-20250627200736364](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627200736364.png)

![image-20250627200831917](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627200831917.png)

所以我们所说的 setState的表现会因为调用场景不同而表现出不同 其实是因为内置isBatchingUpdates的值在同步调用栈和微任务 宏任务队列里的值不相同

React 的 `setState` 异步行为依赖于 **React 的事件系统**（即 `SyntheticEvent` 合成事件）。当事件通过 React 组件的 JSX 绑定（如 `onClick`）时，React 会拦截事件并在自己的执行上下文中处理，此时会触发批量更新和异步优化。

在 DOM 原生事件中，React 无法控制事件的执行上下文（事件直接由浏览器触发）

### 12如何理解Fiber架构的迭代动机与设计思想？

fiber是对react核心算法的重写 

fiber是一种数据结构

fiber保存了组件的状态



在以前的版本里面 react更新是使用协调器找出新旧节点差异 在调用ernderer把差异反映到页面上 但是**react新版本引入schelduler 调度更新的优先级**

这个控制器 把更新任务拆分成很多小的fiber 就比如插入一个元素 删除一个元素 都可以是一个fiber 

如果发现一个新的任务的优先级比当前正在执行的任务的优先级高 那么正在reconciler的任务将会被标记成“处于打断状态 立即退出执行” 而转而执行高优先级任务 之后 以前的任务又会重新执行 状态被标记成运行 这样就恢复了之前的任务 



初始化阶段 

render阶段

commit阶段

![image-20250627202311015](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627202311015.png)



分析调用栈可以知道：只用这个legacy函数进行初始化  这个函数的流程如下：

![image-20250627210346137](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627210346137.png)



这里面提到的：fiberRoot对象 就是FiberRootNode实例

而这个对象上的current属性 指向rootFiber属性 这是一个FiberNode节点 

说直接一点

![image-20250628110502745](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628110502745.png)

current是一个fiber节点 并且他还是当前fiber树的头部节点 这个节点是使用一个函数创建的 并且在源码里多次使用rootFiber指代这个节点

fiberRoot将会和ReactDom.renedr方法的其他入参作为参数传进updateContainer方法

 从而形成一个回调 这个回调作为参数传递给unBatchedUpdates 在这个函数里面 将会调用这个函数 而这个函数里面会：

![image-20250628110948853](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628110948853.png)



但是这个在ReactDOM.render发起的首次渲染 这些意义不大 因为渲染过程是调用一个同步函数实现的：**performSyncWorkOnRoot**

这个函数是render的起点 

那么为什么说 明明fiber架构的关键是异步渲染 看到现在 居然是同步

这是因为react的渲染有三个模式：

![image-20250628111421112](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628111421112.png)legacy实际上触发的还是同步的渲染链路

异步的话 应该调用createRoot

异步渲染模式下的调用栈：

![image-20250628111624523](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628111624523.png)其实调用链路是相似的 关键在于模式判断

![image-20250628111848227](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628111848227.png)

那么react是怎么知道渲染模式的呢：

![image-20250628112028582](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628112028582.png)

fiber架构确实是为了异步渲染而存在的 但是他们并不是严格的等号 它是一种同时兼容同步异步的设计









react15里面的调和是一个递归的过程 在同步模式里面 这个过程就是一个深度优先搜索 

在这个过程里面 **beginWork创建新的Fiber节点 completeWork吧fiber节点映射成DOM节点** 新的节点的创建方式就是=》子节点有限=》兄弟其次=》都不存在则回到父元素 然后使用取出的元素创建fiber节点 

![image-20250628112609750](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628112609750.png)

在这个createWorkInprogress里面 将会创建workinProgress节点

**![image-20250628114203508](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628114203508.png)**

![image-20250628114222028](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628114222028.png)

![image-20250628114307660](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628114307660.png)



**workInProgress其实是current的一个副本 以他们为起点 构建两颗dom树**

**这个函数内部做的事情其实就是构建fiber树 并且把workinProgress指向新的节点**

构建新的fiber节点则是通过beginWork实现的

- **递阶段**：从根节点开始，向下遍历 Fiber 树，调用 `beginWork` 函数处理每个节点（创建或更新 Fiber 节点）。
- **归阶段**：当某个节点的所有子节点都处理完毕后，向上 “冒泡”，调用 `completeWork` 函数处理当前节点（构建 DOM、处理副作用标记等）。

![image-20250628114509445](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628114509445.png)

![image-20250628120857104](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628120857104.png)

![image-20250628120945206](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628120945206.png)

这个函数是构建fiber树的 只要这个节点不为空就一直构建 修改这个节点就是更新 把更新的树diff了再commitRoot提交到真实页面 

这个过程构建的就是workinProgresstree 并且fiberFoot的cuurent所在的树就是current树

![image-20250628121248485](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628121248485.png)

   直到某次创建的节点是空 代表fiber树的构建完成 此时将会调用completeUnitOfWork 这个函数的作用就是调用completeWork

![image-20250628122748046](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628122748046.png)

CompleteWork的作用：`completeWork` 会根据节点的类型（如 `HostComponent`、`ClassComponent`、`FunctionComponent` 等）执行不同的逻辑，但主要职责包括

- **首次挂载（`mount`）**：**创建真实 DOM 节点**，并设置初始属性（如 `className`、`style`、`children` 等）。
- **更新阶段（`update`）**：**比较新旧 props，只更新变化的属性**（如 `onClick` 事件、`value` 值等）。
- 集当前节点和子节点的副作用标记（如 `Placement`、`Update`、`Deletion` 等）。
- **将这些标记添加到 `completeWork` 的返回值 `fiber.effects` 链表中，最终传递给提交阶段（`commitRoot`）处理。**
- 对于文本节点（如 `<div>Hello</div>` 中的 `Hello`），创建或更新对应的 `Text` 节点。
- 处理 `ref` 更新（如 `useRef` 或类组件的 `ref` 属性）。
- 对于函数组件，将 `useEffect`、`useLayoutEffect` 等副作用标记添加到链表中。

其中提到的将这些标记添加到 `completeWork` 的返回值 `fiber.effects` 链表中，最终传递给提交阶段（`commitRoot`）处理。 

正式这个步骤 把当前节点的副作用链插入父节点的副作用链

（此处不讨论fiber树的具体构建了 反正就是图上这样）

![image-20250628131226683](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628131226683.png)



副作用链 可以理解成render阶段工作结果的集合





![image-20250628135332746](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628135332746.png)

![image-20250628131451872](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628131451872.png)



**这个作用域链 是一个链表结构 是通过头节点 尾节点进行维护的**

把所有需要更新的Fiber节点单独串成一串链表 这就是副作用收集

![image-20250628140044239](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628140044239.png)

![image-20250628140210814](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628140210814.png)





那么 为什么需要两套fiber树？

![image-20250628140722059](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628140722059.png)

 

![image-20250628140743460](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628140743460.png)

![image-20250628140811326](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628140811326.png)

  首次渲染的时候 构建其中一颗fiber树：

![image-20250628141017763](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628141017763.png)

在执行commit的时候 右侧的树就会渲染到页面上 然后修改current指针 

在进行修改的术后 rect将会修改current指针指向的那棵树 构建新的fiber树并且构建关系

  ![image-20250628141333911](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628141333911.png)

第二次更新的时候 每个节点都不为空 那么就可以直接复用

触发更新的时候 将会把更新包装成一个update对象：

![image-20250628141554478](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628141554478.png)



![image-20250628141653317](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628141653317.png)

每一个fiber节点都有自己维护的updateQueue

![image-20250628141735249](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628141735249.png)

那么render是怎么进行的？

在之前我们说到了同步模式下的render：

![image-20250628141914373](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628141914373.png)

![image-20250628142003350](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628142003350.png)





据优先级决定调用的方式

![image-20250628142100226](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628142100226.png)

![image-20250628142207621](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628142207621.png)

执行一个时间很长的任务的时候 这个灰色长条代表的就是这个任务

如果把render方法变成createRoot方法 就会变成这样：

![image-20250628142340537](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628142340537.png)



![image-20250628142551224](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628142551224.png)

如果shouldYield 为true 那么就代表需要对主线程进行让步 

至于这个shouldYield的判断逻辑 就是判断当前事件是否大于react决定的本次的任务执行事件  至于这个deadline的计算逻辑 则是当前的时间加yieldInterval      

由于react的设计思想是避免长时间占用主线程导致页面卡顿 所以会尽量让单个任务的执行时间不超过一帧的时间 所以这个yieldInterval 就是用来对齐浏览器一帧的时间的 

至于计算 则是可以使用RAF函数 间接计算得到的 

并且react内部会根据RequestIdlecallback计算空闲时间 结合帧率调整值  

![image-20250628142839041](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628142839041.png)

![image-20250628143012820](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628143012820.png)



![image-20250628143032512](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628143032512.png)

 ![image-20250628143153914](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628143153914.png)

![image-20250628143244904](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628143244904.png)

![image-20250628143325758](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628143325758.png)









​                                                        

13ReactDOM.render是如何串联渲染链路的？(上)
 16剖析Fiber架构下Concurrent模式的实现原理

### 17特别的事件系统：React事件与DOM事件有何不同？

react合成事件在底层抹平了不同浏览器之间的差异 在上层向开发者暴露统一的 稳定的 与原生dom事件相同的事件接口 

![image-20250628143717050](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628143717050.png)

![image-20250628143808828](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628143808828.png)

![image-20250628143828871](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628143828871.png)

ensureListeningto会尝试寻找当前fiber树的顶层节点  然后使用legacylisenToEvent里面把统一的事件处理函数添加到document上面 在这个函数里面 实际上是通过调用legacyListrnToTopEvent来处理事件和document之间的关系

当事件触发之后 冒泡到event上 **document上面绑定的同一时间处理程序就会把事件分发到具体组件实例**

**所以react最终注册到docuemnt上面的 并不是一个dom节点上面具体的回调函数 而是一个统一事件分发函数** 

事件分发函数有：**dispatchDiscreteEvent dispatchUserBlockingUpdate**

这两个处理函数的优先级不一样 但是**内部使用都是dispatchEvent**





![image-20250628173837247](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628173837247.png)



![image-20250628174044194](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628174044194.png)



![image-20250628174101744](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628174101744.png)





![image-20250628174132360](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628174132360.png)



![image-20250628174200036](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628174200036.png)



![image-20250628174317294](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628174317294.png)

这个过程里面 fn会对每个节点的捕获情况进行检查 要是捕获回调不为空 将会执行对应的回调函数 ![image-20250628174549440](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628174549440.png)

模拟捕获和冒泡阶段使用的是同一个数组 之后对这个数组进行顺序遍历得到的就是正确的触发顺序

![image-20250628175009358](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628175009358.png)



**其实事件系统的主要考量并不是性能 而是便于react的管理** 

18揭秘Redux设计思想与工作原理(上)



**![image-20250628175252257](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628175252257.png)**

![image-20250628175325242](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628175325242.png)

![image-20250628175406242](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628175406242.png)

flux架构的特点：单向数据流

![image-20250628175445655](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628175445655.png)

![image-20250628175510828](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628175510828.png)



![image-20250628175634931](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628175634931.png)

单向数据流的优点：状态的变化可以预测

###### creatSrore函数 

**![image-20250628180829776](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628180829776.png)**

对于createStore这个函数 基本功能就是：获取当前的状态 监听器注册函数 dispatch函数 用于触发reducer

![image-20250628181546445](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628181546445.png)

###### combineReducer

有的时候需要把多个reducer合并成一个reducer 在每个reducer里面管理了state的一个片段 

基本原理如下：

```javascript
// combineReducers 简化实现
function combineReducers(reducers) {
  // 过滤掉非函数的 reducer
  const reducerKeys = Object.keys(reducers).filter(
    (key) => typeof reducers[key] === 'function'
  );

  return function combinedReducer(state = {}, action) {
    const nextState = {};
    let hasChanged = false; // 标记 state 是否变化

    // 遍历所有 reducer，计算对应 state 片段
    reducerKeys.forEach((key) => {
      const reducer = reducers[key];
      const previousStateForKey = state[key]; // 当前 state 片段
      const nextStateForKey = reducer(previousStateForKey, action); // 计算新片段

      nextState[key] = nextStateForKey; // 存储新片段
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey; // 标记变化
    });

    return hasChanged ? nextState : state; // 有变化返回新 state，否则返回原 state
  };
}
```



![image-20250628181801588](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628181801588.png)

![image-20250628181845430](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628181845430.png)



![image-20250628181915373](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628181915373.png)

 

![image-20250628181956997](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628181956997.png)

![image-20250628182047710](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628182047710.png)



![image-20250628182201922](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628182201922.png)

![image-20250628182318615](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628182318615.png)

假设在listrnerB里面对A事件进行解除监听

那么在执行到b的时候 数组正在遍历 index = 1 但是把A删除了 这改变了数组 但是for循环里面的index依然是1 那么c就会被跳过



![image-20250628182515884](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628182515884.png)

假设不存在这个ensure函数 就会这样 但是这个函数确保了地址不一样

![image-20250628182953963](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628182953963.png)

###### 中间件

Redux 原生只支持 **同步 action**（即 `dispatch` 必须接收一个纯对象），但实际应用中常需要处理异步操作（如 API 请求、定时器）。直接在组件中处理异步逻辑会导致代码冗余、可维护性差，而中间件可以优雅地解决这些问题：



- **分离关注点**：将异步逻辑从组件中抽离，集中管理。
- **统一处理**：所有异步操作遵循相同的模式，便于维护和测试。
- **可扩展性**：通过中间件链组合多种功能（如日志、错误处理）。

中间件的核心是 **拦截 action 的 dispatch 过程**，在 action 到达 reducer 前对其进行处理（如修改 action、延迟 dispatch、触发多个 action 等）。

中间件形成一个 **洋葱模型**：action 从最外层中间件进入，逐层传递到内层，最终到达 reducer；reducer 处理完后，再逐层返回。每个中间件可以在 “进入” 和 “返回” 时执行逻辑（如日志记录）。

Redux 中间件通过 **函数组合** 实现链式调用。每个中间件接收 `store` 和 `next` 函数（指向下一个中间件或原始 `dispatch`），返回一个处理 action 的函数。

一个标准的 Redux 中间件是一个 **三级函数**，结构如下：

```javascript
// 中间件函数（三级函数） 其实就是省略了return
const middleware = (store) => (next) => (action) => {
  // 1. 进入时的逻辑（如日志记录、修改 action）
  console.log('dispatching:', action);

  // 2. 调用 next(action) 将 action 传递给下一个中间件或 reducer
  const result = next(action); // next 是下一个中间件的返回函数

  // 3. 返回时的逻辑（如记录 state 变化）
  console.log('next state:', store.getState());

  // 4. 返回结果（通常是 action 或异步操作的结果）
  return result;
};
```

我们先讨论：如何实现一个中间件 使得redux可以支持异步操作

之后我们再讨论 react怎么应用enhancer的

对于原生的redux 要求dispatch接受的是纯对象 但是如果我们进行异步操作 我们需要发送请求 并且请求的结果可能成功失败 在不同的情况 我们可能进行不同的操作 也就是根据请求的结果决定dispatch哪个action 如果我们需要实现更加细粒度的控制 在 请求刚开始的时候也需要dispatch一个action 所以这个异步函数的大致流程就是

1. dispatch 开始加载 action
2. 等待异步结果的action
3. dispatch 收到异步结果的action

但是原生redux不能解决这个问题 因为reducer必须是一个同步函数 

那么我们的思路就是：创建一个异步函数 这个函数的执行思路如上所示、

应用中间件：检测到传递的action是一个异步函数的话 就把dispatch state传递给这个函数 并且执行 

```javascript
// 异步 Action Creator：返回一个函数（而非纯对象）
const fetchUser = (userId) => {
  // 返回的函数会被 thunk 中间件捕获并执行
  return async (dispatch) => {
    // 1. 先 dispatch 一个“开始加载”的 action
    dispatch({ type: 'FETCH_USER_START' });

    try {
      // 2. 执行异步操作（API 请求）
      const response = await fetch(`https://api.example.com/users/${userId}`);
      const user = await response.json();

      // 3. 异步成功后，dispatch “成功”的 action
      dispatch({ type: 'FETCH_USER_SUCCESS', payload: user });
    } catch (error) {
      // 4. 异步失败后，dispatch “失败”的 action
      dispatch({ type: 'FETCH_USER_FAILURE', payload: error.message });
    }
  };
};
```

```java
const thunkMiddleware = (store) => (next) => (action) => {
  // 关键逻辑：判断 action 是否为async标记的异步函数 只允许异步函数 如是同步函数 逻辑应该在reducer里面编写
  if (Object.prototype.toString.call(func) === 'AsyncFunction') {
    // 如果是函数，执行它，并传入 dispatch 和 getState（可选）
    return action(store.dispatch, store.getState); // 执行异步逻辑
  }

  // 如果 action 是纯对象（非函数），交给下一个中间件或原始 dispatch
  return next(action);
};
```

###### 那么redux内部是怎么实现应用中间件的呢？为什么使用applyMiddleWare包装第三方 或者自己编写的中间件就可以拦截dispatch



如果createStore接受的第二个参数是函数 那么这个函数会被认为成中间件 

那么 

1. createStore函数内部怎么应用这个函数
2. 这个applyMiddleware函数有什么作用

![image-20250628183338858](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628183338858.png)

middleware将会在真正调用dispatch之前调用 也就是对原来的action进行处理 

![image-20250628183622873](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628183622873.png)



 回答第一个问题：把原来的store作为参数传递给enhancer 所以这些enhancer接受的是一个store对象 ![image-20250628183849529](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628183849529.png)

![image-20250628183931368](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628183931368.png)

![image-20250628184029259](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628184029259.png)

`compose` 函数接收多个函数作为参数，并返回一个新的函数，新函数按照从右到左的顺序依次调用传入的函数。这意味着，最后传入 `compose` 的函数会最先执行，第一个传入的函数会最后执行 

![image-20250628184204739](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628184204739.png)

###### 面向切面编程

AOP面向切面的存在 正是为了解决面向对象的局限性 

![image-20250628184517573](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628184517573.png)





##### 21从React-Router切入，系统学习前端路由解决方案

![image-20250628184917617](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628184917617.png)

![image-20250628184926872](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628184926872.png)

 ![image-20250628184954136](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628184954136.png)





![image-20250628185019736](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628185019736.png)

![image-20250628185057132](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628185057132.png)、

![image-20250628185118928](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628185118928.png)









 22思路拓展：如何打造高性能的React应用？

![image-20250628185431911](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628185431911.png)



![image-20250628185559830](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628185559830.png)

`PureComponent` 是 React 提供的一个基类，继承自 `Component` 。它通过浅层比较（shallow comparison）来自动优化组件的渲染性能，主要应用于满足特定条件的组件中。

在 React 中，当父组件重新渲染时，它的子组件默认也会重新渲染，即使子组件的 props 和 state 并没有发生实际变化。而 `PureComponent` 会在 `shouldComponentUpdate` 这个生命周期钩子函数中，自动对 props 和 state 进行浅层比较。

`immutable` 即不可变数据，指的是一旦创建就不能被修改的数据结构。在 React 应用中，使用不可变数据有诸多好处，并且也有专门的库，如 `immutable.js` 来支持操作不可变数据。

```javascript
  state = {
    // 使用 immutable.js 创建不可变数据结构
    data: Map({ name: 'Bob', age: 30, hobbies: List(['reading', 'travel']) }) 
  };

  handleUpdate = () => {
    // 对不可变数据进行操作，会返回新的不可变数据
    const newData = this.state.data.set('age', 31); 
    this.setState({ data: newData });
  };
```

不可变数据（如 `immutable.js` 的 `Map`、`List`）的核心特性是：



- **任何修改都会返回新对象**（原对象保持不变）。
- 新旧数据的 **引用地址一定不同**（只要内容变了）。



这样 React 就能通过 `===` 快速判断数据是否变化，决定是否重新渲染。







###### react17有哪些改变？

jsx

事件重构

lane模型

时间中心化掌控不会再全部依赖document 而是转移到每个react组件自己的容器dm节点

放弃事件池 

当用户在 React 应用中的组件上触发一个事件（比如点击按钮）时，React 会拦截该事件，并从事件池中获取一个事件对象来封装原生事件的相关信息。

React 将这个事件对象传递给相应的事件处理函数（比如 `onClick` 回调），开发者可以在回调函数中访问事件对象的属性（如 `event.target`、`event.preventDefault()` 等）来处理事件。

在事件处理函数执行完毕后，React 并不会立即销毁这个事件对象，而是将其重置并放回事件池，以便后续的事件能够复用

#### 性能优化

- **减少内存占用**：如果每次事件触发都创建新的事件对象，会导致频繁的内存分配和垃圾回收。而通过复用事件对象，减少了内存分配的次数，降低了内存的占用，提升了应用的性能，特别是在事件频繁触发的场景下，如游戏应用中的鼠标移动、点击等操作。
- **提升执行效率**：复用事件对象避免了创建新对象的开销，使得事件处理流程更加高效，从而让应用的响应速度更快。

随着浏览器技术的发展，现代浏览器在内存管理和对象创建销毁方面已经有了很大的优化，创建和销毁事件对象的开销变得相对较小。而且，事件池机制本身也有一定的复杂性，在某些情况下，复用事件对象带来的性能提升已经不那么明显，反而增加了代码的复杂度和维护成本。

在 React 应用中，异步操作越来越常见，如使用 `setTimeout`、`Promise` 等。而事件池中的事件对象在事件处理函数执行完毕后就会被重置回收。在异步操作中，如果在事件处理函数执行后、异步操作回调触发前，事件对象被回收，那么在异步回调中再访问该事件对象的属性时，可能会得到错误的结果或者引发异常。虽然可以通过一些方法（如手动调用 `event.persist()` 来阻止事件对象被回收）来解决，但这增加了开发者的心智负担和代码的复杂性。

react16里面处理优先级采用的是expirationTime模型  使用的是时间长度表示 而Lane模型使用的是二进制数 

`expirationTime` 模型采用时间长度来表示任务的优先级。它的核心思路是给每个任务（比如状态更新、事件处理等）分配一个过期时间。这个过期时间表示该任务必须在什么时候之前被处理，时间越近，优先级越高。

：随着 React 应用场景的不断丰富，`expirationTime` 模型难以精确地表达复杂的优先级关系。例如，在多个不同类型的任务同时存在时，无法很方便地对它们的优先级进行精细调整。

在处理多个并发任务时，基于时间的模型会变得复杂，很难处理任务之间的依赖关系和优先级的动态变化。

`Lane` 模型使用二进制数来表示任务的优先级。每个二进制位对应一种特定类型的任务优先级，通过位运算可以高效地进行优先级的判断、合并和筛选。



例如，在 `Lane` 模型中，不同的二进制位可以分别表示交互事件、网络请求、后台任务等不同类型的优先级。一个任务可以同时具有多个优先级，通过对二进制位的设置来表示。





webpack的优化手段

1. 速度

   1. 打包速度的提升：webpack构建是单线程（jest的测试是多线程 webpack反思一下） 大型项目很慢 使用webpack的threadLoader 可以把耗时的loader放进单独的worker池  
   2. 避免重复编译未修改的模块，可使用：**cache 配置**
   3. 将不常变化的第三方库（如 React、Vue）提前打包为 DLL 文件，构建时直接引用，减少主构建流程的工作量。
   4. **esbuild-loader**：替代 `babel-loader` 进行 JS/TS 转译，速度快 10-100 倍（基于 Go 语言）**esbuild-loader**：替代 `babel-loader` 进行 JS/TS 转译，速度快 10-100 倍（基于 Go 语言）

2. 体积

   1. 减小主包的体积：在项目里面 路由可以使用懒加载 工具 首屏不加载的包可以使用import函数来导入 这样可以把这些包分成单独的chunk'

   2. 配置splitChunks 可以配置需要分割的文件类型 分割之后的最小体积 最小引用次数 vendors

   3. 压缩文件：terser压缩js 

   4. 对于一些跨项目工具 使用cdn

   5. Webpack 5 内置 Tree Shaking，自动移除未使用的代码，但需满足： ESM 模块 确保 `package.json` 中 `sideEffects` 字段正确配置

   6. 模块联邦技术：跨应用共享模块（如微前端），避免重复打包。

   7. ```javascript
      BundleAnalyzerPlugin() //分析·打包结果
      ```

3. 缓存策略

   1. 通过 `[contenthash]` 确保文件内容变化时才更新文件名

4. 开发体验

   1. HMR：

   2. ```javascript
      devServer: {
        hot: true // 开启 HMR
      },
      ```



