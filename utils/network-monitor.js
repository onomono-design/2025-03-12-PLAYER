/**
 * Network Monitoring Module
 * Handles detection and response to network connectivity changes
 */

import { PlayerState } from '../shared-state.js';
import { ErrorLogger } from '../error-logger.js';
import { showMessage } from './messaging.js';

// Variable to track if we're currently offline
let isOffline = false;

/**
 * Set up network connectivity monitoring
 */
export function setupNetworkMonitoring() {
  console.log('Setting up network connectivity monitoring');
  
  try {
    // Initialize offline state based on current network status
    isOffline = !navigator.onLine;
    
    // Function to handle going offline
    const handleOffline = () => {
      console.log('Network connection lost');
      isOffline = true;
      
      // Show a message to the user
      showMessage("Network connection lost. Playback may be affected.", 5000);
      
      // Dispatch event for other modules to react
      document.dispatchEvent(new CustomEvent('network-status-changed', { 
        detail: { isOnline: false } 
      }));
    };
    
    // Function to handle coming back online
    const handleOnline = () => {
      console.log('Network connection restored');
      
      // Only show a message if we were previously offline
      if (isOffline) {
        showMessage("Network connection restored.", 3000);
        
        // Dispatch event for other modules to react
        document.dispatchEvent(new CustomEvent('network-status-changed', { 
          detail: { isOnline: true } 
        }));
        
        isOffline = false;
      }
    };
    
    // Set up event listeners for online/offline events
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    // Check initial state
    if (isOffline) {
      console.log('Starting in offline mode');
      showMessage("No network connection. Some features may be limited.", 5000);
      
      // Dispatch initial event
      document.dispatchEvent(new CustomEvent('network-status-changed', { 
        detail: { isOnline: false } 
      }));
    }
    
    // Return initial network status
    return { isOnline: !isOffline };
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'setupNetworkMonitoring' });
    return { isOnline: true }; // Default to online if there's an error
  }
}

/**
 * Check if the network is currently online
 * @returns {boolean} Whether the network is online
 */
export function isNetworkOnline() {
  return !isOffline && navigator.onLine;
}

/**
 * Add a custom handler for network status changes
 * @param {Function} handler - Function to call when network status changes
 * @returns {Function} Function to remove the handler
 */
export function addNetworkStatusHandler(handler) {
  if (typeof handler !== 'function') {
    console.error('Network status handler must be a function');
    return () => {};
  }
  
  const eventHandler = (event) => {
    handler(event.detail.isOnline);
  };
  
  document.addEventListener('network-status-changed', eventHandler);
  
  // Call immediately with current status
  setTimeout(() => {
    handler(!isOffline);
  }, 0);
  
  // Return function to remove the handler
  return () => {
    document.removeEventListener('network-status-changed', eventHandler);
  };
} 