### 内置组件

#### keep-alive

##### 源码层面

keep-alive有三个常用配置项 include exclude max 它的内部实现的关键在于：内部维护一个缓存对象 和根据max  和选择的清除策略进行缓存清理 

keep-alive相当于一个特殊组件 被keepalive包裹的组件将会作为children传递给他 

所以在渲染的时候 keepalive组件将会检查这个需要缓存的组件是不是在缓存对象里面 如果是 那么就可以取出之前的虚拟节点进行复用 在虚拟节点里面保存了组件的真实dom 这样就不需要进行组件的销毁和重建 。并且在给这个虚拟节点的shapeFlag设置成keep-alive-component 在卸载的时候不会真的删除虚拟节点 和真实dom

当缓存的虚拟节点的数量超过了max的限制 就要根据策略进行清除 vue默认使用LRU 最近最少使用算法  也可以使用自定义组件LFU 使用频率最低算法

vue使用LRU算法：使用MAP记录缓存的组件 同时维护一个keys set记录组建的访问顺序  在组件被首次渲染的时候 他的key会被添加到这个数组的最后一个元素 并且删除以前的 每次清除的时候 就清除这个数组里面的第一个元素

但是keep-alive 可能会造成 数据更新 页面不更新。可以通过在actived生命周期里面监听路由参数 重新初始化数据 使用key强制重新渲染等操作避免

```javascript
// KeepAlive 组件的核心结构（简化版）
export const KeepAlive = {
  setup(props, { slots }) {
    // 创建缓存容器
    const cache = new Map();
    const keys = new Set();
    
    // 最大缓存数量（通过 props.max 配置）
      缓存映射表（cache）：使用 Map 存储缓存的组件实例
缓存键集合（keys）：使用 Set 记录缓存顺序，支持 LRU 淘汰策略
    const max = props.max;
    
    // 清理缓存的函数
    const pruneCache = (filter?: (name: string) => boolean) => {
      cache.forEach((vnode, key) => {
        if (!filter || !filter(key)) {
          pruneCacheEntry(key);
        }
      });
    };
    
    // 其他逻辑...
  }
};
```

使用keep-alive包裹的组件进行渲染的时候：

```javascript
// KeepAlive 的渲染函数（简化版）
return () => {
  const children = slots.default?.();//通过插槽获取render函数并执行  
  const child = children?.[0];
  
  // 只处理单个子组件
  if (!isVNode(child) || !(child.shapeFlag & ShapeFlag.STATEFUL_COMPONENT)) {
    current = child;
    return child;
  }
  
  // 组件唯一标识（通过 vnode.type 和 key 生成）
  const key = child.key == null ? child.type : child.key;
  const cachedVNode = cache.get(key);
  
  // 缓存处理逻辑
  if (cachedVNode) {
    // 从缓存中恢复组件
    child.el = cachedVNode.el;//虚拟节点创建的步骤是无法跳过的 但是可以跳过真实dom的创建
    child.component = cachedVNode.component;
    
    // 标记为已缓存的组件
    child.shapeFlag |= ShapeFlag.COMPONENT_KEPT_ALIVE;
    
    // 更新缓存键的顺序（LRU 策略）
    keys.delete(key);
    keys.add(key);
  } else {
    // 新组件，添加到缓存
    cache[key] = child;
    keys.add(key);
    
    // 超出最大缓存数时，淘汰最久未使用的组件
    if (max && keys.size > parseInt(max, 10)) {
      pruneCacheEntry(keys.values().next().value);
    }
  }
  
  // 特殊标记，告诉渲染器此组件需要特殊处理
  child.shapeFlag |= ShapeFlag.COMPONENT_SHOULD_KEEP_ALIVE;
  
  return child;
};
```

当组件被 `KeepAlive` 包裹且需要卸载时，不会真正销毁，而是执行特殊处理：

```javascript
// 渲染器处理卸载逻辑（简化版）
function unmount(vnode) {
  if (vnode.shapeFlag & ShapeFlag.COMPONENT_SHOULD_KEEP_ALIVE) {
    // 对于 KeepAlive 组件，执行特殊卸载逻辑
    const instance = vnode.component;
    resetShapeFlag(vnode);
    
    // 执行 deactivate 钩子
    queuePostRenderEffect(() => {
      instance.isDeactivated = true;
      if (instance.a) {
        invokeArrayFns(instance.a); // 调用 beforeUnmount 钩子
      }
    });
    
    // 不真正销毁组件，只是隐藏
    return;
  }
  
  // 普通组件的正常卸载逻辑...
}
```







keepalive是一个缓存组件 可以缓存动态组件 路由组件。 可以在渲染过程中缓存组件实例 而不是销毁。对于普通组件 触发卸载和挂载的时候触发的生命周期是mounted beforeMounted 等等 对于缓存组件 触发的是actived deactived

可以使用include exclude设置需要缓存的组件 这里使用了组件的name属性 ，也可以通过meta字段指定哪些页面要缓存

在这个组件船舰的时候 会创建缓存对象 keys 来缓存实例 记录缓存过的组件



#### component

##### 源码层面是怎么实现的？

在compiler中 compoennt组件将会被转换成h(component, props, children) ，而当h接收到的组件tag是compoennt的时候 他会根据is的属性值来决定渲染的组件。根据不同的type选用不同的策略：字符串尝试从上下文里面解析组件 /对象就直接使用组件对象/函数就处理函数式组件 



#### tarnsition、transition-group

#### slot

##### 源码层面实现

当compiler处理到插槽内容的时候 将会把插槽内容转换成函数 并且把这个函数传递给子组件

```javascript
// 父组件模板：<Child><template #header>Header</template></Child>
render() {
  return createVNode(Child, null, {
    // 插槽内容被转换为函数
    header: () => [createVNode("div", null, "Header")]
  });
}

// 子组件模板：<slot name="header" />
render() {
  return renderSlot(this.$slots, 'header', {}, () => [])
}
```

父组件里面编写的插槽内容决定了给子组件传递的函数

子组件里面使用的插槽决定了renderSlots函数的位置 参数 

在运行的时候 vue3会把插槽作为组件实例的属性进行管理 

插槽分为默认插槽 具名插槽 作用域插槽 每种插槽最终都会被编译成函数 收集到子组件的slots属性中 这个属性保存一个对象 代表插槽name和渲染函数的映射 

写在子组件里面的slot标签最终会被编译成renderSlots函数 可以传递name和参数

在这个函数里面 会根据name在slots属性里面进行查找 并且调用对应的渲染函数 

```javascript
// 创建组件实例时初始化插槽
export function initSlots(instance: ComponentInternalInstance, children: VNodeNormalizedChildren) {
  if (isVNode(children)) {
    // 单个 vnode 作为默认插槽
    instance.slots = { default: () => [children] };
  } else if (isArray(children)) {
    // 数组作为默认插槽
    instance.slots = { default: () => children };
  } else if (isObject(children)) {
    // 对象形式的具名插槽
    const slots = {};
    for (const name in children) {
      const slot = children[name];
      if (isFunction(slot)) {
        slots[name] = slot;
      } else {
        // 非函数值包装为函数
        slots[name] = () => [slot];
      }
    }
    instance.slots = slots;
  } else {
    instance.slots = {};
  }
  
  // 标记插槽是否为动态（影响性能优化）
  markStaticSlots(instance.slots, instance.type);
}
```

```javascript
// 渲染插槽的辅助函数
export function renderSlot(
  slots: InternalSlots | null,
  name: string,
  props: Data = {},
  fallback: () => VNodeArrayChildren = () => []
): VNode {
  if (!slots || !slots[name]) {
    // 插槽不存在，使用回退内容
    return createVNode(Comment, null, fallback());
  }
  
  const slot = slots[name];
  if (props) {
    // 作用域插槽：将 props 传递给插槽函数
    return createVNode(
      Fragment,
      null,
      slot(props)
    );
  } else {
    // 普通插槽
    return createVNode(
      Fragment,
      null,
      slot()
    );
  }
}
```





#### teleport

##### 源码层面实现

首先创建一个teleport类型的特殊节点 在调用mount的时候 由于这个mountChildren函数的anchor参数可以指定渲染到的位置 借助这个参数 就可以实现渲染到指定位置 

#### suspense

这是vue3用于处理异步依赖的内置组件 解决的问题是：

1. 在异步组件加载的时候展示fallback内容
2. 当异步组件完成加载的时候自动切换成组件内容 
3. 处理嵌套的异步依赖关系 

vue提供的suspense并不具有统一的错误处理机制 但是可以使用自定义组件 使用onErrorCaptured钩子捕获子组件抛出的错误 

```
<!-- ErrorBoundary.vue -->
<template>
  <div>
    <!-- 正常内容 -->
    <slot v-if="!error" />
    
    <!-- 错误内容 -->
    <div v-else class="error-message">
      <h3>加载失败</h3>
      <p>{{ error.message }}</p>
      <button @click="retry">重试</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onErrorCaptured } from 'vue';

const error = ref(null);

// 捕获子组件抛出的错误
onErrorCaptured((err) => {
  error.value = err;
  return true; // 阻止错误继续向上传播
});

// 重试函数，重置错误状态
const retry = () => {
  error.value = null;
};
</script>

<style scoped>
.error-message {
  color: red;
  padding: 20px;
  border: 1px solid #ddd;
}
</style>
```





```vue
<template>
  <suspense>
    <!-- 主内容：可以是异步组件或依赖异步数据的组件 -->
    <template #default>
      <AsyncComponent />
    </template>
    
    <!-- 加载中显示的内容 -->
    <template #fallback>
      <div>Loading...</div>
    </template>
  </suspense>
</template>
```

##### 源码层面

