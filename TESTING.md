# Testing Guide

This project includes a comprehensive test suite using Jest to ensure all functionality works correctly.

## 📊 Test Coverage

The test suite covers:
- **Unit Tests**: Core functionality testing
- **Integration Tests**: Cross-component interaction testing
- **Coverage Thresholds**: 70% minimum for all metrics

## 🧪 Running Tests

### Run All Tests with Coverage
```bash
npm test
```

### Run Tests in Watch Mode (for development)
```bash
npm run test:watch
```

### Run Only Unit Tests
```bash
npm run test:unit
```

### Run Only Integration Tests
```bash
npm run test:integration
```

## 📁 Test Structure

```
test/
├── unit/
│   ├── timer.test.js         # Timer logic tests
│   ├── tasks.test.js         # Task and group management tests
│   └── persistence.test.js   # Data persistence and shutdown tests
├── integration/
│   └── lifecycle.test.js     # App lifecycle integration tests
└── fixtures/                 # Test data files
```

## 🎯 Test Categories

### Timer Tests (`test/unit/timer.test.js`)
- Timer start/stop functionality
- Sleep/pause behavior
- Countdown calculations
- Timer completion detection
- Work vs break timer modes

**Key Tests:**
- ✅ Timer starts with correct 15-minute duration
- ✅ Timer displays correct remaining time
- ✅ Sleep mode pauses and saves remaining time
- ✅ Timer complete detection works
- ✅ Break timer uses 5-minute duration

### Task Management Tests (`test/unit/tasks.test.js`)
- Task CRUD operations
- Task grouping
- Group management
- Task statistics calculations

**Key Tests:**
- ✅ Task creation with all fields
- ✅ Toggle task completion
- ✅ Delete tasks
- ✅ Create and delete groups
- ✅ Tasks become ungrouped when group deleted
- ✅ Statistics calculation (total sessions, minutes)

### Persistence Tests (`test/unit/persistence.test.js`)
- Data save on shutdown
- Data load on startup
- Auto-save on changes
- Error handling
- Data integrity

**Key Tests:**
- ✅ Data saves to JSON file on shutdown
- ✅ Data saves on before-quit event
- ✅ Data saves on SIGTERM/SIGINT signals
- ✅ All app data (tasks, groups, timer) is preserved
- ✅ Directory created if missing
- ✅ Handles save errors gracefully
- ✅ Preserves special characters in task names

### Integration Tests (`test/integration/lifecycle.test.js`)
- Application startup/shutdown sequence
- Crash recovery
- Emergency data recovery

**Key Tests:**
- ✅ Shutdown handlers execute in correct order
- ✅ Data saves even if other shutdown steps fail
- ✅ Async saves complete before exit
- ✅ Corrupted data detection
- ✅ Backup recovery

## 🛡️ Shutdown Safety Features

The app now has **5 layers of protection** to ensure data is saved:

1. **`before-quit`** event - Saves data when app is quitting normally
2. **`will-quit`** event - Final save attempt before app exits
3. **`SIGTERM`** signal - Saves when process receives termination signal
4. **`SIGINT`** signal - Saves when Ctrl+C is pressed
5. **Auto-save on every change** - Immediate save after any data modification

### Testing Shutdown Behavior

To verify shutdown saving works:

```bash
# Start the app
npm start

# Add some tasks, start a timer

# Quit the app (Cmd+Q or right-click menu bar icon)

# Check the data file was saved:
cat ~/Library/Application\ Support/15min-tracker/tasks.json

# Restart the app - all data should be restored
npm start
```

## 📈 Coverage Report

After running tests, coverage report is generated in:
```
coverage/
├── lcov-report/          # HTML report
│   └── index.html        # Open in browser to view
├── clover.xml           # Clover format
└── coverage-final.json  # JSON format
```

View HTML report:
```bash
npm test
open coverage/lcov-report/index.html
```

## 🚨 Common Test Issues

### "Cannot find module"
Make sure all dependencies are installed:
```bash
npm install
```

### Tests failing on macOS permissions
The tests mock the file system, so they shouldn't need special permissions. If you see permission errors, check that the test mocks are working correctly.

### Coverage below threshold
If coverage drops below 70%, the test suite will fail. Add more tests to cover uncovered code paths.

## 🔧 Adding New Tests

1. Create test file in appropriate folder (`test/unit/` or `test/integration/`)
2. Name file with `.test.js` extension
3. Import from `@jest/globals`
4. Use `describe` and `it` blocks
5. Run `npm test` to verify

Example test structure:
```javascript
const { describe, it, expect } = require('@jest/globals');

describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = yourFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## 📊 Current Test Statistics

- **Total Test Files**: 4
- **Unit Tests**: 3 files
- **Integration Tests**: 1 file
- **Coverage Areas**:
  - Timer logic: ✅ Comprehensive
  - Task management: ✅ Comprehensive  
  - Data persistence: ✅ Comprehensive
  - App lifecycle: ✅ Basic coverage

## 🎯 Priority Test Areas

If you need to add more tests, focus on:

1. **Renderer UI tests** - Testing DOM manipulations in renderer.js
2. **IPC communication tests** - Testing main-renderer communication
3. **File I/O error scenarios** - Testing disk full, permission denied
4. **Timer edge cases** - System sleep/wake, timezone changes

## 🔍 Debugging Tests

Add `--verbose` flag for detailed output:
```bash
npx jest --verbose
```

Run specific test:
```bash
npx jest test/unit/timer.test.js
```

Run specific test case:
```bash
npx jest -t "should start a work timer"
```

---

**All tests passing?** ✅ You're ready to build and deploy!
