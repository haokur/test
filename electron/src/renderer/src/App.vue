<script setup lang="ts">
// import Versions from './components/Versions.vue'

// const ipcHandle = () => window.electron.ipcRenderer.send('ping')

async function sendRequest() {
  try {
    // @ts-ignore
    const data = await window.api.get('https://localhost:8080')
    console.log(data, 'App.vue::9行')
  } catch (error) {
    console.log(error, 'App.vue::10行')
  }
}
</script>

<template>
  <button @click="sendRequest">发起请求</button>
</template>