```javascript
// Suspense 实例的核心结构
const suspense = {
  active: false,           // 是否处于加载状态
  dependencies: new Set(), // 异步依赖集合
  
  // 注册异步依赖
  registerDep(dep) {
    this.dependencies.add(dep);
  },
  
  // 通知依赖已解决
  notify(dep) {
    this.dependencies.delete(dep);
    if (this.dependencies.size === 0) {
      this.resolvePending();
    }
  },
  
  // 处理加载失败
  fail(err) { /* ... */ }
};
```

当渲染过程中遇到异步组件或 Promise 时，Vue3 会：

1. **暂停当前渲染**
2. **记录异步依赖**
3. **显示 fallback 内容**

```javascript
// 异步组件加载逻辑（简化版）
function loadAsyncComponent(component) {
  const promise = new Promise((resolve) => {
    // 模拟异步加载
    setTimeout(() => {
      resolve(/* 加载的组件 */);
    }, 1000);
  });
  
// 当渲染过程中遇到异步组件时
if (isAsyncComponent(component)) {
  // 暂停渲染，记录依赖
  const suspense = getCurrentSuspense();
  suspense.registerDep(asyncPromise);
  throw asyncPromise; // 关键：通过 throw 暂停渲染
}
    
// Suspense 捕获到异步依赖后
function startPending() {
  this.active = true; // 标记为加载中
  queueRenderUpdate(); // 触发重渲染，显示 fallback
}
    
    
// 当异步依赖完成时
asyncPromise.then(() => {
  const suspense = getCurrentSuspense();
  suspense.notify(asyncPromise); // 通知依赖已解决
  
  if (suspense.dependencies.size === 0) {
    // 所有依赖都已解决
    suspense.resolvePending(); // 退出加载状态
  }
});
    
    
function resolvePending() {
  this.active = false; // 标记为加载完成
  queueRenderUpdate(); // 触发重渲染，显示 default
}
```



```javascript


// Suspense 组件的核心接口
export const SuspenseImpl = {
  name: `Suspense`,
  
  // 标记为内置组件
  __isSuspense: true,
  
  props: {
    timeout: {
      type: Number,
      default: Infinity
    }
  },
  
  setup(props, { slots }) {
    const instance = getCurrentInstance()!;
    const { parent } = instance;
    
    // 创建 Suspense 上下文
    const suspense = {
      active: false,
      pendingBranch: null,
      resolvedBranch: null,
      effect: null,
      parent: null,
      registerDep(dep) { /* 注册异步依赖 */ },
      notify(dep) { /* 通知依赖已解决 */ },
      fail(err) { /* 处理加载失败 */ }
    };
    
    // 存储当前 Suspense 实例到组件实例
    instance.suspense = suspense;
    
    // 创建渲染 effect
    const effect = new ReactiveEffect(
      () => slots.default?.(),
      () => queueJob(update),
      instance.scope // track it in component's effect scope
    );
    
    // 保存 effect 到 suspense 上下文
    suspense.effect = effect;
    
    // 初始化渲染
    let initialState = effect.run();
    
    // 返回渲染函数
    return () => {
      // 根据加载状态决定渲染 default 还是 fallback
      if (suspense.active) {
        return slots.fallback?.() || createVNode(Comment);
      } else {
        return initialState || slots.default?.() || createVNode(Comment);
      }
    };
  }
};
```

Suspense 组件在不同状态间转换：

```javascript
// 状态转换流程
function startPending() {
  // 标记为加载中状态
  suspense.active = true;
  // 触发更新，渲染 fallback
  update();
  
  // 设置超时处理
  if (props.timeout !== Infinity) {
    setTimeout(() => {
      if (suspense.active) {
        // 超时后可以选择显示 fallback 或继续等待
      }
    }, props.timeout);
  }
}

function resolvePending() {
  // 标记为已加载状态
  suspense.active = false;
  // 触发更新，渲染 default
  update();
}
```

简单来讲 suspense组件上面存在几个特殊的属性：active 标记当前是否正在进行加载 dependencies 这个组件的异步依赖集合，组件将会根据active的值来决定渲染fallback内容还是default内容。而这个active的值会根据当前依赖改变：当在渲染过程里面碰到异步依赖 会暂停渲染 把捕获的异步依赖添加到依赖数组，把active设为真 触发重新渲染 。当异步依赖解决了 将会检查当前还有没有正在执行的异步依赖 没有就可以把active设置成false 触发重新渲染 。



### 响应式

##### watchEffect的小问题

```javascript
watchEffect(()=>{
	const res = await ...
	//使用响应式数据的代码...
})
```

众所周知 await之后的代码 是同步执行

而下一行的 到结束的代码 会被包装成一个微任务 进入微任务队列

正是由于后面的代码变成了微任务 异步执行 使得依赖不会被捕获 

为了解决这个问题：

1. 不使用await

2. 在await之前捕获依赖

   ```javascript
   watchEffect(()=>{
   	ref.value//在value之前进行异步捕获
   	const res = await ...
   	//使用响应式数据的代码...
   })
   ```



V-model情景题

有一个响应式数据 需要从父组件 传递给子组件，并且要在子组件的表单里面双向绑定 并且这个数据是一个表单对象 

在双向绑定的时候 如果直接v-model=prop 这就破坏数据流向的单向性

1. 给表单绑定@change事件 上抛事件到父组件 并且传递newValue prop  但是当表单元素很多的时候 每个元素都租要绑定事件  但是这样使用的就不是双向数据绑定
2. 使用计算属性：对每个要使用的属性进行代理 get地时候正常返回传递的对象地属性值 修改的时候上抛事件
3. 使用计算属性 但是为了减轻压力 使用一个对象 并且为了拦截对象地修改赋值 使用代理对象                                                              



为了解决这个问题 可以使用带有setter的计算属性，在读取的时候正常返回父组件传递的prop 在set的时候上抛事件修改父组件里面的属性值 

但是这样的话 假设有很多表单 那每一个属性都要写一个计算属性 很麻烦 又不能直接写对象 写对象的话 修改对象属性是不能触发set的



所以出现了一个决绝方案：在计算属性里面return一个代理对象 这个代理对象上面的get set 进行相关操作 这样就可以吧所有属性内聚在代理对象里面



给我一个提示：对象

```
<template>
	<input/  v-model=obj.name>
	...
</template>

<script>
	const obj = computted(()=>{
		return new Proxy(props,()=>P{
			get(){
				...	
                return form[prop]
			}
			set(){
				emit(..)
			}
		})
	})
<script/>

```





### 指令

指令是带有 `v-` 前缀的特殊 attribute，用于操控 DOM 或响应式数据变化。

##### 自定义指令的生命周期函数有哪些

```vue
    const color = binding.arg; // 'primary'
    const isActive = binding.value; // active 的值
    const hasModifier = binding.modifiers.modifier; // true
```

1. `beforeMount`：指令绑定的元素被插入父节点之前调用（仅一次）。
2. `mounted`：元素挂载到 DOM 后调用（仅一次）。
3. `beforeUpdate`：元素所在组件更新前调用（可能多次触发）。
4. `updated`：元素所在组件更新完成后调用（可能多次触发）。
5. `beforeUnmount`：元素卸载前调用（仅一次）。
6. `unmounted`：元素卸载后调用（仅一次）。

自定义指令实现图片懒加载：监视当前元素和可视区域的距离

监视元素是否进入视口可以使用intersectionObserver 以及getBoundingRect 前者性能更好 不阻塞主线程 后者兼容性比较好 但是频繁触发

```javascript
// directives/lazy.js
   const observer = new IntersectionObserver((entries) => {
      // entries是被观察的元素集合
      entries.forEach(entry => {
        // 判断元素是否进入视口
        if (entry.isIntersecting) {
          // 进入视口后，将图片的src属性设置为真实URL
          el.src = imgUrl;
          
          // 图片加载成功后，添加动画效果（可选）
          el.classList.add('fade-in');
          
          // 停止观察该元素，避免重复加载
          observer.unobserve(el);
        }
      });
    });

export const lazy = {
  // 指令的生命周期钩子：元素被插入到DOM时
  mounted(el, binding) {
    // 获取图片URL（从指令参数获取）
    const imgUrl = binding.value;
    // 开始观察元素
    observer.observe(el);
    // 保存observer实例到元素上，方便后续销毁
    el.__lazyObserver__ = observer;
  },
  
  // 指令的生命周期钩子：元素从DOM中移除时
  unmounted(el) {
    // 销毁observer实例，避免内存泄漏
    el.__lazyObserver__?.unobserve(el);
  }
};
```

概括虚拟列表的实现：页面上有一个container 里面会盛放很多内容 在这个指令内部 重新创建一个新的容器 在这个新的容器里面添加需要展示的内容 

更新这个容器里面的内容的操作封装成一个update函数 在初始化 以及滚动事件触发的时候 将会调用这个更新函数

