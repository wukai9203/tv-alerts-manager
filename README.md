# TV Alerts Manager

A Chrome extension for managing TradingView price alerts with advanced features for monitoring and analyzing alert triggers.

## Features

- 🚨 **Alert Management**
  - Create, stop, restart, and delete alerts
  - View all alerts in one place
  - Real-time alert status updates

- 📊 **Log Monitoring**
  - View alert trigger history
  - Sort logs by timestamp
  - Paginated log viewing
  - Detailed trigger information

- 🔍 **Advanced Features**
  - Alert validation rules
  - Custom filtering and search
  - Export functionality
  - Real-time updates

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/tv-alerts-manager.git
cd tv-alerts-manager
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory from this project

## Usage

### Managing Alerts
1. Click the extension icon to open the popup
2. View your current alerts in the main list
3. Use the action buttons to manage alerts:
   - Create new alerts
   - Stop/restart alerts
   - Delete alerts
   - View alert logs

### Viewing Logs
1. Click on any alert's log entry
2. View detailed trigger history
3. Use pagination to navigate through logs
4. Sort logs by timestamp

### Validation Rules
1. Access the validation rules dropdown
2. Create custom validation rules
3. Apply rules to selected alerts
4. View validation results

## Development

### Project Structure
```
tv-alerts-manager/
├── src/
│   ├── background.js      # Background script
│   ├── popup.js          # Popup interface
│   ├── modules/          # Core modules
│   │   ├── alerts.js     # Alert management
│   │   ├── logs.js       # Log processing
│   │   └── utils.js      # Utility functions
│   └── styles/           # CSS styles
├── docs/                 # Documentation
└── manifest.json         # Extension manifest
```

### Building
```bash
# Development build
npm run dev

# Production build
npm run build
```

### Testing
```bash
# Run tests
npm test

# Run linter
npm run lint
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.

## Acknowledgments

- TradingView for their API
- Chrome Extension documentation
- Open source community

## Roadmap

- [ ] Advanced alert filtering
- [ ] Custom notification settings
- [ ] Export functionality
- [ ] Offline support
- [ ] Performance optimizations

## Version History

- 1.0.0 - Initial release
  - Basic alert management
  - Log viewing
  - Validation rules
  - UI improvements 