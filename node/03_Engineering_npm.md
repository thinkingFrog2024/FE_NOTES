#### npm install 原理

采用扁平化的方式安装依赖 

使用广度优先算法遍历 在遍历依赖树时 首先处理根目录下的依赖 然后逐层处理每个依赖包的依赖 直到所有依赖处理完毕 处理依赖时 npm会检查该依赖的版本和依赖树里其他的依赖是否冲突

**广度优先算法**

它从一个节点开始，逐层遍历节点，直到找到目标节点或遍历完所有节点为止。BFS通常用于在最短路径问题中找到从源节点到目标节点的最短路径。

**深度优先算法**

它从一个节点开始，尽可能深地搜索树的分支，当节点v的所在边都已被探寻过，搜索将回溯到发现节点v的那条边的起始节点，继续探寻尚未探寻过的分支。

**完全扁平化？**

如果根目录下的A B 依赖均依赖于C 那么C会被提到跟AB同一层级 

但是当AB依赖的C的版本不同时 就不能进行扁平化处理了 所以还是会出现模块冗余

**下载流程**

执行命令之后 会依次检查项目级（项目目录中） 用户级（存放在c盘中） 全局级（c/appdata/npm） npm内置nodejs/modules/npm)的.npmrc配置文件（其实就是npm config的配置）

### <img src="https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0570bf4581f74a9790bb86567b889e68~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp?" alt="image.png" style="zoom:150%;" />



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

#### npm run 原理

**命令从哪里来？**

读取package json 的scripts 对应的脚本命令(dev:vite),vite是个可执行脚本，他的查找规则是：

在node_modules下的.bin（所有的可执行命令）文件里（此处以vite举例）

安装的时候会自动往.bin里注入文件

vite.sh(unix macOS linux) vite.cmd(cmd命令行) vite.ps1（powerSheel命令行）

执行之后会先查找有没有node-modules/.bin 如果没有 就回去全局的node-modules（npm config 中的prefix） 还是没有就去环境变量里找

找不到会报错





为什么全局命令可以直接运行？

因为会自动配置环境变量 我的电脑>高级系统设置>环境变量





node的生命周期：

在scripts中配置命令mmm时 可以配置premmm 那么在mmm执行之前会执行premmm postmmm同理

------

#### npx

**npx与npm**

npx侧重于执行命令 执行某个模块命令 

npm侧重于安装 卸载模块 



**npx特点**

1. 避免了全局安装（如果找不到这个包npx会下载最新版使用后删除）
2. npx能够执行任何模块命令
3. 如果包不存在 npx会自动安装

使用npm执行命令时 如果需要执行某个模块命令 必须要在scripts里配置 npx可以直接执行 查看全局安装的可执行文件 npm ls -g



# 模块化



