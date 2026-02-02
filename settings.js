// settings.js - Settings page functionality for desktop app

let appData = { tasks: [], groups: [] };

document.addEventListener('DOMContentLoaded', async () => {
  // Load and display statistics
  await loadStats();
  
  // Setup event listeners
  document.getElementById('btn-export').addEventListener('click', exportDataToFile);
  document.getElementById('btn-import').addEventListener('click', importDataFromFile);
  document.getElementById('btn-clear').addEventListener('click', clearAllData);
  document.getElementById('back-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.close();
  });
});

// Load and display statistics
async function loadStats() {
  try {
    appData = await window.electronAPI.getData();
    const tasks = appData.tasks || [];
    const groups = appData.groups || [];
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed).length;
    const totalSessions = tasks.reduce((sum, t) => sum + (t.sessions || 0), 0);
    const totalMinutes = tasks.reduce((sum, t) => {
      return sum + (t.logs || []).reduce((logSum, log) => logSum + (log.duration || 15), 0);
    }, 0);
    
    document.getElementById('stat-total-tasks').textContent = totalTasks;
    document.getElementById('stat-completed-tasks').textContent = completedTasks;
    document.getElementById('stat-total-sessions').textContent = totalSessions;
    document.getElementById('stat-total-minutes').textContent = totalMinutes;
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Export data using file dialog
async function exportDataToFile() {
  try {
    const result = await window.electronAPI.exportDataToFile();
    
    if (result.success) {
      showStatus(`Data exported to: ${result.filePath}`, 'success');
    } else {
      showStatus(`Export failed: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Export failed: ${error.message}`, 'error');
  }
}

// Import data using file dialog
async function importDataFromFile() {
  if (!confirm('This will replace all your current tasks and groups. Continue?')) {
    return;
  }
  
  try {
    const result = await window.electronAPI.importDataFromFile();
    
    if (result.success) {
      showStatus(`Data imported from: ${result.filePath}`, 'success');
      await loadStats();
    } else if (result.error !== 'No file selected') {
      showStatus(`Import failed: ${result.error}`, 'error');
    }
  } catch (error) {
    showStatus(`Error: ${error.message}`, 'error');
  }
}

// Clear all data
async function clearAllData() {
  if (!confirm('Are you sure? This will delete all tasks and reset the timer. This action cannot be undone.')) {
    return;
  }
  
  if (!confirm('Really sure? All your progress will be lost forever.')) {
    return;
  }
  
  try {
    await window.electronAPI.clearData();
    await loadStats();
    showStatus('All data has been cleared', 'success');
  } catch (error) {
    showStatus(`Error clearing data: ${error.message}`, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusDiv = document.getElementById('import-status');
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'status-message';
  }, 5000);
}
