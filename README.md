# FocusBar Productivity Tracker

![Build Status](https://github.com/YOUR_USERNAME/FocusBar/workflows/Build%20and%20Release/badge.svg)
[![Download Latest](https://img.shields.io/badge/Download-Latest%20Release-blue)](https://github.com/YOUR_USERNAME/FocusBar/releases/tag/latest)

A beautiful, native macOS menu bar app for tracking your work in 15-minute focused sessions. Lives in your menu bar with a live countdown timer.

## 📥 Download

**[⬇️ Download Latest Release for macOS](https://github.com/YOUR_USERNAME/FocusBar/releases/tag/latest)**

*Latest build automatically created on every code change*

## ✨ Features

- **🎯 Native macOS Menu Bar App** - Lives in your menu bar, always visible
- **⏱️ Live Countdown** - Timer shows directly in the menu bar icon
- **🚀 Auto-Start Timer** - Timer automatically starts when you open the app
- **📁 File-Based Storage** - All data saved to a local JSON file (autosaved every change)
- **📂 Task Groups** - Organize tasks into groups (Work, Personal, Custom)
- **📝 Task Management** - Create tasks, track sessions, mark complete
- **☕ Smart Breaks** - 5-minute break timer with one click
- **⏯️ Sleep Mode** - Pause when not working (Cmd+Shift+S shortcut)
- **💾 Import/Export** - Backup and restore your tasks as JSON files
- **🎨 Beautiful UI** - Native macOS design with dark mode support

## 📸 Screenshot

The app features a clean, native macOS interface:
- Large, elegant timer display (72px SF Pro font)
- Glass-morphism background with blur
- Smooth animations and transitions
- Dark mode automatic support

## 🚀 Quick Start

### Prerequisites
- macOS 10.14 or later
- Node.js 18+ (for building from source)

### Option 1: Download Pre-built App (Recommended)

1. Download the latest `.dmg` from [Releases](link-to-releases)
2. Open the `.dmg` file
3. Drag "FocusBar" to your Applications folder
4. Launch from Applications or Spotlight

### Option 2: Build from Source

```bash
# 1. Clone or navigate to the project folder
cd 15-min-what-did-you-do-extension

# 2. Install dependencies
npm install

# 3. Run in development mode
npm run dev

# 4. Or build the installable app
npm run build-mac
```

The built `.dmg` will be in the `dist/` folder.

## 📁 Data Storage

The app now uses **file-based storage** instead of a database:

**Location:**
```
~/Library/Application Support/focusbar/tasks.json
```

**Features:**
- ✅ **Auto-saved** - Every change is immediately saved to the file
- ✅ **Human-readable** - Plain JSON format you can edit if needed
- ✅ **Portable** - Easy to backup, sync, or version control
- ✅ **Import/Export** - Load different task files via Settings

**Data Structure:**
```json
{
  "tasks": [
    {
      "id": "1234567890",
      "name": "Review quarterly report",
      "groupId": "group_work",
      "sessions": 3,
      "completed": false,
      "logs": [...]
    }
  ],
  "groups": [
    { "id": "group_work", "name": "Work", "color": "#007aff" },
    { "id": "group_personal", "name": "Personal", "color": "#ff9500" }
  ],
  "timerState": { ... }
}
```

## 🎮 How to Use

### Getting Started
1. **Launch the app** - It appears in your menu bar near the clock
2. **Timer auto-starts** - 15-minute countdown begins automatically
3. **Click the menu bar icon** to open the main window
4. **Add tasks** by clicking the + button
5. **Organize with groups** - Assign tasks to Work, Personal, or custom groups
6. **Select a task** to track time against it

### Task Groups

**Creating Groups:**
- Click "+ Add Group" when adding a new task
- Enter group name (e.g., "Client Work", "Study", "Shopping")
- Tasks are automatically organized by group

**Group Features:**
- Groups are shown as collapsible sections
- Click the arrow to expand/collapse
- Groups show task count
- Delete groups (× appears on hover)
- Default groups: General, Work, Personal

**Special Groups:**
- **Ungrouped** - Tasks without a group
- **Completed** - All completed tasks

### During a Session
- **Menu bar shows remaining minutes** (e.g., "15", "14", "3")
- **Blue** = Working, **Orange** = On Break, **Zzz** = Paused
- **Single-click** menu bar icon to show/hide window
- **Right-click** for quick actions (Pause, Break, Settings, Quit)

### When Session Completes
- Notification appears
- "Check-in" window opens automatically
- Select the task you worked on
- Optionally describe what you did
- Click "Start Next Session" to continue

### Keyboard Shortcuts
- `Cmd + Shift + S` - Toggle sleep/pause (works globally!)

### Managing Tasks

**Adding Tasks:**
- Click "+ Add Task" button
- Enter task name
- Select group (optional)
- Click "Add Task" or press Enter

**Creating New Groups:**
- Click "New Group" button
- Enter group name
- Click "Create"

**Completing Tasks:**
- Click the checkbox next to a task to mark it complete
- Completed tasks move to the "Completed" section

**Deleting:**
- **Tasks**: Hover and click × (appears on hover)
- **Groups**: Hover over group header and click ×

### Backup Your Data

**Export (Save to file):**
1. Open Settings (⚙️ button or right-click menu)
2. Go to "Export Tasks" section
3. Click "Export to File"
4. Choose location and save

**Import (Load from file):**
1. Open Settings
2. Go to "Import Tasks" section
3. Click "Choose File"
4. Select your backup JSON file
5. Click "Import"
6. ⚠️ Warning: This replaces all current data!

**Manual Backup:**
Simply copy the data file:
```bash
cp ~/Library/Application\ Support/focusbar/tasks.json ~/Desktop/backup.json
```

## 🏗️ Building the Installable App

To create a `.dmg` installer for distribution:

```bash
# Install dependencies
npm install

# Create icon files (optional - generates SVG templates)
node create-icons.js

# Build for Mac (Universal - works on Intel & Apple Silicon)
npm run build-mac

# Or build for specific architecture
npm run build-mac-arm    # Apple Silicon only
```

The installer will be at:
- `dist/FocusBar-1.0.0.dmg`

### Creating Proper Icons (Optional)

For a polished release, create proper `.icns` files:

1. **Using Icon Set Creator** (Easiest):
   - Download from Mac App Store
   - Create 1024×1024 icon image
   - Drag into Icon Set Creator
   - Export as `.icns`
   - Replace `icons/icon.icns`

2. **Using Command Line**:
   ```bash
   # Create iconset folder
   mkdir icons/icon.iconset
   
   # Add PNGs in various sizes (16x16, 32x32, 64x64, etc.)
   # Then convert:
   iconutil -c icns icons/icon.iconset
   ```

## 📁 File Structure

```
15-min-what-did-you-do-extension/
├── main.js              # Main Electron process (menu bar, timer, file storage)
├── preload.js           # Secure IPC bridge
├── renderer.js          # UI logic with groups
├── index.html           # Main window (beautiful macOS UI with groups)
├── settings.html        # Settings window
├── settings.js          # Settings logic
├── styles.css           # Main window styles
├── package.json         # App config & build settings
├── build/               # Build resources
│   └── entitlements.mac.plist
├── icons/               # App icons
└── README.md           # This file
```

## 🔧 Development

```bash
# Run with hot reload (dev tools enabled)
npm run dev

# The app will:
# - Show in menu bar
# - Auto-open dev tools
# - Log to console
```

### Project Roadmap
- [ ] Windows support (system tray)
- [ ] Custom timer durations
- [ ] Sound notifications
- [ ] Daily/weekly stats
- [ ] Cloud sync

## 🐛 Troubleshooting

**"App can't be opened" security warning:**
- Right-click the app → Open
- Or: System Preferences → Security & Privacy → Open Anyway

**Menu bar icon not showing:**
- Check System Preferences → Bartender (if using)
- Look in the menu bar overflow (⋯)

**Timer not auto-starting:**
- First launch shows the window but doesn't auto-start
- Subsequent launches auto-start the timer
- Check if "hasLaunchedBefore" flag in storage

**Data file not found:**
- Check if the directory exists: `~/Library/Application Support/focusbar/`
- The app creates it automatically on first run
- Check app permissions in System Preferences

**Import/Export issues:**
- Ensure the JSON file has the correct structure (tasks, groups, timerState)
- Check file permissions
- Try exporting first to see the correct format

**Build fails:**
```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build-mac
```

## 📝 Data Migration

**From Old Version (electron-store):**
The app automatically migrates data from the old storage format on first launch.

**Manual Migration:**
If you have old data in `~/Library/Application Support/focusbar/config.json`:
1. Export it from the old app
2. Import it in the new app via Settings

## 🙏 Credits

Built with:
- [Electron](https://electronjs.org/) - Cross-platform framework
- SF Pro fonts - Apple's system font family

## 📄 License

MIT License - Feel free to use, modify, and distribute!

---

**Enjoy your focused work sessions!** 💪
