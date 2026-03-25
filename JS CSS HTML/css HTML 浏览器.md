# css HTML



##### 行盒和块盒的区别 以及怎样实现居中

```
行盒和块盒的本质取决于这个元素的最终计算出来的display属性 而并不是html元素 应用了inline-block或者block就是行盒 应用了inline就是行盒

默认情况下块盒单独一排 而行盒不会重启一行 

行盒可以包含文字 其他行盒 而块盒可以包含其他块盒和行盒 之所以可以在块盒里面写文字 是因为计算布局树的时候会在文字外层添加匿名行盒 

属性不同：根据标准 行盒是不可以设置宽高 根据内容大小撑开的（如果设置的宽度内容可以撑开的话）  也不能设置竖直方向上的bordeer和padding 会被忽略 

由于block块级元素可以计算宽高 可以使用margin：0 auto实现水平居中  但是由于在css规范里面 垂直方向的margin：auto只会在特定场景下生效 所以不在这些特定场景之下并不能使用这个方法

对于inline的行级元素 可以使用text-align:center vertical-align:middle属性实现水平方向居中 使用line height属性实现竖直方向的居中 

inline-block 元素确实结合了块级元素和行内元素的特性，这使得它们能够同时受益于两种元素类型的布局优势

对于所有元素都可以使用flex grid布局实现居 

```



##### html5元素分类

```
在html4里面 的确把元素区分成行级元素 块级元素 但是在新的标准里面已经不再使用这种说法 因为元素说的是html元素 但是决定是行盒还是块盒是css设置的问题 
所以在html5里面 重新分类元素 不再以行块进行分类
metadata：位于head里面 起到描述的作用 比如meta标签表述的是这个网页的特点 link
描述的是和外部文件的联系 title表示这个网页的标题
flow：文档流 也就是body标签里面的内容 
sectionning：定义区块的元素 比如section 
Heading：定义标题 
Pharsing：就是那些一般用于放文字的元素 
emneded：内嵌 用于引入资源 
interractive 表单元素
```





##### 怎么导入外部样式表

```
可以使用link @import导入外部样式表
但是@import是在css文件里面进行引入 因为他是css提供的语法规则 只能导入样式表 而link可以在html文档里面使用 因为它是html提供的语法 可以引入其他类型的文件

在加载方面 使用link引入的样式表会在预加载线程·里面进行加载 这个加载是同步的 但是因为和html解析线程不在统一线程 所以大部分情况下不会阻塞渲染。 而@import由于是在css文件里面引入的 所以至少要等link引入的css文件完成加载之后 才能执行@import
@import会在当前的css文件解析过程中被处理 相当于被导入的css、
被插入到这个import的地方 
适合在媒体查询里面使用

另外由于@import是在css2.1的语法 可能有兼容性问题 

由于js可以操作dom 所以可以通过插入link标签的方法来改变样式 
```





##### 浏览器渲染原理

```
当我们在浏览器的地址栏输入一个网址 浏览器将会发起网络请求 请求对应地址上面的html文件

返回的html文件里面是一个字符串 浏览器先要解析这个字符串 并且进行标记 

```





##### 渲染时遇到js会发生什么？

```
由于在js文件里面可能会涉及到dom元素修改 所以html解析是会等待js执行的 也正是因为这个特性 js执行会阻塞渲染 
如果渲染主线程在渲染过程里面遇到一个script标签引入的脚本 那么他会停止渲染 并且等待js文件的加载和执行 这里js文件的加载是在预加载线程里面进行的  在当前的渲染主线程上面执行js文件 再从中断的地方恢复渲染  
所以为了提升用户的体验 可能会选择提升渲染速度 而延迟水合 也就是吧script标签放在文档的底部  或者添加defer标签

带有defer标签的脚本会并行下载 脚本会在html解析完成 DOMcontentLoader之前执行 按照插入顺序执行
async标签的脚本会异步下载  下载完成之后立即执行 行为类似于使用js动态插入script标签（可以使用 script.async = false模拟defer的行为）
async适用于不改变dom 不要求顺序的场景 
```





##### 为什么css一般不会阻塞渲染

```
因为渲染的执行发生在渲染主线程 而现代浏览器会开启一个预加载线程 这个线程会快速扫描文档 找到引入的css并且开启加载和解析 当渲染主线程解析到link标签 可能这个文件还没有加载好 主线程也不会等待他。
当预加载线程完成加载解析 会把处理得到的cssOM树返回给主线程 使用cssom树 dom树计算得到带有属性样式的dom树 所以假设当DOM树解析完成 cssOM树还没有解析完成 时会导致阻塞的
或者在js的执行过程里面请求样式信息的时候 浏览器会延迟js执行 文档解析 等待CSSOM的下载解析
```







##### 怎样加快首屏渲染 

```
   （1）关键资源的数量。
    （2）关键路径长度。
    （3）关键字节的数量。

    关键资源是可能阻止网页首次渲染的资源。这些资源越少，浏览器的工作量就越小，对 CPU 以及其他资源的占用也就越少。

    同样，关键路径长度受所有关键资源与其字节大小之间依赖关系图的影响：某些资源只能在上一资源处理完毕之后才能开始下载，
    并且资源越大，下载所需的往返次数就越多。

    最后，浏览器需要下载的关键字节越少，处理内容并让其出现在屏幕上的速度就越快。要减少字节数，我们可以减少资源数（将它
    们删除或设为非关键资源），此外还要压缩和优化各项资源，确保最大限度减小传送大小。

    优化关键渲染路径的常规步骤如下：

    （1）对关键路径进行分析和特性描述：资源数、字节数、长度。
    （2）最大限度减少关键资源的数量：删除它们，延迟它们的下载，将它们标记为异步等。
    （3）优化关键字节数以缩短下载时间（往返次数）。
    （4）优化其余关键资源的加载顺序：您需要尽早下载所有关键资产，以缩短关键路径长度。
```





##### 怎么减少回流次数

```
回流是由于元素的几何属性改变从而引起的布局树重新计算 他会影响页面性能的原因是因为渲染会占用cpu 所以要减少回流可以减少元素几何属性的修改次数 或者减少布局树重新计算的范围 或者占用gpu代替cpu



使用transform代替绝对定位 这是因为transform执行不在主线程上面 不会影响绘制指令 进而 不会占用cpu 还会使用gpu进行加速

对于动画这样可能发生大量几何属性修改的地方 可以采用以下策略：
1.使用will change属性进行分层 


不要把dom节点的几何属性作为变量大量使用 这是因为事件循环导致浏览器可能会把几次dom元素属性的修改合并成一次操作 所以为了在获取元素位置正确的属性值 读取属性的操作会导致重新计算布局树 也就是回流 然后浏览器重新渲染 

不使用table布局

离线修改dom：使用documentFragment （这是什么）

有一些解决方案提到了不要一条一条修改dom元素的样式 而是直接添加类名 这种操作确实有利于程序可读性 但是由于事件循环的存在 实际上这两种方案是差不多的 因为事件循环会尽量减少重新渲染的次数而把修改操作合并到一个任务里面 
```





##### 怎么监听文档解析

```
    当初始的 HTML 文档被完全加载和解析完成之后，DOMContentLoaded 事件被触发，而无需等待样式表、图像和子框架的加载完成。

    Load 事件是当所有资源加载完成后触发的。
```



##### 怎么处理html新标签的兼容问题

```
可以使用createElement产生标签 使浏览器支持新标签  然后给标签添加默认样式
```



##### 对标签语义化的理解