```javascript
// 虚拟滚动指令：让长列表滚动变流畅的"魔法咒语"
export const virtualScroll = {
  // 当指令绑定到元素时（比如div被插入到页面）
  mounted(el, binding) {
    // 从指令参数中获取配置（比如数据、每项高度）
    const { value: options } = binding;
    
    // 保存状态到元素上（就像在元素上贴标签记录信息）
    el.__virtualScrollState__ = {
      data: options.data || [],        // 列表数据
      itemHeight: options.itemHeight || 30, // 每个列表项的高度（像素）
      bufferSize: options.bufferSize || 5,  // 提前加载的额外行数（避免滚动时空白）
      startIndex: 0,                    // 可见区域的起始索引
      endIndex: 0                       // 可见区域的结束索引
    };
    
    // 创建一个容器来装列表项
    const contentEl = document.createElement('div');
    contentEl.className = 'virtual-scroll-content';
    contentEl.style.position = 'relative';
    el.__virtualScrollContentEl__ = contentEl;
    
    // 把原来的列表项移动到新容器里
    while (el.firstChild) {
      contentEl.appendChild(el.firstChild);
    }
    el.appendChild(contentEl);
    
    // 设置容器为可滚动
    el.style.overflow = 'auto';
    
    // 第一次计算并显示可见项
    updateVisibleItems(el);
    
    // 监听滚动事件，滚动时重新计算可见项
    el.addEventListener('scroll', () => updateVisibleItems(el));
    window.addEventListener('resize', () => updateVisibleItems(el));
  },
  
  // 当列表数据更新时
  updated(el, binding) {
    // 更新数据并重新计算可见项
    const { value: options } = binding;
    el.__virtualScrollState__.data = options.data || [];
    updateVisibleItems(el);
  },
  
  // 当元素被移除时
  unmounted(el) {
    // 清理事件，避免内存泄漏
    el.removeEventListener('scroll', () => updateVisibleItems(el));
    window.removeEventListener('resize', () => updateVisibleItems(el));
    delete el.__virtualScrollState__;
    delete el.__virtualScrollContentEl__;
  }
};

// 计算并更新可见项的函数
function updateVisibleItems(el) {
  const state = el.__virtualScrollState__;
  const contentEl = el.__virtualScrollContentEl__;
  
  // 获取容器高度（用户能看到的区域高度）
  const containerHeight = el.clientHeight;
  
  // 计算能看到多少行（比如容器高400px，每项40px，能看到10行）
  const visibleCount = Math.ceil(containerHeight / state.itemHeight);
  
  // 计算滚动位置对应的起始行（考虑提前加载5行，避免滚动时空白）
  const scrollTop = el.scrollTop;
  const startIndex = Math.max(0, Math.floor(scrollTop / state.itemHeight) - state.bufferSize);
  
  // 计算结束行（起始行+可见行数+提前加载的行数）
  const endIndex = Math.min(
    state.data.length - 1,
    startIndex + visibleCount + state.bufferSize * 2
  );
  
  // 更新状态
  state.startIndex = startIndex;
  state.endIndex = endIndex;
  
  // 只取需要显示的数据（可见区域+提前加载的部分）
  const visibleItems = state.data.slice(startIndex, endIndex + 1);
  
  // 计算顶部和底部的空白高度（让滚动条位置正确）
  const paddingTop = startIndex * state.itemHeight;
  const paddingBottom = (state.data.length - endIndex - 1) * s】=6trzaQEEtate.itemHeight;
  
  // 设置空白高度（就像在可见区域上下垫上空白纸）
  contentEl.style.paddingTop = `${paddingTop}px`;
  contentEl.style.paddingBottom = `${paddingBottom}px`;
  
  // 通知组件更新可见项（触发自定义事件）
  const event = new CustomEvent('virtual-scroll-update', {
    detail: { visibleItems, startIndex }
  });
  el.dispatchEvent(event);
}
```



##### v-model的原理

：`v-model` 是 `v-bind` 和 `v-on` 的语法糖

##### **何时使用自定义指令？举例说明实际场景。**



- **DOM 操作封装**：如点击 outside 事件（`v-click-outside`）、拖拽指令（`v-draggable`）。
- **性能优化**：如图片懒加载（`v-lazy`）、长列表虚拟滚动指令。
- **权限控制**：根据用户角色动态隐藏元素（`v-permission`）。



##### v-once

应用这个指令的节点只会渲染一次 可以用于性能提升  这是因为编译器会把应用这个指令的dom元素作为一个常量 提升到渲染函数之外 

由于这个特性 应用了这个指令的元素被卸载之后 再挂载的时候 不需要重新创建dom节点 

而且 如果使用v-for渲染列表 假设在渲染的元素上添加v-once 这个v-onde经过编译会被提升到外层元素上（如果外层元素是静态节点的话）

但是在动态节点上面应用这个命令会导致动态节点变成静态节点 这不是想要的

所以vue3.2增加了vue-memo指令 用于指定依赖列表 仅当以来列表里面的元素变化的时候 才会重新渲染

##### v-if 和v-for的优先级谁更高？

对于一个同时使用这两个指令的节点 经过编译之后的结果 外层将会被执行列表渲染的函数包裹 函数内部的节点会根据条件判断决定渲染 所以列表渲染的优先级更高

在源码的codegen模块里面 明确列出了指令的优先级：静态节点>绑定的非响应式数据节点>列表循环>if判断>template>slot

这将会导致先执行循环再多次判断 

假设要根据条件判断需不需要列表渲染 应该在外层包裹template标签 在这个标签上判断

假设要根据条件判断某个列表渲染项要不要渲染 应该使用计算属性得到一个新的数据

#### **如何优化大量使用 `v-for` 的列表性能**

1. **正确使用 `key`**：提高dom元素的重用率 避免销毁重建
2. **虚拟列表（Virtual Scrolling）**：仅渲染可见区域内的元素（如 `vue-virtual-scroller` 库）。 这个实现是：外层container高度固定 内层container高度根据数据的数量固定 再内层的contain根据要渲染的数据数量确定高度 下面添加一个空白的占位元素撑开高度（没有也可以啦） 修改要渲染的元素来实现虚拟滚动 每次向下滑动的时候 计算这次的底部和上次的底部的距离 计算要往列表里面添加几个元素 
3. **事件代理**：将事件监听器绑定到父节点，减少 DOM 事件句柄数量。
4. **`v-for` 与 `v-if` 分离**：先过滤数据再循环，避免无效渲染。
5. **`will-change` 或 `transform` 优化**：对动画元素使用硬件加速。

### diff

##### key的原理和作用

key可以用在组件上 作为一个特殊的标志 也可以用在列表渲染的列表项上 用于标志列表项的身份 

使用在组件上的时候 是因为假设一个组件前后更新的时候如果处于组件树的相同位置 那么vue会认为这是同一个组件 因此不会触发过渡效果 但是如果使用不同的key 就可以告诉vue这是两个不一样的组件 就可以触发过渡 

另外 在vue更新dom的diff算法里面 vue首先通过双端对比算法锁定发生更新的区域 这个过程对比两端元素的时候 假设存在key 就可以直接通过key进行对比 而省略之后的递归对比 

在锁定发生更新的区域之后 为了减少dom开销 vue会尽量复用之前的dom元素并且把对dom元素位置操作的次数降低 此时vue会根据key生成一个最大稳定子序列 并且根据key判断元素是否需要新增 或者删除  

如果没有key vue将会采取一种简单但是低效的方式：就地复用 把元素的索引作为key 不进行跨位置比较 只比较相同位置的元素租不租要更新 只要元素的类型相同 就复用这个元素 假设由于新增或者删除导致元素顺序混乱并且元素上面还绑定了状态或者事件 将会导致状态错乱





##### 怎么理解diff算法

diff算法可以分成三个维度：diff的目的 执行diff的时机 diff的实现

1. 实现diff算法是因为在vue这样使用虚拟dom的声明式框架中 在更新的时候 框架并不能确定发生更新的位置到底在哪里 为了提升更新效率 需要进行对比并且找到最小更新范围 避免直接操作真实 DOM 的高开销；
2. vue会在更新组件的时候diff：对比新旧虚拟节点树 这个过程叫patch
3. diff遵循的策略是深度优先 同层比较 。这是因为虚拟dom可以抽象成树结构 而diff算法就是遵循深度优先策略 只在相同层级进行对比 。当两个节点的子节点进行对比的时候 当前后的子节点类型都是数组 将会使用diff算法锁定最小的更新区域



### 设计概念

##### AST

源代码的抽象语法结构的树状表示 这个树里面的节点代表的是源代码里的一种结构 不依赖于具体的语法 而是关注语法结构 逻辑关系 

作用：

1. 编译、转译：也就是把template转译成render函数 或者高版本转成低版本
2. 代码分析优化：ESLint就是通过AST检测代码结构 webpack使用AST分析模块结构
3. 代码生成转换：低代码平台

流程：

1. Parsing

   1. 词法分析（字符串=》词法单元tokens）+语法分析 (词法单元转换成AST节点)

2. 转换

   1. 遍历AST 修改或者生成新的节点

3. codegen：AST转换成代码

   1. 递归AST 把节点转换成代码片段

   2. 处理节点之间的逻辑关系 生成可执行代码

##### vue里面的设计模式

* 单例模式：vuex里面的store 确保一个类只有一个实例 并且提供一个全局访问点来访问这个实例 
* 工厂模式：createElement 创建逻辑 使用逻辑分离 把复杂·的创建逻辑打包好 用户只需要关注使用
* 发布订阅：事件绑定 用户通过交互 发布一个事件 元素订阅这个事件 触发对应的回调函数 
* 观察者：watcher 不需要手动触发
* 代理
* 装饰
* 中介者
* 策略
* 外观

##### 对生命周期的理解

生命周期就是vue组件从创建到销毁的整个过程 包含初始化 挂载更新 销毁等关键阶段 。vue通过生命周期函数 允许开发者在不同的阶段进行不同的操作。

生命周期的重要性体现在对于vue这样的声明式框架中 由于dom的插入和销毁是交给框架完成的 所以对于开发者而言不可能准确的知道什么时候组件进展到什么状态 而有一些操作却是和组件的状态紧密相关的 比如对dom的操作必须要在dom挂载到页面上的时候才能进行。所以框架内部区分了不同的阶段 并且允开发者在适合的阶段插入一个函数 

vue3的生命周期有setup 

beforeMount 可以在挂载之间检查数据 

 Mounted  操作dom

beforeUpdate；可以捕获旧的dom状态/执行计算决定是否应用更新  在这个生命周期里面修改数据 可能会导致触发新的更新 进而无限循环 

 updated：访问更新之后的dom元素 执行依赖于视图的副作用 在这个生命周期里面修改数据会再次触发更新进而导致无限循环 需要使用条件判断或者nextTick控制 

 beforUmount 可以清理副作用

 unmounted

