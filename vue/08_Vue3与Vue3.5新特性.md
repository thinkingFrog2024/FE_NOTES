## vue3.5

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



 


