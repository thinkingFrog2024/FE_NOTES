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

- [output.publicPath](https://link.juejin.cn/?target=https%3A%2F%2Fwebpack.js.org%2Fconfiguration%2Foutput%2F%23outputpublicpath)：文件发布路径，在 Web 应用中使用率较高；

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
> - **用途**：Data URL 用于内联资源，如小图标、背景图片或字体，可以减少 HTTP 请求的数量，从而提高页面加载速度。可能会显著增加文件大小。（使用 Base64 编码，这是一种编码方法，可以将二进制数据转换成 ASCII 字符串。Base64 编码的数据大小通常是原始数据大小的 4/3 倍（大约 33% 的增加））





## loader

webpack本身只能处理js文件和json文件 loader让webpack能够处理其他类型的文件 转换成模块 添加到依赖图中

loader有两个属性：test 用于识别需要转换的文件 use 定义需要使用的loader





#### **webpack处理css**

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
- **用途**：**`@babel/preset-env` 是一个智能预设，它会自动确定你的代码需要转换成的 JavaScript 版本，基于你指定的目标环境**（如浏览器版本或 Node.js 版本）。它包含了一系列的插件，用于处理 ES6+ 的语法和 API，如箭头函数、模块导入、`async/await` 等。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

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

   需用 `splitChunks.minChunks` 配置项设定最小引用次数，比如把这个配置项设置成2，那么只有引用次数超过2的模块才进行分包，注意，这里“被 Chunk 引用次数”并不直接等价于被 `import` 的次数，而是取决于上游调用者是否被视作 Initial Chunk 或 Async Chunk 处理

3. 限制分包数量

   为防止最终产物文件数量过多导致 HTTP 网络请求数剧增，反而降低应用性能，Webpack 还提供了 `maxInitialRequest/maxAsyncRequest` 配置项，用于限制分包数量：

   - `maxInitialRequest`：用于设置 Initial Chunk 最大并行请求数；

   - `maxAsyncRequests`：用于设置 Async Chunk 最大并行请求数。

     这里所说的“请求数”，是指加载一个 Chunk 时所需要加载的所有分包数。例如对于一个 Chunk A，如果根据分包规则(如模块引用次数、第三方包)分离出了若干子 Chunk A[¡]，那么加载 A 时，浏览器需要同时加载所有的 A[¡]，此时并行请求数等于 ¡ 个分包加 A 主包，即 ¡+1。

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

   SSR 是一种在服务端将组件渲染 HTML 字符串并发送到浏览器，最后在浏览器上将这些 HTML 片段“激活”为客户端上可交互的应用(就是注入脚本啊你怎恶魔不说人话)技术。

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
> 使用 Webpack 的插件来管理 source map 的生成和使用，例如 `webpack-source-map-plugin`。这个插件允许你更细粒度地控制 source map 的生成。
>
> 4. 内联 source map
>
> 另一种方法是使用内联 source map，将 source map 作为数据 URL 内联在 JavaScript 文件中。这样，source map 不会作为单独的文件存在，但仍然可以被开发者工具使用。
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
> 使用服务端的 source map 服务来动态提供 source map 文件。例如，你可以设置一个中间件，当接收到错误信息时，通过中间件查询数据库或文件系统来提供对应的 source map。
>
> 6. 访问控制
>
> 确保 source map 文件的访问受到严格控制，只允许特定的 IP 地址或经过身份验证的用户访问。
>
> 7. 使用专用的错误追踪服务
>
> 使用如 Sentry、Rollbar 或 Bugsnag 等错误追踪服务，它们支持 source map，并提供了安全的方式来处理生产环境中的错误。
>
> 9. 使用 .htaccess 或服务器配置限制访问
>
> 如果你决定将 source map 文件存储在服务器上，可以使用 `.htaccess`（对于 Apache）或相应的服务器配置来限制对这些文件的访问。
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
module.exports = {
     //...
     devServer: {
         proxy: {
         	'/api': 'http://localhost:4001',//对 /api/users 的请求会将请求代理到http://localhost:4001/api/users 
             '/api': {
                 target: 'http://localhost:4001',
                 pathRewrite: { '^/api': '' },
                 },//重写路径
         },
     },
 };
```

**使用https 或者http2**

此时我们访问 http://localhost:port 是无法访问我们的服务的，我们需要在地 址栏里加前缀：https: 注意:由于默认配置使用的是自签名证书，所以有得浏览器会 告诉你是不安全的，但我们依然可以继续访问它

```javascript
devServer: {
 	 https: true,  // https//localhost...
     http2: true,  // https//localhost...
     historyApiFallback:true
     host：’0.0.0.0‘//开发服务器主机
 },
```



**historyApiFallback**

如果我们的应用是个SPA(单页面应用)，当路由到/some时，会发现控制台会报错。 GET http://localhost:3000/some 404 (Not Found)———浏览器把这个路由当作了 静态资源地址去请求，然而我们并没有打包出/some这样的资源。 

> 设置 `historyApiFallback: true` 时，Webpack Dev Server 会做以下几件事情：
>
> 1. **捕获 404 错误**：当服务器无法找到请求的资源并准备返回 404 错误时，Webpack Dev Server 会捕获这个错误。
> 2. **返回 `index.html`**：而不是显示 404 错误页面，服务器将返回应用程序的 `index.html` 文件。这是因为 `index.html` 是 SPA 的入口点，里面包含了加载应用程序逻辑的脚本和样式表。
> 3. **客户端路由接管**：一旦 `index.html` 被加载，客户端路由库（如 React Router 或 Vue Router）将接管路由。这意味着，即使用户直接访问的是 `/about` 路径，应用程序也会正确地加载和显示 "About" 组件或页面。
>
> 当 `historyApiFallback: true` 时，服务器不会区分路由请求和静态文件请求，它将所有请求都返回 `index.html`。这在开发环境中很有用，但在生产环境中可能不是最佳选择。
>



**热替换（HMR）与热加载**

热加载：晚间更新 自动刷新服务和页面

热替换：在应用程序运行时 可以替换 添加 删除模块 不需要重新加载整个模块

​	HMR加载样式：如果配置了style-loader 或css-loader 那就可以支持样式文件的热替换了（style.loader的实现使用了module.hot.accept）

```javascript
devServer: {
 	hot: true,
    liveReload: false, //默认为true，即开启热更新功能。
 },
```





## eslint

初始化eslint配置`npx eslint --init`

.eslint.json

```javascript
{
  "parser": "babel-eslint", // 使用 babel-eslint 作为解析器
  "parserOptions": {
    "ecmaVersion": 2020, // 指定 ECMAScript 版本
    "sourceType": "module", // 指定代码为 ES 模块
    "ecmaFeatures": {
      "jsx": true // 启用 JSX
    }
  },
  "extends": [
    "eslint:recommended", // 继承推荐的规则集
    "plugin:react/recommended" // 继承 React 推荐的规则集
  ],
  "plugins": [
    "react", // 启用 React 插件
    "jsx-a11y", // 启用 JSX 可访问性插件
    "import" // 启用 import 插件
  ],
  "rules": {
    "semi": ["error", "always"], // 要求语句终止符
    "quotes": ["error", "double"], // 要求使用双引号
    "no-console": "warn", // 警告时不允许使用 console
    "react/prop-types": "off", // 关闭 React 的 prop-types 规则
    "jsx-a11y/alt-text": "error", // 要求所有 img 标签有 alt 属性
    "import/no-unresolved": ["error", { "commonjs": true }] // 要求 import 的模块必须能被解析
  },
  "env": {
    "browser": true, // 定义全局变量，适用于浏览器环境
    "node": true, // 适用于 Node.js 环境
    "es2020": true // 启用 ES2020 全局变量
  },
  "globals": {
    "$": "readonly", // 定义 $ 为全局变量，只读
    "console": "readonly", // 定义 console 为全局变量，只读
    "document": "readonly" // 定义 document 为全局变量，只读
  },
  "settings": {
    "react": {
      "version": "detect" // 自动检测 React 版本
    },
    "import/resolver": {
      "node": {
        "extensions": [".js", ".jsx", ".json"] // 定义 import 解析的扩展名
      }
    }
  },
  "ignorePatterns": [
    "node_modules/", // 忽略 node_modules 文件夹
    "build/" // 忽略 build 文件夹
  ],
  "overrides": [
    {
      "files": ["*.js", "*.jsx"], // 仅对 .js 和 .jsx 文件生效
      "rules": {
        "strict": "error" // 对于 JavaScript 文件，严格模式设置为错误
      }
    },
    {
      "files": ["*.test.js", "*.e2e.js"], // 仅对测试文件生效
      "env": {
        "jest": true // 定义 jest 测试环境
      },
      "rules": {
        "no-unused-expressions": "off" // 测试文件中禁用 no-unused-expressions 规则
      }
    }
  ]
}
```



检查当前文件夹下的src里的内容 `npx eslint ./src`

添加脚本命令检查src文件夹下的内容

```javascript
"scripts": {
 // ...others
 "eslint": "eslint ./src"
 }
```



**实时提示报错**

```javascript
 test: /\.(js|jsx)$/,
 exclude: /node-modules/,
 use: ['babel-loader', 'eslint-loader']
```

需要关闭热加载

## git-hooks与husky

通过husky来协助进行代码提交时的eslint校验

1. `ls -a`显示隐藏目录
2. 进入.git文件 `cd .git` `ls -a`
3. `cd hooks` `ls-a`可以看到很多git命令相关的文件名
4. `cat pre-commit.sample` 然后可以看到一段话- To enable this hook, rename this file to "pre-commit". 意思是要启用这个钩子的话，我们就把这个文件的后缀名去掉。

 虽然这样对我们本地来讲是可行的，但要注意，.git文件夹的改动无法同步到远端仓 库。 所以我们期望将git-hooks的执行权移交到外面来 

在项目根目录下新建一个.mygit文件夹 新增一个pre-commit文件 写入eslint src

项目根目录下执行` git config core.hooksPath .mygithooks` 移交了git hook的执行权限 再执行`chmod +x .mygithooks/pre-commit` 让操作系统给出这个文件的可执行权限



#### 使用husky

`npm husky installed`

husky是一个管理git钩子的工具 

在package.json中配置

```javascript
"scripts":{
	"prepare":"husky install“//prepare是node的一个生命周期 将会在每次npm install之前执行 husky install是husky的初始化命令 执行之后会创建钩子文件
}
```

在.husky文件夹下创建pre-commit文件  eslint ./src



如果不能正常使用

1. 执行`git config --list`查看core.hooksPath配置是否正确执行.husky 如果没有 执行`git config core.hooksPath .husky`
2. 检查是不是可执行文件

## 模块解析

能在webpack工程化环境里成功导入的模块，都可以视作webpack模块。 与  Node.js 模块相比，webpack 模块 能以各种方式表达它们的依赖关系。下面是 一些示例：

1. ES2015 import 语句 

2. CommonJS require() 语句 

3. AMD define 和 require 语句 

4. css/sass/less 文件中的 @import 语句 

5. stylesheet  url(...) 或者 HTML  文件中的图片链接





在我们运行webpack的时候(就是我们执行webpack命令进行打包时)，其实就是相当 于执行了下面的代码：

```javascript
const webpack = require('webpack');
const compiler = webpack({ // ...这是我们配置的webpackconfig对象 }) 
```



 webpack的执行会返回一个描述webpack打包编译整个流程的对象，我们将其称之 为compiler。 compiler对象描述整个webpack打包流程———它内置了一个打包状态，随着打包过程的进行，状态也会实时变更，同时触发对应的webpack生命周期 钩子。  每一次webpack打包，就是创建一个compiler对象，走 完整个生命周期的过程。 而webpack中所有关于模块的解析，都是compiler对象里的内置模块解析器去工作 的————简单点讲，你可以理解为这个对象上的一个属性，我们称之为 Resolvers。 webpack的Resolvers解析器的主体功能就是模块解析，它是基于 enhanced-resolve 这个包实现的。换句话讲，在webpack中，无论你使用怎样的 模块引入语句，本质其实都是在调用这个包的api进行模块路径解析。



**路径解析规则**

通过enhanced-resolve webpack能解析三种文件路径

1. 绝对路径
2. 相对路径
3. 模块路径

当引入路径只写到文件夹 webpack会默认添加后缀/index.js 

不写文件拓展名时 会按照配置文件里的 resolve.extensions里的顺序引入

**配置路径别名**

把绝对路径配置成一个模块路径

```javascript
module.exports = {
 //...
 resolve: {
 alias: {
 "@utils": path.resolve(__dirname, 'src/utils/')
 },
 }
```



## 配置结构

- **单个配置对象**：比较常用的一种方式，逻辑简单，适合大多数业务项目；
- **配置对象数组**：每个数组项都是一个完整的配置对象，每个对象都会触发一次单独的构建，通常用于需要为同一份代码构建多种产物的场景，如 Library；
- **函数**：Webpack 启动时会执行该函数获取配置，我们可以在函数中根据环境参数(如 `NODE_ENV`)动态调整配置对象。

使用数组方式时，Webpack 会在启动后创建多个 `Compilation` 实例，并行执行构建工作，但需要注意，`Compilation` 实例间基本上不作通讯，这意味着这种并行构建对运行性能并没有任何正向收益

配置函数方式要求在配置文件中导出一个函数，并在函数中返回 Webpack 配置对象，或配置数组，或 `Promise` 对象，运行时，Webpack 会传入两个环境参数对象：

- `env`：通过 `--env` 传递的命令行参数，适用于自定义参数
- `argv`：命令行Flags参数 



## 外部拓展

为了减小包的体积把一些不变的库用cdn引入

再html文件里引入jquery jquery会把自身暴露为全局变量jQuery

`<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>`

```javascript
externals:{
	'jquery': 'jQuery'//将 jquery 这个模块视为外部依赖，并且指定其在全局上下文中的变量名是 jQuery。
}
//也有函数模式 对象模式
```

使用上述配置后，Webpack 会 **预设** 运行环境中已经内置 jQuery 库 —— 无论是通过 CDN 还是其它方式注入，所以不需要再将这些模块打包到产物中

Webpack 会在最终的打包文件中将 `import $ from 'jquery';` 替换为 `var $ = window.jQuery;`，这样在运行时，代码会从全局上下文中获取 `jQuery` 变量





## Scope Hoisting 合并模块

默认情况下 Webpack 会将模块打包成一个个单独的函数，这种处理方式需要将每一个模块都包裹进一段相似的函数模板代码中，存在流量浪费， Scope Hoisting 功能，用于 **将符合条件的多个模块合并到同一个函数空间** 中，从而减少产物体积

例如:

```javascript
// common.js
export default "common";

// index.js
import common from './common';
console.log(common);

//不合并
"./src/common.js":
  ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
     const __WEBPACK_DEFAULT_EXPORT__ = ("common");
     __webpack_require__.d(__webpack_exports__, {
      /* harmony export */
      "default": () => (__WEBPACK_DEFAULT_EXPORT__)
      /* harmony export */
    });
  }),
"./src/index.js":
  ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
      var _common__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__( /*! ./common */ "./src/common.js");
      console.log(_common__WEBPACK_IMPORTED_MODULE_0__)
  })


