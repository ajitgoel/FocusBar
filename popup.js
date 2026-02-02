// popup.js - Main UI controller
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

// DOM Elements
const timerDisplay = document.getElementById('timer-display');
const timerStatus = document.getElementById('timer-status');
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
const currentTaskDetails = document.getElementById('current-task-details');

// Edit task modal elements
const editTaskModal = document.getElementById('edit-task-modal');
const editTaskName = document.getElementById('edit-task-name');
const editTaskDetails = document.getElementById('edit-task-details');
const btnEditSave = document.getElementById('btn-edit-save');
const btnEditCancel = document.getElementById('btn-edit-cancel');

let editingTaskId = null;

// History section elements
const historySection = document.getElementById('history-section');
const historyList = document.getElementById('history-list');
const btnToggleHistory = document.getElementById('btn-toggle-history');
let historyVisible = false;

// Initialize
async function init() {
  await loadTasks();
  await loadTimerState();
  setupEventListeners();
  updateTimerDisplay();
  renderTasks();
  updateSelectedTaskInfo();
  
  // Auto-start timer if not running
  if (!timerState.running && !timerState.checkinPending) {
    startTimer();
  }
  
  // Check for pending check-in
  if (timerState.checkinPending) {
    showCheckinModal();
  }
  
  // Start display update loop
  setInterval(updateTimerDisplay, 1000);
}

// Load data from storage
async function loadTasks() {
  const result = await chrome.storage.local.get('tasks');
  tasks = result.tasks || [];
}

async function loadTimerState() {
  const result = await chrome.storage.local.get('timerState');
  if (result.timerState) {
    timerState = result.timerState;
    updateSleepButton();
    updateStatusDisplay();
  }
}

// Save data to storage
async function saveTasks() {
  await chrome.storage.local.set({ tasks });
}

async function saveTimerState() {
  await chrome.storage.local.set({ timerState });
}

// Timer functions
function startTimer() {
  const duration = timerState.isBreak ? 5 * 60 : 15 * 60;
  timerState.running = true;
  timerState.remaining = duration;
  timerState.endTime = Date.now() + duration * 1000;
  timerState.checkinPending = false;
  
  chrome.alarms.create('timer-alarm', { delayInMinutes: duration / 60 });
  
  updateTimerDisplay();
  updateStatusDisplay();
  saveTimerState();
}

function toggleSleep() {
  timerState.sleeping = !timerState.sleeping;
  
  if (timerState.sleeping) {
    if (timerState.endTime) {
      timerState.remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
    }
    chrome.alarms.clear('timer-alarm');
  } else {
    if (timerState.running && timerState.remaining > 0) {
      timerState.endTime = Date.now() + timerState.remaining * 1000;
      chrome.alarms.create('timer-alarm', { delayInMinutes: timerState.remaining / 60 });
    }
  }
  
  updateSleepButton();
  updateStatusDisplay();
  saveTimerState();
}

function startBreak() {
  timerState.isBreak = true;
  startTimer();
  updateStatusDisplay();
}

function showCheckinModal() {
  taskSelect.innerHTML = '<option value="">-- Select a task --</option>';
  tasks.forEach(task => {
    const option = document.createElement('option');
    option.value = task.id;
    option.textContent = task.name;
    taskSelect.appendChild(option);
  });
  
  if (timerState.selectedTaskId) {
    taskSelect.value = timerState.selectedTaskId;
  }
  
  activityInput.value = '';
  checkinModal.classList.remove('hidden');
  timerState.checkinPending = true;
  saveTimerState();
}

function submitCheckin() {
  const taskId = taskSelect.value;
  const activity = activityInput.value.trim();
  
  if (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      task.sessions = (task.sessions || 0) + 1;
      task.logs = task.logs || [];
      task.logs.push({
        timestamp: Date.now(),
        activity: activity,
        duration: timerState.isBreak ? 5 : 15
      });
      timerState.selectedTaskId = taskId;
    }
  }
  
  saveTasks();
  checkinModal.classList.add('hidden');
  timerState.checkinPending = false;
  timerState.isBreak = false;
  
  startTimer();
  renderTasks();
  updateSelectedTaskInfo();
  if (historyVisible) {
    renderHistory();
  }
}

