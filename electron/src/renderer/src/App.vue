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
</script>

<template>
  <video id="video-player" class="video" controls></video>
  <div>
    <button @click="sendHttpsRequest">发起https请求</button>
    <!-- <button @click="sendVideoRequest">发起视频请求</button> -->
    <button @click="playVideo('009')">播放视频</button>
    <button @click="playVideo('011')">播放视频2</button>
    <!-- <video id="video-player" class="video" src="http://localhost:8081/video" controls></video> -->
  </div>
</template>
<style lang="scss" scoped>
.video {
  width: 500px;
  height: 300px;
}
</style>
