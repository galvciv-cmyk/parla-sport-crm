// Lightweight Singleton Debug Logger for Notifications

let debugListeners = [];
let eventIdCounter = 0;

export const logNotifEvent = (channel, title, detail = '', data = null) => {
  const event = {
    id: ++eventIdCounter,
    channel: channel || 'info',
    title,
    detail,
    data,
    timestamp: new Date(),
    ms: Date.now()
  };
  debugListeners.forEach(l => l(event));
};

export const subscribeDebugEvents = (listener) => {
  debugListeners.push(listener);
  return () => {
    debugListeners = debugListeners.filter(l => l !== listener);
  };
};