setup函数完成的是组件状态的初始化 也就是 初始化了props context 所以此时可以访问props context 不能访问this 很多回答都是因为组件实例没有完全创建 所以不能访问组件实例  但是实际上是实例化的过程里面 this是可以访问的 所以setup布恩那个访问this并不是因为没有完成实例化 而是因为setup作为一个函数 他接受的参数并没有this 或者说组件实例 所以当然不能访问 

之所以参数不传递this 是因为 组件实例没有创建完全 所以有一些属性访问不到 

而且vue3设计组合式api 就是为了实现解耦 把相关的逻辑封装到独立的函数里面 如果setup里面依赖了组件实例 那么组件实例和逻辑可能会强耦合 这样不利于类型推导 单元测试 

不过可以通过显式依赖注入传递props context（里面包含attrs slotrs emit）



使用生命周期也有一些注意事项：比如不应该在生命周期中的beforUpdate里面进行数据更新 否则可能会导致无限循环 



(忽然想起来的一个问题 mini-vue里面模版为什么可以访问到响应式数据？ 这是因为组件函数里面将会创建响应式数据 返回模版 这个模版是一个对象)

你他妈说什么鬼话 组件实例上面有变量有render函数 render函数想访问变量还不简单？

```
function compo(){
	let a = 1
	return {
		type:'div'
		children:[a]
	}
}

function render(componennt,props){
	const compo = component(props)
	const div = createElement(compo.type)
	for(...遍历子节点){
		如果是对象
		如果是字符串 
		由于变量a保存的实际上还是字符串 所以走到字符串的逻辑里面
	}
}
```







##### 对MVVM MVC的理解

MVC最初是应用在后端 他指的是model数据层 view视图层 controler控制器 。这个设计模式是为了吧应用的逻辑层解耦。视图层负责单纯的渲染逻辑 控制器负责单纯的数据修改逻辑 模型层管理数据

当需要修改数据的时候 控制器发送请求到模型层 膜形成数据修改之后通知视图层 视图层重新渲染

但是随着应用发展 视图层的交互增对 此时视图层还需要处理交互 通知控制器 控制器修改模型层 模型层修改数据再去重新渲染视图 导致控制器里面的逻辑越来越繁琐 视图层和控制器层耦合度高。

为了改善这个问题 现代的前端框架采用MVVM模型 把控制器层替换成视图模型层 

相较于传统控制器的单向绑定 视图模型实现的是双向绑定 ：当数据层里面数据改变 vue将会追踪这个数据的副作用函数并且运行 假设这个副作用函数是渲染函数 那么将会引起视图层的更新。假设视图层的交互引起数据改变，vm将会监听到交互事件 并且执行数据层更新 ，并且vm层还封装了高度优化的dom操作 来提升视图层性能 

通过这样的方式 实现了视图和逻辑的解耦  节省了大量代码



##### vue3组件式api有什么优势？

1. 对于vue2的选项式api 在编写复杂的逻辑的时候需要反复滚动代码 修改data method watch等属性

2. vue2里面很多属性都是通过this访问的 但是this会出现ts类型提示不友好 箭头函数里面this丢失的问题

3. v**ue2里面没有使用的方法和属性依旧会打包** 而组件式api支持tree-shaking 减小打包体积

4. **组件式api提取公共逻辑很方便** 而vue2实现公共逻辑使用混入会导致数据来源不明确的问题





##### 怎么理解组件化  组件怎么实现

```
首先 有两种组件定义的方式 全局组件 单文件组件 
全局组件是通过app.componnet进行注册的
在这个函数内部 将会把传入的组件的配置项合并到VueComponnet的配置里面
function extend(options) {
  class VueComponent extends Vue {
    constructor(props) {
      super(props);
      // 初始化组件实例
    }
  }
  return VueComponent;
}
VueComponent.options = mergeOptions(
  Vue.options,  // 基类全局选项（如全局组件/指令）
  options       // 当前组件的私有选项
);

对于局部组件 实际上就是单文件组件 也就是一个vue文件 这里面的内容实际上是一个组件的配置对象 最终将会导出一个js对象
```



vue通过单文件组件实现了组件系统 核心在于通过单文件里面的配置项得到一个组件对象 在vue中 组件可以分成全局组件 局部组件 全部组件是通过app上面的component函数把组件配置合并到VueComponent这个类的配置上实现的 局部组件则是通过createComponentinstance函数创建组件实例。

组件化的设计思想是把ui拆分成独立的 可以复用的 高内聚低耦合的功能模块  来实现

1. 复用性：减少重复代码 
2. 可维护性：组件之间不会影响 
3. 可测试：组件可以独立测试 便于编写单元测试 

为了实现组件化 需要实现封装性：组件的内部细节不对外开放 样式仅作用于自己 组件内部的状态交给组件自己维护 每个组件拥有自己独立的生命周期  常用的组件技术有：props组件传参 插槽 等 这些机制确保了组件保持封装性的同时可以更加灵活。



### 源码

##### vue的编译优化机制是怎么工作的

Vue3 的编译过程分为三个主要阶段：

1. **解析（Parse）**：将模板字符串转换为抽象语法树（AST）。
2. **转换（Transform）**：对 AST 进行优化标记（如静态节点、区块等）。
3. **生成（Generate）**：将优化后的 AST 转换为渲染函数代码。

在生成的时候 会进行

静态节点提升：把静态节点提升到渲染函数外部 避免重建

```javascript
// 静态节点被提升到渲染函数外部
const _hoisted_1 = createVNode("h1", null, "标题");

// 渲染函数只处理动态部分
render() {
  return (
    createVNode("div", null, [
      _hoisted_1, // 直接复用静态 VNode
      createVNode("p", null, this.message)
    ])
  );
}
```



区块化：把动态节点和子节点划分成区块 减少虚拟dom比较范围 （createBlock函数），为子节点添加patchFlag标记 只是具体需要对比的属性类型 

```javascript
render() {
  return (
    createBlock("div", null, [
      // PatchFlag = 1 表示只需要比对文本内容
      createVNode("p", null, this.message, 1 /* TEXT */),
      // PatchFlag = 2 表示只需要比对 class
      createVNode("p", null, "内容", 2 /* CLASS */)
    ])
  );
}
```



缓存事件处理函数：使用cache数组缓存内联事件处理函数  避免在每次重新渲染的时候重建处理函数 

```javascript
render() {
  return (
    createVNode("button", {
      onClick: cache[0] || (cache[0] = ($event) => (this.count++))
    }, "点击")
  );
}
```



静态内容预渲染：完全静态模版直接生成纯HTML字符串 跳过虚拟dom阶段 

```javascript
render() {
  return "<!--v-pre--> <div>纯静态内容</div> <!--v-pre-->";
}
```



##### watch watchEffect computed 

这几个都是监听 

前两个是数据修改的时候执行回调函数 后者是数据改变执行回调函数赋值给一个ref变量

要知道vue的响应式收集 其实就是effect收集了运行的函数 通过proxy拦截读取操作 把这个运行函数放进变量的dep里面

所以以上三种函数 其实就是=》运行一个函数 放进对应变量的dep里面 

但是对于watch里面 他的数据源是指定的 而不是依赖于这个函数的运行过程里面 读取了什么函数 、

所以在watch里面 需要把一个控制当前是否收集副作用函数的标志关掉 

然后手动便利传递进来的依赖 添加依赖 当然需要注意配置项 然后来决定初次渲染的时候需不需要执行函数 或者需不需要深度监听

watchEffect就简单很多 执行回调函数 effect会自动收集到

computed有一个特点：懒加载 缓存 不过他的基础功能还是监听一系列变量 所以这里的思路就是=》首先创建一个ref变量 当这个ref对象value属性的get陷阱触发的时候 执行一个回调函数 在这个回调函数里面 我们要做的是：判断当前是使用缓存 还是需要再次执行函数=》这是用一个dirty变量标志的 初始值肯定是false 当函数执行之后 需要设置成true 但是当依赖的变量修改的时候 需要设置成false 这个是通过=>副作用函数的effect属性实现的

```react
class computedVal{
	constructor(getter){
		this._dirty = false
		this._getter = gettter
		this._refObj = ref(null)
        //第二个函数 schelduler 当getter里面的变量修改的似乎后 存在schelduler就运行这个函数 否则就执行getter函数                                                                                          //Effect这个class接受三个参数 getter schelduler lazy
        //返回一个对象 对象上面有run 调用运行getter
        //这个对象会进入依赖池
        //setter触发调用依赖的时候 先判断有没有schelduler
        //在这个Effect里面 lazy为真 将不会运行getter
        //为假的时候将会运行一遍 也就是调用run
        //在run方法内部 会先把actiiveEffect赋值为当前这个对象 运行完毕置空
		this._effect = new Effect(getter,()=>{
			if(this._dirty){
				this._dirty = false
			}
            //
		},true)
	}
	get value(){
		tarck()//收集这个computed的副作用函数 
		if(!this.dirty){
			this.val = this._effect.run()
			this._dirty = true
		}
		return this.val	}
	
}
function computed(getter){
	//可能还有setter
	return new computedVal(getter)
	
}
```



##### nextTick的原理

这个函数用于在dom完成更新之后执行回调函数 多次调用将会合并

在浏览器的时间循环模型里面 清空微任务队列会在进行渲染之前进行 vue正是利用这个特性 把进行页面更新的任务放进微任务中 保证在渲染前完成更新

所以vue就是通过任务队列实现nextTick的：把回调函数添加到队列的末尾(之前的一个疑问：既然是把回调函数添加到末尾 那不还是在微任务阶段执行 那就是还没有渲染 是怎么获取更新的结果的 这是因为 真实dom更新发生在渲染之前 回调函数运行的时候 真实dom已经更新了 只不过没有反应到页面上 )

添加的方式有：MutationObserver,SetImediate,messageChanel,setTimeout



```javascript
export function nextTick<T = void>(
  this: T,
  fn?: (this: T) => void
): Promise<void> {
  // 获取当前的刷新 Promise（即队列                        刷新的微任务）
  const p = currentFlushPromise || Promise.resolve();
  // 如果传入了回调函数，将其添加到微任务中执行
  return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
```

