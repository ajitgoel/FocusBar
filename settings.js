// settings.js - Settings page functionality for desktop app

let tasks = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Load and display statistics
  await loadStats();
  
  // Setup event listeners
  document.getElementById('btn-export').addEventListener('click', exportData);
  document.getElementById('btn-import').addEventListener('click', importData);
  document.getElementById('btn-clear').addEventListener('click', clearAllData);
  document.getElementById('back-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.close();
  });
});

// Load and display statistics
async function loadStats() {
  try {
    tasks = await window.electronAPI.getTasks();
    
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

// Export data to JSON file
async function exportData() {
  try {
    const jsonData = await window.electronAPI.exportData();
    
    // Create a blob and download
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const date = new Date().toISOString().split('T')[0];
    const filename = `15min-tracker-backup-${date}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showStatus('Data exported successfully!', 'success');
  } catch (error) {
    showStatus(`Export failed: ${error.message}`, 'error');
  }
}

// Import data from JSON file
async function importData() {
  const fileInput = document.getElementById('import-file');
  
  if (!fileInput.files || fileInput.files.length === 0) {
    showStatus('Please select a file to import', 'error');
    return;
  }
  
  const file = fileInput.files[0];
  
  try {
    const text = await file.text();
    
    // Validate it's proper JSON
    const data = JSON.parse(text);
    
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('Invalid file format: tasks array not found');
    }
    
    // Confirm import
    const taskCount = data.tasks.length;
    const sessionCount = data.tasks.reduce((sum, t) => sum + (t.sessions || 0), 0);
    
    if (!confirm(`Import ${taskCount} tasks with ${sessionCount} sessions? This will replace your current data.`)) {
      return;
    }
    
    // Send to main process
    const result = await window.electronAPI.importData(text);
    
    if (result.success) {
      showStatus(`Successfully imported ${taskCount} tasks!`, 'success');
      fileInput.value = '';
      
      // Refresh stats
      await loadStats();
    } else {
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
