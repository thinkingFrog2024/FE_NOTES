# 目录

- [Source Map](#source-map)
  - [Source Map类型](#source-map)
  - [生产环境Source Map方案](#能第一时间通过线上的错误信息来追踪到源码位置从而快速解决掉bug以减轻损失但又不希望sourcemap文件报漏在生产环境有比较好的方案吗)
- [DevServer](#devserver)
  - [基础配置](#基础使用)
  - [添加响应头](#添加响应头)
  - [开启代理](#开启代理)
  - [静态资源服务](#静态资源服务)
  - [其他配置](#其他配置)
- [ESLint代码检查](#eslint代码检查)
- [Husky Git Hooks](#huskygit-hooks)
  - [pre-commit钩子](#pre-commit钩子)
  - [commit-msg钩子](#commit-msg钩子)
- [模块解析机制](#模块解析机制resolve)
  - [解析规则](#解析规则)
  - [别名配置](#alias)
  - [externals外部扩展](#externals外部扩展)
  - [Scope Hoisting作用域提升](#scope-hoisting作用域提升)
- [Tree Shaking](#tree-shaking)
  - [原理](#tree-shaking原理)
  - [副作用处理](#sideeffects)
- [PWA与Service Worker](#pwaservice-worker)
- [Web Workers](#web-workers)
- [TypeScript集成](#typescript集成)
- [多页面应用MPA](#多页面应用mpa)
- [Module Federation微前端](#module-federation微前端)
  - [基本概念](#基本概念)
  - [Host消费远程模块](#host消费远程模块)
  - [Remote暴露模块](#remote暴露模块)
  - [共享依赖](#共享依赖)
  - [ModuleFederationPlugin配置](#modulefederationplugin插件)
- [Wujie微前端框架](#wujie微前端框架)
  - [核心设计思想](#wujie的核心设计思想)
  - [JS沙箱](#js沙箱)
  - [CSS隔离](#css隔离)
  - [DOM隔离](#dom隔离)

---

> 本文是 [04_Webpack_Engineering.md](./04_Webpack_Engineering.md) 的续篇，主要涵盖 Webpack 高级应用、拓展功能以及微前端相关内容。

#  高级应用篇

## source-map

关联打包后的文件与源代码 便于debug

1. eval(开发环境下的默认值) 每个module封装到eval里面 末尾追加注释//@sourceURL

2. source-map 会生成一个sourcemap文件

3. hidden-source-map 相较于sourcemap bundle末尾没有注释 不能锁定错误行数 不会和压缩文件做关联

4. inline-source-map 在main.js生成一个DataUrl形式的sourcemap文件 不会单独打包文件

5. eval-source-map 每个模块会通过eval（）来执行 生成一个DataUrl形式的sourcemap

6. cheap-source-map 生成一个没有列信息的sourcemap文件 不包含loader的sourcemap 比较节省性能 毕竟不太需要列数 ruguoyoubabel这样的插件 可能出问题 

7. cheap-module-source-map 生成没有列信息的sourcemap文件 loader的sourcemap也被简化成只包含对应行的

   

> 能第一时间通过线上的错误信息，来追踪到源码位 置，从而快速解决掉bug以减轻损失。但又不希望sourcemap文件报漏在生产 环境，有比较好的方案吗？
>
> 在生产环境中，确实需要一种既能利用 source map 快速定位源码中的错误，又不能让 source map 文件泄露给外部的方案。以下是一些常用的做法：
>
> 1. 使用服务器端 source map
>
>    一种常见的做法是将 source map 文件存储在服务器上，而不是直接包含在部署的静态资源中。这样，当客户端发生错误时，可以通过 AJAX 请求从服务器获取 source map 文件。这种方法需要在错误追踪服务中配置代理，以便正确地解析 source map。
>
> 3. 使用 Webpack 的 source map 相关插件
>
>    使用 Webpack 的插件来管理 source map 的生成和使用，例如 `webpack-source-map-plugin`。这个插件允许你更细粒度地控制 source map 的生成。
>
> 4. 内联 source map
>
>    另一种方法是使用内联 source map，将 source map 作为数据 URL 内联在 JavaScript 文件中。这样，source map 不会作为单独的文件存在，但仍然可以被开发者工具使用。
>
> ```javascript
> // webpack.config.js
> module.exports = {
>   // ...
>   devtool: production ? 'inline-source-map' : 'source-map',
> };
> ```
>
> 5. 使用服务端 source map 服务
>
>    使用服务端的 source map 服务来动态提供 source map 文件。例如，你可以设置一个中间件，当接收到错误信息时，通过中间件查询数据库或文件系统来提供对应的 source map。
>
> 6. 访问控制
>
>    确保 source map 文件的访问受到严格控制，只允许特定的 IP 地址或经过身份验证的用户访问。
>
> 7. 使用专用的错误追踪服务
>
>    使用如 Sentry、Rollbar 或 Bugsnag 等错误追踪服务，它们支持 source map，并提供了安全的方式来处理生产环境中的错误。
>
> 9. 使用 .htaccess 或服务器配置限制访问
>
>    如果你决定将 source map 文件存储在服务器上，可以使用 `.htaccess`（对于 Apache）或相应的服务器配置来限制对这些文件的访问。
>
> 通过上述方法，你可以在保护 source map 文件的同时，利用它们快速定位和解决问题。选择哪种方法取决于你的具体需求和安全策略。
>

## devserver

模拟用户从浏览器访问 通过webpack-dev-server实现

执行`webpack serve`就可以在日志里看到启动了一个http服务（底层是基于node的http模块）

**基础使用**

```javascript
devserver:{
	ststic:path.resolve(__dirname,'./dist'),
	compress:true,//(传输过程里压缩)，对应静态资源请求的响应头里的Content-Encoding: gzip 
	port：3000，	
}
```

**添加响应头**

```javascript
devServer: {
 	headers: {
 		'X-Fast-Id': 'p3fdg42njghm34gi9ukj',
         //传入函数
         return { 'X-Bar': ['key1=value1', 'key2=value2'] };
 },
 	},
 },
```

**开启代理**

```javascript
devServer: {
        proxy: [
            {
                context: ['/auth', '/api'],//代理路径
                target: 'https://other-server.example.com',//目标地址
            }
        ]
    }
```

**静态资源服务**

```javascript
devServer: {
        static: {
          directory: path.join(__dirname, 'public'),
        },
      },
```

**其他配置**

```javascript
devServer: {
        host: "local-ip",//启动域名
        open: true,//自动打开浏览器
      },
```

## ESLint代码检查

```javascript
const ESLintPlugin = require('eslint-webpack-plugin')

module.exports = {
 plugins:[
     new ESLintPlugin({
         extensions:['js','jsx'],
         exclude:'node_modules'
     })
 ]
}
```

## husky git-hooks

### pre-commit 钩子

```bash
npx husky add .husky/pre-commit "npm run lint"
```

### commit-msg 钩子

```bash
npx husky add .husky/commit-msg "npx commitlint --edit $1"
```

## 模块解析机制(resolve)

### 解析规则

```javascript
module.exports = {
	resolve:{
		extensions:['js','json']//省略后缀名
	}
}
```

### alias

路径别名 方便引用

```javascript
module.exports = {
	resolve:{
		alias:{
			'@':path.resolve(__dirname,'./src')
		}
	}
}
```

### externals 外部扩展

防止将某些 import 的包(package) 打包到 bundle 中，而是在运行时(runtime) 再去从外部获取这些扩展依赖(external dependencies)。比如从CDN引入jQuery，不需要将其打包进bundle

```javascript
module.exports = {
  //...
  externals: {
    jquery: 'jQuery',
  },
};
```

### Scope Hoisting 作用域提升

将多个模块合并到一个函数作用域里

```javascript
optimization:{
    concatenateModules:true
}
```

## Tree Shaking

用于移除 JavaScript 上下文中的未引用代码(dead-code)

它依赖于 ES2015 模块语法的 **静态结构** 特性，包括 `import` 和 `export`

### tree shaking 原理

ESM模块具有静态结构的特点 这使得webpack可以在编译阶段对整个模块的依赖图进行静态分析 这样就可以识别出哪些导出值没有被其他模块使用 并将其从最终的产物中移除 

webpack实现tree-shaking的过程

1. 标记阶段 make阶段 webpack会遍历整个模块依赖图 将每个模块的导出和导入关系记录下来 通过分析可以确定哪些导出值被使用了 哪些没有被使用 
2. 使用标记分析 在这个过程中 webpack会为每个导出值添加使用标记
3. 优化阶段 seal阶段 根据收集到的使用信息 进行tree-shaking优化 移除未使用的导出代码

### sideEffects

如果当前代码确实存在副作用 可以通过package.json的sideEffects属性明确告知webpack 当前项目/模块是否存在副作用

```json
{
  "name": "your-project",
  "sideEffects": false
}
```

也可以指定哪些文件有副作用

```json
{
  "sideEffects": ["*.css", "*.global.js"]
}
```

## PWA与Service Worker

渐进式Web应用(PWA)是一种结合了Web和原生应用优点的新型应用模式 Service Worker是PWA的核心技术之一 它可以在后台运行 拦截网络请求 实现离线缓存等功能

使用workbox-webpack-plugin

```javascript
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = {
  plugins: [
    new InjectManifest({
      swSrc: './src/sw.js',
      swDest: 'service-worker.js',
    }),
  ],
};
```

## Web Workers

Web Workers提供了一种在后台线程中运行脚本的能力 不会阻塞主线程 适合执行CPU密集型任务

worker-loader可以将Web Worker的创建过程简化

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: { loader: 'worker-loader' },
      },
    ],
  },
};
```

## TypeScript集成

ts-loader将TypeScript代码转译为JavaScript

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};
```

## 多页面应用MPA

多页面应用(MPA)是指应用包含多个独立的HTML页面 每个页面都有自己的JavaScript入口

```javascript
module.exports = {
  entry: {
    page1: './src/page1/index.js',
    page2: './src/page2/index.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/page1.html',
      filename: 'page1.html',
      chunks: ['page1'],
    }),
    new HtmlWebpackPlugin({
      template: './public/page2.html',
      filename: 'page2.html',
      chunks: ['page2'],
    }),
  ],
};
```

# Module Federation 微前端

## 基本概念

Module Federation 是 Webpack 5 推出的新特性 允许不同的独立构建的应用程序之间动态加载彼此的代码 实现真正的微前端架构

主要角色：

1. **Host (宿主)**：消费其他应用程序代码的应用程序
2. **Remote (远程)**：提供给其他应用程序使用的应用程序

## Host 消费远程模块

```javascript
// Host应用的webpack配置
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host',
      remotes: {
        app1: 'app1@http://localhost:3001/remoteEntry.js',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
};
```

在Host应用中使用Remote模块：

```javascript
import React from 'react';

const RemoteComponent = React.lazy(() => import('app1/Button'));

function App() {
  return (
    <div>
      <h1>Host Application</h1>
      <React.Suspense fallback={<div>Loading...</div>}>
        <RemoteComponent />
      </React.Suspense>
    </div>
  );
}

export default App;
```

## Remote 暴露模块

```javascript
// Remote应用的webpack配置
new ModuleFederationPlugin({
  name: 'app1',
  filename: 'remoteEntry.js',
  exposes: {
    './Button': './src/Button',
  },
  shared: {
    react: { singleton: true, requiredVersion: '^17.0.0' },
    'react-dom': { singleton: true, requiredVersion: '^17.0.0' },
  },
});
```

## 共享依赖

shared 配置项允许不同应用之间共享依赖 避免重复加载

常用选项：

- `singleton`: 只加载一次该依赖
- `requiredVersion`: 指定所需的版本范围
- `eager`: 立即包含共享模块 而不是异步加载
- `strictVersion`: 如果版本不匹配则抛出错误

## ModuleFederationPlugin 插件

完整配置示例：

```javascript
new ModuleFederationPlugin({
  name: 'myApp',
  library: { type: 'var', name: 'myApp' },
  filename: 'remoteEntry.js',
  exposes: {
    './Component': './src/components/Component',
    './utils': './src/utils',
  },
  remotes: {
    otherApp: 'otherApp@http://localhost:3002/remoteEntry.js',
  },
  shared: {
    react: {
      singleton: true,
      requiredVersion: deps.react,
      eager: false,
    },
    'react-dom': {
      singleton: true,
      requiredVersion: deps['react-dom'],
    },
    lodash: '*',
  },
});
```

# Wujie 微前端框架

Wujie 是腾讯开源的一款基于 WebComponents + iframe 的微前端解决方案 具有极低的侵入性和优秀的隔离性

## wujie 的核心设计思想

1. **基于 WebComponents 实现 JS 沙箱**：利用 Shadow DOM 和 Proxy 实现样式隔离和全局变量隔离
2. **基于 iframe 实现 DOM 隔离**：子应用的 DOM 结构挂载在 iframe 内部 天然隔离
3. **支持多种接入方式**：支持 JSD、HTML、URL 三种方式接入子应用

## JS 沙箱

wujie 使用 Proxy 对 window 对象进行代理 实现全局变量的隔离

```javascript
// 简化的沙箱实现示意
function createSandbox(proxyWindow) {
  const sandbox = new Proxy(window, {
    get(target, key) {
      if (key in proxyWindow) {
        return proxyWindow[key];
      }
      return target[key];
    },
    set(target, key, value) {
      proxyWindow[key] = value;
      return true;
    },
    has(target, key) {
      return key in proxyWindow || key in target;
    },
  });
  return sandbox;
}
```

## CSS 隔离

wujie 利用 Shadow DOM 实现样式隔离 子应用的样式不会影响到主应用或其他子应用

```javascript
// 创建 Shadow DOM 容器
const shadowHost = document.createElement('div');
const shadowRoot = shadowHost.attachShadow({ mode: 'open' });

// 子应用的DOM和样式都挂载在shadowRoot内
shadowRoot.innerHTML = `
  <style>
    .app-specific-style { color: red; }
  </style>
  <div class="container">子应用内容</div>
`;
```

## DOM 隔离

wujie 使用 iframe 作为容器来实现 DOM 隔离 但通过特殊的处理让子应用的内容能够显示在正确位置

```javascript
// wujie 加载子应用的基本流程
import { setupApp, preloadApp, startApp } from 'wujie';

// 预加载子应用（可选）
preloadApp({
  name: 'sub-app',
  url: 'http://localhost:8081/',
});

// 启动子应用
setupApp({
  name: 'sub-app',
  url: 'http://localhost:8081/',
  exec: true,
  el: '#sub-app-container',
  props: {
    // 传递给子应用的数据
    token: 'xxx',
  },
  beforeLoad: () => {
    console.log('子应用即将加载');
  },
  beforeMount: () => {
    console.log('子应用即将挂载');
  },
  afterMount: () => {
    console.log('子应用已挂载');
  },
});

// 或者直接使用startApp快速启动
startApp({
  name: 'sub-app',
  url: 'http://localhost:8081/',
  el: '#sub-app-container',
});
```

wujie 的优势：

1. **开箱即用**：配置简单 快速接入
2. **完善的隔离性**：JS/CSS/DOM 三层隔离
3. **性能优秀**：支持预加载 子应用之间并行加载
4. **兼容性好**：支持各种主流框架
5. **支持多实例**：同一子应用可以同时运行多个实例
6. **通信便捷**：提供了完善的主子应用通信机制
