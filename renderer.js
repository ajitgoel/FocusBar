// renderer.js - Polished macOS-style UI controller

let timerState = {
  running: false,
  sleeping: false,
  isBreak: false,
  endTime: null,
  remaining: 15 * 60,
  selectedTaskId: null,
  checkinPending: false
};

let tasks = [];
let updateInterval = null;

// DOM Elements
const timerDisplay = document.getElementById('timer-display');
const statusBadge = document.getElementById('status-badge');
const btnSleep = document.getElementById('btn-sleep');
const btnBreak = document.getElementById('btn-break');
const btnSettings = document.getElementById('btn-settings');
const checkinModal = document.getElementById('checkin-modal');
const taskSelect = document.getElementById('task-select');
const activityInput = document.getElementById('activity-input');
const btnCheckinSubmit = document.getElementById('btn-checkin-submit');
const btnAddTask = document.getElementById('btn-add-task');
const addTaskForm = document.getElementById('add-task-form');
const newTaskInput = document.getElementById('new-task-input');
const btnSaveTask = document.getElementById('btn-save-task');
const btnCancelTask = document.getElementById('btn-cancel-task');
const taskList = document.getElementById('task-list');
const selectedTaskInfo = document.getElementById('selected-task-info');
const currentTaskName = document.getElementById('current-task-name');
const currentTaskSessions = document.getElementById('current-task-sessions');
const currentTaskMinutes = document.getElementById('current-task-minutes');

// Initialize
async function init() {
  try {
    tasks = await window.electronAPI.getTasks();
    timerState = await window.electronAPI.getTimerState();
    
    setupEventListeners();
    setupIPCListeners();
    
    // Start display update loop
    updateInterval = setInterval(updateTimerDisplay, 1000);
    
    // Initial render
    updateTimerDisplay();
    updateStatusBadge();
    renderTasks();
    updateSelectedTaskInfo();
    updateSleepButton();
    
    // Show check-in if pending
    if (timerState.checkinPending) {
      showCheckinModal();
    }
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

// Event listeners
function setupEventListeners() {
  btnSleep.addEventListener('click', async () => {
    await window.electronAPI.toggleSleep();
  });

  btnBreak.addEventListener('click', async () => {
    await window.electronAPI.startBreak();
  });

  btnSettings.addEventListener('click', () => {
    window.electronAPI.openSettings?.();
  });

  btnCheckinSubmit.addEventListener('click', submitCheckin);
  
  activityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') submitCheckin();
  });

  btnAddTask.addEventListener('click', () => {
    addTaskForm.classList.remove('hidden');
    newTaskInput.focus();
  });

  btnSaveTask.addEventListener('click', addTask);
  btnCancelTask.addEventListener('click', () => {
    addTaskForm.classList.add('hidden');
    newTaskInput.value = '';
  });

  newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
}

// IPC listeners
function setupIPCListeners() {
  window.electronAPI.onTimerUpdate((event, newState) => {
    timerState = newState;
    updateTimerDisplay();
    updateStatusBadge();
    updateSleepButton();
  });

  window.electronAPI.onTimerComplete((event, newState) => {
    timerState = newState;
    updateTimerDisplay();
    updateStatusBadge();
    showCheckinModal();
  });
}

// Timer display update
function updateTimerDisplay() {
  let remaining = timerState.remaining;
  
  if (timerState.running && !timerState.sleeping && timerState.endTime) {
    remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
  }
  
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  // Update styling
  timerDisplay.classList.toggle('break', timerState.isBreak);
  timerDisplay.classList.toggle('paused', timerState.sleeping);
}

// Status badge update
function updateStatusBadge() {
  let status = 'Ready';
  let className = '';
  
  if (timerState.sleeping) {
    status = 'Paused';
    className = 'paused';
  } else if (timerState.isBreak) {
    status = 'On Break';
    className = 'break';
  } else if (timerState.running) {
    status = 'Focusing';
    className = 'active';
  } else if (timerState.checkinPending) {
    status = 'Check-in';
  }
  
  statusBadge.textContent = status;
  statusBadge.className = 'status-badge ' + className;
}

// Sleep button update
function updateSleepButton() {
  btnSleep.textContent = timerState.sleeping ? 'Resume' : 'Pause';
}