// Task management
function addTask() {
  const name = newTaskInput.value.trim();
  if (name) {
    const task = {
      id: Date.now().toString(),
      name: name,
      sessions: 0,
      completed: false,
      logs: [],
      createdAt: Date.now()
    };
    tasks.push(task);
    saveTasks();
    renderTasks();
    
    newTaskInput.value = '';
    addTaskForm.classList.add('hidden');
  }
}

function toggleTaskComplete(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }
}

function selectTask(taskId) {
  timerState.selectedTaskId = taskId;
  saveTimerState();
  renderTasks();
  updateSelectedTaskInfo();
}

function deleteTask(taskId) {
  tasks = tasks.filter(t => t.id !== taskId);
  if (timerState.selectedTaskId === taskId) {
    timerState.selectedTaskId = null;
  }
  saveTasks();
  renderTasks();
  updateSelectedTaskInfo();
}

function editTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    editingTaskId = taskId;
    editTaskName.value = task.name;
    editTaskDetails.value = task.details || '';
    editTaskModal.classList.remove('hidden');
  }
}

function saveEditedTask() {
  if (editingTaskId) {
    const task = tasks.find(t => t.id === editingTaskId);
    if (task) {
      task.name = editTaskName.value.trim();
      task.details = editTaskDetails.value.trim();
      saveTasks();
      renderTasks();
      updateSelectedTaskInfo();
    }
    editingTaskId = null;
    editTaskModal.classList.add('hidden');
  }
}

function cancelEditTask() {
  editingTaskId = null;
  editTaskModal.classList.add('hidden');
}

function showTaskDetails(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task && task.details) {
    alert(`Task: ${task.name}\n\nDetails:\n${task.details}`);
  }
}

// UI Updates
function updateTimerDisplay() {
  let remaining = timerState.remaining;
  
  if (timerState.running && !timerState.sleeping && timerState.endTime) {
    remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
  }
  
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  chrome.action.setBadgeText({ text: `${minutes}m` });
  chrome.action.setBadgeBackgroundColor({ color: timerState.isBreak ? '#FF9800' : '#2196F3' });
  
  timerDisplay.classList.toggle('paused', timerState.sleeping);
  timerDisplay.classList.toggle('break', timerState.isBreak);
}

function updateStatusDisplay() {
  let status = 'Ready';
  if (timerState.sleeping) {
    status = 'Sleeping';
  } else if (timerState.isBreak) {
    status = 'Break Time';
  } else if (timerState.running) {
    status = 'Working';
  }
  timerStatus.textContent = status;
}

function updateSleepButton() {
  btnSleep.textContent = timerState.sleeping ? 'Wake Up' : 'Sleep';
  btnSleep.classList.toggle('active', timerState.sleeping);
}

function updateSelectedTaskInfo() {
  if (timerState.selectedTaskId) {
    const task = tasks.find(t => t.id === timerState.selectedTaskId);
    if (task) {
      currentTaskName.textContent = task.name;
      currentTaskSessions.textContent = task.sessions || 0;
      const totalMinutes = task.logs ? task.logs.reduce((sum, log) => sum + (log.duration || 0), 0) : (task.sessions || 0) * 15;
      currentTaskMinutes.textContent = totalMinutes;
      
      // Display task details if they exist
      if (task.details) {
        currentTaskDetails.textContent = task.details;
        currentTaskDetails.classList.remove('hidden');
      } else {
        currentTaskDetails.classList.add('hidden');
      }
      
      selectedTaskInfo.classList.remove('hidden');
      return;
    }
  }
  selectedTaskInfo.classList.add('hidden');
}

