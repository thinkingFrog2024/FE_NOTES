## 前端工程化

- 格式化工具
- 压缩工具
- 转换工具
- 打包工具
- 脚手架工具



# 命令（16.19.0）

nodejs是javascript的运行时 nodejs提供了一个环境 使js代码能够在服务端运行

NodeJs 使用**异步 I/O** 和事件驱动的设计理念，适合处理IO密集型应用 异步IO最终由**libuv事件循环库**（个跨平台的异步I/O库）实现（Input Output 也就是输入 输出操作 比如数据库的读取 写入 web服务 需要处理大量的网络请求和响应）

Q：为什么一定需要异步io
同步的io是常见的 并且是主流的，py c++其实都是同步的io，但是这是因为他们有同步io的条件。
同步io的条件就是：多线程
而node js 是单线程的 ，这注定了node只能死磕高并发的道路 



Q：为什么node可以执行js？

浏览器可以执行js 依靠内核里的v8引擎 而node的运行环境是基于谷歌v8的封装



Q：nodejs和libuv处理逻辑

Node.js 利用 `libuv` 的多线程特性，主要是通过将一些**特定的操作外包给工作线程或线程池**来实现的，这样就不会阻塞 Node.js 的主事件循环线程。

Node.js 使用事件循环来处理所有的I/O操作和异步事件。当一个异步操作完成时，相应的回调函数会被加入到事件队列中，然后由事件循环逐一执行。某些操作将会进入线程

主线程操作事件循环 所有js代码的执行 处理所有的异步操作以及回调函数 这个线程里不应该进行阻塞性的同步操作

线程池主要用于文件系统操作 DNS查询 某些cpu密集任务
如果需要执行某些可能阻塞的操作 应该将其处理成异步任务

但是我们为什么还需要线程池的多线程机制？ 如果io操作都是异步的 文件系统操作都是异步的 那我们完全不需要多余的线程才对

但是事实是 很多操作的确不是异步的。

就比如普通文件的io操作 其实是阻塞的 就算设置了不阻塞的标志 在读取文件的时候 假设数据不在内存缓存里面 当前这个读取的线程会被强制的暂停。
另外有一些计算特别复杂的操作 比如密码学的一些操作 这些操作其实就是数学计算 但是算起来很复杂 让主线程算就很复杂



#### 捕捉错误实例：

似乎我不怎么在参数里传递回调函数

感觉这里的设计就是向函数里传递需要处理的数据 发生错误的回调函数

```javascript
function process(data){
    if(!data){
        //这里有一个错误 开发过程可能·是有一个固定流程来处理错误 所以这个错误需要传入那个处理函数 这里还需要终止整个函数
        errHandler(new Error('No data to process')
    }
    //需要对数据进行处理
    .....,(err,res)=>{
            callbackOfOperation(res,err)
        }               
}

functio

function asyncOperation(){
	//函数内部将对数据进行处理然后把处理结果传递给callback callbsck应该包括失败/成功的处理
    fs.readFile('...',(err,res)=>{
        if(err){
            callbackOfOperation(null,err)
            return
        }
        //没有发生错误 对数据进行处理
        process(res)
    })
}

function callbackOfOperation(res,err){
    if(res){
        console.log(res)
    }
    if(err){
        errHandler(err)
    }
}
function errHandler(err){
    //假设只是打印
    console.log(err)
}
asyncOperation(callbackOfOperation)
```

promise风格

```javascript
// 模拟的 process 函数，它返回一个Promise
function process(data) {
  return new Promise((resolve, reject) => {
    // 模拟数据处理，这里我们假设处理总是成功
    // 实际情况中，这里可能会执行更复杂的操作，并可能抛出错误
    const result = data.toString().toUpperCase();
    resolve(result); // 数据处理成功，使用resolve返回结果
  });
}

async function asyncOperation(){
    try{
        const data = fs.readFile('....')//这里需要await等待读取结果
        const res = await process(data)
        return res
    }
    catch(err){
        //如果这里的处理逻辑不同 也可以在这里单独写
        console.error('An error occurred:', err);
        // 如果需要在调用栈的更上层处理错误，可以选择重新抛出错误 
        throw err;
    }
}

asyncOperation()
  .then(result => {
    console.log('Operation completed with result:', result);
  })
  .catch(err => {
    console.error('Operation failed with error:', err);//这里可以编写错误处理逻辑 上抛的错误可以在这里被接受
  });
```







阻塞：阻塞其他操作 任务 比如某个函数的执行 同步任务具有阻塞的特点 一个线程里存在多个同步 就可能阻塞

挂起：比如在异步函数内部 使用await表达式会导致js引擎在该店暂停执行 使异步函数挂起 直到promise解决

------

devDependependencies:开发依赖 执行`npm i .. --save-dev` 简写：`npm i .. -D`

dependenices:生产环境依赖

peerDependenpendencies（）对等依赖：插件开发使用  插件的宿主环境



`npm config list` 用于列出所有的 npm 配置信息。执行该命令可以查看当前系统和用户级别的所有 npm 配置信息，以及当前项目的配置信息（如果在项目目录下执行该命令）



------



### npm install 原理

采用扁平化的方式安装依赖 

使用广度优先算法遍历 在遍历依赖树时 首先处理根目录下的依赖 然后逐层处理每个依赖包的依赖 知道所有依赖处理完毕 处理依赖时 npm会检查该依赖的版本和依赖树里其他的依赖是否冲突

**广度优先算法**

它从一个节点开始，逐层遍历节点，直到找到目标节点或遍历完所有节点为止。BFS通常用于在最短路径问题中找到从源节点到目标节点的最短路径。

**深度优先算法**

它从一个节点开始，尽可能深地搜索树的分支，当节点v的所在边都已被探寻过，搜索将回溯到发现节点v的那条边的起始节点，继续探寻尚未探寻过的分支。

**完全扁平化？**

如果根目录下的A B 依赖均依赖于C 那么C会被提到跟AB同一层级 

但是当AB依赖的C的版本不同时 就不能进行扁平化处理了 所以还是会出现模块冗余

**下载流程**

执行命令之后 会依次检查项目级（项目目录中） 用户级（存放在c盘中） 全局级（c/appdata/npm） npm内置(nodejs/modules/npm)的.npmrc配置文件（其实就是npm config的配置）





关于npmrc文件的内容：

```javascript
registry=http://registry.npmjs.org/
# 定义npm的registry，即npm的包下载源

proxy=http://proxy.example.com:8080/
# 定义npm的代理服务器，用于访问网络

https-proxy=http://proxy.example.com:8080/
# 定义npm的https代理服务器，用于访问网络

strict-ssl=true
# 是否在SSL证书验证错误时退出

cafile=/path/to/cafile.pem
# 定义自定义CA证书文件的路径

user-agent=npm/{npm-version} node/{node-version} {platform}
# 自定义请求头中的User-Agent

save=true
# 安装包时是否自动保存到package.json的dependencies中

save-dev=true
# 安装包时是否自动保存到package.json的devDependencies中

save-exact=true
# 安装包时是否精确保存版本号

engine-strict=true
# 是否在安装时检查依赖的node和npm版本是否符合要求

scripts-prepend-node-path=true
# 是否在运行脚本时自动将node的路径添加到PATH环境变量中

```





------



**package-lock.json**

锁定版本号 记录版本依赖数的详细信息 实现缓存

`version`：记录版本信息

`resolved`：下载地址

`integrity`：记录完整性

`dev`：是否为开发过程所需的依赖

`bin`：说明有一个可执行文件

`engines`：所需的node版本

**package-lock如何实现缓存？**

使用包的name version integrity 生成一个唯一的key

可以通过`npm config list`中的cache找到缓存文件位置_cache

文件夹中地index-v5 一个索引目录 会记录context-v2的索引的位置 这个位置即为name+version+integrity的哈希值 如果能找到对应的索引 就会去context-v2里面寻找对应的包 解压出来





------

### npm run 原理

**命令从哪里来？**

读取package json 的scripts 对应的脚本命令(dev:vite),vite是个可执行脚本，他的查找规则是：

在node_modules下的.bin（所有的可执行命令）（xi俺看当前项目的 找不到再去全局的）文件里（此处以vite举例）

安装的时候会自动往.bin里注入文件

vite.sh(unix macOS linux) vite.cmd(cmd命令行) vite.ps1（powerSheel命令行）

执行之后会先查找有没有node-modules/.bin 如果没有 就回去全局的node-modules（npm config 中的prefix） 还是没有就去环境变量里找

找不到会报错





为什么全局命令可以直接运行？

因为会自动配置环境变量 我的电脑>高级系统设置>环境变量





node的生命周期：

在scripts中配置命令mmm时 可以配置premmm 那么在mmm执行之前会执行premmm postmmm同理

![image-20241109122041700](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20241109122041700.png)

------

### npx

**npx与npm**

npx侧重于执行命令 执行某个模块命令 

npm侧重于安装 卸载模块 



**npx特点**

1. 避免了全局安装（如果找不到这个包npx会下载最新版使用后删除）
2. npx能够执行任何模块命令
3. 如果包不存在 npx会自动安装

使用npm执行命令时 如果需要执行某个模块命令 必须要在scripts里配置 npx可以直接执行 查看全局安装的可执行文件 npm ls -g



# 模块化

## 类型

**commonJS**

天然支持引入json文件

**ECMA**

全部引入import * as all from '...'

天然不支持引入json文件 如果需要引入json文件`import data from './data.json' assert { type: "json" };`



import **静态加载不支持掺杂在逻辑里 但是可以使用动态加载**

1. import()函数 这是一个返回promise的函数 需要使用.then接收 多用于模块动态导入

   ```javascript
   if(true){
       import('./test.js').then()
   }
   ```

   

2. import动态加载 通常用于惰性执行代码 这种方法得到的是import()执行完成之后返回的promise 当模块加载执行完毕之后 promise的状态从pendind变成fulfilled  vue里的路由就这样写

   

**两者的区别**

1. this的行为不同
   1. 在cjs中 模块函数的内部指向模块本身 cjs的模块通常被设计一个对象 所以也就是指向对象本身 在模块顶层 则指向全局对象 global或者window es6模块里面顶层this将指向undefined（）全局作用域里的this指向全局对象

```javascript
it(true){
    require(...)
}
//cjs是支持在逻辑判断里require的 但是如果require的文件过大 下面的代码会被阻塞
//esm基于编译时 在编译时就需要知道引入什么模块 所以不能掺杂逻辑判断     //如果一定要在逻辑里import 需要使用函数模式
if(true){
     import('...').then(res=>{
         ...
     })
    }            
```



2. cjs是基于运行时地同步加载 esm是基于编译时的异步加载

3. cjs值可以修改 esm不可修改
   - **值的可变性**: 当你从一个 CJS 模块导入一个值时，你得到的是一个**指向原始值的引用**（对于原始类型）或一个实际的副本（对于对象）。这意味着如果你导入一个可变对象并修改它，原始模块中的对象也会被修改。
   - **不可变性**: ESM 提供了一种不可变（immutable）的导入方式。当你从一个 ESM 模块导入一个值时，你得到的**是一个只读的引用**。这意味着你不能修改通过 `import` 导入的值（除非该值本身是可变的，例如对象或数组，并且你修改的是对象的属性或数组的元素）

​	

4. cjs不可以tree shaking（因为cjs是基于运行的）



------



**定义全局变量**

全局变量 在引入的文件中也可以访问

通过global.name定义了一个name全局变量 可以在其他模块里访问 但是要注意代码执行顺序

可以使用`globalThis`API定义全局变量 会自动判断环境



------

## CSR SSR SEO

**服务端渲染**

由服务端生成html文件并返回 渲染请求数据拼装都在服务端完成

通过jsdom这个库 我们可以在node环境里使用dom

```javascript
const {JSDOM} = require('jsdom')
const fs = require('fs')
const root = new JSDOM(`html模板`)//注意这里用反引号
const window = root.window
const document = window.document
const app = document.querySelector('#app')\
fetch('..').then(data=>{
    data.forEach(i=>{
        const img = document.createElement('img')
        img.src = i.url
        img.style.height = '200px'
        img.style.width = '200px'
        app.appendChild(img)
    })
    fs.writeFileSync('...',root.serialize())//序列化之后写入
})
```

**客户端渲染**

在浏览器里完成渲染  例如vue react 服务端返回一个原始html文件 浏览器下载执行js文件 js动态生成更新内容

**两者的区别**

1. csr需要js负责动态生成并更新页面内容 延迟比较大 数据改变时js会重新生成更新dom 更加灵活
2. ssr在服务器返回给浏览器之前 会在服务端生成完整的html页面 加载速度快 比较适合静态 少变的内容 用于首屏提升
3. csr后续交互一般由ajax websocket完成 通过js更新 提供更快的页面切换和响应速度 但是对爬虫（抓不到啥信息） seo需要额外处理 ssr用户交互可以直接在服务器上进行 服务器返回更新的页面 对seo更友好

seo讲究tdk（title description keywords）这些内容能够被爬虫机器人爬



# 内置模块

![image-20241109122321385](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20241109122321385.png)

## path

在node里面 相对路径是根据终端所在路径来查找的 

`__dirname` 可以得到当**前模块目录的绝对路径**  和path正好相反

`path.basename`返回给定路径的最后一部分

​	`path.win64.path`:模拟在win64环境处理

​	`path.posix.path`:模拟在posix环境处理

`path.extbane`返回路径拓展名 而且带点 如果没有点 返回空 如果有多个点 返回最后一个后面的内容

`path.join`路径拼接 支持操作符

`path.resolve`解析路径 返回绝对路径 如果有多个绝对路径 返回最后一个 如果只有一个相对路径 返回当前工作目录的绝对路径 

`path.parse`解析路径 返回一个对象（root dir base ext name）

`path.format`把对象解析成路径

`path.sep`根据操作系统 windows\ posix/ 跨平台用

```javascript
const path = require('path')
fs.readFile(path.join(__dirname,'../test.txt'),(err,data)=>{
    ...
})
```

![image-20241109122443989](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20241109122443989.png)

------

## OS

跟操作系统交互

`os.platform`获取当前操作系统

`os.release`获取版本号

`os.type`操作系统

`os.version`版本 旗舰版啥的

`os.homedir`读取用户目录

`os.arch`读取cpu架构

`os.cpus`获取cpu信息

`os.networkInterface`网络信息 

**执行某个命令时自动打开浏览器的底层原理**

判断不同的操作系统 调用sheel命令

```javascript
const platform = os.platform
swich platform{
    case 'darwin':{
        exec(`open ${url}`)
        break
    }
    case 'win32':{
        exec(`start ${url}`)
    }
    case 'linux':{
        exec(`xdg-open ${url }`)
    }
}
```



------



## Http

