# 前端学习笔记目录

> 知识图谱式目录，包含文件间的关联关系、知识点依赖

---

## 📚 JavaScript 基础 (ES6)

### 学习路径

```
01_基础语法 → 02_数据类型 → 03_对象基础 → 04_集合与数据结构
      ↓              ↓              ↓
05_函数 ──────→ 06_原型与类 ←───── 03_对象基础
      ↓
07_异步编程 ←───── 05_函数 (回调函数基础)
      ↓
08_高级特性 ←───── 06_原型与类
      ↓
09_其他
```

### 详细目录

- [01_基础语法](JS%20CSS%20HTML/ES6/01_基础语法.md) → 变量声明、解构赋值、运算符、严格模式
  - 🔗 关联: [02_数据类型](JS%20CSS%20HTML/ES6/02_数据类型.md) (Symbol 类型前置)
  - ⬆️ 前置: 无
  - ➡️ 延伸: [05_函数](JS%20CSS%20HTML/ES6/05_函数.md) (箭头函数)

- [02_数据类型](JS%20CSS%20HTML/ES6/02_数据类型.md) → 原始类型、包装器、数字/字符串处理、Symbol
  - 🔗 关联: [04_集合与数据结构](JS%20CSS%20HTML/ES6/04_集合与数据结构.md) (Set/Map)
  - ⬆️ 前置: [01_基础语法](JS%20CSS%20HTML/ES6/01_基础语法.md)
  - ➡️ 延伸: [06_原型与类](JS%20CSS%20HTML/ES6/06_原型与类.md) (类型判断)

- [07_异步编程](JS%20CSS%20HTML/ES6/07_异步编程.md) → Promise、Generator、async/await、事件循环
  - 🔗 关联: [网络请求](网络和浏览器/网络请求.md) (异步请求)
  - 🔗 关联: [浏览器](网络和浏览器/浏览器.md) (事件循环机制)
  - ⬆️ 前置: [05_函数](JS%20CSS%20HTML/ES6/05_函数.md) (回调函数)
  - ➡️ 延伸: [axios封装](网络和浏览器/axios封装.md) (异步请求封装)

---

## 🎨 Vue 3 深度学习

### 知识架构

```
内置组件层
├── keep-alive (缓存)
├── component (动态)
├── slot (插槽)
├── teleport (传送)
└── suspense (异步)

响应式层
├── watch/watchEffect/computed
└── Proxy vs Object.defineProperty

编译优化层
├── 静态提升
├── 区块化
└── diff 算法

状态管理层
├── Vuex (Vue 2)
└── Pinia (Vue 3)
```

### 详细目录

#### 内置组件
- [vue3学习大纲](vue/vue3学习大纲.md) → 内置组件源码解析、响应式原理、编译优化
  - 🔗 关联: [vue面试](vue/vue面试.md) (面试题汇总)
  - ⬆️ 前置: [07_异步编程](JS%20CSS%20HTML/ES6/07_异步编程.md) (Suspense 异步处理)
  - ➡️ 延伸: [工程化面试](工程化相关/工程化面试.md) (Vue 工程化)

#### 核心原理
- **keep-alive** → LRU 缓存策略、组件复用、activated/deactivated 生命周期
  - 🔗 关联: [vue面试](vue/vue面试.md) (性能优化)

- **响应式系统** → watch/watchEffect/computed 实现、依赖收集
  - 🔗 关联: [07_异步编程](JS%20CSS%20HTML/ES6/07_异步编程.md) (watchEffect 异步问题)
  - ⬆️ 前置: [06_原型与类](JS%20CSS%20HTML/ES6/06_原型与类.md) (Proxy)

#### 状态管理
- **Pinia vs Vuex** → 响应式实现差异、模块化、TypeScript 支持
  - 🔗 关联: [01_Node_Deep_Dive](工程化相关/01_Node_Deep_Dive.md) (服务端状态)

---

## ⚛️ React 原理深入

### 架构演进

