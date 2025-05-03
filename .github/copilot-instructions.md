# Copilot Instructions for `nhktool`

This project is a media downloader for downloading tv shows on the NHK Worlds VOD website. The project will use Sonarr for episode and show information and schedules. 

## 📦 Project Purpose

- Automate the discovery and download of NHK episodes.
- Support for integration with **Puppeteer**, **yt-dlp**, and **cron jobs**.
- Integrate with Sonarr for discovery and sheduling.

---

## ✅ Coding Guidelines

- Use **CommonJS** syntax (e.g., `require`, `module.exports`) as specified in `package.json`.
- Prefer **async/await** over `.then()` for clarity.
- Prefer modularity: split large functions into smaller, purpose-driven units.

---

## 🔄 Migration Notes

We're moving away from TVDB, so please:

- ⛔ Do NOT add new code that fetches episode data from TVDB.
- ✅ Prefer using **Sonarr's API** for episode metadata.
- 🧪 Update or remove tests under `test/api/test-tvdb.js`.
- As you discover it, remove code and files that refer to TVDB or orphoned files and methods.

---

log with `chalk` for visibility.