```javascript
const http = require('node:http'); // 引入 http 模块
const url = require('node:url'); // 引入 url 模块

// 创建 HTTP 服务器，并传入回调函数用于处理请求和生成响应
http.createServer((req, res) => {
  const { pathname, query } = url.parse(req.url, true); // 解析请求的 URL，获取路径和查询参数 true将结果转为对象 否则为字符串

  if (req.method === 'POST') { // 检查请求方法是否为 POST
    if (pathname === '/post') { // 检查路径是否为 '/post'
      let data = '';
      req.on('data', (chunk) => {
        data += chunk; // 获取 POST 请求的数据
        console.log(data);
      });
      req.on('end', () => {
        res.setHeader('Content-Type', 'application/json'); // 设置响应头的 Content-Type 为 'application/json'
        res.statusCode = 200; // 设置响应状态码为 200
        res.end(data); // 将获取到的数据作为响应体返回
      });
    } else {
      res.setHeader('Content-Type', 'application/json'); // 设置响应头的 Content-Type 为 'application/json'
      res.statusCode = 404; // 设置响应状态码为 404
      res.end('Not Found'); // 返回 'Not Found' 作为响应体
    }
  } else if (req.method === 'GET') { // 检查请求方法是否为 GET
    if (pathname === '/get') { // 检查路径是否为 '/get'
      console.log(query.a); // 打印查询参数中的键名为 'a' 的值
      res.end('get success'); // 返回 'get success' 作为响应体
    }
  }
}).listen(98, () => {
  console.log('server is running on port 98'); // 打印服务器启动的信息
});

.on('data', callback): 这是Node.js中事件监听器的语法。req对象会发出一个data事件，每当请求体的一部分数据被接收时。callback函数将在每个data事件触发时被调用，并且会接收一个参数chunk。chunk: 这是请求体的一部分数据，通常是一个Buffer对象或是一个字符串（取决于req对象的encoding属性）。如果请求体是分块传输的，那么每个chunk可能代表请求体的一部分。console.log(data);: 这行代码将打印出当前累加的数据。由于data是逐步累加的，所以在请求体完全接收之前，打印的数据可能不完整。如果请求体不是分块传输的，那么data事件只会触发一次，并且chunk将是整个请求体。
```

可以用REST Client 创建一个request.http

```javascript
# POST http://localhost:98/post/xxx HTTP/1.1

# Content-Type: application/json

# {
#     "name":"小满zs"
# }


GET http://localhost:98/get?a=1&b=2 HTTP/1.1
```

**http缓存**

 强缓存 协商缓存 可以用cors这个依赖解决跨域

强缓存之后则不需要向服务器发送请求 而是直接从浏览器缓存里读取 

浏览器缓存分为内存缓存（memory cache）存储在浏览器缓存中 硬盘缓存(disk cache)（存储在计算机硬盘里）无法控制 浏览器调度

1. 通过expires设置(HTTP 1.0)：这个资源需要设置资源不再被人为有效的时间 用户获取资源的时候 会获取本地时间戳 和expires里设置的时间戳对比 有一定风险
2. 通过cache-control设置

协商缓存 强缓存优先于协商缓存 如果强缓存没有命中 比如max-age过期 则客户端会发起协商缓存的请求 客户端发送带有缓存数据标识的请求头部字段 服务器根据客户端发送的协商缓存字段 来判断资源是否发生变化 如果资源没有变化 返回状态码304 如果资源改变 返回最新的资源 状态码200

由于强缓存优先 所以需要协商缓存的时候 要设置 `Cache-Control,no-cache`

1. 通过last-modified设置最后修改时间 需要和if-modified-since配合使用 当后端设置last-modified 发送第二次请求时浏览器就会自动携带if-modified-since这个值就是 last-modified



## process

不需要引入

`process.platform process.arch`

`process.argv`获取命令参数

`process.cwd`和dirname一样 但是esm下不能使用dirname

`process.memoryUsage`内存信息

`process.exit`退出当前进程

`process.kill(process.pid)`杀死进程 参数pid

`process.env`获取操作系统环境变量 可以修改 到那时修改只在进程里生效不会真正影响系统



------

## chuild_process

`exec`执行较小的sheel命令 跟软件交互 打开某个软件 字节上限200kb

```javascript
exec('node -v',(err,std，stderr)=>{
	if(err)return
	console.log(std.toString())
})
//异步版本中的三个参数 依次为错误对象 标准输出 标准错误 （输出到标准错误流的内容）
//同步版本不提供err stderr 遇到错误会抛出一个错误
try {
  const output = execSync('node -v').toString();
  console.log(output);
} catch (error) {
  console.error(`execSync error: ${error}`);
}
```



`execsync`

`spawn`：实时返回流 没有上限 exec是全部返回后才能拿到结果

```javascript
const {stdout，stderr} = spawn('netstart'，['-...','-...']，{
     cwd: '可执行目录', // 当前工作目录
     timeout: 5000,      // 超时时间，单位为毫秒
})
stdout.on('data',(msg)=>{
    console.log(msg.toString())
})
stderr.on('data', (msg) => {
  console.error(msg.toString());
});
stdout.on('close',(msg)=>{
    console.log('结束')
})
```



`spawnSync`

`execFile`执行可执行文件

`execFileSync` 底层基于IPC IPC基于libuv

`fork`只能接收js模块 返回一个子进程 可以把耗时的进程放到子进程里

底层实现顺序：exec=>execFile=>spawn

#### 

使用ffmpeg （多媒体处理工具）

------

## fs

fs模块支持同步(readFileSync) 异步（readFile） promise require('fs/promise')

fs返回的是一个buffer二进制数据 每两个十六进制数字表示一个字节

```javascript
import fs from 'node:fs'
import fs2 from 'node:fs/promises'
//读取文件
fs2.readFile('./index.txt').then(result => {
    console.log(result.toString())
})
fs.readFile('./index.txt', (err, data) => {
    if (err) {
        return err
    }
    console.log(data.toString())
})
let txt = fs.readFileSync('./index.txt')
console.log(txt.toString())

//配置项 encodeing编码方式 flag

```

`readFile`读取文件

`writeFileSync`接收两个参数 文件路径 写入内容 默认替换

```java
const fs = require('node:fs')

fs.writeFileSync('index.txt', 'java之父\n余胜军',{
    encoding:
    flag:a//追加 不存在则创见
    mode/权限
})
```



`appendFilesync`追加文件内容

分段写入数据

```javascript
const writeStream = fs.createWriteStream('index.txt')
let verse = [
    ...
]
verse.forEach(item=>{
    writeStream.write(item+'\n')
   })
   
writeStream.end()

writeStream.on('finish',()=>{
    ....
})
```



`createReadStream`可读流 处理大文件时使用

```javascript
const stream = fs.createReadStream('...')
stream.on('data',(chunk)=>{
    ....
})
stream.on('end',()=>{
    
})
```



`mkdirSync`创建文件夹 默认不可以递归创建 需要递归可以传入配置项`{recursive:true}`

`rmSync`删除 用法同上

`renameSync`重命名 接受两个参数 原始名称和新的名称

```javascript
fs.watch('监听文件变化'，（event,filename)=>{
    //文件改变时会触发change事件
})
```

**软链接 硬链接**

fs.linkSync('原始连接'，'硬链接之后的地址')//共享文件 删除原始文件不受影响

fs.symlinkSync()//需要管理员权限 比较像快捷方式

**注意事项**

  fs IO操作都是由Libuv完成的 完成任务之后才会推入v8的事件队列 计时器是由v8事件循环完成的 所以fs操作会延后





##  crypto

nodejs使用c/c++实现所发后利用crypto模块暴露为javascript接口

**对称加密**

双方协定一个密钥以及iv

```javascript
const crypto = require('node:crypto');

// 生成一个随机的 16 字节的初始化向量 (IV)
const iv = Buffer.from(crypto.randomBytes(16));

// 生成一个随机的 32 字节的密钥
const key = crypto.randomBytes(32);

// 创建加密实例，使用 AES-256-CBC 算法，提供密钥和初始化向量
const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

//使用update方法对数据进行加密，自动转换为Buffer
cipher.update("小满zs", "utf-8", "hex");
// 使用final方法完成加密过程，返回剩余的加密数据
const result = cipher.final("hex");

// 解密
const de = crypto.createDecipheriv("aes-256-cbc", key, iv);
de.update(result, "hex");
const decrypted = de.final("utf-8");

console.log("Decrypted:", decrypted);

```



**非对称加密**

生成一个私钥 公钥 私钥只能管理员拥有 不能公开 公钥可以公开 公钥加密 私钥解密

```javascript
const crypto = require('node:crypto')
// 生成 RSA 密钥对
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
});

// 要加密的数据
const text = '小满zs';

// 使用公钥进行加密
const encrypted = crypto.publicEncrypt(publicKey, Buffer.from(text, 'utf-8'));

// 使用私钥进行解密
const decrypted = crypto.privateDecrypt(privateKey, encrypted);

console.log(decrypted.toString());

```



**哈希函数**

不能解密 单向的 不可逆

```javascript

const crypto = require('node:crypto');

// 要计算哈希的数据
let text = '123456';

// 创建哈希对象，并使用 MD5 算法
const hash = crypto.createHash('md5');

// 更新哈希对象的数据
hash.update(text);

// 计算哈希值，并以十六进制字符串形式输出
const hashValue = hash.digest('hex');

console.log('Text:', text);
console.log('Hash:', hashValue);

```





## zlib

提供了对数据压缩和解压缩的功能

```javascript
const zlib = require('zlib')
const fs = require('fs')
//压缩
const stream = fs.createReadStream('index.txt')
const stream2 = fs.createWriteStream('index.txt.gz')
readStream.pipe(zlib.createGzip()).pipe(writeStream)

//解压缩
const stream = fs.createReadStream('inedx.txt.gz')
const stream2 = fs.createWriteStream('index.txt')
readStream.pipe(zlib.createGunzip()).pipe(writeStream)

const readStream = fs.createReadStream('index.txt'); // 创建可读流，读取名为 index.txt 的文件
const writeStream = fs.createWriteStream('index.txt.deflate'); // 创建可写流，将压缩后的数据写入 index.txt.deflate 文件
readStream.pipe(zlib.createDeflate()).pipe(writeStream);

const readStream = fs.createReadStream('index.txt.deflate')
const writeStream = fs.createWriteStream('index3.txt')
readStream.pipe(zlib.createInflate()).pipe(writeStream)

```

htttp请求压缩

```javascript
const zlib = require('zlib'); 
const http = require('node:http'); 
const server = http.createServer((req,res)=>{
    const txt = '小满zs'.repeat(1000);

    //res.setHeader('Content-Encoding','gzip')
    res.setHeader('Content-Encoding','deflate')
    res.setHeader('Content-type','text/plan;charset=utf-8')
   
    const result = zlib.deflateSync(txt);
    res.end(result)
})

server.listen(3000)

//
const zlib = require('zlib'); 
const http = require('node:http'); 
const server = http.createServer((req,res)=>{
    const txt = '小满zs'.repeat(1000);

    res.setHeader('Content-Encoding','gzip')
    //res.setHeader('Content-Encoding','deflate')
    res.setHeader('Content-type','text/plan;charset=utf-8')
   
    const result = zlib.gzipSync(txt);
    res.end(result)
})

server.listen(3000)

```



gzip使用deflate压缩算法 该算法结合了LZ77算法（数据重复字符串的替换 引用）和哈夫曼编码（进一步压缩数据）

压缩效率：Gzip压缩率更高 （使用了哈夫曼编码 根据字符的出现频率 把常见的字符使用较短编码表示）

压缩速度：deflate快

Gzip常用于文件传输  deflate网络传输





## events

nodejs事件模型采用了发布订阅模式

默认只能订阅十个 如果需要增加：`bus.setMaxListener(20)`

process的原型就是事件发布的原型 所以process也可以调用event的api

```javascript
const evebtEmitter = require('event')
const bus = new eventEmitter()
bus.on('test',(n)=>{
    log(n)
})//once只执行一次
bus.emit('test','m')
bus.off('test',fn)
```

------

## util

`util.promisify `把函数处理成promise

```javascript
const execPromise = util.promisify(exec)
execPromise('node -v').then(res=>{
    ...
}).catch(err=>{
    ...
})

//实现promisify
const promisify = (fn)=>{
    return (...args)=>{
        return new Promise((resolve,reject)=>{
            fn(..args,(err,...val)=>{
                if(err){
                    reject(err)
                }
                if(val&&val.length>1){
                    let obj = {}
                    for(let key in val){
                        obj[key] = val[key]
                    }
                }else{
                    resolve(val[0])
                }
            })
        })
    }
}
```

`util.callbackify`:变成回调函数模式

`util.format`:处理数据

------



# 技术篇







## PM2

node进程管理工具

可以在使用pm2 文件名  开启服务

pm2 log 查看控制台

pm2  list 查看表格

pm2 stop id 停止服务

PM2.5 restart id 重启服务

pm2 delete id

 pm2 start 文件名 --watch 监听模式 文件修改自动重启





# Express

基于http模块创建的框架 

日志系统 `log4js`



![image-20241109142157473](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20241109142157473.png)

```javascript
import express from 'express'
const app = express()
app.use(express.json())//支持post解析json

//定义get请求  第一个参数代表地址 第二个参数待变回调函数 req请求 res响应
app.get('/get',(req,res)=>{
    ....
    //get请求通过req.query获取参数（这里获取的是查询参数（路径参数）user/?name='dddd'请求使用req.body获取 动态参数 req.params
})
//动态参数
app.get('/get/:id',(req,res)=>{
    //这个id相当于占位符
    ...
})
app.listen(3000)
```

模块化拆分

```javascript
//编写每个模块的逻辑
import express from 'express'
const router = express.Router()

router.post('/login',(req,res)=>{
    res.json({
        code:200,
        msg:'登陆成功'
    })
})

export default router

//在app里引入
import User from './src/user.js'
import express from 'express'


const app = express()
app.use(express.json())//支持post解析json
app.use('/user',User)


POST http://localhost:3000/user/login HTTP/1.1
Content-Type:application/json
```





案例：日志记录中间件

```javascript
import log4js from 'log4js'
//控制台输出 文件
log4js.configure({
    appenders:{
       out:{
           type:'stdout'//控制台输出
           layout:[
           type:'colored'//带颜色
           		]
      	   } 
       file:{
		   filename:'logs/server.log'
    	   type:'file'
		    }
        categories:{
           default:{
              appenders:["out","file"],
    		  level:"debug"
          } //默认日志分类 将会记录所有级别在debug以上的日志        
     }
})
const logger = log4js.getLogger('default')//使用默认分类

const LoggerMiddleware = (req,res,next())=>{
	logger.debug(`[${req.method}]${req.url}`)    
}
export default LoggerMiddleware
```

##### **防盗链技术**

![image-20241109143301401](C:\Users\ASUS\AppData\Roaming\Typora\typora-user-images\image-20241109143301401.png)

```javascript
const app = express()

app.use(express.static('static'))//初始化静态资源
//static:静态资源目录 这样在浏览器里面进行访问的时候 就不需要前缀了
//还可以添加虚拟路由：
app.use('/assets',express.static('static'))


const whiteList = ['localhost']

const prevent = (req,res,next)=>{
    const referer = req.get('referer')//直接获取是获取不到的 必须网络请求
    
    //此处使用了一个get方法获取这个对象里面的字段值 这样获取和直接获取的区别有以下两点：
    //1. 这个方法对于大小写不敏感 者意味着不管写referer 还是Referer都可以正确获取到
    //2. 这个方法返回的是字符串 这表明 不能够链式调用
    
    if(referer){
        const {host} = new URL(referer)
        if(whiteList.includes(host)){
            next()
        }else{
            res.ststus(403).send('禁止')
            return//这样之后127 就访问不了了
        }
    }
}

//初始化静态资源
app.use(express.ststic('ststic'))
app.listen(3000,()=>console.log('server started'))
```



