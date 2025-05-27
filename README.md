# NHK Show Downloader

A simple tool to download shows from NHK World Japan. The tool includes all necessary dependencies, including the yt-dlp binary.

## Setup

```bash
npm install
```

## Usage

```bash
./nhk-download.js {path to show homepage} 
```
e.g. 
```bash
./nhk-download.js https://www3.nhk.or.jp/nhkworld/en/shows/journeys/
```

Or configure shows in `config/shows.json` and run:

```bash
./nhk-download.js
```

## Features

- Scrapes show metadata from NHK World Japan
- Downloads episodes in best quality
- Embeds English subtitles
- Saves episode information
- Organizes files by show name and air date

## File Structure

```
nhktool/
├── src/
│   ├── server/
│   │   ├── ytdlp-wrapper.js
│   │   ├── show-manager.js
│   │   └── scheduler.js
│   └── config/
│       └── shows.json
├── downloads/
├── metadata/
└── bin/
```

## Future Features

- Better implementation of yt-dlp
- User interface
- Server with scheduler
- TVDB integration for show and episode data