export class MediaSourcePlayer {
  videoUrl
  blobUrl: string = ''
  start = 0
  chunkIndex = 0
  chunkSize = 1 * 1024 * 1024
  videoType = ''
  mediaSource
  sourceBuffer
  fileSize = 0
  isAllLoaded = false
  onError
  onEnd

  constructor(options) {
    const defaultType = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
    const {
      videoUrl,
      chunkSize = 1 * 1024 * 1024,
      type = defaultType,
      onError,
      onEnd,
      onUpdateEnd
    } = options
    this.videoUrl = videoUrl
    this.chunkSize = chunkSize
    this.videoType = type
    this.onError =
      onError ||
      ((err) => {
        console.log(err)
      })
    this.onEnd = onEnd || this.end
    this.onUpdateEnd = onUpdateEnd || this.onUpdateEnd
    this.init()
  }

  init() {
    this.mediaSource = new MediaSource()
    this.blobUrl = URL.createObjectURL(this.mediaSource)

    this.mediaSource.addEventListener('sourceopen', async () => {
      this.sourceBuffer = this.mediaSource.addSourceBuffer(this.videoType)

      this.sourceBuffer.addEventListener('updateend', () => {
        console.log('updateend', 'media-source-player.ts::46行')
        this.onUpdateEnd()
      })
      this.sourceBuffer.addEventListener('error', this.onError)
    })
  }

  run() {
    this.insertSourceByChunkIndex(this.chunkIndex)
  }

  end() {
    this.mediaSource.endOfStream()
  }

  async onUpdateEnd() {
    if (this.isAllLoaded) {
      return this.onEnd()
    }
    await this.insertNextSlice()
  }

  async insertNextSlice() {
    if (this.isAllLoaded) {
      return this.onEnd()
    }
    this.chunkIndex++
    await this.insertSourceByChunkIndex(this.chunkIndex)
  }

  // 根据chunkSize获取开始和结束位置,从0开始
  getRangByChunkIndex(index) {
    console.log('加载资源索引://///', index, 'index.html::128行')
    return [index * this.chunkSize, (index + 1) * this.chunkSize - 1]
  }

  // 插入
  async insertSourceByChunkIndex(chunkIndex) {
    const [start, end] = this.getRangByChunkIndex(chunkIndex)
    const data = await this.fetchSliceData(start, end)
    this.appendBuffer(data)
  }

  // 插入切片播放内容
  async loadAndInsertSlicePlaySource(start, end) {
    const buffer = await this.fetchSliceData(start, end)
    this.appendBuffer(buffer)
  }

  async fetchSliceData(start, end) {
    if (this.isAllLoaded) return
    let response
    let contentLength
    if (typeof this.videoUrl === 'string') {
      response = await fetch(this.videoUrl, {
        headers: { Range: `bytes=${start}-${end}` }
      })
      contentLength = response.headers.get('Content-Length')
    } else if (typeof this.videoUrl === 'function') {
      response = await this.videoUrl({
        headers: { Range: `bytes=${start}-${end}` }
      })
      contentLength = response.headers['content-length']
    }
    if (!contentLength || +contentLength < this.chunkSize) {
      this.isAllLoaded = true
    }
    const data = response.data || (await response.arrayBuffer())
    return data
  }

  appendBuffer(data) {
    this.sourceBuffer.appendBuffer(data)
  }
}