```
指的是 用合适的标签划分内容结构 html的本质作用就是定义网络文档的结构 。这不仅有利于开发者阅读 而且能够让机器对文档进行正确的解读 比如b 和strong 虽然样式都是加粗 但是strong有强调的语义 而且html5的更新也体现以语义化的标签来构建网页的倾向
能够让页面内容结构化 便于浏览器搜索引擎解析 
1. 因为爬虫依赖于HTML标记来确定上下文 关键字权重 利于SEO
2. 利于无障碍访问 
3.语义化结构配合 CSS 媒体查询，可更精准地控制不同设备下的布局。
▶ 例如：nav标签在移动端可转为汉堡菜单，而无需修改 HTML 结构。
4.提升渲染性能 Chrome、Firefox 等浏览器会对语义化标签进行优化渲染。
▶ 例如：<canvas>标签会被优先分配 GPU 资源，提升动画性能。
```



前端需要注意哪些SEO

```
SEO 也就是搜索引擎优化 从以下几个角度进行评判：

1.内容质量与相关性 
	1.关键词相关性 2.内容更新频率
	合理的 title、description、keywords：搜索对这三项的权重逐个减小，title 值强调重点即可，重要关键词出现不要超过2次，而且要靠前，不同页面 title 要有所不同；description 把页面内容高度概括，长度合适，不可过分堆砌关键词，不同页面 description 有所不同；keywords 列举出重要关键词即可。使用合适的meta
	
	
2.网站技术与结构优化 、
	1.页面加载速度 2.移动端适配 3.爬虫可访问性
	语义化的 HTML 代码，搜索引擎依赖标签结构理解内容 符合 W3C 规范：语义化代码让搜索引擎容易理解网页。
	重要内容 HTML 代码放在最前：搜索引擎抓取 HTML 顺序是从上到下，有的搜索引擎对抓取长度有限制，保证重要内容肯定被抓取。
	重要内容不要用 js 输出：爬虫不会执行 js 获取内容
	少用 iframe：搜索引擎不会抓取 iframe 中的内容
	非装饰性图片必须加 alt 描述图片内容
	网站速度是搜索引擎排序的一个重要指标 可以压缩代码 图象 使用cdn加速静态资源 懒加载非关键资源 减少http请求 使用async defer异步加载js防止html解析被阻塞
	 单页应用可以使用首屏服务端渲染 或者ssg
    使用历史模式 因为哈希路由可能不会被搜索引擎识别 
	 
3.外部链接 权威性
	1.反向链接质量 2.域名权威性
4.用户体验
	1.跳出率 停留时间 点击率
	使用脚本记录用户停留时间 对停留时间短的页面进行修改 
```





##### html5的离线缓存的使用以及原理

早期技术：AppCache 现代更加推荐SW



- 三层缓存策略

  ：通过.appcache文件定义三类资源处理方式：

  - **CACHE**：强制离线存储的资源（如 JS、CSS、图片）存储的资源（如 JS、CSS、图片）。
  - **NETWORK**：必须在线访问的资源（不缓存）。
  - **FALLBACK**：离线时的备用资源（如 404 页面）。

- 缓存流程

  1. 浏览器首次访问带`manifest`属性的 HTML 时，下载`.appcache`文件。
  2. 按文件清单缓存资源，同时展示页面（可能闪屏，因资源未完全缓存）。
  3. 后续离线时，直接从缓存读取资源。





```
离线缓存指的是在没有网络连接的情况下 可以正常访问站点或者应用 在有网络连接的情况下 更新缓存文件 

 原理：HTML5 的离线存储是基于一个新建的 .appcache 文件的缓存机制（不是存储技术），通过这个文件上的解析清单离线存储资源，这些资源就会像 cookie 一样被存储了下来。之后当网络在处于离线状态下时，浏览器会通过被离线存储的数据进行页面展示
 
如何使用：

    （1）创建一个和 html 同名的 manifest 文件，然后在页面头部像下面一样加入一个 manifest 的属性。

        <html lang="en" manifest="index.manifest">

    （2）在如下 cache.manifest 文件的编写离线存储的资源。
      	CACHE MANIFEST
      	#v0.11
      	CACHE:
      	js/app.js
      	css/style.css
      	NETWORK:
      	resourse/logo.png
      	FALLBACK:
      	/ /offline.html

        CACHE: 表示需要离线存储的资源列表，由于包含 manifest 文件的页面将被自动离线存储，所以不需要把页面自身也列出

        NETWORK: 表示在它下面列出来的资源只有在在线的情况下才能访问，他们不会被离线存储，所以在离线情况下无法使用这些 资源。不过，如果在 CACHE 和 NETWORK 中有一个相同的资源，那么这个资源还是会被离线存储，也就是说 C ACHE 的优先级更高。

        FALLBACK: 表示如果访问第一个资源失败，那么就使用第二个资源来替换他，比如上面这个文件表示的就是如果访问根目录下任何一个资源失败了，那么就去访问 offline.html 。

    （3）在离线状态时，操作 window.applicationCache 进行离线缓存的操作。


    如何更新缓存：

    （1）更新 manifest 文件
    （2）通过 javascript 操作
    （3）清除浏览器缓存

    注意事项：

    （1）浏览器对缓存数据的容量限制可能不太一样（某些浏览器设置的限制是每个站点 5MB）。
    （2）如果 manifest 文件，或者内部列举的某一个文件不能正常下载，整个更新过程都将失败，浏览器继续全部使用老的缓存。
    （3）引用 manifest 的 html 必须与 manifest 文件同源，在同一个域下。
    （4）FALLBACK 中的资源必须和 manifest 文件同源。
    （5）当一个资源被缓存后，该浏览器直接请求这个绝对路径也会访问缓存中的资源。
    （6）站点中的其他页面即使没有设置 manifest 属性，请求的资源如果在缓存中也从缓存中访问。
    （7）当 manifest 文件发生改变时，资源请求本身也会触发更新。
 
```

#### **与 Service Worker 的区别**

| 特性           | AppCache（已过时）                | Service Worker（现代方案） |
| -------------- | --------------------------------- | -------------------------- |
| **缓存控制**   | 静态清单（.appcache 文件）        | 可编程的 JS 控制（更灵活） |
| **更新机制**   | 清单文件变更时全量更新            | 可增量更新，支持平滑过渡   |
| **浏览器支持** | 主流浏览器已弃用（如 Chrome 80+） | 全量支持（现代 Web 标准）  |
| **离线体验**   | 简单缓存，无运行时控制            | 可拦截请求，自定义         |

Service Worker 本质上是一个**独立于主线程的后台脚本**，通过以下步骤工作：



1. **注册**：页面加载时，JS 代码注册 Service Worker（指定脚本路径）。
2. **安装**：浏览器下载并执行 Service Worker 脚本，通常在此时缓存静态资源。
3. **激活**：安装完成后，Service Worker 激活并开始控制页面（可能需要刷新页面）。
4. **拦截请求**：激活后，Service Worker 可拦截页面的所有网络请求，根据缓存策略返回响应。



**关键特性**：



- **离线支持**：无网络时，可返回缓存资源或自定义响应。
- **后台同步**：网络恢复时，自动重试失败的请求（如提交表单）。
- **推送通知**：接收服务器推送的消息，即使页面未打开。



```javascript
// index.js（页面主脚本）
if ('serviceWorker' in navigator) {
  // 页面加载完成后注册（避免阻塞渲染）
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker注册成功:', registration);
      })
      .catch(err => {
        console.error('Service Worker注册失败:', err);
      });
  });
}
```