//合并
((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
    ;// CONCATENATED MODULE: ./src/common.js
    /* harmony default export */ const common = ("common");
    
    ;// CONCATENATED MODULE: ./src/index.js
    console.log(common);
})
```

开启模块合并

```javascript
const ModuleConcatenationPlugin = require('webpack/lib/optimize/ModuleConcatenationPlugin');

module.exports = {
    // 方法1： 将 `mode` 设置为 production，即可开启
    mode: "production",
    // 方法2： 将 `optimization.concatenateModules` 设置为 true
    optimization: {
        concatenateModules: true,
        usedExports: true,
        providedExports: true,
    },
    // 方法3： 直接使用 `ModuleConcatenationPlugin` 插件
    plugins: [new ModuleConcatenationPlugin()]
};
//种方法最终都会调用 ModuleConcatenationPlugin 完成模块分析与合并操作。
```

与 Tree-Shaking 类似，Scope Hoisting 底层基于 ES Module 方案的 [静态特性](https://link.juejin.cn/?target=https%3A%2F%2Fstackoverflow.com%2Fquestions%2F52965907%2Fwhat-is-the-meaning-of-static-import-in-es6)，推断模块之间的依赖关系，并进一步判断模块与模块能否合并，因此在以下场景下会失效：

1. 非ESM模块：ESM是基于编译时，而AMD CMD是基于运行时 webpack不能确定合并是否有"副作用" 就跟tree-shaking一样 因从会关闭Scope Hositing。大部分NPM包都通过兼容性更好的CommonJs 这是可以通过mainFileds属性尝试引入·ESM版本

   ```javascript
   module.exports = {
     resolve: {
       // 优先使用 jsnext:main 中指向的 ES6 模块化语法的文件
       mainFields: ['jsnext:main', 'browser', 'main']
     },
   };
   ```

   

2. 模块被多个chunk引用

   如果一个模块被多个 Chunk 同时引用，为避免重复打包，Scope Hoisting 同样会失效.比如一个 initail chunk 一个async chunk 同时依赖于某个模块 这个模块不会被合并进任何一个chunk 



## 依赖图

使用`webpack-bundle-analyzer`实现

```java
 module.exports = {
     plugins: [
     	new BundleAnalyzerPlugin()
     ]
 }
