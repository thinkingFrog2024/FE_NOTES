#### state Hook

状态hook用于在组件里保存信息 避免丢失状态信息 和重复创建

react是通过把状态信息绑定在虚拟节点上 以实现状态的保存 就好比state react将会在虚拟节点上面创建stateHooks属性 里面存放所有的stateHook 

由于react的状态更新是批量更新 而不是执行一次状态更新 进行一次渲染 所以实际上的更新流程是：触发某个事件 导致set函数被触发=》**set函数内部更新虚拟节点树里面头结点的指向 构件虚拟节点树函数又开始运行**=》在构件过程中 运行组件代码 导致useState执行=》在useState内部 将会运行更新函数 实现批量更新=》...渲染

* useState
* useReducer

```javascript
// 全局变量，模拟 React 内部的状态存储
let stateIndex = 0;
let stateList = [];

function useState(initialValue) {
  // 获取当前索引对应的状态节点
  const currentIndex = stateIndex;
  
  // 如果是首次渲染，初始化状态
  if (stateList[currentIndex] === undefined) {
    stateList[currentIndex] = {
      value: typeof initialValue === 'function' ? initialValue() : initialValue,
      setValue: null
    };
  }
  
  // 创建更新函数，通过闭包保存 currentIndex
  const setValue = (newValue) => {
    // 如果 newValue 是函数，则执行它并传入旧值
    if (typeof newValue === 'function') {
      stateList[currentIndex].value = newValue(stateList[currentIndex].value);
    } else {
      stateList[currentIndex].value = newValue;
    }
    
    // 触发重新渲染（在实际 React 中，这会触发协调过程）
    render();
  };
  
  // 保存 setValue 函数到状态节点
  stateList[currentIndex].setValue = setValue;
  
  // 增加索引，为下一个 useState 调用做准备
  stateIndex++;
  
  // 返回当前状态值和更新函数
  return [stateList[currentIndex - 1].value, setValue];
}

// 模拟组件渲染函数
function render() {
  // 重置索引，为新一轮渲染做准备
  stateIndex = 0;
  
  // 调用组件函数（在实际 React 中，这是通过 Fiber 树遍历实现的）
  App();
}

// 示例组件
function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('React');
  
  console.log(`Count: ${count}, Name: ${name}`);
  
  // 模拟事件处理
  setTimeout(() => setCount(prev => prev + 1), 1000);
}

// 初始渲染
render();
```



更新对象 或者数组的时候 不应该修改对象的属性 或者数组的元素 而是在set函数里面传递完整的对象

| 避免使用 (会改变原始数组)             | 推荐使用 (会返回一个新数组）      |
| ------------------------------------- | --------------------------------- |
| 添加元素	push，unshift             | concat，[...arr] 展开语法（例子） |
| 删除元素	pop，shift，splice        | filter，slice（例子）             |
| 替换元素	splice，arr[i] = ... 赋值 | map（例子）                       |
| 排序	reverse，sort                 | 先将数组复制一份（例子）          |

：展示计数器是增加还是减小 这个增加还是减小需要根据之前的state计算：

```react
 const [prevCount, setPrevCount] = useState(count);
  const [trend, setTrend] = useState(null);
  if (prevCount !== count) {
    setPrevCount(count);
    setTrend(count > prevCount ? 'increasing' : 'decreasing');
  }
```

在渲染过程里面调用set时 set必须位于条件语句中 

这个方式的性能比在effect里面更新状态更好 因为在effect里面更新 子组件需要经历两次渲染





####  useSyncExternalStore

获取状态并在组件中同步显示。解决在并发模式下订阅外部数据源可能出现的竟态问题 ：一个操作的进行依赖于另外一个操作 但事实操作的顺序无法保证

并且由于react渲染的中断恢复机制 会让问题更加复杂 比如：搜索的时候 在输入的过程里面可能发送多次请求 但是显示的是最后返回的那个 

```javascript
import React, { useSyncExternalStore } from 'react';

// 定义窗口尺寸类型
type WindowSize = {
  width: number | undefined;
  height: number | undefined;
};

// 获取窗口尺寸的函数
const getWindowSize = (): WindowSize => {
  return {
    width: typeof window !== 'undefined' ? window.innerWidth : undefined,
    height: typeof window !== 'undefined' ? window.innerHeight : undefined,
  };
};

// 自定义 Hook：使用 useSyncExternalStore 订阅窗口尺寸变化
export function useWindowSize(): WindowSize {
  return useSyncExternalStore(
    // 订阅函数：添加窗口大小变化的监听器
    (callback) => {
      window.addEventListener('resize', callback);
      return () => window.removeEventListener('resize', callback);
    },
    // 获取快照函数：返回当前窗口尺寸
    getWindowSize,
    // 服务器端快照函数：返回初始尺寸
    () => ({ width: undefined, height: undefined })
  );
}

// 使用示例组件
const WindowSizeDisplay: React.FC = () => {
  const { width, height } = useWindowSize();

  return (
    <div className="p-4 bg-gray-100 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2">Window Size</h3>
      <p>Width: {width}px</p>
      <p>Height: {height}px</p>
    </div>
  );
};

export default WindowSizeDisplay;

```





并且这个api使用了SSR数据传递，SSR数据传递指的是 ：直接复用服务器端的数据 而不是客户端重新计算。

#### **SSR 渲染流程**：

1. **服务器端**：

   - React 在服务器上执行组件代码。

   - 调用 `getServerSnapshot()` 获取初始数据（如 `1024`）。

   - 渲染完整的 HTML：`<div>Width: 1024</div>`。

   - 将数据嵌入 HTML：

     html

     

     预览

     

     

     

     

     ```html
     <script>
       window.__PRELOADED_STATE__ = 1024;
     </script>
     ```

     

     

     

2. **客户端**：

   - 浏览器收到完整的 HTML，直接显示 `<div>Width: 1024</div>`。
   - JavaScript 代码执行时，React 发现：
     - " 已有服务器渲染的 HTML，且数据已通过 `__PRELOADED_STATE__` 传递过来 "。
     - **不会重新执行 `getSnapshot()`**，而是直接使用 `__PRELOADED_STATE__` 的值（`1024`）。
   - React 只需要 "激活"（hydrate）已有 HTML，绑定事件监听器，无需重新计算内容。

   水合指的是 js html结合 静态页面变得可以交互的过程。

从组件上下文里面接受信息 ，并且context修改的时候 React会自动重新渲染读取context的组件。并且使用memo跳过重复渲染的组件也会接受新的context

传递函数 或者对象的时候可以使用useMemo 或者useCallback进行优化 



#### useSyncExternalStore

用于从外部存储（例如状态管理库、浏览器 API 等）获取状态并在组件中同步显示。这对于需要跟踪外部状态的应用非常有用。

* 订阅外部store
* 订阅浏览器api
* 抽离逻辑 自定义hook
* 服务端

```react
const res = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)

```

```react
import { useSyncExternalStore } from "react"

/**
 * 
 * @param key 存储到localStorage 的key
 * @param defaultValue 默认值
 */
export const useStorage = (key: any, defaultValue?: any) => {
    const subscribe = (callback: () => void) => {
        window.addEventListener('storage', (e) => {
            console.log('触发了', e)
            callback()
        })
        return () => window.removeEventListener('storage', callback)
    }
    //从localStorage中获取数据 如果读不到返回默认值
    const getSnapshot = () => {
        return (localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)!) : null) || defaultValue
    }
    //修改数据
    const setStorage = (value: any) => {
        localStorage.setItem(key, JSON.stringify(value))
        window.dispatchEvent(new StorageEvent('storage')) //手动触发storage事件
    }
    //返回数据
    const res = useSyncExternalStore(subscribe, getSnapshot)

    return [res, setStorage]
}

```

如果快照一直返回一个不同的值 会一直渲染 直到溢出 

尤其是对象 数组 需要注意更新逻辑



#### Ref hook

保存不用于渲染 但是需要保存的信息

比如定时器的id



#### Effect hook

由于useEffect是异步函数 可以看到动画效果什么的  但是uselayoutEffect 这个函数使同步运行的 在里面给dom添加动画效果是没有用的 

纯函数：输入决定输出 没有副作用 不和外界耦合 

副作用函数：会改变外部状态 

副作用函数：执行的时候改变外部状态 依赖外部的函数 

effect里面就适合执行副作用函数 



首先 useEffect里面包裹的代码的执行实机 是渲染完成之后 。

其次 对于useEffect的职责 是进行状态同步。

但是 状态同步不应该在渲染之前进行吗？



这是设计的问题 react的声明式 而不是 命令式 react所做的是 描述ui 至于具体渲染工作 交给内部完成。

而命令式 是给出一系列命令 标明Ui怎样渲染 。

所以说 假设状态同步在组件渲染之前进行 那么开发者需要手动指定渲染何时进行 。

那么为什么源码里面的设计不是先执行useEffect再渲染？

很明显 可能堵塞渲染 甚至造成报错。

并且react的设计 强调组件的独立性 假设在渲染之前需要进行同步 那么如果外部环境有问题 那么渲染不能进行 。



 ，  

为什么把useEffect称为脱围机制？

react组件里面的逻辑应该是纯粹的渲染逻辑 但是有一些操作不输于这个范围 

并且这些操作还可能是需要时间的异步操作。

所以这些操作得执行实机 应该有特定规则

这个函数接受一个setup函数 一个依赖列表 setup函数选择性返回一个清理函数 子每次依赖项更新之后 react会用旧值运行清理函数 用新值运行setup哈数 

严格模式开启的时候 在首次setup真正运行之前 会运行一个开发模式里面额外的setup cleanup周期 这个是为了确保清理逻辑正确映射在setup逻辑上面



由于useEffect的回调函数在浏览器完成绘制之后执行 所以不会阻塞浏览器绘制 

但是有的时候 要是进行一些dom操作 那么我们需要这个操作可以在浏览器绘制之前来执行 否则可能造成页面闪烁 这个时候 应该使用uselayoutEffect 由于在浏览器渲染之前执行 所以会阻塞浏览器渲染。

可以在自定义hook里面使用useEffect 封装

在effect里面使用fetch进行请求 但是这种方案有一些问题

* effect不在服务器上运行 这意味 **服务器渲染出来的模板全部处于loading状态** 
* 导致网络瀑布 ，在某些情况会比并行慢
* 在effect里面进行请求 就意味着 **不会预加载 或者缓存** 
* 手动代码多

effect里面使用的每个响应式值 都必须声明成依赖 响应值指的是 props 所有在组件内申明的变量 和函数 如果要从依赖列表里面删除 那么需要证明这个变量不需要作为依赖项 可以把这个变量声明到组件外部 



如果 要在effect里面 根据之前的state更新state 就比如：

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setCount(count + 1); // 你想要每秒递增该计数器...
    }, 1000)
    return () => clearInterval(intervalId);
  }, [count]); // 🚩 ... 但是指定 `count` 作为依赖项总是重置间隔定时器。
  // ...
}
```

这里 按道理来讲 其实执行完了让这个函数自己跑就行了 但是 由于react的限制  Count必须被声明成依赖项 可以使用更新函数解决

为了减少effect运行次数 不应该在渲染期间声明对象 作为依赖项 而是在effect内部申明变量。



#### 性能hook

* useMemo:缓存计算结果，也就是函数运行结果，接受一个没有参数的纯函数 和一个依赖数组作为参数，在使用memo跳过重新渲染的时候 应该使用这两个函数确保每次创建的对象或者函数不是一个新的实例
* useCallback:缓存函数本身 避免在组件重新渲染的时候频繁创建新的函数实例。

其实useCallback就是为了在使用useMemo记忆



在使用useMemo避免重新渲染的时候 除了记忆要传递的数据 还可以记忆节点本身：

```react
 const children = useMemo(() => <List items={visibleTodos} />, [visibleTodos]);
```

在行为上面是一样的 依赖不改变不重新渲染

但是对于细节而言,有些地方不同。

假设缓存的是使用的数据 而非节点 那么在更新的时候 实际上返回的是一个新的虚拟dom 这是因为在创建虚拟dom的函数内部就是这样安排的。

但是注意 这里是创建一个新的虚拟dom 而非真实dom 所以开销其实是很小的 只是创建一个新的js对象 并且和原来的虚拟节点比较props而已

但是如果缓存的就是节点本身 由于前后对象的引用相同 react会认为这里的jsx没有改变 并不会创建一个新的js对象 而是复用之前的 也不需要重新渲染  



useCallback的内部实现可以视为：

```javascript
// 在 React 内部的简化实现
function useCallback(fn, dependencies) {
  return useMemo(() => fn, dependencies);
}
```

假设不指定依赖数组 每次返回的都是新的实例

使用useCallback缓存函数：react会在初次渲染 而非调用的时候 返回该函数 。若依赖不发生改变 返回旧的函数实例。例如函数作为参数传递给子组件的时候，每次渲染创建的都是新的函数实例。

当创建一个用于更新state的记忆化函数：

```javascript
function TodoList() {
  const [todos, setTodos] = useState([]);

  const handleAddTodo = useCallback((text) => {
    const newTodo = { id: nextId++, text };
    setTodos([...todos, newTodo]);
  }, [todos]);
```

为了尽量减少依赖 可以使用更新函数：

```javascript
function TodoList() {
  const [todos, setTodos] = useState([]);

  const handleAddTodo = useCallback((text) => {
    const newTodo = { id: nextId++, text };
    setTodos(todos => [...todos, newTodo]);
  }, []); // ✅ 不需要 todos 依赖项
```

首先 明确依赖项是为了 在依赖改变的时候 更新函数 

也就是说 todo变量更新的时候 这个函数将会更新 但是更新的是什么？-是todo变量的引用 

记忆化函数利用了js闭包的特性 ：useCallback创建一个闭包(在函数中return一个函数 并使用函数里面定义的变量) 捕获依赖数组里面的变量 当这些变量发生更改的时候 创建新的变量。

所以 假设没有使用更新函数 也没有添加依赖项 这个闭包任然是原来的闭包 保存的引用还是原来的引用 但是如果使用的是更新函数



还是不太理解。。

usecallabck

```
function usecallback = (fn,deps)=>{
	//搜索一下：节点上有没有这个函数 要是没有就添加 要是有就
	这个函数是在挂载虚拟节点的过程里面调用的 这个时候的节点是新的节点 那么应该在旧的节点上寻找？假设函数内容一样 依赖项没边 usememo
	
}

function commitCallback = ()=>{
	//遍历新旧函数列表依赖项 假设依赖项有更新。。。
	const oldCallbacks = oldFiber.callbacks
	。。。。
	
}
不对 这个是用usememo所得 得看usememo怎么实现的

```

```react
每个useMemo在fiber节点中对应一个hook对象
里面保存缓存的值 依赖数组
执行阶段 执行回调函数 计算结果
保存结果
更新的时候 假设依赖没有改百年 返回缓存值 

这样说的话 应该有一个数组里面放了所有的hook对象怎么找到对应的hook对象==index 返回记忆化的值

function useCallback(fn,deps){
    return useMemo(()=>fn,deps)
}

let hookIndex = 0
function useMemo(fn,deps){
	//初次渲染
    //这里接受的fn是()=>fn
	if(！wipFiber.alternate){
		const value = fn()
        const value = ()=>fn
		const hook = {
			memorized:value,
			deps
		}
		wipFiber.hooks.push(hook)
		return value
	}else{
		//更新 react为了知道 当前处理的hook的索引 会在全局维护一个hookIndex 这也是为什么hook不可以在判断 条件里面调用的重要原因 这会导致hook调用顺序错乱
		const oldHook = wipfiber.alternate.hooks[hookIndex]
		//根据索引找到旧的hook 并且比较deps是否更新
		if(!isSameDeps(oldHook.deps,deps)){
			const value = fn()
            const hook = {
                memorized:value,
                deps
            }
            wipFiber.hooks[hookIndex] = hook
		}else{
			wipFiber.hooks[hookIndex] = oldHook
		}
		return wipFiber.hooks[index]
		hookOndex++
	}
}
```

还是不懂

但是如果使用更新函数 那么就可以 直接访问当前的变量 而不需要依赖闭包捕获

具体的害的等看源码





在react中 组件重新渲染的会后 内部定义的函数都会被重新创建 假设接受的参数是函数 虽然函数看起来没有改变 但是其实是两个不同的实例 会引起不必要的渲染。

界面更新可以分成：阻塞更新：必须立即完成的更新 非阻塞更新：可以延迟完成的更新

阻塞更新通常和用户挂钩 

非阻塞的更新优先级更低 标记非阻塞更新

* useTransition：延迟状态更新。 使用这个函数包裹的更新可以被其他更高优先级的更新打断

```react
import { useTransition, useState } from 'react';
import { Input, Flex, List } from "antd";
interface Item {
   id: number;
   name: string;
   address: string
}
const App = () => {
   const [inputValue, setInputValue] = useState('');
   const [isPending, startTransition] = useTransition(); // 开始过渡
   const [list, setList] = useState<Item[]>([])
   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      setInputValue(value)
      fetch(`/api/list?keyWord=${value}`).then(res => res.json()).then(data => {
         const res = data?.list ?? [];
         // 使用过渡 useTransition
         startTransition(() => {
            setList([...res])
         })
         //不使用过渡 useTransition
         //setList([...res])
      })
   }
   return (
      <>
         <Flex>
            <Input
               value={inputValue}
               onChange={handleInputChange} // 实时更新
               placeholder="请输入姓名"
            />
         </Flex>
         {
            isPending && <div>loading...</div>
         }
         <List
            dataSource={list}
            renderItem={(item) => (
               <List.Item>
                  <List.Item.Meta
                     title={item.name}
                     description={item.address}
                  />
               </List.Item>
            )}
         />
      </>
   );
}

export default App;



import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import type { Plugin } from 'vite'
import mockjs from 'mockjs'
import url from 'node:url';
const viteMockServer = (): Plugin => {
  return {
    name: "vite-mock-server",
    //使用vite插件的钩子函数
    configureServer(server) {
      server.middlewares.use('/api/list', async (req, res) => {
        const parsedUrl = url.parse(req.originalUrl, true);
        //获取url参数 true表示返回对象 {keyWord: 'xx'}
        const query = parsedUrl.query;
        res.setHeader('Content-Type', 'application/json')
        const data = mockjs.mock({
          //返回1000条数据
          "list|1000": [
            {
              "id|+1": 1, //id自增
              "name": query.keyWord, //name为url参数中的keyWord
              'address': '@county(true)', //address为随机地址
            }
          ]
        })
        //返回数据
        res.end(JSON.stringify(data))
      })
    }
  }
}
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), viteMockServer()],
})

