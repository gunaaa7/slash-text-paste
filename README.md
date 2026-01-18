# PastePal

A Chrome extension to paste saved text instantly using shortcuts.

Type `/shortcut` and press **Tab** to replace it with your saved text in any editable field.

![PastePal Demo](PastePal%20-%20Demo.gif)

---

## Screenshots

> Add 2–4 screenshots here (popup + a demo in a text box):
- Popup: managing shortcuts
- Before: typing `/meeting`
- After: expanded/pasted text
- Optional: toast confirmation

(Place images in `/assets` and link like: `![Popup](assets/popup.png)`)

---

## Features

- ⚡ **Instant paste**: Type `/shortcut` + Tab to paste saved text
- 🧩 **Works everywhere**: Any editable field across websites
- 🔒 **Safe by default**: Excludes password and sensitive payment fields
- ↩️ **Undo support**: `Ctrl+Z` restores the original `/shortcut`
- 🗂️ **Simple management**: Popup UI to add/edit/delete shortcuts
- 💾 **Sync storage**: Shortcuts sync via Chrome Storage Sync (when signed in)

---

## Install (Local / Development)

1. **Clone and build**
   ```bash
   git clone <repository-url>
   cd pastepal
   npm install
   npm run build

2. **Load the extension in Chrome:**
   - Open chrome://extensions/
   - Enable Developer mode
   - Click Load unpacked
   - Select the dist/ folder from this project

3. **Update after changes:**
   - Run npm run build
   - Go to chrome://extensions/ and click Reload on PastePal
   - Refresh the page you’re testing

### Usage
1. Open the PastePal popup
2. Enter a Shortcut (letters only, e.g. meeting)
3. Enter Text to Paste
4. Save
Then in any text input:
   - Type /meeting
   - Press Tab
   - PastePal replaces it with your saved text
**Undo**: Press Ctrl+Z immediately after pasting.

## Development

### Build Commands

```bash
# Build for production
npm run build

# Build and watch for changes
npm run dev
```

### Project Structure

```
├── src/
│   ├── background.ts      # Service worker for storage operations
│   ├── content-script.ts  # Text expansion logic
│   ├── popup.ts          # Popup UI management
├── popup/
│   ├── popup.html        # Popup interface
│   └── popup.css         # Styling
├── manifest.json         # Extension configuration
└── build.js             # Build script
```

## Security & Privacy

- **Local Storage**: All aliases are stored locally in Chrome's sync storage
- **No Network Requests**: Extension works entirely offline
- **Smart Exclusions**: Automatically excludes password and sensitive fields