##### 跨域和cors 响应头与请求头

```javascript
nodemon

app.use('*',(req,res,next)=>{
    
    res.setHeader('Access-Control-Allow-Origin',"*")//允许所有资源进行访问 也可以设置某些地址http：//localhost：5500
    
    
    //默认值支持get post head请求
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE')
    
    
    
    //contentType默认只支持 aplication/x-www-form-urlencoded(name=1&age=2)  multipart/form-data(formdata 上传文件)  text/plain(纯文本)
    //默认情况下 cors仅仅支持客户端向服务端发送以下九个请求头：Accept:指定客户端可以处理的媒体类型  Accept-language：客户端接收的语言  DPR：设备像素比 用于提供合适分辨率的资源  Downlink：预估网络下载速度   Save-Data：如果用户开启了数据节省 将会发送这个响应头  Viewport-Width：视口宽度 用于适配  Width：资源的宽度  Content-Type：发送到服务器内容的媒体类型  User-agent:客户端详细信息 例如浏览器的版本
    res.setHeader('Access-Control-Allow-Headers','Content-Type')
})



app.get('/info',(req,res)=>{
    res.set('xm',123)//自定义响应头
    res.setHeader('Access-Control-Expose-Headers','xm')//抛出响应头 否则前端接收不到
    res.json({ message: 'This is a response with a custom header.' });
    
    //前端接收响应头携带的数据：
    //const header = response.header
    //console.log(header.get('xm') 如果后端不抛出 那么前端获取的是null
})

```

##### 单工通信 sse

```javascript
app.get('/sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); // 设置响应类型为SSE
    res.setHeader('Cache-Control', 'no-cache'); // 避免缓存
    res.setHeader('Connection', 'keep-alive'); // 保持连接打开

    // 使用定时器来模拟实时发送数据
    const intervalId = setInterval(() => {
        res.write(`data: ${Date.now()}\n\n`); // 发送数据
    }, 1000); // 每秒发送一次

    // 当连接关闭时，清除定时器
    req.on('close', () => {
        clearInterval(intervalId);
    });
});

//服务端发送自定义事件
res.write('event:test\n');//指定事件名称
res.write('data: ' + someData + '\n\n');//发送数据
```

```javascript
// 创建一个新的EventSource实例，连接到服务器的SSE端点
const sse = new EventSource('/sse');

// 监听默认的'message'事件
sse.addEventListener('message', (e) => {
    console.log(e.data);
});

// 监听自定义的'test'事件
sse.addEventListener('test', (e) => {
    console.log('Event: test', e.data);
});

// 监听连接打开事件
sse.onopen = (e) => {
    console.log('SSE connection opened');
};

// 监听错误事件，处理连接错误或重连
sse.onerror = (e) => {
    console.error('SSE error:', e);
    // 根据需要实现重连逻辑
    sse.close(); // 关闭当前连接
    // 可以在这里重新打开一个新的EventSource连接
};
```



##### 预检请求

符合以下条件任意一个都为预检请求：

1. 请求方式不是GET POST HEAD
2. 请求头包含自定义头部字段
3. 向服务器发送了applicatin/json格式的数据

这些请求 将会发送预检请求 

比如自定义请求头时候 把content-type设置成application-json 那么就会发起预检请求 但是这个请求默认并不支持这个类型 所以就会报错 cors错误





### express生成器

可以使用express-generator快速创建应用程序骨架 使用express命令使用这个依赖，

```javascript
$ express -h

  Usage: express [options] [dir]

  Options:

    -h, --help          output usage information
        --version       output the version number
    -e, --ejs           add ejs engine support
        --hbs           add handlebars engine support
        --pug           add pug engine support
    -H, --hogan         add hogan.js engine support//这四种都是模板引擎 可以用于简化生成HTML
        --no-view       generate without view engine
    -v, --view <engine> add view <engine> support (ejs|hbs|hjs|jade|pug|twig|vash) (defaults to jade)
    -c, --css <engine>  add stylesheet <engine> support (less|stylus|compass|sass) (defaults to plain css)//添加css预处理器支持
        --git           add .gitignore
    -f, --force         force on non-empty directory

```

例如创建一个myaoo 使用Pugu作为视图引擎：

```javascript
npx express-generator//运行express生成器
express --view=pug myapp

   create : myapp
   create : myapp/package.json
   create : myapp/app.js
   create : myapp/public
   create : myapp/public/javascripts
   create : myapp/public/images
   create : myapp/routes
   create : myapp/routes/index.js
   create : myapp/routes/users.js
   create : myapp/public/stylesheets
   create : myapp/public/stylesheets/style.css
   create : myapp/views
   create : myapp/views/index.pug
   create : myapp/views/layout.pug
   create : myapp/views/error.pug
   create : myapp/bin
   create : myapp/bin/www
```

在初始化项目之后 ：

```
cd myapp//进入项目
npm i //下载依赖
> set DEBUG=myapp:* & npm start //在命令行上的  把环境变量DEBUG的值设置成myapp的所有调试信息 并且执行start命令
PS> $env:DEBUG='myapp:*'; npm start//在ps上的
```