```

通过startTransition 给渲染列表降级 这样在大量列表项需要渲染的时候 输入框依旧可以保持响应式。

注意这里的starttransition函数并不是延迟值的更新 而是延迟渲染，值是立即更新的

并且这里假设短时间触发多次set函数 只执行最后一次更新会被处理，

这个不适用于输入框  假设给输入框里面的内容包裹在startTransition内 假设输入123 那么 输入1 被视为一个任务 输入2 被视为一个任务 打断1 最终 显示的只有3 但是useDefferdValue并不会这样子 

对于搜索框 假设搜索出来的数据很多 为了减轻渲染压力 应该在用户输入停下再去搜索 并渲染 

这个时候就适合使用defferd 可以观察到 页面上值是更新的 但是返回的延迟版本的值是旧的 



一个延迟的是值所对应的ui渲染 一个是值



```react
import React, { useState, useTransition, useDeferredValue } from 'react'
import { Input, List } from 'antd'
import mockjs from 'mockjs'
interface Item {
   name: number
   address: string
}
export const App = () => {
   const [val, setVal] = useState('')
   const [list] = useState<Item[]>(() => {
    // 使用 Mock.js 生成模拟数据
      return mockjs.mock({
         'list|10000': [
            {
               'id|+1': 1,
               name: '@natural',
               'address': '@county(true)',
            }
         ]
      }).list
   })
   const deferredQuery = useDeferredValue(val)
   const isStale = deferredQuery !== val // 检查是否为延迟状态
   const findItem = () => {
      //过滤列表，仅在 deferredQuery 更新时触发
      return list.filter(item => item.name.toString().includes(deferredQuery))
   }
   return (
      <div>
         <Input value={val} onChange={(e) => setVal(e.target.value)} />
         <List style={{opacity: isStale ? '0.2' : '1', transition: 'all 1s'}} renderItem={(item) => <List.Item>
            <List.Item.Meta title={item.name} description={item.address} />
         </List.Item>} dataSource={findItem()}>
         </List>
      </div>
   )
}

export default App

```

虽然看起来像防抖 但是并不是 防抖需要一个固定的延迟时间 但是这个api的延迟是根据用户设备计算的 





不需要参数 返回isPending标志 startTransition函数 

这个函数用于吧状态标记成transition

* 只有在可以访问该状态的set函数时 才能把对应的状态更新包装成transition，如果想把更新prop 或者响应自定义hook 应该使用useDefferdValue
* 传递给这个hook的函数必须是同步函数 这个函数会立即执行 并且把执行期间发生的所有状态标记为transition 如果在执行期间 尝试延后更新 比如定时两秒之后再更新 那么状态不会被标记成transition。
* 标记成transition的更新会被其他的更新打断 
* 目前 react会批处理（batching）多个同时进行的transition

**batching指的是**：react会把多个状态更新合并成一个单一的更新操作，

使用过渡特性时 react会吧状态更新标记成不阻塞 表明 即使某些操作耗时很长 用户界面也是可以响应的。

还可以通过useTransition更新父组件状态 ：

```javascript
export default function TabButton({ children, isActive, onClick }) {
  const [isPending, startTransition] = useTransition();
  if (isActive) {
    return <b>{children}</b>
  }
  return (
    <button onClick={() => {
      startTransition(() => {
        onClick();
      });
    }}>
      {children}
    </button>
  );
}
```

可以使用ispending向用户表明当前处于transition当中 





* useDefferdValue

这个函数得到一个参数 返回一个值 这个值是这个参数的延迟版本。

在组件的初始渲染期间 返回的延迟值就是提供的值。

在组件更新的时候 会先尝试使用旧值进行渲染 在后台使用新值进行另一个重新渲染。

* 这个函数应该接受一个原始值 或者渲染外创建的对象 假设传递一个渲染期间创建的对象 由于每次渲染都是创建新的对象 这会导致不必要的刷新。

* 如果这个函数接受到一个修改的值 会安排两个渲染 当前渲染：使用旧值 后台渲染：使用新值 。后台渲染是可以中断的 假设值有新的更新 react会从头启动新的渲染 。比如用户输入速度比视图重新渲染更快 那么ui会在用户停滞输入之后进行渲染

* 这个api和<Suspense>集成  如果由于新值引起的更新导致ui暂停 那么用户姜辉看到旧值

* `useDeferredValue` 本身不会引起任何固定的延迟。一旦 React 完成原始的重新渲染，它会立即开始使用新的延迟值处理后台重新渲染。由事件（例如输入）引起的任何更新都会中断后台重新渲染，并被优先处理。

* 由 `useDeferredValue` 引起的后台重新渲染在提交到屏幕之前不会触发 Effect。如果后台重新渲染被暂停，Effect 将在数据加载后和 UI 更新后运行。

* 使用场景：假设有一个用户搜索框 在用户输入的时候 将会展示suspense的后备内容，进行优化就是 输入期间 继续展示原来的搜索词条 同时我们可以对比延迟值与传入的值得知当前的更新状态 并且根据这个添加ui样式

  ```javascript
  <div style={{
    opacity: query !== deferredQuery ? 0.5 : 1,
  }}>
  ```

* 假设有一个组件 渲染速度很慢 为了优化他 可以使用这个api延迟一些不算特别重要的部分



Q:为什么把使用新值进行渲染的工作安排在后台？

这是react的优先级分离策略：更新分为紧急更新 urgent Updates 过渡更新 Transition Upddates

useDefferdvalue的核心在于 把 衍生计算 标记成低优先级 。

就比如 一个搜索框 下面的项目列表是根据搜索框里面的输入框计算得到的 那么这个结果就是输入值的衍生计算 输入值的优先级高于项目列表 

1. 使用starttransition延迟list列表更新 列表ui更新的优先级降低
2. 使用useDefferdvalue延迟输入值更新 在页面上面展示的值是最新的 但是用于计算列表结果的延迟版本的值是旧的 ，此时react会使用旧的值快速更新ui，更新延迟值会被标记成过度任务 在主线程空闲的时候会执行任务 并且计算这个值的衍生值，假设用户输入打断了这个过程 后台的过度任务将会打断 丢弃中间值 只保留最后一次计算结果。否则就使用后台的渲染结果。



#### updater function

setState不会更新已经运行的代码里面state的值 为了解决这个问题 需要向set函数里面传递一个更新函数 而不是下一个状态。

更新函数会获取待定状态 然后计算下一个状态 

对于更新函数 react会放入队列 再渲染期间 按照顺序执行 

原因：

1. react的批量更新机制 
2. 呃呃呃这里非说是闭包 我觉得就是异步更新机制导致的count在运行的时候没有更新 但是传更新函数的时候 由于函数会按次序执行 所以能取到赏赐更新的· 就是没有关系 天杀的ai

#### 资源hook

资源指的是：一个promise：可以解析得到值 provider：保存上下文变量。

使用use可以访问这些资源 并且不把他们作为组件状态的一部分。

减少不必要的状态管理 渲染。

use进行读取的时候 假设资源还没有准备好 那么会暂停组件的渲染 直到资源准备好 。这并不是阻塞渲染 阻塞指的是 浏览器的渲染线程完全被占用 用户不能进行交互 暂停指的是 渲染线程不做渲染的工作 但是正常运行。

对于promise use会自动读取

这个hook和其他hook不同：他可以在循环或者条件语句里面进行调用。 但是必须还是在组件函数 或者其他hook里面

可以看出 这个use的作用 类似于async await  其区别在于：使用async await进行数据获取的时候 获取和渲染是同时的 使用use则是分离的

async await 将会在数据获取到之后 进行渲染

而use则是先渲染组件的初始状态 获取到数据之后 在进行更新 

### **`use` 与 `async/await` 的关键区别**

| 特性         | `use`（Suspense 机制）                | `async/await` + `useState`       |
| ------------ | ------------------------------------- | -------------------------------- |
| **渲染时机** | 先显示 fallback，数据就绪后自动替换   | 等待数据加载完成后再渲染整个组件 |
| **组件类型** | 只能用于同步组件（不能用 async 组件） | 可以用在 async 函数组件中        |
| **错误处理** | 通过 ErrorBoundary 捕获               | 需要手动 try/catch 或 useEffect  |
| **并发渲染** | 支持（React 可中断渲染）              | 不支                             |

这个特性使得进行服务端渲染的时候 使用async awair更加合适 因为服务端就要求渲染和请求同时进行。

为什么说传统的useEffect+async+await性能不好？

1. async await的本质是同步等待 会导致渲染流程被阻塞 数据加载期间 页面无法响应
2. 白屏时间长
3. react的并发模式依赖于suspense机制 async awair无法触发这个模式

并发模式（Concurrency Mode）是 React 18 的重大特性，其核心目标是：



1. **让渲染可中断**：当遇到高优先级任务（如用户输入）时，暂停当前渲染，优先处理紧急任务。
2. **优化用户体验**：通过 “渐进式渲染”，先展示关键内容，再逐步完善次要内容。
3. **平滑处理异步操作**：将数据加载、动画等异步操作与渲染流程深度集成。

要实现这些目标，需要一个机制来**明确标记哪些操作是可中断的异步操作**—— 这就是 Suspense 的作用。

#### **1. Suspense 的本质：声明式异步边界**

Suspense 允许你**声明式地指定 UI 的哪些部分可以在等待数据时显示 fallback**：



jsx











```jsx
<Suspense fallback={<Spinner />}>
  <Profile /> {/* 可能需要加载数据的组件 */}
</Suspense>
```



- 关键特性

  ：

  - **暂停渲染**：当 `Profile` 组件需要等待数据时，React 会暂停渲染该组件，转而渲染 `fallback`。
  - **并发渲染**：React 可以在后台继续渲染其他组件，而不是阻塞整个应用。

#### **2. 与 `use` 钩子的配合**

在 Suspense 边界内，`use` 钩子（或类似机制）用于**抛出 Promise**，通知 React 当前渲染需要暂停：



javascript











```javascript
// 简化的 use 实现逻辑
function use(promise) {
  const status = promise.status; // 假设 Promise 被增强，有状态属性
  
  if (status === 'pending') {
    throw promise; // 抛出 Promise 触发 Suspense
  } else if (status === 'resolved') {
    return promise.value; // 返回已就绪的数据
  } else if (status === 'rejected') {
    throw promise.error; // 抛出错误，由 ErrorBoundary 捕获
  }
}
```





- React 的处理流程

  ：

  1. 当遇到 `throw promise` 时，React 暂停当前渲染。
  2. 显示最近的 Suspense fallback。
  3. 当 Promise resolved 时，自动恢复渲染，使用最新数据。



#### useReducer

```javascript
 const [state, dispatch] = useReducer(reducer, { age: 42 });
```

如果传递了参数init 那么参数就是 init（ibitialval） 

通过调用dispatch函数更新状态：

```
  dispatch({ type: 'incremented_age' });
