/**
 * Error Logger Module
 * Provides comprehensive error logging and handling functionality
 */

import { PlayerState } from './shared-state.js';

/**
 * Enhanced error logging system
 */
export const ErrorLogger = {
  // Store errors for potential reporting
  errors: [],
  
  // Maximum number of errors to store
  maxErrors: 50,
  
  /**
   * Log an error with context
   * @param {Error|string} error - The error object or message
   * @param {Object} context - Additional context information
   * @returns {Object} The error object that was logged
   */
  logError: function(error, context = {}) {
    const timestamp = new Date().toISOString();
    const errorObj = {
      timestamp,
      message: error.message || String(error),
      stack: error.stack,
      context: {
        ...context,
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        isXRMode: PlayerState.isXRMode,
        isMobileDevice: PlayerState.isMobileDevice,
        currentTrackIndex: PlayerState.currentTrackIndex,
        currentPlaylistView: PlayerState.currentPlaylistView
      }
    };
    
    // Add to errors array
    this.errors.push(errorObj);
    
    // Trim array if it gets too large
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
    
    // Log to console
    console.error('Player Error:', errorObj);
    
    // Dispatch error event for other modules to react
    document.dispatchEvent(new CustomEvent('player-error', { 
      detail: { error: errorObj } 
    }));
    
    return errorObj;
  },
  
  /**
   * Handle a runtime error with user feedback
   * @param {Error|string} error - The error object or message
   * @param {Object} context - Additional context information
   * @returns {Object} The error object that was handled
   */
  handleError: function(error, context = {}) {
    const errorObj = this.logError(error, context);
    
    // Show user-friendly message if message element exists
    if (PlayerState.elements.message) {
      PlayerState.elements.message.textContent = "An error occurred. Please try again.";
      PlayerState.elements.message.style.display = "block";
      
      // Hide message after delay
      setTimeout(() => {
        if (PlayerState.elements.message && 
            PlayerState.elements.message.textContent === "An error occurred. Please try again.") {
          PlayerState.elements.message.style.display = "none";
        }
      }, 5000);
    }
    
    return errorObj;
  },
  
  /**
   * Get all logged errors
   * @returns {Array} Array of logged errors
   */
  getErrors: function() {
    return this.errors;
  },
  
  /**
   * Clear error log
   */
  clearErrors: function() {
    this.errors = [];
    console.log('Error log cleared');
  },
  
  /**
   * Show a specific error message to the user
   * @param {string} message - The message to display
   * @param {number} duration - How long to show the message in milliseconds
   */
  showErrorMessage: function(message, duration = 5000) {
    if (PlayerState.elements.message) {
      PlayerState.elements.message.textContent = message;
      PlayerState.elements.message.style.display = "block";
      
      // Hide message after delay
      setTimeout(() => {
        if (PlayerState.elements.message && 
            PlayerState.elements.message.textContent === message) {
          PlayerState.elements.message.style.display = "none";
        }
      }, duration);
    }
  }
}; 