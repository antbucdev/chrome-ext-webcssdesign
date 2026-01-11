# Design CSS Compare - Chrome Extension

A Chrome extension that compares CSS properties from Design designs with actual webpage elements.

## Features

- 📋 Paste CSS code from Design designs
- 🎯 Select any element on a webpage to extract its CSS
- 📊 Compare Design CSS with website CSS
- ✅ Green highlighting for matching properties
- ❌ Red highlighting for differences
- 💾 Persistent data - your CSS is saved even after closing the popup
- 🎨 Modern Bootstrap-inspired UI

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the extension folder

## Usage

1. Click the extension icon in your Chrome toolbar
2. Paste your Design CSS code in the textarea
3. Click "🎯 Select Element" button
4. Click on any element on the webpage you want to compare
5. Reopen the extension popup to see the comparison results
6. Use "🗑️ Clear" button to reset and start fresh

## Documentation

- [Extension Prompt](docs/extension_prompt.md) - Original requirements and specifications
- [Styling Improvements](docs/styling_improvements.md) - Details about the Bootstrap-style design updates

## Technologies

- **Manifest V3** - Latest Chrome extension format
- **Chrome Storage API** - For data persistence
- **Chrome Scripting API** - For element selection
- **Bootstrap-inspired CSS** - Modern, professional styling

## Permissions

- `scripting` - To inject element selection script into web pages
- `activeTab` - To interact with the current active tab
- `storage` - To save Design CSS and comparison results
- `host_permissions: <all_urls>` - To work on any website

## Version

**1.0** - Initial release with Bootstrap-style interface

## License

This project is open source and available for personal and commercial use.
