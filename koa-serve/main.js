const Koa = require("koa")
const path = require("path")
const KoaStatic = require("koa-static")
const cors = require('@koa/cors');
const KoaRoute = require('@koa/router')
const fs = require('fs')

const app = new Koa()
const router = new KoaRoute()

// app.use(async (ctx, next) => {
//     // const origin = ctx.get('Origin');
//     ctx.set('Access-Control-Allow-Origin', "*");
//     ctx.set('Access-Control-Allow-Credentials', 'true');
//     ctx.set('Access-Control-Allow-Headers', AllowHeaders.join(',')); // 允许的自定义头部字段
//     ctx.set('Access-Control-Allow-Methods', AllowMethods.join(',')); // 允许的 HTTP 方法
//     if (ctx.method === 'OPTIONS') {
//         ctx.status = 200;
//     } else {
//         next();
//     }
//     next()
// })
// 配置 CORS 允许跨域请求
app.use(cors({
    origin: '*', // 允许所有域名访问，建议根据需要配置为特定的域名
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true, // 如果需要允许携带凭据（如 Cookie），则设置为 true
    secureContext: false,
}));

app.use(KoaStatic(path.resolve(__dirname, '../assets')))

// app.use(async (ctx) => {
//     ctx.body = "hello world"
// })
router.get("/", async (ctx) => {
    ctx.body = "hello index"
})
router.get("/video", async (ctx) => {
    console.log(ctx.query, "main.js::41行");
    const mp4FileName = ctx.query.videoFileName
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

app.use(router.routes())
    .use(router.allowedMethods());

app.listen(9090, () => {
    console.log("server run http://localhost:9090");
})