```
Stack Reconciler (React 15)
        ↓ 同步渲染、不可中断
Fiber 架构 (React 16)
        ↓ 可中断、优先级调度
Concurrent Mode (React 18)
        ↓ 并发渲染、时间切片
```

### 详细目录

- [react原理](code-react/react原理.md) → 虚拟DOM、Fiber架构、Reconciliation、渲染流程
  - 🔗 关联: [vue面试](vue/vue面试.md) (React vs Vue 性能对比)
  - ⬆️ 前置: [07_异步编程](JS%20CSS%20HTML/ES6/07_异步编程.md) (调度器原理)
  - ➡️ 延伸: [xiuyan-react](code-react/xiuyan-react.md) (实践代码)

#### Fiber 核心
- **双缓存** → current/workInProgress 树交替
- **Lane 模型** → 优先级位运算、同步/过渡/空闲车道
- **调度器** → MessageChannel、requestIdleCallback、时间切片

#### Hooks 实现
- **useState** → HookNode 链表、更新队列、批量处理
- **useEffect** → Effect 链表、依赖对比、清理函数
  - 🔗 关联: [07_异步编程](JS%20CSS%20HTML/ES6/07_异步编程.md) (微任务机制)

#### TSX 与模板
- [03 TSX 与模板编译原理](code-react/03-tsx.md) → JSX/TSX 编译过程、模板语法转换
  - 🔗 关联: [JavaScript/ts/01_类型基础.md](JacaScript/ts/01_类型基础.md) (类型系统)
  - 🔗 关联: [JavaScript/ts/03_泛型与高级类型.md](JacaScript/ts/03_泛型与高级类型.md) (类型推断)

---

## 🔧 前端工程化

### 学习路线

```
00_Frontend_Roadmap (全局路线)
        ↓
01_Node_Basic → 01_Node_Deep_Dive → 02_Node_Backend
        ↓              ↓                   ↓
03_Engineering_npm ←─── 01_Node_Deep_Dive
        ↓
04_Webpack_Engineering → 05_Node_Practices
        ↓
渲染方式 (SPA/SSR/SSG)
```

### 详细目录

- [00_Frontend_Roadmap](工程化相关/00_Frontend_Roadmap.md) → 前端学习全路线、技术栈概览
  - 🔗 关联: 所有笔记 (索引文件)
  - ⬆️ 前置: 无
  - ➡️ 延伸: 所有工程化笔记

#### Node.js 系列
- [01_Node_Basic](工程化相关/01_Node_Basic.md) → Node.js 基础、模块系统、异步 I/O
  - 🔗 关联: [01_Node_Deep_Dive](工程化相关/01_Node_Deep_Dive.md)
  - ⬆️ 前置: [07_异步编程](JS%20CSS%20HTML/ES6/07_异步编程.md)

- [01_Node_Deep_Dive](工程化相关/01_Node_Deep_Dive.md) → 事件循环、Buffer、Stream、进程
  - 🔗 关联: [浏览器](网络和浏览器/浏览器.md) (事件循环对比)
  - ➡️ 延伸: [02_Node_Backend](工程化相关/02_Node_Backend.md)

#### 构建工具
- [04_Webpack_Engineering](工程化相关/04_Webpack_Engineering.md) → 模块打包、Loader/Plugin、优化配置
  - 🔗 关联: [03_Engineering_npm](工程化相关/03_Engineering_npm.md) (包管理)
  - ➡️ 延伸: [05_Node_Practices](工程化相关/05_Node_Practices.md) (实践)

#### 渲染方式
- [渲染方式](工程化相关/渲染方式.md) → SPA、MPA、SSR、SSG 对比
  - 🔗 关联: [浏览器](网络和浏览器/浏览器.md) (渲染流程)
  - ⬆️ 前置: [vue面试](vue/vue面试.md) (SPA 理解)

---

## 🌐 网络与浏览器

### 知识图谱

```
DNS查询 → TCP连接 → HTTP请求 → 响应解析 → 页面渲染
                                    ↓
                            回流/重绘
                                    ↓
                            事件循环
```

