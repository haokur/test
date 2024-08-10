const Koa = require('koa');

const KoaStatic = require("koa-static")
const cors = require('@koa/cors');
const KoaRoute = require('@koa/router')

const https = require('https');
const fs = require('fs');
const path = require('path');

// 创建 Koa 应用实例
const app = new Koa();
const router = new KoaRoute();

// SSL 证书配置
const sslOptions = {
    key: fs.readFileSync(path.resolve(__dirname, '../ssl/server.key')),
    cert: fs.readFileSync(path.resolve(__dirname, '../ssl/server.crt')),
    ca: fs.readFileSync(path.resolve(__dirname, '../ssl/ca.crt'))
};

// 跨域配置
app.use(cors({
    origin: '*',  // 允许来自所有来源的请求，如果需要限制来源可以指定特定域名
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],  // 允许的HTTP方法
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],  // 允许的HTTP头
    credentials: true  // 是否允许发送Cookie
}));

// 静态资源服务
app.use(KoaStatic(path.resolve(__dirname, '../assets')));

router.get("/", async (ctx) => {
    ctx.body = "hello index"
})
router.get("/video", async (ctx) => {
    const mp4FileName = ctx.query.videoFileName || "frag_bunny.mp4"
    const videoPath = path.join(__dirname, `../assets/${mp4FileName}`);
    if (!fs.existsSync(videoPath)) {
        ctx.status = 500
        return
    }
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = ctx.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        let end = parts[1] ? parseInt(parts[1], 10) : fileSize;
        end = Math.min(end, fileSize - 1)
        const chunkSize = (end - start) + 1;

        if (start < -1 || start >= fileSize) {
            ctx.set({
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': 'video/mp4',
                'Vary': "Origin",
                'Cache-Control': 'public, max-age=0',
                'Last-Modified': stat.mtime.toUTCString(),
                'ETag': `W/"${stat.size.toString(16)}-${stat.mtime.getTime().toString(16)}"`
            });
            ctx.status = 200
            return
        }

        console.log(start, end, 'xxxxxxxxxxxx')
        const file = fs.createReadStream(videoPath, { start, end });
        ctx.status = 206;
        ctx.set({
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4',
            'Vary': "Origin",
            'Cache-Control': 'public, max-age=0',
            'Last-Modified': stat.mtime.toUTCString(),
            'ETag': `W/"${stat.size.toString(16)}-${stat.mtime.getTime().toString(16)}"`
        });

        ctx.body = file;
    } else {
        ctx.set('Content-Length', fileSize);
        ctx.set('Content-Type', 'video/mp4');
        ctx.body = fs.createReadStream(videoPath);
    }
})

// 将路由注册到应用中
app.use(router.routes()).use(router.allowedMethods());

// HTTPS 服务器
https.createServer(sslOptions, app.callback()).listen(9099, () => {
    console.log('Koa server is running on https://localhost:9099');
});
