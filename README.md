# 15-Minute Productivity Tracker

A desktop system tray / menu bar app that helps you track work in 15-minute increments with task management. Always visible in your system tray with a live countdown!

## Features

- **System Tray / Menu Bar App**: Lives in your system tray (Windows) or menu bar (Mac) - always visible!
- **Live countdown on icon**: See remaining minutes directly in the tray icon
- **Auto-start timer**: Timer begins automatically when you open the app
- **15-minute work sessions**: Track your productivity in focused 15-minute blocks
- **Check-in prompts**: After each session, log what you accomplished
- **Task management**: Create tasks, track sessions per task, mark tasks complete
- **5-minute breaks**: Take breaks between work sessions
- **Sleep mode**: Pause the timer when you're not working (button or Ctrl/Cmd+Shift+S shortcut)
- **Import/Export**: Backup and restore your tasks as JSON files

## System Tray Icon Display

The app icon in your system tray shows:
- **Number** (e.g., "14", "9", "3") = Remaining minutes for work session
- **Orange number** = Break time remaining
- **"Zzz"** = Sleep mode (timer paused)
- **"!"** = Check-in required (session complete)

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- npm (comes with Node.js)

### Install & Run

1. **Navigate to the app folder:**
   ```bash
   cd 15-min-what-did-you-do-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the app:**
   ```bash
   npm start
   ```

The app will appear in your system tray (Windows) or menu bar (Mac, near the clock).

### Build Standalone App (Optional)

To create a standalone executable:

**For Mac:**
```bash
npm run build-mac
```

**For Windows:**
```bash
npm run build-win
```

Built apps will be in the `dist/` folder.

## How to Use

### Opening the App
- **Click the tray icon** to open the main window
- **Right-click the tray icon** for quick actions (Sleep, Break, Settings, Quit)

### Workflow
1. The timer auto-starts at 15:00 when you open the app
2. Work on a task, then click a task in the list to select it
3. When 15 minutes complete, a check-in window appears asking "What did you do?"
4. Select the task you worked on and optionally describe what you did
5. Click "Start Next Session" to immediately begin the next 15-minute block
6. Use Sleep button or press `Ctrl/Cmd+Shift+S` to pause when not working
7. Click Break button for a 5-minute break (orange icon shows break countdown)

### Managing Tasks

**Adding Tasks:**
- Click "+ Add" button
- Enter task name
- Click "Save"

**Selecting a Task:**
- Click any task in the list to select it for the current session
- Selected task is highlighted in blue
- Task info shows at bottom: "Working on: [Task Name] - Sessions: X (Total: Y min)"

**Completing Tasks:**
- Click the checkbox next to a task to mark it complete
- Completed tasks are crossed out but remain visible

**Deleting Tasks:**
- Click the "×" button next to a task
- Confirm deletion

### Download / Upload Tasks (Data Backup)

**Download (Export) your tasks:**
1. Click the ⚙️ gear icon in the main window (or right-click tray icon → Settings)
2. Go to "📥 Download / Export Tasks" section
3. Click "💾 Download Tasks as JSON"
4. Choose where to save the backup file (e.g., `15min-tracker-backup-2024-01-15.json`)
5. Keep this file safe - it contains all your tasks, sessions, and history!

**Upload (Import) tasks:**
1. Open Settings window
2. Go to "📤 Upload / Import Tasks" section
3. Click "Choose File" and select your backup JSON file
4. Click "📤 Import Tasks from JSON"
5. ⚠️ Warning: This will replace all your current tasks!

### Keyboard Shortcut
Press `Ctrl+Shift+S` (Windows/Linux) or `Cmd+Shift+S` (Mac) to toggle sleep mode from anywhere - even when the window is closed!

### Statistics
Open Settings to see your productivity stats:
- Total Tasks
- Completed Tasks
- Total Sessions
- Minutes Tracked

## File Structure

```
15-min-what-did-you-do-extension/
├── package.json          # Node.js dependencies
├── main.js               # Electron main process (tray, window, timer)
├── preload.js            # Secure IPC bridge
├── index.html            # Main app window UI
├── renderer.js           # Main window logic
├── styles.css            # Main window styles
├── settings.html         # Settings window UI
├── settings.js           # Settings logic
├── settings.css          # Settings styles
├── icons/                # App icons
└── README.md             # This file
```

## Data Storage

All data is stored locally on your computer using Electron's secure storage:
- **Windows**: `%APPDATA%/15min-productivity-tracker/`
- **Mac**: `~/Library/Application Support/15min-productivity-tracker/`

Data includes:
- Task names, completion status, session counts
- Activity logs with timestamps
- Timer state (running/sleeping/break)

## Troubleshooting

**App doesn't show in tray:**
- On Mac, look in the menu bar near the clock
- On Windows, check the system tray (may be hidden - click the ^ arrow)

**Timer not counting down:**
- Check if Sleep mode is active (button will say "Wake Up")
- Look at tray icon - "Zzz" means timer is paused

**Import/Export issues:**
- Make sure you're importing a valid JSON file exported from this app
- The JSON file should have a `tasks` array

## Uninstall

To remove the app:
1. Quit the app (right-click tray icon → Quit)
2. Delete the app folder
3. Optional: Delete data folder (see Data Storage location above)

## License

MIT

## Support

For issues or questions, please check the README or create an issue on GitHub.