### 详细目录

- [浏览器](网络和浏览器/浏览器.md) → DNS、TCP、渲染流程、回流重绘、事件循环
  - 🔗 关联: [07_异步编程](JS%20CSS%20HTML/ES6/07_异步编程.md) (事件循环详解)
  - 🔗 关联: [网络](网络和浏览器/网络.md) (网络层)
  - ➡️ 延伸: [浏览器进程模型](网络和浏览器/浏览器进程模型.md)

- [网络请求](网络和浏览器/网络请求.md) → HTTP 协议、请求方法、状态码
  - 🔗 关联: [axios封装](网络和浏览器/axios封装.md)
  - ⬆️ 前置: [07_异步编程](JS%20CSS%20HTML/ES6/07_异步编程.md)

- [axios封装](网络和浏览器/axios封装.md) → 拦截器、错误处理、请求取消
  - 🔗 关联: [02_Node_Backend](工程化相关/02_Node_Backend.md) (API 设计)

---

## 🤖 AI 技术学习

### 核心概念链

```
模型 (大模型基础)
    ↓
智能体 (Agent + MCP)
    ↓
RAG (检索增强)
    ↓
LongChain (流程编排)
    ↓
Sub Agent (上下文隔离)
```

### 详细目录

- [核心概念](AI/核心概念.md) → 模型、智能体、MCP、RAG、Skill、Sub Agent
  - 🔗 关联: [context Engineering](AI/context%20Engineering.md)
  - ➡️ 延伸: [deep-researcher](AI/deep-researcher.md)

---

## 📝 面试题汇总

- [vue面试](vue/vue面试.md) → Vue 全栈面试题、源码解析
  - 🔗 关联: [react原理](code-react/react原理.md) (框架对比)
  - 🔗 关联: [工程化面试](工程化相关/工程化面试.md)

- [工程化面试](工程化相关/工程化面试.md) → Node.js、Webpack、工程化实践
  - 🔗 关联: [05_Node_Practices](工程化相关/05_Node_Practices.md)

---

## 📌 说明

- **⬆️ 前置知识**: 学习当前笔记前需要掌握的知识点
- **🔗 关联**: 与当前笔记内容相关的其他笔记
- **➡️ 延伸**: 学习当前笔记后可以深入的方向

---

## 文件目录

