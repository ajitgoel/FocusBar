const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Hide dock icon immediately on macOS (before app is ready)
if (process.platform === 'darwin') {
  app.dock.hide();
  app.setActivationPolicy('accessory'); // Prevents dock icon from showing
}

// Global variables
let tray = null;
let window = null;
let settingsWindow = null;
let timerInterval = null;

// Data storage
let appData = {
  tasks: [],
  groups: [
    { id: 'default', name: 'General', color: '#007aff' },
    { id: 'work', name: 'Work', color: '#34c759' },
    { id: 'personal', name: 'Personal', color: '#ff9500' }
  ],
  timerState: {
    running: false,
    sleeping: false,
    isBreak: false,
    endTime: null,
    remaining: 15 * 60,
    selectedTaskId: null,
    checkinPending: false,
    lastSessionDate: null
  }
};

// Data file path
function getDataPath() {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'tasks.json');
}

// Default timer duration
const WORK_DURATION = 15 * 60;
const BREAK_DURATION = 5 * 60;

// Save data to file
function saveDataToFile() {
  const dataPath = getDataPath();
  const dir = path.dirname(dataPath);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write data
  try {
    fs.writeFileSync(dataPath, JSON.stringify(appData, null, 2), 'utf8');
    console.log('Data saved to:', dataPath);
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

// Load data from file
function loadDataFromFile() {
  const dataPath = getDataPath();
  
  if (fs.existsSync(dataPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      appData = { ...appData, ...data };
      console.log('Data loaded from:', dataPath);
      return true;
    } catch (error) {
      console.error('Error loading data:', error);
      return false;
    }
  }
  return false;
}

// Update tray icon
function updateTrayIcon() {
  if (!tray) return;
  
  const state = appData.timerState;
  let displayText = '';
  let tooltip = '15-Minute Tracker';
  
  if (state.sleeping) {
    displayText = 'Zzz';
    tooltip = '15-Minute Tracker - Paused';
  } else if (state.running) {
    const remaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    displayText = minutes > 99 ? '99+' : minutes.toString();
    const statusText = state.isBreak ? 'Break' : 'Focus';
    tooltip = `${statusText} - ${minutes} min remaining`;
  } else if (state.checkinPending) {
    displayText = '!';
    tooltip = 'Session complete - Log your work';
  } else {
    displayText = '15';
    tooltip = 'Ready to focus';
  }
  
  if (process.platform === 'darwin') {
    tray.setTitle(` ${displayText}`);
  }
  tray.setToolTip(tooltip);
  updateContextMenu();
}

// Context menu
function updateContextMenu() {
  const template = [
    {
      label: '15-Minute Tracker',
      enabled: false
    },
    { type: 'separator' },
    {
      label: appData.timerState.sleeping ? '▶ Resume' : '⏸ Pause',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: toggleSleep
    },
    {
      label: appData.timerState.isBreak ? '💼 Back to Work' : '☕ Take Break',
      click: appData.timerState.isBreak ? () => startTimer(false) : startBreak
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
      click: () => app.quit()
    }
  ];
  
  tray.setContextMenu(Menu.buildFromTemplate(template));
}

// Timer functions
function startTimer(isBreak = false) {
  const duration = isBreak ? BREAK_DURATION : WORK_DURATION;
  appData.timerState = {
    ...appData.timerState,
    running: true,
    sleeping: false,
    isBreak: isBreak,
    remaining: duration,
    endTime: Date.now() + duration * 1000,
    checkinPending: false,
    lastSessionDate: new Date().toDateString()
  };
  
  saveDataToFile();
  startTimerInterval();
  updateTrayIcon();
  
  if (window && !window.isDestroyed()) {
    window.webContents.send('timer-updated', appData.timerState);
  }
}

function toggleSleep() {
  const state = appData.timerState;
  state.sleeping = !state.sleeping;
  
  if (state.sleeping) {
    if (state.endTime) {
      state.remaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
    }
    stopTimerInterval();
  } else {
    if (state.running && state.remaining > 0) {
      state.endTime = Date.now() + state.remaining * 1000;
      startTimerInterval();
    }
  }
  
  saveDataToFile();
  updateTrayIcon();
  
  if (window && !window.isDestroyed()) {
    window.webContents.send('timer-updated', state);
  }
}

function startBreak() {
  startTimer(true);
}

function startTimerInterval() {
  stopTimerInterval();
  timerInterval = setInterval(() => {
    const state = appData.timerState;
    if (state.running && !state.sleeping) {
      const remaining = Math.max(0, Math.ceil((state.endTime - Date.now()) / 1000));
      if (remaining <= 0) {
        timerComplete();
      } else if (remaining % 5 === 0) {
        updateTrayIcon();
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
  const state = appData.timerState;
  state.running = false;
  state.checkinPending = true;
  state.remaining = 0;
  stopTimerInterval();
  saveDataToFile();
  updateTrayIcon();
  
  showWindow();
  
  if (window && !window.isDestroyed()) {
    window.webContents.send('timer-complete', state);
  }
}

// IPC Handlers
ipcMain.handle('get-data', () => appData);

ipcMain.handle('get-tasks', () => appData.tasks);

ipcMain.handle('save-tasks', (event, tasks) => {
  appData.tasks = tasks;
  saveDataToFile();
});

ipcMain.handle('get-groups', () => appData.groups);

ipcMain.handle('save-groups', (event, groups) => {
  appData.groups = groups;
  saveDataToFile();
});

ipcMain.handle('get-timer-state', () => appData.timerState);

ipcMain.handle('save-timer-state', (event, state) => {
  appData.timerState = state;
  saveDataToFile();
  updateTrayIcon();
});

ipcMain.handle('start-timer', () => startTimer(false));
ipcMain.handle('start-break', () => startBreak());
ipcMain.handle('toggle-sleep', () => toggleSleep());

ipcMain.handle('submit-checkin', (event, data) => {
  const task = appData.tasks.find(t => t.id === data.taskId);
  if (task) {
    task.sessions = (task.sessions || 0) + 1;
    task.logs = task.logs || [];
    task.logs.push({
      timestamp: Date.now(),
      activity: data.activity,
      duration: appData.timerState.isBreak ? 5 : 15
    });
    appData.timerState.selectedTaskId = data.taskId;
  }
  
  appData.timerState.isBreak = false;
  appData.timerState.checkinPending = false;
  saveDataToFile();
  startTimer(false);
});

ipcMain.handle('export-data', async () => {
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    version: '1.0.0',
    tasks: appData.tasks,
    groups: appData.groups,
    timerState: appData.timerState
  }, null, 2);
});

ipcMain.handle('import-data', async (event, jsonData) => {
  try {
    const data = JSON.parse(jsonData);
    if (data.tasks) appData.tasks = data.tasks;
    if (data.groups) appData.groups = data.groups;
    if (data.timerState) appData.timerState = data.timerState;
    saveDataToFile();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-data-from-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    try {
      const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
      if (data.tasks) appData.tasks = data.tasks;
      if (data.groups) appData.groups = data.groups;
      if (data.timerState) appData.timerState = data.timerState;
      saveDataToFile();
      return { success: true, filePath: result.filePaths[0] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'No file selected' };
});

ipcMain.handle('export-data-to-file', async () => {
  const result = await dialog.showSaveDialog({
    defaultPath: `15min-tracker-backup-${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON Files', extensions: ['json'] }]
  });
  
  if (!result.canceled) {
    try {
      const data = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        tasks: appData.tasks,
        groups: appData.groups,
        timerState: appData.timerState
      };
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
      return { success: true, filePath: result.filePath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'No file selected' };
});

ipcMain.handle('clear-data', () => {
  appData.tasks = [];
  appData.timerState = {
    running: false,
    sleeping: false,
    isBreak: false,
    endTime: null,
    remaining: WORK_DURATION,
    selectedTaskId: null,
    checkinPending: false
  };
  saveDataToFile();
  updateTrayIcon();
});

ipcMain.handle('open-settings', () => openSettings());

// Window management
// Generate app icon for windows
function getAppIcon() {
  const svgBuffer = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#007AFF"/>
          <stop offset="100%" style="stop-color:#0051D5"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#bgGrad)"/>
      <circle cx="256" cy="256" r="180" fill="white" opacity="0.95"/>
      <circle cx="256" cy="256" r="160" fill="none" stroke="#007AFF" stroke-width="8" opacity="0.2"/>
      <line x1="256" y1="256" x2="400" y2="256" stroke="#007AFF" stroke-width="24" stroke-linecap="round"/>
      <line x1="256" y1="256" x2="256" y2="100" stroke="#007AFF" stroke-width="16" stroke-linecap="round"/>
      <circle cx="256" cy="256" r="24" fill="#007AFF"/>
    </svg>
  `);
  return nativeImage.createFromBuffer(svgBuffer);
}

function createWindow() {
  if (window && !window.isDestroyed()) {
    window.focus();
    return;
  }
  
  const appIcon = getAppIcon();
  
  window = new BrowserWindow({
    width: 420,
    height: 750,
    show: false,
    icon: appIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 15, y: 15 },
    vibrancy: 'popover',
    transparent: true,
    backgroundColor: '#00000000',
    roundedCorners: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true // Hide from taskbar on Windows
  });
  
  window.loadFile('index.html');
  positionWindow();
  
  window.once('ready-to-show', () => {
    window.show();
    window.focus();
    // Send current timer state to renderer
    window.webContents.send('timer-updated', appData.timerState);
  });
  
  window.on('blur', () => {
    if (!appData.timerState.checkinPending) {
      window.hide();
    }
  });
  
  window.on('closed', () => {
    window = null;
  });
}

function positionWindow() {
  if (!window || !tray) return;
  
  const trayBounds = tray.getBounds();
  const windowBounds = window.getBounds();
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize;
  
  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
  let y = Math.round(trayBounds.y - windowBounds.height - 10);
  
  if (x < 10) x = 10;
  if (x + windowBounds.width > screenWidth - 10) {
    x = screenWidth - windowBounds.width - 10;
  }
  if (y < 10) {
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

function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus();
    return;
  }
  
  const appIcon = getAppIcon();
  
  settingsWindow = new BrowserWindow({
    width: 700,
    height: 600,
    icon: appIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: '15-Minute Tracker Settings',
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    skipTaskbar: true
  });
  
  settingsWindow.loadFile('settings.html');
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// Create tray
function createTray() {
  // Create a nice clock/timer icon for menu bar
  const svgBuffer = Buffer.from(`
    <svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="trayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#007AFF"/>
          <stop offset="100%" style="stop-color:#0051D5"/>
        </linearGradient>
      </defs>
      <circle cx="11" cy="11" r="10" fill="url(#trayGrad)"/>
      <circle cx="11" cy="11" r="8" fill="white" opacity="0.9"/>
      <circle cx="11" cy="11" r="7" fill="none" stroke="#007AFF" stroke-width="0.8" opacity="0.3"/>
      
      <!-- Clock marks -->
      <line x1="11" y1="4.5" x2="11" y2="5.5" stroke="#007AFF" stroke-width="1"/>
      <line x1="17.5" y1="11" x2="16.5" y2="11" stroke="#007AFF" stroke-width="1"/>
      <line x1="11" y1="17.5" x2="11" y2="16.5" stroke="#007AFF" stroke-width="1"/>
      <line x1="4.5" y1="11" x2="5.5" y2="11" stroke="#007AFF" stroke-width="1"/>
      
      <!-- Clock hands showing 3:00 -->
      <line x1="11" y1="11" x2="15" y2="11" stroke="#007AFF" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="11" y1="11" x2="11" y2="6" stroke="#007AFF" stroke-width="1" stroke-linecap="round"/>
      
      <!-- Center dot -->
      <circle cx="11" cy="11" r="1.2" fill="#007AFF"/>
    </svg>
  `);
  
  const icon = nativeImage.createFromBuffer(svgBuffer);
  tray = new Tray(icon);
  tray.setToolTip('15-Minute Tracker');
  
  tray.on('click', () => {
    if (window && window.isVisible()) {
      window.hide();
    } else {
      showWindow();
    }
  });
  
  tray.on('right-click', () => {
    tray.popUpContextMenu();
  });
  
  updateContextMenu();
  updateTrayIcon();
}

// App lifecycle
app.whenReady().then(() => {
  console.log('App ready - initializing...');
  
  // Hide from dock (menu bar app only)
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
  
  // Set app icon
  const svgIconBuffer = Buffer.from(`
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#007AFF"/>
          <stop offset="100%" style="stop-color:#0051D5"/>
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#bgGrad)"/>
      <circle cx="256" cy="256" r="180" fill="white" opacity="0.95"/>
      <circle cx="256" cy="256" r="160" fill="none" stroke="#007AFF" stroke-width="8" opacity="0.2"/>
      <line x1="256" y1="256" x2="400" y2="256" stroke="#007AFF" stroke-width="24" stroke-linecap="round"/>
      <line x1="256" y1="256" x2="256" y2="100" stroke="#007AFF" stroke-width="16" stroke-linecap="round"/>
      <circle cx="256" cy="256" r="24" fill="#007AFF"/>
    </svg>
  `);
  const appIcon = nativeImage.createFromBuffer(svgIconBuffer);
  
  // On macOS, set the app icon
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(appIcon);
  }
  
  // Load data from file
  const loaded = loadDataFromFile();
  console.log('Data loaded:', loaded);
  console.log('Data path:', getDataPath());
  
  createTray();
  
  const state = appData.timerState;
  if (state.checkinPending) {
    setTimeout(() => showWindow(), 300);
  } else if (state.sleeping) {
    updateTrayIcon();
  } else if (state.running && state.remaining > 0) {
    startTimerInterval();
    updateTrayIcon();
  } else {
    console.log('Starting fresh timer...');
    setTimeout(() => startTimer(false), 500);
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      showWindow();
    }
  });
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', () => {
  console.log('App quitting - saving data...');
  stopTimerInterval();
  const saved = saveDataToFile();
  console.log('Data saved on quit:', saved);
});

app.on('will-quit', () => {
  console.log('App will quit - final save...');
  saveDataToFile();
});

// Handle SIGTERM and SIGINT for graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received - saving data...');
  saveDataToFile();
  app.quit();
});

process.on('SIGINT', () => {
  console.log('SIGINT received - saving data...');
  saveDataToFile();
  app.quit();
});

// Single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showWindow();
  });
}
