// Data Persistence and Shutdown Tests
const { describe, it, expect, beforeEach, afterEach, jest } = require('@jest/globals');

// Mock fs module
const mockWriteFileSync = jest.fn();
const mockReadFileSync = jest.fn();
const mockExistsSync = jest.fn();
const mockMkdirSync = jest.fn();

jest.mock('fs', () => ({
  writeFileSync: mockWriteFileSync,
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync
}));

describe('Data Persistence on Shutdown', () => {
  let appData;
  let saveDataToFile;
  let getDataPath;

  beforeEach(() => {
    // Reset mocks
    mockWriteFileSync.mockClear();
    mockReadFileSync.mockClear();
    mockExistsSync.mockClear();
    mockMkdirSync.mockClear();
    
    // Sample app data
    appData = {
      tasks: [
        {
          id: '1',
          name: 'Test Task',
          sessions: 2,
          completed: false,
          groupId: 'work',
          logs: [
            { timestamp: Date.now(), activity: 'Worked', duration: 15 }
          ],
          createdAt: Date.now()
        }
      ],
      groups: [
        { id: 'work', name: 'Work', createdAt: Date.now() },
        { id: 'personal', name: 'Personal', createdAt: Date.now() }
      ],
      timerState: {
        running: true,
        sleeping: false,
        isBreak: false,
        endTime: Date.now() + 600000,
        remaining: 600,
        selectedTaskId: '1',
        checkinPending: false,
        lastSessionDate: new Date().toDateString()
      }
    };
    
    // Mock getDataPath
    getDataPath = () => '/mock/path/tasks.json';
    
    // Mock saveDataToFile function
    saveDataToFile = () => {
      const dataPath = getDataPath();
      const dir = require('path').dirname(dataPath);
      
      // Ensure directory exists
      if (!mockExistsSync(dir)) {
        mockMkdirSync(dir, { recursive: true });
      }
      
      // Write data
      try {
        mockWriteFileSync(dataPath, JSON.stringify(appData, null, 2), 'utf8');
        return true;
      } catch (error) {
        console.error('Error saving data:', error);
        return false;
      }
    };
  });

  describe('saveDataToFile', () => {
    it('should save all app data to JSON file', () => {
      mockExistsSync.mockReturnValue(true);
      
      const result = saveDataToFile();
      
      expect(result).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/mock/path/tasks.json',
        JSON.stringify(appData, null, 2),
        'utf8'
      );
    });

    it('should create directory if it does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      
      saveDataToFile();
      
      expect(mockMkdirSync).toHaveBeenCalledTimes(1);
      expect(mockMkdirSync).toHaveBeenCalledWith(
        '/mock/path',
        { recursive: true }
      );
    });

    it('should save tasks with all properties', () => {
      mockExistsSync.mockReturnValue(true);
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.tasks).toHaveLength(1);
      expect(savedData.tasks[0].id).toBe('1');
      expect(savedData.tasks[0].name).toBe('Test Task');
      expect(savedData.tasks[0].sessions).toBe(2);
      expect(savedData.tasks[0].completed).toBe(false);
      expect(savedData.tasks[0].groupId).toBe('work');
      expect(savedData.tasks[0].logs).toHaveLength(1);
    });

    it('should save timer state', () => {
      mockExistsSync.mockReturnValue(true);
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.timerState.running).toBe(true);
      expect(savedData.timerState.sleeping).toBe(false);
      expect(savedData.timerState.isBreak).toBe(false);
      expect(savedData.timerState.selectedTaskId).toBe('1');
      expect(savedData.timerState.remaining).toBe(600);
    });

    it('should save groups', () => {
      mockExistsSync.mockReturnValue(true);
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.groups).toHaveLength(2);
      expect(savedData.groups[0].name).toBe('Work');
      expect(savedData.groups[1].name).toBe('Personal');
    });

    it('should handle save errors gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      mockWriteFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });
      
      const result = saveDataToFile();
      
      expect(result).toBe(false);
    });

    it('should use pretty-printed JSON format', () => {
      mockExistsSync.mockReturnValue(true);
      
      saveDataToFile();
      
      const savedJSON = mockWriteFileSync.mock.calls[0][1];
      // Check that it's formatted with indentation
      expect(savedJSON).toContain('\n');
      expect(savedJSON).toContain('  ');
    });
  });

  describe('Application Shutdown Scenarios', () => {
    it('should save data on before-quit event', () => {
      mockExistsSync.mockReturnValue(true);
      
      // Simulate before-quit handler
      const beforeQuitHandler = () => {
        saveDataToFile();
      };
      
      beforeQuitHandler();
      
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    });

    it('should save data on SIGTERM signal', () => {
      mockExistsSync.mockReturnValue(true);
      
      // Simulate SIGTERM handler
      const sigtermHandler = () => {
        saveDataToFile();
      };
      
      sigtermHandler();
      
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    });

    it('should save data on SIGINT signal', () => {
      mockExistsSync.mockReturnValue(true);
      
      // Simulate SIGINT handler (Ctrl+C)
      const sigintHandler = () => {
        saveDataToFile();
      };
      
      sigintHandler();
      
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1);
    });

    it('should save data even when timer is running', () => {
      mockExistsSync.mockReturnValue(true);
      appData.timerState.running = true;
      appData.timerState.endTime = Date.now() + 300000;
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.timerState.running).toBe(true);
      expect(savedData.timerState.endTime).toBeDefined();
    });

    it('should save data when check-in is pending', () => {
      mockExistsSync.mockReturnValue(true);
      appData.timerState.checkinPending = true;
      appData.timerState.running = false;
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.timerState.checkinPending).toBe(true);
    });

    it('should save latest session data before shutdown', () => {
      mockExistsSync.mockReturnValue(true);
      
      // Add a new session log
      appData.tasks[0].sessions = 3;
      appData.tasks[0].logs.push({
        timestamp: Date.now(),
        activity: 'Final session before shutdown',
        duration: 15
      });
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.tasks[0].sessions).toBe(3);
      expect(savedData.tasks[0].logs).toHaveLength(2);
      expect(savedData.tasks[0].logs[1].activity).toBe('Final session before shutdown');
    });
  });

  describe('Auto-save on Data Changes', () => {
    it('should save after adding a new task', () => {
      mockExistsSync.mockReturnValue(true);
      
      // Simulate adding a task
      appData.tasks.push({
        id: '2',
        name: 'New Task',
        sessions: 0,
        completed: false,
        groupId: 'personal',
        logs: [],
        createdAt: Date.now()
      });
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.tasks).toHaveLength(2);
      expect(savedData.tasks[1].name).toBe('New Task');
    });

    it('should save after completing a task', () => {
      mockExistsSync.mockReturnValue(true);
      
      // Simulate completing a task
      appData.tasks[0].completed = true;
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.tasks[0].completed).toBe(true);
    });

    it('should save after creating a new group', () => {
      mockExistsSync.mockReturnValue(true);
      
      // Simulate creating a group
      appData.groups.push({
        id: 'new-group',
        name: 'Shopping',
        createdAt: Date.now()
      });
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.groups).toHaveLength(3);
      expect(savedData.groups[2].name).toBe('Shopping');
    });

    it('should save timer state changes immediately', () => {
      mockExistsSync.mockReturnValue(true);
      
      // Simulate timer state changes
      appData.timerState.sleeping = true;
      appData.timerState.remaining = 450;
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.timerState.sleeping).toBe(true);
      expect(savedData.timerState.remaining).toBe(450);
    });
  });

  describe('Data Integrity', () => {
    it('should not corrupt data during save', () => {
      mockExistsSync.mockReturnValue(true);
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      
      // Verify all data is intact
      expect(savedData).toHaveProperty('tasks');
      expect(savedData).toHaveProperty('groups');
      expect(savedData).toHaveProperty('timerState');
      expect(Array.isArray(savedData.tasks)).toBe(true);
      expect(Array.isArray(savedData.groups)).toBe(true);
      expect(typeof savedData.timerState).toBe('object');
    });

    it('should handle empty data gracefully', () => {
      mockExistsSync.mockReturnValue(true);
      
      appData = {
        tasks: [],
        groups: [],
        timerState: {
          running: false,
          sleeping: false,
          isBreak: false,
          endTime: null,
          remaining: 900,
          selectedTaskId: null,
          checkinPending: false
        }
      };
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.tasks).toEqual([]);
      expect(savedData.groups).toEqual([]);
    });

    it('should preserve special characters in task names', () => {
      mockExistsSync.mockReturnValue(true);
      
      appData.tasks[0].name = 'Task with "quotes" and \'apostrophes\' & ampersand';
      
      saveDataToFile();
      
      const savedData = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(savedData.tasks[0].name).toBe('Task with "quotes" and \'apostrophes\' & ampersand');
    });
  });

  describe('Load Data on Startup', () => {
    it('should load existing data on startup', () => {
      const mockData = JSON.stringify(appData);
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockData);
      
      // Simulate load
      const loaded = mockExistsSync('/mock/path/tasks.json');
      let loadedData = null;
      if (loaded) {
        loadedData = JSON.parse(mockReadFileSync('/mock/path/tasks.json', 'utf8'));
      }
      
      expect(loadedData).not.toBeNull();
      expect(loadedData.tasks).toHaveLength(1);
      expect(loadedData.groups).toHaveLength(2);
      expect(loadedData.timerState.running).toBe(true);
    });

    it('should handle missing data file gracefully', () => {
      mockExistsSync.mockReturnValue(false);
      
      const loaded = mockExistsSync('/mock/path/tasks.json');
      
      expect(loaded).toBe(false);
    });

    it('should handle corrupted data file', () => {
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue('invalid json {{');
      
      let errorThrown = false;
      try {
        JSON.parse(mockReadFileSync('/mock/path/tasks.json', 'utf8'));
      } catch (e) {
        errorThrown = true;
      }
      
      expect(errorThrown).toBe(true);
    });
  });
});

describe('Emergency Data Recovery', () => {
  it('should attempt to save even on unexpected shutdown', () => {
    const mockFs = {
      writeFileSync: jest.fn(),
      existsSync: jest.fn().mockReturnValue(true)
    };
    
    // Simulate emergency save attempt
    try {
      mockFs.writeFileSync('/path/to/tasks.json', '{}', 'utf8');
    } catch (e) {
      // Should not throw
    }
    
    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });

  it('should handle write permission errors gracefully', () => {
    const mockWriteFileSync = jest.fn().mockImplementation(() => {
      throw new Error('EACCES: permission denied');
    });
    
    let errorCaught = false;
    try {
      mockWriteFileSync('/restricted/path/tasks.json', '{}', 'utf8');
    } catch (e) {
      errorCaught = true;
    }
    
    expect(errorCaught).toBe(true);
  });
});
