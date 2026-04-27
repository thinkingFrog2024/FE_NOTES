# 理论内容（16.19.0）

nodejs是javascript的运行时 nodejs提供了一个环境 使js代码能够在服务端运行

NodeJs 使用**异步 I/O** 和事件驱动的设计理念，适合处理IO密集型应用 异步IO最终由**libuv事件循环库**（个跨平台的异步I/O库）实现（Input Output 也就是输入 输出操作 比如数据库的读取 写入 web服务 需要处理大量的网络请求和响应）

nodejs适合干一些IO密集型应用，不适合CPU密集型应用，nodejsIO依靠libuv有很强的处理能力，而CPU因为nodejs单线程原因，容易造成CPU占用率高，如果非要做CPU密集型应用，可以使用C++插件编写 或者nodejs提供的`cluster`。(CPU密集型指的是图像的处理 或者音频处理需要大量数据结构 + 算法)

### nodeJs 大致架构图

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ddde8e7be0a941a3a01cb20f7909b05c~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp?)

v:8执行引擎 

libuv:提供了执行异步io的能力

bindings:c/c++代码与js代码之间的接口  允许js调用c/c++编写的代码 

DNS解析器 c-ares: 用于解析DNS （域名系统 ） c-ares是一个c编写的解析库 提供了接口用于执行异步查询 

SSL TLS openSSL:**SSL是一种早期安全协议** **TLS是一种更加安全的安全协议** openSSL是一个开源软件库 实现了SSL TSL协议 提供了一个通用加密库 支持多种加密算法 

http-parser是一个c编写的http消息解析器 可以解析http请求 响应消息  

N-api：允许开发者编写在**不同版本node下都能工作的原生插件** 也就是说 **使用N-api编写的原生模块或者插件 不需要针对不同的nodejs版本重新编译 在这个api出现之前 node的原生模块通常直接绑定到特定版本的v8引擎** 

> 这是怎么做到的？
>
> N-API是node提供的一个稳定的api，这是一种应用程序二进制接口 允许js和c编写的原生模块进行交互 由于这个接口稳定，和node的版本无关 所以使用这个接口编写的插件可以在各个版本node上运行（也可以使用nan 这是一个用于编写原生模块的c++库 提供了简化的api）
>
> 如何使用N-API创建一个node插件？
>
> 1. 使用c/c++编写源文件
> 2. 编写构建配置文件bindings.gyp,在这个文件里指定编译源文件和包含的目录
> 3. 全局安装node-gyp
> 4. 编译插件：运行 `node-gyp configure` 这个命令用于配置构建环境 他会检查系统 node的版本  生成适当的配置构建文件 （在Unix-like系统里 将会根据binding文件生成Makefile  在windows下 会根据binding生成.vcxproj文件）还会创建一个build目录 不存在的话 `node-gyp build` 这个指令会使用之前生成的配置构建文件来编译 编译过程中会调用相应的编译器 把源代码编译成node文件 （node文件其实是包装了实际dll文件的包装器 windoes下的.dll文件 动态链接库是一种包含多个程序可以同时使用的代码和数据的库  在windows里面 dll文件时实现共享函数库的方式之一 )                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             

addon指的是原生模块 用c cpp编写（windoes的.dll文件）







nodejs和libuv处理逻辑

Node.js 利用 `libuv` 的多线程特性，主要是通过将一些**特定的操作外包给工作线程或线程池**来实现的，这样就不会阻塞 Node.js 的主事件循环线程。

Node.js 使用事件循环来处理所有的I/O操作和异步事件。

> 什么叫事件循环处理所有的异步操作呢
>
> 就好比使用fs模块异步读取或则写入文件时 实际的文件操作将交由libuv进行 当libuv里面的文件操作完成 将会通知主线程 主线程将会把对应的回调函数推进事件队列

主线程操作事件循环 所有js代码的执行 处理所有的异步操作以及回调函数 这个线程里不应该进行阻塞性的同步操作

