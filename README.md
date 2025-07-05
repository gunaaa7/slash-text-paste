# Slash-Text Paste

A Chrome extension that expands `/alias` shortcuts to saved text snippets in any editable field.

## Features

- 🚀 **Quick Expansion**: Type `/alias` + Tab to expand to saved text
- 📝 **Universal**: Works in any editable field (Gmail, Twitter, forms, etc.)
- 🔒 **Smart Exclusions**: Automatically excludes password and payment fields
- ↩️ **Undo Support**: Ctrl+Z to restore original `/alias` text
- 🎯 **Simple Management**: Clean popup interface for CRUD operations
- 💾 **Sync Storage**: Aliases sync across your Chrome browsers

## Installation

### Development Setup

1. **Clone and build the extension:**
   ```bash
   git clone <repository-url>
   cd slash-text-paste
   npm install
   npm run build
   ```

2. **Load the extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

3. **Verify installation:**
   - You should see the extension icon in your toolbar
   - Click the icon to open the popup and manage aliases

### Usage

1. **Create an alias:**
   - Click the extension icon
   - Enter an alias name (letters only, e.g., "demo")
   - Enter the expansion text
   - Click "Save Alias"

2. **Use the alias:**
   - Go to any website with text input (Gmail, Twitter, etc.)
   - Type `/demo` (or your alias)
   - Press Tab
   - The alias expands to your saved text with a confirmation toast

3. **Undo expansion:**
   - Press Ctrl+Z immediately after expansion to restore `/alias`

## Development

### Build Commands

```bash
# Build for production
npm run build

# Build and watch for changes
npm run dev

# Run tests
npm test
```

### Project Structure

```
├── src/
│   ├── background.ts      # Service worker for storage operations
│   ├── content-script.ts  # Text expansion logic
│   ├── popup.ts          # Popup UI management
│   └── __tests__/        # Unit tests
├── popup/
│   ├── popup.html        # Popup interface
│   └── popup.css         # Styling
├── manifest.json         # Extension configuration
└── build.js             # Build script
```

### Technical Details

- **Manifest V3** service worker architecture
- **TypeScript** for type safety and better development experience
- **Chrome Storage Sync** for cross-device alias synchronization
- **Content Script** injection for universal text field support
- **Smart field detection** to exclude sensitive inputs

### Testing

The extension includes unit tests for core functionality:

```bash
npm test
```

Tests cover:
- Alias regex pattern matching
- Edge cases and validation
- Case sensitivity handling

## Security & Privacy

- **Local Storage**: All aliases are stored locally in Chrome's sync storage
- **No Network Requests**: Extension works entirely offline
- **Smart Exclusions**: Automatically excludes password and payment fields
- **Minimal Permissions**: Only requests necessary storage permissions

## Troubleshooting

### Extension not working?
1. Check that the extension is enabled in `chrome://extensions/`
2. Refresh the page you're testing on
3. Verify the field is editable and not excluded (password/payment)

### Aliases not syncing?
1. Ensure you're signed into Chrome
2. Check Chrome sync settings
3. Try disabling/re-enabling the extension

### Build issues?
1. Ensure Node.js 16+ is installed
2. Delete `node_modules` and run `npm install` again
3. Check that TypeScript compiles without errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `npm test` and `npm run build`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
