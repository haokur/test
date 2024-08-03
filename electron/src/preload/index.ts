import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import https from 'https'
import fs from 'fs'
import path from 'path'
import axios from 'axios'

const caCert = fs.readFileSync(path.join(process.cwd(), '../ssl/ca.crt'))
const clientCert = fs.readFileSync(path.join(process.cwd(), '../ssl/client.crt'))
const clientKey = fs.readFileSync(path.join(process.cwd(), '../ssl/client.key'))

const agent = new https.Agent({
  ca: caCert,
  cert: clientCert,
  key: clientKey,
  rejectUnauthorized: true
})

// console.log(agent,"index.ts::20行");

const api = {
  get: async (url) => {
    // console.log(url, 'index.ts::24行')
    const response = await ipcRenderer.invoke('call-main-method', { url })
    // console.log(response)
    return response
    // try {
    //   // console.log(agent, 'index.ts::28行')
    //   // const response = await axios.get(url, { httpsAgent: agent })
    //   const response = await axios.get(url)
    //   return response.data
    // } catch (error) {
    //   console.error('HTTPS request failed', error)
    //   throw error
    // }
  },
  https: async (url) => {
    const response = await axios.get(url, { httpsAgent: agent })
    return response
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
