import React from 'react';

function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              © {new Date().getFullYear()} NHKTool - NHK World VOD Downloader
            </p>
          </div>
          <div className="flex space-x-4">
            <a
              href="https://github.com/yourusername/nhktool"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 text-sm"
            >
              GitHub
            </a>
            <a
              href="https://www3.nhk.or.jp/nhkworld/en/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 text-sm"
            >
              NHK World
            </a>
            <a
              href="https://sonarr.tv/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-500 text-sm"
            >
              Sonarr
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;