```

执行打包 会在控制台打印日志 显示可视化打包产物依赖图地址



# 拓展功能



## 监视产物体积

18章





## web works

运算量过大(执行时间过长)的异步也会阻塞js事件循环，甚至会导致浏览 器假死状态。

这时候就可以应用html5的webworker

html5之前，打开一个常规的网页，浏览器会启用几个线程？

 一般而言，至少存在三个线程(公用线程不计入在内): 分别是js引擎线程(处理js)、GUI渲染线程(渲染页面)、浏览器事件触发线程(控制交互)

 当一段JS脚本长时间占用着处理机,就会挂起浏览器的GUI更新，而后面的事件响应也 被排在队列中得不到处理，从而造成了浏览器被锁定进入假死状态。

webWorkers提供了js的后台处理线程的API，它允许将复杂耗时的单纯js逻辑处理放 在浏览器后台线程中进行处理，让js线程不阻塞UI线程的渲染。 多个线程间也是可以通过相同的方法进行数据传递。

`//new Worker(scriptURL: string | URL, options?: WorkerOptions)`

`new Worker("someWorker.js");`

单独写一个js脚本，然后使用new Worker来创建一个Work线程实例。 这意味着并不是将这个脚本当做一个模块引入进来，而是单独开一个线程去执行这个脚本