```javascript
// 存储 DOM 更新任务的队列
const queue = [];
// 标记是否正在刷新队列
let isFlushing = false;
// 当前刷新 Promise
let currentFlushPromise = null;

// 将回调添加到微任务队列，确保在 DOM 更新后执行
export function nextTick(fn) {
  // 如果队列正在刷新，使用当前的 Promise
  // 否则创建一个新的 Promise
  const p = currentFlushPromise || Promise.resolve();
  
  // 返回 Promise，将回调添加到微任务队列
  return fn ? p.then(fn) : p;
}

// 调度队列刷新（实际源码中更复杂）
function queueFlush() {
  if (!isFlushing) {    isFlushing = true;
    // 使用 Promise.then 将刷新任务添加到微任务队列
    currentFlushPromise = Promise.resolve().then(flushJobs);
  }
}

// 执行队列中的所有任务（更新 DOM）
function flushJobs() {
  try {
    // 执行所有 DOM 更新任务
    queue.forEach(job => job());
  } finally {
    // 重置状态
    queue.length = 0;
    isFlushing = false;
    currentFlushPromise = null;
  }
}

// 当响应式数据变化时，Vue 会调用此函数将更新任务加入队列
export function queueJob(job) {
  queue.push(job);
  queueFlush();
}
```

响应式数据修改的时候 会生成一个修改真实dom的job，然后使用queueJob函数将这个任务推入微队列

在这个函数内部 首先将job推入dom更新函数队列

然后调用queFlush 判断当前是不是有等待执行的dom队列 假设没有 就把flushJobs推入微队列 之后每次响应式数据修改了 又会生成一个新的job加入queue 最终同步代码执行完成 将会调用微任务队列 也就是flushJobs函数 在这个函数内部根据优先级执行dom更新 而nexttick就是这个微任务执行成功之后执行 这样就实现了nextTick必然在dom更新之后执行

（这里需要明确一点 同步代码=》形成调用栈 调用栈会影响微任务的执行 因为事件循环的安排是：当调用栈为空 执行微任务队列 清空微任务队列之后 执行一个宏任务）



注意：

```vue
mounted(){
	this.$nextTick(()=>{
		console.log(document.getElementById('counter').innerHTML)
	})
	this.count = 100
}
```

nextTick本身并不是异步的 否则这里的输出结果应该是100 但是这里的结果是初始值 当nextTick在赋值之后执行 就是100



##### setup和普通模式的区别

* 样板内容少 代码简洁（使用普通的script标签时 需要明确的定义setup函数 并且return数据 方法）
* 可以使用纯的TypeScript声明props和自定义事件（可以直接使用ts的语法声明props 和emits 不需要使用vue的defineprops defineEmits）
* 更好的运行时性能（**将 `<script setup>` 中的代码编译成渲染函数的一部分 这意味着模板里面的变量和函数可以直接访问 而不需要通过this或者上下文代理对象进行访问 而普通组件渲染函数访问数据需要通过上下文对象**）
* 更高的IDE类型推导性能（可以根据ts直接推导 不需解析vue的defineprops这样的宏）







##### 为什么vue2的template里面只能有一个虚拟节点 而vue3没有这个限制

1. 因为vue2组件需要一个唯一的根节点 作为组件的挂载锚点$el，而vue3引入虚拟节点类型Fragment作为逻辑容器，当组件模版里面有多个根节点的时候 ，会使用这个容器包裹多个根节点
2. vue2通过单一根节点维护组件的依赖收集路径，每个根节点会创建独立的渲染上下文，所以如果存在多个根节点那么模板里面数据的访问可能不在同一个watcher上下文中，而vue3基于proxy的响应式不依赖于组件树层级，通过effct作用域把所有模板内容包裹在同一个setup里面执行。
3. vue2使用Object.defineProperty实现响应式 使用Watcher实现依赖收集 ，而vue2为了降低watcher的粒度 一个组件里面只有一个watcher，watcher将会追踪响应式数据的依赖关系 但是假设存在多个根节点 那么这些根节点会被视作独立的上下文 ，可是一个watcher只能追踪一个上下文 这就导致了无法正确追踪依赖关系
4. 而vue3使用proxy重构了响应式系统 依赖手机由effect作用域统一管理 （组件的setup函数 模版渲染逻辑处于同一个effect作用域 不管模版多复杂 所有数据都会被追踪） 不再依赖于组件树层级 



##### template是怎么转换成render函数的

1. 把template里面的内容转换成AST：先进行词法分析 把字符串分割成token 然后进行语法分析 根据token构件AST
2. 对静态的节点和属性进行提升，缓存不依赖于上下文的时间处理函数 
3. 将 AST 节点转换为 `h()` 函数调用（Vue3 中为 `createVNode`）。





##### vue3组件通信的方式

1. props 父子组件传递参数
2. emit 子组件向父组件传递参数
3. pinia vuex 全局状态 
4. provide inject 跨层级数据 

##### proxy相较于Object.defineProperty

1. 劫持方面：由于在vue2里面 在created之前 vue2使用了Observe讲对象变成一个响应式对象 并且这个响应式 使用的是Object.defineProperty ,针对的是属性的响应 所以在之后的操作里面 给对象新增的属性是不具有响应式的
2. 性能方面：Object.defienProperty需要对对象的属性进行深层遍历 重写属性 开销更大
3. 

### 使用以及优化

##### 对spa的理

**只有一个html页面 并且提供一个挂载点 通过引入对应资源 监听路由变换 渲染对应的页面 就是客户端渲染**  

**每个页面都有自己的html js css文件 客户端直接从服务器请求渲染好的html文件就是mapspa由主页面和页面组件组成，mpa由多个完整的页面组成**

1. spa局部刷新 mpa整页刷新
2. spa无法实现seo优化
3. spa页面切换快 mpa每次都要重新加载资源
4. spa组件化的特点使得其更好维护
5. spa受屏渲染慢

怎么解决spa首屏加载慢 不能seo？

静态页面预渲染ssg：在构建的时候生成完整的HTmL页面 保存这个页面

首屏采用服务端渲染 nuxt





##### 函数式组件的优势

| **特性**             | **普通组件（有状态组件）**           | **函数式组件**                     |
| -------------------- | ------------------------------------ | ---------------------------------- |
| **定义方式**         | 对象形式（`export default { ... }`） | 纯函数（接收 props 返回 VNode）    |
| **内部状态（data）** | 支持（响应式数据、生命周期钩子）     | 不支持（无状态，无生命周期）       |
| **this 上下文**      | 有（指向组件实例）                   | 无（纯函数，无实例）               |
| **渲染方式**         | 编译为渲染函数，支持缓存             | 直接返回 VNode，无缓存（默认）     |
| **性能开销**         | 较高（需要创建组件实例）             | 较低（无实例创建，轻量）           |
| **适用场景**         | 复杂交互、状态管理、生命周期逻辑     | 纯展示组件、高阶组件、性能敏感场景 |

**函数式组件不会被记录在组件树里面** vue2里面函数式组件不需要实例化 vue3里面所有组件都不是new创建的，所以vue3里面函数式组件和普通组件的区别不大了        ****

对于没有内部状态的组件 高阶组件 （返回一个新组件的函数 是一个组件的工厂函数 可以处理错误情况 性能优化 验证权限） 性能敏感 可以使用函数组件





##### 使用异步组件的好处

* 实现按需加载：这里说的并不是在应用里面使用了组件组件代码才会加载并且运行 而是说：异步组件打包的时候会被分成一个单独的chunk 避免所有代码都一次性加载到主包里面 
* 由于异步组件可能加载的慢 或者出错误 所以需要loading error组件 这两个组件需要同步导入

##### vue怎么实现权限管理? 

1. 基于角色的访问控制 ：将用户分配到角色（如管理员、普通用户），角色关联权限规则。
   1. 在前端硬编码角色与权限的映射关系。

   2. 用户登录后，从服务端获取角色和权限列表。

2. 基于资源的访问控制：不仅考虑角色，还结合资源属性、环境条件等动态判断权限。
   1. 使用自定义指令或者高阶组件控制dom渲染 
   2. 权限控制组件：在组件内部封装权限判断逻辑 决定是否渲染插槽

3. 路由权限控制：在路由跳转之前验证权限
   1. 全局路由守卫：在路由跳转之前验证权限 通过则放行 不通过则重定向
   2. 路由配置meta标识是否需要权限

4. 菜单权限控制 
   1. 根据用户权限过滤菜单 

   2. 服务端动态生成菜单

5. 数据级权限控制·
   1. 前端传递用户身份，后端根据权限返回数据。



##### unref和toValue的区别

toValue可以处理getter函数

##### 异步组件的加载策略

* 默认策略
* 延迟激活 首屏但是不重要的
* 条件激活
* 可视区域激活（v-intersect）  hydrateOnVisible
* 空闲时激活hydrateOnIdle
* 媒体查询激活hydrateOnMediaQuery‘
* 进行特定交互的时候激活hydrateOnInteraction

##### 组合函数的限制

组合函数作为一种逻辑复用策略 可以在里面调用生命周期

正是因为这个特性 使得组合式函数和组件实例是紧密耦合的 所以 只能在setup里面被同步调用 或者在生命周期函数被调用

在<script setup> 里面 调用await之后 任然可以使用组合式函数 这是因为 对于其他的setup函数 **无法确定在await暂停期间 组件实例是不是已经被销毁了 若是组件实例被销毁 自然也无法再进行更新**  而对于<script setup>  **vue的编译器会确定在await执行期间 组件实例不会被销毁**

而且在<script setup>里面可以直接使用await 这是因为在编译之后 这里面的代码会被包裹在一个异步函数里面

##### 怎样监听vuex里面的数据变化

