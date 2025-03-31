const VideoDownloader = require('./src/server/ytdlp-wrapper')

async function testDownload() {
  try {
    const downloader = new VideoDownloader()
    await downloader.downloadEpisode(
      'https://www3.nhk.or.jp/nhkworld/en/shows/2007549/'
    )
    console.log('Download completed!')
  } catch (error) {
    console.error('Download failed:', error)
  }
}

testDownload()