示例：

```javascript
self.onmessage = ({ data: { question } }) => {
         self.postMessage({
         answer: 42,
     })
 }
```

在index.js里使用

```javascript
const worker = new Worker(new URL('./work.js', import.meta.url));
     worker.postMessage({
         	question:'hi，那边的workder线程，请告诉我今天的幸运数字是多少？',
         });
     worker.onmessage = ({ data: { answer } }) => {
         console.log(answer);
 		 };
```

打包之后可以看到一个单独打包出来的文件



## 集成ts

安装`ts-loader` 和 `types/typeScript`

```javascript
rules:[
	{
		test:/\.ts$/,
		use:'ts-loader',
		exclude:/node_modules/
	}
 
```

生成ts配置文件`npx tsc --init`

```javascript
compilerOptions": {
 "outDir": "./dist/",
 "noImplicitAny": true,
 "sourceMap": true,
 "module": "es6",
 "target": "es5",
 "jsx": "react",
 "allowJs": true,
 "moduleResolution": "node"  
}
```

注意，如果要使用eslint，使用初始化命令的时候，记得选择“使用了typesctipt”

如果已经配置了eslint，但没有配置ts相关的配置，那么我们需要先安装对应的 plugin 

`npm i -D  @typescript-eslint/eslint-plugin@latest  @typescript-eslint/parser@latest`

用了react也要装

`npm i  -D  eslint-plugin-react@latest`

修改eslint配置文件

```javascript
{
     "env": {
     "browser": true,
     "es2021": true
     },
     "extends": [
         "eslint:recommended", // 如果需要react的话
        "plugin:react/recommended",
         "plugin:@typescript-eslint/recommended"
     ],
     "parser": "@typescript-eslint/parser",
     "parserOptions": {
         "ecmaFeatures": {
         "jsx": true
         }, // 如果需要react的话
        "ecmaVersion": 13,
         "sourceType": "module"
     },
     "plugins": [
         "react",
         "@typescript-eslint"
     ],
     "rules": {
         // ...一些自定义的rules
         "no-console": "error"
     }
 };
```



## 多页面应用



也就是不不同的js脚本在不同的html页面上使用



**配置入口**

可以将一个文件路径数组传递给  entry 属性，这将创建一个所谓的 "multi main entry"。在你想要一次注入多个依赖文件，并且将它们的依赖关系绘制在一个  "chunk" 中时，这种方式就很有用。

```javascript
module.exports = {
     entry: ['./src/file_1.js', './src/file_2.js'],
     output: {
     	filename: 'bundle.js',
     },
 };
```

对象语法：

dependOn: 当前入口所依赖的入口。它们必须在该入口被加载前被加载。 

import: 启动时需加载的模块。 

filename: 指定要输出的文件名称。

library: 指定 library 选项，为当前 entry 构建一个 library。 