![image-20241111150906871](https://wanglingxiao.oss-cn-beijing.aliyuncs.com/image-20241111150906871.png)

### 静态文件

`app.use(express.static('public'))`

在使用静态文件之后就可以在端口里面访问静态文件，并且express查找相对于静态目录的文件 因此在url里面记得不需要public

```javascript
http://localhost:3000/images/kitten.jpg
http://localhost:3000/css/style.css
http://localhost:3000/js/app.js
http://localhost:3000/images/bg.png
http://localhost:3000/hello.html
```

有多个静态资源目录 则需要多次调用函数。



也可以为静态文件指定实际上并不存在于系统俩民的虚拟路径：

```
app.use('/static', express.static('public'))

```

另外 提供给静态资产函数的路径时相对于启动node进程的目录的 如果要在父级里卖弄启动程序 使用绝对路径会更加安全

## 使用指南

### 路由



**路由方法**

**路由路径**

路由路径可以是字符串 字符串模式 正则表达式 

查询字符串并不是路由路径的一部分



**路由参数**

路由参数是命名的URL字段 用于捕获指定位置的值 这个值将会填充在req.params里面。

由于连字符 (`-`) 和点 (`.`) 是按字面解释的，因此它们可以与路由参数一起用于有用的目的。

```javascript
Route path: /flights/:from-:to
Request URL: http://localhost:3000/flights/LAX-SFO
req.params: { "from": "LAX", "to": "SFO" }
Route path: /plantae/:genus.:species
Request URL: http://localhost:3000/plantae/Prunus.persica
req.params: { "genus": "Prunus", "species": "persica" }
```

**路由处理程序**

一个路由可能有一个以上的回调函数

```javascript
app.get('/example/b', (req, res, next) => {
  console.log('the response will be sent by the next function ...')
  next()
}, (req, res) => {
  res.send('Hello from B!')
})
```

也可以传入数组：

```javascript
const cb0 = function (req, res, next) {
  console.log('CB0')
  next()
}

const cb1 = function (req, res, next) {
  console.log('CB1')
  next()
}

const cb2 = function (req, res) {
  res.send('Hello from C!')
}

app.get('/example/c', [cb0, cb1, cb2])
```

还可以一起使用 哎 

```javascript
const cb0 = function (req, res, next) {
  console.log('CB0')
  next()
}

const cb1 = function (req, res, next) {
  console.log('CB1')
  next()
}

app.get('/example/d', [cb0, cb1], (req, res, next) => {
  console.log('the response will be sent by the next function ...')
  next()
}, (req, res) => {
  res.send('Hello from D!')
})
```

处理函数里面的next方法的行为取决于传递给这个方法的参数：

1. 无参数调用next：表示当前中间件处理完毕 没有错误发生 
2. 传递错误对象：当前中间件发生了错误 需要把控制权移交给错误处理中间件
3. 特殊情况：传递用于控制流程的页数字符串 比如route 会跳过所有剩余的中间件 继续查找路由处理器 也就是使用app.METHOD() router.METHOD()函数加载的中间件函数
4. 传递其他的东西：传递给next错误对象之外的参数会导致不可预测的行为，如果有传递参数之类的需求，可以在req对象上面添加属性。







**路由响应**

以下方法可以向用户端发送响应：

| 方法                                                         | 描述                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| [res.download()](https://nodejs.cn/express/guide/routing/##e947e5113b39457085cd5a1c55d4a379) | 提示要下载的文件。                                   |
| [res.end()](https://nodejs.cn/express/guide/routing/##c13d622d2af7427f849691c4a215f266) | 结束响应过程。                                       |
| [res.json()](https://nodejs.cn/express/guide/routing/##338ba638c4c74cecaa9f4b270cbedfb0) | 发送 JSON 响应。                                     |
| [res.jsonp()](https://nodejs.cn/express/guide/routing/##e6d8fcebe9254f258a6d285e0d428289) | 发送带有 JSONP 支持的 JSON 响应。                    |
| [res.redirect()](https://nodejs.cn/express/guide/routing/##5e3b343971544d998adf19dc3c10c251) | 重定向请求。                                         |
| [res.render()](https://nodejs.cn/express/guide/routing/##c3ac11cab29947a38a2eb9e227598b83) | 渲染视图模板。                                       |
| [res.send()](https://nodejs.cn/express/guide/routing/##a85dd38ec9f54b74b82a7ae37702d96d) | 发送各种类型的响应。                                 |
| [res.sendFile()](https://nodejs.cn/express/guide/routing/##4d4dc258da3d40bca075c191235e7c82) | 将文件作为八位字节流发送。                           |
| [res.sendStatus()](https://nodejs.cn/express/guide/routing/##f04d9d510ac446d88295eff07e3f6e93) | 设置响应状态码并将其字符串表示形式作为响应正文发送。 |



##### jsonp

一种早期解决跨域问题的策略 因为当时大多数浏览器还没有cors支持

```javascript
<script>
function myCallback(data) {
  console.log(data); // 处理数据
}
</script>
<script src="https://example.com/api/data?callback=myCallback"></script>
```

```javascript
app.get('/api/data', (req, res) => {
  const callback = req.query.callback; // 获取回调函数名称
  const data = { key: 'value' };
  
  // 将数据包装在回调函数中并发送响应
  //其实这个jsonpapi就是帮助把这个响应进行了处理
  res.jsonp(data);
});
```





##### 路由程序

**可链接的路由处理程序**

使用app.route()可以为同一个请求地址定义一个链接的处理程序。 对一个地址使用不同的方式进行请求会获得不同的响应

```javascript
app.route('/book')
  .get((req, res) => {
    res.send('Get a random book')
  })
  .post((req, res) => {
    res.send('Add a book')
  })
  .put((req, res) => {
    res.send('Update the book')
  })
```



**可安装的路由程序**

使用express.Router（）创建一个模块化的路由处理程序

```javascript
const express = require('express')
const router = express.Router()

// middleware that is specific to this router
router.use((req, res, next) => {
  console.log('Time: ', Date.now())
  next()
})
// define the home page route
router.get('/', (req, res) => {
  res.send('Birds home page')
})
// define the about route
router.get('/about', (req, res) => {
  res.send('About birds')
})

module.exports = router
```

在主应用里面加载路由：

```javascript
const birds = require('./birds')

// ...

app.use('/birds', birds)
```

### 中间件

中间件函数是在网络请求过程里面可以访问请求对象，响应对象，next函数的函数。

中间件函数可以终止当前请求 或是使用next移交控制权 从express5开始 对于返回promise的中间件函数 如果promise被拒绝 或者抛出错误 那么会自动调用next(value)

在中间件函数里面还可以给请求对象添加属性 并且在之后的中间件汉纳树里面调用添加的属性。



##### **错误处理中间件**

这是一种特殊类型的中间件，用来捕获发生在应用里面面任意位置的错误，参数列表为err,req,res,next 这个特定的参数签名会表明这是一个错误处理中间件，抛出错误的时候，控制权将会自动移交给最近的，上未处理的错误中间件。



##### **可配置的中间件**

```javascript
module.exports = function (options) {
  return function (req, res, next) {
    // Implement the middleware function based on the options object
    next()
  }
}
```



##### **应用级中间件**

使用 `app.use()` 和 `app.METHOD()` 函数将应用级中间件绑定到 [app 对象](https://nodejs.cn/express/guide/using-middleware/##425dc919f24a4f8aa15a62cfa7907bb8) 的实例

```javascript
app.get('/user/:id', (req, res, next) => {
  res.send('USER')
})
//将会处理这个接口的get请求

app.use('/user/:id', (req, res, next) => {
  console.log('Request URL:', req.originalUrl)
  next()
}, (req, res, next) => {
  console.log('Request Type:', req.method)
  next()
})
//将会处理这个接口收到的所有请求
```

路由处理程序使得我们可以为路径定义多个路由，但是为同一个路径定义的一些路由未必会被调用：

```javascript
app.get('/user/:id', (req, res, next) => {
  console.log('ID:', req.params.id)
  next()
}, (req, res, next) => {
  res.send('User Info')
})

// handler for the /user/:id path, which prints the user ID
app.get('/user/:id', (req, res, next) => {
  res.send(req.params.id)
})
//第二个路由将不会被调用
```

此示例显示了一个处理对 `/user/:id` 路径的 GET 请求的中间件子堆栈。（中间件子堆栈是针对特定路由的一系列中间函数的集合）

```js
app.get('/user/:id', (req, res, next) => {
  // if the user ID is 0, skip to the next route
  if (req.params.id === '0') next('route')
  // otherwise pass the control to the next middleware function in this stack
  else next()
}, (req, res, next) => {
  // send a regular response
  res.send('regular')
})

// handler for the /user/:id path, which sends a special response
app.get('/user/:id', (req, res, next) => {
  res.send('special')
})
```





##### **路由级中间件**

其实工作方式跟应用级中间件是一样的 只是绑定在express.Router（）的实例上面：

```
const router = express.Router()
```

使用router.use(),router.METHOD()加载

同样是使用next('router')把控制权从实例传回主应用：

```javascript
// 引入 express 模块
const express = require('express');
// 创建一个 express 应用实例
const app = express();

// 创建一个路由器实例
const router = express.Router();

// 使用路由器的 use 方法来添加一个中间件
// 这个中间件会检查请求头中是否有 'x-auth' 字段
router.use((req, res, next) => {
  // 如果请求头中没有 'x-auth' 字段，则调用 next('router') 传递控制权给路由器的下一个中间件
  if (!req.headers['x-auth']) return next('router');
  // 如果存在 'x-auth' 字段，则调用 next() 继续处理请求
  next();
});

// 为路由器定义一个 GET 请求的处理函数，对应路径为 '/user/:id'
router.get('/user/:id', (req, res) => {
  // 向客户端发送响应 'hello, user!'
  res.send('hello, user!');
});

// 在应用实例上使用路由器，并为 '/admin' 路径设置这个路由器
// 这意味着所有以 '/admin' 开头的请求都会经过这个路由器
app.use('/admin', router);

// 添加一个错误处理中间件，用于处理通过路由器传递过来的请求
// 当路由器中的中间件调用 next('router') 时，会执行这个错误处理中间件
app.use((err, req, res, next) => {
  // 如果 err 等于 'router'，则发送 401 状态码
  if (err === 'router') {
    res.sendStatus(401);
  }
  // 如果有其他错误，则继续执行下一个错误处理中间件
  // 这里没有定义，所以会默认发送 500 状态码
  next(err);
});

// 启动服务器，监听 3000 端口
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```



**内置中间件**

也就是

* express.ststic 提供静态资源

* express.json 能够解析json

* express.urlencodeed 解析url编码

  

**第三方中间件**

比如使用cookie-parser解析cookie



### 重写express API

Express API 有两个扩展点：

1. `express.request` 和 `express.response` 的全球原型。
2. `app.request` 和 `app.response` 的应用特定原型。

更改全局原型将影响同一进程中所有已加载的 Express 应用程序。如果需要，可以通过仅在创建新应用程序后更改特定于应用程序的原型来进行特定于应用程序的更改



**重写方法**

可以通过分配自定义函数覆盖现有的方法：

```javascript
app.response.sendStatus = function (statusCode, type, message) {
  // code is intentionally kept simple for demonstration purpose
  return this.contentType(type)
    .status(statusCode)
    .send(message)
}
```

修改了sendStatus 接收状态嘛，编码类型，提示消息





**属性**



```javascript
Object.defineProperty(app.request, 'ip', {
  configurable: true,
  enumerable: true,
  get () { return this.get('Client-IP') }
})
```



## 模板引擎

模板引擎使应用程序里面可以使用静态模板文件，运行时模板引擎将会把模板文件里面的变量替换成实际值，并把模板转换成发生给客户端的模板文件。

与 Express 一起使用的一些流行的模板引擎是 [Pug](https://nodejs.cn/express/guide/using-template-engines/##8a7aeb4a16f74c20b05ab1a72fa5fd38)、[Mustache](https://nodejs.cn/express/guide/using-template-engines/##ee0b2dc757514a43bc09badd5e5c2fc9) 和 [EJS](https://nodejs.cn/express/guide/using-template-engines/##61363bc7dc3b47e6a934b2ea4360b9e8)。[Express 应用程序生成器](https://nodejs.cn/express/guide/using-template-engines/##eee5cb9751ee4483bd1d1117c0a2fa65) 使用 [Jade](https://nodejs.cn/express/guide/using-template-engines/##408e06f49f854dd69fdd86a3236ea8a1) 作为其默认值，但它也支持其他几个。（Jade已经重命名成Pug 可以继续使用jade）

**使用模板引擎**

1. 在应用里面指定模板文件所在目录 `app.set('views', './views')`

2. 指定使用的模板引擎 `app.set('view engine', 'pug')`(记得下载下来) 在app.js里面设置了使用的模板引擎 在应用的其他部分就不需要显示的引用加载模板引擎了，

3. 在指定的目录下面创建Pug模板文件 就比如：

   ```javascript
   html
     head
       title= title
     body
       h1= message
   ```

4. 然后创建一个路由来渲染 `index.pug` 文件。如果未设置 `view engine` 属性，则必须指定 `view` 文件的扩展名。否则，您可以省略它。

   ```js
   app.get('/', (req, res) => {
     res.render('index', { title: 'Hey', message: 'Hello there!' })
   })
   ```

注意：视图引擎缓存不缓存模板输出的内容，只缓存底层模板本身。即使缓存打开，视图仍会随每个请求重新呈现。



### **错误处理**



**捕捉错误**

路由处理程序 中间件里面的同步代码里面发生的错误不需要额外处理  express会自动处理

但是对于异步函数 就必须把异步函数里面发生的错误传递给next函数 。返回promise对象的路由处理程序或是中间件会在promise被拒绝 或者失败的时候自动把错误通过next传递。如果没有提供拒绝值 那么会使用express提供的默认错误对象

如果异步函数不提供数据，只提供错误（只关心操作是不是成功） 可以简化代码：

```javascript
app.get('/', [
  function (req, res, next) {
    fs.writeFile('/inaccessible-path', 'data', next)
  },
  function (req, res) {
    res.send('OK')
  }
])
```



对于同步代码错误的处理 可以使用try catch，但是 如果代码里面有多个可能抛出错误的地方 就可能会大量出现try catch。这个时候 就可以利用promise自动捕获同步代码错误 处理被拒绝的promise的特性解决这个问题-使用链式的promise

```javascript
fs.readFile('file1.txt', 'utf8')
  .then(data => {
    // 处理 file1.txt 的数据...
    return fs.readFile('file2.txt', 'utf8');
  })
  .then(data => {
    // 处理 file2.txt 的数据...
    // 更多的异步操作...
  })
  .catch(err => {
    // 捕获所有链中的错误
    console.error(err);
  });
```

```js
app.get('/', (req, res, next) => {
  Promise.resolve().then(() => {
    throw new Error('BROKEN')
  }).catch(next) // Errors will be passed to Express.
})
```

由于 Promise 自动捕获同步错误和被拒绝的 Promise，您可以简单地提供 `next` 作为最终的 catch 处理程序，Express 将捕获错误，因为 catch 处理程序将错误作为第一个参数。



还可以把异步操作封装在单个异步处理阶段里面 通过同步代码处理后续逻辑：

```javascript
app.get('/', [
  function (req, res, next) {
    fs.readFile('/maybe-valid-file', 'utf-8', (err, data) => {
      res.locals.data = data
      next(err)
    })
  },
  function (req, res) {
    res.locals.data = res.locals.data.split(',')[1]
    res.send(res.locals.data)
  }
])
```

这种方法 分离了异步错误 同步错误 。如果异步操作发生了错误，那么会把错误传递下去 如果同步操作错误会被express自动捕获。



**默认错误处理程序**

Express 带有一个内置的错误处理程序，可以处理应用程序中可能遇到的任何错误。这个默认的错误处理中间件函数被添加到中间件函数栈的末尾。

如果把错误对象传递给next 但是 **没有在自定义错误处理中间件里没有正确处理这个错误**（没有发送响应） 那么这个错误会交给默认错误处理程序。

默认错误处理程序在写入错误的时候，会在响应里面添加以下信息：

* res.statusCode 由err.status设置 或者err.stattusCode 如果这个值不在4xx 5xx内 那么将会被设置成500
* res.statusMesage会根据状态🐎设置。
* 生产环境里面 响应体是状态码消息的HTML 开发环境里面是错误堆栈
* err.headers对象里面指定的任何标头

如果在 开始编写响应之后调用next（）并且出现了错误 ，比如流式传输的时候，那么控制权将会交给默认处理程序 ，默认处理程序会关闭连接 并使请求失败。

所以在自定义错误处理程序的时候需要考虑到：在错误发生的时候，响应的头部可能已经可能已经发送给客户端了，这个时候需要交给默认错误处理中间件处理：

```js
function errorHandler(err, req, res, next) {
  // 检查响应头部是否已经发送
  if (res.headersSent) {
    // 如果头部已经发送，委托给默认的Express错误处理程序
    return next(err);
  }
  
  // 如果头部未发送，设置响应状态码为500
  res.status(500);
  
  // 渲染错误页面，并传递错误对象
  res.render('error', { error: err });
}
```



如果一个请求地址有多个路由处理程序 也可以使用next('route')跳转到下一个路由处理程序

```javascript
app.get('/a_route_behind_paywall',
  (req, res, next) => {
    if (!req.user.hasPaid) {
      // continue handling this request
      next('route')
    } else {
      next()
    }
  }, (req, res, next) => {
    PaidContent.find((err, doc) => {
      if (err) return next(err)
      res.json(doc)
    })
  })
```



## 调试

使用 `debug`模块来记录调试信息 这个就像控制台打印，但是日志记录是默认关闭的，应该使用DEBUG环境变量打开。

要查看express所有内部日志，应该在启动应用程序的时候把环境变量设置成：

```javascript
$ DEBUG=express:* node index.js
> set DEBUG=express:* & node index.js
```

在生成器生成的默认应用程序上运行会得到以下输出：

```javascript
express:router:route new /：

表示创建了一个新的路由路径 /。这意味着 Express 应用中添加了一个处理 / 路径的路由。
express:router:layer new /：

表示创建了一个新的中间件层，用于处理 / 路径的请求。
express:router:route get /：

表示创建了一个新的 GET 请求路由 /。这意味着 Express 应用中添加了一个处理 GET 请求的 / 路径的路由。
express:application compile etag weak：

表示 Express 应用正在编译一个弱 ETag。ETag 是一个 HTTP 头部字段，用于确定客户端缓存的响应是否最新。
express:application compile query parser extended：

表示 Express 应用正在编译一个扩展的查询字符串解析器。这允许解析更复杂的查询字符串。
express:application compile trust proxy false：

表示 Express 应用不信任任何代理。这是一个安全设置，用于确定是否应该从代理头字段中获取客户端的 IP 地址。
express:application booting in development mode：

表示 Express 应用正在以开发模式启动。
express:router use /：

表示中间件被添加到 Express 应用的 / 路径。
express:router:layer new /：

表示为 / 路径创建了一个新的中间件层。
express:router use / favicon：

表示添加了一个处理 favicon 请求的中间件。
express:router use / logger：

表示添加了一个日志记录中间件。
express:router use / jsonParser：

表示添加了一个解析 JSON 格式请求体的中间件。
express:router use / urlencodedParser：

表示添加了一个解析 URL 编码格式请求体的中间件。
express:router use / cookieParser：

表示添加了一个解析 Cookie 的中间件。
express:router use / stylus：

表示添加了一个用于 Stylus 样式处理的中间件。
express:router use / serveStatic：

表示添加了一个提供静态文件服务的中间件。
express:router use / router：

表示添加了一个路由中间件。
express:router use /users router：

表示添加了一个处理 /users 路径的路由中间件。
```

发起请求的时候  将会看到这样的信息：

```javascript
express:router dispatching GET / +4h：

表示 Express.js 开始分派一个 GET 请求到 / 路径。+4h 表示请求处理已经花费了 4 小时，这通常是相对于应用启动的时间。
express:router query / +2ms：

表示 query 中间件正在处理 / 路径的请求，并且花费了 2 毫秒。
express:router expressInit / +0ms：

表示 expressInit 中间件正在处理 / 路径的请求，这个中间件通常是 Express 用来执行一些初始化工作的。
express:router favicon / +0ms：

表示 favicon 中间件正在处理 / 路径的请求，这个中间件用于处理网站图标（favicon）的请求。
express:router logger / +1ms：

表示 logger 中间件正在处理 / 路径的请求，并且花费了 1 毫秒。这个中间件通常用于记录请求的日志。
express:router jsonParser / +0ms：

表示 jsonParser 中间件正在处理 / 路径的请求，这个中间件用于解析 JSON 格式的请求体。
express:router urlencodedParser / +1ms：

表示 urlencodedParser 中间件正在处理 / 路径的请求，这个中间件用于解析 URL 编码的请求体。
express:router cookieParser / +0ms：

表示 cookieParser 中间件正在处理 / 路径的请求，这个中间件用于解析 Cookie。
express:router stylus / +0ms：

表示 stylus 中间件正在处理 / 路径的请求，这个中间件用于处理 Stylus 样式文件。
express:router serveStatic / +2ms：

表示 serveStatic 中间件正在处理 / 路径的请求，并且花费了 2 毫秒。这个中间件用于提供静态文件服务。
express:router router / +2ms：

表示另一个路由中间件正在处理 / 路径的请求，并且花费了 2 毫秒。
express:router dispatching GET / +1ms：

表示 Express.js 再次分派一个 GET 请求到 / 路径，并且花费了 1 毫秒。
express:view lookup "index.pug" +338ms：

表示 Express.js 花费了 338 毫秒来查找视图文件 index.pug。
express:view stat "/projects/example/views/index.pug" +0ms：

表示 Express.js 检查了视图文件 index.pug 的状态，这个过程几乎瞬间完成。
express:view render "/projects/example/views/index.pug" +1ms：

表示 Express.js 渲染了视图文件 index.pug，并且花费了 1 毫秒。
```

要仅查看来自路由实现的日志，请将 `DEBUG` 的值设置为 `express:router`。同样，要仅从应用程序实现中查看日志，请将 `DEBUG` 的值设置为 `express:application`，依此类推。



**调试特定的应用程序**

```javascript
$ DEBUG=sample-app:* node ./bin/www
```

| 名称                | 目的                           |
| ------------------- | ------------------------------ |
| `DEBUG`             | 启用/禁用特定的调试命名空间。  |
| `DEBUG_COLORS`      | 是否在调试输出中使用颜色。     |
| `DEBUG_DEPTH`       | 对象检查深度。                 |
| `DEBUG_FD`          | 要将调试输出写入的文件描述符。 |
| `DEBUG_SHOW_HIDDEN` | 显示检查对象的隐藏属性。       |





## 代理后面的express

在反向代理之后运行express应用程序时 有些api的返回值会和预期有所不同。尤其是关于获取客户端ip地址。express提供了trust proxy解决这个问题，这个设置允许express识别真实ip地址。

**布尔值**

- `app.set('trust proxy', true);`：如果设置为 `true`，则 Express 会尝试从 `X-Forwarded-For` HTTP 头部中获取客户端的真实 IP 地址。这意味着，如果你的应用程序后面只有一个反向代理，你可以这样设置。
- `app.set('trust proxy', false);`：这是默认设置，表示 Express 认为它直接面向客户端，客户端的 IP 地址来源于 `req.socket.remoteAddress`。

**IP** 

- `app.set('trust proxy', 'loopback');`：你可以指定一个或多个 IP 地址、子网，或者使用预配置的子网名称来告诉 Express 哪些 IP 地址是受信任的反向代理。 （这里的loopback是一个预置的子网名称 指的是本地回环地址 ） 如果请求不是来自这两个地址 那么express不会信任这个请求的下forward for 会使用req.socket.remoteAddress
- `app.set('trust proxy', 'loopback, 123.123.123.123');`：你可以指定单个子网和地址。
- `app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);`：你可以指定多个子网作为数组。

**数字**

- `app.set('trust proxy', 1);`：这个设置告诉 Express 使用距离应用程序最多 `n` 跳数的地址。`0` 的值意味着没有反向代理。

**函数**

- `app.set('trust proxy', (ip) => { ... });`：你可以提供一个自定义函数来决定哪些 IP 地址是受信任的



#### **express.json([options])**

这个内置函数用于把json格式的请求体转换成js对象 接收unicode编码的正文，这意味折可以处理各种语言，并且支持gzip deflate编码的自动膨胀，这边名如果请求体被压缩 中间件可以自动解压。并且会把解析之后数据填充到请求对象的body属性里面  

| 属性      | 描述                                                         | 类型   | 默认                 |
| --------- | ------------------------------------------------------------ | ------ | -------------------- |
| `inflate` | 启用或禁用处理放气（压缩）的主体；当禁用时，瘪的主体会被拒绝。 | 布尔值 | `true`               |
| `limit`   | 控制最大请求正文大小。如果这是一个数字，则该值指定字节数；如果是字符串，则将值传递给[bytes](https://nodejs.cn/express/5x/api/express/##77e915d37daf4526a0dece84299231e5)库进行解析。 | 混合   | `"100kb"`            |
| `reviver` | `reviver` 选项作为第二个参数直接传递给 `JSON.parse`。您可以找到有关此论点 [在关于 JSON.parse 的 MDN 文档中](https://nodejs.cn/express/5x/api/express/##57a8cabfa9da484daea8391d61624d4b) 的更多信息。 | 函数   | `null`               |
| `strict`  | 启用或禁用仅接受数组和对象；禁用时将接受 `JSON.parse` 接受的任何内容。 | 布尔值 | `true`               |
| `type`    | 这用于确定中间件将解析的媒体类型。此选项可以是字符串、字符串数组或函数。如果不是函数，则 `type` 选项直接传递给 [type-is](https://nodejs.cn/express/5x/api/express/##3ba8008662bf4ca4a5053861a87c960f) 库，它可以是扩展名（如 `json`）、mime 类型（如 `application/json`）或带有通配符的 mime 类型（如 `*/*` 或 `*/json`）。如果是函数，则 `type` 选项被称为 `fn(req)`，如果请求返回真值，则解析请求。 | 混合   | `"application/json"` |
| `verify`  | 此选项（如果提供）称为 `verify(req, res, buf, encoding)`，其中 `buf` 是原始请求正文的 `Buffer`，`encoding` 是请求的编码。可以通过抛出错误来中止解析。 | 函数   | `undefined`          |

**express.static(root,[options])**

提供静态文件的中间函数

| 属性           | 描述                                                         | 类型   | 默认         |
| -------------- | ------------------------------------------------------------ | ------ | ------------ |
| `dotfiles`     | 确定如何处理点文件（以点 "." 开头的文件或目录）。  见下文[dotfiles](https://nodejs.cn/express/5x/api/express/##6c44902d56c44f8a8497c8cca8295e44)。 | 字符串 | "ignore"     |
| `etag`         | 启用或禁用 etag 生成  注意：`express.static` 总是发送弱 ETag。 | 布尔值 | `true`       |
| `extensions`   | 设置文件扩展名后备：如果找不到文件，请搜索具有指定扩展名的文件并提供第一个找到的文件。示例：`['html', 'htm']`。 | 混合   | `false`      |
| `fallthrough`  | 让客户端错误作为未处理的请求通过，否则转发客户端错误。  见下文[fallthrough](https://nodejs.cn/express/5x/api/express/##1873761495e744bdad2838df0d186132)。 | 布尔值 | `true`       |
| `immutable`    | 在 `Cache-Control` 响应标头中启用或禁用 `immutable` 指令。如果启用，还应指定 `maxAge` 选项以启用缓存。`immutable` 指令将阻止受支持的客户端在 `maxAge` 选项的生命周期内发出条件请求以检查文件是否已更改。 | 布尔值 | `false`      |
| `index`        | 发送指定的目录索引文件。设置为 `false` 以禁用目录索引。      | 混合   | "index.html" |
| `lastModified` | 将 `Last-Modified` 标头设置为操作系统上文件的最后修改日期。  | 布尔值 | `true`       |
| `maxAge`       | 设置 Cache-Control 标头的 max-age 属性（以毫秒为单位）或 [ms 格式](https://nodejs.cn/express/5x/api/express/##e4d45504b8b544e8b894ac73753ce8cf) 中的字符串。 | 数字   | 0            |
| `redirect`     | 当路径名是目录时，重定向到尾随 "/"。                         | 布尔值 | `true`       |
| `setHeaders`   | 用于设置 HTTP 标头以与文件一起服务的功能。  见下文[setHeaders](https://nodejs.cn/express/5x/api/express/##78a4ce70938e4e0ebaf0750b2b4e6ce0)。 | 函数   |              |



#### **express.Router([options])**

创建一个新的router对象

| 属性            | 描述                                                         | 默认                                                  | 可用性 |
| --------------- | ------------------------------------------------------------ | ----------------------------------------------------- | ------ |
| `caseSensitive` | 启用区分大小写。                                             | 默认禁用，将 "/Foo" 和 "/foo" 视为相同。              |        |
| `mergeParams`   | 保留来自父路由的 `req.params` 值。如果父项和子项的参数名称冲突，则子项的值优先。 | `false`                                               | 4.5.0+ |
| `strict`        | 启用严格路由。                                               | 默认情况下禁用，路由对 "/foo" 和 "/foo/" 的处理相同。 |        |





#### express.urlencoded

解析urlencoded编码的请求体  支持gzip deflate的自动解压缩

| 属性             | 描述                                                         | 类型   | 默认                                  |
| ---------------- | ------------------------------------------------------------ | ------ | ------------------------------------- |
| `extended`       | 此选项允许在使用 `querystring` 库（当 `false`）或 `qs` 库（当 `true`）解析 URL 编码数据之间进行选择。"extended" 语法允许将丰富的对象和数组编码为 URL 编码格式，从而提供类似 JSON 的 URL 编码体验。欲了解更多信息，请 [查看 qs 库](https://nodejs.cn/express/5x/api/express/##34e42bd9589249989dcf0832d8d27b27)。 | 布尔值 | `false`                               |
| `inflate`        | 启用或禁用处理放气（压缩）的主体；当禁用时，瘪的主体会被拒绝。 | 布尔值 | `true`                                |
| `limit`          | 控制最大请求正文大小。如果这是一个数字，则该值指定字节数；如果是字符串，则将值传递给[bytes](https://nodejs.cn/express/5x/api/express/##77e915d37daf4526a0dece84299231e5)库进行解析。 | 混合   | `"100kb"`                             |
| `parameterLimit` | 此选项控制 URL 编码数据中允许的最大参数数。如果请求包含的参数多于该值，则会引发错误。 | 数字   | `1000`                                |
| `type`           | 这用于确定中间件将解析的媒体类型。此选项可以是字符串、字符串数组或函数。如果不是函数，则 `type` 选项直接传递给 [type-is](https://nodejs.cn/express/5x/api/express/##3ba8008662bf4ca4a5053861a87c960f) 库，它可以是扩展名（如 `urlencoded`）、mime 类型（如 `application/x-www-form-urlencoded`）或带有通配符的 mime 类型（如 `*/x-www-form-urlencoded`）。如果是函数，则 `type` 选项被称为 `fn(req)`，如果请求返回真值，则解析请求。 | 混合   | `"application/x-www-form-urlencoded"` |
| `verify`         | 此选项（如果提供）称为 `verify(req, res, buf, encoding)`，其中 `buf` 是原始请求正文的 `Buffer`，`encoding` 是请求的编码。可以通过抛出错误来中止解析。 | 函数   | `undefined`                           |





#### 应用

app对象通常表示express应用程序 

`app` 对象具有用于

- 路由 HTTP 请求； 例如，参见 [app.METHOD](https://nodejs.cn/express/5x/api/app/##b77d9898c9f14c15a2383d0772644051) 和 [app.param](https://nodejs.cn/express/5x/api/app/##615dc3877d214f75aa3aeb017e97065a)。
- 配置中间件； 见 [app.route](https://nodejs.cn/express/5x/api/app/##ec5c0df4417e42aeabff6644992024ee)。
- 渲染 HTML 视图； 见 [app.render](https://nodejs.cn/express/5x/api/app/##9fb7213fba0a4f91969626ee600977d8)。
- 注册模板引擎； 见 [app.engine](https://nodejs.cn/express/5x/api/app/##8f9a8559c3dd46af86508c8dce0626c2)。





**app.locals**

这个对象的属性是应用程序的局部变量，并且可以在res.render呈现的模板里面使用。

app.locals属性的值将会在程序的整个生命周期里面保持不变（不会被express改变 但是可以手动改变 但是这个属性还是应该存储不会改变的值），而 [res.locals](https://nodejs.cn/express/5x/api/app/##43e277e9dbd449179d9920ed9750a94f) 属性仅在请求的生命周期内有效。

通过应用级的局部变量可以做到在模板之间共享数据（也就是在多个模板里面使用应用级别的局部变量） 或是在模板和中间件之间共享数据（也就是在中间件里面定义）



**app.mountpath**

这个属性表示子应用的挂载路径，如果子应用挂载在多个路径模式上面，将会返回数组。

```javascript
// subApp.js
const express = require('subApp');

const subApp = express();

// 子应用的路由
subApp.get('/example', (req, res) => {
  // 使用子应用的挂载路径构建URL
  const url = `${req.app.mountpath}/example`;
  res.send(`This request is handled by the sub app at ${url}`);
});

module.exports = subApp;

// app.js
const express = require('express');
const subApp = require('./subApp'); // 引入子应用

const app = express();

// 将子应用挂载到主应用的 '/sub' 路径上
app.use('/sub', subApp);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```





**app.router**

应用程序的内置路由实例 在第一次访问的时候惰性创建（也就是说 这个路由实例只有在这个函数调用的时候才会创建）





**app.on()**

当子应用安装在父应用上时，`mount` 事件会在子应用上触发。父应用程序被传递给回调函数。

> **注意**
>
> 子应用程序将：
>
> - 不继承具有默认值的设置值。您必须在子应用程序中设置该值。。例如，如果你在父应用程序中设置了 `app.set('view engine', 'pug')`，这个设置不会自动应用到子应用程序。你必须在子应用程序中显式设置这些值。
> - 对于那些没有默认值的设置项，子应用会自动继承父应用的设置。这意味着，如果你在父应用中设置了某个自定义的设置项，这个设置会被所有挂载的子应用继承，除非你在子应用中覆盖了这个设置。
>
> 详见 [应用程序设置](https://nodejs.cn/express/5x/api/app/##e6d2b5651f8d48839175751d66b1e291)。

```js
const admin = express()

admin.on('mount', (parent) => {
  console.log('Admin Mounted')
  console.log(parent) // refers to the parent app
})

admin.get('/', (req, res) => {
  res.send('Admin Homepage')
})

app.use('/admin', admin)
```



**app.all**

匹配所有路径的一个中间件。



**app.disable(prop)**

把prop的值设置成false 和`app.ser(prop,false)` 的效果是一样的



**app.disabled(prop)**

如果prop的值是false 返回true

**app.enable(prop) app.enabled(prop)**



**app.engine(ext,callback)**

这个api会指定对某个文件拓展名应用的渲染引擎

express会根据要渲染的文件的拓展名决定使用哪个模板引擎。

`app.engine('pug', require('pug').__express)`

由于express希望的渲染引擎是具有__express方法的 但是有一些引擎并没有这个方法 比如ejs

`EJS 模板引擎提供了一个 `ejs.renderFile()` 方法，这个方法的签名与 Express.js 期望的 `.__express` 方法相同。为了与 Express.js 集成，EJS 在内部将 `ejs.renderFile()` 方法别名为 `ejs.__express`。这意味着 EJS 实际上有两个名称指向同一个函数：`ejs.renderFile()` 和 `ejs.__express`。`



**app.get(name)**

返回name的值



**app.listen(path,[callback])**

启动一个 UNIX 套接字并监听给定路径上的连接。此方法与 Node 的 [http.Server.listen()](https://nodejs.cn/express/5x/api/app/##9779f1f4f4774f1ca24d1b3234d777ab) 相同。

```js
//服务器代码
const express = require('express');
const http = require('http');
const fs = require('fs');
const path = '/tmp/sock';

// 创建 Express 应用
const app = express();

// 用于处理请求的简单路由
app.get('/', (req, res) => {
  res.send('Hello from Express.js server');
});

// 创建一个 HTTP 服务器，并将其与 Express 应用关联
const server = http.createServer(app);

// 监听 UNIX 套接字
server.listen(path, () => {
  console.log('Server is running and listening on UNIX socket:', path);

  // 确保套接字文件没有被其他进程使用
  fs.chmod(path, '777', () => {
    console.log('Socket file permissions set to 777');
  });
});

// 处理错误
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('Socket is already in use, perhaps the server is already running?');
  } else {
    console.log('Error starting server:', err);
  }
});


//客户端代码
const fs = require('fs');
const http = require('http');
const path = '/tmp/sock';

// 创建一个 UNIX 套接字的 HTTP 客户端
const client = http.createClient({ path: path });

// 发送请求
const req = client.request('GET', '/', { 'host': 'localhost' });

req.on('response', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Received data from server:', data);
  });
});

req.end();
```



** app.listen([port[, host[, backlog]]][, callback])*

如果端口被省略或为 0，操作系统将分配一个任意未使用的端口，这对于自动化任务（测试等）等情况很有用。

```js
const express = require('express')
const app = express()
app.listen(3000)
```



由于express（）返回的app实例其实就是一个js函数，不会保存下来什么信息，他的作用就是处理网路请求，所以这个app可以使得为https http版本的应用程序提供相同的代码库变得简单：

```javascript
const express = require('express')
const https = require('https')
const http = require('http')
const app = express()

http.createServer(app).listen(80)
https.createServer(options, app).listen(443)
```



并且app.listen其实就是对于server.listen的一个封装：

```js
app.listen = function () {
  const server = http.createServer(this)
  return server.listen.apply(server, arguments)
}
```



**app.param(name,callback)**

给路由参数添加回调触发器，如果name是一个参数数组，那么会按照声明顺序为每个参数创建回调函数，对于除了最后一个之外的每个参数，在回调函数里面调用next就会处理下一个参数，对于最后一个参数，会把控制权转交给下一个中间件：

```js
app.param(['id', 'page'], (req, res, next, value) => {
  console.log('CALLED ONLY ONCE with', value)
  next()
})

app.get('/user/:id/:page', (req, res, next) => {
  console.log('although this matches')
  next()
})

app.get('/user/:id/:page', (req, res) => {
  console.log('and this matches too')
  res.end()
})
```

在 `GET /user/42/3` 上，打印以下内容：

```sql
CALLED ONLY ONCE with 42
CALLED ONLY ONCE with 3
although this matches
and this matches too
```



**app.path()**

获取应用程序的规范路径：

```javascript
const app = express()
const blog = express()
const blogAdmin = express()

app.use('/blog', blog)
blog.use('/admin', blogAdmin)

console.log(app.path()) // ''
console.log(blog.path()) // '/blog'
console.log(blogAdmin.path()) // '/blog/admin'
```



**app.render(view,[locals],callback)**

通过 `callback` 函数返回视图的呈现 HTML。它接受一个可选参数，该参数是一个包含视图局部变量的对象。它和 [res.render()](https://nodejs.cn/express/5x/api/app/##28f68dc3e06c4a79a308bd1fee3b0ac0) 一样，只是它不能自己将渲染视图发送给客户端。

res.render内部实现用的其实就是app.render

可以启用渲染引擎的缓存设置：

```javascript
// 启用 Pug 模板的缓存
app.enable('view cache');
```





**app.route(path)**

返回单个路由的实例，可以使用这个实例很方便地处理带有可选中间件的HTTP动词（这个可选中间件指的就是一个不会对所有HTTP方法都有作用的中间件）

```javascript
const app = express()

app.route('/events')
  .all((req, res, next) => {
    // runs for all HTTP verbs first
    // think of it as route specific middleware!
  })
  .get((req, res, next) => {
    res.json({})
  })
  .post((req, res, next) => {
    // maybe add a new event...
  })
```





**app.set(name,value)**



**应用程序设置**

子应用程序：

1. 不会继承带有默认值的设置，需要手动在子应用里面进行设置
2. 会继承不带有默认值的设置（下表）

例外：子应用将继承 `trust proxy` 的值，即使它有一个默认值（为了向后兼容）；子应用在生产中不会继承 `view cache` 的值（当 `NODE_ENV` 为 "production" 时）。



| 属性                     | 类型         | 描述                                                         | 默认                                                         |
| ------------------------ | ------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| `case sensitive routing` | 布尔值       | 启用区分大小写。启用后，"/Foo" 和 "/foo" 是不同的路由。禁用时，"/Foo" 和 "/foo" 被视为相同。**注意**：子应用将继承此设置的值。 | N/A (undefined)                                              |
| `env`                    | 字符串       | 环境模式。生产环境一定要设置为"production"；见 [生产最佳实践：性能和可靠性](https://nodejs.cn/express/5x/api/app/##da086bd1ac284ec4a673f96cd6bda1cd)。 | `process.env.NODE_ENV`（`NODE_ENV` 环境变量）或 "development"（如果未设置 `NODE_ENV`）。 |
| `etag`                   | 多变         | 设置 ETag 响应标头。有关可能的值，请参阅 [`etag` 选项表](https://nodejs.cn/express/5x/api/app/##48af6d3aea654253a010e1267f8701a7)。[有关 HTTP ETag 标头的更多信息](https://nodejs.cn/express/5x/api/app/##d100a640655d4168b0661c36c95f1551)。 | `weak`                                                       |
| `jsonp callback name`    | 字符串       | 指定默认 JSONP 回调名称。                                    | "callback"                                                   |
| `json escape`            | 布尔值       | 启用从 `res.json`、`res.jsonp` 和 `res.send` API 转义 JSON 响应。这会将字符 `<`、`>` 和 `&` 转义为 JSON 中的 Unicode 转义序列。这样做的目的是在客户端嗅探 HTML 响应时协助 [缓解某些类型的持续性 XSS 攻击](https://nodejs.cn/express/5x/api/app/##14aa7a8e68df40108015cd4d8ee563ae)。**注意**：子应用将继承此设置的值。 | N/A (undefined)                                              |
| `json replacer`          | 多变         | [`JSON.stringify` 使用的 'replacer' 参数](https://nodejs.cn/express/5x/api/app/##7311c7171a2c4ba9b793bdc8efa23f9e)。**注意**：子应用将继承此设置的值。 | N/A (undefined)                                              |
| `json spaces`            | 多变         | [`JSON.stringify` 使用的 'space' 参数](https://nodejs.cn/express/5x/api/app/##09eda2995fec4e9d9922fe2d783448b5)。这通常设置为用于缩进美化 JSON 的空格数。**注意**：子应用将继承此设置的值。 | N/A (undefined)                                              |
| `query parser`           | 多变         | 通过将值设置为 `false` 来禁用查询解析，或者将查询解析器设置为使用 "simple" 或 "extended" 或自定义查询字符串解析函数。简单查询解析器基于 Node 的原生查询解析器 [querystring](https://nodejs.cn/express/5x/api/app/##eaf9eeb94612458e967237a4606d18f3)。扩展查询解析器基于 [qs](https://nodejs.cn/express/5x/api/app/##7b286edb72364af1b19a691679f54335)。自定义查询字符串解析函数将接收完整的查询字符串，并且必须返回查询键及其值的对象。 | "extended"                                                   |
| `strict routing`         | 布尔值       | 启用严格路由。启用后，路由将 "/foo" 和 "/foo/" 视为不同。否则，路由将 "/foo" 和 "/foo/" 视为相同。**注意**：子应用将继承此设置的值。 | N/A (undefined)                                              |
| `subdomain offset`       | 数字         | 要删除以访问子域的主机的点分隔部分的数量。                   | 2                                                            |
| `trust proxy`            | 多变         | 指示应用程序位于前端代理之后，并使用 `X-Forwarded-*` 标头来确定客户端的连接和 IP 地址。注意：`X-Forwarded-*` 标头很容易被欺骗，检测到的 IP 地址不可靠。启用后，Express 会尝试确定通过前端代理或一系列代理连接的客户端的 IP 地址。`req.ips` 属性，然后包含客户端连接通过的 IP 地址数组。要启用它，请使用 [信任代理选项表](https://nodejs.cn/express/5x/api/app/##89f7f9a8db66464087e60ecb510d0d74) 中描述的值。`trust proxy` 设置是使用 [proxy-addr](https://nodejs.cn/express/5x/api/app/##a9f50e1906194572b8ff74af2efc2ff2) 包实现的。有关更多信息，请参阅其文档。**注意**：子应用将继承此设置的值，即使它具有默认值。 | `false`（已禁用）                                            |
| `views`                  | 字符串或数组 | 应用程序视图的目录或目录数组。如果是数组，则按照它们在数组中出现的顺序查找视图。 | `process.cwd() + '/views'`                                   |
| `view cache`             | 布尔值       | 启用视图模板编译缓存。**注意**：子应用在生产中不会继承此设置的值（当 `NODE_ENV` 为 "production" 时）。 | `true` 在生产中，否则未定义。                                |
| `view engine`            | 字符串       | 省略时使用的默认引擎扩展。**注意**：子应用将继承此设置的值。 | N/A (undefined)                                              |
| `x-powered-by`           | 布尔值       | 启用 "X-Powered-By: Express" HTTP 标头。                     | `true`                                                       |

ETag响应标头是HTTP协议里面的一个字段，用于标识响应体里卖弄资源的特定版本，这个属性的值通常是资源内容的哈希值，可以用来检测返回的资源是否有变化。



#### etag 设置选项[中英](https://nodejs.cn/express/5x/api/app/~/etag.options.table/)

**注意**：这些设置仅适用于动态文件，不适用于静态文件。[express.static](https://nodejs.cn/express/5x/api/app/##5e8259cc1b4443db9e7d6968a7707f83) 中间件会忽略这些设置。

ETag 功能是使用 [etag](https://nodejs.cn/express/5x/api/app/##0e826f7dfcc24024b462d54ddbe0998b) 包实现的。有关更多信息，请参阅其文档。

| 类型   | 值                                                           |
| ------ | ------------------------------------------------------------ |
| 布尔值 | `true` 启用弱 ETag。这是默认设置。`false` 完全禁用 ETag。    |
| 字符串 | 如果 "strong"，启用强 ETag。如果 "weak"，启用弱 ETag。       |
| 函数   | 自定义 ETag 函数实现。仅当您知道自己在做什么时才使用它。`app.set('etag', (body, encoding) => {  return generateHash(body, encoding) // consider the function is defined })` |

## 请求

req对象其实就是Node自带的请求对象的增强版本



**req.app**

这个属性指向使用中间件的Express的应用程序实例



**req.baseUrl**

安装路由实例的URL路径

`req.baseUrl` 属性类似于 `app` 对象的 [mountpath](https://nodejs.cn/express/5x/api/req/##a558e25b23ac4d1f8691e79d84dcbafb) 属性，除了 `app.mountpath` 返回匹配的路径模式。

路径模式是指在 Express 应用中用于匹配请求 URL 的字符串模式。例如，如果你使用 `app.use('/api', someRouter)` 将一个路由器挂载到 `/api` 路径上，那么 `'/api'` 就是一个路径模式。



- 在 URL `http://example.com/users/123` 中，`/users/123` 就是 URL 路径。

路径模式（Path Pattern）

路径模式是 Express.js 路由中使用的字符串，它定义了一组 URL 路径规则，用于匹配进入的请求。路径模式可以包含静态部分和动态部分。动态部分用冒号 `:` 表示，用于捕获 URL 中的特定部分作为参数。

**示例**：

- `/users/:userId` 是一个路径模式，其中 `:userId` 是一个动态部分，可以匹配任何 `/users/` 后面的内容，并将这部分内容作为参数 `userId` 传递给路由处理函数。

动态路径参数

在路径模式中，你可以定义动态路径参数，这些参数在请求到达路由处理函数时作为变量使用。

例如：

```js
const greet = express.Router()

greet.get('/jp', (req, res) => {
  console.log(req.baseUrl) // /greet
  res.send('Konichiwa!')
})

app.use('/greet', greet) // load the router on '/greet'
```

如果使用的是 **路由模式 或者是一组路由模式** 这个属性会返回请求的地址 也就是一个字符串 而不是原来的模式。





**req.body**

以下示例显示如何使用正文解析中间件填充 `req.body`。

```js
// 引入 Express.js 框架
const express = require('express');
// 创建一个 Express 应用实例
const app = express();

// 引入 body-parser 中间件，用于解析请求体
const bodyParser = require('body-parser');
// 引入 multer 中间件，用于处理 multipart/form-data 类型的请求，通常用于文件上传
const multer = require('multer'); // v1.0.5

// 创建一个 multer 实例，用于解析 multipart/form-data
const upload = multer(); 

// 使用 body-parser 中间件解析 JSON 格式的请求体
app.use(bodyParser.json()); 
// 使用 body-parser 中间件解析 URL 编码的请求体，extended: true 允许解析复杂的数据结构
app.use(bodyParser.urlencoded({ extended: true }));

// 定义 POST 请求的处理函数，用于 '/profile' 路径
app.post('/profile', upload.array(), (req, res, next) => {
  // 打印请求体中的数据
  console.log(req.body);
  // 将请求体中的数据作为 JSON 响应返回
  res.json(req.body);
});

// 启动服务器，监听 3000 端口
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```





**req.cookies**

使用 [cookie-parser](https://nodejs.cn/express/5x/api/req/##8cf17d57c2dc48da9c542053a4e58fb0) 中间件时，该属性是一个包含请求发送的 cookie 的对象。如果请求不包含 cookie，则默认为 `{}`。

```js
// Cookie: name=tj
console.dir(req.cookies.name)
// => "tj"
```

如果 cookie 已签名，则必须使用 [req.signedCookies](https://nodejs.cn/express/5x/api/req/##59af6d0c2d2c4469a008f76e59c80856)。

已经签名的cookie指的是通过cookie-parser进行签名的cookie

```javascript
const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();

// 使用 cookie-parser 中间件，并提供一个密钥
app.use(cookieParser('your_secret_key'));

// 设置一个签名 Cookie
app.get('/set-cookie', (req, res) => {
  res.cookie('username', 'john', { signed: true });
  res.send('Cookie has been set');
});

// 获取签名 Cookie
app.get('/get-cookies', (req, res) => {
  // req.signedCookies 包含已签名且验证通过的 Cookie
  const signedCookies = req.signedCookies;
  res.json(signedCookies);
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```



有关更多信息、问题或疑虑，请参阅 [cookie-parser](https://nodejs.cn/express/5x/api/req/##7708cd459b244f1a9de6007f238302b8)。





**req.fresh**

当响应在客户端的缓存里面还是fresh的时候，返回true，否则就是false，标识客户端缓存已经过期

Express.js 使用 `req.fresh` 来检查客户端缓存的状态，这通常涉及到以下几个头部：

1. **`Cache-Control`**：客户端发送的 `Cache-Control: no-cache` 请求头指示浏览器希望重新从服务器获取资源，即使缓存是最新的。当这个头部存在时，`req.fresh` 返回 `false`。
2. **`ETag`**：ETag（Entity Tag）是一个响应头部，用于标识资源的特定版本。如果客户端的 ETag 与服务器上的 ETag 匹配，那么 `req.fresh` 返回 `true`，表示客户端缓存是新鲜的。
3. **`Last-Modified`**：这是另一个用于确定资源是否被修改的头部。如果资源自从上次请求后没有被修改，`Last-Modified` 可以用来确定缓存是否新鲜。



**req.host**

这个属性就是http请求头里面的Host字段的值，这个字段制定了请求的目标主机名，端口号 

例如：

```javascript
GET /some/path HTTP/1.1
Host: www.example.com:8080
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
```

在这个请求中，`Host` 头部字段的值为 `www.example.com:8080`，表示请求是发送到 `www.example.com` 域名的 `8080` 端口。

当trust-proxy设置成true的时候 那么这个属性将从X-Forward-Host字段里面获取值 如果请求里卖弄有多个该字段 使用第一个（这是因为在·请求达到最终的服务之前 经过了多个代理曾 每个代理成都可能修改或者添加这个字段）。





**req.hostname**

似乎和上一个一模一样（？）



**req.ip**

请求的ip地址，当trust proxy设置成真的时候 这个属性将会从x-forward-for里面进行获取。



**req.ips**

跟上面的一样 只不过设置成数组 

例如，如果 `X-Forwarded-For` 是 `client, proxy1, proxy2`，则 `req.ips` 将是 `["client", "proxy1", "proxy2"]`，其中 `proxy2` 是最下游的。



**req.method**

和请求方法对应的字符串、



**req.originalUrl**

这个属性和req.url相似 不同点在于 **这个属性始终保持原始url 无论express有没有做出修改**

就比如：

```javascript
const express = require('express');
const app = express();

// 挂载中间件和路由
app.use('/prefix', express.Router()
  .get('/subpath', (req, res) => {
    console.log(req.url); // 输出: /subpath
    console.log(req.originalUrl); // 输出: /prefix/subpath
    res.send('Request handled');
  })
);

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```





**req.params**

 包含路由请求里面的params参数的对象

对于动态参数 可以使用动态参数的名字进行捕获 但是对于正则表达式路由 那么就没有名字了

这个时候就不是对象而是一个数组了

```javascript
// GET /user/tj
console.dir(req.params.name)
// => "tj"

// GET /file/javascripts/jquery.js
console.dir(req.params[0])
// => "javascripts/jquery.js"
```

如果需要更改req.params里面的键（有时我们需要对参数进行处理），应该通过app.param进行处理，但是不能进行增加 删除键，这样的修改将会被忽视，也就是说只能对哪些明确生命的变量进行处理。





**req.path**

包含请求的URL部分，从路由里面调用的时候，路由的挂载点不会包括在这个属性里面。



**req.protocol**

请求协议字符串 也就是http/https 当trust proxy设置成真的时候 这个属性会使用X-Forward-Proto的值



**req.query**

对象 包含查询字符串 查询解析器被禁用的时候是一个空对象。

查询解析器belike：

```javascript
const qs = require('qs')
app.setting('query parser',
  (str) => qs.parse(str, { /* custom options */ }))
```





**req.res**

就是res对象 这个属性允许在处理请求信息的时候操作res对象。



**req.route**
和路由有关的信息对象

```
app.get('/user/:id?', (req, res) => {
  console.log(req.route)
  res.send('GET')
})

{ path: '/user/:id?',
  stack:
   [ { handle: [Function: userIdHandler],
       name: 'userIdHandler',
       params: undefined,
       path: undefined,
       keys: [],
       regexp: /^\/?$/i,
       method: 'get' } ],
  methods: { get: true } }
```



- **`path`**：这是路由的路径模式，包括动态参数和可选路径段。在你的例子中，`'/user/:id?'` 表示路径模式是 `/user/:id`，其中 `:id` 是一个动态参数，`?` 表示该路径段是可选的。
- **`stack`**：这是一个数组，包含了所有处理当前路由的中间件和路由处理器。每个元素都是一个对象，代表一个中间件或处理器的配置信息：
  - `handle`：这是处理请求的函数，通常是中间件或路由处理器函数。
  - `name`：这是中间件或处理器的名称，如果未命名，则为 `undefined`。
  - `params`：这是中间件或处理器的参数，对于路由处理器，这通常是动态路径参数的值。
  - `path`：这是中间件或处理器绑定的路径。
  - `keys`：这是一个数组，包含了路由路径中所有动态参数的键。
  - `regexp`：这是用于匹配路由路径的正则表达式。
  - `method`：这是允许的 HTTP 方法，这里是 `'get'`，表示这个路由处理器只处理 GET 请求。
- **`methods`**：这是一个对象，包含了所有允许的 HTTP 方法。在你的例子中，`{ get: true }` 表示这个路由只响应 GET 请求。





**req.secure**

如果使用的是https 则这个属性是true



**req.signedCookies**

包含了请求里面发送的已经签名的cookie，



**req.stale**

和req.fresh相反



**req.subdomains**

请求域名里面的子域数组

子域的定义

子域是域名的一个组成部分，它位于顶级域名（TLD，如 .com、.org）和二级域名之间。例如，在域名 `tobi.ferrets.example.com` 中，`tobi` 和 `ferrets` 都是子域，而 `example.com` 是主域名。

```javascript
// Host: "tobi.ferrets.example.com"
console.dir(req.subdomains)
// => ["ferrets", "tobi"]
```





**req.xhr**

如果请求的 `X-Requested-With` 标头字段为 "XMLHttpRequest"，则为 `true` 的布尔属性



**req.accepts(types)**

根据请求的Accept标头检查指定的内容类型是不是可以接收的 返回最佳匹配 都不匹配就会返回false



 **req.acceptsCharsets(charset [, ...])**[中英](https://nodejs.cn/express/5x/api/req/~/acceptsCharsets/)

根据请求的 `Accept-Charset` HTTP 标头字段，返回指定字符集的第一个接受的字符集。如果不接受任何指定的字符集，则返回 `false`。

如需更多信息，或者如果您有问题或疑虑，请参阅 [accepts](https://nodejs.cn/express/5x/api/req/##46e7138d773e460f83055577cabdfe6d)。



 **req.acceptsEncodings(encoding [, ...])**[中英](https://nodejs.cn/express/5x/api/req/~/acceptsEncodings/)

根据请求的 `Accept-Encoding` HTTP 标头字段，返回指定编码的第一个接受的编码。如果不接受任何指定的编码，则返回 `false`。

如需更多信息，或者如果您有问题或疑虑，请参阅 [accepts](https://nodejs.cn/express/5x/api/req/##46e7138d773e460f83055577cabdfe6d)。







 **req.acceptsLanguages(lang [, ...]**)[中英](https://nodejs.cn/express/5x/api/req/~/acceptsLanguages/)

根据请求的 `Accept-Language` HTTP 标头字段，返回指定语言中第一个接受的语言。如果不接受任何指定的语言，则返回 `false`。



**req.is(type)**

如果传入请求的 "Content-Type" HTTP 标头字段与 `type` 参数指定的 MIME 类型匹配，则返回匹配的内容类型。如果请求没有正文，则返回 `null`。否则返回 `false`。

```js
// With Content-Type: text/html; charset=utf-8
req.is('html') // => 'html'
req.is('text/html') // => 'text/html'
req.is('text/*') // => 'text/*'

// When Content-Type is application/json
req.is('json') // => 'json'
req.is('application/json') // => 'application/json'
req.is('application/*') // => 'application/*'

req.is('html')
// => false
```



## 响应对象



**res.app**

对于使用中间件的实例的引用



**res.headersSent**

布尔值 表示响应是否发送



**res.locals**

设置在使用res.render渲染的模板里面使用的变量 这个属性设置的变量不会在请求之间共享



**res.req**

对请求对象的引用



**res.append(filed[,value])**

把指定的值添加到响应标头里面的filed 如果filed不存在 将会创造



**res.set(field[,value])**

和append相似 但是append是追加





**res.attchment([filename])**

将 HTTP 响应 `Content-Disposition` 标头字段设置为 "attachment"。如果给出了 `filename`，那么它会根据扩展名通过 `res.type()` 设置 Content-Type，并设置 `Content-Disposition` "filename=" 参数。

`Content-Disposition` **的常见用法**

1. **附件下载**： 当服务器希望浏览器将响应内容作为附件处理时，可以使用 `Content-Disposition: attachment`。这通常会提示用户保存文件而不是直接在浏览器中打开它。
2. **文件名指定**： `Content-Disposition` 还可以包含一个 `filename` 参数，用于指定下载文件时使用的默认文件名。



**res.cookie(name,value[,options])**

设置cookie value参数可以是字符串 或是JSON对象 如果直接传递一个对象 那么这个方法会自动把它序列化

`options` 参数是一个可以具有以下属性的对象。

| 属性       | 类型           | 描述                                                         |
| ---------- | -------------- | ------------------------------------------------------------ |
| `domain`   | 字符串         | cookie 的域名。默认为应用的域名。                            |
| `encode`   | 函数           | 用于 cookie 值编码的同步函数。默认为 `encodeURIComponent`。  |
| `expires`  | 日期           | 格林威治标准时间 cookie 的到期日期。如果未指定或设置为 0，则创建会话 cookie。 |
| `httpOnly` | 布尔值         | 将 cookie 标记为只能由 Web 服务器访问。                      |
| `maxAge`   | 数字           | 方便的选项，用于设置相对于当前时间的到期时间（以毫秒为单位）。 |
| `path`     | 字符串         | cookie 的路径。默认为 "/"。                                  |
| `secure`   | 布尔值         | 将 cookie 标记为仅与 HTTPS 一起使用。                        |
| `signed`   | 布尔值         | 指示是否应该对 cookie 进行签名。                             |
| `sameSite` | 布尔值或字符串 | "SameSite" Set-Cookie 属性的值。更多信息请参见 [https://tools.ietf.org/html/draft-ietf-httpbis-cookie-same-site-00#section-4.1.1](https://nodejs.cn/express/5x/api/res/##ea01db2d1d134d318cd5eb9eb758a735)。 |



**res.clearCookie(name[.options])**

清除指定name的cookie optios和上面的一样





**res.download(path[,filename]\[,options],[,fn])**

把path对应的文件作为attchment进行传输 浏览器会提示用户下载 

默认情况下 标头里面的 `Content-Disposition`的filename基于path参数 但是也可以被filename参数覆盖，如果path是相对路径 那么是基于当前的进程的工作目录的











## MySQL

1. oracle 商用
2. MongoDB 非关系型数据库
3. sqLite 嵌入式数据库
4. Mysql 关系型数据库：使用结构化的方式存储 

表：数据库中的数据被组织成表的形式。表由行和列组成，行表示记录，列表示字段。

索引：MySQL允许创建索引以加快数据检索速度。索引是对表中一列或多列的值进行排序的数据结构。

主键：主键是表中的唯一标识符。它用于确保表中的每个记录都有唯一的标识。

外键：外键用于建立表与表之间的关联。它定义了一个表中的列与另一个表中的列之间的关系。

触发器：触发器是一种在数据库中定义的操作，它会在特定事件发生时自动执行。例如，当向表中插入新记录时，可以触发一个触发器来执行其他操作。

存储过程：存储过程是一组预编译的SQL语句，可以在数据库中进行重复使用。它可以接受参数并返回结果。

什么是关系型数据库？

在关系型数据库中，数据以结构化的方式存储，其中每个表格由一组列（字段）和一组行（记录）组成。每个列定义了数据的类型和属性，而每个行则表示一个特定的数据实例。表格之间的关系通过使用主键和外键进行建立。主键是唯一标识表格中每个行的列，而外键是指向其他表格主键的列，用于建立表格之间的关联关系。



**指令**

连接数据库：`mysql -uroot -p`

显示当前已有的数据库:`show databases;`

进入某个数据库 `use project`

显示当前数据库的表格 `show tables`

查看某个字段： ` desc user`

查看数据：`select * from user`







**数据库操作**

创建数据库 `create database if not exists库名`(如果已经存在 则不会创建)

添加字符集 `default character set = 'utf8mb4'`

创建数据表

```sql
CREATE TABLE `user` (
   id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
   name varchar(100) COMMENT '名字',
   age int COMMENT '年龄',
   address varchar(255) COMMENT '地址',
   create_time timestamp DEFAULT CURRENT_TIMESTAMP  COMMENT '创建时间'
) COMMENT '用户表'
```





**sql语句**

·sql是用于管理关系型数据库系统的语言

````sql
//重命名表
ALTER TABLE `user` RENAME `user2`;
//添加列
ALTER TABLE `user` Add COLUMN `hobby` VARCHAR(200) ;
//删除列
ALTER TABLE `user` DROP COLUMN `hobby`;
//编辑列
ALTER TABLE `user` MODIFY COLUMN `age` VARCHAR(255) NULL COMMENT '年龄2';


//查询列
SELECT `name`,`id` FROM `user`;
//查询所有列
SELECT *  FROM `user`;
//给列起别名
SELECT `name` as `user_name`,`id` as `user_id` FROM `user`;
//按照规则排序
SELECT *  FROM `user` ORDER BY id DESC;（ASC）
//限制查询结果
SELECT *  FROM `user` LIMIT1去·a1,3
//条件查询
SELECT *  FROM `user` WHERE name = "大满";
//联合查询
SELECT * FROM `user` WHERE name = '小满' AND age <= 20;
//模糊查询
SELECT * FROM `user` WHERE name LIKE '%满%';

//新增数据
INSERT INTO user(`name`,`hobby`,`age`) VALUES('xiaoman','basketball',18)
//删除
DELETE FROM `user` WHERE id = 11; 
//删除多个
DELETE FROM `user` WHERE id IN (8,9,10);
//更新
UPDATE `user` SET name='麒麟哥',age=30,hobby='篮球' WHERE id = 12;

````



**表达式**

表达式是一种计算式或逻辑式 

1. 算术表达式
2. 字符串表达式
3. 逻辑表达式（返回布尔值）
4. 条件表达式（根据条件返回不同的结果）
5. 聚合函数表达式（计算数据集聚合值）
6. 时间和日期表达式（处理时间日期数据区）

```sql
SELECT age + 100 as age FROM `user`;

```

字符串函数：

- `CONCAT(str1, str2, ...)`：将多个字符串连接起来。
- `SUBSTRING(str, start, length)`：从字符串中提取子字符串。
- `UPPER(str)`：将字符串转换为大写。
- `LOWER(str)`：将字符串转换为小写。
- `LENGTH(str)`：返回字符串的长度。

数值函数：

- `ABS(x)`：返回x的绝对值。
- `ROUND(x, d)`：将x四舍五入为d位小数。
- `CEILING(x)`：返回不小于x的最小整数。
- `FLOOR(x)`：返回不大于x的最大整数。
- `RAND()`：返回一个随机数。

日期和时间函数：

- `NOW()`：返回当前日期和时间。
- `CURDATE()`：返回当前日期。
- `CURTIME()`：返回当前时间。
- `DATE_FORMAT(date, format)`：将日期格式化为指定的格式。
- `DATEDIFF(date1, date2)`：计算两个日期之间的天数差。

条件函数：

- `IF(condition, value_if_true, value_if_false)`：根据条件返回不同的值。
- `CASE WHEN condition1 THEN result1 WHEN condition2 THEN result2 ELSE `

聚合函数：

- `COUNT(expr)`：计算满足条件的行数。
- `SUM(expr)`：计算表达式的总和。
- `AVG(expr)`：计算表达式的平均值。
- `MAX(expr)`：返回表达式的最大值。
- `MIN(expr)`：返回表达式的最小值。



子查询（SubQuery）

是一种内连接

也称为嵌套查询 是指在一个查询语句使用另一个完整的查询语句

```sql
SELECT * FROM `photo` WHERE `user_id` = (SELECT id FROM `user` WHERE name = '小满')
```

#### 连表

连表分为内连接 外连接 交叉连接

1. 对于`内连接`的两个表，驱动表中的记录在被驱动表中找不到匹配的记录，该记录不会加入到最后的结果集，我们上边提到的连接都是所谓的`内连接`。

   ```sql
   SELECT * FROM `user`, `photo` WHERE `user`.`id` = `photo`.`user_id`
   ```

   

2. 对于`外连接`的两个表，驱动表中的记录即使在被驱动表中没有匹配的记录，也仍然需要加入到结果集。

   ```sql
   SELECT * FROM `user` LEFT JOIN `table` ON `user`.`id` = `table`.`user_id`
   
   SELECT * FROM `user` RIGHT JOIN `table` ON `user`.`id` = `table`.`user_id`
   ```

   

3. `交叉连接`是指在两张或多张表之间没有任何连接条件的连接。简单来说，`交叉连接`可以让你查询所有可能的组合。



#### mysql2

```javascript
//配置文件
db:
   host: localhost #主机
   port: 3306 #端口
   user: root #账号
   password: '123456' #密码 一定要字符串
   database: xiaoman # 库

//index
import mysql2 from 'mysql2/promise'
import fs from 'node:fs'
import jsyaml from 'js-yaml'
import express from 'express'
const yaml = fs.readFileSync('./db.config.yaml', 'utf8')
const config = jsyaml.load(yaml)
const sql = await mysql2.createConnection({
   ...config.db
})
const app = express()
app.use(express.json())
//查询接口 全部
app.get('/',async (req,res)=>{
   const [data] = await sql.query('select * from user')
   res.send(data)
})
//单个查询 params
app.get('/user/:id',async (req,res)=>{
    const [row] = await sql.query(`select * from user where id = ?`,[req.params.id])
    res.send(row)
})

//新增接口
app.post('/create',async (req,res)=>{
    const {name,age,hobby} = req.body
    await sql.query(`insert into user(name,age,hobby) values(?,?,?)`,[name,age,hobby])
    res.send({ok:1})
})

//编辑
app.post('/update',async (req,res)=>{
    const {name,age,hobby,id} = req.body
    await sql.query(`update user set name = ?,age = ?,hobby = ? where id = ?`,[name,age,hobby,id])
    res.send({ok:1})
})
//删除
app.post('/delete',async (req,res)=>{
    await sql.query(`delete from user where id = ?`,[req.body.id])
    res.send({ok:1})
})
const port = 3000

app.listen(port, () => {
   console.log(`Example app listening on port ${port}`)
})

```



#### knex

基于js的查询生成器 可以使用js代码生成 执行SQL查询语句 

```javascript
import mysql2 from 'mysql2/promise'
import fs from 'node:fs'
import jsyaml from 'js-yaml'
import express from 'express'
import knex from 'knex'
const yaml = fs.readFileSync('./db.config.yaml', 'utf8')
const config = jsyaml.load(yaml)
// const sql = await mysql2.createConnection({
//    ...config.db
// })
const db = knex({
    client: "mysql2",
    connection: config.db
})

const app = express()
app.use(express.json())
//查询接口 全部
app.get('/', async (req, res) => {
    const data = await db('list').select().orderBy('id', 'desc')
    const total = await db('list').count('* as total')
    res.json({
        code: 200,
        data,
        total: total[0].total,
    })
})
//单个查询 params
app.get('/user/:id', async (req, res) => {
    const row = await db('list').select().where({ id: req.params.id })
    res.json({
        code: 200,
        data: row
    })
})

//新增接口
app.post('/create', async (req, res) => {
    const { name, age, hobby } = req.body
    const detail = await db('list').insert({ name, age, hobby })
    res.send({
        code: 200,
        data: detail
    })
})

//编辑
app.post('/update', async (req, res) => {
    const { name, age, hobby, id } = req.body
    const info = await db('list').update({ name, age, hobby }).where({ id })
    res.json({
        code: 200,
        data: info
    })
})
//删除
app.post('/delete', async (req, res) => {
    const info = await db('list').delete().where({ id: req.body.id })
    res.json({
        code: 200,
        data: info
    })
})
const port = 3000

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

```

**事务**

用事务确保一组数据库的原子性 （要么全部成功 要么全部回滚）

```javascript
//伪代码
db.transaction(async (trx) => {
    try {
        await trx('list').update({money: -100}).where({ id: 1 }) //A
        await trx('list').update({money: +100}).where({ id: 2 }) //B
        await trx.commit() //提交事务
    }
    catch (err) {
        await trx.rollback() //回滚事务
    }
   
})

```



## Prisma

`npm i -g prisma`

`prima init --datasource-provider mysql`创建生成基本目录 （prisma文件夹 .env配置文件 .gitignore）

连接mysql：修改.env文件 `[DATABASE_URL="mysql://账号:密码@主机:端口/库名"]`

**创建表：prima/schema.prisma**

```javascript
model Post {
  id       Int     @id @default(autoincrement()) //id 整数 自增
  title    String  //title字符串类型
  publish  Boolean @default(false) //发布 布尔值默认false
  author   User   @relation(fields: [authorId], references: [id]) //作者 关联用户表 关联关系 authorId 关联user表的id
  authorId Int
}

model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
  posts Post[]
}

```

执行命令:`prisma migrate dev`

```javascript
import express from 'express'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const app = express()
const port: number = 3000


app.use(express.json())

//关联查找
app.get('/', async (req, res) => {
    const data = await prisma.user.findMany({
        include: {
            posts: true
        }
    })
    res.send(data)
})
//单个查找
app.get('/user/:id', async (req, res) => {
   const row =  await prisma.user.findMany({
        where: {
            id: Number(req.params.id)
        }
    })
    res.send(row)
})
//新增
app.post('/create', async (req, res) => {
    const { name, email } = req.body
    const data = await prisma.user.create({
        data: {
            name,
            email,
            posts: {
                create: {
                    title: '标题',
                    publish: true
                },
            }
        }
    })
    res.send(data)
})

//更新
app.post('/update', async (req, res) => {
    const { id, name, email } = req.body
    const data = await prisma.user.update({
        where: {
            id: Number(id)
        },
        data: {
            name,
            email
        }
    })
    res.send(data)
})

//删除
app.post('/delete', async (req, res) => {
    const { id } = req.body
    await prisma.post.deleteMany({
        where: {
            authorId: Number(id)
        }
    })
    const data = await prisma.user.delete({
        where: {
            id: Number(id),
        },
    })
    res.send(data)
})


app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})

```





## 项目架构MVC IOC DI

MVC（Model-View-Controller）是一种常用的软件架构模式，将应用程序分为三个主要组件：模型（Model）、视图（View）和控制器（Controller）

模型（Model）：模型表示应用**程序的数据和业务逻辑**。它负责处理数据的存储、检索、验证和更新等操作。模型通常包含与数据库、文件系统或外部服务进行交互的代码。

视图（View）：视图负责**将模型的数据以可视化的形式呈现给用户**。它负责用户界面的展示，包括各种图形元素、页面布局和用户交互组件等。视图通常是根据模型的状态来动态生成和更新的。

控制器（Controller）：控制器充当模型和视图之间的中间人，负责协调两者之间的交互。它接收用户输入（例如按钮点击、表单提交等），并**根据输入更新模型的状态或调用相应的模型方法**。控制器还可以根据模型的变化来更新视图的显示。

控制反转（IoC）是一种设计原则，它**将组件的控制权从组件自身转移到外部容器**。传统上，组件负责自己的创建和管理，而控制反转则将这个责任转给了一个外部的容器或框架。容器负责创建组件实例并管理它们的生命周期，组件只需声明自己所需的依赖关系，并通过容器获取这些依赖。这种反转的控制权使得组件更加松耦合、可测试和可维护。

依赖注入（DI）是实现控制反转的一种具体技术。它通过将**组件的依赖关系从组件内部移动到外部容器来实现松耦合**。组件不再负责创建或管理它所依赖的其他组件，而是通过构造函数、属性或方法参数等方式将依赖关系注入到组件中。依赖注入可以通过构造函数注入（Constructor Injection）、属性注入（Property Injection）或方法注入（Method Injection）等方式实现。

`inversify` + `reflect-metadata` 实现依赖注入 [官网](https://link.juejin.cn?target=https%3A%2F%2Fdoc.inversify.cloud%2Fzh_cn%2Finstallation)

接口编写`express` [官网](https://link.juejin.cn?target=https%3A%2F%2Fwww.expressjs.com.cn%2F)

连接工具 `inversify-express-utils` [文档](https://link.juejin.cn?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Finversify-express-utils)

orm框架 `prisma` [官网](https://link.juejin.cn?target=https%3A%2F%2Fwww.prisma.io%2F)

dto （数据传输对象）`class-validator` + `class-transformer` [文档](https://link.juejin.cn?target=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fclass-validator)





**构建**

执行`prisma init --datasource-provider mysql`构建prismatic项目

目录结构

- /src
  - /user
    - /controller.ts
    - /service.ts
    - /user.dto.ts 校验数据
  - /post
    - /controller.ts
    - /service.ts
    - /post.dto.ts
  - /db
    - /index.ts
  - /prisma
    - /schema.prisma
- main.ts
- .env
- tsconfig.json(打开es6模式 关闭严格模式)
- package.json
- README.md

mian.ts

```javascript
import 'reflect-metadata'
import { InversifyExpressServer } from 'inversify-express-utils'
import { Container } from 'inversify'
import { UserController } from './src/user/controller'
import { UserService } from './src/user/service'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { PrismaDB } from './src/db'
const container = new Container() //Ioc搞个容器
/**
 * prisma依赖注入
 */
 //注入工厂封装db
container.bind<PrismaClient>('PrismaClient').toFactory(()=>{
    return () => {
        return new PrismaClient()
    }
})
container.bind(PrismaDB).toSelf()
/**
 * user模块
 */
container.bind(UserService).to(UserService) //添加到容器
container.bind(UserController).to(UserController) //添加到容器
/**
 * post模块
 */
const server = new InversifyExpressServer(container) //返回server
//中间件编写在这儿
server.setConfig(app => {
    app.use(express.json()) //接受json
})
const app = server.build() //app就是express

app.listen(3000, () => {
    console.log('http://localhost:3000')
})

```

controler.ts

```javascript
import { controller, httpGet as GetMapping, httpPost as PostMapping } from 'inversify-express-utils'
import { inject } from 'inversify'
import { UserService } from './service'
import type { Request, Response } from 'express'
@controller('/user') //路由
export class UserController {

    constructor(
        @inject(UserService) private readonly userService: UserService, //依赖注入
    ) { }

    @GetMapping('/index') //get请求
    public async getIndex(req: Request, res: Response) {
        console.log(req?.user.id)
        const info = await this.userService.getUserInfo()
        res.send(info)
    }

    @PostMapping('/create') //post请求
    public async createUser(req: Request, res: Response) {
        const user = await this.userService.createUser(req.body)
        res.send(user)
    }
}
```

service.ts

```javascript
import { injectable, inject } from 'inversify'
import { UserDto } from './user.dto'
import { plainToClass } from 'class-transformer' //dto验证
import { validate } from 'class-validator' //dto验证
import { PrismaDB } from '../db'
@injectable()
export class UserService {

    constructor(
        @inject(PrismaDB) private readonly PrismaDB: PrismaDB //依赖注入
    ) {

    }

    public async getUserInfo() {
        return await this.PrismaDB.prisma.user.findMany()
    }

    public async createUser(data: UserDto) {
        const user = plainToClass(UserDto, data)
        const errors = await validate(user)
        const dto = []
        if (errors.length) {
            errors.forEach(error => {
                Object.keys(error.constraints).forEach(key => {
                    dto.push({
                        [error.property]: error.constraints[key]
                    })
                })
            })
            return dto
        } else {
            const userInfo =  await this.PrismaDB.prisma.user.create({ data: user })
            return userInfo
        }
    }
}

```

user.dto.ts

```javascript
import { IsNotEmpty, IsEmail } from 'class-validator'
import { Transform } from 'class-transformer'
export class UserDto {
    @IsNotEmpty({ message: '用户名必填' })
    @Transform(user => user.value.trim())
    name: string

    @IsNotEmpty({ message: '邮箱必填' })
    @IsEmail({},{message: '邮箱格式不正确'})
    @Transform(user => user.value.trim())
    email: string
}
```

index.ts

```javascript
import { injectable, inject } from 'inversify'
import { PrismaClient } from '@prisma/client'

@injectable()
export class PrismaDB {
    prisma: PrismaClient
    constructor(@inject('PrismaClient') PrismaClient: () => PrismaClient) {
       this.prisma = PrismaClient()
    }
}
```

tsconfig

```javascript
"experimentalDecorators": true,               
"emitDecoratorMetadata": true,    
"strict": false,  

```



**jwt**

JWT由三部分组成，它们通过点（.）进行分隔：

1. Header（头部）：包含了令牌的类型和使用的加密算法等信息。通常采用Base64编码表示。
2. Payload（负载）：包含了身份验证和授权等信息，如用户ID、角色、权限等。也可以自定义其他相关信息。同样采用Base64编码表示。
3. Signature（签名）：使用指定的密钥对头部和负载进行签名，以确保令牌的完整性和真实性。

JWT的工作流程如下：

1. 用户通过提供有效的凭证（例如用户名和密码）进行身份验证。
2. 服务器验证凭证，并生成一个JWT作为响应。JWT包含了用户的身份信息和其他必要的数据。
3. 服务器将JWT发送给客户端。
4. 客户端在后续的请求中，将JWT放入请求的头部或其他适当的位置。
5. 服务器在接收到请求时，验证JWT的签名以确保其完整性和真实性。如果验证通过，服务器使用JWT中的信息进行授权和身份验证。







#### 全局软件包nodemon

本地软件包：当前项目内使用 封装属性和方法

全局软件包：本机所有项目使用 封装命令 工具 

nodemon：代替node 检测代码更改 自动重启程序



# 各种技术

#### 反向代理

使用 `http-proxy-middleware`实现

反向代理（reverse  proxy）是一种网络通信模式 在服务端 客户端之间充当中介 把客户端的请求转发到一个或多个后端服务器  可以实现负载均衡 高可用性 缓存和性能优化 安全性 域名 路径重写

负载均衡：避免向cpu利用率过高的服务器继续发送请求

高可用性：不向故障服务器发送请求

缓存：可以缓存静态资源 经常访问的内容

安全性：可以作为防火墙 过滤恶意请求

域名和路径重写：根据特定的规则重写请求的域名 路径 实现URL路由 重定向 

```javascript
//index.js 编写接口
const http = require('http')
const url = require('url')
const fs = require('fs')
const {createProxyMiddleware} = require('http-proxy-middleware')
const html = fs.readFileSync('./index.html')
const config = require('./proxy.config/js')

http.createEsver((req,res)=>{
    const {pathname} = url.parse(req.url)
    const proxyList = Object.keys(config.serve.proxy)
    if(proxyList.includes(pathname)){
        const proxy = createProxyMiddleware(config.serve.proxy[pathname])
        proxy(req,res=>{
            ...
        })
        return
    }
    res.writeHead(200,{
        'Content-Type':'text/html'
    })
    //返回html文件
    res.end(html)
}).listen(80)//localhost 默认80


//proxy.config.js 编写反向代理的配置
module.exports = {
    serve:{
        proxy:{
            '/api':{
                target:'http://localhost:3000',
                changeOrigin:true
            }
        }
    }
}

//test.js 第三方服务 启用端口3000服务
const http = require('http')
const url = require('url')

http.createSever((req,res)=>{
    const {pathname} = url.parse(req.url)
    if(pathname === '/api'){
        res.end('success')
    }
}).listen(3000,()=>{
    console.log('3000')
})

//index.html 代码测试
```

#### 动静分离

把动态生成的内容和静态资源分开处理和分发

把动态内容 静态资源存储在不同的服务器或服务上 使用不同的处理机制

静态资源可以使用缓存机制存储在CDN或浏览器缓存中 减少网络请求 数据开销

实现动静分离的方法

- 使用反向代理服务器（如Nginx、Apache）将静态请求和动态请求转发到不同的后端服务器或服务。
- 将静态资源部署到CDN上，通过CDN分发静态资源，减轻源服务器的负载。
- 使用专门的静态文件服务器（如Amazon S3、Google Cloud Storage）存储和提供静态资源，而将动态请求交给应用服务器处理。

```javascript
// index.js
import http from 'http'
import fs from 'node'
import path from 'path'
import mime from 'mime'
const server = http.vreatreServer((req.res)=>{
    const {method,url} = req
    //获取静态资源
    if(method === 'GET'&&url.startsWith('/static')){
        const staticpath = path.join(process.cwd(),url)
        fs.readFile(ststicPath,(err,data)=>{
            if(err){
                res.writeHead(404,{
                    'Content-type':'text/plain'
                })
                res.end('not found')
            }else{
                const type =mime.getType(staticPath)
                res.writeHead(200,{
                    'Content-type':type
                    "cache-control":'public,max-age=3600'
                })
                res.end(data)
            }
        })
    }
    if(method === 'GET'||method === 'POST')&& url.startsWith('/api'){
        //接口逻辑
    }
    
})
server.listen(80,()=>{
    console,log('success')
})

```

#### 邮件服务

使用js-yaml nodemailer

```javascript
import nodemail from 'nodemailer'
import yaml from 'js-yaml'
import http from 'http'
import fs from 'fs'
import url from 'url'
const mail = import '..yaml'
//初始化邮件服务
const transport = nodemailer.vreateTransport({
    service：'qq',//服务商
    host:''//主机
    port：''//端口
    https：true
    auth:{
    	user:"mail.user",
    	pass:"mail.pass"
	}
})
http.createSever(async (req,res)=>{
    const {pathname} = url.parse(req.url)
    const {method} = req
    if(method === 'POST'&&pathname == '/send/mail'){
        //发送邮件
        let data = ''
        req.on('data',(chunk)=>{
            data+=chunk
        })
        req.on('end',()=>{
            const {to,subject,text} = JSON.parse(data)
            transport.sendMail({
                to,
                fromaa;'mail.user',
                subject,
                text
            })
        })
    }
})
```





#### 定时任务

通过node-schedule实现

1. corn表达式：在定时任务里用于表示时间间隔 例如5s '5/* * * * * *'表示每月每星期 每天 每小时 每份 每五秒 每天半夜十二点三十分： '* 0 30 0 * * *'



### 



#### net模块

net模块会打开一个tcp通道 在传输层进行操作

tcp支持双方同时进行双向通讯 

服务端之间的通讯可以直接通过tcp 不需要上升到http层



#### socket.io

可以给div加contenteditable属性





#### 爬虫

使用puppeteer

**puppeteer**

1. 自动化浏览器操作
2. 截图生成pdf
3. 爬虫 数据抓取
4. 网页性能分析
5. 无头模式(后台运行浏览器) 调试模式 



#### 短链接 

缩短长网址





#### 前端网络安全

##### canvas指纹追踪技术

使用canvas在调用toDataURL转base64的时候 他的底层会获取设备 操作系统 浏览器 三合一的唯一标识 你；

















## 



 

