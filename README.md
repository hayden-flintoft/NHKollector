# NHKollector

A tool to download and organise shows from NHK World Japan with automated TVDB metadata integration.

## Purpose

This tool aims to solve two key issues with NHK World programming:

1. Limited smart TV app availability after recent decommissioning
2. Show preservation given NHK's history of removing content (e.g. J-Trip Plan)

The tool automatically downloads shows, integrates metadata, and organises files in a format suitable for media servers and smart TVs.

## Background

NHK World Japan has reduced the availability of its smart TV app in recent years, making it more difficult to watch its content on larger screens. Additionally, shows have been known to disappear from their catalogue without warning, as happened with J-Trip Plan and other popular programs.

This project serves as both a practical solution for archiving content and a portfolio demonstration of web scraping, automation, and media management.

## Technologies

- Node.js
- Puppeteer for web scraping
- yt-dlp for media downloads
- File system management
- JSON-based caching
- Automated metadata handling

## Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/hayden-flintoft/NHKollector.git
cd NHKollector
npm install
```

## Usage

### Interactive Menu

To launch the interactive menu for managing and downloading shows:

```bash
node menu.js
```

- The menu will display all shows configured in `config/shows.json`.
- Use the arrow keys to select a show and follow the prompts to download episodes or update metadata.

### Downloading a Specific Show

You can also download a show directly by providing its homepage URL:

```bash
node nhk-download.js https://www3.nhk.or.jp/nhkworld/en/shows/journeys/
```

### Direct Script Access

NHKollector provides several standalone scripts that can be used without going through the menu system:

#### Add a New Show
```bash
node add-show.js
```
Interactively add a new show to your configuration.

#### Delete a Show
```bash
node delete-show.js
```
Remove a show from your configuration.

#### List All Shows
```bash
node list-shows.js
```
Display a table of all shows in your configuration.

#### Search & Verify Downloaded Episodes
```bash
node search-episodes.js
```
Search your download directories to verify downloads and find missing episodes.

#### Test TVDB Integration
```bash
node test-tvdb.js
```
Test the TVDB metadata integration with a sample episode.

#### Download a Single Episode
```bash
node download.js [NHK_EPISODE_URL]
```
Download a specific episode by providing its URL.

## Available Functions

NHKollector has a modular design with several specialized components:

### Core Modules

- **NHKScraper** (`core/nhk-scraper.js`): Scrapes show and episode data from NHK World website.
  - `scrapeShowEpisodes(url)`: Gets all episodes for a show
  - `scrapeEpisodeDetails(episode)`: Gets detailed information for an episode

- **TVDBScraper** (`core/tvdb-scraper.js`): Retrieves season and episode numbers from TVDB.
  - `findEpisodeInfo(showUrl, episodeTitle)`: Finds season/episode data for a title

- **Downloader** (`core/downloader.js`): Handles downloading video content.
  - `downloadEpisode(episode)`: Downloads an episode

- **DownloadHistory** (`core/download-history.js`): Manages download history.
  - `isDownloaded(nhkId)`: Checks if an episode was downloaded
  - `markDownloaded(episode)`: Records a downloaded episode

### Utilities

- **Search & Verification** (`search-episodes.js`):
  - `getShowEpisodesWithStatus(show)`: Gets all episodes with download status
  - `findMissingEpisodes(episodes)`: Finds episodes marked as downloaded but missing files
  - `findOrphanedFiles(show)`: Finds video files not matching any known episode

### Models

- **Show** (`core/models/show.js`): Show data model with properties like name, URLs, and settings
- **Episode** (`core/models/episode.js`): Episode data model with properties like title, URL, and metadata

## Features

- Scrapes show metadata from NHK World Japan
- Downloads episodes in the best available quality
- Embeds English subtitles when available
- Integrates TVDB season/episode data
- Organises files by show name and metadata
- Caches episode information for faster lookups
- Tracks download history
- Verifies downloads against history records
- Identifies missing or orphaned files

## File Structure

```
NHKollector/
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
│   └── shows.json         # List of shows to track/download
├── data/
│   ├── tvdb-cache.json    # Cached TVDB metadata
│   └── downloaded.json    # Download history
├── downloads/
│   └── {show-name}/       # Downloaded episodes organized by show
├── nhk-download.js        # Main entry point (menu & CLI)
└── README.md
```

## Terms of Use & Disclaimer

**PLEASE READ CAREFULLY BEFORE USING THIS TOOL.**  
By downloading, installing, or running NHKollector, you (the "User") agree to the following terms. If you do not accept these terms, do not use this software.

1. **Tools‐Only Project**  
   - NHKollector provides _only_ the code necessary to locate, download, and organize publicly available NHK World Japan streams.  
   - NHKollector does **not** host, embed, or redistribute any NHK‐originated video files.

2. **User Responsibilities & Local Laws**  
   - The User is entirely responsible for ensuring that their use of NHKollector complies with all applicable copyright laws (including any "fair dealing," "time-shift," or similar exceptions) in their jurisdiction.  
   - The tool is intended **only** for personal, non-commercial archiving or time-shifting of publicly accessible NHK World Japan programs to which the User already has lawful access.   
   - You agree **not** to distribute, re-upload, or publicly share any downloaded NHK files via any platform (torrent, file host, etc.) if doing so would violate copyright or NSohH Terms of Service.

3. **No Warranty & Limitation of Liability**  
   - NHKollector is provided "AS IS," without warranties of any kind (express or implied).  
   - Under no circumstances shall the developers, contributors, or anyone else involved in creating, producing, or delivering NHKollector be liable for any damages, including direct, indirect, special, incidental, or consequential damages, loss of data, or loss of profits arising out of your use or inability to use NHKollector.

4. **No Circumvention of DRM / TPMS**  
   - NHKollector is not designed to break or bypass any encryption, DRM, or technical protection measures. If the source encrypts or restricts access to a stream, you must not attempt to circumvent such measures.  

5. **Takedown & Notice Policy**  
   - If NHK or any rights holder notifies you or the maintainers of NHKollector that certain functionality violates its terms of use, you or the maintainer agree to:  
     1. **Temporarily disable or remove** the reported functionality (e.g., a script, URL pattern, or scraping routine).  
     2. Notify all Users (via the repository's Issues/README) that certain features have been disabled.  
     3. Take any other reasonable steps to comply with an official takedown request (e.g., remove the offending code from the repo).  

6. **Contribution & License**  
   - All contributions to NHKollector (issues, pull requests, patches) must be made under the Apache 2.0 License (see [LICENSE](./LICENSE) for details).  
   - By contributing code or documentation to this repository, you grant the Project Contributors a perpetual, irrevocable, worldwide, royalty-free, non-exclusive license to use, modify, and redistribute your contributions under Apache 2.0, including any patent rights necessary to exercise those rights.

## Limitations

- Depends on NHK's website structure
- Requires TVDB data availability
- No warranty or guarantee of functionality
- May break if NHK changes their website
- Limited error recovery
- Best-effort metadata matching

## License

Licensed under the Apache License, Version 2.0 (the "License");  
you may not use this file except in compliance with the License.  
You may obtain a copy of the License at

https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software  
distributed under the License is distributed on an "AS IS" BASIS,  
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  
See the License for the specific language governing permissions and  
limitations under the License.

