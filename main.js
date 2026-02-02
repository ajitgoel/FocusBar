const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize storage
const store = new Store();

// Global variables
let tray = null;
let window = null;
let settingsWindow = null;
let timerInterval = null;
let timerState = {
  running: false,
  sleeping: false,
  isBreak: false,
  endTime: null,
  remaining: 15 * 60,
  selectedTaskId: null,
  checkinPending: false,
  lastSessionDate: null
};

// Default timer duration
const WORK_DURATION = 15 * 60; // 15 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds

// Generate a high-quality tray icon with the timer text
function generateTrayIcon(text, isBreak = false, isSleeping = false) {
  const size = 44;
  const canvas = document?.createElement('canvas');
  
  // Create SVG for the icon
  const bgColor = isSleeping ? '#757575' : (isBreak ? '#FF9800' : '#2196F3');
  const displayText = text || '15';
  const fontSize = displayText.length > 2 ? '16' : '22';
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${bgColor};stop-opacity:0.85" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect x="2" y="2" width="${size-4}" height="${size-4}" rx="10" fill="url(#bg)" filter="url(#shadow)"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
            fill="white" font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif" 
            font-size="${fontSize}" font-weight="600" letter-spacing="-0.5">${displayText}</text>
    </svg>
  `;
  
  return nativeImage.createFromBuffer(Buffer.from(svg));
}

// Update tray icon and title
function updateTrayIcon() {
  if (!tray) return;
  
  let displayText = '';
  let isBreak = false;
  let isSleeping = false;
  let tooltip = '15-Minute Tracker';
  
  if (timerState.sleeping) {
    displayText = 'Zzz';
    isSleeping = true;
    tooltip = '15-Minute Tracker - Paused';
  } else if (timerState.running) {
    const remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    displayText = minutes > 99 ? '99+' : minutes.toString();
    isBreak = timerState.isBreak;
    
    const status = isBreak ? 'Break' : 'Focus';
    tooltip = `${status} - ${minutes} min remaining`;
  } else if (timerState.checkinPending) {
    displayText = '!';
    tooltip = 'Session complete - Log your work';
  } else {
    displayText = '15';
    tooltip = 'Ready to focus';
  }
  
  // Update macOS menu bar title
  if (process.platform === 'darwin') {
    tray.setTitle(` ${displayText}`, { fontFamily: 'SF Pro Text', fontSize: 14 });
  }
  
  // Update tooltip
  tray.setToolTip(tooltip);
  
  // Update context menu
  updateContextMenu();
}

// Create elegant context menu
function updateContextMenu() {
  const template = [
    {
      label: '15-Minute Tracker',
      enabled: false,
      icon: nativeImage.createFromBuffer(Buffer.from(`<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="8" r="7" fill="#2196F3"/></svg>`))
    },
    { type: 'separator' },
    {
      label: timerState.sleeping ? '▶ Resume' : '⏸ Pause',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: toggleSleep
    },
    {
      label: timerState.isBreak ? '💼 Back to Work' : '☕ Take Break',
      click: timerState.isBreak ? () => startTimer(false) : startBreak
    },
    { type: 'separator' },
    {
      label: '📊 Open Tracker',
      click: showWindow
    },
    {
      label: '⚙️ Settings...',
      click: openSettings
    },
    { type: 'separator' },
    {
      label: '❌ Quit',
      accelerator: 'Cmd+Q',
      click: () => {
        app.quit();
      }
    }
  ];
  
  const contextMenu = Menu.buildFromTemplate(template);
  tray.setContextMenu(contextMenu);
}

// Timer functions
function startTimer(isBreak = false, autoStart = true) {
  const duration = isBreak ? BREAK_DURATION : WORK_DURATION;
  timerState.running = true;
  timerState.sleeping = false;
  timerState.isBreak = isBreak;
  timerState.remaining = duration;
  timerState.endTime = Date.now() + duration * 1000;
  timerState.checkinPending = false;
  timerState.lastSessionDate = new Date().toDateString();
  
  saveTimerState();
  startTimerInterval();
  updateTrayIcon();
  
  // Notify renderer if window is open
  if (window && !window.isDestroyed()) {
    window.webContents.send('timer-updated', timerState);
  }
  
  // Show notification when starting
  if (autoStart && !isBreak) {
    showNotification('Focus Session Started', '15 minutes of focused work. You\'ve got this! 💪');
  } else if (isBreak) {
    showNotification('Break Time!', 'Take 5 minutes to recharge. ☕');
  }
}

function toggleSleep() {
  timerState.sleeping = !timerState.sleeping;
  
  if (timerState.sleeping) {
    if (timerState.endTime) {
      timerState.remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
    }
    stopTimerInterval();
    showNotification('Timer Paused', 'Your session is paused. Click Resume when ready.');
  } else {
    if (timerState.running && timerState.remaining > 0) {
      timerState.endTime = Date.now() + timerState.remaining * 1000;
      startTimerInterval();
      showNotification('Timer Resumed', 'Back to it! 💪');
    }
  }
  
  saveTimerState();
  updateTrayIcon();
  
  if (window && !window.isDestroyed()) {
    window.webContents.send('timer-updated', timerState);
  }
}

function startBreak() {
  startTimer(true);
}

function startTimerInterval() {
  stopTimerInterval();
  timerInterval = setInterval(() => {
    if (timerState.running && !timerState.sleeping) {
      const remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
      
      if (remaining <= 0) {
        timerComplete();
      } else {
        // Update tray every 5 seconds to keep it fresh
        if (remaining % 5 === 0) {
          updateTrayIcon();
        }
      }
    }
  }, 1000);
}

function stopTimerInterval() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function timerComplete() {
  timerState.running = false;
  timerState.checkinPending = true;
  timerState.remaining = 0;
  stopTimerInterval();
  saveTimerState();
  updateTrayIcon();
  
  // Show notification
  const title = timerState.isBreak ? 'Break Complete!' : 'Session Complete! 🎉';
  const message = timerState.isBreak 
    ? 'Break\'s over! Ready to get back to work?' 
    : 'Great work! What did you accomplish?';
  
  showNotification(title, message);
  
  // Open window for check-in
  showWindow();
  
  if (window && !window.isDestroyed()) {
    window.webContents.send('timer-complete', timerState);
  }
}

function showNotification(title, body) {
  // Use tray balloon on Windows, Notification on Mac
  if (process.platform === 'darwin') {
    const notification = new (require('electron').Notification)({
      title: title,
      body: body,
      silent: false
    });
    notification.show();
  } else {
    tray.displayBalloon({
      iconType: 'info',
      title: title,
      content: body
    });
  }
}

// Data persistence
function saveTimerState() {
  store.set('timerState', timerState);
}

function loadTimerState() {
  const saved = store.get('timerState');
  if (saved) {
    timerState = saved;
    // Check if it's a new day
    const today = new Date().toDateString();
    if (timerState.lastSessionDate !== today) {
      // Reset for new day
      timerState.running = false;
      timerState.sleeping = false;
      timerState.checkinPending = false;
      timerState.remaining = WORK_DURATION;
    } else if (timerState.running && timerState.endTime) {
      // Resume from saved state
      const remaining = Math.ceil((timerState.endTime - Date.now()) / 1000);
      if (remaining <= 0) {
        timerState.running = false;
        timerState.checkinPending = true;
        timerState.remaining = 0;
      } else {
        timerState.remaining = remaining;
      }
    }
  }
}

// IPC handlers
ipcMain.handle('get-tasks', () => store.get('tasks', []));
ipcMain.handle('save-tasks', (event, tasks) => store.set('tasks', tasks));
ipcMain.handle('get-timer-state', () => timerState);
ipcMain.handle('save-timer-state', (event, state) => {
  timerState = state;
  saveTimerState();
  updateTrayIcon();
});
ipcMain.handle('start-timer', () => startTimer(false));
ipcMain.handle('start-break', () => startBreak());
ipcMain.handle('toggle-sleep', () => toggleSleep());
ipcMain.handle('submit-checkin', (event, data) => {
  const tasks = store.get('tasks', []);
  const task = tasks.find(t => t.id === data.taskId);
  if (task) {
    task.sessions = (task.sessions || 0) + 1;
    task.logs = task.logs || [];
    task.logs.push({
      timestamp: Date.now(),
      activity: data.activity,
      duration: timerState.isBreak ? 5 : 15
    });
    store.set('tasks', tasks);
    timerState.selectedTaskId = data.taskId;
  }
  
  timerState.isBreak = false;
  timerState.checkinPending = false;
  startTimer(false, true);
});
ipcMain.handle('export-data', async () => {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    version: '1.0.0',
    tasks: store.get('tasks', []),
    timerState
  }, null, 2);
});
ipcMain.handle('import-data', async (event, jsonData) => {
  try {
    const data = JSON.parse(jsonData);
    if (data.tasks) store.set('tasks', data.tasks);
    if (data.timerState) {
      timerState = data.timerState;
      saveTimerState();
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle('clear-data', () => {
  store.clear();
  timerState = {
    running: false,
    sleeping: false,
    isBreak: false,
    endTime: null,
    remaining: WORK_DURATION,
    selectedTaskId: null,
    checkinPending: false
  };
  saveTimerState();
  updateTrayIcon();
});

// Create main window - Beautiful macOS style
function createWindow() {
  if (window && !window.isDestroyed()) {
    window.focus();
    return;
  }
  
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  window = new BrowserWindow({
    width: 380,
    height: 620,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      scrollBounce: true
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    vibrancy: 'popover',
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    hasShadow: true,
    shadow: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: false
  });
  
  window.loadFile('index.html');
  
  // Position window near cursor or tray
  positionWindow();
  
  // Show window with animation
  window.once('ready-to-show', () => {
    window.show();
    window.focus();
  });
  
  window.on('blur', () => {
    if (!checkinModalOpen()) {
      window.hide();
    }
  });
  
  window.on('closed', () => {
    window = null;
  });
}

function checkinModalOpen() {
  // Check if check-in modal is open - don't hide in that case
  return timerState.checkinPending;
}

function positionWindow() {
  if (!window) return;
  
  const trayBounds = tray.getBounds();
  const windowBounds = window.getBounds();
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  
  // Default position: center the window horizontally above the tray
  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  let y = Math.round(trayBounds.y - windowBounds.height - 10);
  
  // Ensure window stays on screen
  if (x < 10) x = 10;
  if (x + windowBounds.width > screenWidth - 10) {
    x = screenWidth - windowBounds.width - 10;
  }
  if (y < 10) {
    // If too close to top, show below tray
    y = Math.round(trayBounds.y + trayBounds.height + 10);
  }
  
  window.setPosition(x, y, false);
}

function showWindow() {
  if (!window || window.isDestroyed()) {
    createWindow();
  } else {
    positionWindow();
    window.show();
    window.focus();
  }
}

// Create settings window
function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  
  settingsWindow = new BrowserWindow({
    width: 700,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '15-Minute Tracker Settings',
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    backgroundColor: '#f5f5f5'
  });
  
  settingsWindow.loadFile('settings.html');
  
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Create tray
function createTray() {
  // Use a template image for macOS (follows dark/light mode)
  const iconPath = path.join(__dirname, 'icons', 'iconTemplate.png');
  let icon;
  
  try {
    icon = nativeImage.createFromPath(iconPath);
    icon.setTemplateImage(true);
  } catch {
    // Fallback: create colored circle icon
    const svgBuffer = Buffer.from(`
      <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
        <circle cx="11" cy="11" r="10" fill="#2196F3"/>
        <text x="11" y="15" text-anchor="middle" fill="white" font-family="system-ui" font-size="12" font-weight="600">15</text>
      </svg>
    `);
    icon = nativeImage.createFromBuffer(svgBuffer);
  }
  
  tray = new Tray(icon);
  tray.setToolTip('15-Minute Tracker');
  
  // Single click to show/hide
  tray.on('click', (event, bounds) => {
    if (window && window.isVisible()) {
      window.hide();
    } else {
      showWindow();
    }
  });
  
  // Right click for menu
  tray.on('right-click', (event, bounds) => {
    tray.popUpContextMenu();
  });
  
  updateContextMenu();
  updateTrayIcon();
}

// App event handlers
app.whenReady().then(() => {
  loadTimerState();
  createTray();
  
  // AUTO-START TIMER if not running and not on first launch
  const hasLaunchedBefore = store.get('hasLaunchedBefore', false);
  if (!hasLaunchedBefore) {
    // First launch - show window but don't auto-start
    store.set('hasLaunchedBefore', true);
    setTimeout(() => showWindow(), 500);
  } else if (!timerState.running && !timerState.checkinPending && !timerState.sleeping) {
    // Auto-start the timer on subsequent launches
    startTimer(false, true);
  } else if (timerState.running && !timerState.sleeping) {
    // Resume timer if it was running
    startTimerInterval();
  }
  
  updateTrayIcon();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      showWindow();
    }
  });
});

app.on('window-all-closed', (e) => {
  // Prevent default - we want to keep running in tray
  e.preventDefault();
});

app.on('before-quit', () => {
  stopTimerInterval();
});

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showWindow();
  });
}
