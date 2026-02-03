const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Get all data
  getData: () => ipcRenderer.invoke('get-data'),
  
  // Tasks
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  saveTasks: (tasks) => ipcRenderer.invoke('save-tasks', tasks),
  startTask: (taskId) => ipcRenderer.invoke('start-task', taskId),
  stopTask: (taskId) => ipcRenderer.invoke('stop-task', taskId),
  getActiveTask: () => ipcRenderer.invoke('get-active-task'),
  
  // Groups
  getGroups: () => ipcRenderer.invoke('get-groups'),
  saveGroups: (groups) => ipcRenderer.invoke('save-groups', groups),
  
  // Timer
  getTimerState: () => ipcRenderer.invoke('get-timer-state'),
  saveTimerState: (state) => ipcRenderer.invoke('save-timer-state', state),
  startTimer: () => ipcRenderer.invoke('start-timer'),
  startBreak: () => ipcRenderer.invoke('start-break'),
  toggleSleep: () => ipcRenderer.invoke('toggle-sleep'),
  submitCheckin: (data) => ipcRenderer.invoke('submit-checkin', data),
  
  // Import/Export
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: (jsonData) => ipcRenderer.invoke('import-data', jsonData),
  importDataFromFile: () => ipcRenderer.invoke('import-data-from-file'),
  exportDataToFile: () => ipcRenderer.invoke('export-data-to-file'),
  clearData: () => ipcRenderer.invoke('clear-data'),
  
  // Settings
  openSettings: () => ipcRenderer.invoke('open-settings'),
  
  // Events
  onTimerUpdate: (callback) => ipcRenderer.on('timer-updated', callback),
  onTimerComplete: (callback) => ipcRenderer.on('timer-complete', callback),
  onTaskUpdate: (callback) => ipcRenderer.on('task-updated', callback),
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