线程池主要用于文件系统操作 DNS查询 某些cpu密集任务
如果需要执行某些可能阻塞的操作 应该将其处理成异步任务

模拟读取文件并处理数据

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
        //调用栈会记录程序执行期间函数调用的顺序 当一个函数被调用 他会在调用栈上创建一个栈帧（stack frame） 这个栈帧会包含当前函数的信息 函数执行完毕 他的栈帧会被移除 控制权返回给上一个栈帧  抛出错误时将会把错误对象传递给栈的上层 抛出错误使函数的调用者能够处理这个错误 在调用栈的上层可以使用try catch catch会捕获上抛的错误
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

> **这就是函数大有用武之地的地方。更复杂的操作由许多函数组成：**
>
> 1. 发起者风格/输入
> 2. 中间件
> 3. terminator
>
> **"发起者风格/输入" 是序列中的第一个函数。此函数将接受操作的原始输入（如果有）。该操作是一系列可执行的函数，原始输入主要为：**
>
> 1. 全局环境中的变量
> 2. 带或不带参数的直接调用
> 3. 通过文件系统或网络请求获取的值
>
> 网络请求可以是由外部网络、同一网络上的另一个应用或同一或外部网络上的应用本身发起的传入请求。
>
> 中间件函数将返回另一个函数，终止符函数将调用回调。以下说明了网络或文件系统请求的流程。
>
> ```javascript
> function final(someInput, callback) {
>   callback(`${someInput} and terminated by executing callback `);
> }
> 
> function middleware(someInput, callback) {
>   return final(`${someInput} touched by middleware `, callback);
> }
> 
> function initiate() {
>   const someInput = 'hello this is a function ';
>   middleware(someInput, function (result) {
>     console.log(result);
>     // requires callback to `return` result
>   });
> }
> 
> initiate();
> ```

#### 异步流控制

> 如果对象在内存中可用，则可以进行迭代，并且不会改变控制流：但是，如果数据存在于内存之外，迭代将不再起作用

这句话的意思是，在JavaScript中，如果数据是**直接在内存中**（即在**当前执行上下文中（通常指的是一个线程里的执行环境**））可用的，你可以正常地对它进行迭代操作，并且**控制流（程序的执行顺序）不会受到影响**。然而，如果数据是在**内存之外**的，比如在**异步操作**中，那么迭代可能就不再按照预期的方式工作，控制流也可能发生变化。

> 概念问题：内存当中=当前执行上下文=一个线程里面的执行环境

这里的“内存之外”实际上是指**数据的生命周期和作用域超出了当前的执行上下文**。在JavaScript中，这通常与异步编程相关。以下是一些关键点来解释这个概念：

1. **同步迭代**：在同步代码中，你可以对一个对象或数据结构进行迭代，因为所有操作都是按照代码的顺序执行的。例如，在`getSong`函数的第一个例子中，`_song`变量在内存中逐步构建，并且迭代是按照预期顺序执行的。
2. **异步迭代问题**：当涉及到异步操作时，比如使用`setTimeout`，代码的执行顺序可能会改变。**异步回调函数可能会在主函数执行完毕后才执行，这意味着它们可能无法按照预期的顺序访问或修改数据。**
3. **作用域和闭包**：在异步回调中，由于作用域和闭包的原因，变量的值可能与预期不同。例如，在循环中使用`setTimeout`时，所有回调可能**共享同一个循环变量的引用**，并且**当回调执行时，循环变量的值可能已经不是迭代时的值了。**
4. **事件循环**：JavaScript使用事件循环来处理异步行为。这意味着即使`setTimeout`的延迟设置为0(其实设置成0的延时大概为4ms)，回调函数也会被放入事件队列中，等待主线程空闲时执行，而不是立即执行。
5. **数据更新的时机**：在异步操作中，数据的更新可能不会立即反映出来。例如，在`getSong`函数的第二个例子中，由于使用了`setTimeout`，`_song`变量的更新被推迟了，导致在`getSong`函数返回时，`_song`仍然是空的。
6. **控制流的改变**：由于异步操作，程序的**控制流可能会改变**。例如，**主函数可能在异步操作完成之前就返回了，这可能导致调用者接收到不完整或不正确的数据**。

