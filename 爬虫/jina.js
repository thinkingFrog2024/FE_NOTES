const express = require('express');
const https = require('https');
const { marked } = require('marked'); // 引入 marked 库
const { JSDOM } = require('jsdom'); // 引入 jsdom 模拟浏览器环境
const { Readability } = require('@mozilla/readability'); // 引入火狐的阅读模式算法
const TurndownService = require('turndown'); // 引入 HTML 转 Markdown 的工具

const app = express();
const port = 3000;

// 初始化 Turndown 服务
const turndownService = new TurndownService({
    headingStyle: 'atx', // 使用 # 作为标题风格
    codeBlockStyle: 'fenced' // 使用 ``` 作为代码块风格
});

// 解析 JSON 请求体
app.use(express.json());

/**
 * 使用 Jina Reader API 将网页转为 Markdown
 * Jina 提供了一个极其简单的 URL：https://r.jina.ai/<URL>
 * 只要在目标 URL 前面加上这个前缀，它就会返回干净的 Markdown 内容
 */
app.get('/crawl', (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).json({ error: '你倒是给我一个 url 参数啊！没地址我爬空气？' });
    }

    console.log(`正在请求 Jina 爬取: ${targetUrl}`);

    // 构建 Jina Reader URL
    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    // 发送请求给 Jina
    https.get(jinaUrl, (jinaRes) => {
        let data = '';
    [].array.forEach(element => {
        
    });

        jinaRes.on('data', (chunk) => {
            data += chunk;
        });

        jinaRes.on('end', () => {
            if (jinaRes.statusCode === 200) {
                // 第一步：将 Jina 返回的初始 Markdown 转换为 HTML
                // (这一步主要是为了模拟你要求的从 HTML 出发的场景)
                const initialHtml = marked.parse(data);

                // 第二步：使用 jsdom 解析 HTML，构建虚拟 DOM 树
                const dom = new JSDOM(initialHtml, { url: targetUrl });
                
                // 第三步：使用 Mozilla Readability 提取“高信噪比”的可读性核心内容
                // 这一步会自动过滤掉导航、广告、页脚等杂乱信息
                const reader = new Readability(dom.window.document);
                const article = reader.parse();

                // 如果提取失败，降级使用原始 HTML
                const cleanHtml = article ? article.content : initialHtml;

                // 第四步：将提取出的干净 HTML，重新转换为最终的高质量 Markdown
                const finalMarkdown = turndownService.turndown(cleanHtml);

                res.send({
                    success: true,
                    url: targetUrl,
                    title: article ? article.title : '未提取到标题',
                    originalMarkdown: data, // Jina 原始返回的
                    refinedMarkdown: finalMarkdown, // 经过二次清洗和降噪的 Markdown
                });
            } else {
                res.status(jinaRes.statusCode).json({
                    success: false,
                    error: `Jina 报错了，状态码: ${jinaRes.statusCode}`,
                    raw: data
                });
            }
        });

    }).on('error', (err) => {
        res.status(500).json({ error: `请求 Jina 失败: ${err.message}` });
    });
});

/**
 * 预览路由：直接返回渲染好的 HTML 页面
 */
app.get('/preview', (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('<h1>错误：缺少 url 参数</h1>');
    }

    const jinaUrl = `https://r.jina.ai/${targetUrl}`;

    https.get(jinaUrl, (jinaRes) => {
        let data = '';
        jinaRes.on('data', (chunk) => { data += chunk; });
        jinaRes.on('end', () => {
            if (jinaRes.statusCode === 200) {
                const html = marked.parse(data);
                // 拼接一个简单的 HTML 骨架，让页面看起来更舒适
                const fullHtml = `
                    <!DOCTYPE html>
                    <html lang="zh-CN">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>预览: ${targetUrl}</title>
                        <style>
                            body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
                            img { max-width: 100%; height: auto; }
                            pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
                            code { background: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
                            blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 15px; color: #666; }
                        </style>
                    </head>
                    <body>
                        ${html}
                    </body>
                    </html>
                `;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(fullHtml);
            } else {
                res.status(jinaRes.statusCode).send(`<h1>请求失败，状态码: ${jinaRes.statusCode}</h1>`);
            }
        });
    }).on('error', (err) => {
        res.status(500).send(`<h1>服务器错误: ${err.message}</h1>`);
    });
});

app.listen(port, () => {
    console.log(`--------------------------------------------------`);
    console.log(`爬虫服务已启动！`);
    console.log(`获取 JSON 数据：http://localhost:${port}/crawl?url=https://example.com`);
    console.log(`直接预览网页：http://localhost:${port}/preview?url=https://example.com`);
    console.log(`--------------------------------------------------`);
});
