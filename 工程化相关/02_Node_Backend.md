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



## PM2

node进程管理工具

可以在使用pm2 文件名  开启服务

pm2 log 查看控制台

pm2  list 查看表格

pm2 stop id 停止服务

PM2.5 restart id 重启服务

pm2 delete id

 pm2 start 文件名 --watch 监听模式 文件修改自动重启





## Express

基于http模块创建的框架 

日志系统 `log4js`

```javascript
import express from 'express'
const app = express()
app.use(express.json())//支持post解析json
app.get('/get',(req,res)=>{
    ....
})
//动态参数
app.get('/get/:id',(req,res)=>{
    ...
})
//接收参数
//get： req.query/api?a=1 req.params /api/006
//post:  req.body 
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
app.use('/user'(这个是前缀),User)

//请求时需要加上前缀防止重名
POST http://localhost:3000/user/login
```

中间件编写

每一个请求都会经过中间件

```javascript
import log4js from 'log4js'
//控制台输出 文件
log4js.configure({
    appenders:{
       out:{
           type:'stdout'
           layout:[
           type:'colored'
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
          }         
     }
})
const LoggerMiddleware = (req,res,next(是否执行下一个中间件))=>{
    
}
export default LoggerMiddleware
```

防盗链

```javascript
const app = express()

const whiteList = ['localhost']

const prevent = (req,res,next)=>{
    const refer = req.get('referer')//直接获取是获取不到的 必须网络请求
    if(referer){
        const {host} = new URL(referer)
        if(whiteList.includes(host)){
            next()
        }else{
            res.ststus(403).send('禁止')
            return
        }
    }
}

//初始化静态资源
app.use(express.ststic('ststic'))
app.listen(3000,()=>console.log('server started'))
```

响应头 请求头

使用中间件解决跨域

```javascript
app.use('*',(req,ews,next)=>{
    //也可以设置ip 网址 比如http：//localHost：5000 设置*读取不到session
    res.setHeader('Access-Control-Allow-Origin',"*")
    //默认值支持get post head请求
    res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE')
    //contentType默认只支持 aplication/x-www-form-urlencoded(name=1&age=2)  multipart/form-data(formdata 上传文件)  text/plain(纯文本)
    //支持json
    res.setHeader('Access-Control-Allow-Headers','Content-Type')
})

app.get('/info',(req,res)=>{
    res.set('xm',123)//自定义响应头
    res.setHeader('Access-Control-Expose-Headers','xmzs')//抛出响应头 否则前端接收不到
})

//sse 单工通讯
app.get('/sse',(req,res)=>{
    res.setHeader('Content-Type','text/event-stream')
    res.write('data:'+Date.now()+'\n\n')
    res.write('event:test\n')//默认是message 这样就可以监视test
})
```

浏览器发起的预检请求

1. Content-type设置为aplication/json
2. 自定义请求头
3. 非普通请求 比如patch put delete









#### 全局软件包nodemon

本地软件包：当前项目内使用 封装属性和方法

全局软件包：本机所有项目使用 封装命令 工具 

nodemon：代替node 检测代码更改 自动重启程序





















## 



