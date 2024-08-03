<script setup lang="ts">
// import Versions from './components/Versions.vue'

// const ipcHandle = () => window.electron.ipcRenderer.send('ping')

async function sendRequest() {
  try {
    // @ts-ignore (define in dts)
    const data = await window.api.https('https://localhost:8080')
    // const data = await window.api.get('https://localhost:8080')
    console.log(data, 'App.vue::9行')
  } catch (error) {
    console.log(error, 'App.vue::10行')
  }
}

// 发送视频请求
async function sendVideoRequest() {
  // @ts-ignore (define in dts)
  const data = await window.api.get('https://localhost:8080/video')
  // console.log(data, 'App.vue::20行')
  if (data) {
    console.log(11, 'App.vue::22行')
  }
}

// 播放视频
async function playVideo() {
  const videoElement = document.getElementById('video-player') as HTMLVideoElement
  const mediaSource = new MediaSource()
  videoElement.src = URL.createObjectURL(mediaSource)

  mediaSource.addEventListener('sourceopen', async () => {
    // const sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.64001E, mp4a.40.2"')

    // const options = {
    //   hostname: 'localhost',
    //   port: 8080,
    //   path: '/video',
    //   method: 'GET',
    //   key: fs.readFileSync('path/to/client-key.pem'),
    //   cert: fs.readFileSync('path/to/client-cert.pem'),
    //   ca: fs.readFileSync('path/to/ca-cert.pem'),
    //   rejectUnauthorized: false, // 如果使用自签名证书
    //   headers: {
    //     Range: 'bytes=0-'
    //   }
    // }

    // const req = https.request(options, (res) => {
    //   if (res.statusCode !== 206) {
    //     console.error(`Request failed with status code: ${res.statusCode}`)
    //     return
    //   }

    //   res.on('data', (chunk) => {
    //     sourceBuffer.appendBuffer(new Uint8Array(chunk))
    //   })

    //   res.on('end', () => {
    //     mediaSource.endOfStream()
    //     videoElement.play()
    //   })
    // })

    // req.on('error', (e) => {
    //   console.error(`Problem with request: ${e.message}`)
    // })

    // req.end()
  })
}
</script>

<template>
  <button @click="sendRequest">发起普通请求</button>
  <!-- <button @click="sendVideoRequest">发起视频请求</button> -->
  <!-- <button @click="playVideo">播放视频</button> -->
  <video id="video-player" class="video" src="http://localhost:8081/video" controls></video>
</template>
<style lang="scss" scoped>
.video {
  width: 500px;
  height: 300px;
}
</style>
