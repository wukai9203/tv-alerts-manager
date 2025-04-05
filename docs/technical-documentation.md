# TV Alerts Manager Technical Documentation

## Overview
TV Alerts Manager is a Chrome extension designed to manage TradingView price alerts. It provides features for creating, monitoring, and managing alerts, as well as viewing alert logs.

## Architecture

### Core Components

1. **Background Script (`src/background.js`)**
   - Handles extension lifecycle and core functionality
   - Manages network requests and responses
   - Processes TradingView API interactions
   - Handles storage operations

2. **Popup Interface (`src/popup.js`)**
   - Provides user interface for alert management
   - Displays alerts and logs
   - Handles user interactions
   - Manages UI state and updates

3. **Modules**
   - `src/modules/alerts.js`: Alert management logic
   - `src/modules/logs.js`: Log processing and storage
   - `src/modules/utils.js`: Utility functions

## Key Features

### Alert Management
- Create new alerts
- List existing alerts
- Stop/restart alerts
- Delete alerts
- Alert validation

### Log Management
- View alert trigger logs
- Log filtering and sorting
- Log pagination
- Log cleanup

### UI Features
- Responsive design
- Real-time updates
- Pagination
- Search and filtering
- Validation rules management

## Data Flow

### Alert Operations
1. User initiates action in popup
2. Popup sends message to background script
3. Background script processes TradingView API request
4. Response is handled and stored
5. UI is updated with new data

### Log Operations
1. Logs are fetched from TradingView
2. Processed and stored locally
3. Displayed in popup interface
4. Updated in real-time

## Storage Structure

```javascript
{
  alerts: [], // Array of alert objects
  logs: [], // Array of log objects
  settings: {
    maxLogsPerAlert: 100,
    logRetentionDays: 7,
    notifications: true
  }
}
```

## Error Handling

### Extension Context
- Handles extension context invalidation
- Graceful recovery from errors
- User-friendly error messages

### Network Errors
- Retry mechanisms
- Error logging
- User notifications

## UI Components

### Alerts View
- Alert list with pagination
- Search and filter controls
- Action buttons
- Validation rules dropdown

### Logs View
- Log list with pagination
- Timestamp-based sorting
- Message display
- Back to alerts navigation

## API Integration

### TradingView Endpoints
- `/list_alerts`: Fetch alerts
- `/create_alert`: Create new alert
- `/stop_alerts`: Stop alerts
- `/restart_alerts`: Restart alerts
- `/delete_alerts`: Delete alerts
- `/list_fires`: Fetch alert logs

## Security Considerations

1. **Data Storage**
   - Local storage encryption
   - Secure API communication
   - Data validation

2. **Permissions**
   - Minimal required permissions
   - Secure message passing
   - Content script isolation

## Performance Optimization

1. **Log Management**
   - Pagination
   - Efficient storage
   - Regular cleanup

2. **UI Updates**
   - Debounced updates
   - Efficient rendering
   - Memory management

## Development Guidelines

### Code Style
- Consistent formatting
- Clear documentation
- Error handling
- Type checking

### Testing
- Unit tests
- Integration tests
- Performance testing

## Future Enhancements

1. **Features**
   - Advanced alert filtering
   - Custom notification settings
   - Export functionality

2. **Performance**
   - Caching improvements
   - Background sync
   - Offline support

## Troubleshooting

### Common Issues
1. Extension context invalidation
2. Network connectivity
3. Storage limitations
4. UI rendering issues

### Solutions
1. Extension reload
2. Error handling
3. Data cleanup
4. UI optimization

## Version History

### Current Version
- Alert management
- Log viewing
- Validation rules
- UI improvements

### Previous Versions
- Initial release
- Basic functionality
- Core features 