runtime: 运行时 chunk 的名字。如果设置了，就会创建一个新的运行时  chunk。在 webpack 5.43.0 之后可将其设为  false 以避免一个新的运行时  chunk。 

publicPath: 当该入口的输出文件在浏览器中被引用时，为它们指定一个公共  URL 地址。

runtime 和  dependOn(不能循环引用 也就是相互依赖) 不应在同一个入口上同时使用 会抛出错误

```javascript
module.exports = {
     entry: {
         a2: 'dependingfile.js',
         b2: {
             dependOn: 'a2',
             import: './src/app.js',
          },
     },
 };
```

这样会生成单独的依赖图·

在多页面应用程序中，server 会拉取一个新的 HTML 文档给你的客户端。 页面重新加载此新文档，并且资源被重新下载。然而，这给了我们特殊的机会去做很 多事，例如使用  optimization.splitChunks 为页面间共享的应用程序代码创建  bundle。由于入口起点数量的增多，多页应用能够复用多个入口起点之间的大量代 码/模块，从而可以极大地从这些技术中受益



**配置html模板**

```javascript
plugins: [
     new HtmlWebpackPlugin(), // Generates default index.html
     new HtmlWebpackPlugin({  // Also generate a test.html
         filename: 'test.html',
         template: 'src/assets/test.html'
         title:'dddd'
     })
	]
 }
```

使用定义的变量

```html
<title><%= htmlWebpackPlugin.options.title %></title>
```





##  treeShaking

移除未引用的代码

通过  package.json  的 " sideEffects" 属性作为标记，向 compiler 提供提示，表明项目中的哪些文件 是 "pure(纯正 ES2015 模块)"，由此可以安全地删除文件中未使用的部分

Webpack 跟踪整个应用程序的  import/export 语句，因此，如果它看到导入的东西最终没有被使用，它会认为那 是未引用代码(或叫做“死代码”—— dead-code)，并会对其进行 tree-shaking



```javascript
// 这会被看作“活”代码，不会做 tree-shaking
 import { add } from './math'
console.log(add(5, 6))
 // 导入并赋值给 JavaScript 对象，但在接下来的代码里没有用到
// 这就会被当做“死”代码，会被 tree-shaking
 import { add, minus } from './math'
 console.log(add(5, 6))
 // 导入但没有赋值给 JavaScript 对象，也没有在代码里用到
// 这会被当做“死”代码，会被 tree-shaking
 import { add, minus } from './math'
 console.log('hello webpack')
 // 导入整个库，但是没有赋值给 JavaScript 对象，也没有在代码里用到
// 非常奇怪，这竟然被当做“活”代码，因为 Webpack 对库的导入和本地代码导入的处理
方式不同。
import { add, minus } from './math'
 import 'lodash'
 console.log('hello webpack')
```

**sideEffects**

Webpack 不能百分百安全地进行 tree-shaking。有些模块导入，只要被引入， 就会对应用程序产生重要的影响。一个很好的例子就是全局样式表，或者设置全局配 置的JavaScript 文件。 Webpack 认为这样的文件有“副作用”。具有副作用的文件不应该做 tree-shaking， 因为这将破坏整个应用程序。

通过这个属性 告诉webpack那些文件是有副作用的



## 渐进式网络应用程序PWA

pwa最主要的功能是实现离线访问 同股票Service Workers的web技术实现的



**非离线环境下运行**

使用http-server搭建一个拥有更多基础特性的server

默认情况下， webpack DevServer 会写入到内存。我们需要启用  devserverdevmiddleware.writeToDisk 配置项，来让 http-server 处理  录中的文件。

```javascript
"scripts": {
 	"start": "http-server dist"
 },
```

```javascript
devServer: {
     devMiddleware: {
         index: true,
         writeToDisk: true,
     },
 },
```

此时如果停止 server 然后刷新， 则 webpack 应用程序不再可访问。



添加**workbox-webpack-plugin**

```javascript
module.exports = {
     entry: {
     	app: './src/index.js',
     },
     plugins: [
         new HtmlWebpackPlugin(),
         new WorkboxPlugin.GenerateSW({
         // 这些选项帮助快速启用 ServiceWorkers
         // 不允许遗留任何“旧的” ServiceWorkers
         clientsClaim: true,
         skipWaiting: true,
     }),
     output: {
         filename: '[name].bundle.js',
         path: path.resolve(__dirname, 'dist'),
         clean: true,
     },
 }
```

执行打包之后 生成一个service-worker.js 和一个名字很长的文件 那个名字很长的是service-worker引用的文件 也是可以运行的



**注册Service Worker**

index.js

```javascript
 if ('serviceWorker' in navigator) {
     window.addEventListener('load', () => {
         navigator.serviceWorker.register('/serviceworker.js').then(registration => {
     			console.log('SW registered: ', registration);
     		}).catch(registrationError => {
     			console.log('SW registration failed: ', registrationError);
     		});
     });
 }
```

再次运行  npx webpack 来构建包含注册代码版本的应用程序。然后用  npm start  启动服务。查看 console 控制台。在那里你应该 看到： SW registered

## Shiming预置依赖

一些 third party(第三方库) 可能会引用一些全局依赖（例如  jQuery  中的 $）。因此这些 library 也可能会创建一些需要导出的全局变量。这些 "broken  modules(不符合规范的模块)" 就是 shimming( 预置依赖 ) 发挥作用的地方

shim 另外一个极其有用的使用场景就是：当你希望  polyfill 扩展浏览器能力，来支持 到更多用户时。在这种情况下，你可能只是想要将这些 polyfills 提供给需要修补 (patch)的浏览器（也就是实现按需加载）





