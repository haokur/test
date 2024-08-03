import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import https from 'https'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import crypto from 'crypto'

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

// 加密函数
function encrypt(text, key, iv) {
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv)
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  return encrypted.toString('hex')
}

// 解密函数
function decrypt(text, key, iv) {
  const encryptedText = Buffer.from(text, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv)
  let decrypted = decipher.update(encryptedText)
  decrypted = Buffer.concat([decrypted, decipher.final()])
  return decrypted.toString()
}

const api = {
  request: async (config) => {
    let response = await ipcRenderer.invoke('https-request', JSON.stringify(config))
    try {
      response = JSON.parse(response)
    } catch (error) {
      console.log(error, 'index.ts::28行')
    }
    return response
  },
  aesRequest: async (config) => {
    const AESIv = '5505035036622383'
    const AESKey = await ipcRenderer.invoke('get-aes-key')
    config.data = { data: encrypt(JSON.stringify(config.data), AESKey, AESIv) }
    console.log(config, AESKey, 'index.ts::34行')
    const response = await axios(config)
    try {
      console.log(response.data, 'index.ts::57行')
      if (response.data && response.data.data) {
        response.data.data = decrypt(response.data.data, AESKey, AESIv)
      }
    } catch (error) {
      console.log(error, 'index.ts::59行')
    }
    return response
  },
  encrypt: async (data) => {
    const AESIv = '5505035036622383'
    const AESKey = await ipcRenderer.invoke('get-aes-key')
    let encryptSource = data
    if (typeof data === 'object') {
      encryptSource = JSON.stringify(data)
    }
    return encrypt(encryptSource, AESKey, AESIv)
  },
  decrypt: async (str) => {
    const AESIv = '5505035036622383'
    const AESKey = await ipcRenderer.invoke('get-aes-key')
    return decrypt(str, AESKey, AESIv)
  },
  // get: async (url) => {
  //   // console.log(url, 'index.ts::24行')
  //   const response = await ipcRenderer.invoke('call-main-method', { url })
  //   // console.log(response)
  //   return response
  //   // try {
  //   //   // console.log(agent, 'index.ts::28行')
  //   //   // const response = await axios.get(url, { httpsAgent: agent })
  //   //   const response = await axios.get(url)
  //   //   return response.data
  //   // } catch (error) {
  //   //   console.error('HTTPS request failed', error)
  //   //   throw error
  //   // }
  // },
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