```javascript
// 缓存名称（用于版本控制，修改名称可触发缓存更新）
const CACHE_NAME = 'simple-page-cache-v1';

// 需要缓存的资源列表
const resourcesToCache = [
  '/',
  '/index.html',
  '/styles.css'
];

// 安装事件：缓存静态资源
self.addEventListener('install', event => {
  console.log('Service Worker 安装中...');
    //这个api告诉浏览器install正在进行 需要等待promise完成 
  event.waitUntil(
      //打开指定名称的缓存空间 
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存资源:', resourcesToCache);
          //批量缓存多个资源 
        return cache.addAll(resourcesToCache);
      })
  );
});

// 激活事件：清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker 激活中...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // 删除不在当前版本中的旧缓存
            if (cacheName !== CACHE_NAME) {
              console.log('删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
});

// 拦截请求事件：使用缓存或网络资源
self.addEventListener('fetch', event => {
  console.log('拦截请求:', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 缓存命中：直接返回缓存的资源
        if (response) {
          console.log('使用缓存资源:', event.request.url);
          return response;
        }

        // 缓存未命中：从网络获取资源
        console.log('从网络获取资源:', event.request.url);
        return fetch(event.request);
      })
  );
});
sw的生命周期是这样的：
1.注册
2.下载sw脚本文件
3. install 是首次注册 或者脚本内容改变的时候将会触发 
4.等待 若已有旧版本 Service Worker 在运行，新版本会进入等待状态
5.激活 旧版本 Service Worker 被关闭后，新版本开始激活，通常用于清理旧缓存。
6.空闲/活动  激活后，Service Worker 进入空闲状态，等待拦截网络请求（fetch 事件）。
```



##### cookie sessionStroage localStorage

```
这是三种在浏览器端存储数据的方式  并且都是字符串类型的键值对 
localStorage sessionStorage属于html5的webStorage 是为了能够在客户端存储数据 
而cookie是网站为了标识用户身份而存储在浏览器上经过加密的数据 cookie数据始终在同源的http请求里面携带 在浏览器 服务器之间来回传递
cookie存储的数据不能超过4kb
webStorage一般有5m

对于local 将会持久存储数据 在浏览器关闭之后 不会丢失 除非主动删除 同源页面可以共享
session会在页面会话结束之后被清除只能在当前的会话里面共享
而cookie在设置的过期时间之前是一直有效的

而local可以实现持久化存储是因为数据直接写入了浏览器的本地存储系统 比如谷歌浏览器的Local Storage目录 只要是同源的标签页就可以访问同一个存储区域 

session数据则是存储在浏览器的内存里面 和特定的浏览会话绑定的 会话结束 内存数据就会自动释放
并且由于每个窗口的内存是相互独立的 ，在创建的时候会生成唯一的会话标识符 sessionStorage里面的数据 是和这个数据绑定的 因为他们有自己单独的进程 开辟了单独的内存区域 这也使得即使是同源也不能共享数据 

有一些浏览器支持恢复会话 是因为这些浏览器实现了临时保存seesionStorage数据的特殊功能 

因为session是内存操作 所以读写会更快 

不过这几种存储方式都只适用于少量数据 如果要在浏览器端存储大量数据 应该使用indexedDB 这是一种非关系型数据库 
```

##### iframe

```
 怎么判断页面资源是不是被嵌入iframe：检查window.top（顶层窗口对象） window.self（当前窗口对象）是否相等
 
 iframe是一个用于在当前页面嵌入另一个网页的元素 创建了一个独立的浏览上下文 这指的是这里面的页面拥有独立的dom js环境 浏览器历史记录 父子页面的js默认不能相互访问  可以加载外部资源 但是会受到同源策略的限制

假设iframe加载的页面的url和父页面同源 那可以使用window.parent 和 window.contentWindow相互访问 
不能直接访问dom或者数据 但是可以使用postMessage进行通信

这个标签存在以下问题
1.阻塞主页面的onLoad事件 可以通过js动态设置src避免
2.爬虫无法检测 不利于seo
3.iframe 和主页面共享连接池，而浏览器对相同域的连接有限制，所以会影响页面的并行加载。（浏览器会给每个域名维护一个连接池 用于管理和服务器的TCP连接 在Http1.1里面 每个域名支持6-8个并发连接 在http2中 理论上支持无限并发 但是浏览器还是会有限制 比如谷歌浏览器限制为100  当请求的数量超过限制 多余的请求将会进入排队状态 等待已有连接释放  所以 如果iframe加载大量资源 就会导致主页面资源等待）不过可以使用loading='lazy' 延迟非关键资源 
4.后退按钮无法控制iframe里面的页面，这是因为页面包含iframe的时候 浏览器会维护两份浏览历史 ：主页面历史 而后退按钮操作的是主页面历史 
5.小型移动设备不能完全显示框架 
6.导致脚本注入攻击 

```

##### 怎么·防止由于iframe引起的xss攻击

```
1.使用meta标签 或者Content-Security-Policy 限制允许嵌入的iframe来源
<!-- 示例：只允许加载同源或指定白名单域名的 iframe -->
<meta http-equiv="Content-Security-Policy" content="frame-src 'self' https://trusted-domain.com;">
2.避免动态生成不可信的iframe源
3.启用沙箱模式 限制iframe行为 
```

##### HTML5的新特性

1. 媒体标签:video audio

2. web存储

3. Noification 允许网页在用户授权后向其发送桌面通知，即使浏览器处于后台或关闭状态

   ```javascript
   // 检查浏览器支持
   if (window.Notification) {
     // 请求授权（三种状态：default/denied/granted）
     Notification.requestPermission().then(permission => {
       if (permission === 'granted') {
         console.log('用户已授权通知');
         showNotification(); // 显示通知
       } else {
         console.log('用户拒绝通知授权');
       }
     });
   } else {
     console.log('当前浏览器不支持Notification API');
   }
   
   
   function showNotification() {
     // 通知配置
     const options = {
       body: '这是一条测试通知', // 通知正文
       icon: 'https://example.com/icon.png', // 通知图标
       title: '简易通知', // 通知标题
       data: { userId: 123 }, // 自定义数据（可在回调中使用）
       requireInteraction: true // 是否需要用户交互才消失
     };
     
     // 创建通知实例
     const notification = new Notification('通知标题', options);
     
     // 通知点击事件（用户点击通知时触发）
     notification.onclick = () => {
       console.log('用户点击了通知');
       window.focus(); // 聚焦浏览器窗口
     };
     
     // 通知关闭事件
     notification.onclose = () => {
       console.log('通知已关闭');
     };
   }
   
   
   //结合sw实现后台推送
   // service-worker.js（后台脚本）
   self.addEventListener('push', event => {
     if (event.data) {
       const notificationData = event.data.json();
       event.waitUntil(
         self.registration.showNotification(notificationData.title, {
           body: notificationData.message,
           icon: notificationData.icon,
           data: notificationData.data
         })
       );
     }
   });
   
   // 点击通知后打开指定页面
   self.addEventListener('notificationclick', event => {
     event.notification.close(); // 关闭通知
     event.waitUntil(
       clients.openWindow(event.notification.data.url || '/')
     );
   });
   
   服务器通过推送服务向浏览器发送新的推送消息时，无论浏览器是否打开，Service Worker 都会接收到 push 事件。
   当用户点击浏览器显示的通知时，Service Worker 会接收到 notificationclick 事件。
   ```

   

4. 地理位置

5. 离线缓存

6. 历史对象

