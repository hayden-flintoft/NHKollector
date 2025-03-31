# NHK Tool

A tool for downloading and managing NHK World Japan shows.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your TVDB credentials:
```
TVDB_API_KEY=your_api_key_here
TVDB_PIN=your_pin_here
TVDB_USERKEY=your_userkey_here
```

3. Run the tool:
```bash
node src/index.js
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