1. 由于vuex里面的数据都是响应式数据 所以可以通过watch watchEffect实现数据监听
2. 可以通过vuex提供的store.subscribe监控状态的变化 这个api的本质是事件订阅发布 在通过action提交修改的时候会调用订阅的函数

#### vue项目里面的错误怎样处理？

1. **errorCaptured钩子**：捕获来自后代组件的错误  并且错误会一直上抛 如果这个函数返回false会阻断传播
2. 全局错误处理：**配置Vue.config.errorHandle**r
3. 接口异常处理：**配置响应拦截器**

##### vue性能优化方法

1. 渲染性能
   1. 对于长列表 可以采用虚拟滚动 可以减轻渲染压力 对于数据确定不会发生改变的列表 使用Object.freeze冻结对象  在更新的时候将会跳过对这部分虚拟节点的对比
   2. 对于经常切换的节点使用v-show 代替v-if
   3. 对于长列表 可以采用虚拟滚动 可以减轻渲染压力 对于数据确定不会发生改变的列表 使用Object.freeze冻结对象  在更新的时候将会跳过对这部分虚拟节点的对比
2. 首屏渲染提升
   1. 首屏可以使用服务端渲染 或者ssg提升渲染速度
   2. 首屏资源不重要的部分 例如广告 可以针对这部分资源配置激活策略 比如延迟两秒激活
3. 打包体积优化 
   1. 对于一些不关键的组件和资源使用懒加载 第三方组件采用按需引入  减小打包的体积  



### vue3.5

##### vue3新特性

1. 虚拟dom重写：添加shapeFlags标记子节点类型，可以在虚拟dom渲染的时候快速判断节点类型 这是因为shapeFlags使用的是位运算 这种运算的速度非常快 并且可以表示多种特征
2. 优化slots生成：插槽的数据结构从数组变成对象 在生成插槽的函数里面传递了父组件实例 确保正确的依赖关系
3. 静态树提升：把静态节点保存起来在render函数里面直接使用 下次更新的时候也可以直接使用 在vue2里面静态节点会使用staticRender进行渲染 静态属性提升：不会改变的静态属性会缓存在render函数外部
4. 基于proxy：可以使用相同的方式处理数组和对象 不需要遍历对象的属性 实例初始化速度提升 并且节省一般的内存开销。而且由于使用proxy重构响应式系统 可以确保模版里面的每个依赖都被正确追踪 从而实现vue2只能有一个根节点到vue3根节点数量不会受到限制的改变
5. 支持tree-shaking vue3采用esModule的形式 所有功能均为esModule 从而可以移除没有引用的代码
6. ts重写 提供更好的类型支持和类型推导
7. 跨平台：核心层和平台层解耦  核心层负责根据虚拟dom生成更新之后的dom树 而平台层则基于核心层产生的dom树来渲染虚拟dom



#### vue3.5

原来的watch监听数据源如果是一个响应式对象的话 会自动开启深度监听 返回一个响应式对象的getter函数则不会 需要手动配置deep：true 在3.5版本里面 **这个deep可以是一个数字 表示最大便利深度·**

如果在watch watchEffect里面执行了副作用操作 那么可能需要清理副作用 比如进行异步请求的时候

```javascript
watch(id, (newId) => {
  fetch(`/api/${newId}`).then(() => {
    // 回调逻辑
  })
}) 
```

假设在请求期间数据改变了 应该放弃这个请求 重新发起 

在vue3.5里面 新增onWatcherCleanup函数终止过期请求：

```javascript
import { watch, onWatcherCleanup } from 'vue'

watch(id, (newId) => {
  const controller = new AbortController()

  fetch(`/api/${newId}`, { signal: controller.signal }).then(() => {
    // 回调逻辑
  })

  onWatcherCleanup(() => {
    // 终止过期请求
    controller.abort()
  })
})
```

这个函数执行必须在同步期间执行 比如上述代码then内的代码是异步执行的 就不可以在这里运行

```javascript
watch(id, async (newId) => {
  const controller = new AbortController();
  
  // 1. 同步执行：发起请求并等待
  await fetch(`/api/${newId}`, { signal: controller.signal });
  
  // 2. 异步恢复：此时 Watcher 上下文已丢失
  onWatcherCleanup(() => { // ❌ 错误：无法关联到 Watcher
    controller.abort();
  });
});
```

这是为了Vue能够确定调用上下文 一旦遇到异步 当前执行栈已经退出watcher的同步执行阶段 无法再关联清理函数

```react
function asyncTask() {
  console.log('开始异步任务');
  
  // 1. setTimeout 是异步 API，立即返回
  setTimeout(() => {
    // 3. 回调函数被放入任务队列，等待执行栈清空
    console.log('异步回调执行');
  }, 0);
  
  // 2. 同步代码继续执行，无需等待 setTimeout 回调
  console.log('异步任务发起后，继续执行后续同步代码');
}

asyncTask();
```

1. `asyncTask()` 入栈，打印「开始异步任务」。
2. `setTimeout` 被调用，浏览器注册定时器并立即返回。
3. 打印「异步任务发起后...」，`asyncTask()` 出栈。
4. 当执行栈为空时，事件循环从任务队列取出 `setTimeout` 回调执行。



作为代替 可以使用onCleanup作为第三个参数 通过函数参数传递的onCleanUp不受同步的限制

```java
watch(id, (newId, oldId, onCleanup) => {
  // ...
  onCleanup(() => {
    // 清理逻辑
  })
})

watchEffect((onCleanup) => {
  // ...
  onCleanup(() => {
    // 清理逻辑
  })
})

```



默认情况下，侦听器回调会在父组件更新 (如有) **之后**、所属组件的 DOM 更新**之前**被调用。**这意味着如果你尝试在侦听器回调中访问所属组件的 DOM，那么 DOM 将处于更新前的状态。**

可以传入配置项：flush：“post”指定后置刷新（watchPostEffect）

也可以创建同步监听器 他在vue进行任何更新之前触发

但是同步监听不进行批处理(因为是数据变更之后 立即执行)

在 `setup()` 或 `<script setup>` 中用同步语句创建的侦听器，会自动绑定到宿主组件实例上，并且会在宿主组件卸载时自动停止。

要手动停止一个侦听器，请调用 `watch` 或 `watchEffect` 返回的函数：

##### 模板引用

在以前的版本可以使用ref获取元素 但是 template因为并不会被实际渲染出来 所以获取不到

在3.5有一个新的api来获取template：[`useTemplateRef()`]

并且在新版本里面 可以收集列表渲染的值：

```vue
<script setup>
import { ref, useTemplateRef, onMounted } from 'vue'

const list = ref([
  /* ... */
])

const itemRefs = useTemplateRef('items')

onMounted(() => console.log(itemRefs.value))
</script>

<template>
  <ul>
    <li v-for="item in list" ref="items">
      {{ item }}
    </li>
  </ul>
</template>
```

会收集到数组

之前的版本初始值一般是null

```vue
<script setup>
import { ref, onMounted } from 'vue'

// 声明一个 ref 来存放该元素的引用
// 必须和模板里的 ref 同名
const input = ref(null)

onMounted(() => {
  input.value.focus()
})
</script>

<template>
  <input ref="input" />
</template>
```

除了使用字符串值作名字，`ref` attribute 还可以绑定为一个函数，会在每次组件更新时都被调用。该函数会收到元素引用作为其第一个参数：

template

```
<input :ref="(el) => { /* 将 el 赋值给一个数据属性或 ref 变量 */ }">
```

注意我们这里需要使用动态的 `:ref` 绑定才能够传入一个函数。当绑定的元素被卸载时，函数也会被调用一次，此时的 `el` 参数会是 `null`。你当然也可以绑定一个组件方法而不是内联函数。

ref放在子组件的时候 可以获取组件实例 但是 子组件如果是选项式 可以访问所有的属性 方法 否则是默认私有的 除非使用defineExpose暴露

##### 响应式props解构

```javascript
const { foo } = defineProps(['foo'])

watchEffect(() => {
  // 在 3.5 之前只运行一次
  // 在 3.5+ 中在 "foo" prop 变化时重新执行
  console.log(foo)//这个变量在3.5版本会被处理成props.foo
})
```

虽然但是 不能这样子：

```javascript
const { foo } = defineProps(['foo'])

watch(foo, /* ... */)
```

因为这个foo会被编译器处理成props.foo 而这在watch里面只会被当成一个普通值 而不是响应式对象 、

为了保持解构之后的变量的响应性 可以使用getter函数 比如给外部函数传递响应式数据;

```javascript
useComposable(() => foo)
```

##### 组件

1. 全局注册，但并没有被使用的组件无法在生产打包时被自动移除 (也叫“tree-shaking”)。如果你全局注册了一个组件，即使它并没有被实际使用，它仍然会出现在打包后的 JS 文件中。
2. 全局注册在大型项目中使项目的依赖关系变得不那么明确。在父组件中使用子组件时，不太容易定位子组件的实现。和使用过多的全局变量一样，这可能会影响应用长期的可维护性。



##### 双向绑定

3.4新增defineModal宏：

```
const model = defineModel()
```

`defineModel()` 返回的值是一个 ref。它可以像其他 ref 一样被访问以及修改，不过它能起到在父组件和当前变量之间的双向绑定的作用：

- 它的 `.value` 和父组件的 `v-model` 的值同步；
- 当它被子组件变更了，会触发父组件绑定的值一起更新。

`defineModel` 是一个便利宏。编译器将其展开为以下内容：

- 一个名为 `modelValue` 的 prop，本地 ref 的值与其同步；
- 一个名为 `update:modelValue` 的事件，当本地 ref 的值发生变更时触发。



```vue
<!-- Child.vue -->
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <input
    :value="props.modelValue"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>
```

```vue
<!-- Parent.vue -->
<Child
  :modelValue="foo"
  @update:modelValue="$event => (foo = $event)"
/>
```