7. websocket  是一种在单个 TCP 连接上进行全双工通信的网络协议

   1. #### 1. **全双工通信（Full-Duplex）**

      - **双向实时交互**：浏览器与服务器可同时发送和接收数据，无需轮询（如每秒请求一次数据）。
      - **低延迟**：数据传输延迟显著低于 HTTP 轮询（典型场景下延迟降低 50% 以上）。

   2. #### 2. **持久连接（Persistent Connection）**

      - 一次握手建立连接后，连接持续存在（除非主动关闭），避免 HTTP 每次请求都需重新建立 TCP 连接的开销（如 TCP 三次握手、TLS 加密）。

   3. #### . **事件驱动模型**

      - 通过事件监听实现数据接收（`onmessage`）、连接打开（`onopen`）、连接关闭（`onclose`）等，代码逻辑更清晰。

   ```
   GET /chat HTTP/1.1
   Host: example.com
   Upgrade: websocket//告知服务器请求升级为 WebSocket 协议。
   Connection: Upgrade
   Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==//是客户端生成的随机字符串，用于验证协议升级。
   Sec-WebSocket-Version: 13
   
   // 创建WebSocket实例（ws:// 或 wss:// 协议）
   const socket = new WebSocket('wss://example.com/chat');
   
   // 连接打开事件
   socket.onopen = () => {
     console.log('WebSocket连接已建立');
     // 发送初始化消息
     socket.send(JSON.stringify({ type: 'init', userId: '123' }));
   };
   
   // 接收消息事件
   socket.onmessage = (event) => {
     const message = JSON.parse(event.data);
     console.log('收到消息:', message);
     // 处理消息（如更新聊天界面）
     if (message.type === 'chat') {
       appendChatMessage(message.content);
     }
   };
   
   // 连接关闭事件
   socket.onclose = (event) => {
     if (event.wasClean) {
       console.log('WebSocket连接正常关闭');
     } else {
       console.log('WebSocket连接异常关闭（代码:', event.code, '原因:', event.reason);
     }
     // 尝试重连（可选）
     setTimeout(reconnect, 5000);
   };
   
   // 错误事件
   socket.onerror = (error) => {
     console.error('WebSocket错误:', error);
   };
   
   // 发送消息函数
   function sendMessage(content) {
     if (socket.readyState === WebSocket.OPEN) {
       socket.send(JSON.stringify({ type: 'chat', content }));
     } else {
       console.error('无法发送消息：连接未打开');
     }
   }
   
   // 重连函数
   function reconnect() {
     console.log('尝试重连WebSocket...');
     // 重新创建实例
     socket = new WebSocket('wss://example.com/chat');
     // 绑定事件...
   }
   
   轮询是指客户端（如浏览器）按照固定时间间隔（如 1 秒、5 秒）向服务器发送 HTTP 请求，服务器返回最新数据，客户端再根据响应更新页面
   ```

   WebSocket 数据以帧（Frame）为单位传输，每个帧包含：

   

   - **操作码（Opcode）**：标识数据类型（如文本、二进制、关闭连接）。
   - **掩码（Mask）**：客户端发送的数据必须掩码处理，服务器无需（增强安全性）。
   - **负载数据（Payload Data）**：实际传输的内容（如 JSON 字符串、二进制数据）。

8. webWorker

9. 

10. 1. 这是一种在后台运行js的方法 可以执行任务不阻塞主线程 worker线程不可以直接操作dom元素不能·使用window对象 数据传递使用的是拷贝 而不是共享 分为普通worker 共享worker

      ```
      //创建一个wbworker 指定脚本执行worker线程
      const myWorker = new Worker("worker.js");
      //在woker和主线程里面 可以使用postMessage发送信息 onMessage接收信息
      onmessage = (e) => {
        const workerResult = `Result: ${e.data[0] * e.data[1]}`;
        postMessage(workerResult);
      };
      //终止worker
      myWorker.terminate();
      ```

      ```
      //共享worker
      const myWorker = new SharedWorker("shared-worker.js");
      
      myWorker.port.onmessage = (e) => {
        result2.textContent = e.data;
        console.log("Message received from worker");
      };
      
      myWorker.port.postMessage([squareNumber.value, squareNumber.value]);
      
      
      //worger
      onconnect = (e) => {
        const port = e.ports[0];
      
        port.onmessage = (e) => {
          const workerResult = `Result: ${e.data[0] * e.data[1]}`;
          port.postMessage(workerResult);
        };
      };
      ```

      还有嵌入式worker 写在script标签里面

11. dragable

12. visibiitychaange 

13. 跨窗口通信：**postMessage 支持跨域通信** 但是必须获得另一个窗口的引用 **messageChanel  允许同一个域名下面的不同窗口标签页之间通信** 不需要目标窗口引用 使用localStorage 窗口监听stroage事件

    ```javascript
    document.getElementById('sendBtn').addEventListener('click', () => {
        // 获取窗口 B 的引用（通过 window.open 或其他方式）
        const windowB = window.open('secondary.html', '_blank');
        // 发送消息给窗口 B
        windowB.postMessage('Hello from Window A', 'http://example.com');
      });
      
      // 监听消息事件
      window.addEventListener('message', (event) => {
        // 检查消息来源
        if (event.origin !== 'http://example.com') return;
        console.log('Message from Window A:', event.data);
        // 可以在这里处理消息并回复
        event.source.postMessage('Hello back from Window B', event.origin);
      });
    ```

    ```javascript
    const channel = new BroadcastChannel('myChannel');
    channel.postMessage('Hello from Window A');
    
    //相同的chanel
    const channel = new BroadcastChannel('myChannel');
    channel.addEventListener('message', (event) => {
      console.log('Message from Window A:', event.data);
    });
    ```

    ```
    //node实现websocket
    const WebSocket = require('ws');
    const server = new WebSocket.Server({ port: 8080 });
    
    server.on('connection', (ws) => {
      ws.on('message', (message) => {
        // 广播消息给所有客户端
        server.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      });
    });
    
    const ws = new WebSocket('ws://localhost:8080');
    ws.onmessage = (event) => {
      console.log('Message from server:', event.data);
    };
    ```

    