**预置全局变量**

将模块依赖修改为全局变量依赖

使用  ProvidePlugin 后，能够在 webpack 编译的每个模块中，通过访问一个变量 来获取一个 package。如果 webpack 看到模块中用到这个变量，它将在最终  bundle 中引入给定的 package

```javascript
const webpack = require('webpack')
     module.exports = {
         mode: 'development',
         entry: './src/index.js',
         plugins: [
             new webpack.ProvidePlugin({
             	_: 'lodash'
         })
     ]
 }
```

暴露出某个模块中单个导出，通过配置一个“数组路径” （ [module, child, ...children?]）实现此功能。

```javascript
plugins: [
     new webpack.ProvidePlugin({
     	join: ['lodash', 'join'],
     })
]
```



#### 细粒度shimming

有时代码中的this需要指向window 但是commonjs里this指向module.export   

这时可以使用imports-loader覆盖this指向

```javascript
rules: [
     {
         test: require.resolve('./src/index.js'),
         use: 'imports-loader?wrapper=window',
     },
  ]
```







#### 模块联邦技术



webpack5新特性

1. 可持续性缓存
2. 真正意义上的tree-shaking
3. 模块联邦



模块联邦可以在多个webpack编译产物之间共享模块 依赖 页面 应用 在不同模块之间进行数据的获取 



**底层分析**

将模块分为本地模块和远程模块 加载远程模块是异步操作 本地模块加载静态导入是同步的 动态导入是异步的 

当使用远程模块时，这些异步操作将被放置在远程模块和入口之间的下一个 chunk 的加载操作中，如果没有 chunk 加载操作，就不能使用远程模块。

（main.js会被webpack分成很多个chunk 这些远程模块的加载会被划分到某些chunk进行 关羽chunk分隔 之后再讨论）

容器是由容器入口创建的 这个入口暴露了对特定模块的异步访问 暴露的访问分为两个步骤

1. 异步加载模块

2. 同步执行模块

   加载模块将在 chunk 加载期间完成，执行模块将在与其他（本地和远程）的模块交错执行期间完成，这样一来，执行顺序不受模块从本地转换为远程或从远程转为本地的影响。

   容器可以嵌套使用，容器可以使用来自其他容器的模块。容器之间也可以循环依赖。 





`const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')`

remote 项目的webpack 配置

```javascript
const { Configuration  } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')
/**
 * @type {Configuration} //配置智能提示
 */
const config = {
    mode: "none",
    entry: "./index.js",
    output: {
        filename: "bundle.js"
    },
    devServer:{
        port:9002 //remote 9002
    },
    plugins:[
        new HtmlWebpackPlugin({
            template: "./index.html"
        }),
        new ModuleFederationPlugin({
            name: "remote", //name必填
            filename: "remoteEntry.js", //filename必填 生成的文件名
            exposes: {
                "./addList": "./list.js" //暴露的模块
            },
        })
    ]
}

module.exports = config

```

host

```javascript
const { Configuration  } = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ModuleFederationPlugin = require('webpack/lib/container/ModuleFederationPlugin')
/**
 * @type {Configuration} //配置智能提示
 */
const config = {
    mode: "none",
    entry: "./index.js",
    output: {
        filename: "bundle.js"
    },
    devServer:{
        port:9001
    },
    plugins:[
        new HtmlWebpackPlugin({
            template: "./index.html"
        }),
        new ModuleFederationPlugin({
            name: "host", //name必填
            filename: "hostEntry.js", //filename必填 生成的文件名
            //对应关系remote对应的remote项目ModuleFederationPlugin的name 后面url对应的port以及对应ModuleFederationPlugin的filename
            remotes: {
                remote: "remote@http://localhost:9002/remoteEntry.js" //引入模块
            },
        })
    ]
}

module.exports = config

```

host使用 模块是异步加载的

```javascript
//对应关系remote对应的remote项目的name addlist 对应的是key 
import('remote/addList').then(({ addList }) => {
   let app = document.querySelector('#app');

   app.innerHTML = `
   <h3>Host</h3>
`;
   addList()
})


```

打完包观察一下其实就是一个cdn引入

在之前我们十个项目共用一个模块 会发到npm 例如1.0.0 这个模块要改动 1.0.1，那每一个项目都要去重新install 一下 很繁琐，而模块联邦是cdn 引入 无需 重新安装每次就是最新的









# 微前端

 **微前端方案**

**iframe**

**qiankun**

**micro-app**

EMP

wujie









**webComponents**

Web Components 是一种现代 Web 技术，旨在允许开发者创建可重用的、封装的自定义元素（即 Web 组件），这些组件可以像标准的 HTML 元素一样在 Web 应用中使用。Web Components 主要由以下几部分组成：

1. **Custom Elements**：允许开发者定义自己的元素，这些元素可以扩展现有的 HTML 元素或创建全新的元素。
2. **HTML Templates**：提供了一种定义 HTML 内容模板的方法，这些模板在首次使用时可以被克隆并插入到文档中。
3. **Shadow DOM**：提供了一种将 HTML 和 CSS 封装在组件内部的方法，使得样式和结构不会泄露到组件外部。