由于以上原因 当我们进行网络请求 文件系统处理时也会出现这样的情况 解决方案

1. 系列：函数将按严格的顺序执行，这个顺序与 `for` 循环最相似      也就是用了开始：检查是否需要继续操作 向中间件传递参数和最终处理函数  中间件：接收参数 调用结束 结束：接收参数和最终处理函数的设计模式

   ```javascript
   // 定义了一系列操作，每个操作包含一个函数和一个参数数组
   const operations = [
     { func: function1, args: args1 },
     { func: function2, args: args2 },
     { func: function3, args: args3 },
   ];
   
   // 执行传入的操作中的函数，并传递参数和回调
   function executeFunctionWithArgs(operation, callback) {
     // 从操作对象中解构出参数和函数
     const { args, func } = operation;
     // 调用函数，传递参数和回调函数
     func(args, callback);
   }
   
   // 按顺序执行操作的序列化过程
   function serialProcedure(operation) {
     // 如果没有操作了，结束进程
     if (!operation) process.exit(0);
     
     // 执行当前操作的函数，并传入参数和回调
     executeFunctionWithArgs(operation, function (result) {
       // 回调函数在操作完成后执行
       // 移除并获取下一个操作，然后继续序列化过程
       serialProcedure(operations.shift());
     });
   }
   
   // 从操作数组中取出第一个操作，并开始序列化执行过程
   serialProcedure(operations.shift());
   
   //在这个例子里面 在进行打印的时候i的更新已经完成了 打印时会打印5次5
   for (let i = 0; i < 5; i++) {
       setTimeout(function() {
           console.log(i); // 这里的输出可能不是你预期的 0, 1, 2, 3, 4
       }, 1000);
   }
   
   
   ```

   

2. 完全并行：当排序不是问题时，例如向 1,000,000 个电子邮件收件人列表发送电子邮件。(这里完全并行的意思是邮件发送操作是并行进行的。在`forEach`循环中按顺序调用了`dispatch`函数，每个`dispatch`调用中的邮件发送（假设`sendMail`是异步的）可以几乎同时开始)  开始函数： 中间件函数 结束函数

   ```javascript
   // 初始化邮件发送计数器
   let count = 0;
   // 初始化成功发送邮件的计数器
   let success = 0;
   // 初始化一个数组，用于存储发送失败的收件人名称
   const failed = [];
   // 定义收件人数组，每个收件人都有姓名和电子邮件地址
   const recipients = [
     { name: 'Bart', email: 'bart@tld' },
     { name: 'Marge', email: 'marge@tld' },
     { name: 'Homer', email: 'homer@tld' },
     { name: 'Lisa', email: 'lisa@tld' },
     { name: 'Maggie', email: 'maggie@tld' },
   ];
   
   // 定义一个函数，用于发送邮件给指定的收件人
   function dispatch(recipient, callback) {
     // `sendMail` 是一个假设的邮件发送函数，它接受邮件配置和回调函数
     sendMail(
       {
         subject: 'Dinner tonight', // 邮件主题
         message: 'We have lots of cabbage on the plate. You coming?', // 邮件正文
         smtp: recipient.email, // 收件人的电子邮件地址
       },
       callback // 邮件发送完成后调用的回调函数
     );
   }
   
   // 定义最终结果处理函数
   function final(result) {
     // 打印尝试发送邮件的次数和成功发送的邮件数量
     console.log(`Result: ${result.count} attempts & ${result.success} succeeded emails`);
     // 如果有发送失败的邮件，打印失败的收件人名称
     if (result.failed.length)
       console.log(`Failed to send to: 
         \n${result.failed.join('\n')}\n`);
   }
   
   // 遍历收件人数组，并对每个收件人调用 dispatch 函数发送邮件
   recipients.forEach(function (recipient) {
     dispatch(recipient, function (err) {
       // 如果发送成功，则更新成功计数器
       if (!err) {
         success += 1;
       } else {
         // 如果发送失败，则将收件人名称添加到失败数组中
         failed.push(recipient.name);
       }
       // 更新邮件发送计数器
       count += 1;
   
       // 检查是否所有邮件发送完成
       if (count === recipients.length) {
         // 如果完成，调用 final 函数打印最终结果
         final({
           count: count, // 尝试发送的邮件总数
           success: success, // 成功发送的邮件数量
           failed: failed, // 发送失败的收件人名称数组
         });
       }
     });
   });
   ```

   

