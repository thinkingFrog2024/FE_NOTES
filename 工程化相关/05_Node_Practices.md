# 目录

- [反向代理](#反向代理)
- [动静分离](#动静分离)
- [邮件服务](#邮件服务)
- [定时任务](#定时任务)
- [net 模块](#net模块)
- [socket.io](#socketio)
- [Http2](#http2)
- [爬虫 (puppeteer)](#爬虫)
- [短链接](#短链接)
- [前端网络安全](#前端网络安全)
  - [canvas指纹追踪技术](#canvas指纹追踪技术)

---

# 杂七杂八技术篇





# 反向代理

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

# 动静分离

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

# 邮件服务

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





# 定时任务

通过node-schedule实现

1. corn表达式：在定时任务里用于表示时间间隔 例如5s '5/* * * * * *'表示每月每星期 每天 每小时 每份 每五秒 每天半夜十二点三十分： '* 0 30 0 * * *'



### 



# net模块

net模块会打开一个tcp通道 在传输层进行操作

tcp支持双方同时进行双向通讯 

服务端之间的通讯可以直接通过tcp 不需要上升到http层



# socket.io

可以给div加contenteditable属性



# Http2

1. 多路复用 ：Http2支持在单个TCP连接上同时发送多个请求 响应 **可以避免建立多个连接 减少网络延迟 提高效率** 就是http1.1会在每次进行响应的时候进行三次四次 但是http2可以在一次三次四次内响应多个
2. 二进制分帧层：由于这个层的存在 报文会从明文传输 变成最小单位帧 使用二进制表示 更高效 安全
3. 头部压缩:感觉就是请求头可以复用 听也听不懂 就是更快嘛

**使用nodejs实现HTTP2**

因为还没有浏览器支持http请求访问http2 所以要用https 使用openssl生成tls证书

```javascript
import http2 from 'http2'
import fs from 'fs'

const server = http2.createSecureServer({
    key:fs.readFileSync(...)
    cert:fs.readFileSync(...)//安全证书文件
})

server.on('stream',(stream,hearders)=>{
    
    stream.respand({
        'content-type':'text/plain;charset=utf-8',
        ':status':200//http2有些响应头前面需要加冒号
    })
    
    //给前端返回数据
    stream.end('1')
})

server.listen(9999,()=>{
    console.log('1')
})
```







# 爬虫

使用puppeteer

**puppeteer**

1. 自动化浏览器操作
2. 截图生成pdf
3. 爬虫 数据抓取
4. 网页性能分析
5. 无头模式(后台运行浏览器) 调试模式 



# 短链接 

缩短长网址的一种方法 链接分享可以用 访问这个端网址时会重定向带一个长链接















# 前端网络安全

##### canvas指纹追踪技术

使用canvas在调用toDataURL转base64的时候 他的底层会获取设备 操作系统 浏览器 三合一的唯一标识 你；