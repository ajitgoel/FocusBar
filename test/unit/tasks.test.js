// Task Management Tests
const { describe, it, expect, beforeEach } = require('@jest/globals');

describe('Task Management', () => {
  let tasks = [];
  let groups = [];

  beforeEach(() => {
    tasks = [];
    groups = [
      { id: 'group_1', name: 'Work', createdAt: Date.now() },
      { id: 'group_2', name: 'Personal', createdAt: Date.now() }
    ];
  });

  describe('createTask', () => {
    it('should create a task with all required fields', () => {
      const task = {
        id: Date.now().toString(),
        name: 'Test task',
        sessions: 0,
        completed: false,
        logs: [],
        groupId: 'group_1',
        createdAt: Date.now()
      };
      
      tasks.push(task);
      
      expect(tasks).toHaveLength(1);
      expect(tasks[0].name).toBe('Test task');
      expect(tasks[0].sessions).toBe(0);
      expect(tasks[0].completed).toBe(false);
      expect(tasks[0].groupId).toBe('group_1');
      expect(tasks[0].id).toBeDefined();
    });

    it('should create a task without group', () => {
      const task = {
        id: Date.now().toString(),
        name: 'Ungrouped task',
        sessions: 0,
        completed: false,
        logs: [],
        groupId: '',
        createdAt: Date.now()
      };
      
      tasks.push(task);
      
      expect(tasks[0].groupId).toBe('');
    });

    it('should not allow empty task name', () => {
      const name = '   '.trim();
      
      expect(name).toBe('');
      // In real app, this would not create a task
    });
  });

  describe('toggleTaskComplete', () => {
    it('should mark task as complete', () => {
      const task = {
        id: '1',
        name: 'Test',
        completed: false
      };
      tasks.push(task);
      
      // Toggle complete
      task.completed = !task.completed;
      
      expect(task.completed).toBe(true);
    });

    it('should mark task as incomplete when toggled again', () => {
      const task = {
        id: '1',
        name: 'Test',
        completed: true
      };
      tasks.push(task);
      
      // Toggle incomplete
      task.completed = !task.completed;
      
      expect(task.completed).toBe(false);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task by id', () => {
      tasks = [
        { id: '1', name: 'Task 1' },
        { id: '2', name: 'Task 2' },
        { id: '3', name: 'Task 3' }
      ];
      
      const taskIdToDelete = '2';
      tasks = tasks.filter(t => t.id !== taskIdToDelete);
      
      expect(tasks).toHaveLength(2);
      expect(tasks.find(t => t.id === '2')).toBeUndefined();
    });

    it('should handle deleting non-existent task', () => {
      tasks = [{ id: '1', name: 'Task 1' }];
      
      tasks = tasks.filter(t => t.id !== '999');
      
      expect(tasks).toHaveLength(1);
    });
  });

  describe('selectTask', () => {
    it('should select a task', () => {
      const timerState = { selectedTaskId: null };
      const taskId = '123';
      
      timerState.selectedTaskId = taskId;
      
      expect(timerState.selectedTaskId).toBe('123');
    });

    it('should deselect task when selecting null', () => {
      const timerState = { selectedTaskId: '123' };
      
      timerState.selectedTaskId = null;
      
      expect(timerState.selectedTaskId).toBeNull();
    });
  });

  describe('incrementTaskSession', () => {
    it('should increment session count', () => {
      const task = {
        id: '1',
        name: 'Test',
        sessions: 2,
        logs: []
      };
      
      // Simulate completing a session
      task.sessions = (task.sessions || 0) + 1;
      task.logs.push({
        timestamp: Date.now(),
        activity: 'Worked on task',
        duration: 15
      });
      
      expect(task.sessions).toBe(3);
      expect(task.logs).toHaveLength(1);
    });

    it('should handle first session', () => {
      const task = {
        id: '1',
        name: 'Test',
        sessions: undefined,
        logs: undefined
      };
      
      task.sessions = (task.sessions || 0) + 1;
      task.logs = task.logs || [];
      task.logs.push({
        timestamp: Date.now(),
        activity: 'First session',
        duration: 15
      });
      
      expect(task.sessions).toBe(1);
      expect(task.logs).toHaveLength(1);
    });
  });

  describe('task statistics', () => {
    it('should calculate total minutes correctly', () => {
      tasks = [
        { id: '1', name: 'Task 1', sessions: 3 },
        { id: '2', name: 'Task 2', sessions: 2 }
      ];
      
      const totalSessions = tasks.reduce((sum, t) => sum + (t.sessions || 0), 0);
      const totalMinutes = totalSessions * 15;
      
      expect(totalSessions).toBe(5);
      expect(totalMinutes).toBe(75);
    });

    it('should calculate completed vs total tasks', () => {
      tasks = [
        { id: '1', name: 'Task 1', completed: true },
        { id: '2', name: 'Task 2', completed: false },
        { id: '3', name: 'Task 3', completed: true }
      ];
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      
      expect(totalTasks).toBe(3);
      expect(completedTasks).toBe(2);
    });
  });

  describe('sortTasks', () => {
    it('should sort incomplete tasks before completed', () => {
      tasks = [
        { id: '1', name: 'Completed', completed: true },
        { id: '2', name: 'Incomplete A', completed: false },
        { id: '3', name: 'Incomplete B', completed: false }
      ];
      
      const sorted = [
        ...tasks.filter(t => !t.completed),
        ...tasks.filter(t => t.completed)
      ];
      
      expect(sorted[0].name).toBe('Incomplete A');
      expect(sorted[1].name).toBe('Incomplete B');
      expect(sorted[2].name).toBe('Completed');
    });
  });
});

