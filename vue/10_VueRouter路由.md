## 路由

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






