// background.js - Service worker for timer management
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'timer-alarm') {
    // Timer completed
    const result = await chrome.storage.local.get('timerState');
    const timerState = result.timerState || {};
    
    // Show notification
    const isBreak = timerState.isBreak || false;
    const title = isBreak ? 'Break Time Over!' : '15 Minutes Complete!';
    const message = isBreak 
      ? 'Your 5-minute break is done. Ready to work?' 
      : 'What did you accomplish? Click to log your progress.';
    
    chrome.notifications.create('timer-complete', {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: title,
      message: message,
      requireInteraction: true,
      buttons: [
        { title: 'Open Tracker' }
      ]
    });
    
    // Update timer state
    timerState.running = false;
    timerState.checkinPending = true;
    timerState.remaining = 0;
    await chrome.storage.local.set({ timerState });
    
    // Notify popup if open
    try {
      chrome.runtime.sendMessage({ type: 'TIMER_COMPLETE' });
    } catch (e) {
      // Popup might not be open
    }
  }
});

// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-sleep') {
    const result = await chrome.storage.local.get('timerState');
    const timerState = result.timerState || { sleeping: false };
    
    timerState.sleeping = !timerState.sleeping;
    
    if (timerState.sleeping) {
      // Pause timer
      if (timerState.endTime) {
        timerState.remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
      }
      await chrome.alarms.clear('timer-alarm');
      
      chrome.notifications.create('sleep-toggle', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Timer Paused',
        message: 'Sleep mode activated. Timer is paused.',
        priority: 0
      });
    } else {
      // Resume timer
      if (timerState.running && timerState.remaining > 0) {
        timerState.endTime = Date.now() + timerState.remaining * 1000;
        await chrome.alarms.create('timer-alarm', { delayInMinutes: timerState.remaining / 60 });
      }
      
      chrome.notifications.create('sleep-toggle', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Timer Resumed',
        message: 'Sleep mode deactivated. Timer is running.',
        priority: 0
      });
    }
    
    await chrome.storage.local.set({ timerState });
  }
});

// Handle notification button click
chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === 'timer-complete' && buttonIndex === 0) {
    chrome.action.openPopup();
  }
});

// Handle notification click
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'timer-complete') {
    chrome.action.openPopup();
    chrome.notifications.clear(notificationId);
  }
});

// Update badge with remaining time
async function updateBadge() {
  const result = await chrome.storage.local.get('timerState');
  const timerState = result.timerState || {};
  
  if (timerState.running && !timerState.sleeping && timerState.endTime) {
    const remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    
    // Show minutes on badge (max 3 characters)
    let badgeText = minutes > 99 ? '99+' : minutes.toString();
    if (minutes === 0 && remaining > 0) {
      badgeText = '<1';
    }
    
    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ 
      color: timerState.isBreak ? '#FF9800' : '#2196F3' 
    });
  } else if (timerState.sleeping) {
    chrome.action.setBadgeText({ text: 'Zzz' });
    chrome.action.setBadgeBackgroundColor({ color: '#757575' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// Update badge every 10 seconds
setInterval(updateBadge, 10000);

// Initialize on install/update
chrome.runtime.onInstalled.addListener(() => {
  console.log('15-Minute Productivity Tracker installed');
  updateBadge();
});
