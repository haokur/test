import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

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

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  // https请求接口
  ipcMain.handle('https-request', async (_, config) => {
    console.log(config, 'index.ts::70行')
    try {
      config = JSON.parse(config)
    } catch (error) {
      console.log(error, 'index.ts::73行')
    }
    const response = await axios({
      ...config,
      httpsAgent: agent
    })
    return JSON.stringify(response.data)
    // const { url, method, data } = config
    // const res = await makeRequest()
    // const response = await axios.get(url, { httpsAgent: agent })
    // return response
    // const result = await sendHttpsRequest(url)
    // // console.log(result.data, 'index.ts::72行')
    // return result.data
  })
  // setTimeout(() => {
  //   sendHttpsRequest('https://localhost:8080')
  // }, 3000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