14. canvas svg

    canvas是基于像素的绘图 所以放大可能有锯齿  处理大量图形的时候性能更好 svg是基于矢量的

    Canvas 是 HTML5 提供的一个图形绘制容器，本质上是一个用 JavaScript 操作的二维绘图表面。它通过 `<canvas>` 标签在网页中创建，并依赖 JavaScript 脚本实现图形绘制、动画效果、图像渲染等功能

    canvas的使用：使用getContext获取上下文 其提供的api来进行绘制

    ```javascript
    // 获取Canvas元素并创建2D绘图上下文
            const canvas = document.getElementById('codeRainCanvas');
            const ctx = canvas.getContext('2d');
    
            // 设置画布大小为窗口大小，确保全屏显示
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
    
            // 定义代码雨的字符集，包括大小写字母和数字
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
            const charArray = chars.split(''); // 将字符集转换为数组，便于随机选择
            const fontSize = 16; // 设置字体大小
            const columns = canvas.width / fontSize; // 计算画布宽度能容纳的列数
    
            // 创建一个数组来存储每列的代码字符下落位置
            // 初始时，所有字符都从第一行开始下落
            const drops = [];
            for (let i = 0; i < columns; i++) {
                drops[i] = 1;
            }
    
            // 绘制代码雨动画的主函数
            function drawCodeRain() {
                // 使用半透明黑色填充整个画布，创造字符逐渐消失的效果
                // 透明度为0.05，确保前一帧的字符痕迹仍然可见，形成拖尾效果
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
    
                // 遍历每一列，绘制该列当前位置的字符
                for (let i = 0; i < drops.length; i++) {
                    // 随机选择字符集中的一个字符
                    const text = charArray[Math.floor(Math.random() * charArray.length)];
                    
                    // 设置字符颜色为绿色，模拟《黑客帝国》中的数字雨效果
                    ctx.fillStyle = '#00ff00';
                    
                    // 设置字体和大小
                    ctx.font = fontSize + 'px arial';
                    
                    // 在指定位置绘制字符
                    // x坐标 = 列索引 * 字体大小
                    // y坐标 = 当前下落位置 * 字体大小
                    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
    
                    // 当字符下落到底部且有小概率(2.5%)时，重置该列的下落位置
                    // 这样可以使各列的字符下落不同步，增加随机性
                    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                        drops[i] = 0;
                    }
                    
                    // 更新下落位置，使字符逐帧下落
                    drops[i]++;
                }
    
                // 请求浏览器下一帧重绘时调用此函数，实现动画循环
                // requestAnimationFrame比setInterval更高效，且与屏幕刷新率同步
                requestAnimationFrame(drawCodeRain);
            }
    
            // 开始代码雨动画
            drawCodeRain();
    
            // 监听窗口大小变化事件，重新调整画布尺寸和初始化列数
            // 确保窗口大小改变时，动画能自适应并保持正确的布局
            window.addEventListener('resize', () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
                columns = canvas.width / fontSize;
                
                // 重置列数和下落位置数组
                drops.length = columns;
                for (let i = 0; i < columns; i++) {
                    drops[i] = 1;
                }
            });
    ```

#### css继承 

继承属性没有值 将会取父元素的相同属性的计算值 

非继承属性没有值 将会使用默认样式

所有元素可以继承的属性：visibility cursor

内联元素继承属性：和字体有关的属性 字体的大小 颜色 文本属性里面的text-indent text-align无法继承。

块级元素可以继承的属性和行内元素相似 但是文本属性的text-indent text-align是可以继承的 并且还可以继承列表布局属性 这是为了在有序列表 无序列表里面 列表项可以继承 list-style-type list-style-image list-style-position

##### HTML5的自动完成功能

```
这指的是form表单的autoComplete属性 这个属性默认打开 浏览器会根据之前键入的值进行预测 
```



##### 怎么实现浏览器内多个标签页之间的通信

```
显现多个标签页之间的通信 本质上都是使用的中介者模式 这是因为标签页之间不能直接进行通信 
1.websocket协议 因为websocket协议可以实现服务器推送 所以服务器可以作为中介 收到消息之后向其他标签页发通知
2.sharedWorker 在页面存在的生命周期内创建一个唯一的线程 这是其他页面可以连接到这个线程 这个线程就可以作为中介 实现数据交换 
3.使用localStorage 可以通过对本地存储的监听和修改来共享数据 
4.messageChanel 可以实例化MessageChanel对象 这个对象上面有port1 port2这样的信道 在信道上面使用onmessage postMessage接受 发送信息
还可以使用webWorker把创建的信道发送到worker进程里面 worker进程来处理信息的发送接受逻辑
po's't
```

```javascript
// 主线程（index.js）
const channel = new MessageChannel();
const worker = new Worker('worker.js');

// 向Worker发送端口2，并建立通信
worker.postMessage('初始化通道', [channel.port2]);

// 监听端口1的消息
channel.port1.onmessage = (event) => {
  console.log('来自Worker的消息:', event.data);
  // 主线程处理消息...
};

// 向Worker发送数据
channel.port1.postMessage('主线程请求数据');


// Web Worker线程（worker.js）
onmessage = (event) => {
  if (event.data === '初始化通道') {
    // 获取端口2并建立监听
    const port = event.ports[0];
    port.onmessage = (workerEvent) => {
      console.log('来自主线程的消息:', workerEvent.data);
      // Worker处理消息并回复
      port.postMessage('Worker已接收数据：' + new Date());
    };
  }
};
```



##### pagevisibility

```
可以监听网页的可见性 来预判卸载 比如 当网页不可见的时候 就可以
1.停止对服务器的轮询
2.网页动画停止 
3.停止资源 音乐 视频等 
```



##### 怎么实现一个圆形的可点击区域

```
1.纯html实现 使用图像映射 把图像和map标签映射 定义一个圆形的area标签 
2.使用border-radius 设置一个圆形的按钮
3.监听点击事件 判断点击的位置是不是位于目标原内 
  <!-- 定义图片并关联到图像映射 -->
  <img src="https://picsum.photos/800/400"  <!-- 示例图片，实际使用时替换为你的图片 -->
       alt="示例图片" 
       usemap="#image-map"
       style="max-width: 100%;">
  
  <!-- 定义图像映射 -->
  <map name="image-map">
    <!-- 圆形区域1：圆心(200,150)，半径50px -->
    <area shape="circle" 
          coords="200,150,50" 
          href="https://example.com/circle1" 
          alt="蓝色圆形"
          target="_blank">
    
    <!-- 圆形区域2：圆心(600,250)，半径80px -->
    <area shape="circle" 
          coords="600,250,80" 
          href="https://example.com/circle2" 
          alt="红色圆形"
          target="_blank">
  </map>
<map> 标签是 HTML 中用于创建图像映射（Image Map）的容器标签。它允许你在一张图片上定义多个可点击的热点区域（如矩形、圆形、多边形），每个区域可链接到不同的 URL 或执行 JavaScript 操作，从而实现交互式图像效果。
```

##### canvas svf

```
 Canvas 是一种通过 JavaScript 来绘制 2D 图形的方法。Canvas 是逐像素来进行渲染的，因此当我们对 Canvas 进行缩放时，
 会出现锯齿或者失真的情况。
 
 SVG 是一种使用 XML 描述 2D 图形的语言。SVG 基于 XML，这意味着 SVG DOM 中的每个元素都是可用的。我们可以为某个元素
 附加 JavaScript 事件监听函数。并且 SVG 保存的是图形的绘制方法，因此当 SVG 图形缩放时并不会失真。
```

##### 55. 浏览器架构

   ```
 * 用户界面
   * 主进程
   * 内核
       * 渲染引擎
       * JS 引擎
           * 执行栈
       * 事件触发线程
           * 消息队列
               * 微任务
               * 宏任务
       * 网络异步线程
       * 定时器线程
   ```

##### 56. 常用的 meta 标签