```javascript
window.onload = () => {
    class WuJie extends HTMLElement {
        constructor() {
            super()
            this.init()
            this.getAttr('url')
        }
        init() {
          const shadow =  this.attachShadow({ mode: "open" }) //开启影子dom 也就是样式隔离
          const template = document.querySelector('#wu-jie') as HTMLTemplateElement
          console.log(template);
          
          shadow.appendChild(template.content.cloneNode(true))
        }
        getAttr (str:string) {
           console.log('获取参数',this.getAttribute(str));
           
        }

        //生命周期自动触发有东西插入
        connectedCallback () {
           console.log('类似于vue 的mounted');
        }
        //生命周期卸载
        disconnectedCallback () {
              console.log('类似于vue 的destory');
        }
        //跟watch类似
        attributeChangedCallback (name:any, oldVal:any, newVal:any) {
            console.log('跟vue 的watch 类似 有属性发生变化自动触发');
        }

    }
    
    window.customElements.define('wu-jie', WuJie)
}
```

**monorepo架构**

将多个项目或模块集中管理在单个代码仓库中的实践。

使用pnpm 

项目架构：

main（主应用）>web文件夹 里面存放子应用

在根目录下新建文件pnpm-wirkspace.yaml配置依赖项

没太懂 后面再说

```yaml
packages:
  # all packages in direct subdirs of packages/
  - 'main'
  # all packages in subdirs of components/
  - 'web/**'

```

他会把所有的公共依赖项抽到外层，而里层的依赖项都是一些最核心的









### **无界框架基本使用 **