- JS CSS HTML/ES6/01_基础语法.md：变量声明、解构赋值、运算符、严格模式
- JS CSS HTML/ES6/02_数据类型.md：原始类型、包装器、数字/字符串处理、Symbol
- JS CSS HTML/ES6/03_对象基础.md：对象创建、属性操作、原型链
- JS CSS HTML/ES6/04_集合与数据结构.md：Set、Map、数组方法、数据结构实现
- JS CSS HTML/ES6/05_函数.md：函数声明、闭包、高阶函数、函数式编程
- JS CSS HTML/ES6/06_原型与类.md：原型链、类继承、静态方法、装饰器
- JS CSS HTML/ES6/07_异步编程.md：Promise、Generator、async/await、事件循环
- JS CSS HTML/ES6/08_高级特性.md：装饰器、代理、迭代器、反射
- JS CSS HTML/ES6/09_其他.md：模块系统、错误处理、编码规范
- vue/vue3学习大纲.md：Vue3 内置组件源码解析、响应式原理、编译优化
- vue/vue面试.md：Vue 全栈面试题、源码解析
- code-react/react原理.md：虚拟DOM、Fiber架构、Reconciliation、渲染流程
- code-react/xiuyan-react.md：React 源码实践、手写实现
- code-react/03-tsx.md：TSX 与模板编译原理、JSX 转换机制
- 工程化相关/00_Frontend_Roadmap.md：前端学习全路线、技术栈概览
- 工程化相关/01_Node_Basic.md：Node.js 基础、模块系统、异步 I/O
- 工程化相关/01_Node_Deep_Dive.md：事件循环、Buffer、Stream、进程
- 工程化相关/02_Node_Backend.md：Node.js 服务端开发、API 设计
- 工程化相关/03_Engineering_npm.md：包管理、npm 生态、发布流程
- 工程化相关/04_Webpack_Engineering.md：模块打包、Loader/Plugin、优化配置
- 工程化相关/05_Node_Practices.md：Node.js 实践案例、性能优化
- 工程化相关/渲染方式.md：SPA、MPA、SSR、SSG 对比
- 工程化相关/工程化面试.md：Node.js、Webpack、工程化实践
- 网络和浏览器/浏览器.md：DNS、TCP、渲染流程、回流重绘、事件循环
- 网络和浏览器/网络.md：网络协议、HTTP/HTTPS、WebSocket
- 网络和浏览器/浏览器进程模型.md：浏览器多进程架构、渲染进程
- 网络和浏览器/网络请求.md：HTTP 协议、请求方法、状态码
- 网络和浏览器/axios封装.md：拦截器、错误处理、请求取消
- AI/核心概念.md：模型、智能体、MCP、RAG、Skill、Sub Agent
- AI/context Engineering.md：上下文工程、提示词设计、系统提示
- AI/deep-researcher.md：深度研究工具链、研究方法、知识管理
- JacaScript/ts/01_类型基础.md：TypeScript 类型系统、基础类型、类型注解
- JacaScript/ts/02_接口与类.md：接口定义、类实现、访问修饰符
- JacaScript/ts/03_泛型与高级类型.md：泛型编程、条件类型、映射类型
- JacaScript/ts/04_工程应用.md：项目配置、类型声明、工具集成
- JS CSS HTML/css HTML 基础.md：CSS 选择器、盒模型、布局、动画
- JS CSS HTML/js.md：JavaScript 基础语法、DOM 操作、事件处理

## 笔记覆盖知识面分析

### 1. 已覆盖的技术栈

- **前端框架**：Vue 3（深度）、React（原理深入）
- **JavaScript**：ES6+ 全面覆盖，包括异步编程、高级特性
- **TypeScript**：类型系统、泛型、工程化应用
- **前端工程化**：Node.js、Webpack、npm 包管理
- **网络与浏览器**：HTTP 协议、浏览器原理、事件循环
- **AI 技术**：大模型应用、智能体、RAG 技术
- **TSX 编译**：JSX/TSX 转换机制、模板编译原理

### 2. 知识深度评估

**深入领域**：
- Vue 3 响应式原理、内置组件源码解析
- React Fiber 架构、Hooks 实现、调度机制
- Node.js 事件循环、异步 I/O、Stream 处理
- 浏览器渲染流程、事件循环机制
- TSX 编译原理、模板语法转换

**中等深度**：
- JavaScript 基础语法与特性
- TypeScript 类型系统与工程应用
- 前端工程化工具链
- 网络协议与请求处理

**浅显覆盖**：
- AI 技术应用（概念为主，实践较少）
- 性能优化策略（分散在多个笔记中）
- 跨端开发（未系统覆盖）
- CSS 基础（仅有基础笔记，缺乏深入）

### 3. 建议补充的方向

- **性能优化**：建立系统的性能优化专题，涵盖代码、网络、渲染等维度
- **CSS 深入**：补充 Flexbox、Grid、动画、响应式设计等 CSS 高级特性
- **跨端开发**：补充小程序、React Native、Electron 等跨端技术
- **前端测试**：增加单元测试、E2E 测试、测试驱动开发
- **可视化**：补充 D3.js、Canvas、SVG 等可视化技术
- **WebAssembly**：增加 Wasm 学习笔记，性能优化场景
- **微前端**：补充微前端架构、模块联邦、沙箱机制
- **Web 安全**：增加 XSS、CSRF、CSP 等安全防护知识
- **前沿技术**：Web Components、渐进式 Web 应用、边缘计算
- **状态管理**：深入各类状态管理库的原理与最佳实践

> 最后更新: 2026-04-27
> 自动生成: Claude Code AI 目录生成器