```
    <meta> 元素可提供有关页面的元信息（meta-information），比如针对搜索引擎和更新频度的描述和关键词。
    <meta> 标签位于文档的头部，不包含任何内容。<meta> 标签的属性定义了与文档相关联的名称/值对。

    <!DOCTYPE html>  H5标准声明，使用 HTML5 doctype，不区分大小写
    <head lang=”en”> 标准的 lang 属性写法
    <meta charset=’utf-8′>    声明文档使用的字符编码
    <meta http-equiv=”X-UA-Compatible” content=”IE=edge,chrome=1″/>   优先使用 IE 最新版本和 Chrome
    <meta name=”description” content=”不超过150个字符”/>       页面描述
    <meta name=”keywords” content=””/>      页面关键词者
    <meta name=”author” content=”name, email@gmail.com”/>    网页作
    <meta name=”robots” content=”index,follow”/>      搜索引擎抓取
    <meta name=”viewport” content=”initial-scale=1, maximum-scale=3, minimum-scale=1, user-scalable=no”> 为移动设备添加 viewport
    <meta name=”apple-mobile-web-app-title” content=”标题”> iOS 设备 begin
    <meta name=”apple-mobile-web-app-capable” content=”yes”/>  添加到主屏后的标题（iOS 6 新增）
    是否启用 WebApp 全屏模式，删除苹果默认的工具栏和菜单栏
    <meta name=”apple-itunes-app” content=”app-id=myAppStoreID, affiliate-data=myAffiliateData, app-argument=myURL”>
    添加智能 App 广告条 Smart App Banner（iOS 6+ Safari）
    <meta name=”apple-mobile-web-app-status-bar-style” content=”black”/>
    <meta name=”format-detection” content=”telphone=no, email=no”/>  设置苹果工具栏颜色
    <meta name=”renderer” content=”webkit”>  启用360浏览器的极速模式(webkit)
    <meta http-equiv=”X-UA-Compatible” content=”IE=edge”>     避免IE使用兼容模式
    <meta http-equiv=”Cache-Control” content=”no-siteapp” />    不让百度转码
    <meta name=”HandheldFriendly” content=”true”>     针对手持设备优化，主要是针对一些老的不识别viewport的浏览器，比如黑莓
    <meta name=”MobileOptimized” content=”320″>   微软的老式浏览器
    <meta name=”screen-orientation” content=”portrait”>   uc强制竖屏
    <meta name=”x5-orientation” content=”portrait”>    QQ强制竖屏
    <meta name=”full-screen” content=”yes”>              UC强制全屏
    <meta name=”x5-fullscreen” content=”true”>       QQ强制全屏
    <meta name=”browsermode” content=”application”>   UC应用模式
    <meta name=”x5-page-mode” content=”app”>    QQ应用模式
    <meta name=”msapplication-tap-highlight” content=”no”>    windows phone 点击无高光
    设置页面不缓存
    <meta http-equiv=”pragma” content=”no-cache”>
    <meta http-equiv=”cache-control” content=”no-cache”>
    <meta http-equiv=”expires” content=”0″>
```

##### head标签

```
    <head> 标签用于定义文档的头部，它是所有头部元素的容器。<head> 中的元素可以引用脚本、指示浏览器在哪里找到样式表、提供
    元信息等等。

    文档的头部描述了文档的各种属性和信息，包括文档的标题、在 Web 中的位置以及和其他文档的关系等。绝大多数文档头部包含的数
    据都不会真正作为内容显示给读者。

    下面这些标签可用在 head 部分：<base>, <link>, <meta>, <script>, <style>, 以及 <title>。

    <title> 定义文档的标题，它是 head 部分中唯一必需的元素。
```

性能优化

```
    前端性能优化主要是为了提高页面的加载速度，优化用户的访问体验。我认为可以从这些方面来进行优化。

    第一个方面是页面的内容方面

    （1）通过文件合并、css 雪碧图、使用 base64 等方式来减少 HTTP 请求数，避免过多的请求造成等待的情况。

    （2）通过 DNS 缓存等机制来减少 DNS 的查询次数。（浏览器 操作系统会缓存近期访问近期访问过的域名解析结果 这个属于客户端缓存  本地DNS服务器缓存 用户的网络服务的DNS服务器 可以为同一网络内的用户提供共享缓存  公共DNS服务器 作为用户查询的中转站 缓存解析结果来加速后续请求 顶级域名服务器 缓存域名解析的顶层映射关系，加速递归查询过程 ）

    （3）通过设置缓存策略，对常用不变的资源进行缓存。

    （4）使用延迟加载的方式，来减少页面首屏加载时需要请求的资源。延迟加载的资源当用户需要访问时，再去请求加载。

    （5）通过用户行为，对某些资源使用预加载的方式，来提高用户需要访问资源时的响应速度。

    第二个方面是服务器方面

    （1）使用 CDN 服务，来提高用户对于资源请求时的响应速度。

    （2）服务器端启用 Gzip、Deflate 等方式对于传输的资源进行压缩，减小文件的体积。


    第三个方面是 CSS 和 JavaScript 方面

    （1）首屏样式可以使用内联样式 避免因为css文件大 或者解析时间长造成阻塞。

    （3）尽量把 js 脚本放在页面底部或者使用 defer 或 async 属性，避免脚本的加载和执行阻塞页面的渲染。

    （4）通过对 JavaScript 和 CSS 的文件进行压缩，来减小文件的体积。
```

```
##### a元素的颜色为什么不继承父元素的颜色？

因为a的默认样式表里面有颜色  这**个默认选择器权重大于0 而继承的权重等于0**






#### 为什么浮动的 绝对定位的行级元素可以设置大小

**因为元素一旦浮动 绝对定位就会把display设置成block** 可以在computed面板里看出





#### css怎么画三角形

1. 边框
2. clip path
3. canvas



#### 怎么让子元素的高度是父元素宽度的一半

**设置padding-bottom为百分之五十** 这是因为padding使用百分比作为单位的时候的参照物是父元素的宽度
使用css变量 
:root {
  /* 全局变量：在根元素定义，全站可用 */
  --primary-color: #3498db;
  --spacing: 16px;
  --font-family: 'Inter', sans-serif;
}

.my-component {
  /* 局部变量：仅在.my-component及其子元素中可用 */
  --component-bg: #f5f5f5;
  --component-padding: calc(var(--spacing) / 2); /* 可引用其他变量 */
}


怎么防止图片变形？

设置**object-fit属性 属性值有fill contain cover none**





#### 文字排列问题

文字围绕浮动元素 和高度塌陷导致的现象
高度塌陷指的是：父元素的高度依赖于子元素的内容高度的时候 如果子元素全部为浮动元素 父元素会失去对其高度的感知 导致父元素高度变为0 这是因为浮动的元素脱离了文档流 导致在父元素看来内部不存在元素 要解决高度塌陷 就要清除浮动带来的影响  使用伪元素模拟空div  并且添加css属性里面的clear：both。或者给父元素添加overflow：hidden/auto 这样浮动元素就会包含在父元素的高度计算里面  或者使用flex grid 布局 这个布局会包含浮动元素 




#### 怎么把网页变成黑白色

给网页的根元素 也就是html 设置filter：grayScale(1)





#### 包含块 containing Block

**包含块指的是一个元素的参考系 也就是这个元素在哪里进行排列 但是一个元素的包含快不一定是父级的content区域 比如固定定位的包含块 是整个视口 使用百分比单位相对于就是包含块的宽度**


```



##### 解析表达式的值

```
var a = {
	n:0
}
var b = a
a.n = a = {n:1}
b.n = ?
{
	n:1
}
这是因为进行连续赋值的时候 从右向左解析 但是从左向右执行 
所以这里的连续赋值实际上就是把b.n指向新的对象 再让a指向新的对象





console.log((1,2,3))//3
这个叫括号运算符 返回里面的最后一个值 






[]+{} //[Object Object] = ''+[Object Object]
{}+[]  // 这个大括号会被认为是代码块 所以相当于+‘’ 结果是0
({}+[]) = [Object Object]

+的运行过程：判断两边是否为原始类型 如果有对象类型 对对象调用valueof toString方法 转换成原始类型 如果经过这两步还不是原始类型就会报错

对于数组 调用toString返回一个以逗号作为分隔符的字符串

**如果原始类型里面有字符串类型 那么进行字符串拼接**

**如果没有 进行算数运算**





[1,2,3].map(parseInt)
结果是：1 NaN NaN
['ob11','0x12','013']
结果是0 NaN 1
map会把**元素值 和下标** 传递给处理函数 而parseInt的第二个参数 代表的是把这个数字当成什么进制去处理 **这个进制的有效值是2-36 但是这个值如果是0 NaN Infinity 那么将会当作十进制处理** 

所以1会被当成十进制 结果是1

2因为进制是1 所以转换成NaN 

3被当成2进制 但是没二进制的有效位 所以是NaN
```





