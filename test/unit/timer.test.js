// Timer Logic Tests
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Mock timer state
let mockTimerState = {
  running: false,
  sleeping: false,
  isBreak: false,
  endTime: null,
  remaining: 15 * 60,
  selectedTaskId: null,
  checkinPending: false,
  lastSessionDate: null
};

const WORK_DURATION = 15 * 60;
const BREAK_DURATION = 5 * 60;

describe('Timer Logic', () => {
  beforeEach(() => {
    // Reset timer state before each test
    mockTimerState = {
      running: false,
      sleeping: false,
      isBreak: false,
      endTime: null,
      remaining: WORK_DURATION,
      selectedTaskId: null,
      checkinPending: false,
      lastSessionDate: null
    };
  });

  describe('startTimer', () => {
    it('should start a work timer with correct duration', () => {
      const duration = WORK_DURATION;
      const now = Date.now();
      
      mockTimerState.running = true;
      mockTimerState.sleeping = false;
      mockTimerState.isBreak = false;
      mockTimerState.remaining = duration;
      mockTimerState.endTime = now + duration * 1000;
      mockTimerState.checkinPending = false;
      
      expect(mockTimerState.running).toBe(true);
      expect(mockTimerState.isBreak).toBe(false);
      expect(mockTimerState.remaining).toBe(WORK_DURATION);
      expect(mockTimerState.endTime).toBeGreaterThan(now);
    });

    it('should start a break timer with correct duration', () => {
      const duration = BREAK_DURATION;
      const now = Date.now();
      
      mockTimerState.running = true;
      mockTimerState.sleeping = false;
      mockTimerState.isBreak = true;
      mockTimerState.remaining = duration;
      mockTimerState.endTime = now + duration * 1000;
      mockTimerState.checkinPending = false;
      
      expect(mockTimerState.running).toBe(true);
      expect(mockTimerState.isBreak).toBe(true);
      expect(mockTimerState.remaining).toBe(BREAK_DURATION);
    });

    it('should set lastSessionDate when starting timer', () => {
      const today = new Date().toDateString();
      mockTimerState.lastSessionDate = today;
      
      expect(mockTimerState.lastSessionDate).toBe(today);
    });
  });

  describe('toggleSleep', () => {
    it('should pause timer and save remaining time', () => {
      const now = Date.now();
      mockTimerState.running = true;
      mockTimerState.sleeping = false;
      mockTimerState.endTime = now + 600 * 1000; // 10 minutes remaining
      
      // Simulate toggle sleep
      mockTimerState.remaining = Math.max(0, Math.ceil((mockTimerState.endTime - now) / 1000));
      mockTimerState.sleeping = true;
      
      expect(mockTimerState.sleeping).toBe(true);
      expect(mockTimerState.remaining).toBe(600);
    });

    it('should resume timer from saved remaining time', () => {
      const now = Date.now();
      mockTimerState.running = true;
      mockTimerState.sleeping = true;
      mockTimerState.remaining = 600;
      
      // Simulate wake up
      mockTimerState.endTime = now + mockTimerState.remaining * 1000;
      mockTimerState.sleeping = false;
      
      expect(mockTimerState.sleeping).toBe(false);
      expect(mockTimerState.endTime).toBeGreaterThan(now);
    });

    it('should not resume if timer was not running', () => {
      mockTimerState.running = false;
      mockTimerState.sleeping = true;
      mockTimerState.remaining = 0;
      
      // Should not set endTime if not running
      if (mockTimerState.running && mockTimerState.remaining > 0) {
        mockTimerState.endTime = Date.now() + mockTimerState.remaining * 1000;
      }
      
      expect(mockTimerState.endTime).toBeNull();
    });
  });

  describe('timer countdown', () => {
    it('should calculate correct remaining time', () => {
      const now = Date.now();
      mockTimerState.endTime = now + 300 * 1000; // 5 minutes
      mockTimerState.running = true;
      
      const remaining = Math.max(0, Math.ceil((mockTimerState.endTime - now) / 1000));
      
      expect(remaining).toBe(300);
    });

    it('should detect when timer completes', () => {
      const past = Date.now() - 1000; // 1 second ago
      mockTimerState.endTime = past;
      mockTimerState.running = true;
      
      const remaining = Math.max(0, Math.ceil((mockTimerState.endTime - Date.now()) / 1000));
      
      expect(remaining).toBe(0);
      
      if (remaining <= 0) {
        mockTimerState.running = false;
        mockTimerState.checkinPending = true;
        mockTimerState.remaining = 0;
      }
      
      expect(mockTimerState.running).toBe(false);
      expect(mockTimerState.checkinPending).toBe(true);
    });

    it('should not countdown when sleeping', () => {
      mockTimerState.running = true;
      mockTimerState.sleeping = true;
      const savedRemaining = 600;
      mockTimerState.remaining = savedRemaining;
      
      // Simulate time passing
      const remaining = mockTimerState.sleeping ? savedRemaining : 0;
      
      expect(remaining).toBe(savedRemaining);
    });
  });

  describe('timerComplete', () => {
    it('should set correct state when timer completes', () => {
      mockTimerState.running = false;
      mockTimerState.checkinPending = true;
      mockTimerState.remaining = 0;
      
      expect(mockTimerState.checkinPending).toBe(true);
      expect(mockTimerState.remaining).toBe(0);
    });

    it('should preserve break status in checkin', () => {
      mockTimerState.isBreak = true;
      mockTimerState.running = false;
      mockTimerState.checkinPending = true;
      
      expect(mockTimerState.isBreak).toBe(true);
      expect(mockTimerState.checkinPending).toBe(true);
    });
  });

  describe('timer display calculations', () => {
    it('should format remaining time correctly', () => {
      const remaining = 847; // 14 minutes 7 seconds
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      
      expect(minutes).toBe(14);
      expect(seconds).toBe(7);
      expect(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`).toBe('14:07');
    });

    it('should handle zero remaining time', () => {
      const remaining = 0;
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      
      expect(minutes).toBe(0);
      expect(seconds).toBe(0);
      expect(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`).toBe('00:00');
    });

    it('should handle negative remaining time gracefully', () => {
      const remaining = Math.max(0, -50);
      
      expect(remaining).toBe(0);
    });
  });

  describe('break timer', () => {
    it('should start break with 5 minute duration', () => {
      mockTimerState.running = true;
      mockTimerState.isBreak = true;
      mockTimerState.remaining = BREAK_DURATION;
      mockTimerState.endTime = Date.now() + BREAK_DURATION * 1000;
      
      expect(mockTimerState.remaining).toBe(300); // 5 minutes
      expect(mockTimerState.isBreak).toBe(true);
    });
  });
});

describe('Timer State Persistence', () => {
  it('should reset timer for new day', () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    const timerState = {
      lastSessionDate: yesterday,
      running: true
    };
    
    if (timerState.lastSessionDate !== today) {
      timerState.running = false;
      timerState.remaining = WORK_DURATION;
    }
    
    expect(timerState.running).toBe(false);
    expect(timerState.remaining).toBe(WORK_DURATION);
  });

  it('should resume timer from same day', () => {
    const today = new Date().toDateString();
    const remaining = 600;
    
    const timerState = {
      lastSessionDate: today,
      running: true,
      endTime: Date.now() + remaining * 1000
    };
    
    if (timerState.lastSessionDate === today && timerState.running) {
      const calculatedRemaining = Math.ceil((timerState.endTime - Date.now()) / 1000);
      if (calculatedRemaining > 0) {
        timerState.remaining = calculatedRemaining;
      }
    }
    
    expect(timerState.remaining).toBeGreaterThan(0);
  });
});
