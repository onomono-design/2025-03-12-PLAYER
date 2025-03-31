/**
 * Messaging Module
 * Centralized system for displaying messages to the user
 */

import { PlayerState } from '../shared-state.js';

/**
 * Show a message to the user with automatic timeout
 * @param {string} text - The message text
 * @param {number} duration - How long to show the message in milliseconds
 * @param {boolean} isError - Whether this is an error message (affects styling)
 * @returns {void}
 */
export function showMessage(text, duration = 3000, isError = false) {
  if (!PlayerState.elements.message) return;
  
  // Add error class if this is an error message
  if (isError) {
    PlayerState.elements.message.classList.add('error');
  } else {
    PlayerState.elements.message.classList.remove('error');
  }
  
  PlayerState.elements.message.textContent = text;
  PlayerState.elements.message.style.display = "block";
  
  // Hide the message after the specified duration
  setTimeout(() => {
    if (PlayerState.elements.message && 
        PlayerState.elements.message.textContent === text) {
      PlayerState.elements.message.style.display = "none";
    }
  }, duration);
}

/**
 * Show an error message (wrapper for showMessage with error flag)
 * @param {string} text - The error message
 * @param {number} duration - How long to show the message
 * @returns {void}
 */
export function showErrorMessage(text, duration = 5000) {
  showMessage(text, duration, true);
}

/**
 * Show keyboard shortcuts info
 * @returns {void}
 */
export function showKeyboardShortcutsInfo() {
  if (PlayerState.isMobileDevice) return;
  
  const message = 
    "Keyboard shortcuts: Space = Play/Pause, Arrow Keys = Previous/Next Track, M = Mute, F = Fullscreen";
  
  showMessage(message, 5000);
} 