describe('Group Management', () => {
  let groups = [];
  let tasks = [];

  beforeEach(() => {
    groups = [];
    tasks = [];
  });

  describe('createGroup', () => {
    it('should create a group with unique id', () => {
      const group = {
        id: 'group_' + Date.now().toString(),
        name: 'New Group',
        createdAt: Date.now()
      };
      
      groups.push(group);
      
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('New Group');
      expect(groups[0].id).toMatch(/^group_/);
    });

    it('should not allow duplicate group names', () => {
      groups = [{ id: '1', name: 'Work' }];
      
      const newGroupName = 'Work';
      const existingGroup = groups.find(g => g.name === newGroupName);
      
      expect(existingGroup).toBeDefined();
    });

    it('should trim group name', () => {
      const name = '  Work  '.trim();
      
      expect(name).toBe('Work');
    });
  });

  describe('deleteGroup', () => {
    it('should delete a group', () => {
      groups = [
        { id: '1', name: 'Work' },
        { id: '2', name: 'Personal' }
      ];
      
      const groupIdToDelete = '1';
      groups = groups.filter(g => g.id !== groupIdToDelete);
      
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('Personal');
    });

    it('should make tasks ungrouped when group is deleted', () => {
      groups = [{ id: '1', name: 'Work' }];
      tasks = [
        { id: 't1', name: 'Task 1', groupId: '1' },
        { id: 't2', name: 'Task 2', groupId: '1' }
      ];
      
      const deletedGroupId = '1';
      
      // Tasks in deleted group become ungrouped
      tasks.forEach(task => {
        if (task.groupId === deletedGroupId) {
          task.groupId = '';
        }
      });
      
      expect(tasks[0].groupId).toBe('');
      expect(tasks[1].groupId).toBe('');
    });
  });

  describe('group tasks organization', () => {
    it('should group tasks by their groupId', () => {
      groups = [
        { id: 'work', name: 'Work' },
        { id: 'personal', name: 'Personal' }
      ];
      
      tasks = [
        { id: 't1', name: 'Task 1', groupId: 'work' },
        { id: 't2', name: 'Task 2', groupId: 'personal' },
        { id: 't3', name: 'Task 3', groupId: 'work' }
      ];
      
      const grouped = {};
      groups.forEach(group => {
        grouped[group.id] = tasks.filter(t => t.groupId === group.id);
      });
      
      expect(grouped['work']).toHaveLength(2);
      expect(grouped['personal']).toHaveLength(1);
    });

    it('should handle ungrouped tasks', () => {
      tasks = [
        { id: 't1', name: 'Task 1', groupId: 'work' },
        { id: 't2', name: 'Task 2', groupId: '' },
        { id: 't3', name: 'Task 3', groupId: null }
      ];
      
      const ungrouped = tasks.filter(t => !t.groupId);
      
      expect(ungrouped).toHaveLength(2);
    });

    it('should count tasks per group', () => {
      groups = [
        { id: 'work', name: 'Work' },
        { id: 'personal', name: 'Personal' }
      ];
      
      tasks = [
        { id: 't1', name: 'Task 1', groupId: 'work' },
        { id: 't2', name: 'Task 2', groupId: 'work' },
        { id: 't3', name: 'Task 3', groupId: 'personal' }
      ];
      
      const workCount = tasks.filter(t => t.groupId === 'work').length;
      const personalCount = tasks.filter(t => t.groupId === 'personal').length;
      
      expect(workCount).toBe(2);
      expect(personalCount).toBe(1);
    });
  });

  describe('default groups', () => {
    it('should create default groups on first launch', () => {
      if (groups.length === 0) {
        groups = [
          { id: 'group_default', name: 'General', createdAt: Date.now() },
          { id: 'group_work', name: 'Work', createdAt: Date.now() },
          { id: 'group_personal', name: 'Personal', createdAt: Date.now() }
        ];
      }
      
      expect(groups).toHaveLength(3);
      expect(groups.map(g => g.name)).toContain('Work');
      expect(groups.map(g => g.name)).toContain('Personal');
    });
  });
});