function renderTasks() {
  taskList.innerHTML = '';
  
  tasks.forEach(task => {
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
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'task-name';
    nameSpan.textContent = task.name;
    
    const sessionsSpan = document.createElement('span');
    sessionsSpan.className = 'task-sessions';
    const totalMinutes = task.logs ? task.logs.reduce((sum, log) => sum + (log.duration || 0), 0) : 0;
    sessionsSpan.textContent = `${task.sessions || 0} ses · ${totalMinutes}m`;
    
    // Add details indicator if task has details
    if (task.details) {
      const detailsIndicator = document.createElement('span');
      detailsIndicator.className = 'task-details-indicator';
      detailsIndicator.textContent = '📝';
      detailsIndicator.title = 'Has details - click task to view';
      nameSpan.appendChild(detailsIndicator);
    }
    
    const editBtn = document.createElement('span');
    editBtn.className = 'edit-task';
    editBtn.textContent = '✎';
    editBtn.title = task.details ? 'Edit task & details' : 'Edit task';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      editTask(task.id);
    });
    
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-task';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });
    
    li.appendChild(checkbox);
    li.appendChild(nameSpan);
    li.appendChild(sessionsSpan);
    li.appendChild(editBtn);
    li.appendChild(deleteBtn);
    
    li.addEventListener('click', () => selectTask(task.id));
    
    taskList.appendChild(li);
  });
}

// Event listeners
function setupEventListeners() {
  btnSleep.addEventListener('click', toggleSleep);
  btnBreak.addEventListener('click', startBreak);
  btnSettings.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  });
  
  btnCheckinSubmit.addEventListener('click', submitCheckin);
  
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
  
  // Edit task modal listeners
  btnEditSave.addEventListener('click', saveEditedTask);
  btnEditCancel.addEventListener('click', cancelEditTask);
  editTaskName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEditedTask();
  });
  editTaskDetails.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) saveEditedTask();
  });
  
  // History toggle listener
  btnToggleHistory.addEventListener('click', toggleHistory);
}

function toggleHistory() {
  historyVisible = !historyVisible;
  btnToggleHistory.textContent = historyVisible ? 'Hide' : 'Show';
  historyList.classList.toggle('hidden', !historyVisible);
  if (historyVisible) {
    renderHistory();
  }
}

function renderHistory() {
  historyList.innerHTML = '';
  
  // Collect all logs from all tasks, sorted by timestamp (newest first)
  let allLogs = [];
  tasks.forEach(task => {
    if (task.logs && task.logs.length > 0) {
      task.logs.forEach(log => {
        allLogs.push({
          ...log,
          taskName: task.name
        });
      });
    }
  });
  
  allLogs.sort((a, b) => b.timestamp - a.timestamp);
  
  if (allLogs.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'history-item';
    emptyMsg.textContent = 'No sessions recorded yet. Complete a session to see history.';
    emptyMsg.style.color = '#999';
    emptyMsg.style.fontStyle = 'italic';
    historyList.appendChild(emptyMsg);
    return;
  }
  
  // Show last 20 sessions
  allLogs.slice(0, 20).forEach(log => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    const taskName = document.createElement('div');
    taskName.className = 'history-task-name';
    taskName.textContent = log.taskName;
    
    const time = document.createElement('div');
    time.className = 'history-time';
    const date = new Date(log.timestamp);
    time.textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} · ${log.duration} min`;
    
    item.appendChild(taskName);
    item.appendChild(time);
    
    if (log.activity) {
      const activity = document.createElement('div');
      activity.className = 'history-activity';
      activity.textContent = log.activity;
      item.appendChild(activity);
    }
    
    historyList.appendChild(item);
  });
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'TIMER_COMPLETE') {
    timerState.running = false;
    timerState.remaining = 0;
    saveTimerState();
    showCheckinModal();
    updateTimerDisplay();
  }
});

// Initialize
init();
