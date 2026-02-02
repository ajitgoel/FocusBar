const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Task management
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  saveTasks: (tasks) => ipcRenderer.invoke('save-tasks', tasks),
  
  // Timer management
  getTimerState: () => ipcRenderer.invoke('get-timer-state'),
  saveTimerState: (state) => ipcRenderer.invoke('save-timer-state', state),
  startTimer: () => ipcRenderer.invoke('start-timer'),
  startBreak: () => ipcRenderer.invoke('start-break'),
  toggleSleep: () => ipcRenderer.invoke('toggle-sleep'),
  submitCheckin: (data) => ipcRenderer.invoke('submit-checkin', data),
  
  // Data import/export
  exportData: () => ipcRenderer.invoke('export-data'),
  importData: (jsonData) => ipcRenderer.invoke('import-data', jsonData),
  clearData: () => ipcRenderer.invoke('clear-data'),
  
  // Event listeners
  onTimerUpdate: (callback) => ipcRenderer.on('timer-updated', callback),
  onTimerComplete: (callback) => ipcRenderer.on('timer-complete', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