```



* disptch是为了下一次渲染更新state 所以在这个函数调用完成之后 state没有更新 
* 如果前后state相同 会跳过组件 子组件的重新渲染。

在reducer函数里面进行更新 应该通过返回一个对象的形式更新 而不是 直接修改state对象

假设不传递初始化函数 也就是第三个参数 而是在第二个参数 传递函数调用 这可能会造成性能问题：每次组件渲染这个函数都会执行 。

#### useRef

1. 访问dom元素 

2. 在渲染之间存储值 

3. 避免闭包陷阱 

   ```
   import React, { useState, useRef, useEffect } from 'react';
   
   const ClosureExample: React.FC = () => {
     const [count, setCount] = useState(0);
     // 使用 useRef 存储最新的 count 值
     const countRef = useRef(count);
   
     // 每次 count 变化时更新 ref
     useEffect(() => {
       countRef.current = count;
     }, [count]);
   
     // 模拟异步操作，使用 ref 获取最新的 count 值
     const handleClick = () => {
       setTimeout(() => {
         // 使用 ref 获取最新的 count 值，而不是闭包中的值
         console.log(`Current count: ${countRef.current}`);
       }, 2000);
     };
   
     return (
       <div className="p-4 bg-gray-100 rounded-lg shadow-md">
         <h3 className="text-lg font-semibold mb-2">闭包陷阱示例</h3>
         <p className="mb-4">计数: {count}</p>
         <button
           onClick={() => setCount(prev => prev + 1)}
           className="mb-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
         >
           增加计数
         </button>
         <button
           onClick={handleClick}
           className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-400"
         >
           异步获取计数
         </button>
         <p className="mt-4 text-sm text-gray-600">
           点击"异步获取计数"，然后快速增加计数。两秒后，控制台将显示最新的计数值。
         </p>
       </div>
     );
   };
   
   export default ClosureExample;
   
   ```

   

不能获取子组件实例

这个hook返回一个只有current属性的对象 可以修改这个current属性 但是 并不会引起组件重新渲染 。 虽然但是 也不应该在渲染期间写入或者读取ref.current,这是因为react期望组件是一个纯函数 只要输入一样 输出也应该一样 如果在渲染期间修改ref 就会破坏纯函数  可以在effect里面，或者事件处理函数里面 进行写入。

* 在重新渲染之间存储信息 
* 不会触发重新渲染

如果传入的初始值 是一个函数调用 那么react会在每次渲染的时候 进行调用 。

就比如：

```react
 const playerRef = useRef(new VideoPlayer());
 //为了解决这个问题 
 function Video() {
  const playerRef = useRef(null);
  if (playerRef.current === null) {
    playerRef.current = new VideoPlayer();
  }
```







#### requestIdlecallback

这个函数里面的回调函数是在浏览器空闲时执行的低优先级任务，

react里面为了实现按照优先级调度任务 并且不阻塞 模拟实现了一个requestIdlecallback。

* 兼容不好
* 精细度不好 控制不了优先级
* 执行时机间隔长
* 浏览器差异太大



为了不阻塞更新 实现应该是一个宏任务

（我觉得这里宏任务和不阻塞的关联 在于 微任务是每次事件循环一直运行直到清空 同步代码那更不行 那怎么控制 ）

 宏任务就容易想到计时器 但是在计时器嵌套的时候 间隔会被强制设置成4ms react里面使用的是messagecghanel

和vue一样 不支持的时候 还是会使用定时器 

MessageChanel的实例上面有两个属性 port1 port2 这两个信道可以相互发消息 这个设计出来是为了在web worker iframe里面进行通信

#### fragment

 和vue一样 react确认是否是相同组件有两个条件 1.组件相同 位置相同。 而组件的状态 也是由react进行保存的。假设react认为前后是相同得组件 就会保留状态 否则将会销毁状态。 对于react而言 位置指的是 在组件树里面的位置 而不是jsx里面的位置 。

假设想要重置一个组件的状态 换入不一样的key就可以 。

但是对于fragment而言：经过编译之后 实际上是不存在这个元素的 

从<><child/></> => <child/> 或者是[child] 并不会重置 这是一种特殊处理 因为尽管没有对应的真实dom元素 但是fragment是在组件树里面存在的 。但是只对一层深度有这个规则 。

可以渲染list

#### uselayoutEffect

同步执行 在渲染之前执行 可以用来调整dom元素的位置 

可以记录滚动条位置，等用户返回这个页面时，滚动到之前记录的位置。增强用户体验。

```react
import React, { useLayoutEffect, useRef } from 'react';

function App() {
   useLayoutEffect(() => {
      const list = document.getElementById('list') as HTMLUListElement;
      list.scrollTop = 900
   }, []);

   return (
      <ul id="list" style={{ height: '500px', overflowY: 'scroll' }}>
         {Array.from({ length: 500 }, (_, i) => (
            <li key={i}>Item {i + 1}</li>
         ))}
      </ul>
   );
}

export default App;

```



#### useImperativeHandle

在子组件内部暴露句柄

18:

```react
interface ChildRef {
   name: string
   count: number
   addCount: () => void
   subCount: () => void
}

//React18.2
const Child = forwardRef<ChildRef>((_, ref) => {
   const [count, setCount] = useState(0)
   //重点
   useImperativeHandle(ref, () => {
      return {
         name: 'child',
         count,
         addCount: () => setCount(count + 1),
         subCount: () => setCount(count - 1)
      }
   })
   return <div>
      <h3>我是子组件</h3>
      <div>count:{count}</div>
      <button onClick={() => setCount(count + 1)}>增加</button>
      <button onClick={() => setCount(count - 1)}>减少</button>
   </div>
})

function App() {
   const childRef = useRef<ChildRef>(null)
   const showRefInfo = () => {
      console.log(childRef.current)
   }
   return (
      <div>
         <h2>我是父组件</h2>
         <button onClick={showRefInfo}>获取子组件信息</button>
         <button onClick={() => childRef.current?.addCount()}>操作子组件+1</button>
         <button onClick={() => childRef.current?.subCount()}>操作子组件-1</button>
         <hr />
         <Child ref={childRef}></Child>
      </div>
   );
}

export default App;

```

`forwardRef` 是 React 提供的一个高级 API，用于将 `ref` 从父组件传递到子组件，甚至更深层次的组件

`ref` 是不能直接从父组件传递到子组件的。这是因为 `ref` 不是一个 prop，React 会特殊处理它。当你尝试将 `ref` 作为 prop 传递给子组件时，它不会出现在子组件的 `props` 对象中。



`forwardRef` 解决了这个问题，它允许组件显式地接收和转发 `ref`，使父组件能够直接引用子组件的 DOM 元素。

19:

1. 19版本useRef的参数改为必须传入一个参数例如`useRef<ChildRef>(null)`
2. 19版本不需要配合`forwardRef`一起使用，直接使用即可，他会把Ref跟props放到一起，

```react
//React19
const Child = forwardRef<ChildRef>((_, ref) => { // [!code --]
const Child = ({ ref }: { ref: React.Ref<ChildRef> }) => { // [!code ++]
   const [count, setCount] = useState(0)
   useImperativeHandle(ref, () => {
      return {
         count,
         addCount: () => setCount(count + 1),
         subCount: () => setCount(count - 1)
      }
   })
   return <div>
     ....
   </div>
}

function App() {
   const childRef = useRef<ChildRef>(null)
   const showRefInfo = () => {
      console.log(childRef.current)
   }
   return (
      <div>
        ....
         <Child ref={childRef}></Child>
      </div>
   );
}

export default App;

```

#### createProtal

将一个组件渲染到DOM的任意位置，跟Vue的Teleport组件类似。

入参

- children：要渲染的组件
- domNode：要渲染到的DOM位置
- key?：可选，用于唯一标识要渲染的组件

返回值

- 返回一个React元素(即jsx)，这个元素可以被React渲染到DOM的任意位置

我更推荐使用`createPortal`因为他更灵活，可以挂载到任意位置，而`position: fixed`,会有很多问题，在默认的情况下他是根据浏览器视口进行定位的，但是如果父级设置了`transform、perspective、filter 或 backdrop-filter` 属性非 none 时，他就会相对于父级进行定位，这样就会导致Modal组件定位不准确`(他不是一定按照浏览器视口进行定位)`，所以不推荐使用。

虽然渲染到其他位置 但是任然属于原组件的逻辑树 可以访问上下文 

事件冒泡会到原组件 而非传送到的位置



#### suspense

fallback是一个后备方案 当fallback挂起 会激活最近的suspense边界。

* 在组件首次挂载之前 如果组件被挂起 那么react不会保留组件状态 。组件完成加载，react会从头开始尝试渲染被挂起的组件树 。
* 展示children的时候 如果再次挂起 将会展示fallback 除非是tarnsition defferd引起的
* 如果需要隐藏再次挂起的可见内容 react会清理layouteffect 再次展示的时候 重新运行 

只有启用suspense的数据源才会激活suspense组件 例如：

* 支持suspense的框架
* lazy组件懒加载
* 使用use读取promise

suspense是无法检测effect 或者事件处理程序李敏数据的加载情况的。



suspense里面的整颗组件树都被视为一个独立的单元 ，就算组件树里面只有一个组件挂起 其他的组件也不会展示。

加载数据的组件不必要是suspense的直接子组件 



#### memo

```javascript
import { memo } from 'react';

const SomeComponent = memo(function SomeComponent(props) {
  // ...
});
```

memo这个函数返回一个和原来的组件完全相同 但是经过记忆化处理的组件 

减少渲染次数 可以减少由于effect引起的多次渲染 

####  tsx

tsx写泛型的时候 后面要加一个， 否则会把泛型理解成，

```javascript
  const clickTap = <T,>(params: T) => console.log(params)
```

插入html片段（innerHtml）

```react
function App() {
  const value: string = '<section style="color:red">小满</section>'
  return (
    <>
        <div dangerouslySetInnerHTML={{ __html: value }}></div>
    </>
  )
}

```



#### babel

1. 高版本=》低版本
2. Polyfill（垫片代码）：引入额外的代码 兼容浏览器
3. jsx转换
4. 引入插件 为babel提供自定义功能。、

#### SWC（快速网页编译器）

实现babel的功能 但是速度更快 

他之所以快 是因为使用编译型rust 编译的时候 把代码转换成机器码 也就是底层的CPU指令

#### 虚拟dom fiber架构 diff

虚拟dom的作用：

1. 减少不必要的操作 借助diff
2. 跨平台 虚拟dom和平台无关 可以映射到不同的渲染的目标。

fiber架构是一种协调引擎 优化渲染复杂ui的性能

react在老版本里面使用的是不可以中断的同步递归更新 更新成可以中断的异步更新 。

1. 可中断的渲染：把大的渲染任务拆分成多个小的工作单元 ，以便在有优先级更高的任务的时候 中断优先级低的任务 ，完成高优先级任务之后 再恢复渲染
2. 优先级调度 
3. 双缓存树：react内部有两棵树维护当前的状态 下一次更新的状态。react的解决方案是计算好下一次更新ui之后 再整个替换 避免白屏
4. 任务切片：在空闲时间 把渲染任务拆分成多个小片段 逐步完成fiber构建 





任务切片是什么？

在浏览器的一帧里面 

1. 处理事件回调函数 
2. 处理计时器的回调函数
3. 开始帧
4. 执行raf
5. 计算布局 合并到主线程 
6. 绘制
7. 若还有空闲时间 执行idlecallback

react实现任务切片就类似idlecallback：把大的任务拆成小任务 在一帧里面执行一个小任务  任务执行完了之后 再渲染到页面上 





#### 调度器

idlecallback提出是为了解决：降低一些任务的优先级 把线程让给优先级更高的任务 从而避免主线程占用造成的卡顿 

`兼容性差` `Safari` 并不支持

`控制精细度` React 要根据组件优先级、更新的紧急程度等信息，更精确地安排渲染的工作

`执行时机`requestIdleCallback(callback) 回调函数的执行间隔是 50ms（W3C规定），也就是 20FPS，1秒内执行20次，间隔较长。

`差异性` 每个浏览器实现该API的方式不同，导致执行时机有差异有的快有的慢



react使用信道实现 

1. 首先 实现方案应该是一个宏任务 宏任务将会在下次事件循环中执行 不会阻塞当前页面的更新(但是vue里面用微任务队列控制更新？)

react的设计哲学是：把大更新任务切成小任务 并且通过宏任务精确控制任务的执行时机 暂停 恢复 避免阻塞主线程

vue的设计哲学是：使用优先级更高的微任务 实现快速的更新 

相比较 vue是快速执行一系列小任务 来实现快速响应

```react

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

scheduler.scheduleCallback(IdlePriority, () => {
    console.log('Task 3: Idle Priority');
});

scheduler.scheduleCallback(UserBlockingPriority, () => {
    console.log('Task 4: User Blocking Priority');
});

scheduler.scheduleCallback(NormalPriority, () => {
    console.log('Task 5: Normal Priority');
});

```

vue2使用的是不可中断的同步递归渲染 vue3 引入了可以中断的异步渲染能力 。这是因为

1. vue3里面使用proxy代替重写属性 是的响应式性能较大的提升 
2. 渲染队列是微任务队列 批量异步执行 实现优先级调度 

#### 组件通信 

react props不可以修改 源码内部使用Object.freeze冻结props对象 

可以在解构的时候提供默认值：

```react
const Test:React.FC<Props> = ({title = '默认标题'}) => {
    return <div>Test</div>
}
```

React.FC是函数式组件，是在TS使用的一个范型。FC是Function Component的缩写

React.FC 帮助我们自动推导Props的类型。

props.children 这是一个特殊的属性 类似于插槽 

children的类型在18以前的版本不需要手动定义 在之后的版本里面需要手动申明接口：

```react
interface Props {
    children: React.ReactNode //手动声明children
}

const Test: React.FC<Props> = (props) => {
    return <div>{props.children}</div>
}
```

子组件向父组件传递：传递函数参数

兄弟组件通信：

可以使用浏览器的原生事件进行触发

```react
// 创建一个简单的自定义事件
const e = new Event('myCustomEvent');
const c = ()=>{
    e.params = {name:'s'}
    window.dispatchEvent(e)
}

// 添加事件监听器
document.addEventListener('myCustomEvent', (e) => {
  console.log('自定义事件被触发了！');
});

// 添加事件监听器
document.addEventListener('myCustomEvent', (e) => {
  console.log('自定义事件被触发了！');
  console.log('消息:', e.detail.message);
  console.log('时间戳:', e.detail.timestamp);
});


declare global{
    interface Event {
        params:{nameLstring}
    }
}
```

- `declare global` 用于声明全局类型扩展。这允许你在不修改现有类型定义的情况下，添加自定义属性。

还有另一个类： new CustomEvent 可以传递额外的数据 不需要改类型   

#### 受控组件

使用受控组件可以确保表单数据与组件状态同步、便于集中管理和验证数据，同时提供灵活的事件处理机制以实现数据格式化和UI联动效果。

受控组件一般是指表单元素，表单的数据由React的 State 管理，更新数据时，需要手动调用setState()方法，更新数据。因为React没有类似于Vue的v-model，所以需要自己实现绑定事件

非受控组件指的是该表单元素不受React的State管理，表单的数据由DOM管理。通过useRef()来获取表单元素的值。

```react
import React, { useState } from 'react';

const App: React.FC = () => {
  const [value, setValue] = useState('')
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }
  return (
    <>
      <input type="text" value={value} onChange={handleChange} />
      <div>{value}</div>
    </>
  );
}

export default App;


import React, { useState,useRef } from 'react';
const App: React.FC = () => {
  const value = '小满'
  const inputRef = useRef<HTMLInputElement>(null)
  const handleChange = () => {
    console.log(inputRef.current?.value)
  }
  return (
    <>
      <input type="text" onChange={handleChange} defaultValue={value} ref={inputRef} />
    </>
  );
}

export default App;

```



对于file类型的表单控件，它是一个特殊的组件，因为它的值只能由用户通过文件选择操作来设置，而不能通过程序直接设置。这使得它在React中的处理方式与其他表单元素有所不同。如果非要把file类型设置为受控组件，他就会就行报错



#### css 模块

在Vite中css Modules 是开箱即用的，只需要把文件名设置为`xxx.module.[css|less|sass|stylus]`，就可以使用css modules了。

可以在vite的配置文件里面配置类名转换规则。





## 数据模式

：路由配置移到渲染逻辑之外 添加数据加载 等待等状态

q：什么叫 配置移除到渲染逻辑之外？

A:一般的数据获取 是在useEffect调用函数 但是这种模式会导致多次渲染 并且每个组件都有自己的数据 错误处理 不能提前知道数据需求实现并发渲染

但是在路由里面引入action lodaer useFetcher之后 就可以实现 在渲染之前实行数据请求：

```react
// 数据模式路由配置（数据获取在渲染之外）
const router = createBrowserRouter([
  {
    path: "/posts/:id",
    element: <Post />,
    // 👈 loader 函数在渲染前执行
    loader: async ({ params }) => {
      const post = await fetch(`/api/posts/${params.id}`).then(res => res.json());
      return { post };
    },
  },
]);

// 组件直接使用数据，无需手动获取
function Post({ data }) {
  const post = data.post;
  return <div>{post.title}</div>;
}
```

这样在react router渲染组件之前 会先调用loder进行获取数据 让渲染和数据解耦

实现了并发渲染：并行加载多个路由的数据

自动错误处理：可以配置专门的错误处理组件 

在router目录下新建index文件 引入router 使用createBrowserRouter创建路由 

```javascript
import { createBrowserRouter } from 'react-router';
import Home from '../pages/Home';
import About from '../pages/About';

const router = createBrowserRouter([
  {
    path: '/',
    Component: Home,
  },
  {
    path: '/about',
    Component: About,
  },
]);

export default router;
//app
import React from 'react';
import { RouterProvider } from 'react-router';
import router from './router';
const App: React.FC = () => {
  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;



```

可以使用navLink、link进行跳转 这两个组件 最终都会被渲染成a标签

```react
 <NavLink to="/about">About</NavLink>
 <NavLink to="/">Home</NavLink>
```

##### loder

在组件渲染之前异步获取数据 把结果作为data作为props传递给组件

在路由匹配成功之后 组件渲染之前调用
loder用于服务端渲染的时候，`loader` 函数会从客户端打包文件中移除，因此你可以放心地使用仅限服务器的 API，而无需担心它们会被包含在浏览器中。

在传统页面导航 也就是使用a进行页面跳转 点击的时候会因为浏览器请求一个新的url，服务器返回一个新的页面。

在客户使用客户端导航的时候 react将会调用loade

Q：为什么文档里面说loader是用来做服务端和SSG的 我觉得这个东西就是一种请求策略吧 要是说这个就是只能在服务端里面用那是设计的问题 可是给的这几个例子明明就是CSR

A:这是因为loader函数是跨服务端和客户端的通用数据获取接口 ，可以根据应用的渲染模式选择执行环境，在客户端渲染里面 loader在浏览器里面执行 发生请求到服务器 在SSR SSG里面 ，loader在服务器或者构建阶段执行 直接访问资源不需要请求

Q：那岂不是要根据环境编写两套逻辑？那不是就是说 开发者还得写个环境判断？

A：并非 框架可以自动处理环境隔离：在服务端渲染框架里面 构建过程会生成两个bundle：服务端bundle 客户端bundle 在服务端bundle里面 包含完整的loader代码 在客户端bundle里面则会移除loader函数 或者替换成网络请求的逻辑  当客户端导航触发loader的时候框架会拦截请求 并且自动发送请求到服务器端对应的loader端点 

Q：那为什么还需要clientLoader？

A：普通loader函数在两个端都会执行 但是有一些场景 应该只在客户端获取 比如用户的登陆状态 非关键数据。 所以要是我想做一个服务端渲染的项目 就用loader 纯客户端渲染的话 就用clientLoader



###### useFetcher

在不触发导航的情况下执行loader action（在当前url不变的前提下执行loder或者action）用于局部数据刷新  或者表单提交

```react
function SearchBar() {
  const fetcher = useFetcher();
  
  return (
    <fetcher.Form method="get" action="/search">
      <input type="text" name="query" />
      {/* 搜索结果会在当前页面更新，URL 保持不变 */}
      {fetcher.data && <Results data={fetcher.data} />}
    </fetcher.Form>
  );
}
```

表单提交的时候 会自动调用serach路由对应的action函数 返回的数据会被fetcher.data接受 

```javascript
//fetcher对象：
fetcher.state    // 'idle' | 'loading' | 'submitting'
fetcher.data     // 加载的数据
fetcher.error    // 错误信息
fetcher.formData // 表单数据
```

如果需要手动调用fetcher：

```react
const fetcher = useFetcher();

// 手动触发加载
const handleSearch = (query) => {
  fetcher.load(`/search?query=${query}`);
};

// 在按钮点击时调用
<button onClick={() => handleSearch("react")}>搜索 React</button>
```

处理post请求：

```javascript
<fetcher.Form method="post" action="/submit">
  {/* POST 表单 */}
</fetcher.Form>

// 路由配置
{
  path: "/submit",
  action: async ({ request }) => {
    const formData = await request.formData();
    // 处理表单数据
    return { success: true };
  },
}
```



##### action

处理表单提交 数据修改 等副作用

```react
// 普通表单（无 useFetcher）
<form method="post" action="/login">
  <input type="email" name="email" />
  <input type="password" name="password" />
  <button type="submit">登录</button>
</form>

// 路由配置中的 action
{
  path: "/login",
  action: async ({ request }) => {
    const formData = await request.formData();
    const user = await authenticateUser(formData); // 模拟登录验证
    
    if (!user) {
      return new Response(JSON.stringify({ error: "登录失败" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // 登录成功后重定向
    return redirect("/dashboard");
  },
}
```

action用于除了get请求以外的请求（一个路由只能定义一个action）

#### 框架模式

配置：

```react
import {
  type RouteConfig,
  route,
  index,
  layout,
  prefix,
} from "@react-router/dev/routes";

export default [
  index("./home.tsx"),
  route("about", "./about.tsx"),

  layout("./auth/layout.tsx", [
    route("login", "./auth/login.tsx"),
    route("register", "./auth/register.tsx"),
  ]),

  ...prefix("concerts", [
    index("./concerts/home.tsx"),
    route(":city", "./concerts/city.tsx"),
    route("trending", "./concerts/trending.tsx"),
  ]),
] satisfies RouteConfig;

```

其中 index route（默认子路由）（普通路由） layout（布局路由） prefix（添加共同的路径前缀）这些是用于定义路由结构的辅助函数 

布局路由不创建新的路径字段 用于实现页面布局的复用 必须包含Outlet组件

```react
// layout.tsx
import { Outlet } from "react-router-dom";

function Layout() {
  return (
    <div>
      <header>导航栏</header>
      <main>
        {/* 子路由内容将在这里渲染 */}
        <Outlet />
      </main>
      <footer>页脚</footer>
    </div>
  );
}

export default Layout;
```

### 路由模块

当组件渲染时，它会被提供 `Route.ComponentProps` 中定义的 props，这些 props 是 React Router 为你自动生成的。这些 props 包括

1. `loaderData`：从该 Route module 中的 `loader` 函数返回的数据，它们只在服务器渲染时或构建时进行预渲染时在服务器端被调用。client loaders 仅在浏览器中调用，它们提供数据给路由组件，可以补充或替代 Route loaders。

   ```react
   export async function clientLoader() {
     // ...
   }
   clientLoader.hydrate = true as const;
   //这个参数的作用是 传统方案里面 客户端加载会在水合完成之后再进行
   //这个属性配置成true之后 客户端加载会参与初始水和过程
   //通过使用 as const，TypeScript 将推断 clientLoader.hydrate 的类型是 true 而不是 boolean。这样，React Router 就可以根据 clientLoader.hydrate 的值来推导 loaderData 的类型。
   ```

   

2. `actionData`：从该 Route module 中的 `action` 函数返回的数据.Route actions 允许进行服务器端数据修改，当从 `<Form>`、`useFetcher` 和 `useSubmit` 调用时，会自动重新验证页面上的所有 loader 数据。这是为了确保通过网络请求更新服务端数据之后  确保页面数据和服务器状态一致

3. `params`：包含路由参数的对象（如果有）。

4. `matches`：当前路由树中所有匹配项的数组。

#### errorBoundary

当路由组件api抛出错误的时候 将会渲染这个组件

可以在根路由里面使用：

```react
// app/root.tsx
import { ErrorBoundary } from "react-router-dom";
import { Routes } from "@react-router/dev/routes";

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* 所有路由的错误都会被捕获 */}
        <Route path="/" element={<Home />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
```

```react
// 错误边界组件
function AppErrorBoundary() {
  const { error, resetErrorBoundary } = useErrorBoundary(); // 获取错误信息和重置函数

  return (
    <div className="error-page">
      <h1>发生错误：{error.message}</h1>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}

// 在根组件中使用
function App() {
  return (
    <ErrorBoundary fallback={<AppErrorBoundary />}>
      <Routes>...</Routes>
    </ErrorBoundary>
  );
}
```

或者在路由配置里面：

```react
// 父路由定义错误边界
route("dashboard", {
  ErrorBoundary: () => <ParentErrorBoundary />, // 捕获 dashboard 及其子路由的错误
  children: [
    route("settings", {
      loader: () => { throw new Error("子路由错误"); } // 会被父路由的错误边界捕获
    }),
  ],
});
```

- React Router 会查找最近的 `ErrorBoundary`
- 先查找当前路由模块中的 `ErrorBoundary`
- 再查找父路由或全局的 `ErrorBoundary`

| **场景**                   | **useRouteError()** | **useErrorBoundary()** |
| -------------------------- | ------------------- | ---------------------- |
| 全局错误页面               | ✅                   | ❌                      |
| 自定义错误边界组件         | ❌                   | ✅                      |
| 需要重置 / 重试功能        | ❌                   | ✅                      |
| 在非错误边界组件中获取错误 | ✅                   | ❌                      |

`esetErrorBoundary` 是 `useErrorBoundary` 钩子返回的一个函数，主要用于**重置错误边界组件的状态**，从而实现**错误恢复**的功能。

运行这个函数将会清除当前错误（错误边界捕获到子组件或者路哟普模块抛出的错误之后 会一直显示错误界面 所以需要清除错误记录 ）。然后触发重新加载 ，也就是重新运行loader 然后渲染 

#### HydrateFallback

在初始页面加载的时候 路由组件在client loader完成之后 才渲染 在这个过程里面就可以展示这个组件

只需要在路由模块里面配置这个函数即可 react将会在组件没有加载完成的时候自动应用这个组件

```react
// products.tsx（路由模块）
export async function clientLoader({ params }) {
  // 模拟 1 秒的数据加载延迟
  await new Promise(resolve => setTimeout(resolve, 1000));
  return fetchProduct(params.id);
}

export function HydrateFallback() {
  return <div className="skeleton">加载中...</div>;
}

export default function Product({ loaderData }) {
  return <h1>{loaderData.name}</h1>;
}
```

#### headers

定义在服务端渲染的时候响应发送的HTTP headers

注意这里是服务端渲染

1. 用户请求 `/products/123`
2. 服务端接收到请求，匹配到 `products.tsx` 路由
3. 服务端执行该路由的 `headers()` 函数，获取响应头配置
4. 服务端执行 `loader()` 函数获取数据
5. 服务端渲染组件为 HTML
6. 服务端将 `headers()` 返回的头信息添加到 HTTP 响应中
7. 服务端将完整的 HTML 和响应头发送给浏览器

#### handle

Route handle 允许应用在 `useMatches` 中的路由匹配项添加任何内容，以创建抽象（如面包屑等）。

```react
export const handle = {
  its: "all yours",
};
```



#### links

Route links 定义了要在文档的 `<head>` 中渲染的 [`` 元素](https://mdn.org.cn/en-US/docs/Web/HTML/Element/link)。

```react
export function links() {
  return [
    {
      rel: "icon",
      href: "/favicon.png",
      type: "image/png",
    },
    {
      rel: "stylesheet",
      href: "https://example.com/some/styles.css",
    },
    {
      rel: "preload",
      href: "/images/banner.jpg",
      as: "image",
    },
  ];
}
```

所有 Route links 将被聚合并通过 `<Links />` 组件渲染，该组件通常在你应用的根部渲染。

#### meta

Route meta 定义了要在文档的 `<head>` 中渲染的 meta 标签。

```react
export function meta() {
  return [
    { title: "Very cool app" },
    {
      property: "og:title",
      content: "Very cool app",
    },
    {
      name: "description",
      content: "This app is the best",
    },
  ];
}
```

ps：这个是服务端渲染的写法



#### shouldRevalidate

默认情况下，所有路由在 actions 之后都会重新验证。此函数允许路由对于不影响其数据的 actions 选择不进行重新验证。

```react
import type { ShouldRevalidateFunctionArgs } from "react-router";

export function shouldRevalidate(
  arg: ShouldRevalidateFunctionArgs
) {
  return true;
}
```



### 渲染策略

1. CSR
2. SSR
3. SSG

```react
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
   async prerender() {
    return ["/", "/about", "/contact"];
  },
} satisfies Config;
```

服务器端渲染需要支持它的部署环境。尽管这是一个全局设置，但单个路由仍然可以静态预渲染。路由也可以使用 `clientLoader` 进行客户端数据加载，以避免为其 UI 部分进行服务器渲染/获取。



##### suspense流式渲染

延迟非关键数据的加载 从而加快应用的初始渲染速度 接触ui渲染阻塞 

1. 在loader里面返回promise： react会在渲染之前等待loader完成 为了避免阻塞 直接返回promise 而不是等待promise完成。

2. promise将在loaderData中可用 Await等待promise完成 并且触发fallback

   ```react
   export default function MyComponent({
     loaderData,
   }: Route.ComponentProps) {
     let { criticalData, nonCriticalData } = loaderData;
   
     return (
       <div>
         <h1>Streaming example</h1>
         <h2>Critical data value: {criticalData}</h2>
   
         <React.Suspense fallback={<div>Loading...</div>}>
           <Await resolve={nonCriticalData}>
             {(value) => <h3>Non critical value: {value}</h3>}
           </Await>
         </React.Suspense>
       </div>
     );
   }
   ```

   这里也可以使用use来读取promise 但是 如果使用use的话 需要再创建一个子组件 因为promise变化会导致Hooks的顺序问题：

   react内部使用一个链表结构来维护Hooks的顺序 ，每次渲染时顺序不能改变 ，否则react就会混淆状态的对应关系。

   而promise就会引起hook的运行顺序改变，比如：

   ```react
   function MyComponent() {
     const [reload, setReload] = useState(false);
     const promise = reload ? fetchNewData() : fetchInitialData(); // 可能变化的 Promise
   
     // ❌ 直接在当前组件中使用 React.use(promise)
     const value = React.use(promise); // 这里会抛出 Promise
   
     return (
       <button onClick={() => setReload(!reload)}>
         Reload
       </button>
       <h3>Value: {value}</h3>
     );
   }
   ```

   在渲染过程里面 promise可能是两个函数返回的不同的promise 而react会认为这是一个同一个Hook的不同调用 并且尝试复用之前的状态 导致逻辑混乱

   父组件中 Promise 的变化会导致同一 Hook 位置的参数语义不一致, React 依赖 **固定顺序** 管理状态，不允许同一位置的 Hook 参数语义在渲染周期间突然变化。

   但是把use封装到子组件里卖弄 子组件的独立渲染周期会隔离promise的变化

   ```react
   function NonCriticalUI({ p }: { p: Promise<string> }) {
     // ✅ 子组件的 Hook 始终接收同一个 props.p（当前渲染周期的 Promise）
     const value = React.use(p); // 作为子组件的第一个 Hook
     return <h3>Value: {value}</h3>;
   }
   ```

   

#### action

使用 `action` 定义的 Route action 只会在服务器上调用，而使用 `clientAction` 定义的 action 则在浏览器中运行。

服务器 action 只在服务器上运行，并且会从客户端打包文件中移除。

客户端 action 只在浏览器中运行，并且当同时定义了服务器 action 时，客户端 action 会优先执行。

Q:客户端为什么会有服务端action代码？

A：客户端action仅在浏览器里面运行 不能访问服务器资源 处理的是纯前端的逻辑 而服务端action写在服务端 或者客户端组件里面 仅在服务端里面运行 所以服务端action的代码本身不存在于客户端的bundle 客户端仅有一个调用它的引用

客户端的操作先完成是因为 在逻辑上 客户端action完成的是纯前端逻辑 服务端action则是涉及网络请求

所以流程其实是这样的 假设有一个ssr站点，那么为了展示数据之类的 我们编写了一个action 这个action将会返回数据库里面的数据 但是 打包成客户端代码中之后 这段从数据库里面访问数据的代码 就变成一个发起网络请求的代码。

Action 可以通过 `<Form>` 声明式地调用，也可以通过 `useSubmit`（或 `<fetcher.Form>` 和 `fetcher.submit`）命令式地调用，通过引用路由路径和 "post" 方法来实现。

```react
function SomeComponent() {
  return (
    <Form action="/projects/123" method="post">
      <input type="text" name="title" />
      <button type="submit">Submit</button>
    </Form>
  );
}
这会导致导航，并且会在浏览器历史记录中添加一个新条目


function useQuizTimer() {
  let submit = useSubmit();

  let cb = useCallback(() => {
    submit(
      { quizTimedOut: true },
      { action: "/end-quiz", method: "post" }
    );
  }, []);

  let tenMinutes = 10 * 60 * 1000;
  useFakeTimer(tenMinutes, cb);
}
同上


function Task() {
  let fetcher = useFetcher();
  let busy = fetcher.state !== "idle";

  return (
    <fetcher.Form method="post" action="/update-task/123">
      <input type="text" name="title" />
      <button type="submit">
        {busy ? "Saving..." : "Save"}
      </button>
    </fetcher.Form>
  );
}
或者：
fetcher.submit(
  { title: "New Title" },
  { action: "/update-task/123", method: "post" }
);
```

Q:既然制定了action 使用什么请求方法不是都放在action里面吗 为什么还要写一个method

A：在 Server Actions 中，`action` 不再指向真实的服务器路径（如 `/api/update-task`）而是指向一个 **虚拟路径**，用于标识要执行的 **服务端 Action 函数** React 会将这个路径转换为内部路由，最终调用对应的服务端函数

虽然服务端 Action 本质上都是通过 POST 请求触发的 但 `method` 属性仍然保留，保持 HTML 表单的原生语义 告诉 React 这个表单是用于触发 Action，而非传统表单提交

#### 导航

##### NavLink

自带状态 条件渲染 应用样式很方便

```react
<NavLink to="/" end>//这个end表示完全匹配
 
//设置应用不同的样式
a.active {
  color: red;
}

a.pending {
  animate: pulse 1s infinite;
}

a.transitioning {
  /* css transition is running */
}
    
//它还在 className, style, 和 children 上提供了带有状态的回调 props，用于内联样式设置或条件渲染
// className
<NavLink
  to="/messages"
  className={({ isActive, isPending, isTransitioning }) =>
    [
      isPending ? "pending" : "",
      isActive ? "active" : "",
      isTransitioning ? "transitioning" : "",
    ].join(" ")
  }
>
  Messages
</NavLink>  
    
// children
<NavLink to="/tasks">
  {({ isActive, isPending, isTransitioning }) => (
    <span className={isActive ? "active" : ""}>Tasks</span>
  )}
</NavLink>
```



##### Link

不需要样式的时候 用这个

```react
<Link to="/login">Login again</Link>
```

##### Form

Form 组件可用于使用用户提供的 `URLSearchParams` 进行导航。

```
<Form action="/search">
  <input type="text" name="q" />
</Form>
```

如果用户在输入框中输入 "journey" 并提交，他们将导航到/search?q=journey 页面会u刷新



这种方案把数据附加在url上面 使用的是get 相同的url会被缓存

但是如果是：

```
<Form method="post" action="/submit">
  <input type="text" name="message" />
  <button type="submit">提交</button>
</Form>
```

使用的则是post 表单数据被封装成formData对象 页面不会刷新 url或i添加submit

post更适合 **`useFetcher()`**

**问题：直接使用 `<Form method="post">` 的局限性**

1. **页面导航**：即使是 POST 请求，浏览器也会导航到 `action` URL（如 `/submit`）
2. **用户体验**：页面刷新会导致 UI 闪烁，失去当前滚动位置等
3. **数据处理**：难以优雅地处理服务端返回的数据（如错误消息、成功提示）

但是fetcher对象就可以解决这些问题

#### **`useFetcher()` 的优势**：

1. **无刷新提交**：表单数据以异步方式提交，页面保持稳定
2. **状态管理**：可直接获取提交状态（如 loading、success、error）
3. **灵活控制**：可选择是否导航到 `action` URL（通过 `fetcher.form` 或 `fetcher.submit`）
4. **数据集成**：服务端返回的数据可直接用于更新 UI（如显示错误提示）



##### redirect

在路由 loader 和 action 内部，你可以返回一个 `redirect` 到另一个 URL。

```react
export async function loader({ request }) {
  let user = await getUser(request);
  if (!user) {
    return redirect("/login");
  }
  return { userName: user.name };
}
```





#### useNavigate

允许程序员在用户没有交互的情况下将用户导航到新页面

```react
import { useNavigate } from "react-router";

export function useLogoutAfterInactivity() {
  let navigate = useNavigate();

  useFakeInactivityHook(() => {
    navigate("/logout");
  });
}
```

### pendingUi









#### 路由分类

1. 嵌套路由 

嵌套路由就是父路由中嵌套子路由`children`

子路由默认是不显示的，需要父路由通过 `Outlet` 组件来显示子路由 outlet 就是类似于Vue的`<router-view>`展示子路由的一个容器

1. 布局路由 

布局路由是一种特殊的嵌套路由，父路由可以省略 `path`，这样不会向 URL 添加额外的路径段

```javascript
const router = createBrowserRouter([
    { 
        // path: '/index', //省略 
        Component: Layout,
        children: [
            {
                path: 'home',
                Component: Home,
            },
            {
                path: 'about',
                Component: About,
            },
        ]
    },
]);

```



1. 索引路由 

索引路由使用 `index: true` 来定义，作为父路由的默认子路由：索引路由在其父级的 URL 处呈现到其父级的Outlet中

1. 前缀路由 

前缀路由只设置 `path` 而不设置 `Component`，用于给一组路由添加统一的路径前缀

1. 动态路由

动态路由通过 `:参数名` 语法来定义动态段

```react
import { Menu as AntdMenu } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd'
import { useNavigate } from 'react-router';
export default function Menu() {
    const navigate = useNavigate();//编程式导航
    const handleClick: MenuProps['onClick'] = (info) => {
         navigate(info.key) // 点击菜单项时，导航到对应的页面
    };
    const menuItems = [
        {
            key: '/home',
            label: 'Home',
            icon: <AppstoreOutlined />,
        },
        {
            key: '/about',
            label: 'About',
            icon: <AppstoreOutlined />,
        },
    ];
    return <AntdMenu onClick={handleClick} style={{ height: '100vh' }} items={menuItems} />;
}


```



#### 路由传参

1. query:使用 ? 来传递参数

   ```react
   //1. 获取参数
   import { useSearchParams } from 'react-router'
   const [searchParams, setSearchParams] = useSearchParams()
   console.log(searchParams.get('id')) //获取id参数
   
   //2. 获取参数
   import { useLocation } from 'react-router'
   const { search } = useLocation()
   console.log(search) //获取search参数 ?id=123
   
   ```

   

1. params:就是使用 :[name] 

   ```react
   import { useParams } from 'react-router'
   const { id } = useParams()
   console.log(id) //获取id参数
   
   ```

   

1. state:不在url里面显示 但是可以传递参数

   ```react
   <Link to="/user" state={{ name: '小满zs', age: 18 }}>User</Link> //1. Link 跳转
   <NavLink to="/user" state={{ name: '小满zs', age: 18 }}>User</NavLink> //2. NavLink 跳转
   import { useNavigate } from 'react-router'
   const navigate = useNavigate()
   navigate('/user', { state: { name: '小满zs', age: 18 } }) //3. useNavigate 跳转
   
   import { useLocation } from 'react-router'
   const { state } = useLocation()
   console.log(state) //获取state参数
   console.log(state.name) //获取name参数
   console.log(state.age) //获取age参数
   
   ```

#### 1. Params 方式 (`/user/:id`)

- 适用于：传递必要的路径参数（如ID）
- 特点：符合 RESTful 规范，刷新不丢失
- 限制：只能传字符串，参数显示在URL中

#### 2. Query 方式 (`/user?name=xiaoman`)

- 适用于：传递可选的查询参数
- 特点：灵活多变，支持多参数
- 限制：URL可能较长，参数公开可见

#### 3. State 方式

- 适用于：传递复杂数据结构
- 特点：支持任意类型数据，参数不显示在URL
- 限制：刷新可能丢失，不利于分享

选择建议：必要参数用 Params，筛选条件用 Query，临时数据用 State。





#### diff

diff算法是为了实现什么？

由于在框架里面 为了节省操作真实dom的开销 选择了先使用虚拟dom来找到需要进行更新的位置 而diff算法 就是为了锁定更新区域的算法1

在前端的应用场景里面 一般不会出现大量的顺序改变 可能只是在某一块区域  出现了增加 删减 移位。diff算法所做的就是：锁定更改区域 再在更改区域里面进行排查 。

锁定更改区域的核心在于：三指针的双端对比算法 

在更改区域里面进行排查的核心在于：寻找最长稳定子序列  key进行前后映射



#### 双端对比算法

两个数组 c1 c2

指针i指向两个数组头部  l1 l2分别指向两个数组的尾部 

指针i 进行对比：c1[i] c2[i]是否是相同类型的节点？如果是 对这两个节点进行patch 以更新props和children i++

如果不是 那么 退出循环



两个尾指针进行对比：对应的元素是否是相同类型的元素？如果是 那么同时减一 元素进行patch

如果不是 退出循环 



双端对比算法完成了什么？



假设最终锁定的区域    



##### 设计思想

1. 组件化 遵循开闭原则 封闭指的是组件状态自身维护 只处理内部渲染逻辑 开放指的是不同组件通过props进行单项数据流交流
2. 数据驱动视图 不能操作dom 而要修改数据
3. 使用虚拟dom
4. 声明式的js框架 





##### 





##### hooks系统

```react
// 全局变量，用于存储当前正在渲染的组件和工作中的 Hook
let currentlyRenderingComponent = null;
let workInProgressHook = null;
let isMount = true; // 标记是首次渲染还是更新

// 组件基类，每个组件实例都会继承这个类
class Component {
  constructor() {
    this.hooks = []; // 存储组件的所有 Hooks
    this.updateQueue = []; // 存储待处理的更新
  }

  render() {
    // 每个组件需要实现自己的 render 方法
  }
}

// 用于创建函数组件的工厂函数
function createFunctionComponent(func) {
  return class extends Component {
    render() {
      currentlyRenderingComponent = this;
      workInProgressHook = this.hooks[0];
      
      // 执行组件函数，触发 Hook 调用
      const result = func(this.props);
      
      // 更新标记
      isMount = false;
      
      return result;
    }
  };
}

// useState 实现
function useState(initialState) {
  let hook;
  
  if (isMount) {
    // 首次渲染时创建新 Hook
    hook = {
      memoizedState: initialState,
      queue: {
        pending: null
      },
      next: null
    };
    
    // 将 Hook 添加到组件的 hooks 数组
    if (!currentlyRenderingComponent.hooks.length) {
      currentlyRenderingComponent.hooks.push(hook);
    } else {
      currentlyRenderingComponent.hooks[currentlyRenderingComponent.hooks.length - 1].next = hook;
      currentlyRenderingComponent.hooks.push(hook);
    }
  } else {
    // 更新时复用现有 Hook
    hook = workInProgressHook;
    workInProgressHook = workInProgressHook.next;
  }
  
  // 处理待更新的队列
  let baseState = hook.memoizedState;
  if (hook.queue.pending) {
    let firstUpdate = hook.queue.pending.next;
    
    do {
      const action = firstUpdate.action;
      baseState = typeof action === 'function' ? action(baseState) : action;
      firstUpdate = firstUpdate.next;
    } while (firstUpdate !== hook.queue.pending.next);
    
    hook.queue.pending = null;
  }
  
  hook.memoizedState = baseState;
  
  // 创建 setState 函数
  const setState = (action) => {
    // 创建一个新的更新
    const update = {
      action,
      next: null
    };
    
    // 将更新添加到队列（循环链表）
    if (hook.queue.pending === null) {
      // 空队列
      update.next = update;
    } else {
      // 将新更新插入到队列尾部
      update.next = hook.queue.pending.next;
      hook.queue.pending.next = update;
    }
    
    hook.queue.pending = update;
    
    // 触发重新渲染（简化处理）
    scheduleUpdate(currentlyRenderingComponent);
  };
  
  return [baseState, setState];
}

// useEffect 实现
function useEffect(callback, dependencies) {
  let hook;
  
  if (isMount) {
    // 首次渲染时创建新 Hook
    hook = {
      memoizedState: null, // 存储 effect 函数和清理函数
      next: null
    };
    
    // 添加到组件的 hooks 数组
    if (!currentlyRenderingComponent.hooks.length) {
      currentlyRenderingComponent.hooks.push(hook);
    } else {
      currentlyRenderingComponent.hooks[currentlyRenderingComponent.hooks.length - 1].next = hook;
      currentlyRenderingComponent.hooks.push(hook);
    }
  } else {
    // 更新时复用现有 Hook
    hook = workInProgressHook;
    workInProgressHook = workInProgressHook.next;
  }
  
  // 检查依赖项是否变化
  const hasChanged = !dependencies || dependencies.some((dep, i) => {
    const oldDeps = hook.memoizedState?.dependencies;
    return !oldDeps || dep !== oldDeps[i];
  });
  
  if (hasChanged) {
    // 保存旧的清理函数
    const oldCleanup = hook.memoizedState?.cleanup;
    
    // 安排 effect 执行（在渲染后）
    scheduleEffect(() => {
      // 如果有旧的清理函数，先执行它
      if (oldCleanup) {
        oldCleanup();
      }
      
      // 执行新的 effect 并获取新的清理函数
      const cleanup = callback();
      
      // 保存新的清理函数和依赖项
      hook.memoizedState = {
        cleanup,
        dependencies
      };
    });
  }
}

// useRef 实现
function useRef(initialValue) {
  let hook;
  
  if (isMount) {
    // 首次渲染时创建新 Hook
    hook = {
      memoizedState: {
        current: initialValue
      },
      next: null
    };
    
    // 添加到组件的 hooks 数组
    if (!currentlyRenderingComponent.hooks.length) {
      currentlyRenderingComponent.hooks.push(hook);
    } else {
      currentlyRenderingComponent.hooks[currentlyRenderingComponent.hooks.length - 1].next = hook;
      currentlyRenderingComponent.hooks.push(hook);
    }
  } else {
    // 更新时复用现有 Hook
    hook = workInProgressHook;
    workInProgressHook = workInProgressHook.next;
  }
  
  return hook.memoizedState;
}

// 调度更新（简化实现）
function scheduleUpdate(component) {
  // 在实际 React 中，这会触发协调和渲染过程
  console.log('Scheduling update for component');
  
  // 重置 isMount 标记，准备下一次渲染
  isMount = false;
  
  // 模拟渲染
  const rendered = component.render();
  console.log('Rendered:', rendered);
  
  // 渲染完成后，执行所有待处理的 effects
  runPendingEffects();
}

// 调度 effect 执行（简化实现）
let pendingEffects = [];
function scheduleEffect(effect) {
  pendingEffects.push(effect);
}

// 执行所有待处理的 effects
function runPendingEffects() {
  pendingEffects.forEach(effect => effect());
  pendingEffects = [];
}

// 示例使用
function ExampleComponent() {
  const [count, setCount] = useState(0);
  const ref = useRef(0);
  
  useEffect(() => {
    console.log('Effect ran with count:', count);
    ref.current = count;
    
    return () => {
      console.log('Effect cleanup');
    };
  }, [count]);
  
  return (
    <div>
      <p>Count: {count}</p>
      <p>Ref: {ref.current}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}

// 创建组件类
const Example = createFunctionComponent(ExampleComponent);

// 模拟渲染组件
const instance = new Example();
instance.render(); // 首次渲染
// 模拟点击按钮触发更新
instance.hooks[0].queue.pending = {
  action: 1,
  next: null
};
scheduleUpdate(instance); // 触发更新
```



##### 闭包陷阱：为什么hooks捕获过时的状态？

```react
function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log(count); // ❌ 每次打印的都是 0
      setCount(count + 1); // ❌ 每次都只增加到 1
    }, 1000);
    return () => clearInterval(id);
  }, []); // 只执行一次

  return <div>Count: {count}</div>;
}
```

这是因为react的内部的闭包捕获机制：

* 每个渲染周期都会生成独立的闭包
* 初次执行 得到的闭包值是0
* 定时器保留这个闭包 

而链表和闭包是分离的 虽然链表里面count的状态在更新 但是定时器回调引用的闭包不变

最好的实践应该是使用函数式更新 如果添加依赖项 会导致重复执行。



##### 怎么实现fiber架构 和传统递归渲染有什么区别

* 

Q：交替渲染是什么？ 怎么做到暂停再恢复？return指针有什么用？

return指针指向当前节点的父节点 是实现可中断和任务回溯的



##### 优先

React 实现 **高优先级任务打断低优先级任务** 的核心在于 **任务队列管理** 和 **执行上下文保存 / 恢复** 机制

react使用两个队列管理任务：

* taskQueue：按过期时间排序
* timerQueue：尚未到执行时间的任务队列

​	







##### 你的mini-react支持并发渲染吗

通过requestIdleCalllback分割渲染任务 高优先级先执行

" 我的实现支持基本的并发渲染。通过 `requestIdleCallback`，我将渲染任务拆分成多个小单元，每个单元执行时间不超过 5ms。如果浏览器有更高优先级的任务（如用户交互），渲染会暂停，等主线程空闲时再继续。这种方式显著提高了复杂 UI 的响应速度。"

Q：这个单位执行时间控制感觉没什么必要？ 这个渲染暂停怎么弄 要暂停的话得知道事件有没有触发吧 是怎么监听得

A:在用户交互（如输入、点击）发生时，中断当前渲染任务并立即响应。这需要结合 **事件系统** 和 **任务调度** 的协同工作。

事件合成系统指的是：react对原生dom事件进行包装 统一事件处理逻辑 

```react
// 简化的事件合成系统
function createSyntheticEvent(nativeEvent) {
  const syntheticEvent = {
    ...nativeEvent,
    stopPropagation() { /* ... */ },
    preventDefault() { /* ... */ },
  };
  
  return syntheticEvent;
}

// 事件委托处理
function handleTopLevelEvent(type, target, nativeEvent) {
  const syntheticEvent = createSyntheticEvent(nativeEvent);
  
  // 找到对应的 React 组件
  const fiber = findFiberForEvent(target);
  
  // 执行事件处理函数
  const handler = fiber.pendingProps[`on${type}`];
  if (handler) {
    handler(syntheticEvent);
  }
}
```

1. **事件循环机制**：浏览器将用户事件放入任务队列
2. **优先级调度**：用户交互任务自动获得高优先级
3. **时间分片检查**：每个渲染单元结束后检查是否有高优先级任务
4. **状态保存**：通过 Fiber 树保存渲染进度，确保可恢复



##### 怎么优化vdom比较性能 

1. 同层比较
2. key
3. **类型判断**：不同类型节点直接替换，不继续比较子节点。

" 我实现了三个优化策略：1）只比较同层级节点；2）为列表项添加 key 属性，通过 key 快速定位变化的元素；3）如果节点类型不同（如从 `<div>` 变为 `<p>`），直接替换整个子树(raect内部使用一个deleteRemainingChildren进行删除)。这些策略将比较复杂度从 O (n³) 降低到接近 O (n)。"

Q：是替换整个子树吗？ removeElement会这样吗

A：是的 就是这样子设计的  这里说的是 虚拟节点 并不是对真实dom的操作

##### 怎样支持事件系统

1. 合成事件：把所有的事件绑定到根节点：React 将原生 DOM 事件封装为 **跨浏览器兼容的合成事件对象**，并通过 **事件委托（Event Delegation）** 将所有事件监听器绑定到 **根 DOM 节点**（通常是 `document`）
   1. **跨浏览器兼容性**：统一不同浏览器的事件行为（如 `event.stopPropagation()`）
   2. **性能优化**：减少事件监听器数量（仅需一个根节点监听器）
   3. **事件对象标准化**：提供一致的 API（如 `event.target`、`event.currentTarget`）



怎么和redux集成

- **Context API**：通过 Context 传递 store。
- **自定义 Hook**：封装 `useSelector` 和 `useDispatch`。



**示例回答**：
" 我设计了一个简单的 Context API 实现，可以在组件树中共享状态。如果要集成 Redux，我会创建一个 `Provider` 组件，将 store 放入 Context。然后实现 `useSelector` 和 `useDispatch` 两个 Hook，分别用于获取状态和触发 action。这样可以保持与官方 Redux 类似的 API 风格。"

#### **. 实现 mini-react 过程中遇到的最大挑战是什么？**

**回答方向**：



- **Hooks 状态管理**：确保每次渲染时 Hooks 调用顺序一致。
- **异步渲染协调**：在中断和恢复渲染时保持状态一致性。



**示例回答**：
"最大的挑战是实现 Hooks 系统。特别是要保证在不同渲染周期中，Hooks 的调用顺序严格一致。我通过维护一个全局索引和状态数组解决了这个问题，但这也限制了 Hooks 不能在条件语句中调用。"







# Q and A

###### 如何优化useContext导致的性能问题、

useContext用于在组件树里面共享状态 但是在以下场景将会导致性能问题：

1. 当 Context 的值发生变化时，所有消费该 Context 的组件都会重新渲染，即使它们并不需要这些变化。
2. 如果 Context 的值是一个复杂对象（如数组、对象），React 的浅层比较可能会导致不必要的重渲染。
3. 将过多的状态放入同一个 Context 中，会导致任何一个状态的变化都会触发所有消费该 Context 的组件重新渲染。
4. 过多的嵌套 Context 提供者会增加组件树的复杂性，导致性能下降。



当 Context 的值是一个复杂对象时，每次渲染都创建一个新对象会导致所有消费该 Context 的组件重新渲染。使用 `useMemo` 可以缓存 Context 值，只有当依赖项发生变化时才重新创建。



```react
// 创建 Context
const UserContext = createContext();

// Context 提供者组件
const UserProvider = ({ children }) => {
  const [user, setUser] = useState({ name: 'John', age: 30 });
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  
  // 使用 useMemo 缓存 Context 值
  const contextValue = useMemo(() => {
    return {
      user,
      isLoggedIn,
      setUser,
      setIsLoggedIn
    };
  }, [user, isLoggedIn]); // 只有当 user 或 isLoggedIn 变化时才重新创建 contextValue
  
  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// 消费 Context 的组件
const UserProfile = () => {
  const { user } = useContext(UserContext);
```

将大型 Context 拆分为多个小型 Context，每个 Context 只包含相关的状态。这样，当某个状态发生变化时，只有消费该状态的组件会重新渲染。

对于复杂的状态管理，可以使用 `useReducer` 配合 Context。`useReducer` 可以集中处理状态更新逻辑（通过dispatch把多次更新合并成一次），减少不必要的状态变化，从而减少重渲染。



对于更细粒度的状态选择，可以使用 `use-context-selector` 库。这个库提供了一个 `useContextSelector` 钩子，允许你只选择 Context 中的特定部分，只有当这些部分发生变化时，组件才会重新渲染。

```javascript
 const username = useContextSelector(UserContext, value => value.state.user.name);
```





当 Context 中包含函数时，每次渲染都会创建新的函数实例，这可能导致消费组件不必要的重渲染。使用 `useCallback` 可以缓存这些函数，只有当依赖项发生变化时才重新创建。



对于那些在多次渲染之间不会变化的值，可以使用 `useRef` 来存储，这样可以避免不必要的状态更新和重渲染。

###### useReducer相比于useState的优势是什么

当状态逻辑变得复杂，包含多个子值或下一个状态依赖于前一个状态时，`useReducer` 可以使状态转换逻辑更加清晰。

`useReducer` 将所有状态更新逻辑集中在一个地方，这有以下好处：



- **更容易调试**：所有状态变化都通过 reducer 函数，可以在一个地方添加日志或断点
- **更易于测试**：reducer 是纯函数，可以独立测试
- **更清晰的逻辑**：状态转换规则一目了然，不需要在组件中寻找各种状态更新逻辑



由于 reducer 是纯函数，可以在多个组件之间复用，甚至可以导出到单独的文件中进行管理。这使得状态管理逻辑可以在应用中共享和重用。

虽然 `useReducer` 本身不处理异步操作，但它与 `useEffect` 配合使用时，可以更清晰地管理副作用和异步操作。

```javascript
useEffect(() => {
  // 当状态变化时执行副作用
  if (state.isLoading) {
    fetchData()
      .then(data => dispatch({ type: 'FETCH_SUCCESS', payload: data }))
      .catch(error => dispatch({ type: 'FETCH_ERROR', payload: error }));
  }
}, [state.isLoading]);
```





###### useRef常见的用途

最常见的用途之一是获取 DOM 元素的引用，以便直接操作它们，比如聚焦输入框、滚动到特定元素、测量元素尺寸等。

`useRef` 可以用来存储定时器 ID、网络请求控制器、WebSocket 连接等需要在组件卸载时清理的对象。

当你有一些计算密集型的操作，且这些操作的结果在多次渲染之间不会改变时，可以使用 `useRef` 来缓存这些结果，避免重复计算。

当你有一些计算密集型的操作，且这些操作的结果在多次渲染之间不会改变时，可以使用 `useRef` 来缓存这些结果，避免重复计算。



###### forwardRef useImperative

**在保持封装性的同时，选择性地暴露组件内部的方法或 DOM 节点给父组件**。

某些场景下，父组件需要直接调用子组件的方法或访问子组件的 DOM 节点  这种需求与 React 的封装理念存在冲突：**过度暴露内部实现会破坏组件的封装性，导致代码难以维护**  



1. **`forwardRef`**：允许组件接收一个 `ref` 属性，并将其转发给内部的 DOM 节点或子组件。
2. **`useImperativeHandle`**：允许自定义通过 `ref` 暴露给父组件的内容，只暴露必要的方法或属性，而不是整个组件实例或 DOM 节点。



###### useId有什么使用场景？

用于生成在客户端和服务器端都保持一致的唯一 ID。这个 Hook 主要解决了 React 应用在服务器端渲染（SSR）过程中可能出现的 ID 不匹配问题

在 HTML 中，`label` 元素需要通过 `for` 属性与对应的表单元素的 `id` 关联起来。在 React 组件中动态生成这些 ID 时，如果没有 `useId`，可能会导致 SSR 时客户端和服务器端的 ID 不一致。

无障碍功能（a11y）经常需要通过 ID 将元素关联起来，例如 `aria-labelledby`、`aria-describedby` 等。`useId` 确保这些关联在 SSR 过程中不会中断。

在开发可复用的组件库时，`useId` 可以确保组件在不同应用中使用时生成的 ID 不会冲突，同时避免 SSR 问题。

对于需要内部元素相互关联的复杂组件，如手风琴、下拉菜单等，`useId` 可以确保生成的 ID 不会重复且在 SSR 时保持一致。

###### 如何解释react18的并发特性

在 React 18 之前，一旦 React 开始渲染，它会一直运行直到整个组件树完成渲染，期间无法被打断。这可能导致主线程被长时间占用，影响用户体验（如动画卡顿、输入延迟）。



并发渲染允许 React 在渲染过程中暂停，将控制权交回给浏览器处理高优先级任务（如用户输入、动画），然后在适当的时候恢复渲染

并发渲染允许 React 在内存中同时保留多个版本的 UI。当有新的更新请求时，React 可以开始渲染新的 UI 版本，而不会影响当前显示的版本。如果有更高优先级的更新（如用户交互），React 可以丢弃正在进行的渲染，转而处理更高优先级的更新。

（并不是只有两个版本的ui 虽然只有两个fiber树 但是维护的ui版本更多取决于workingProgress树 这个树可以存在多个 最终将会只有一个被提交到dom）

并发渲染引入了更新优先级的概念，React 可以根据更新的紧急程度来决定处理顺序：

React 18 提供了两个主要的 API 来管理优先级：



- `useTransition`：将低优先级更新标记为过渡更新，可以被中断。
- `useDeferredValue`：延迟计算某个值，让高优先级更新先完成。

###### 对比use Transition useDefferdValue

`useTransition` 用于将一个更新标记为**可中断的过渡更新**，允许 React 在有更高优先级更新时中断当前的渲染工作。

`useDeferredValue` 用于创建一个**延迟版本的值**，该值会在所有高优先级更新完成后才更新，从而避免高优先级更新被阻塞。

| 特性         | `useTransition`                                   | `useDeferredValue`                         |
| ------------ | ------------------------------------------------- | ------------------------------------------ |
| **核心功能** | 将更新标记为可中断的过渡                          | 创建延迟版本的值                           |
| **API 形式** | 返回 `[isPending, startTransition]` 元组          | 返回延迟版本的值                           |
| **控制粒度** | 控制整个更新过程的优先级                          | 控制特定值的更新时机                       |
| **使用方式** | 包裹在 `startTransition` 回调中的更新是低优先级的 | 延迟值的更新，而不影响其他状态             |
| **状态关联** | 通常用于关联多个状态更新                          | 通常用于单个值的延迟更新                   |
| **应用场景** | 搜索结果更新、复杂计算、数据加载                  | 大型列表渲染、文本编辑器内容、复杂 UI 组件 |

#### 1. 适合使用 `useTransition` 的场景

- **多个状态需要同步更新**：当一个操作需要同时更新多个状态，且这些更新都是低优先级的。
- **复杂计算或数据加载**：当操作涉及大量计算或网络请求，且不需要立即响应用户。



#### . 适合使用 `useDeferredValue` 的场景

- **大型列表或复杂 UI 组件**：当渲染大型列表或复杂组件可能导致 UI 卡顿，使用延迟值可以确保高优先级交互保持响应。
- **文本编辑器或实时预览**：当用户输入需要实时预览，但预览计算可能很耗时，使用延迟值可以确保输入流畅。



1. **`useTransition` 的性能影响**：
   - 标记为过渡的更新可以被中断，这可能导致多次渲染同一组件
   - React 会优化这种情况，但在极端情况下仍可能有性能影响
   - 适合用于不需要立即响应的更新
2. **`useDeferredValue` 的性能影响**：
   - 创建延迟值本身开销很小
   - 但如果延迟值导致组件重新渲染，可能会有性能影响
   - 适合用于渲染开销大但不需要立即更新的场景



###### 怎么理解单一职责原则

**个类（或模块、函数）应该只负责一项职责**。

1. **提高代码可维护性**
2. **增强代码可读性**
3. **降低耦合度**
4. **提高可扩展性**

在 React 中实现单一职责原则（SRP）需要从组件设计、状态管理、副作用处理等多个维度进行考量。

一个常见的实践是将组件分为**容器组件**（Container Components）和**展示组件**（Presentational Components）：

另一种实践是采用**原子设计**（Atomic Design）原则，将组件拆分为更小的、职责单一的原子组件

React 中的状态应该放在最适合管理它的组件中，遵循**状态位置原则**：

对于跨多个层级的共享状态，可以使用 Context API 来避免 props drilling，同时保持状态管理的职责清晰。

对于复杂的副作用逻辑，可以创建自定义 Hook 来封装，使组件专注于 UI 渲染。

将与 UI 无关的业务逻辑提取为纯函数，使组件更加专注于 UI 渲染。



##### 为什么说React中组合优于继承？

在 React 中使用继承会导致组件之间形成紧耦合关系。当一个组件继承另一个组件时，它依赖于父组件的实现细节，这使得修改父组件可能会影响到所有子类。

继承创建了一种刚性的层次结构，子类必须遵循父类的接口和实现方式。这使得组件难以适应变化的需求，因为修改父类可能会影响到所有子类。

组合通过将组件作为 props 传递，创建了一种松耦合的关系。组件之间只通过明确定义的接口进行通信，这使得修改一个组件不会影响到其他组件。

组合允许组件选择性地复用其他组件的功能，而不是继承全部功能。这使得组件可以更加专注于自己的核心职责。

###### 什么是错误边界errorBoundaied

错误边界是一种 React 组件，它可以**捕获并处理其子组件树中发生的 JavaScript 错误**，记录错误信息，并在错误发生时显示备用 UI，而不是让整个应用崩溃。

错误边界可以捕获以下类型的错误：



1. **渲染期间的错误**：在组件的 `render` 方法中发生的错误
2. **生命周期方法中的错误**：在组件的生命周期方法（如 `componentDidMount`、`componentDidUpdate` 等）中发生的错误
3. **构造函数中的错误**：在组件的构造函数中发生的错误

错误边界**无法捕获**以下类型的错误：



1. **事件处理中的错误**：在 React 事件处理函数中发生的错误（如 `onClick`、`onChange` 等）
2. **异步代码中的错误**：在 `setTimeout`、`Promise`、`async/await` 等异步操作中发生的错误
3. **服务端渲染中的错误**：在服务端渲染过程中发生的错误
4. **错误边界自身的错误**：错误边界组件本身抛出的错误

在 React 中，错误边界是通过定义以下生命周期方法来实现的：



1. `static getDerivedStateFromError()`：在错误发生后，用于更新组件状态，返回一个新的状态对象
2. `componentDidCatch()`：在错误发生后，用于记录错误信息

```javascript
import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // 静态方法：在错误发生后更新组件状态
  static getDerivedStateFromError(error) {
    // 更新状态，使下一次渲染显示降级 UI
    return { hasError: true, error };
  }

  // 生命周期方法：在错误发生后记录错误信息
  componentDidCatch(error, errorInfo) {
    // 这里可以将错误信息上报给错误监控服务
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // 记录错误信息到状态
    this.setState({ errorInfo });
  }

  render() {
    // 如果有错误，显示备用 UI
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    // 如果没有错误，渲染子组件
    return this.props.children;
  }
}

export default ErrorBoundary;

```

如前所述，错误边界无法捕获事件处理中的错误。这是因为事件处理函数不直接参与渲染过程，React 不会在事件处理期间进行渲染。因此，事件处理中的错误需要使用传统的 `try/catch` 语句来捕获：

**如何实现一个受保护的路由**

创建一个受保护的路由组件，它将检查用户的身份验证状态，并根据状态决定渲染请求的组件还是重定向到登录页面。

创建一个上下文（Context）来管理用户的身份验证状态：

```react
import React, { createContext, useContext, useState, useEffect } from 'react';

// 创建身份验证上下文
const AuthContext = createContext();

// 身份验证提供者组件
const AuthProvider = ({ children }) => {
  // 从本地存储获取初始状态
  const initialState = {
    isAuthenticated: localStorage.getItem('token') !== null,
    user: JSON.parse(localStorage.getItem('user')) || null
  };
  
  const [authState, setAuthState] = useState(initialState);
  
  // 登录函数
  const login = (user, token) => {
    // 保存到本地存储
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    
    // 更新状态
    setAuthState({
      isAuthenticated: true,
      user
    });
  };
  
  // 登出函数
  const logout = () => {
    // 从本地存储移除
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // 更新状态
    setAuthState({
      isAuthenticated: false,
      user: null
    });
  };
  
  // 验证令牌
  const verifyToken = async () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setAuthState({
        isAuthenticated: false,
        user: null
      });
      return;
    }
    
    try {
      // 这里应该调用API验证令牌
      // const response = await fetch('/api/verify', {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      
      // 模拟验证成功
      const user = JSON.parse(localStorage.getItem('user'));
      
      setAuthState({
        isAuthenticated: true,
        user
      });
    } catch (error) {
      // 验证失败
      logout();
    }
  };
  
  // 组件挂载时验证令牌
  useEffect(() => {
    verifyToken();
  }, []);
  
  return (
    <AuthContext.Provider value={{ authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 自定义钩子：获取身份验证上下文
const useAuth = () => {
  return useContext(AuthContext);
};

export { AuthProvider, useAuth };

```

当应用复杂度增加时，可结合 Redux、MobX 或 Zustand 等状态管理库：

React Router 6 提供了灵活的路由配置方式，可直接在路由定义中实现保护逻辑

- 实现方式

  ：

  - **组件方式**：创建高阶组件（HOC）或包装组件，检查认证状态后决定渲染目标组件或重定向
  - **钩子方式**：创建自定义钩子（如 `useProtectedRoute`），在组件内部调用以检查权限
  - **路由配置方式**：在 `Routes` 中使用条件渲染，根据认证状态决定渲染哪个路由

chuangjianyge

###### 怎么做状态管理选型

1. 原生状态管理（React 内置方案）
2. Zustand、Jotai、Valtio、UnoCSS
   1. 极简 API，学习成本低
   2. 轻量级，通常只有几百字节
   3. 支持 React Hooks，符合现代 React 开发范式
   4. 内置性能优化（如自动批处理更新）
3. Redux、Redux Toolkit、Redux Saga、Effector
   1. 单向数据流，状态变化可预测
   2. 强大的 DevTools 支持（时间旅行调试、状态持久化）
   3. 丰富的中间件生态（处理异步操作、日志记录等）
   4. 适合大型应用和团队协作

###### zustand jotai

###### React性能优化具体手段

1. 避免不必要渲染 ：memo缓存组件：对props进行浅比较  useMemo：缓存计算结果 useCallback：缓存函数  使用shouldCoponentUpdate控制组件渲染

2. 长列表优化：react本身做了fiber切片 可以使用虚拟列表进一步优化  使用懒加载/分页 

3. 状态管理：

   1. 将状态保持在需要它的组件附近，避免过早将状态提升到全局
   2. 对于需要跨组件共享状态的场景，选择轻量级状态管理库可以减少性能开销
   3. 在渲染过程中修改状态会导致无限循环渲染，严重影响性能

4. 异步操作 数据获取优化 :使用 React.lazy 和 Suspense 实现组件的懒加载 对于高频触发的事件（如滚动、输入），使用节流（Throttle）或防抖（Debounce）减少函数调用频率：

   

###### 如何优化长列表渲染

###### 怎么实现自定义Hook

自定义 Hook 本质上是一个**以 `use` 开头的函数**，它可以调用其他 React Hook（如 `useState`、`useEffect` 等）。



自定义 Hook 的实现依赖于 React 的两个核心机制：

1. **Hook 链表**：React 通过链表结构存储每个组件的 Hook 状态，每次调用 Hook 时按顺序访问链表节点。自定义 Hook 本质上是对这些内置 Hook 的组合调用。
2. **闭包特性**：Hook 利用 JavaScript 闭包保存状态，确保在组件多次渲染之间维持状态的连续性。

ook 本身**不直接包含生命周期方法**（如 `componentDidMount`、`componentDidUpdate` 等），但它通过 `useEffect`、`useLayoutEffect` 等 API **间接实现了生命周期的功能**。











###### 受控组件和非受控组件的选型和应用场景

1. 受控组件（Controlled Components）

- **数据流向**：表单数据由 React 组件通过 `state` 管理，组件控制数据的变化。

- 特点

  ：

  - 表单元素的值（如 `input`、`select`、`textarea`）由 `value` 或 `checked` 属性控制
  - 每次用户输入都会触发 `onChange` 事件，更新组件 `state`
  - 数据始终保持最新状态，可随时获取和验证

2. 非受控组件（Uncontrolled Components）

- **数据流向**：表单数据由 DOM 自身管理，React 组件通过 `ref` 访问 DOM 节点获取数据。

- 特点

  ：

  - 表单元素的值由 DOM 维护，不依赖 React `state`
  - 初始值可通过 `defaultValue` 或 `defaultChecked` 设置，但后续变化由 DOM 控制
  - 仅在需要时（如提交表单）通过 `ref` 获取最新值



选择受控组件还是非受控组件，应根据以下因素综合判断：

1. 数据实时性需求

- **受控组件**：适合需要实时响应输入变化的场景（如实时搜索、输入验证、自动完成）。
- **非受控组件**：适合数据无需实时处理，只需在特定时机（如提交表单）获取的场景。

2. 验证复杂度

- **受控组件**：适合复杂验证逻辑（如密码强度检测、跨字段验证），可实时反馈错误。
- **非受控组件**：适合简单验证，可在提交时一次性验证所有字段。

3. 状态管理需求

- **受控组件**：适合需要与全局状态（如 Redux、Context）集成的场景，可直接同步表单数据。
- **非受控组件**：适合状态简单、无需频繁同步的场景。

4. 性能考虑

- **受控组件**：每次输入都会触发 `onChange` 事件和 `setState`，可能导致频繁重渲染。
- **非受控组件**：仅在需要时读取 DOM 值，减少不必要的状态更新和重渲染。

​			5. 代码复杂度

- **受控组件**：需要编写更多代码处理 `onChange` 事件和状态更新，适合复杂交互。
- **非受控组件**：代码更简洁，适合简单表单（如登录、注册）。

1. **两个不同类型的元素会产生不同的树**：如果元素类型不同（如从 `<div>` 变为 `<p>`），React 会直接销毁旧树并创建新树。
2. **开发者可以通过 `key` 来暗示哪些子元素在不同渲染中保持稳定**：对于列表元素，React 会使用 `key` 来识别哪些元素被添加、删除或移动。
3. **只会对同层级的元素进行比较**：React 不会跨层级比较元素，这大大降低了算法的复杂度。



- React 使用基于 Fiber 的增量渲染，将渲染工作分成小块，每次只处理一部分，然后暂停，让浏览器有时间处理其他任务。
- Vue 使用双指针法和头尾节点比较，通过四个指针（旧列表的头尾指针和新列表的头尾指针）同时向中间移动，比较节点并进行相应操

- React 没有专门的静态节点处理机制，每次渲染都会重新比较所有节点。
- Vue 会标记静态节点（内容不会变化的节点），在 diff 过程中跳过这些节点的比较，从而提高性能。
- React 的更新粒度是函数组件或类组件，一旦组件的 props 或 state 发生变化，整个组件及其子组件都会被重新渲染（除非使用了优化措施）。
- Vue 的更新粒度是响应式依赖追踪的最小单位，只有真正发生变化的数据所影响的 DOM 才会被更新。
- React 采用单向数据流，props 变化会触发组件重新渲染，形成一个自顶向下的渲染流程。
- Vue 采用双向数据绑定，数据变化会自动触发 DOM 更新，形成一个响应式的更新流程。



- React 严格依赖 key 来识别元素，在列表中必须提供 key，否则会有警告。
- Vue 推荐在列表中使用 key，但不是强制的。Vue 的 diff 算法在没有 key 的情况下也能工作，但效率较低。



1. **双指针比较**：Vue 使用双指针法同时遍历新旧虚拟节点数组。
2. **特殊标记**：Vue 会对一些特殊节点（如静态节点）进行标记，这些节点在 diff 过程中会被跳过。
3. **列表比较**：Vue 在比较列表时，会尝试复用相同类型的节点，只有在必要时才会创建新节点。
4. **key 的使用**：Vue 也使用 `key` 来提高列表比较的效率，但实现方式与 React 略有不同。

断与恢复的机制。

###### 怎么处理css

###### 有哪些react动画方案

React 动画方案可以分为四大类，每类基于不同的技术原理：

1. **CSS 过渡与动画**
   利用 CSS 的 `transition` 和 `animation` 属性，通过修改 DOM 元素的类名或内联样式触发动画。

2. **React Transition Group**
   官方提供的动画库，基于 CSS 类名实现组件的进入和退出动画。React Transition Group 通过跟踪组件的挂载和卸载过程，在不同阶段添加相应的 CSS 类名，从而触发动画。

   ```react
     
         <TransitionGroup className="list">
           {items.map((item, index) => (
             <CSSTransition
               key={item}
               timeout={500}
               classNames="item"
               unmountOnExit
             >
               <div className="item" onClick={() => removeItem(index)}>
                 {item}
                 <button className="remove">×</button>
               </div>
             </CSSTransition>
           ))}
         </TransitionGroup>
   ```

   

3. **React Spring**
   基于物理弹簧的动画库，提供更自然的动画效果，支持复杂的交互和状态变化。

   ```react
   
   function DraggableBall() {
     const [position, setPosition] = useState({ x: 0, y: 0 });
     
     // 创建弹簧动画
     const [{ x, y }, set] = useSpring(() => ({
       x: position.x,
       y: position.y,
       config: { mass: 1, tension: 200, friction: 20 }
     }));
     
     // 创建拖拽控制器
     const bind = useDrag(({ offset: [x, y] }) => {
       setPosition({ x, y });
       set({ x, y });
     }, {
       trigger: false, // 禁用默认触发行为
       from: { x: position.x, y: position.y }
     });
     
     return (
       <div className="container">
         <div
           {...bind()}
           className="ball"
           style={{
             transform: `translate3d(${x}px, ${y}px, 0)`,
             boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
           }}
         />
       </div>
     );
   }
   ```

   

4. **Framer Motion**

   功能强大的动画库，结合了声明式 API 和物理动画，适合创建复杂的交互动





###### 怎么进行组件通信？			-

props

cintext

eventBus

路由

传递函数





- **State**：应用的单一数据源，通常是一个 JavaScript 对象。
- **Action**：描述状态变化的纯对象，必须包含 type 字段和可选的 payload 字段。
- **Reducer**：接收当前 state 和 action，返回新 state 的纯函数。
- **Store**：持有应用 state 并处理 action 的容器，通过 dispatch 触发 reducer 更新 state。
- **Selector**：从 state 中提取特定数据的函数，可用于性能优化。









# vue















##### retypeScript

高级类型系统：根据类型关系选择不同的类型，实现类型逻辑分支：

不懂 有什么用 返回个布尔值 不如写个函数

```javascript
// 判断是否为数组类型
type IsArray<T> = T extends Array<any> ? true : false;

// 提取 Promise 的返回类型 看不懂
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;

// 使用示例
type A = IsArray<string[]>; // true
type B = UnwrapPromise<Promise<number>>; // number
```

映射类型：

````javascript
// 使所有属性只读
type Readonly<T> = {
    //这是什么语法 好陌生
  readonly [P in keyof T]: T[P];
};

// 使所有属性可选
type Partial<T> = {
  [P in keyof T]?: T[P];
};

// 使用示例
type User = { name: string; age: number };
type ReadonlyUser = Readonly<User>; // { readonly name: string; readonly age: number }
````

交叉类型：

```javascript
type Person = { name: string };
type Loggable = { log: () => void };

// 组合两个类型
type LoggablePerson = Person & Loggable;

// 使用示例
const person: LoggablePerson = {
  name: 'John',
  log: () => console.log(this.name)
};
```

索引类型

```javascript
// 获取对象属性类型
type GetProperty<T, K extends keyof T> = T[K];

// 使用示例
type User = { name: string; age: number };
type Name = GetProperty<User, 'name'>; // string
```

元编程 装饰器

```javascript
// 类装饰器：记录类的创建
function LogClass(constructor: Function) {
  console.log(`Class created: ${constructor.name}`);
}

// 方法装饰器：日志记录
function LogMethod(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;
  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${propertyKey} with args: ${JSON.stringify(args)}`);
    const result = originalMethod.apply(this, args);
    console.log(`Result: ${result}`);
    return result;
  };
  return descriptor;
}

// 使用示例
@LogClass
class Calculator {
  @LogMethod
  add(a: number, b: number) {
    return a + b;
  }
}

const calc = new Calculator();
calc.add(2, 3); // 输出: "Calling add with args: [2,3]", "Result: 5"
```

泛型约束

```javascript
// 约束泛型必须包含 length 属性
function getLength<T extends { length: number }>(arg: T): number {
  return arg.length;
}

// 使用示例
getLength('hello'); // 5
getLength([1, 2, 3]); // 3
// getLength(123); // 错误：number 类型没有 length 属性
```

类型守卫

```
// 自定义类型守卫
function isString(value: any): value is string {
  return typeof value === 'string';
}

// 使用示例
function print(value: string | number) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // 此时 value 被确认为 string 类型
  } else {
    console.log(value.toFixed(2)); // 此时 value 被确认为 number 类型
  }
}
//也可以使用内置的instanceof typeof
```

类型体操

```javascript
// 深层只读类型
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// 使用示例
type Nested = { a: { b: number } };
type ReadonlyNested = DeepReadonly<Nested>; // { readonly a: { readonly b: number } }
```



- **类型转换**：通过各种类型工具将一种类型转换为另一种类型。
- **类型约束**：对类型进行约

flex/grid

svg

···

事件循环 

promise

防抖 节流 柯里化 



##### 装饰器 迭代器 生成器 async await等核心机制。了解async await的底层实现。掌 握 Proxy/Reflect 等元编程技术

元编程（Metaprogramming）是一种编程范式，允许程序在运行时操作自身的结构（如代码、类型、变量）或行为，甚至可以动态生成或修改代码。简单来说，元编程就是 **“编写能够编写代码的代码”**。这种技术可以显著提升代码的灵活性、可维护性和复用性，

### **核心概念与价值**

1. **运行时反射**：程序可以检查自身的结构（如类、方法、变量）。=》使用getOwnPropertyNames(user)检查对象的属性
2. **代码生成**：动态创建新的代码或修改现有代码。=》编译宏
3. **抽象与自动化**：减少重复代码，实现更高级的抽象。
4. **性能优化**：通过动态优化提高运行效率（如 JIT 编译）。

### 装饰器的作用

1. **代码复用**：提取通用逻辑（如日志、验证、权限控制）
2. **元编程**：在运行时修改类的行为
3. **框架集成**：React、Angular、NestJS 等框架广泛使用装饰器
4. **简化代码**：减少样板代码，提高可读性
5. **增强功能**：为现有类或方法添加新功能

#### . 类装饰器

类装饰器应用于整个类，接收构造函数作为参数，可以修改类的行为或属性。

#### 2. 方法装饰器

方法装饰器应用于类的方法，接收目标对象、方法名和描述符作为参数，可以修改方法的行为。





- 

- 



```javascript
function throttle(func, wait) {
  let timer = null;
  
  return function(...args) {
    // 如果定时器不存在，说明可以执行函数
    if (!timer) {
      func.apply(this, args);
      
      // 设置定时器，在wait时间后重置
      timer = setTimeout(() => {
        timer = null;
      }, wait);
    }
  };
}

function debounce(func, wait) {
  let timer = null;
  
  return function(...args) {
    // 如果有定时器，清除它
    if (timer) {
      clearTimeout(timer);
    }
    
    // 设置新的定时器，在wait时间后执行函数
    timer = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  };
}


/**
 * Event Bus（事件总线）简易实现
 */
class EventBus {
  constructor() {
    // 存储事件和对应的回调函数
    this.events = {};
  }
  
  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(eventName, callback) {
    // 如果事件不存在，则创建一个新的事件队列
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    
    // 将回调函数添加到事件队列中
    this.events[eventName].push(callback);
  }
  
  /**
   * 发布事件
   * @param {string} eventName - 事件名称
   * @param {...any} args - 传递给回调函数的参数
   */
  emit(eventName, ...args) {
    // 如果事件存在，则执行所有回调函数
    if (this.events[eventName]) {
      this.events[eventName].forEach(callback => {
        callback(...args);
      });
    }
  }
  
  /**
   * 取消订阅
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 要取消的回调函数
   */
  off(eventName, callback) {
    // 如果事件存在，则移除对应的回调函数
    if (this.events[eventName]) {
      this.events[eventName] = this.events[eventName]
        .filter(cb => cb !== callback);
    }
  }
}

// 创建全局事件总线实例
const eventBus = new EventBus();

// 使用示例
// 组件A订阅事件
eventBus.on('user:login', (user) => {
  console.log('用户登录:', user);
});

// 组件B发布事件
eventBus.emit('user:login', { id: 1, name: '张三' });

// 组件A取消订阅
eventBus.off('user:login', (user) => {
  console.log('用户登录:', user);
});

```

```javascript
/**
 * 发布订阅模式的简易实现
 */
class EventEmitter {
  constructor() {
    // 存储事件和对应的回调函数
    this.events = new Map();
  }
  
  /**
   * 订阅事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} - 取消订阅的函数
   */
  on(eventName, callback) {
    // 如果事件不存在，则创建一个新的事件队列
    if (!this.events.has(eventName)) {
      this.events.set(eventName, []);
    }
    
    // 将回调函数添加到事件队列中
    const eventQueue = this.events.get(eventName);
    eventQueue.push(callback);
    
    // 返回取消订阅的函数
    return () => {
      this.off(eventName, callback);
    };
  }
  
  /**
   * 发布事件
   * @param {string} eventName - 事件名称
   * @param {...any} args - 传递给回调函数的参数
   */
  emit(eventName, ...args) {
    // 如果事件存在，则执行所有回调函数
    if (this.events.has(eventName)) {
      const eventQueue = this.events.get(eventName);
      eventQueue.forEach(callback => {
        callback(...args);
      });
    }
  }
  
  /**
   * 取消订阅
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 要取消的回调函数
   */
  off(eventName, callback) {
    // 如果事件存在，则移除对应的回调函数
    if (this.events.has(eventName)) {
      const eventQueue = this.events.get(eventName);
      const index = eventQueue.indexOf(callback);
      
      if (index !== -1) {
        eventQueue.splice(index, 1);
      }
    }
  }
  
  /**
   * 只订阅一次事件
   * @param {string} eventName - 事件名称
   * @param {Function} callback - 回调函数
   */
  once(eventName, callback) {
    // 创建一个包装函数
    const wrapper = (...args) => {
      // 执行回调函数
      callback(...args);
      // 执行后立即取消订阅
      this.off(eventName, wrapper);
    };
    
    // 订阅包装函数
    this.on(eventName, wrapper);
  }
  
  /**
   * 清除所有事件或指定事件
   * @param {string} [eventName] - 事件名称（可选）
   */
  clear(eventName) {
    if (eventName) {
      // 清除指定事件
      this.events.delete(eventName);
    } else {
      // 清除所有事件
      this.events.clear();
    }
  }
}

// 使用示例
const eventEmitter = new EventEmitter();

// 订阅事件
const unsubscribe = eventEmitter.on('message', (data) => {
  console.log('收到消息:', data);
});

// 发布事件
eventEmitter.emit('message', 'Hello, world!');
// 输出: 收到消息: Hello, world!

// 取消订阅
unsubscribe();

// 再次发布事件，已取消订阅的回调函数不会执行
eventEmitter.emit('message', 'This message will not be received by the first subscriber.');

// 只订阅一次事件
eventEmitter.once('once', (data) => {
  console.log('只执行一次:', data);
});

// 发布事件
eventEmitter.emit('once', 'First event');
// 输出: 只执行一次: First event

// 再次发布事件，回调函数不会执行
eventEmitter.emit('once', 'Second event');
// 无输出

```





#### 访问器装饰器

访问器装饰器应用于类的 getter 或 setter 方法，接收目标对象、属性名和描述符作为参数，可以修改访问器的行为。

#### 3. 属性装饰器

属性装饰器应用于类的属性，接收目标对象和属性名作为参数，可以修改属性的行为。



##### 模块加载底层原理

cjs：

Node.js 会将每个文件包装在一个函数中，提供 `module`、`exports`、`require` 等全局变量 首次加载后，模块会被缓存到 `require.cache` 中，后续加载直接返回缓存结果。

```
function (exports, require, module, __filename, __dirname) {
  // 你的模块代码
  const utils = require('./utils');
  exports.myFunction = () => {};
}
```

esm:

ESM 导出的是绑定而非值的拷贝，模块内值变化会反映在导入处 而且 不是对象解构

| 特性             | CommonJS (CJS)                 | ES Modules (ESM)             |
| ---------------- | ------------------------------ | ---------------------------- |
| **加载方式**     | 同步、动态（运行时解析）       | 异步、静态（编译时解析）     |
| **语法**         | `require/exports`              | `import/export`              |
| **缓存机制**     | 模块级缓存（首次加载后缓存）   | 按 URL 缓存（相同 URL 共享） |
| **导出类型**     | 值的拷贝（静态）               | 实时绑定（动态）             |
| **文件扩展名**   | `.js`                          | `.mjs`（Node.js）            |
| **动态导入**     | 支持（如 `require(variable)`） | 仅通过 `import()` 函数支持   |
| **循环依赖处理** | 返回已执行部分的导出           | 允许未初始化的引用           |



由于esm输出的是值的引用 所以是不允许修改的

1. CJS的输出是`运行时加载`，而ESM是`编译时`输出接口；





在esm模块内部可以加载cjs模块 但是在cjs里面不可以加载esm模块 这是因为 cjs在编译阶段是不确定的 并且cjs导入依赖于module。exports

而且在值绑定模式里面 esm的实时绑定模式是使用不了的

esm转成cjs

1. 只有默认导入：export.default 变换module.export
2. 只有命名导入;export a 变成module.export.a = ...
3. 都有:默认导入会被命名成default 并且为了和前两者区分 会添加一个_esmodule属性 标记成true

##### 不同网络请求方式的区别

**XMLHttpRequest（XHR）**、**Fetch API**、**Axios**

xhr是 AJAX 的核心通过实例化 `XMLHttpRequest` 对象发送请求，

```javascript
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://api.example.com/data');
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4 && xhr.status === 200) {
    console.log(xhr.responseText);
  }
};
xhr.send();
```

- **同步 / 异步**：可通过 `async` 参数控制同步请求（不推荐，会阻塞主线程）。

- **事件机制**：依赖事件监听（如 `onload`、`onerror`、`onprogress`）处理响应。

- 局限性

  ：

  - 语法繁琐，需要手动处理请求状态。
  - 默认不支持 JSON 数据解析，需手动转换（如 `JSON.parse()`）。
  - 跨域需要手动配置 `withCredentials` 和 CORS 头。

需要精细控制请求过程的话 可以用这个

fetch函数基于promise设计 旨在代替xhr

```javascript
fetch('https://api.example.com/data')
  .then(response => response.json()) // 解析响应体（JSON/Blob/Text 等）
  .then(data => console.log(data))
  .catch(error => console.error('Fetch error:', error));
```

- 仅针对 **网络错误**（如无网络）会 reject，HTTP 错误状态码（如 404、500）不会触发 `catch`，需手动判断 `response.ok`。
- **请求配置**：通过 `fetch(url, options)` 的 `options` 参数设置请求方法、头、体等。
- 原生支持现代特性（如 Stream、AbortController 取消请求）。
- 更好的跨域支持（默认与浏览器同源策略一致）。
- 处理超时需手动实现（可通过 `AbortController` 或第三方库）

axios就是对fetch xhr的封装  可以自动转换响应请求数据

返回的也是一个promise

1. 支持响应 请求拦截
2. 请求头 响应头自动转换
3. 底层根据环境选择使用xhr还是fetch
4. 支持取消 并发 超时
5. 

虚拟滚动列表

canvas

Canvas 的所有绘图操作都通过 **渲染上下文（Rendering Context）** 完成。最常用的是 **2D 上下文**，也支持 **WebGL（3D 上下文）**。

路径是 Canvas 中最基础的绘图方式，通过一系列点和线段构成图形。

- `beginPath()`：开始一条新路径。
- `moveTo(x, y)`：将画笔移动到指定坐标（不绘制线条）。
- `lineTo(x, y)`：从当前点绘制一条直线到指定坐标。
- `arc(x, y, r, startAngle, endAngle, anticlockwise)`：绘制圆弧（圆心、半径、起止角度、是否逆时针）。
- `closePath()`：闭合路径（连接起点和终点）。
- `stroke()`：描边路径（绘制轮廓）。
- `fill()`：填充路径内部区域。





、动态表单生成器

Reactivity API 源码级理解） diff 算法优化策略 fibber架构 优先级调度器 时间切片原理

 Pinia redux 设

图片懒加载、权限校验指令）

##### css原子化

这是一种css架构模式  通过把css拆分成最小 

##### webpack

静态磨具打包工具 把资源视为模块 并且根据依赖关系打包成优化之后的静态文件。

掌握nodejs的内置模块使用，了解node内部异步io机

优化策略：

1. code spliting
2. 缓存优化：通过文件名哈希确保修改之后文件名改变 利用浏览器缓存
3. tree-shaking
4. 懒加载

# react19

添加在过渡中使用异步函数的支持，以自动处理待定状态、错误、表单和乐观更新。

**过去不具有异步支持功能 只能手动设置pending标志 但是现在在useTransition添加一异步支持 就可以在这里面进行网络请求：**

```javascript
 const [isPending, startTransition] = useTransition();
  const handleSubmit = () => {
    startTransition(async () => {
      const error = await updateName(name);
      if (error) {
        setError(error);
        return;
      } 
      redirect("/path");
    })
  }
```

之前我们会把耗时的同步·操作放在这个函数里面 。现在可以支持异步操作 并且操作完成后标志自动设置成false

这样的函数被称为actions

- **待定状态**: Actions 提供一个待定状态，该状态在请求开始时启动，并在最终状态更新提交时自动重置。
- **乐观更新**: Actions 支持新的 [`useOptimistic`](https://zh-hans.react.dev/blog/2024/12/05/react-19#new-hook-optimistic-updates) Hook，因此你可以在请求提交时向用户显示即时反馈。
- **错误处理**: Actions 提供错误处理，因此当请求失败时，你可以显示错误边界，并自动将乐观更新恢复到其原始值。
- **表单**: `<form>` 元素现在支持将函数传递给 `action` 和 `formAction` 属性。将函数传递给 `action` 属性默认使用 Actions，并在提交后自动重置表单。

在 Actions 的基础上，React 19 引入了 [`useOptimistic`](https://zh-hans.react.dev/blog/2024/12/05/react-19#new-hook-optimistic-updates) 来管理乐观更新，以及一个新的 Hook [`React.useActionState`](https://zh-hans.react.dev/blog/2024/12/05/react-19#new-hook-useactionstate) 来处理 Actions 的常见情况。在 `react-dom` 中我们添加了 [`` Actions](https://zh-hans.react.dev/blog/2024/12/05/react-19#form-actions) 来自动管理表单和 `useFormStatus` 来支持表单中 Actions 的常见情况。

```java
// 使用表单的 Actions 和 useActionState
function ChangeName({ name, setName }) {
  const [error, submitAction, isPending] = useActionState(
    async (previousState, formData) => {
      const error = await updateName(formData.get("name"));
      if (error) {
        return error;
      }
      redirect("/path");
      return null;
    },
    null,
  );

  return (
    <form action={submitAction}>
      <input type="text" name="name" />
      <button type="submit" disabled={isPending}>Update</button>
      {error && <p>{error}</p>}
    </form>
  );
}
```



useActionState` 接受一个函数（“Action”），并返回一个被包装的用于调用的 Action。这是因为 Actions 是可以组合的。当调用被包装的 Action 时，`useActionState` 将返回 Action 的最后结果作为 `data`，以及 Action 的待定状态作为 `pending

Q:什么叫action的指定状态

Actions 也与 React 19 的新 `<form>` 功能集成在 `react-dom` 中。我们已经添加了对将函数作为 `<form>`、`<input>` 和 `<button>` 元素的 `action` 和 `formAction` 属性的支持，以便使用 Actions 自动提交表单：

```
<form action={actionFunction}>
```

当 `<form>` Action 成功时，React 将自动为非受控组件重置表单。如果你需要手动重置 `<form>`，你可以调用新的 `requestFormReset` React DOM API



在设计系统中，常常需要编写设计一类能够访问其所在的 `<form>` 的信息而无需将属性传递到组件内的组件。这可以通过 Context 来实现，

但为了使这类常见情况更简单，我们添加了一个新的 Hook `useFormStatus`：

```javascript
import {useFormStatus} from 'react-dom';

function DesignButton() {
  const {pending} = useFormStatus();
  return <button type="submit" disabled={pending} />
}
```

`useFormStatus` 读取父 `<form>` 的状态，就像表单是一个 Context 提供者一样。

```react
import { createContext, useContext, useState } from 'react';

const FormContext = createContext();

// 表单提供者
export function FormProvider({ children, onSubmit }) {
  const [values, setValues] = useState({});
  return (
    <FormContext.Provider value={{ values, setValues }}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(values); }}>
        {children}
        <button type="submit">Submit</button>
      </form>
    </FormContext.Provider>
  );
}

// 字段组件
export function Field({ name, type = 'text' }) {
  const { values, setValues } = useContext(FormContext);
  return (
    <input
      type={type}
      value={values[name] || ''}
      onChange={(e) => setValues(v => ({ ...v, [name]: e.target.value }))}
    />
  );
}

<FormProvider onSubmit={values => console.log(values)}>
  <Field name="username" />
  <Field name="email" type="email" />
</FormProvider>
```



useOptimistic

一般在异步请求成功的时候 需要显示最终状态 于是添加这个api

`useOptimistic` Hook 会在 `updateName` 请求进行时立即渲染 `optimisticName`。当更新完成或出错时，React 将自动切换回 `currentName` 值。

use

这个api也是新版本的 可以读取一个promise 但是不能读取在渲染中创建的promise

```react
import {use} from 'react';
import ThemeContext from './ThemeContext'

function Heading({children}) {
  if (children == null) {
    return null;
  }
  
  // 因为过早的返回
  // 这里 useContext 无法正常工作。
  const theme = use(ThemeContext);
  return (
    <h1 style={{color: theme.color}}>
      {children}
    </h1>
  );
}
```

在这段代码里面 use可以正确的读取context 这是因为use的设计是可以在条件判断的 （也许是这个hook不会被记录在链表里面？）

而usecontext不可以 所以这个条件判断导致他可能不执行 这是不乐意的

ref

从react19开始 ref可以作为prop被读取

```javascript
function MyInput({placeholder, ref}) {
  return <input placeholder={placeholder} ref={ref} />
}

//...
<MyInput ref={ref} />
```

在以前的版本里面 因为ref是一个特殊属性 默认是不会出现在props

如果要把ref传递给子组价的DOM节点 需要使用forwardRef 以此获取子组件中的真实节点 dom属性

```java
// React 18 及以前的写法
const MyInput = forwardRef((props, ref) => {
  return <input {...props} ref={ref} />;
});
```



可以直接使用context 而不需要.provider

```java
const ThemeContext = createContext('');

function App({children}) {
  return (
    <ThemeContext value="dark">
      {children}
    </ThemeContext>
  );  
}
```



函数ref

```java
<input
  ref={(ref) => {
    // ref 创建

    // 新特性: 当元素从 DOM 中被移除时
    // 返回一个清理函数来重置 ref
    return () => {
      // ref cleanup
    };
  }}
/>
```

当组件卸载时，React 将调用从 `ref` 回调返回的清理函数。这适用于 DOM refs，类组件的 refs，以及 `useImperativeHandle`。

在之前的版本里面 需要手动判断ref是不是null：

```javascript
// 现有机制
<div
  ref={(el) => {
    if (el) {
      // 组件挂载时：el 是 DOM 节点
      el.addEventListener('click', handleClick);
    } else {
      // 组件卸载时：el 是 null，执行清理
      el.removeEventListener('click', handleClick); // ❗ 此处 el 为 null，可能报错
    }
  }}
/>
```

返回值会被忽略

在更新的版本里面react不再传递一个null 而是直接调用返回的函数



usedefferdValue添加初始值

```java
function Search({deferredValue}) {
  // On initial render the value is ''.
  // Then a re-render is scheduled with the deferredValue.
  const value = useDeferredValue(deferredValue, '');
  
  return (
    <Results query={value} />
  );
}
```

当提供了 initialValue, `useDeferredValue` 将在组件的初始渲染中返回它作为 `value` , 并在后台安排一个使用返回的  deferredValue 重新渲染。





原生支持在组件里面渲染文档元数据

```react
function BlogPost({post}) {
  return (
    <article>
      <h1>{post.title}</h1>
      <title>{post.title}</title>
      <meta name="author" content="Josh" />
      <link rel="author" href="https://twitter.com/joshcstory/" />
      <meta name="keywords" content={post.keywords} />
      <p>
        Eee equals em-see-squared...
      </p>
    </article>
  );
}
```

当 React 渲染这个组件时，它会看到 `<title>`、`<link>` 和 `<meta>` 标签，并自动将它们提升到文档的 `<head>` 部分。

支持样式表

```react
function ComponentOne() {
  return (
    <Suspense fallback="loading...">
      <link rel="stylesheet" href="foo" precedence="default" />
      <link rel="stylesheet" href="bar" precedence="high" />
      <article class="foo-class bar-class">
        {...}
      </article>
    </Suspense>
  )
}

function ComponentTwo() {
  return (
    <div>
      <p>{...}</p>
      <link rel="stylesheet" href="baz" precedence="default" />  <-- will be inserted between foo & bar
    </div>
  )
}
```

如果你告诉 React 你的样式表的 `precedence`，它将管理样式表在 DOM 中的插入顺序，并确保在显示依赖于这些样式规则的内容之前加载样式表（如果是外部的）。

在客户端渲染时，React 会等待新渲染的样式表加载完成后再提交渲染。如果你在应用程序的多个地方渲染此组件，React 会只在文档中包含一次样式表







预加载

react19提供新的api 用于加载和预加载资源 

```react
import { prefetchDNS, preconnect, preload, preinit } from 'react-dom'
function MyComponent() {
  preinit('https://.../path/to/some/script.js', {as: 'script' }) 
  preload('https://.../path/to/font.woff', { as: 'font' }) 
  preload('https://.../path/to/stylesheet.css', { as: 'style' }) 
}
```



支持自定义元素 

在过去的版本中，使用 React 中的自定义元素很困难，因为 React 将无法识别的 props 视为 HTML attribute 而不是 DOM property。在 React 19 中，我们添加了对 DOM property 的支持





###### 浏览器的一帧

#### **1. 事件处理与输入响应**

- **监听用户操作**：处理鼠标点击、滚动、键盘输入等事件（如`click`、`scroll`）。
- **优先级调度**：高优先级事件（如滚动）会优先进入事件循环队列，避免阻塞渲染。

#### **2. JavaScript 执行（可能阻塞渲染）**

- **主线程任务**：执行同步 JS 代码（如`setTimeout`回调、事件处理器）。
- **注意**：JS 执行会阻塞渲染，若代码耗时过长（如复杂计算），会导致帧超时。
- **优化点**：使用`requestAnimationFrame`将 JS 操作与帧同步，或通过`Web Worker`分流计算任务。

#### **3. 样式计算（Style Calculation）**

- **构建 CSSOM（CSS 对象模型）**：解析 CSS 样式（包括内联、外部样式表、`@style`标签），生成样式规则树。
- **计算元素样式**：确定每个 DOM 节点的最终样式（如继承、层叠优先级、响应式规则）。
- **示例**：若元素样式为`color: red`，需计算其最终值（可能受父元素`class`影响）。

#### **4. 布局（Layout/Reflow）**

- **确定元素位置与尺寸**：根据 CSS 盒模型（`width`、`height`、`padding`、`margin`等）计算每个元素在页面中的几何位置。
- **触发场景**：当元素的几何属性（如`width`）或父容器布局发生变化时，会触发全局或局部布局。
- **高成本操作**：布局会影响整个文档流，应尽量减少重排（如使用`transform`替代`left`调整位置）。

#### **5. 绘制（Painting）**

- **像素级渲染**：将元素的视觉属性（颜色、边框、文字、阴影等）绘制到画布上。
- **分层处理**：根据`z-index`、`position`等属性，将不同元素分配到不同绘制层。
- **触发场景**：元素的视觉属性（如`background-color`）变化时会触发绘制。

#### **6. 合成（Compositing）**

- **图层合并**：将多个绘制层按层级合并为最终帧画面，通常由 GPU 加速处理。

- 优化技术

  ：

  - **合成层提升**：对频繁动画的元素（如`transform: translateZ(0)`）创建独立合成层，避免影响其他层。
  - **硬件加速**：利用 GPU 处理平移、缩放等变换，减少 CPU 负担。

#### **7. 帧同步与显示**

- **VSync（垂直同步）**：等待显示器的垂直扫描信号，确保帧与屏幕刷新率同步，避免画面撕裂。
- **`requestAnimationFrame`**：浏览器在下一帧渲染前调用指定回调，确保动画流畅（如`window.requestAnimationFrame(callback)`）。

最后如果有时间会执行requestIdlecallback



假设在·一个函数内执行了添加五万条dom元素到页面上 那么就会造 成 浏览器这一帧的js执行时间非常长  也就是帧超时 视觉感受就是页面一直在加载 

这个时候就可以使用ric 把原来的函数拆分成多个小任务来执行 



并且感觉是不会造成栈溢出的 因为虽然是嵌套调用 但是其实只是控制在时机来执行 而并不是嵌套执行









![image-20250627194330908](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627194330908.png)

![image-20250627201422215](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627201422215.png)



![image-20250627201544210](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627201544210.png)



   

 





![image-20250627202358026](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627202358026.png)



![image-20250627202726443](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627202726443.png)

![image-20250627202749330](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627202749330.png)

 

![image-20250627202835643](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627202835643.png)

![image-20250627202931067](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627202931067.png)

**![image-20250627202957792](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250627202957792.png)**





![image-20250628121135909](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628121135909.png)

fiber树实际上是一个链表结构



![image-20250628122705926](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628122705926.png)



 ![image-20250628122731274](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628122731274.png)





 



![image-20250628131314666](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628131314666.png)



所以这个结束函数完成调用之后 就可以从rootFiber这个对象上面取出effctList

![image-20250628135417864](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628135417864.png)

这个链表在fiber对象里面 









![image-20250628140414531](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628140414531.png)





![image-20250628140923750](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628140923750.png)

commt执行之后 右侧的树渲染到界面上 curent指针方向改变：



在及逆行更新额时候 react会通过当前展示在页面上面的fiber树的alternate属性取到另一棵树 然后再另一棵树上面做修改 离开避免重复创建fiber节点 但是对于上图这种情况 确实不存在对应的fiber节点 那还是要走创建逻辑的 



![image-20250628141509761](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628141509761.png)



![image-20250628141537734](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628141537734.png)





x



****

![image-20250628141746997](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628141746997.png)

























 ![image-20250628190032684](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628190032684.png)



![image-20250628190316707](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628190316707.png)



​    

![image-20250628190659411](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628190659411.png)



![image-20250628190853737](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628190853737.png)







![image-20250628191218418](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628191218418.png)



![image-20250628191314107](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628191314107.png)



![image-20250628191520207](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628191520207.png)

![image-20250628191542335](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20250628191542335.png)





 v  





