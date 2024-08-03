<script setup lang="ts">
// import Versions from './components/Versions.vue'

// const ipcHandle = () => window.electron.ipcRenderer.send('ping')

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
  videoPlayer.addEventListener('seeking', () => {
    const range = `bytes=${videoPlayer.currentTime}-`
    fetch(`${videoUrl}?range=${range}`, {
      method: 'GET',
      headers: {
        'X-Custom-Token': token,
        'X-Custom-Other-Param': otherParam,
        Range: range
      }
    })
      .then((response) => response.blob())
      .then((blob) => {
        const videoURL = URL.createObjectURL(blob)
        videoPlayer.src = videoURL
      })
      .catch((error) => console.error('There was a problem with the fetch operation:', error))
  })

  videoPlayer.oncanplay = () => {
    videoPlayer.play()
  }
}
</script>

<template>
  <video id="video-player" class="video" controls></video>
  <div>
    <button @click="sendHttpsRequest">发起https请求</button>
    <!-- <button @click="sendVideoRequest">发起视频请求</button> -->
    <button @click="playVideo('009')">播放临时地址播放视频</button>
    <button @click="playVideo('011')">播放临时地址播放视频2</button>

    <button @click="playVideoByAuth('009')">自定义fetch带参数播放视频</button>
    <!-- <video id="video-player" class="video" src="http://localhost:8081/video" controls></video> -->
  </div>
</template>
<style lang="scss" scoped>
.video {
  width: 500px;
  height: 300px;
}
</style>
