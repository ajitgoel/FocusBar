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
let groups = [];
let expandedGroups = new Set();
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
const newTaskNameInput = document.getElementById('new-task-name-input');
const checkinGroupSelect = document.getElementById('checkin-group-select');
const btnCheckinSubmit = document.getElementById('btn-checkin-submit');
const btnAddTask = document.getElementById('btn-add-task');
const addTaskForm = document.getElementById('add-task-form');
const newTaskInput = document.getElementById('new-task-input');
const newTaskGroupSelect = document.getElementById('new-task-group-select');
const btnNewGroup = document.getElementById('btn-new-group');
const newGroupForm = document.getElementById('new-group-form');
const newGroupInput = document.getElementById('new-group-input');
const btnSaveTask = document.getElementById('btn-save-task');
const btnCancelTask = document.getElementById('btn-cancel-task');
const taskList = document.getElementById('task-list');
const selectedTaskInfo = document.getElementById('selected-task-info');
const currentTaskName = document.getElementById('current-task-name');
const currentTaskSessions = document.getElementById('current-task-sessions');
const currentTaskMinutes = document.getElementById('current-task-minutes');
const currentTaskDetails = document.getElementById('current-task-details');

// Edit Task Modal Elements
const editTaskOverlay = document.getElementById('edit-task-overlay');
const editTaskName = document.getElementById('edit-task-name');
const editTaskDetails = document.getElementById('edit-task-details');
const btnEditSave = document.getElementById('btn-edit-save');
const btnEditCancel = document.getElementById('btn-edit-cancel');
const btnEditCurrentTask = document.getElementById('btn-edit-current-task');

let editingTaskId = null;