defineModel可以接受配置项 配置是否必穿 和默认值 

但是假设父组件传递的是undefined 子组件里面设置默认值 会导致父子组件之间不同步

Vue 2 的用户可能会对 [mixins](https://cn.vuejs.org/api/options-composition.html#mixins) 选项比较熟悉。它也让我们能够把组件逻辑提取到可复用的单元里。然而 mixins 有三个主要的短板：

1. **不清晰的数据来源**：当使用了多个 mixin 时，实例上的数据属性来自哪个 mixin 变得不清晰，这使追溯实现和理解组件行为变得困难。这也是我们推荐在组合式函数中使用 ref + 解构模式的理由：让属性的来源在消费组件时一目了然。
2. **命名空间冲突**：多个来自不同作者的 mixin 可能会注册相同的属性名，造成命名冲突。若使用组合式函数，你可以通过在解构变量时对变量进行重命名来避免相同的键名。
3. **隐式的跨 mixin 交流**：多个 mixin 需要依赖共享的属性名来进行相互作用，这使得它们隐性地耦合在一起。而一个组合式函数的返回值可以作为另一个组合式函数的参数被传入，像普通函数那样。



 



### 状态管理




##### 介绍vuex

vuex是基于vue的状态管理库 他存储数据的核心原理基于单向数据流 响应式系统 发布订阅模式 

Vuex 采用 **单向数据流** 设计，核心结构包括：



- **state**：存储应用状态的响应式对象
- **getters**：类似于计算属性，缓存派生状态
- **mutations**：同步修改 state 的唯一途径
- **actions**：处理异步操作，提交 mutations
- **modules**：将 store 分割为多个模块

```javascript
// 简化版 Store 类（Vuex 5 源码风格）
class Store {
  constructor(options) {
    this._state = new Vue({ data: { state: options.state } }); // 响应式状态
    this._mutations = options.mutations || {};
    this._actions = options.actions || {};
    this._getters = options.getters || {};
    this._modules = new ModuleCollection(options); // 模块化处理
    this._subscribers = []; // 插件订阅者
    
    // 初始化 store
    this._initStore();
  }
  
  // 其他核心方法...
}
```

#### **为什么 Vuex 是一个 Vue 实例？**

Vuex 的 store 本质上是一个特殊的 Vue 实例，它的 state 被定义为这个 Vue 实例的 `data` 属性。而 Vue 的响应式系统会自动将 `data` 中的属性转换为 `getter/setter`，从而实现状态变化的监听。

Pinia 是 Vue 3 官方推荐的状态管理库，它的设计完全抛弃了 “store 是 Vue 实例” 的思路，而是 **基于 Vue 3 的组合式 API（Reactivity API）** 实现响应式状态。

Pinia 的 store 本质上是一个 **函数返回的响应式对象**，通过 `defineStore` 定义，内部使用 Vue 3 的 `reactive`、`computed` 等 API 创建响应式状态和计算属性。

- `defineStore` 返回一个 **store 工厂函数**（如 `useUserStore`），调用后返回 store 实例。
- store 的 state 是通过 `reactive` 创建的响应式对象，getters 是通过 `computed` 创建的计算属性，actions 是普通函数（可同步或异步）。

使用响应式系统实现监听：

```javascript
// src/store.js（简化）
class Store {
  constructor(options) {
    // 使用 Vue 实例包装 state，使其具有响应性
    this._vm = new Vue({
      data: {
        // 使用 $$ 前缀避免被 Vue 代理
        $$state: options.state
      }
    });
    
    // 代理 state 到 store 实例
    Object.defineProperty(this, 'state', {
      get: () => this._vm._data.$$state,
      set: (v) => { throw new Error('不能直接修改 state，使用 mutations') }
    });
  }
}
```



##### pinia

1. **集中管理共享状态**
   - 跨组件、跨页面共享数据（如用户信息、购物车、主题配置等）。
   - 替代传统的 props/emit、事件总线等复杂通信方式。
2. **响应式与可维护性**
   - 基于 Vue 的响应式系统，状态变化自动触发视图更新。
   - 采用模块化设计（Store 模块），逻辑分层清晰，便于维护和扩展。
3. **支持 Vue 3 特性**
   - 原生支持 Composition API，兼容 Options API，写法灵活。
   - 轻量、高性能，体积仅约 1KB（对比 Vuex 约 2KB）。
4. **开发体验友好**
   - 自动生成 TypeScript 类型，避免类型错误。
   - 支持热更新（HMR），开发时修改 Store 无需重启应用。

要实现数据持久化的话 可以使用**`pinia-plugin-persistedstate`**、

```javascript

```

##### 为什么选择pinia 为不是vuex



| **对比维度**        | **Vuex**                                | **Pinia**                                      |
| ------------------- | --------------------------------------- | ---------------------------------------------- |
| **诞生时间**        | 2015 年（Vue 2 时代主力）               | 2020 年（Vue 3 官方推荐新方案）                |
| **API 设计**        | 严格区分 `state/mutations/actions`      | 简化为 `state/actions/getters`，直接修改 state |
| **模块系统**        | 嵌套模块需手动处理命名空间              | 自动命名空间，模块结构更扁平                   |
| **Composition API** | 需额外插件（如 `vuex-composition-api`） | 原生支持，与 Vue 3 语法无缝衔接                |
| **TypeScript 支持** | 需要复杂配置                            | 原生类型推导，零配置支持                       |
| **Bundle 大小**     | ~22KB                                   | ~10KB（更轻量级）                              |
| **插件生态**        | 成熟（如持久化、DevTools）              | 快速发展中（官方插件已覆盖核心需求）           |

pinia的优势：语法简单 action可以直接修改state 设计基于组合式api 和vue3项目风格一致 ts友好 轻量





vuex pinia的使用：

```javascript
//在 Vue 项目中创建一个 store 目录，并在其中创建 index.js 文件，用于配置 Vuex 存储：
// store/index.js
import { createStore } from 'vuex';  // Vue 3
// 或 import Vuex from 'vuex';  // Vue 2

const store = createStore({
  // 状态
  state() {
    return {
      count: 0,
      user: {
        name: '张三',
        age: 25
      }
    };
  },
  
  // 同步修改状态的方法
  mutations: {
    increment(state) {
      state.count++;
    },
    updateUser(state, payload) {
      state.user = { ...state.user, ...payload };
    }
  },
  
  // 异步操作的方法
  actions: {
    incrementAsync({ commit }) {
      setTimeout(() => {
        commit('increment');
      }, 1000);
    },
    fetchUser({ commit }) {
      return fetch('/api/user')
        .then(response => response.json())
        .then(data => {
          commit('updateUser', data);
          return data;
        });
    }
  },
  
  // 计算属性
  getters: {
    doubleCount(state) {
      return state.count * 2;
    },
    isAdult(state) {
      return state.user.age >= 18;
    }
  }
});

export default store;

//在 Vue 应用的入口文件中引入并使用 Vuex 存储：
app.use(store);



```

##### 基于Pinia设计跨模块状态共享方案

1. 领域store划分：拆分成独立store 跨store调用 实现数据联动
2. 全局 局部store划分 集中管理应用级共享状态 （主题 用户认证） 局部状态store管理特定模块的局部状态 （表单数据 分页信息）
3. 分层状态管理 （状态树模式）：构建层次化的状体结构 上层状态可以被下层状态共享
4. 持久化状态共享：把关键状态持久化到本地存储 实现跨会话跨标签页的数据共享 





##### 





##### 怎么解决页面刷新之后vuex数据丢失的问题

会存在这个问题 是因为vuex的状态是存储在内存里面的 内存是和会话绑定的 

1. 请求前检测数据是否存在 不存在的话重新请求拉取数据 存储在vuex
2. 采用持久化插件=>实则就是本地存储











​           

### 路由

##### 有哪些路由导航钩子？怎么使用？

1. 全局钩子：beforeEach ：权限验证 参数校验 显示加载动画 

2. afterEach：记录页面访问日志 埋点统计（收集埋点数据并且发送 例如用户id 来源路径 来源页面 时间） 隐藏加载动画  展示提示信息

3. beforeResolve:全局解析首位 在路由组件被解析后触发 可以用于进行信息的预获取

4. 组件内：beforeRouteEnter 路由级权限认证 路由数据预加载

5. beforRouteUpdate  组件已经挂载并且路由参数变化的时候触发 用于更新数据 避免重新挂载 验证参数合法性 

   ```vue
   export default {
     data() {
       return {
         post: null
       };
     },
     async beforeRouteUpdate(to, from, next) {
       // 仅当 postId 变化时重新获取数据
       if (to.params.postId !== from.params.postId) {
         this.post = await this.fetchPost(to.params.postId);
       }
       next();
     },
     methods: {
       fetchPost(id) {
         return api.get(`/posts/${id}`);
       }
     }
   };
   ```

   

6. beroreRouteLeave 数据没有保存的时候 阻止离开 清理副作用

7. 路由独享首位：定义在路由配置里面 仅对当前路由生效 beforeEnter

```javascript
const routes = [
  {
    path: '/admin',
    component: AdminPanel,
    beforeEnter: (to, from, next) => {
      if (user.isAdmin) {
        next(); // 允许访问
      } else {
        next({ name: 'Forbidden' }); // 拒绝访问，重定向到 403 页面
      }
    }
  }
];
```





##### 哈希模式和历史模式的区别是什么

hash模式使用井号进行分割

​                                                                                                                                                         

| 特性           | Hash 模式 (`/#/`)                                   | History 模式 (`/`)                                           |
| -------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| **URL 格式**   | 使用 `#` 分隔路径（如 `http://example.com/#/home`） | 标准 URL 路径（如 `http://example.com/home`）                |
| **原理**       | 基于 `hashchange` 事件，URL 变化不会触发服务器请求  | 基于 HTML5 `History API`（`pushState`/`replaceState`），需后端配合处理路由 |
| **兼容性**     | 支持所有浏览器                                      | 仅支持 HTML5 浏览器（IE10+）                                 |
| **服务端配置** | 无需特殊配置                                        | 需要服务器配置，处理所有路由到同一 HTML 文件                 |
| **应用场景**   | 适合简单应用，无需服务端支持                        | 适合需要 SEO 优化的应用，URL 更美观                          |

`hashchange` 事件是 JavaScript 中用于监听 URL 哈希值（即 `#` 后面的部分）变化的事件。

 **触发 `hashchange` 的场景**

- 用户手动修改 URL 中的哈希值
- 通过 JavaScript 修改 `window.location.hash`
- 浏览器的前进 / 后退按钮（如果历史记录中包含哈希值变化）

事件对象包含两个关键属性：

- `oldURL`：变化前的完整 URL
- `newURL`：变化后的完整 URL

**history API**

**`history.pushState(state, title, url)`**:向浏览器历史记录添加一个新条目，不会触发页面刷新。

```javascript
// 添加新历史记录条目，URL 变为 https://example.com/products
history.pushState({ page: 'products' }, null, '/products');
```

**`history.replaceState(state, title, url)`**修改当前历史记录条目，不会创建新条目。

```javascript
// 修改当前历史记录，URL 变为 https://example.com/products?filter=price
history.replaceState({ page: 'products', filter: 'price' }, null, '/products?filter=price');
```

 **`history.back()` / `history.forward()` / `history.go(n)`**

当用户点击浏览器的前进 / 后退按钮，或通过 `history.go()` 导航时触发**`popstate`**

```javascript
window.addEventListener('popstate', (event) => {
  console.log('当前历史记录状态:', event.state);
  // 根据 state 更新页面内容（如渲染对应路由组件）
});
```



##### vue-router的实现原理是什么

在vue3中 通过reactive创建响应式对象 当这个响应式对象改变 就会更新路由对象 触发组件重新渲染。

将路由配置解析为 **路径匹配正则表达式**，根据当前 URL 查找匹配的路由记录

- 按顺序执行各种守卫，形成 **Promise 链**，确保守卫逻辑串行执行。

- 通过 `<router-view>` 组件动态渲染匹配的路由组件。

  

  

  

  

  ##### 怎么实现按需加载 ？

  使用import函数

  ```javascript
  const Home = () => import('./views/Home.vue'); // ES6 动态导入
  const routes = [
    { path: '/home', component: Home }
  ];
  
  //4.x
  const routes = [
    {
      path: '/home',
      component: () => import('./views/Home.vue'),
      // 可选：添加加载中组件和错误组件
      meta: {
        loadingComponent: Loading,
        errorComponent: Error
      }
    }
  ];
  ```

  - 动态导入会将组件分割为独立的 chunk，在路由被访问时才加载。
  - Webpack 等打包工具会自动处理这些分割点。

  ##### 导航首位的执行顺序

  1. **触发路由跳转**（如点击 `<router-link>` 或调用 `router.push`）。
  2. **调用当前路由的 `beforeRouteLeave` 守卫**（如果离开当前路由）。
  3. **调用全局 `beforeEach` 守卫**。
  4. **调用路由配置中的 `beforeEnter` 守卫**（如果有）。
  5. **解析异步路由组件**（如果是懒加载路由）。
  6. **调用即将进入路由的 `beforeRouteEnter` 守卫**。
  7. **调用全局 `beforeResolve` 守卫**。
  8. **导航确认，更新 URL**。
  9. **调用全局 `afterEach` 钩子**。
  10. **触发 DOM 更新**。
  11. **在 `beforeRouteEnter` 守卫中通过 `next(vm => {})` 访问组件实例**（此时组件已挂载）。

##### 如何实现路由参数变化时的组件复用

当路由从 `/user/1` 变为 `/user/2` 时，组件默认会被复用（不触发 `created`/`mounted`）。

使用路由生命周期

```java
export default {
  beforeRouteUpdate(to, from, next) {
    this.fetchUser(to.params.id);
    next();
  }
};
```







### **打包工具**

- **Rollup**：
  - 配置简单，适合打包库或小型应用。
  - 生成的代码更干净，适合输出 ES 模块。
- **Webpack**：
  - 配置复杂，但功能强大，适合大型项目。
  - 开发环境启动时，需递归分析依赖图，打包所有模块为 Bundle。
  - HMR 更新时，重新构建变更模块及其依赖链，生成补丁文件（.hot-update.js）。
  - 通过 WebSocket 推送更新事件（`hash`、`ok`、`update`）。
  - 使用 JSONP 动态加载补丁脚本（如 `main.a1b2c3.hot-update.js`）
- **Vite**：
  - 基于 ES 模块的现代打包工具，开发环境使用原生 ES 模块，生产环境使用 Rollup。
  - 优点：启动速度快，支持按需加载，配置简单。
  - 缺点：生态相对较新，可能缺少一些插件。
  - vite之所以可以做到快速启动 是因为 vite是按需编译
  - 利用浏览器原生 ESM，启动时仅编译入口文件，其他模块按需编译。
  - 文件修改后，仅重新编译单个文件，通过 HTTP 头 `304 Not Modified` 实现缓存复用。
  - 利用浏览器原生 ESM 动态导入，通过 URL 参数（`?t=timestamp`）绕过缓存。(浏览器自动缓存静态资源)
  - 模块更新请求由浏览器主动发起，无需 JSONP 注入。

### 测试工具



##### est

不需要配置的测试工具 

- **2. 快照测试（Snapshot Testing）**

  - **自动记录组件输出**：通过 `toMatchSnapshot()` 保存组件渲染结果，后续测试时自动比对变化。
  - **UI 一致性保障**：特别适合测试 React/Vue 组件的 DOM 结构或复杂对象。

  **3. 并行测试执行**

  - **多线程运行**：利用 Worker 线程并行执行测试，大幅提升速度。
  - **智能缓存**：仅重新运行修改过的测试文件，增量构建时效率更高。

  **4. 代码覆盖率（Coverage）**

  - **一键生成报告**：通过 `--coverage` 参数自动收集覆盖率数据，支持 HTML、JSON 等格式。
  - **精确到行的覆盖追踪**：可视化展示哪些代码未被测试覆盖。

| 特性           | Jest           | Mocha                | Vitest                |
| -------------- | -------------- | -------------------- | --------------------- |
| **开箱即用**   | ✅ 零配置       | ❌ 需要额外配置断言库 | ✅ 基于 Vite，适合 Vue |
| **并行执行**   | ✅ 默认支持     | ❌ 需要插件           | ✅ 基于 Vite 更快      |
| **快照测试**   | ✅ 内置支持     | ❌ 需要第三方插件     | ✅ 兼容 Jest API       |
| **代码覆盖率** | ✅ 内置         | ❌ 需要 Istanbul      | ✅ 内置                |
| **生态系统**   | React 官方推荐 | 老牌框架，插件丰富   | Vite 生态优先         |



#### **简述 Jest 的测试生命周期**

**参考答案**：
Jest 的测试生命周期包含：



1. **全局钩子**：`beforeAll`、`afterAll`（所有测试前后执行）。
2. **分组钩子**：`beforeEach`、`afterEach`（每个测试用例前后执行）。
3. **测试执行**：`test()` 或 `it()` 包裹测试逻辑。
4. **异步处理**：支持 `async/await`、Promise 和回调函数（需调用 `done()`）。

#### **3. 如何理解 Jest 的快照测试？适用场景与风险？**

**参考答案**：
快照测试通过 `toMatchSnapshot()` 自动记录组件输出（如 DOM 结构、对象），下次测试时自动比对。
**适用场景**：



- 验证 UI 组件的结构稳定性（如 Header、Button）。
- 测试复杂数据结构（如 API 返回值）。

#### **. 如何提升 Jest 的测试速度？**

**参考答案**：



1. **并行执行**：Jest 默认启用多线程，可通过 `maxWorkers` 配置控制线程数。
2. **增量测试**：使用 `jest --watch` 仅运行修改过的测试。
3. **缓存机制**：通过 `jest --cache` 利用缓存（默认开启）。
4. **排除无关目录**：在 `jest.config.js` 中配置 `testPathIgnorePatterns`。
5. **分模块测试**：对独立模块使用 `jest --projects` 并行执行。

#### **如何处理大型项目的测试覆盖率？**

**参考答案**：



1. **生成报告**：`jest --coverage` 自动生成覆盖率报告，支持 HTML/JSON 格式。
2. **配置阈值**：在 `jest.config.js` 中设置 `coverageThreshold`，强制覆盖率达标。
3. **忽略特定代码**：使用 `/* istanbul ignore next */` 排除难以测试的代码（如第三方库）。

我设定了**核心模块（如 reactivity、renderer）分支覆盖率≥80%** 的目标，并通过 Jest 的 `--coverage` 选项自动生成报告。例如：



- **响应式系统**：测试 `reactive`、`ref` 的依赖收集与触发逻辑，确保嵌套对象的响应式更新正常。
- **虚拟 DOM**：验证 `h()` 函数生成的 VNode 结构，以及 `diff` 算法对属性变更的处理。

通过分析报告，我发现了几处未覆盖的代码：



- **边界情况**：当 `ref` 初始值为 `null` 时，响应式更新未被触发。
- **边缘逻辑**：`provide/inject` 在多层嵌套组件中的依赖查找路径存在漏洞。



我针对这些问题补充了测试用例，最终将核心模块的行覆盖率提升到 **92%**

作为个人项目，我采用了**单元测试为主、集成测试为辅**的策略：



- **单元测试**：聚焦核心功能（如 `computed` 的缓存机制），使用 Jest 的 `spyOn` 监视内部函数调用。
- **集成测试**：验证组件生命周期（如 `mounted` 钩子的触发时机），通过快照测试确保渲染结果稳定。



##### 

## react



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

   

