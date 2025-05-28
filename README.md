# NHK Show Downloader

A tool to download and organize shows from NHK World Japan with automated TVDB metadata integration.

## Purpose

This tool aims to solve two key issues with NHK World programming:

1. Limited smart TV app availability after recent decommissioning
2. Show preservation given NHK's history of removing content (e.g. J-Trip Plan)

The tool automatically downloads shows, integrates metadata, and organizes files in a format suitable for media servers and smart TVs.

## Background

NHK World Japan has reduced their smart TV app availability in recent years, making it difficult to watch their content on larger screens. Additionally, shows have been known to disappear from their catalog without warning, as happened with J-Trip Plan and other popular programs.

This project serves as both a practical solution for archiving content and a portfolio demonstration of web scraping, automation, and media management.

## Technologies

- Node.js
- Puppeteer for web scraping
- yt-dlp for media downloads
- TVDB API integration
- File system management
- JSON-based caching
- Automated metadata handling

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
- Downloads episodes in best available quality
- Embeds English subtitles when available
- Integrates TVDB season/episode data
- Organizes files by show name and metadata
- Caches episode information for faster lookups
- Tracks download history

## File Structure

```
nhktool/
├── core/
│   ├── models/
│   │   ├── show.js
│   │   └── episode.js
│   ├── tvdb-scraper.js
│   ├── nhk-scraper.js
│   ├── downloader.js
│   ├── download-history.js
│   └── get-episodes.js
├── config/
│   └── shows.json
├── data/
│   ├── tvdb-cache.json
│   └── downloaded.json
├── downloads/
│   └── {show-name}/
├── nhk-download.js
└── README.md
```

## Disclaimer

This project is a proof-of-concept and portfolio demonstration. Users must:

- Comply with their local laws and regulations
- Respect NHK World's terms of service
- Use the tool for personal use only
- Understand there are no guarantees of functionality

## Limitations

- Depends on NHK's website structure
- Requires TVDB data availability
- No warranty or guarantee of functionality
- May break if NHK changes their website
- Limited error recovery
- Best-effort metadata matching

## License

MIT License - See LICENSE file for details