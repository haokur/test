<script setup lang="ts">
// import  from './classes/media-source-player.ts'
// import Versions from './components/Versions.vue'

// const ipcHandle = () => window.electron.ipcRenderer.send('ping')
import { MediaSourcePlayer } from './classes/media-source-player'

const playMediaSourceVideo = () => {
  const sliceMediaSourcePlayer = new MediaSourcePlayer({
    // videoUrl: 'http://localhost:9000/video',
    // videoUrl: 'https://localhost:9000/video',
    videoUrl: async (config) => {
      // @ts-ignore (define in dts)
      const res = await window.api.https({
        hostname: 'localhost', // 注意这里，前面不要加https
        port: 9099, // 默认 HTTPS 端口
        path: '/video', // 请求路径
        method: 'GET', // 请求方法
        // url: 'https://localhost:9000/video',
        headers: config.headers
      })
      return res
    },
    async onUpdateEnd() {
      console.log('自定义单分片加载完毕回调')
      // 加载下一个分片
      await sliceMediaSourcePlayer.insertNextSlice()
    },
    async onEnd() {
      console.log('所有分片加载完毕回调')
      await sliceMediaSourcePlayer.end()
    }
  })
  const video = document.getElementById('video-player') as HTMLVideoElement
  video.src = sliceMediaSourcePlayer.blobUrl
  sliceMediaSourcePlayer.run()
}

async function sendHttpsRequest() {
  try {
    // @ts-ignore (define in dts)
    const data = await window.api.request({
      method: 'GET',
      url: 'https://localhost:8080'
    })
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

// 使用https获取播放地址，播放视频
async function playVideo(videoFlag) {
  const videoElement = document.getElementById('video-player') as HTMLVideoElement
  // @ts-ignore (define in dts)
  const res = await window.api.request({
    url: 'https://localhost:8080/video-url',
    method: 'POST',
    data: { mediaUrl: `output_${videoFlag}.mp4` },
    headers: {
      'Content-Type': 'application/json'
    }
  })
  console.log(res.data.videoKey, 'App.vue::32行')
  videoElement.src = `http://localhost:8081/video?videoKey=${res.data.videoKey}`
  videoElement.oncanplay = () => {
    videoElement.play()
  }
}

// 使用token和AES加密，鉴权播放
async function playVideoByAuth(videoFlag) {
  const videoPlayer = document.getElementById('video-player') as HTMLVideoElement
  const token = 'yourToken'
  const otherParam = 'value'
  const videoUrl = `http://localhost:8081/video-with-auth?videoKey=output_${videoFlag}.mp4`
  fetch(videoUrl, {
    method: 'GET',
    headers: {
      'X-Custom-Token': token,
      'X-Custom-Other-Param': otherParam
    }
  })
    .then((response) => {
      if (response.ok) {
        return response.blob()
      }
      throw new Error('Network response was not ok.')
    })
    .then((blob) => {
      const videoURL = URL.createObjectURL(blob)
      videoPlayer.src = videoURL
    })
    .catch((error) => console.error('There was a problem with the fetch operation:', error))

  // Optionally, handle subsequent range requests for full playback
  // videoPlayer.addEventListener('seeking', () => {
  //   const range = `bytes=${videoPlayer.currentTime}-`
  //   fetch(`${videoUrl}?range=${range}`, {
  //     method: 'GET',
  //     headers: {
  //       'X-Custom-Token': token,
  //       'X-Custom-Other-Param': otherParam,
  //       Range: range
  //     }
  //   })
  //     .then((response) => response.blob())
  //     .then((blob) => {
  //       const videoURL = URL.createObjectURL(blob)
  //       videoPlayer.src = videoURL
  //     })
  //     .catch((error) => console.error('There was a problem with the fetch operation:', error))
  // })

  videoPlayer.oncanplay = () => {
    videoPlayer.play()
  }
}

async function aesCheck() {
  // @ts-ignore (define in dts)
  const res = await window.api.aesRequest({
    url: 'http://localhost:8081/check-sign',
    method: 'POST',
    data: { name: 'haokur' },
    headers: {
      uid: '89757',
      'Content-Type': 'application/json'
    }
  })
  console.log(res, 'App.vue::108行')
}

async function getSign(data) {
  // @ts-ignore (define in dts)
  const encryptStr = await window.api.encrypt({
    ...data,
    timeStamp: Date.now() + ''
  })
  return encryptStr
}

async function aesVideoPlay(videoFlag) {
  const videoPlayer = document.getElementById('video-player') as HTMLVideoElement
  const videoUrl = `http://localhost:8081/video-with-aes?t=${Date.now()}`
  const videoName = videoFlag
  // const videoName = `input.mp4`
  const sign = await getSign({
    uid: '89757',
    videoKey: videoName
  })
  fetch(videoUrl, {
    method: 'GET',
    headers: { sign, uid: '89757' }
  })
    .then((response) => {
      if (response.ok) {
        return response.blob()
      }
      throw new Error('Network response was not ok.')
    })
    .then((blob) => {
      const videoURL = URL.createObjectURL(blob)
      videoPlayer.src = videoURL
    })
    .catch((error) => console.error('There was a problem with the fetch operation:', error))

  // 不需要手动控制，video标签已处理
  // videoPlayer.addEventListener('seeking', async () => {
  //   const sign = await getSign({
  //     uid: '89757',
  //     videoKey: videoName
  //   })
  //   // const range = `bytes=${videoPlayer.currentTime}-`
  //   fetch(`${videoUrl}?t=${Date.now()}`, {
  //     method: 'GET',
  //     headers: {
  //       sign,
  //       uid: '89757'
  //       // Range: range
  //     }
  //   })
  //     .then((response) => response.blob())
  //     .then((blob) => {
  //       const videoURL = URL.createObjectURL(blob)
  //       videoPlayer.src = videoURL
  //     })
  //     .catch((error) => console.error('There was a problem with the fetch operation:', error))
  // })

  videoPlayer.oncanplay = () => {
    videoPlayer.play()
  }
}
</script>

<template>
  <video id="video-player" class="video" controls></video>
  <div>
    <button @click="playMediaSourceVideo">Media Source的方式播放视频</button>
  </div>
  <div>
    <div>
      <button @click="sendHttpsRequest">主进程发起https请求</button>
    </div>
    <!-- <button @click="sendVideoRequest">发起视频请求</button> -->
    <div>
      <button @click="playVideo('009')">主进程https获取临时播放地址播放</button>
      <button @click="playVideo('011')">主进程https获取临时播放地址播放2</button>
    </div>

    <!-- <button @click="playVideoByAuth('009')">自定义fetch带参数播放视频</button>
    <button @click="aesCheck">AES加密验证请求测试</button> -->
    <div>
      <button @click="aesVideoPlay('output_009.mp4')">AES加密验证视频请求</button>
      <button @click="aesVideoPlay('output_011.mp4')">AES加密验证视频请求2</button>
      <!-- <button @click="aesVideoPlay('input.mp4')">AES加密验证视频请求</button> -->
    </div>

    <!-- <video id="video-player" class="video" src="http://localhost:8081/video" controls></video> -->
  </div>
</template>
<style lang="scss" scoped>
.video {
  width: 500px;
  height: 300px;
}
button {
  margin-right: 10px;
  margin-bottom: 10px;
}
</style>