3. 有限并行：与限制并行，例如成功地从 10E7 个用户列表中向 1,000,000 个收件人发送电子邮件。

   ```javascript
   // 初始化成功发送邮件的计数器
   let successCount = 0;
   
   // 最终结果处理函数
   function final() {
     // 打印成功发送的邮件数量
     console.log(`dispatched ${successCount} emails`);
     // 打印完成信息
     console.log('finished');
   }
   
   // 邮件发送函数，接收一个收件人对象和回调函数
   function dispatch(recipient, callback) {
     // `sendEmail` 是一个假设的邮件发送客户端
     sendMail(
       {
         subject: 'Dinner tonight', // 邮件主题
         message: 'We have lots of cabbage on the plate. You coming?', // 邮件正文
         smtp: recipient.email, // 收件人的电子邮件地址
       },
       callback // 邮件发送完成后调用的回调函数
     );
   }
   
   // 递归函数，用于发送一百万封邮件
   function sendOneMillionEmailsOnly() {
     // 假设 `getListOfTenMillionGreatEmails` 函数获取了一千万封邮件的列表
     getListOfTenMillionGreatEmails(function (err, bigList) {
       if (err) throw err; // 如果有错误发生，抛出错误
   
       // 定义一个递归函数，用于序列化发送邮件
       function serial(recipient) {
         // 如果没有收件人对象或者成功发送的邮件数量达到一百万，则调用最终结果处理函数
         if (!recipient || successCount >= 1000000) return final();
         
         // 调用邮件发送函数，发送当前收件人的邮件
         dispatch(recipient, function (_err) {
           if (!_err) successCount += 1; // 如果发送成功，增加成功计数器
   
           // 继续发送下一封邮件，直到达到一百万封
           serial(bigList.pop()); // 从列表中取出最后一个收件人对象，并进行递归调用
         });
       }
   
       // 从列表中取出最后一个收件人对象开始发送邮件
       serial(bigList.pop());
     });
   }
   
   // 调用函数，开始发送一百万封邮件的过程
   sendOneMillionEmailsOnly();
   ```

   













阻塞：阻塞其他操作 任务 比如某个函数的执行 同步任务具有阻塞的特点 一个线程里存在多个同步 就可能阻塞

挂起：比如在异步函数内部 使用await表达式会导致js引擎在该店暂停执行 使异步函数挂起 直到promise解决

------

devDependependencies:开发依赖 执行`npm i .. --save-dev` 简写：`npm i .. -D`

dependenices:生产环境依赖

peerDependenpendencies（）对等依赖：插件开发使用  插件的宿主环境



`npm config list` 用于列出所有的 npm 配置信息。执行该命令可以查看当前系统和用户级别的所有 npm 配置信息，以及当前项目的配置信息（如果在项目目录下执行该命令）



------



## 内置模块



### path

在node里面 相对路径是根据终端所在路径来查找的 

`__dirname` 可以得到当**前模块目录的绝对路径** 

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



------

### OS

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



### Http

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



### process

不需要引入

`process.platform process.arch`

`process.argv`获取命令参数

`process.cwd`和dirname一样 但是esm下不能使用dirname

`process.memoryUsage`内存信息

`process.exit`退出当前进程

`process.kill(process.pid)`杀死进程 参数pid

`process.env`获取操作系统环境变量 可以修改 到那时修改只在进程里生效不会真正影响系统



------

### chuild_process

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

### fs

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





###  crypto

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





### zlib

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





### events

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

### util

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