#### null和undefined的比较

无论大于小于等于都是假 因为 原始类型转换成数字 undefined变成NaN NaN进行比较会直接返回假





#### 图片底部和父级的间隙

这是因为**图片的排列方式和文字是一样**的 **文字是有基线的 所以图片也会从基线排列**，解决方案：img设置成块 父级字体大小等于0









#### 逻辑运算符

2&&4这个表达式返回的结果是4 并非简单的true false 这是因为 与表**达式的结果是可以判断真假的最后一个值** 同理2||4返回的是2





#### 实现值的交换

1. a=a+b b=a-b a = a-b
2. 解构赋值
3. 异或 a = a^b b= a^b a = a^b (异或自己=0 异或0等于自己)





#### css选择器权重

(x,y,z):x代表id选择器 y代表**类**选择器 **伪类**选择器 **属性**选择器的数量 z：**元素 伪元素**选择器的数量

从x开始 依次比较







#### 空白折叠

这个规则仅对行元素有效 指的是html代码里面的空白符号 回车符号 会变成一个空格 这个会造成img间隔不一致的问题



#### 对象属性的遍历顺序 以及为什么这样子处理

对象属性的遍历顺序是：**数字属性正数升序排列 负数降序排列 其他属性按照写入顺序排列**

这样做的原因是因**为引擎内部实现了优化 这其实就是数组的优化：对于数字属性 会占用一块内存空间 而其他属性占用其他的内存空间 在数字属性的空间里面 引擎计算每个属性值占有一定大小的内存区域 从而可以根据步长找到某个元素 提高运行效率 数组也是这样的 并且如果使用错误的凡是使用数组或者数字书信 就会导致引擎不使用这种优化策略**

比如给一个下标很大的元素赋值 两个赋值的元素的下标差距很大









#### jslabel语法 标记语法

可以用来**在内层循环里面结束外层循环**

```
outerLoop:for(var i = 0;i<110;i++){
	for(...){
		break outerLoop
	}
}
```







#### undefined的问题

首先 **undefined是一种数据类型 但是它实际上是window上面的一个只读属性** 

**由于他不是一个关键字 所以变量的命名时可以写成undefined的**

```
function m(){
 let undefied = 1
 let a = undefined
 //a=1
}
```

所以一般赋值的时候使用的时void 0 

void是一个运算符 用于对表达式求值 总是返回undefined



==运算符

1. 如果两端类型相同就比较值
2. 如果两端类型不同并且都是原始值 转换成数字 如果不是原始值 先转换成原始值 对于对象 **调用valueof方法**  对于数组 **调用toString**

所以 如果组要控制对象=》原始值的转换规则 重写valueOf方法即可：

```
//怎么才能输出true
var a = {
	n:1,
	valueOf:function(
		return this.n++
	)
}
console.log(
	a==1&
	a==2&
	a==3
)
```













##### getElementByClassname 和 querrySelectorAll

**第一个是动态的 如果之后这个类里面新增了元素 获得的数组里面的元素会新增 可能导致死循环**

**第二个是静态的**



##### 粘性定位

粘性定位：**当元素的位置达到某个临界值之后 就吸附在这个位置保持不变 显示隐藏依旧跟随父元素**

当一个元素设置成position:sticky 他的包含块是第一个设置了overflow属性的父级元素 如果没有这样的父级元素 那么就是视口 

这个临界的位置是使用top bottom left right实现的 





##### transform的顺序问题

transform：translate（100px,100px) rotate(120deg)和transform：translate（100px,100px) rotate(120deg)是不一样的 **并且这个属性的执行顺序是从右往左的**

这两个效果不同的核心**在于坐标原点**

而rotate translate 本质上就是**变换矩阵 进行这个变形就是矩阵相乘 而矩阵的乘法就是从右向左计算的。**









6. 





##### **为什么说过度依赖后代选择器（如 `.nav ul li a`）可能影响性能？如何优化？**

- 期望答案：**浏览器从右向左匹配选择器**，多层嵌套会增加匹配成本。优化：简化选择器（如直接使用 `.nav-link`）





##### **同步任务 异步任务的区别  宏任务 微任务有哪些**

宏任务：`setTimeout`、`setInterval`、DOM 事件回调、`requestAnimationFrame`,MessageChanel,I/O,script(整体代码块)

微任务：`Promise.then`、`MutationObserver`、`queueMicrotask` nextTick



##### rem

rem表示的是相对于根元素字体大小的一个单位 



​                                                                                    

##### 流式布局

流式布局的核心在于使用 `%，rem`这些单位来设置元素尺寸边框边距等，而不是使用固定单位px，这些单位会根据浏览器窗口和父元素来调整。但是也有其劣势，在相对初始设计过大或过小而言可能有误差，但是可以结合最小最大高宽来解决。





##### **高度塌陷**

当子元素浮动的时候 父元素的高度变成0

这是因为子元素脱离文档流 父元素不知道还有子元素 (文档流指的是网页的默认布局方式)

所以这里实际上是子元素和父元素不共用相同的布局方式 所以这个时候他们相互是不可见的       



通过 CSS 伪元素在父元素末尾添加一个清除浮动的占位：

```
.parent::after {
  content: "";
  display: block;
  clear: both; /* 清除左右两侧浮动的影响 */这个属性将会强制后续元素避开浮动元素（因为 因为浮动元素的设置是：其他元素会围绕浮动元素排列 设置1这个元素强制排列到浮动元素下方从而撑开空间）
}
```





让父元素形成块级格式化上下文（BFC），使其包含浮动子元素：

这个是因为父级元素成为块级格式化上下文之后 里面的浮动元素就不能影响她了 所以可以清除浮动 但是对于超出父元素的会被裁掉

flow-root也是创建块级格式化上下文 但是不会隐藏溢出内容

```
.parent {
  overflow: hidden; /* 或 auto、scroll */
  /* 或 display: flow-root;（现代方案，无副作用） */
}
```





在父元素末尾手动添加一个空元素并清除浮动：

html

复制

```
<div class="parent">
  <div class="child" style="float: left;"></div>
  <div style="clear: both;"></div>
</div>
避免使用 `float`，改用更可控的布局方式：
```





##### 隐藏元素的方法有哪些

- **display: none**：渲染树不会包含该渲染对象，因此该元素不会在页面中占据位置，也不会响应绑定的监听事件。
- **visibility: hidden**：元素在页面中仍占据空间，但是不会响应绑定的监听事件。
- **opacity: 0**：将元素的透明度设置为 0，以此来实现元素的隐藏。元素在页面中仍然占据空间，并且能够响应元素绑定的监听事件。
- **position: absolute**：通过使用绝对定位将元素移除可视区域内，以此来实现元素的隐藏。
- **z-index: 负值**：来使其他元素遮盖住该元素，以此来实现隐藏。
- **clip/clip-path** ：使用元素裁剪的方法来实现元素的隐藏，这种方法下，元素仍在页面中占据位置，但是不会响应绑定的监听事件。
- **transform: scale(0,0)**：将元素缩放为 0，来实现元素的隐藏。这种方法下，元素仍在页面中占据位置，但是不会响应绑定的监听事件。





##### 浏览器的历史模式



##### 22. CSS预处理器/后处理器是什么？为什么要使用它们？