// Check-in modal
function showCheckinModal() {
  taskSelect.innerHTML = '<option value="">Select a task (optional)</option>';
  
  const activeTasks = tasks.filter(t => !t.completed);
  activeTasks.forEach(task => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = task.name;
    taskSelect.appendChild(option);
  });
  
  if (timerState.selectedTaskId) {
    const task = tasks.find(t => t.id === timerState.selectedTaskId);
    if (task && !task.completed) {
      taskSelect.value = timerState.selectedTaskId;
    }
  }
  
  activityInput.value = '';
  checkinModal.classList.add('visible');
  activityInput.focus();
}

async function submitCheckin() {
  const taskId = taskSelect.value;
  const activity = activityInput.value.trim();
  
  checkinModal.classList.remove('visible');
  
  await window.electronAPI.submitCheckin({
    taskId: taskId,
    activity: activity
  });
  
  // Update local data
  if (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.sessions = (task.sessions || 0) + 1;
      timerState.selectedTaskId = taskId;
    }
  }
  
  renderTasks();
  updateSelectedTaskInfo();
  
  // Reload timer state
  timerState = await window.electronAPI.getTimerState();
  updateTimerDisplay();
  updateStatusBadge();
}

// Task management
async function addTask() {
  const name = newTaskInput.value.trim();
  if (!name) return;
  
  const task = {
    id: Date.now().toString(),
    name: name,
    sessions: 0,
    completed: false,
    logs: [],
    createdAt: Date.now()
  };
  
  tasks.push(task);
  await window.electronAPI.saveTasks(tasks);
  
  renderTasks();
  newTaskInput.value = '';
  addTaskForm.classList.add('hidden');
}

async function toggleTaskComplete(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    await window.electronAPI.saveTasks(tasks);
    renderTasks();
  }
}

async function selectTask(taskId) {
  timerState.selectedTaskId = taskId;
  await window.electronAPI.saveTimerState(timerState);
  renderTasks();
  updateSelectedTaskInfo();
}

async function deleteTask(taskId, event) {
  event.stopPropagation();
  if (!confirm('Delete this task?')) return;
  
  tasks = tasks.filter(t => t.id !== taskId);
  if (timerState.selectedTaskId === taskId) {
    timerState.selectedTaskId = null;
    await window.electronAPI.saveTimerState(timerState);
  }
  
  await window.electronAPI.saveTasks(tasks);
  renderTasks();
  updateSelectedTaskInfo();
}

function updateSelectedTaskInfo() {
  if (timerState.selectedTaskId) {
    const task = tasks.find(t => t.id === timerState.selectedTaskId);
    if (task) {
      currentTaskName.textContent = task.name;
      currentTaskSessions.textContent = task.sessions || 0;
      currentTaskMinutes.textContent = (task.sessions || 0) * 15;
      selectedTaskInfo.classList.remove('hidden');
      return;
    }
  }
  selectedTaskInfo.classList.add('hidden');
}

function renderTasks() {
  taskList.innerHTML = '';
  
  const sortedTasks = [
    ...tasks.filter(t => !t.completed),
    ...tasks.filter(t => t.completed)
  ];
  
  if (sortedTasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">No tasks yet</div>
      </div>
    `;
    return;
  }
  
  sortedTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.id === timerState.selectedTaskId ? 'selected' : ''} ${task.completed ? 'completed' : ''}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'task-checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskComplete(task.id);
    });
    
    const content = document.createElement('div');
    content.className = 'task-content';
    
    const name = document.createElement('div');
    name.className = 'task-name';
    name.textContent = task.name;
    
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.textContent = `${task.sessions || 0} sessions • ${(task.sessions || 0) * 15} min`;
    
    content.appendChild(name);
    content.appendChild(meta);
    
    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'task-delete';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => deleteTask(task.id, e));
    
    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(deleteBtn);
    li.addEventListener('click', () => selectTask(task.id));
    
    taskList.appendChild(li);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Cleanup
window.addEventListener('beforeunload', () => {
  if (updateInterval) clearInterval(updateInterval);
  window.electronAPI.removeAllListeners('timer-updated');
  window.electronAPI.removeAllListeners('timer-complete');
});
