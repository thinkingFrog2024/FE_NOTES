# 目录

- [Webpack HMR热更新](#webpack怎么实现热更新)
  - [建立通信通道](#建立通信通道)
  - [监听文件变化](#2-监听文件变化)
  - [推送更新](#3-推送更新)
  - [模块替换](#4-模块替换)
- [Webpack打包过程](#webpack打包过程)
  - [初始化阶段](#1-初始化阶段)
  - [构建阶段](#2-构建阶段)
  - [生成阶段](#3-生成阶段)
  - [资源形态流转](#过程里的资源形态流转)
- [配置项分类](#将配置项分为-流程类-工具类)
- [Entry配置项](#entry配置项)
- [Output配置](#output)
- [资源模块（asset module）](#资源模块asset-module)
- [Loader](#loader)
  - [Webpack处理CSS](#webpack处理css)
  - [PostCSS与CSS模块](#postcss-css模块)
  - [Babel处理JS](#babel处理js)
- [代码分离](#代码分离)
  - [手动配置入口文件](#手动配置入口文件)
  - [使用SplitChunks去重](#使用entry-dependencies-或者-splitchunksplugin-去重)
  - [动态导入](#动态导入)
  - [预获取/预加载模块](#预获取预加载模块)
- [缓存](#缓存)
  - [Hash类型](#确保资源可以被浏览器缓存-当内容改变时请求到新的文件)
  - [缓存第三方库](#缓存第三方库)
  - [持久化缓存](#持久化缓存)
  - [组件自带缓存功能](#使用组件自带的缓存功能)
- [SplitChunks性能优化](#使用splitchunks提升应用性能)
  - [Chunk分包流程](#在seal阶段)
  - [默认分包规则](#webpack-默认会将以下三种模块做分包处理)
  - [SplitChunksPlugin](#splitchunksplugin)
  - [最佳分包策略](#最佳分包策略包括)
- [环境拆分](#拆分开发环境生产环境)
  - [公共路径publicPath](#公共路径publicpath)
  - [拆分配置文件](#拆分配置文件)
- [Vue全栈开发环境搭建](#搭建vue全栈开发环境)
  - [处理Vue SFC文件](#1-处理vue-sfc文件-运行vue应用)
  - [添加编译工具](#2-添加编译工具)
  - [搭建Vue SSR环境](#3-搭建vue-ssr环境)

---

# webpack



webpack怎么实现热更新？

#### **建立通信通道**

- Webpack Dev Server 启动时，通过 **WebSocket** 与浏览器建立长连接，用于推送更新通知。

#### 2. **监听文件变化**

- 开发者修改代码 → Webpack 重新编译 → 生成**更新补丁（Chunk Diff）**。

#### 3. **推送更新**

- 通过 WebSocket 向浏览器发送消息，包含新模块的代码和依赖关系。

#### 4. **模块替换**

- 浏览器接收更新后，**替换旧模块**，并执行新模块代码。

- 

  关键步骤

  ：

  - **Check**：询问是否有更新（通过 `module.hot.check`）。
  - **Apply**：执行更新（通过 `module.hot.apply`）。



Webpack 则忽略具体资源类型之间的差异，将所有代码/非代码文件都统一看作 Module —— 模块对象，以相同的加载、解析、依赖管理、优化、合并流程实现打包，并借助 Loader、Plugin 两种开放接口将资源差异处理逻辑转交由社区实现，实现**统一资源构建模型** 设计优点：
- 所有资源都是 Module，所以可以用同一套代码实现诸多特性，包括：代码压缩、Hot Module Replacement、缓存等；
- 打包时，资源与资源之间非常容易实现信息互换，例如可以轻易在 HTML 插入 Base64 格式的图片；
- 借助 Loader，Webpack 几乎可以用任意方式处理任意类型的资源，例如可以用 Less、Stylus、Sass 等预编译 CSS 代码。



**webpack打包过程**

1. **初始化阶段**：修整配置参数，创建 Compiler、Compilation 等基础对象，并初始化插件及若干内置工厂、工具类，并最终根据 `entry` 配置，找到所有入口模块；

   1. 校验用户参数 合并出配置对象

      1. 启动时，首先将 `process.args` 参数与 `webpack.config.js` 文件合并成用户配置
      2.  校验配置对象
      3. 合并出最终配置

   2. 创建 Compiler 对象并开始启动插件

      1. 调用 [createCompiler](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fwebpack.js%23L61-L62) 函数创建 `compiler` 对象。
      2. [遍历](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2Fwebpack.js%23L68-L69) 配置中的 `plugins` 集合，执行插件的 `apply` 方法。
      3. 根据配置内容动态注入相应插件，包括：
         - 调用 [EntryOptionPlugin](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FEntryOptionPlugin.js) 插件，该插件根据 `entry` 值注入 `DynamicEntryPlugin` 或 `EntryPlugin` 插件；
         - 根据 `devtool` 值注入 Sourcemap 插件，包括：`SourceMapDevToolPlugin`、`EvalSourceMapDevToolPlugin` 、`EvalDevToolModulePlugin`；
         - 注入 `RuntimePlugin` ，用于根据代码内容动态注入 webpack 运行时。

   3. **调用 `compiler.compile` 方法开始执行构建** 在这个方法里会搭建后续构建流程框架，是后续所有功能逻辑的起点

      ```javascript
      // webpack/lib/compiler.js 
      compile(callback) {
          const params = this.newCompilationParams();
          this.hooks.beforeCompile.callAsync(params, err => {
            // ...
            const compilation = this.newCompilation(params);
            this.hooks.make.callAsync(compilation, err => {
              // ...
              this.hooks.finishMake.callAsync(compilation, err => {
                // ...
                process.nextTick(() => {
                  compilation.finish(err => {
                    // ...
                    compilation.seal(err => {
                      // ...
                      this.hooks.afterCompile.callAsync(compilation, err => {
                          if (err) return callback(err);
                          return callback(null, compilation);
                      });
                    });
                  });
                });
              });
            });
          });
        }
      
      ```

      1. 调用 `newCompilation` 方法创建 `compilation` 对象；
      2. 触发 `make` 钩子，紧接着 [EntryPlugin](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FEntryPlugin.js%23L47-L49) 在这个钩子中调用 `compilation` 对象的 `addEntry` 方法创建入口模块，主流程开始进入「**构建阶段**」；
      3. `make` 执行完毕后，触发 `finishMake` 钩子；
      4. 执行 `compilation.seal` 函数，进入「**生成阶段**」，开始封装 Chunk，生成产物；
      5. `seal` 函数结束后，触发 `afterCompile` 钩子，开始执行收尾逻辑。

      

2. **构建阶段**：从 `entry` 文件开始，调用 `loader` 将模块转译为 JavaScript 代码，调用 [Acorn](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Facornjs%2Facorn) 将代码转换为 AST 结构，遍历 AST 从中找出该模块依赖的模块；之后 **递归** 遍历所有依赖模块，找出依赖的依赖，直至遍历所有项目资源后，构建出完整的 **[模块依赖关系图](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconcepts%2Fdependency-graph%2F)**；

   1. 调用 [handleModuleCreation](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L1476-L1477)，根据文件类型构建 `module` 子类 —— 一般是 [NormalModule](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FNormalModule.js)；
   2. 调用 [loader-runner](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Floader-runner) 转译 `module` 内容，将各类资源类型转译为 Webpack 能够理解的标准 JavaScript 文本；
   3. 调用 [acorn](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Facorn) 将 JavaScript 代码解析为 AST 结构；
   4. 在JavaScriptParser类中遍历 AST，把通过import引入的资源添加为Dependency对象，再把Dependency对象转换层Module对象添加到依赖数组里：
   5. 处理依赖数组
   6. 所有依赖解析完毕 构建结束 

3. **生成阶段**：根据 `entry` 配置，将模块组装为一个个 Chunk 对象，之后调用一系列 Template 工厂类翻译 Chunk 代码并封装为 Asset，最后写出到文件系统。

   1. 创建本次构建的 [ChunkGraph](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FChunkGraph.js) 对象。
   2. 遍历入口集合
      1. 调用 `addChunk` 方法为每一个入口 [创建](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L2817-L2818) 对应的 Chunk 对象
      2. [遍历](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L2832-L2833) 该入口对应的 Dependency 集合，[找到](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L2835-L2836) 相应 Module 对象并 [关联](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompilation.js%23L2837-L2838) 到该 Chunk。
   3. 到这里可以得到若干 Chunk，之后将这些 Chunk 处理成 Graph 结构，方便后续处理。
   4. 插件（如 [SplitChunksPlugin](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fplugins%2Fsplit-chunks-plugin%2F)）进一步修剪、优化 Chunk 结构。
   5. 生成 Chunk 代码
      1. 遍历每一个 Chunk 的 Module 对象
      2. 生成单个 Module 的代码（模块资产代码）
   6. 生成每一个chunk的资产文件
   7. 记录资产文件信息
   8. 触发 `callback` 回调，控制流回到 `compiler` 函数。
   9. [调用](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompiler.js%23L466-L467) `compiler` 对象的 [emitAssets](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2Fwebpack%2Fwebpack%2Fblob%2FHEAD%2Flib%2FCompiler.js%23L592-L593) 方法，输出资产文件。

> 提示：单次构建过程自上而下按顺序执行，如果启动了 `watch` ，则构建完成后不会退出 Webpack 进程，而是持续监听文件内容，发生变化时回到「**构建**」阶段重新执行构建。


**过程里的资源形态流转**

构建阶段：

1. 原始文件
2. 使用loader把所有文件处理为js代码
3. 把js代码转成AST
4. 把通过import引入的依赖处理成Dependency对象 再处理成Module对象
5. 获得处理好的module
6. 生成资产文件assets
7. 输出资产文件





将配置项分为 **流程类** **工具类**

流程类：

* 输入输出

  * entry

  * context:项目执行上下文 路径

  * output

* 模块处理

  * resolve:配置模块路径解析规则

  * module:模块加载规则

  * externals:声明外部资源 webpack会跳过这些资源的解析 打包操作

* 后处理

  * optimization:控制怎样优化产物包体积
  * target：配置编译产物目标运行环境
  * mode：编译模式短语

工具类型：

* 开发效率
  * watch：持续构建
  * devtool：配置产物Sourcemap生成规则
  * devServer：配置与 HMR 强相关的开发服务器功能（webpack-dev-server）
* 性能优化类：
  - `cache`：Webpack 5 之后，该项用于控制如何缓存编译过程信息与编译结果
  - `performance`：用于配置当产物大小超过阈值时，如何通知开发者
* 日志类：
  - `stats`：用于精确地控制编译过程的日志内容，在做比较细致的性能调试时非常有用
  - `infrastructureLogging`：用于控制日志输出方式，例如可以通过该配置将日志输出到磁盘文件
* 等等




房间号 （id） 成员（【】） 消息列表（{}）

身份证（id） 昵称  所在房间号 





早期的打包工具使用这种方式解决变量污染：

```javascript
//立即执行函数
;(function(){
    var n = 1
})()
//在函数外无法访问这个变量
//如果需要有些变量能够访问
var result = (function(){
    var n = '1'
    return n
})
//每个脚本都在不同的作用域内 避免了脚本之间的命名冲突
```






**entry配置项**：

- 字符串：指定入口文件路径；

- 对象：对象形态功能比较完备，除了可以指定入口文件列表外，还可以指定入口依赖、Runtime 打包方式等；
  - `import`：声明入口文件，支持路径字符串或路径数组(多入口)；

  - `dependOn`：声明该入口的前置依赖 Bundle；适用于**有明确入口依赖**的场景,比如下面代码personal模块依赖于shared模块 Webpack会认为客户端加载personal产物之前必定会先加载shared  因此可以把重复的模块代码，运行时代码等都会放到main产物里  ，比如vue里 给每个页面单独构建的bundle会依赖于主框架代码

    Q：所以什么算主框架代码

  - `runtime`：设置该入口的 Runtime Chunk，若该属性不为空，Webpack 会将该入口的运行时代码抽离成单独的 Bundle；

  - `filename`：效果与 [output.filename](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputfilename) 类同，用于声明该模块构建产物路径；

  - `library`：声明该入口的 [output.library](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputlibrary) 配置，一般在构建 NPM Library 时使用；

  - `publicPath`：效果与 [output.publicPath](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputpublicpath) 相同，用于声明该入口文件的发布 URL；

  - `chunkLoading`：效果与 [output.chunkLoading](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputchunkloading) 相同，用于声明异步模块加载的技术方案，支持 `false/jsonp/require/import` 等值；

  - `asyncChunks`：效果与 [output.asyncChunks](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputasyncchunks) 相同，用于声明是否支持异步模块加载，默认值为 `true`。

- 函数：动态生成 Entry 配置信息，函数中可返回字符串、对象或数组；

- 数组：指明多个入口文件，数组项可以为上述介绍的文件路径字符串、对象、函数形式，Webpack 会将**数组指明的入口全部打包成一个 Bundle**。

  ```javascript
  module.exports = {
    //...
    entry: {
      // 字符串形态
      home: './home.js',
      // 数组形态
      shared: ['react', 'react-dom', 'redux', 'react-redux'],
      // 对象形态
      personal: {
        import: './personal.js',
        filename: 'pages/personal.js',
        dependOn: 'shared',//
        chunkLoading: 'jsonp',
        asyncChunks: true
      },
      // 函数形态
      admin: function() {
        return './admin.js';
      }
    },
  };
  ```

- 这里的dependon起到优化的作用 比如有两个入口有相同的依赖 那么单独写出来可以减少打包体积

- runtime代码是为了支持webpack打包之后的代码1可以在node或者浏览器里面运行。两个入口没有冲突的插件或者配置 依赖相同全局环境 没有特殊的代码分割规则 

**output**

- [output.path](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputpath)：声明产物放在什么文件目录下；

- [output.filename](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputfilename)：声明产物文件名规则，支持 `[name]/[hash]` 等占位符；

- [output.publicPath](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputpublicPath)：文件发布路径，在 Web 应用中使用率较高；

  Q：这是个什么

- [output.clean](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputclean)：清除上一次的构建产物；

- [output.library](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputlibrary)：NPM Library 形态下的一些产物特性，例如：Library 名称、模块化(UMD/CMD 等)规范；

- [output.chunkLoading](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputchunkloading)：声明加载异步模块的技术方案，支持 `false/jsonp/require` 等方式。

- 等等。





## 资源模块（asset module）

1. asset/resource（将资源文件作为单独的文件输出，返回一个指向该文件的 URL。）
2. asset/inline（导出dataUrl  将资源文件的内容编码为 Base64，并内联到 JavaScript 或 CSS 文件中）
3. asset/source（导出源代码 用于需要访问资源文件内容而不是文件本身的场景 比如txt）
4. asset（通用类型 根据资源大小在导出data URL 和 发送一个单独的文件之间做选择 资源文件大于8k创建一个资源 也就是resource 否则作为inline生成一个base64链接）


> **Data URL (Data URI)**
>
> - **定义**：Data URL 是一种特殊类型的 URL，它将资源的编码数据直接嵌入到 URL 中。它通常以 data: 开头，后跟 MIME 类型和数据编码。
>
> - **用途**：Data URL 用于内联资源，如小图标、背景图片或字体，可以减少 HTTP 请求的数量，从而提高页面加载速度。可能会显著增加文件大小。（使用 Base64 编码，这是一种编码方法，可以将二进制数据转换成 ASCII 字符串。Base64 编码的数据大小通常是原始数据大小的 4/3 倍（大约 33% 的增加）)





## loader

webpack本身只能处理js文件和json文件 loader让webpack能够处理其他类型的文件 转换成模块 添加到依赖图中

loader有两个属性：test 用于识别需要转换的文件 use 定义需要使用的loader




#### **webpack处理CSS**

- [`css-loader`](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Floaders%2Fcss-loader%2F)：该 Loader 会将 CSS 等价翻译为形如 `module.exports = "${css}"` 的JavaScript 代码，使得 Webpack 能够如同处理 JS 代码一样解析 CSS 内容与资源依赖；
- [`style-loader`](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Floaders%2Fstyle-loader%2F)：该 Loader 将在产物中注入一系列 runtime 代码，这些代码会将 CSS 内容注入到页面的 `<style>` 标签，使得样式生效；
- [`mini-css-extract-plugin`](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fplugins%2Fmini-css-extract-plugin)：该插件会将 CSS 代码抽离到单独的 `.css` 文件并压缩，并将文件通过 `<link>` 标签方式插入到页面中。把css文件抽离有利于提高页面性能，这样**css文件 js文件就可以并行加载**。（这个库同时提供plugin loader）
- `css-minimizer-webpack-plugin`：对生成的css文件进行压缩


> 经过 `style-loader` + `css-loader` 处理后，样式代码最终会被写入 Bundle 文件，并在运行时通过 `style` 标签注入到页面。这种将 JS、CSS 代码合并进同一个产物文件（文件里既有css规则 又有js代码 就比如动态创建style标签）的方式有几个问题：
>
> - JS、CSS 资源无法并行加载，从而降低页面性能；
>   - 浏览器必须下载并且执行js代码 才能解析其中的css规则 关键渲染路径延长
> - 资源缓存粒度变大，JS、CSS 任意一种变更都会致使缓存失效。
>
> 







`css-loader` 提供了很多处理 CSS 代码的基础能力，包括 CSS 到 JS 转译、依赖解析、Sourcemap、css-in-module 等，基于这些能力，Webpack 才能像处理 JS 模块一样处理 CSS 模块代码。最新红吧css文件转译成一段js字符串。这样的js代码并不能实际影响页面样式 。

`style-loader` 并不会对代码内容做任何修改，而是简单注入一系列运行时代码，用于将 `css-loader` 转译出的 JS 字符串插入到页面的 `style` 标签。

```javascript
// Part1: css-loader 处理结果，对标到原始 CSS 代码
const __WEBPACK_DEFAULT_EXPORT__ = (
"body {\n    background: yellow;\n    font-weight: bold;\n}"
);
// Part2: style-loader 处理结果，将 CSS 代码注入到 `style` 标签
injectStylesIntoStyleTag(
 __WEBPACK_DEFAULT_EXPORT__
)
//这个函数将在页面运行时触发 
```





**postcss css模块**

postcss：将 CSS 源码解析为 AST 结构，并传入 PostCSS 插件做处理的流程框架，达到给css添加前缀提高兼容性的效果

css模块：防止命名冲突

```javascript
 module: {
    rules: [
      {
        test: /\.css$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            }
          },
          {
            loader: 'postcss-loader'
              
          }
        ]
      }
    ]
```

1. **`postcss-loader`** 首先执行，因为它位于 `use` 数组的最右边。它会处理所有的 CSS 文件，包括通过 `@import` 导入的文件。
2. **`css-loader`** 接着执行，它将 CSS 转换成 JavaScript 对象，并处理 `@import` 规则。由于 `importLoaders: 1`，它会跳过 `postcss-loader`（因为它是左边的第一个加载器）。
3. **`style-loader`** 最后执行，它将 `css-loader` 生成的 JavaScript 对象中的 CSS 样式注入到页面中。



然后在项目根目录下创建 postcss.config.js

```javascript
module.exports = {
  plugins: [
    require('autoprefixer'),// 提供自动给样式加前缀去兼容浏览器
    require('postcss-nested')//编写嵌套的样式语法
  ]
 }
```



或者使用配置项

```javascript
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          "style-loader", 
          {
            loader: "css-loader",            
            options: {
              importLoaders: 1
              modules: true
            }
          }, 
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                // 添加 autoprefixer 插件
                plugins: [require("autoprefixer")],
              },
            },
          }
        ],
      },
    ],
  }
```



在 package.json 内增加如下实例内容

```javascript
"browserslist":[
	">1%",//全球使用率大于1%
	"last 2 versions"//每个浏览器中最新的两个版本
]
```


**css模块**

把module配置项设置为真

以模块形式导入

```javascript
import style from './style.css'
 const div = document.createElement('div')
 div.textContent = 'hello webpack'
 // style 里可以识别 class 样式
 div.classList.add(style.box)
```

也可以通过正则匹配部分开启模块模式





#### babel处理js



babel/core

- **作用**：Babel 的核心库，负责 JavaScript 代码的转换工作。

- **用途**：`@babel/core` 是 Babel 的主要执行引擎，**它提供了将代码从一个版本转换到另一个版本的能力。它本身不包含任何转换规则或插件，这些需要通过预设（presets）和插件（plugins）来提供。**他相当于一个平台

  

babel-loader

- **作用**：Webpack 加载器，用于在 Webpack 构建过程中调用 Babel。

- **用途**：`babel-loader` 可以在 Webpack 构建流程中集成 Babel，自动将 JavaScript 文件通过 Babel 进行转译。

  

babel/preset-env

- **作用**：Babel 预设，一组插件的集合。
- **用途**：**`@babel/preset-env` 是一个智能预设，它会自动确定你的代码需要转换成的 JavaScript 版本，基于你指定的目标环境**（如浏览器版本或 Node.js 版本）。它包含了一系列的插件，用于处理 ES6+ 的语法和 API，如箭头函数、模块导入、`async/await` 等。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                [... 2073 chars omitted ...]
```javascript
{
	test:/\.js$/,
    exclude:/node_modules/,
    use:{
        loader:'babel-loader',
        options:{
            preset:['@babel/preset-env']
        }
    }
}
```



regeneratorRuntime是webpack打包生成的全局辅助函数 由babel生成 用于兼容await async 需要下载一下插件才能正常使用
`npm i @babel/runtime（运行时需要） @babel/plugin-transform-runtime（编译需要） `

```javascript
{
	test:/\.js$/,
    exclude:/node_modules/,
    use:{
        loader:'babel-loader',
        options:{
            preset:['@babel/preset-env'],
            plugins:[
            	[
            		'@babel/plugin-transform-runtime'
            	]
            ]
        }
    }
}
```




## 代码分离

用于获取更小的bundle 控制资源加载的优先级

**手动配置入口文件** 如果入口文件里引用了相同的模块 这些模块会被重复引用


```javascript
entry:{
    index:'./src/index.js'
    another:'src/another-module.js'
};
```


**使用entry dependencies 或者 splitChunksPlugin 去重** 分离代码(把公共的文件处理成单独的chunk 在多个文件之间共享chunk)
```javascript
entry:{
    index:{
        import:'./src/index.js',
        dependOn:'shared'
    },
    another:{
        import:'./src/another-module.js'
        dependOn:'shared'
    },
    shared:'lodash'
}
```

使用split-chunk-plugin

```javascript
optimization:{
	splitChunks:{
        chunks:'all'
    }
}
```



**动态导入** 

Webpack 默认会将同一个 Entry 下的所有模块全部打包成一个产物文件 —— 包括那些与页面 [关键渲染路径](https://link.juejin.cn/?target=https%3A%2F%2Fweb.dev%2Fcritical-rendering-path%2F) 无关的代码，这会导致页面初始化时需要花费多余时间去下载这部分暂时用不上的代码，影响首屏渲染性能

通过模块的内联函数调用来分离代码 可以用于懒加载

**过度使用会使产物变得过度细碎，产物文件过多，运行时 HTTP 通讯次数也会变多**，在 HTTP 1.x 环境下这可能反而会降低网络性能，得不偿失；**二是使用时 Webpack 需要在客户端注入一大段用于支持动态加载特性的 Runtime**：

这段代码即使经过压缩也高达 2.5KB 左右，如果动态导入的代码量少于这段 Runtime 代码的体积，那就完全是一笔赔本买卖了。

因此，请务必慎重，多数情况下我们没必要为小模块使用动态加载能力！

常见的用法是配合 SPA 的前端路由能力实现页面级别的动态加载 也就是路由

```javascript
function getComponent() {
  return import(/* webpackChunkName: 'lodash', webpackPrefetch: true */ 'lodash')
    .then(({ default: _ }) => {
      const element = document.createElement('div');
      element.innerHTML = _.join(['Hello', 'webpack'], ' ');
      return element;
    })
    .catch((error) => {
      console.error('An error occurred while loading the component', error);
      return 'An error occurred while loading the component';
    });
}

getComponent().then((component) => {
  if (component instanceof HTMLElement) {
    document.body.appendChild(component);
  } else {
    // 处理错误消息，例如显示在页面上或记录到控制台
    console.error(component);
  }
});
```

懒加载：把代码在逻辑断点处分离 在一些代码块里完成某些操作后，立即或即将引用另外一些代码块  可以发现在某些模块使用时network里才会出现对应的请求

```javascript
const button = document.createElement('button')
 button.textContent = '点击执行加法运算'
 button.addEventListener('click', () => {
 import(/* webpackChunkName: 'math' */ './math.js').then(({ add 
}) => {
 console.log(add(4, 5))
 })
 })
 document.body.appendChild(button)
```


**预获取/预加载模块**

prefetch preload

preload会在父chunk加载时 以并行方式开始加载；prefetch 会在父chunk、加载结束 浏览器空闲时开始下载 、

其实就是在最终的html文件里面生成一个link标签 这个标签的rel值是prwload还是prefetch

preload就和懒加载相似

这样引入 点击才会下载

```javascript
// 导入模块
//...
 import './async-module'
 //...
 const button2 = document.createElement('button')
 button2.textContent = '点击执行字符串打印'
 button2.addEventListener('click', () => {
 import( /* webpackChunkName: 'print', webpackPreload: true */ 
'./print.js').then(({
 print
 }) => {
 print()
 })
 })
 document.body.appendChild(button2)

//这样会和父chunk并行
//...
 import( /* webpackChunkName: 'print', webpackPreload: true */ 
'./print.js').then(({
 print
 }) => {
 print()
 })
```



## 缓存

确保资源可以被浏览器缓存 当内容改变时请求到新的文件

Webpack 只是一个工程化构建工具，没有能力决定应用最终在网络分发时的缓存规则，但我们可以调整产物文件的名称(通过 Hash)与内容(通过 [Code Splitting](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fguides%2Fcode-splitting%2F))，使其更适配 HTTP 持久化缓存策略。

- `[fullhash]`：整个项目的内容 Hash 值，项目中任意模块变化都会产生新的 `fullhash`；
- `[chunkhash]`：产物对应 Chunk 的 Hash，Chunk 中任意模块变化都会产生新的 `chunkhash`；
- `[contenthash]`：产物内容 Hash 值，仅当产物内容发生变化时才会产生新的 `contenthash`，因此实用性较高

> 也可以通过占位符传入 Hash 位数，如 `[contenthash:7]` ，即可限定生成的 Hash 长度。



不过有一个边际 Case 需要注意：**异步模块变化会引起主 Chunk Hash 同步发生变化**

这是因为在主chunk 中需要记录异步 Chunk 的真实路径，异步 Chunk 的路径变化自然也就导致了父级 Chunk 内容变化，此时可以用 `optimization.runtimeChunk` 将这部分代码抽取为单独的 Runtime Chunk

**缓存第三方库**

第三方库基本不会修改 可以把第三方库提取到单独的vendor chunk文件里 可以利用浏览器的长效缓存机制 命中缓存来减少请求

> 文件内容改变但名字没有改变 浏览器不会重新请求文件 所以名字需要修改
>
>  `filename:'scripts/[name].[contenthash].js'` 这样文件名就会跟随内容改变了

```javascript
output: {
    chunkFilename: '[name].chunk.js', // 动态生成的 chunk 文件名
    filename: 'scripts/[name].[contenthash].js' //所有js文件输出到特定文件夹
  },


splitChunks:{
    cacheGroups:{
        vendor:{
            test:/[\\/]node_modules[\\/]/,
            name:'vendors' ,
            chunks:'all'
        }
    }
}
```

**持久化缓存**

- `cache.type`：缓存类型，支持 `'memory' | 'filesystem'`，需要设置为 `filesystem` 才能开启持久缓存；
- `cache.cacheDirectory`：缓存文件路径，默认为 `node_modules/.cache/webpack` ；
- `cache.buildDependencies`：额外的依赖文件，当这些文件内容发生变化时，缓存会完全失效而执行完整的编译构建，通常可设置为各种配置文件，
- `cache.managedPaths`：受控目录，Webpack 构建时会跳过新旧代码哈希值与时间戳的对比，直接使用缓存副本，默认值为 `['./node_modules']`；
- `cache.profile`：是否输出缓存处理过程的详细日志，默认为 `false`；
- `cache.maxAge`：缓存失效时间，默认值为 `5184000000` 。

使用cache配置项

```javascript
module.exports = {
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [
        path.join(__dirname, 'webpack.dll_config.js'),
        path.join(__dirname, '.babelrc')
      ],
    },
  },
};
```

缓存原理

Webpack5 会将首次构建出的 Module、Chunk、ModuleGraph 等对象序列化后保存到硬盘中，后面再运行的时候，就可以跳过许多耗时的编译动作，直接复用缓存数据。

webpack构建过程

- 初始化，主要是根据配置信息设置内置的各类插件。
- Make - 构建阶段，从入口文件开始
  - 读入文件内容；
  - 调用 Loader 转译文件内容；
  - 调用 [acorn](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Facorn) 生成 AST 结构；
  - 分析 AST，确定模块依赖列表；
  - 遍历模块依赖列表，对每一个依赖模块重新执行上述流程，直到生成完整的模块依赖图 —— ModuleGraph 对象。
- Seal - 生成阶段，过程：
  - 遍历模块依赖图，对每一个模块执行：
    - 代码转译，如 `import` 转换为 `require` 调用；
    - 分析运行时依赖。
  - 合并模块代码与运行时代码，生成 chunk；
  - 执行产物优化操作，如 Tree-shaking；
  - 将最终结果写出到产物文件。

> 过程中存在许多 CPU 密集型操作，例如调用 Loader 链加载文件时，遇到 babel-loader、eslint-loader、ts-loader 等工具时可能需要重复生成 AST；分析模块依赖时则需要遍历 AST，执行大量运算；Seal 阶段也同样存在大量 AST 遍历，以及代码转换、优化操作，等等。假设业务项目中有 1000 个文件，则每次执行 `npx webpack` 命令时，都需要从 0 开始执行 1000 次构建、生成逻辑。
>
> Q：抽象语法树有什么内容
>
> 而 Webpack5 的持久化缓存功能则将构建结果保存到文件系统中，在下次编译时对比每一个文件的内容哈希或时间戳，未发生变化的文件跳过编译操作，直接使用缓存副本，减少重复计算；发生变更的模块则重新执行编译流程。


**使用组件自带的缓存功能**

- [babel-loader](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fbabel-loader)；

  ```javascript
  rules: [{
              test: /\.m?js$/,
              loader: 'babel-loader',
              options: {
                  cacheDirectory: true,
              },
  ```

  
- [eslint-webpack-plugin](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Feslint-webpack-plugin)；

- [stylelint-webpack-plugin](https://link.juejin.cn/?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fstylelint-webpack-plugin)。

  ```javascript
  module.exports = {
    plugins: [
      new ESLintPlugin({ cache: true }),
      new StylelintPlugin({ files: '**/*.css', cache: true }),
    ],
  ```




## 使用splitChunks提升应用性能

**chunk**：用于组织，管理，优化最终产物。根据一系列默认 **分包策略** 决定哪些模块应该合并在一起打包；另一方面根据 `splitChunks` 设定的 **策略** 优化分包，决定最终输出多少产物文件。

在seal阶段

1. Webpack 首先根据 `entry` 配置创建若干 Chunk 对象；
2. 遍历构建(Make)阶段找到的所有 Module 对象，同一 Entry 下的模块分配到 Entry 对应的 Chunk 中；
3. 遇到**异步模块**则**创建新的 Chunk 对象**，并将异步模块放入该 Chunk；
4. 分配完毕后，根据 SplitChunksPlugin 的启发式算法进一步对这些 Chunk 执行**裁剪、拆分、合并、代码调优**，最终调整成运行性能(可能)更优的形态；
5. 最后，将这些 Chunk 一个个输出成最终的产物(Asset)文件，编译工作到此结束。



Webpack 默认会将以下三种模块做分包处理：

- Initial Chunk：`entry` 模块及相应子模块打包成 Initial Chunk；
- Async Chunk：通过 `import('./xx')` 等语句导入的异步模块及相应子模块组成的 Async Chunk；
- Runtime Chunk：运行时代码抽离成 Runtime Chunk，可通过 [entry.runtime](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Fentry-context%2F%23dependencies) 配置项实现。


Runtime Chunk 规则比较简单，本文先不关注，但 Initial Chunk 与 Async Chunk 这种略显粗暴的规则会带来两个明显问题：

1. 模块重复打包：如果多个chunk同时依赖于一个module 这个module会被重复打包
2. 资源冗余 低效缓存：打出来的包数量少 一个包里面就有大量代码 用户当下需要使用的可能只有一部分 但是却全部请求过来 而且一小部分更改之后 缓存就会失效



**SplitChunksPlugin**

`SplitChunksPlugin` 支持根据 Module 路径、Module 被引用次数、Chunk 大小、Chunk 请求数等决定是否对 Chunk 做进一步拆解，这些决策都可以通过 `optimization.splitChunks` 相应配置项调整定制


`splitChunks` 主要有两种类型的配置：

- `minChunks/minSize/maxInitialRequest` 等分包条件，满足这些条件的模块都会被执行分包；
- `cacheGroup` ：用于为特定资源声明特定分包条件，例如可以为 `node_modules` 包设定更宽松的分包条件。


1. 设置分包范围

   `SplitChunksPlugin` 默认情况下只对 Async Chunk 生效，我们可以通过 `splitChunks.chunks` 调整作用范围，该配置项支持如下值：

   - 字符串 `'all'` ：对 Initial Chunk 与 Async Chunk 都生效，建议优先使用该值；
   - 字符串 `'initial'` ：只对 Initial Chunk 生效；
   - 字符串 `'async'` ：只对 Async Chunk 生效；
   - 函数 `(chunk) => boolean` ：该函数返回 `true` 时生效；

2. 根据module使用频率分包

   需用 `splitChunks.minChunks` 配置项设定最小引用次数，比如把这个配置项设置成2，那么只有引用次数超过2的模块才进行分包，注意，这里"被 Chunk 引用次数"并不直接等价于被 `import` 的次数，而是取决于上游调用者是否被视作 Initial Chunk 或 Async Chunk 处理

3. 限制分包数量

   为防止最终产物文件数量过多导致 HTTP 网络请求数剧增，反而降低应用性能，Webpack 还提供了 `maxInitialRequest/maxAsyncRequest` 配置项，用于限制分包数量：

   - `maxInitialRequest`：用于设置 Initial Chunk 最大并行请求数；

   - `maxAsyncRequests`：用于设置 Async Chunk 最大并行请求数。

     这里所说的"请求数"，是指加载一个 Chunk 时所需要加载的所有分包数。例如对于一个 Chunk A，如果根据分包规则(如模块引用次数、第三方包)分离出了若干子 Chunk A[¡]，那么加载 A 时，浏览器需要同时加载所有的 A[¡]，此时并行请求数等于 ¡ 个分包加 A 主包，即 ¡+1。

     并行请求数关键逻辑总结如下：

     - Initial Chunk 本身算一个请求；
     - Async Chunk 不算并行请求；
     - 通过 `runtimeChunk` 拆分出的 runtime 不算并行请求；
     - 如果同时有两个 Chunk 满足拆分规则，但是 `maxInitialRequests`(或 `maxAsyncRequest`) 的值只能允许再拆分一个模块，那么体积更大的模块会被优先拆解。

1. 限制分包体积

   - `minSize`： 超过这个尺寸的 Chunk 才会正式被分包；
   - `maxSize`： 超过这个尺寸的 Chunk 会尝试进一步拆分出更小的 Chunk；
   - `maxAsyncSize`： 与 `maxSize` 功能类似，但只对异步引入的模块生效；
   - `maxInitialSize`： 与 `maxSize` 类似，但只对 `entry` 配置的入口模块生效；
   - `enforceSizeThreshold`： 超过这个尺寸的 Chunk 会被强制分包，忽略上述其它 Size 限制。

   > 这些条件的优先级顺序为： `maxInitialRequest/maxAsyncRequests < maxSize < minSize`。而命中 `enforceSizeThreshold` 阈值的 Chunk 会直接跳过这些条件判断，强制进行分包。

2. 缓存组cacheGrops

   为不同文件组设置不同的规则，主要用于缓存第三方库

   ```javascript
   module.exports = {
     //...
     optimization: {
       splitChunks: {
         cacheGroups: {
           vendors: {
               test: /[\\/]node_modules[\\/]/,
               minChunks: 1,
               minSize: 0
           }
         },
       },
     },
   };
   //所有命中 vendors.test 规则的模块都会被归类 vendors 分组，优先应用该组下的 minChunks、minSize 等分包配置。
   ```

   `cacheGroups` 支持上述 `minSice/minChunks/maxInitialRequest` 等条件配置，此外还支持一些与分组逻辑强相关的属性，包括：

   - `test`：接受正则表达式、函数及字符串，所有符合 `test` 判断的 Module 或 Chunk 都会被分到该组；
   - `type`：接受正则表达式、函数及字符串，与 `test` 类似均用于筛选分组命中的模块，区别是它判断的依据是文件类型而不是文件名，例如 `type = 'json'` 会命中所有 JSON 文件；
   - `idHint`：字符串型，用于设置 Chunk ID，它还会被追加到最终产物文件名中，例如 `idHint = 'vendors'` 时，输出产物文件名形如 `vendors-xxx-xxx.js` ；
   - `priority`：数字型，用于设置该分组的优先级，若模块命中多个缓存组，则优先被分到 `priority` 更大的组。

   Webpack 提供了两个开箱即用的 `cacheGroups`，分别命名为 `default` 与 `defaultVendors`，默认配置：

   ```javascript
   module.exports = {
     //...
     optimization: {
       splitChunks: {
         cacheGroups: {
           default: {
             idHint: "",
             reuseExistingChunk: true,
             minChunks: 2,
             priority: -20
           },
           defaultVendors: {
             idHint: "vendors",
             reuseExistingChunk: true,
             test: /[\\/]node_modules[\\/]/i,
             priority: -10
           }
         },
       },
     },
   };
   ```
   
​	

- 将所有 `node_modules` 中的资源单独打包到 `vendors-xxx-xx.js` 命名的产物
- 对引用次数大于等于 2 的模块 —— 也就是被多个 Chunk 引用的模块，单独打包

​	关闭默认分组：default: false




#### 为什么说请求过多 将会阻塞页面？

1. 浏览器的并发请求限制：对同一个域名下的并发请求数量 限制在6个
2. HTTP1.1  每个请求都需要独立建立TCP链接 并且前一个请求完成了 才可以进行之后的请求、 http2支持多路复用 但是请求多了还是存在宽带竞争。
3. 页面加载遇到script link什么的 会停止加载开始下载解析这些文件
4. 


`SplitChunksPlugin` 的主体流程如下：

1. `SplitChunksPlugin` 尝试将命中 `minChunks` 规则的 Module 统一抽到一个额外的 Chunk 对象；
2. 判断该 Chunk 是否满足 `maxInitialRequests` 阈值，若满足则进行下一步；
3. 判断该 Chunk 资源的体积是否大于上述配置项minsize声明的下限阈值；
   - 如果体积**小于** `minSize` 则取消这次分包，对应的 Module 依然会被合并入原来的 Chunk
   - 如果 Chunk 体积**大于** `minSize` 则判断是否超过 `maxSize`、`maxAsyncSize`、`maxInitialSize` 声明的上限阈值，如果超过则尝试将该 Chunk 继续分割成更小的部分

> 虽然 `maxSize` 等阈值规则会产生更多的包体，但缓存粒度会更小，命中率相对也会更高，配合持久缓存与 HTTP2 的多路复用能力，网络性能反而会有正向收益。（多路复用 ：Http2支持在**单个TCP连接上同时发送多个请求 响应** **可以避免建立多个连接 减少网络延迟 提高效率** 在HTTP/1.x中，浏览器在一个TCP连接上串行发送请求，每个请求必须等待前一个请求的响应返回后才能继续发送。HTTP/2的多路复用允许在单个TCP连接上并行发送多个请求和响应，这意味着请求可以同时在同一个连接上发送和接收，而不必等待前一个请求完成。）




最佳分包策略，包括：

- 针对第三方库资源：
  - 可以将 `node_modules` 模块打包成单独文件(通过 `cacheGroups` 实现)，防止业务代码的变更影响 NPM 包缓存，同时建议通过 `maxSize` 设定阈值，防止 vendor 包体过大；
  - 更激进的，如果生产环境已经部署 HTTP2/3 一类高性能网络协议，甚至可以考虑将每一个 NPM 包都打包成单独文件，具体实现可查看小册[示例](https://link.juejin.cn/?target=https%3A%2F%2Fgithub1s.com%2FTecvan-fe%2Fwebpack-book-samples%2Fblob%2F50c9a47ce3%2Fsplitchunks-seperate-npm%2Fwebpack.config.js%23L19-L20)；
- 针对业务代码：
  - 设置 `common` 分组，通过 `minChunks` 配置项将使用率较高的资源合并为 Common 资源；
  - 首屏用不上的代码，尽量以异步方式引入；
  - 设置 `optimization.runtimeChunk` 为 `true`，将运行时代码拆分为独立资源。
## 拆分开发环境生产环境



公共路径：**publicPath**

用来指定应用程序中所有资源的基础路径

在不同的环境下 可能有不同的基础路径

```javascript
output:{
	publicPath:'http://localhost:8080/'
}
```

`publicPath` 被设置为 `'http://localhost:8080/assets/'`，这意味着所有通过 Webpack 引用的资源都将从这个 URL 加载。

```javascript
var logoImg = new Image();
logoImg.src = __webpack_require__.p + "images/logo.png";
```

这里 `__webpack_require__.p` 是 Webpack 用来动态插入 `publicPath` 的。当运行这段代码时，实际上生成的 `src` 属性将是：logoImg.src = "http://localhost:8080/assets/images/logo.png


**拆分配置文件**


npm**脚本**

修改package.json 

```javascript
{
	"scripts":{
        "start":"npx webpack serve -c ./config/webpack.config.dev.js"//背后会运行webpack-dev-server
        "build":"npx webpack -c ./config/webpack.config.prod.js"
    }
}
```

去掉性能warn

```javascript
//webpack.config
performance:{
	hint:false
}
```


### 

将公共配置提取到webpack.common.js中 
`npm i webpack-merge -D`

```javascript
consr {merge} = require('webpack-merge')
const commonConfig = require('...')
const productionConfig = require('...')
const developmentConfig = require('...')

module.exports = (env)=>{
	switch(){
		case env.development:
			return marge(commonConfig,developmentConfig)
		case env.production:
			return merge(commonConfig,productionConfig)
			
		default:
			return new Error('No sush config matched')
	
	}
}
//
{
	"scripts":{
        "start":"npx webpack serve -c ./config/webpack.config.js --env development"
        "build":"npx webpack -c ./config/webpack.config.dev.js -env production"
    }
}
```




#### 搭建vue全栈开发环境

1. 处理Vue SFC文件 运行vue应用

   使用vue-loader(`<template>` 内容会被转译为用于构造 [Virtual Dom](https://link.juejin.cn/?target=https%3A%2F%2Fvuejs.org%2Fguide%2Fextras%2Frendering-mechanism.html%23virtual-dom) 结构的 `render` 函数；`<script>` 标签导出的对象会被转译为 JavaScript 对象字面量形式。) 和css相关依赖解析vue文件

   ```javascript
   const path = require('path')
   const { VueLoaderPlugin } = require('vue-loader')
   const HtmlWebpackPlugin = require('html-webpack-plugin')
   
   module.exports = {
     devServer: {
       hot: true,
       open: true
     },
     module: {
       rules: [
         { test: /\.vue$/, use: ['vue-loader'] },
         { test: /\.css$/, use: ["style-loader", "css-loader"] },
       ]
     },
     plugins: [
       new VueLoaderPlugin(),
       new HtmlWebpackPlugin({
         templateContent: `
 <!DOCTYPE html>
 <html>
   <head>
     <meta charset="utf-8">
     <title>Webpack App</title>
   </head>
   <body>
     <div id="app" />
   </body>
 </html>
       `
       })
     ]
   }
   ```
   

   

2. 添加编译工具

   - 使用 `babel-loader`、`ts-loader` 等处理 SFC 的 `<script>` 模块；

   - 使用 `less-loader`、`sass-loader` 等处理 `<style>` 模块；

   - 使用 `pug-plain-loader` 等处理 `<template>` 模块。

     前面两个没什么好说的

     `<template>` 的处理规则会稍微不同，因为绝大部分 Webpack 模板类 Loader 都会返回一个模板函数，而不是编译好的 HTML 片段，这与 Vue SFC 将 `<template>` 编译为 `render` 函数的规则相冲突，此时通常需要使用一个返回原始的 HTML 字符串的 loader，例如使用 `pug-plain-loader`，而不是 `pug-loader`。设置 `<template>` 标签的 `lang = " pug"`

3. 搭建Vue SSR环境

   ssr可以解决SEO不友好 **Time-To-Content 更长**（由于客户端需要等待所有 JavaScript 资源都加载完毕后，才会开始渲染页面真正有意义的内容，所以 TTC 时间相对更长。） 的问题

   SSR 是一种在服务端将组件渲染 HTML 字符串并发送到浏览器，最后在浏览器上将这些 HTML 片段"激活"为客户端上可交互的应用(就是注入脚本啊你怎恶魔不说人话)技术。

   **使用@vue/server-renderer方案实现**

   项目架构：

   ```
   ├─ 5-2_use-ssr
   │  ├─ package.json
   │  ├─ server.js
   │  ├─ src
   │  │  ├─ App.vue
   │  │  ├─ entry-client.js
   │  │  ├─ entry-server.js
   │  ├─ webpack.base.js
   │  ├─ webpack.client.js
   │  └─ webpack.server.js
   ```

   入口文件：

   ```javascript
   //客户端
   import { createSSRApp } from "vue";
   import App from "./App.vue";
   
   
   createSSRApp(App).mount("#app");
   
   //服务端
   import { createSSRApp } from "vue";
   
   import App from "./App.vue";
   
   
   export default () => {
   
     return createSSRApp(App);
   
   };
   ```

   配置：

   ```javascript
   //客户端配置
   // webpack.client.js
   const Merge = require("webpack-merge");
   const path = require("path");
   const HtmlWebpackPlugin = require("html-webpack-plugin");
   const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
   const base = require("./webpack.base");
   
   // 继承自 `webpack.base.js`
   module.exports = Merge.merge(base, {
     mode: "development",
     entry: {
       // 入口指向 `entry-client.js` 文件
       client: path.join(__dirname, "./src/entry-client.js"),
     },
     output: {
       publicPath: "/",
     },
     module: {
       rules: [{ test: /\.css$/, use: ["style-loader", "css-loader"] }],
     },
     plugins: [
       // 这里使用 webpack-manifest-plugin 记录产物分布情况
       // 方面后续在 `server.js` 中使用
       new WebpackManifestPlugin({ fileName: "manifest-client.json" }),
       // 自动生成 HTML 文件内容
       new HtmlWebpackPlugin({
         templateContent: `
 <!DOCTYPE html>
 <html>
 <head>
   <meta charset="utf-8">
   <title>Webpack App</title>
 </head>
 <body>
   <div id="app" />
 </body>
 </html>
 `,
       }),
     ],
   });
   //服务端
   // webpack.server.js
   const Merge = require("webpack-merge");
   const path = require("path");
   const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
   const base = require("./webpack.base");
   
   module.exports = Merge.merge(base, {
     entry: {
       server: path.join(__dirname, "src/entry-server.js"),
     },
     target: "node",
     output: {
       // 打包后的结果会在 node 环境使用
       // 因此此处将模块化语句转译为 commonjs 形式
       libraryTarget: "commonjs2",
     },
     module: {
       rules: [
         {
           test: /\.css$/,
           use: [
             // 注意，这里用 `vue-style-loader` 而不是 `style-loader`
             // 因为 `vue-style-loader` 对 SSR 模式更友好
             "vue-style-loader",
             {
               loader: "css-loader",
               options: {
                 esModule: false,
               },
             },
           ],
         },
       ],
     },
     plugins: [
       // 这里使用 webpack-manifest-plugin 记录产物分布情况
       // 方面后续在 `server.js` 中使用
       new WebpackManifestPlugin({ fileName: "manifest-server.json" }),
     ],
   });
   
   ```

   server.js

   ```javascript
   // server.js
   const express = require("express");
   const path = require("path");
   const { renderToString } = require("@vue/server-renderer");
   
   // 通过 manifest 文件，找到正确的产物路径
   const clientManifest = require("./dist/manifest-client.json");
   const serverManifest = require("./dist/manifest-server.json");
   const serverBundle = path.join(
     __dirname,
     "./dist",
     serverManifest["server.js"]
   );
   // 这里就对标到 `entry-server.js` 导出的工厂函数
   const createApp = require(serverBundle).default;
   
   const server = express();
   
   server.get("/", async (req, res) => {
     const app = createApp();
   
     const html = await renderToString(app);
     const clientBundle = clientManifest["client.js"];
     res.send(`
 <!DOCTYPE html>
 <html>
     <head>
       <title>Vue SSR Example</title>
     </head>
     <body>
       <!-- 注入组件运行结果 -->
       <div id="app">${html}</div>
       <!-- 注入客户端代码产物路径 -->
       <!-- 实现 Hydrate 效果 -->
       <script src="${clientBundle}"></script>
     </body>
 </html>
 `);
   });
   
   server.use(express.static("./dist"));
   
   server.listen(3000, () => {
     console.log("ready");
   });
   
   ```

   ##### 使用SSG

   阿巴 没有成熟替换方案

4. 使用脚手架
