# Copilot Instructions for `nhktool`

This project is a media downloader for downloading tv shows on the NHK Worlds VOD website. The project will use Sonarr for episode and show information and schedules. 

## 📦 Project Purpose

- Automate the discovery and download of NHK episodes.
- Support for integration with **Puppeteer**, **yt-dlp**, and **cron jobs**.
- Integrate with Sonarr for discovery and sheduling.
- The client side uses React.js with Tailwind CSS.
- The server-side will use Express, Vite.
- We will use API's to interact with Sonarr and Prowlarr.
- We use yt-dlp with a wrapper to download the actual video.

---

## ✅ Coding Guidelines

- Use **CommonJS** syntax (e.g., `require`, `module.exports`) as specified in `package.json`.
- Prefer **async/await** over `.then()` for clarity.
- Prefer modularity: split large functions into smaller, purpose-driven units.
- This project needs to be compatible with Windows and Windows Linux Subsystem when considering filepaths. 
- We use Terminal ZSH.

---

## 🔄 Migration Notes

We're moving away from TVDB, so please:

- ⛔ Do NOT add new code that fetches episode data from TVDB.
- ✅ Prefer using **Sonarr's API** for episode metadata.
- 🧪 Update or remove tests under `test/api/test-tvdb.js`.
- As you discover it, remove code and files that refer to TVDB or orphoned files and methods.

---
## Order of Operations for GitHub Copilot Agent Requests

When making changes or implementing new features, be **thorough and careful**. Unless specified otherwise, follow this structure to minimise the introduction of bugs or regressions:

1. **Analyse the entire codebase** to understand the full context of the project, including how the requested change fits in and may impact other areas.
2. **Implement the requested changes** carefully and precisely.
3. **Write or update tests** as needed. Aim to maximise code coverage and test the modified functionality.
4. **Ensure all tests pass.** If any tests fail, revisit and correct your implementation.
5. If applicable, **run a linter or formatter** before submitting changes.
5. **Update the README** (or any other relevant documentation) with accurate and concise information about the change.

When removing code or features, **ensure there are no lingering dependencies or references** left behind.

log with `chalk` for visibility.