[文档地址](https://link.juejin.cn/?target=https%3A%2F%2Fwujie-micro.github.io%2Fdoc%2Fguide%2F)

```javascript
import {startApp} from 'wujie'
//设置子应用
startApp({name：'唯一id'.url:'子应用地址',el:'子应用挂载的容器'})//必传参数
//作者对这个api进行了二次封装 如果使用vue2 vue3 react 可以直接使用封装好的组件


import wujie from 'wujie-vue3'
//...
createApp(App).use(router),use(wujie).mount('#app')


//在App.vue中使用子应用
<WujieVue url="子应用端口号" name="..."></WujieVue>
```





**原理解析**

项目架构：

src>index.ts(业务逻辑)+type.ts(声明文件)

index.d.ts(声明文件declare)

package.json

pnpm-lock.yaml

tsconfig.json

webpack.config.js

使用的依赖：wujie(这个是生产环境依赖)，vue,webpack,webpack-cli,typescript,ts-loader

index.ts

defineComponent和.vue文件都可以定义组件 但是definecomponent提供了更好的类型支持

type.ts

```javascript
import type { plugin } from 'wujie'
type lifecycle = (appWindow: Window) => any;
interface Props {
    /** 唯一性用户必须保证 */
    name: string;
    /** 需要渲染的url */
    url: string;
    /** 需要渲染的html, 如果用户已有则无需从url请求 */
    html?: string;
    /** 渲染的容器 */
    loading?: HTMLElement;
    /** 路由同步开关， false刷新无效，但是前进后退依然有效 */
    sync?: boolean;
    /** 子应用短路径替换，路由同步时生效 */
    prefix?: { [key: string]: string };
    /** 子应用保活模式，state不会丢失 */
    alive?: boolean;
    /** 注入给子应用的数据 */
    props?: { [key: string]: any };
    /** js采用fiber模式执行 */
    fiber?: boolean;
    /** 子应用采用降级iframe方案 */
    degrade?: boolean;
    /** 自定义运行iframe的属性 */
    attrs?: { [key: string]: any };
    /** 自定义降级渲染iframe的属性 */
    degradeAttrs?: { [key: string]: any };
    /** 代码替换钩子 */
    replace?: (codeText: string) => string;
    /** 自定义fetch，资源和接口 */
    fetch?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    /** 子应插件 */
    plugins: Array<plugin>;
    /** 子应用生命周期 */
    beforeLoad?: lifecycle;
    /** 没有做生命周期改造的子应用不会调用 */
    beforeMount?: lifecycle;
    afterMount?: lifecycle;
    beforeUnmount?: lifecycle;
    afterUnmount?: lifecycle;
    /** 非保活应用不会调用 */
    activated?: lifecycle;
    deactivated?: lifecycle;
};

export { Props } 

```

index.ts

```
import { startApp, bus } from 'wujie'
import { h, defineComponent, onMounted, getCurrentInstance, onBeforeUnmount } from 'vue'
import type { App, PropType } from 'vue'
import { Props } from './type'
const WuJie = defineComponent({
    props: {
        width: { type: String, default: "" },
        height: { type: String, default: "" },
        name: { type: String, default: "", required: true },
        loading: { type: HTMLElement, default: undefined },
        url: { type: String, default: "", required: true },
        sync: { type: Boolean, default: undefined },
        prefix: { type: Object, default: undefined },
        alive: { type: Boolean, default: undefined },
        props: { type: Object, default: undefined },
        attrs: { type: Object, default: undefined },
        replace: { type: Function as PropType<Props['replace']>, default: undefined },
        fetch: { type: Function as PropType<Props['fetch']>, default: undefined },
        fiber: { type: Boolean, default: undefined },
        degrade: { type: Boolean, default: undefined },
        plugins: { type: Array as PropType<Props['plugins']>, default: null },
        beforeLoad: { type: Function as PropType<Props['beforeLoad']>, default: null },
        beforeMount: { type: Function as PropType<Props['beforeMount']>, default: null },
        afterMount: { type: Function as PropType<Props['afterMount']>, default: null },
        beforeUnmount: { type: Function as PropType<Props['beforeUnmount']>, default: null },
        afterUnmount: { type: Function as PropType<Props['afterUnmount']>, default: null },
        activated: { type: Function as PropType<Props['activated']>, default: null },
        deactivated: { type: Function as PropType<Props['deactivated']>, default: null },
    },
    setup(props: Props, { emit }) {
        const instance = getCurrentInstance()
        const handlerEmit = (event: string, ...args: any[]) => {
            emit(event, ...args)
        }
        onMounted(() => {
            bus.$onAll(handlerEmit) //添加事件订阅
            //初始化无界
            startApp({
                name: props.name,
                url: props.url,
                el: instance?.refs.wujie as HTMLElement,
                loading: props.loading,
                alive: props.alive,
                fetch: props.fetch,
                props: props.props,
                attrs: props.attrs,
                replace: props.replace,
                sync: props.sync,
                prefix: props.prefix,
                fiber: props.fiber,
                degrade: props.degrade,
                plugins: props.plugins,
                beforeLoad: props.beforeLoad,
                beforeMount: props.beforeMount,
                afterMount: props.afterMount,
                beforeUnmount: props.beforeUnmount,
                afterUnmount: props.afterUnmount,
                activated: props.activated,
                deactivated: props.deactivated,
            })
        })

        onBeforeUnmount(() => {
            bus.$offAll(handlerEmit) //取消事件订阅
        })

        return () => h('div', {
            style: {
                width: 200,
                height: 200
            },
            ref: "wujie"
        }, '')
    }
})


WuJie.install = (app: App) => {
    app.component('wujie', WuJie)
}

export default WuJie

```

webpack

```
const { Configuration } = require('webpack')
const path = require('path')

/**
 * @type {Configuration} //配置智能提示
 */
const config = {
    entry: "./src/index.ts",
    output: {
        filename: "wujie.js",
        path:path.resolve(__dirname, './lib') ,
        library:"Wujie",
        libraryTarget:"umd",
        umdNamedDefine:true
    },
    externals:{
      vue:'vue',
      wujie:"wujie"
    },
    mode:"none",
    cache:true,
    module: {
        rules: [
            {
                test: /\.ts$/,  //解析ts
                loader: "swc-loader", //使用新技术swc-loader
            }
        ]
    },

}

module.exports = config

```

声明文件

```
import { bus, preloadApp, destroyApp, setupApp } from "wujie";
import type { App } from 'vue';

declare const WujieVue: {
    bus: typeof bus;
    setupApp: typeof setupApp;
    preloadApp: typeof preloadApp;
    destroyApp: typeof destroyApp;
    install: (app: App) => void
};

export default WujieVue;

```

package.json

```
{
  "name": "wujie-vue-setup",
  "version": "0.0.4",
  "description": "",
  "main": "lib/index.js",
  "module": "esm/index.js",
  "files": [
     "esm",
     "lib",
     "index.d.ts"
  ],
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "build": "webpack"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "wujie": "^1.0.13"
  },
  "devDependencies": {
    "@swc/core": "^1.3.42",
    "swc-loader": "^0.2.3",
    "ts-loader": "^9.4.2",
    "typescript": "^5.0.2",
    "vue": "^3.2.47",
    "webpack": "^5.77.0",
    "webpack-cli": "^5.0.1"
  }
}

```











**预加载和实现原理**

```javascript
import Wujie from 'wujie-vue2'
const {preloadApp} = Wujie

//....
preloadApp({name:'',url:'',exec:'true'})
```

这个预加载核心就是通过requestidlecallback函数实现，这个函数将在浏览器空闲时执行

什么是浏览器空闲的时候？

第一种情况，大部分屏幕的刷新耗时16.6ms，在这段时间内浏览器完成任务后的空闲时间将会留给 requestidlecallback

第二种情况 浏览器没有任务执行时会有50ms空闲时间 这个时间段可以执行

在一帧内浏览器的任务：

1.处理用户的事件，就是event 例如 click，input change 等。

2.执行定时器任务

3.执行 requestAnimationFrame

4.执行dom 的回流与重绘

5.计算更新图层的绘制指令

6.绘制指令合并主线程 如果有空余时间会执行 `requestidlecallback`

为什么空闲时间限制成50s？

1. **用户体验**：浏览器需要确保用户的操作能够得到快速响应。如果 `requestIdleCallback` 的回调执行时间过长，可能会影响用户交互的响应速度。
2. **帧率保持**：为了保证页面能够达到流畅的动画效果（例如 60 FPS），浏览器需要在 16.6ms 内完成一帧的渲染。`requestIdleCallback` 的执行时间限制有助于确保浏览器有足够的时间来处理下一帧。
3. **任务优先级**：`requestIdleCallback` 主要用于执行低优先级的任务。如果浏览器有更高优先级的任务（如用户输入、动画帧等），这些任务会优先执行。
4. **避免长时间占用主线程**：限制回调的执行时间可以避免长时间占用主线程，从而影响页面的其他交互和视觉效果。



**无界传参**

1. 子应用通过`window.parent.变量名`访问主应用的全局变量

2. 主应用通过props给子应用注入参数

   `<WujieVue :props="{name:'xm',age:18}"  url="http://127.0.0.1:5174/" name="vue3"></WujieVue> <!--子应用vue3-->`

   `window.$wujie.props`

3. event bus

   ```javascript
   import {bus} from 'wujie'
   bus.$on('vue3', (data: any) => {
       console.log(data)
   })
   
   //
    window.$wujie.bus.$emit('vue3', {name:'xm',age:18})
   
   ```

   

# 事件循环与异步io

> 

