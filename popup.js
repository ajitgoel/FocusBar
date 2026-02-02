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
      currentTaskMinutes.textContent = (task.sessions || 0) * 15;
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
    sessionsSpan.textContent = `${task.sessions || 0} sessions`;
    
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