// Initialize
async function init() {
  try {
    tasks = await window.electronAPI.getTasks();
    groups = await window.electronAPI.getGroups?.() || [];
    timerState = await window.electronAPI.getTimerState();

    // Initialize default groups if none exist
    if (groups.length === 0) {
      groups = [
        { id: 'group_default_work', name: 'Work', createdAt: Date.now() },
        { id: 'group_default_personal', name: 'Personal', createdAt: Date.now() }
      ];
      if (window.electronAPI.saveGroups) {
        await window.electronAPI.saveGroups(groups);
      }
    }

    // Expand all groups by default
    groups.forEach(g => expandedGroups.add(g.id));
    expandedGroups.add('ungrouped');
    expandedGroups.add('completed');

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
    if (timerState.isBreak) {
      // End break and go back to work
      await window.electronAPI.startTimer();
    } else {
      // Start a break
      await window.electronAPI.startBreak();
    }
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
    populateGroupSelects();
    newTaskInput.focus();
  });

  btnSaveTask.addEventListener('click', addTask);
  btnCancelTask.addEventListener('click', () => {
    addTaskForm.classList.add('hidden');
    newTaskInput.value = '';
    newTaskGroupSelect.value = '';
    newGroupForm.classList.add('hidden');
    newGroupInput.value = '';
  });

  newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });

  btnNewGroup.addEventListener('click', () => {
    newGroupForm.classList.toggle('hidden');
    if (!newGroupForm.classList.contains('hidden')) {
      newGroupInput.focus();
    }
  });

  newGroupInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      createNewGroupFromInput();
    }
  });

  // Edit Task Modal Event Listeners
  btnEditSave.addEventListener('click', saveEditedTask);
  btnEditCancel.addEventListener('click', cancelEditTask);
  btnEditCurrentTask.addEventListener('click', () => {
    if (timerState.selectedTaskId) {
      editTask(timerState.selectedTaskId);
    }
  });

  editTaskName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEditedTask();
  });

  currentTaskDetails.addEventListener('click', () => {
    if (timerState.selectedTaskId) {
      editTask(timerState.selectedTaskId);
    }
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

  // Update break button text based on state
  updateBreakButton();
}

function updateBreakButton() {
  if (timerState.isBreak) {
    btnBreak.textContent = 'Back to Work';
    btnBreak.classList.remove('btn-break');
    btnBreak.classList.add('btn-primary');
  } else {
    btnBreak.textContent = 'Break';
    btnBreak.classList.remove('btn-primary');
    btnBreak.classList.add('btn-break');
  }
}

// Sleep button update
function updateSleepButton() {
  btnSleep.textContent = timerState.sleeping ? 'Resume' : 'Pause';
}

// Populate group dropdowns
function populateGroupSelects() {
  const selects = [newTaskGroupSelect, checkinGroupSelect];

  selects.forEach(select => {
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">No group</option>';

    groups.forEach(group => {
      const option = document.createElement('option');
      option.value = group.id;
      option.textContent = group.name;
      select.appendChild(option);
    });

    // Restore selection if still valid
    if (currentValue && groups.find(g => g.id === currentValue)) {
      select.value = currentValue;
    }
  });
}

// Create new group from input
async function createNewGroupFromInput() {
  const name = newGroupInput.value.trim();
  if (!name) return;

  const group = {
    id: 'group_' + Date.now().toString(),
    name: name,
    createdAt: Date.now()
  };

  groups.push(group);
  if (window.electronAPI.saveGroups) {
    await window.electronAPI.saveGroups(groups);
  }

  newGroupInput.value = '';
  newGroupForm.classList.add('hidden');
  populateGroupSelects();

  // Select the new group
  newTaskGroupSelect.value = group.id;
}

// Check-in modal
function showCheckinModal() {
  taskSelect.innerHTML = '<option value="">Select a task (optional)</option>';
  populateGroupSelects();

  const activeTasks = tasks.filter(t => !t.completed);
  activeTasks.forEach(task => {
    const option = document.createElement('option');
    option.value = task.id;
    const group = groups.find(g => g.id === task.groupId);
    option.textContent = group ? `${task.name} (${group.name})` : task.name;
    taskSelect.appendChild(option);
  });

  if (timerState.selectedTaskId) {
    const task = tasks.find(t => t.id === timerState.selectedTaskId);
    if (task && !task.completed) {
      taskSelect.value = timerState.selectedTaskId;
    }
  }

  activityInput.value = '';
  newTaskNameInput.value = '';
  checkinGroupSelect.value = '';
  checkinModal.classList.add('visible');
  activityInput.focus();
}

async function submitCheckin() {
  const taskId = taskSelect.value;
  const newTaskName = newTaskNameInput?.value?.trim();
  const groupId = checkinGroupSelect?.value || '';
  const activity = activityInput.value.trim();

  checkinModal.classList.remove('visible');

  let targetTaskId = taskId;

  // Create new task if name provided
  if (newTaskName && !taskId) {
    const newTask = {
      id: Date.now().toString(),
      name: newTaskName,
      sessions: 0,
      completed: false,
      logs: [],
      groupId: groupId,
      createdAt: Date.now()
    };
    tasks.push(newTask);
    targetTaskId = newTask.id;
    await window.electronAPI.saveTasks(tasks);
  }

  await window.electronAPI.submitCheckin({
    taskId: targetTaskId,
    activity: activity
  });

  // Update local data
  if (targetTaskId) {
    const task = tasks.find(t => t.id === targetTaskId);
    if (task) {
      task.sessions = (task.sessions || 0) + 1;
      timerState.selectedTaskId = targetTaskId;
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

  // Check if creating a new group
  let groupId = newTaskGroupSelect.value;
  if (!newGroupForm.classList.contains('hidden') && newGroupInput.value.trim()) {
    await createNewGroupFromInput();
    groupId = newTaskGroupSelect.value;
  }

  const task = {
    id: Date.now().toString(),
    name: name,
    sessions: 0,
    completed: false,
    logs: [],
    groupId: groupId,
    createdAt: Date.now()
  };

  tasks.push(task);
  await window.electronAPI.saveTasks(tasks);

  renderTasks();
  newTaskInput.value = '';
  newTaskGroupSelect.value = '';
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

function editTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    editingTaskId = taskId;
    editTaskName.value = task.name;
    editTaskDetails.value = task.details || '';
    editTaskOverlay.classList.add('visible');
    editTaskName.focus();
  }
}

async function saveEditedTask() {
  if (editingTaskId) {
    const task = tasks.find(t => t.id === editingTaskId);
    const newName = editTaskName.value.trim();

    if (!newName) {
      alert('Task name cannot be empty');
      return;
    }

    if (task) {
      task.name = newName;
      task.details = editTaskDetails.value.trim();
      await window.electronAPI.saveTasks(tasks);
      renderTasks();
      updateSelectedTaskInfo();
    }

    editingTaskId = null;
    editTaskOverlay.classList.remove('visible');
  }
}

function cancelEditTask() {
  editingTaskId = null;
  editTaskOverlay.classList.remove('visible');
}

// Group management
function toggleGroup(groupId) {
  if (expandedGroups.has(groupId)) {
    expandedGroups.delete(groupId);
  } else {
    expandedGroups.add(groupId);
  }
  renderTasks();
}

async function deleteGroup(groupId, event) {
  event.stopPropagation();
  if (!confirm('Delete this group? Tasks will be ungrouped.')) return;

  // Remove group
  groups = groups.filter(g => g.id !== groupId);
  if (window.electronAPI.saveGroups) {
    await window.electronAPI.saveGroups(groups);
  }

  // Ungroup tasks
  tasks.forEach(task => {
    if (task.groupId === groupId) {
      task.groupId = '';
    }
  });
  await window.electronAPI.saveTasks(tasks);

  expandedGroups.delete(groupId);
  renderTasks();
}

function updateSelectedTaskInfo() {
  if (timerState.selectedTaskId) {
    const task = tasks.find(t => t.id === timerState.selectedTaskId);
    if (task) {
      const group = groups.find(g => g.id === task.groupId);
      currentTaskName.textContent = group ? `${task.name} (${group.name})` : task.name;
      currentTaskSessions.textContent = task.sessions || 0;
      currentTaskMinutes.textContent = (task.sessions || 0) * 15;

      if (task.details) {
        currentTaskDetails.textContent = task.details;
        currentTaskDetails.classList.remove('hidden');
        currentTaskDetails.style.opacity = "1";
        currentTaskDetails.title = "Click to edit details";
      } else {
        currentTaskDetails.textContent = "Click here to add notes or details...";
        currentTaskDetails.classList.remove('hidden');
        currentTaskDetails.style.opacity = "0.6";
        currentTaskDetails.title = "Add details";
      }

      selectedTaskInfo.classList.remove('hidden');
      return;
    }
  }
  selectedTaskInfo.classList.add('hidden');
}

function renderTasks() {
  taskList.innerHTML = '';

  // Separate active and completed tasks
  const activeTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  // Group active tasks
  const grouped = {};
  const ungrouped = [];

  activeTasks.forEach(task => {
    if (task.groupId) {
      if (!grouped[task.groupId]) {
        grouped[task.groupId] = [];
      }
      grouped[task.groupId].push(task);
    } else {
      ungrouped.push(task);
    }
  });

  if (activeTasks.length === 0 && completedTasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">No tasks yet</div>
      </div>
    `;
    return;
  }

  // Render grouped tasks
  groups.forEach(group => {
    const groupTasks = grouped[group.id] || [];
    if (groupTasks.length === 0) return;

    const isExpanded = expandedGroups.has(group.id);

    const groupHeader = document.createElement('div');
    groupHeader.className = 'task-group-header';
    groupHeader.innerHTML = `
      <div class="task-group-toggle">
        <span class="task-group-chevron ${isExpanded ? 'expanded' : ''}">›</span>
        <span class="task-group-name">${group.name}</span>
        <span class="task-group-count">(${groupTasks.length})</span>
      </div>
      <div class="task-group-actions">
        <button class="task-group-delete" title="Delete group">×</button>
      </div>
    `;

    groupHeader.querySelector('.task-group-toggle').addEventListener('click', () => toggleGroup(group.id));
    groupHeader.querySelector('.task-group-delete').addEventListener('click', (e) => deleteGroup(group.id, e));

    taskList.appendChild(groupHeader);

    // Render tasks in group
    if (isExpanded) {
      const groupContainer = document.createElement('div');
      groupContainer.className = 'task-group-tasks';

      groupTasks.forEach(task => {
        const taskEl = createTaskElement(task);
        groupContainer.appendChild(taskEl);
      });

      taskList.appendChild(groupContainer);
    }
  });

  // Render ungrouped tasks
  if (ungrouped.length > 0) {
    const ungroupedHeader = document.createElement('div');
    ungroupedHeader.className = 'task-group-header';
    const isExpanded = expandedGroups.has('ungrouped');
    ungroupedHeader.innerHTML = `
      <div class="task-group-toggle">
        <span class="task-group-chevron ${isExpanded ? 'expanded' : ''}">›</span>
        <span class="task-group-name">Ungrouped</span>
        <span class="task-group-count">(${ungrouped.length})</span>
      </div>
    `;
    ungroupedHeader.querySelector('.task-group-toggle').addEventListener('click', () => toggleGroup('ungrouped'));
    taskList.appendChild(ungroupedHeader);

    if (isExpanded) {
      const groupContainer = document.createElement('div');
      groupContainer.className = 'task-group-tasks';

      ungrouped.forEach(task => {
        const taskEl = createTaskElement(task);
        groupContainer.appendChild(taskEl);
      });

      taskList.appendChild(groupContainer);
    }
  }

  // Render completed tasks section
  if (completedTasks.length > 0) {
    const completedHeader = document.createElement('div');
    completedHeader.className = 'task-group-header completed-header';
    const isExpanded = expandedGroups.has('completed');
    completedHeader.innerHTML = `
      <div class="task-group-toggle">
        <span class="task-group-chevron ${isExpanded ? 'expanded' : ''}">›</span>
        <span class="task-group-name">Completed</span>
        <span class="task-group-count">(${completedTasks.length})</span>
      </div>
    `;
    completedHeader.querySelector('.task-group-toggle').addEventListener('click', () => toggleGroup('completed'));
    taskList.appendChild(completedHeader);

    if (isExpanded) {
      const groupContainer = document.createElement('div');
      groupContainer.className = 'task-group-tasks completed-tasks';

      completedTasks.forEach(task => {
        const taskEl = createTaskElement(task);
        groupContainer.appendChild(taskEl);
      });

      taskList.appendChild(groupContainer);
    }
  }
}

function createTaskElement(task) {
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
  deleteBtn.title = 'Delete task';
  deleteBtn.addEventListener('click', (e) => deleteTask(task.id, e));

  const editBtn = document.createElement('div');
  editBtn.className = 'task-edit-btn';
  editBtn.textContent = '✎';
  editBtn.title = 'Edit task & details';
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    editTask(task.id);
  });

  li.appendChild(checkbox);
  li.appendChild(content);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);
  li.addEventListener('click', () => selectTask(task.id));

  return li;
}

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Cleanup
window.addEventListener('beforeunload', () => {
  if (updateInterval) clearInterval(updateInterval);
  window.electronAPI.removeAllListeners('timer-updated');
  window.electronAPI.removeAllListeners('timer-complete');
});
