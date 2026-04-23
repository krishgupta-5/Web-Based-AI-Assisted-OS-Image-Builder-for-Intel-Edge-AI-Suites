// Session ID management utilities

export function getSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try to get from sessionStorage first
  let sessionId = sessionStorage.getItem('edge-os-session-id');
  
  // If not in sessionStorage, try to get from URL
  if (!sessionId) {
    const pathParts = window.location.pathname.split('/');
    const chatIndex = pathParts.indexOf('chat');
    if (chatIndex !== -1 && pathParts[chatIndex + 1]) {
      sessionId = pathParts[chatIndex + 1];
      // Store it for future use
      sessionStorage.setItem('edge-os-session-id', sessionId);
    }
  }
  
  return sessionId;
}

export function resetSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  // Generate a new session ID
  const newSessionId = generateSessionId();
  
  // Store in sessionStorage
  sessionStorage.setItem('edge-os-session-id', newSessionId);
  
  return newSessionId;
}

function generateSessionId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