**预处理器，** 如：`less`，`sass`，`stylus`，用来预编译`sass`或者`less`，**增加了`css`代码的复用性。层级，`mixin`， 变量，循环， 函数等对编写以及开发UI组件都极为方便。**

**后处理器，** 如： `postCss`，**通常是在完成的样式表中根据`css`规范处理`css`，让其更加有效。目前最常做的是给`css`属性添加浏览器私有前缀，实现跨浏览器兼容性的问题。**

`css`预处理器为`css`增加一些编程特性，无需考虑浏览器的兼容问题，可以在`CSS`





##### 27. 对媒体查询的理解？

**媒体查询由⼀个可选的媒体类型和零个或多个使⽤媒体功能的限制了样式表范围的表达式组成，**、、媒体查询，添加⾃CSS3，允许**内容的呈现针对⼀个特定范围的输出设备⽽进⾏裁剪，⽽不必改变内容本身，适合web⽹⻚应对不同型号的设备⽽做出对应的响应适配。**

```css
@media 媒体类型 and (媒体特性) {
    /* CSS样式规则 */
}
```

z-index属性在下列情况下会失效：

- 父元素position为relative时，子元素的z-index失效。解决：父元素position改为absolute或static；
- 元素没有设置position属性为非static属性。解决：设置该元素的position属性为relative，absolute或是fixed中的一种；
- 元素在设置z-index的同时还设置了float浮动。解决：float去除，改为display：inline-block；



##### 对BFC的理解，如何创建BFC

- Formatting context：它是⻚⾯中的⼀块渲染区域，并且有⼀套渲染规则，它决定了其⼦元素将如何定位，以及和其他元素的关系和相互作⽤。

块格式化上下文（Block Formatting Context，BFC是布局过程中生成块级盒子的区域，也是浮动元素与其他元素的交互限定区域。

通俗来讲：BFC是一个独立的布局环境，可以理解为一个容器，在这个容器中按照一定规则进行物品摆放，并且不会影响其它环境中的物品。**如果一个元素符合触发BFC的条件，则BFC中的元素布局不受外部影响。**

**创建BFC的条件：**

- **根元素**：body；
- 元素设置浮动：float 除 none 以外的值；
- 元素设置绝对定位：position (absolute、fixed)；
- display 值为：inline-block、table-cell、table-caption、flex等；
- **overflow** 值为：hidden、auto、scroll；

**BFC的特点：**

- 在**BFC中上下相邻的两个容器的margin会重叠**
- 计算BFC的高度时，**需要计算浮动元素的高度**
- BFC区域不会与浮动的容器发生重叠
- BFC是独立的容器，容器内部元素不会影响外部元素

**BFC的作用：**

- **解决margin的重叠问题**：由于BFC是一个独立的区域，内部的元素和外部的元素互不影响，将两个元素变为两个BFC，就解决了margin重叠的问题。
- **解决高度塌陷的问题**：在对子元素设置浮动后，父元素会发生高度塌陷，也就是父元素的高度变为0。解决这个问题，只需要把父元素变成一个BFC。常用的办法是给父元素设置`overflow:hidden`。
- **创建自适应两栏布局**：可以用来创建自适应两栏布局：左边的宽度固定，右边的宽度自适应。



### 7. **display、float、position的关系**

"position:absolute"和"position:fixed"优先级最高，有它存在的时候，浮动不起作用，'display'的值也需要调整；其次，元素的'float'特性的值不是"none"的时候或者它是根元素的时候，调整'display'的值；最后，非根元素，并且非浮动元素，并且非绝对定位的元素，'display'特性值同设置值。





##### 包含块 层叠上下文 格式化上下文

层叠上下文影响的是元素的堆叠顺序 但是层叠上下文可能间接影响包含块 

格式化上下文里面包含很多东西 比如定位上下文



##### 固定定位的相对元素一直是视口吗

当固定定位的组件元素设置了transform perspective filter属性的时候

这是因为这个属性会给元素创建层叠上下文 使得固定定位的元素的位置相对于这个层叠上下文来计算 

#### 层叠上下文

stacking context是css管理元素的堆叠顺序 渲染层次的机制 每个层叠上下文都有自己的堆叠顺序 

触发层叠上下文

1. 相对 绝对 固定定位 
2. 透明度小于1
3. 使用transform
4. 使用filter
5. isolation设置成isolate
6. contain设置成strict cintent
7. mix-blend-mode

- 层叠上下文的创建本质上是为了**隔离渲染层**，避免频繁的重排和重绘。
- 当元素触发层叠上下文（如 `transform`）时，浏览器会将其渲染到独立的图层（Composite Layer），固定定位元素在该图层内的位置计算会相对于该层叠上下文根。
- 这种机制既优化了性能（如 GPU 加速），也解释了为什么固定元素的包含块会动态变化。

层叠上下文可能有七个层叠等级

1. 背景 边框
2. zindex小于0
3. 普通流
4. 浮动流
5. inline（文字围绕浮动）
6. z-index=0
7. 大于0

#### flow and stacking context

flow描述的是元素在文档里面的布局方式 包括普通流 浮动流 定位流

而只有定位流可能会自动触发创建层叠上下文

不同的流 包含块的规则是不一样的 这就造成不同流的位置不一样

普通流 浮动流默认属于视窗的层叠上下文 

绝对 固定 创建新的层叠上下文

#### margin负值

margin-top -left为负值 影响元素自己 

margin-right -bottom 影响的是右边 下面的元素

### **BFC 与 Flow 的关系**

|   **特性**   |                **Flow**                 |                    **BFC**                    |
| :----------: | :-------------------------------------: | :-------------------------------------------: |
| **核心目的** |      控制元素的布局顺序和流动方向       | 控制块级元素的布局隔离和细节（如边距、浮动）  |
| **触发条件** | 默认行为（普通流）或 `float`/`position` | `display`、`float`、`position`、`overflow` 等 |
| **布局层级** |         元素在文档中的全局排列          |          块级元素内部的局部布局管理           |
| **位置确定** |          元素按 flow 规则排列           | BFC 规则修正 flow 的默认行为（如外边距折叠）  |

------

### 

- **Flow** 是元素布局的“大方向”（如普通流、浮动流、定位流），决定元素的基本排列顺序。

- **BFC** 是 Flow 的“精细化控制器”，通过隔离布局、处理边距和浮动，修正默认 flow 的行为。



#### 居中

行内：text-align line-height

块：flex grid table margin（设置成auto只能实现水平方向居中）

- 在**标准文档流**中，**水平方向**的 `margin`（`margin-left`/`margin-right`）可以自动填充父容器的剩余空间（前提是元素有明确宽度），这是 CSS 规范定义的行为。
- 但在不会自动计算剩余空间 而是会被解析0（除非触发特殊布局，如 Flex 或 Grid）。
  - 原因：垂直方向的布局依赖于文档流的自然流动（元素从上到下排列），浏览器默认不会为垂直方向分配 “剩余空间”，而是让元素根据内容高度或父容器高度自动填充。





##### DNS解析的过程

DNS解析就是指吧域名映射到ip地址 但是这个解析过程是非常耗费时间的 在第一次解析之后 解析的结果将会保存在本地 

对于页面的首次加载 DNS解析是不可避免的 但是随着项目变大 引入一些并不是当前域名下的资源 从而造成的DNS解析是可以优化的

我们可以让浏览器提前异步解析：使用rel属性为dns-prefetch的link元素 把要解析的域名写在herf属性里面 但是这样的做法很难维护

所以其实可以编写一个插件 扫描所有的文件 解析里面的域名 动态生成link标签  