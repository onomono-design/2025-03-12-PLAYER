/**
 * Media Player Application
 * Main entry point that initializes and coordinates all player modules
 */

import { PlayerState } from './shared-state.js';
import { initializeCore, setupMediaElements } from './player-core.js';
import { initializeUI, setupUIListeners } from './player-ui.js';
import { initializePlaylist, loadPlaylistData } from './playlist-manager.js';
import { setupXRMode } from './xr-mode.js';
import { ErrorLogger } from './error-logger.js';
import { setupMediaPreloader } from './media-preloader.js';

// Import consolidated utility modules
import { setupNetworkMonitoring } from './utils/network-monitor.js';
import { detectMobileDevice, detectIOSDevice, checkOrientation } from './utils/device-detection.js';
import { updateAllLayouts, optimizeMobileLayout, alignPlayerControlsWithIframeMargins } from './utils/layout-utils.js';
import { setupMediaSync } from './utils/media-sync.js';
import { showKeyboardShortcutsInfo } from './utils/messaging.js';

// Initialize the application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Main application initialization
 */
function initializeApp() {
  console.log('Initializing media player application...');
  
  try {
    // Set up error handling first
    window.addEventListener('error', function(event) {
      ErrorLogger.handleError(event.error || new Error(event.message), {
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        type: 'uncaught'
      });
    });
    
    window.addEventListener('unhandledrejection', function(event) {
      ErrorLogger.handleError(event.reason || new Error('Unhandled Promise rejection'), {
        type: 'unhandledrejection'
      });
    });
    
    // Initialize autoplay support first
    initializeAutoplaySupport()
      .then(() => {
        console.log('Autoplay support initialized');
        
        // Initialize modules in the correct order
        setupMediaElements();
        setupNetworkMonitoring();
        
        // Set up device detection
        PlayerState.isMobileDevice = detectMobileDevice();
        PlayerState.isIOS = detectIOSDevice();
        
        // Set up UI
        initializeUI();
        
        // Set up core functionality
        initializeCore();
        initializePlaylist();
        setupXRMode();
        setupMediaPreloader();
        setupMediaSync();
        
        // Initialize layout optimizations
        alignPlayerControlsWithIframeMargins();
        if (PlayerState.isMobileDevice) {
          optimizeMobileLayout();
        }
        
        // Update all layouts once
        updateAllLayouts();
        
        // Set up global event listeners
        setupGlobalEventListeners();
        
        // Load playlist data
        loadPlaylistData();
        
        console.log('Application initialization complete');
      })
      .catch(error => {
        console.warn('Autoplay support initialization failed, continuing anyway:', error);
        
        // Continue with initialization even if autoplay support fails
        setupMediaElements();
        setupNetworkMonitoring();
        
        // Set up device detection
        PlayerState.isMobileDevice = detectMobileDevice();
        PlayerState.isIOS = detectIOSDevice();
        
        initializeUI();
        initializeCore();
        initializePlaylist();
        setupXRMode();
        setupMediaPreloader();
        setupMediaSync();
        
        // Initialize layout optimizations
        alignPlayerControlsWithIframeMargins();
        if (PlayerState.isMobileDevice) {
          optimizeMobileLayout();
        }
        
        // Update all layouts once
        updateAllLayouts();
        
        setupGlobalEventListeners();
        loadPlaylistData();
        
        console.log('Application initialization complete (without autoplay support)');
      });
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'initializeApp' });
    console.error('Failed to initialize application:', error);
    
    // Attempt recovery
    setTimeout(() => {
      console.log('Attempting recovery after initialization failure');
      // Basic recovery - at least try to load a default playlist
      import('./playlist-manager.js').then(module => {
        module.initializeDefaultPlaylist();
        module.populatePlaylist();
      }).catch(e => {
        console.error('Recovery failed:', e);
      });
    }, 2000);
  }
}

/**
 * Initialize autoplay support detection
 * @returns {Promise} Promise that resolves when autoplay support has been detected
 */
function initializeAutoplaySupport() {
  return new Promise((resolve, reject) => {
    console.log('Checking for autoplay support...');
    
    try {
      // Create a test audio element
      const audio = document.createElement('audio');
      audio.volume = 0;
      
      // Add dummy source with almost empty data
      const source = document.createElement('source');
      source.src = 'data:audio/mpeg;base64,/+MYxAAAAAHlA';
      source.type = 'audio/mpeg';
      audio.appendChild(source);
      
      // Try to play to check for autoplay support
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Autoplay is supported without user interaction');
            PlayerState.supportsAutoplay = true;
            resolve(true);
          })
          .catch(error => {
            console.log('Autoplay is not supported without user interaction:', error);
            PlayerState.supportsAutoplay = false;
            
            // Set up user interaction handlers to unlock audio
            unlockAudioOnUserInteraction();
            
            resolve(false);
          })
          .finally(() => {
            // Clean up
            audio.pause();
            audio.src = '';
            audio.load();
          });
      } else {
        console.log('Autoplay support is unknown (older browser)');
        PlayerState.supportsAutoplay = false;
        
        // Set up user interaction handlers to unlock audio
        unlockAudioOnUserInteraction();
        
        resolve(false);
      }
    } catch (error) {
      console.error('Error detecting autoplay support:', error);
      PlayerState.supportsAutoplay = false;
      
      // Set up user interaction handlers to unlock audio
      unlockAudioOnUserInteraction();
      
      reject(error);
    }
  });
}

/**
 * Set up global event listeners
 */
function setupGlobalEventListeners() {
  console.log('Setting up global event listeners...');
  
  try {
    // Set up visibility change handler
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Set up window resize handler
    window.addEventListener('resize', handleWindowResize);
    
    // Set up orientation change handler for mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        checkOrientation();
        updateAllLayouts();
      }, 300);
    });
    
    console.log('Global event listeners set up');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'setupGlobalEventListeners' });
  }
}

/**
 * Set up handlers to unlock audio on user interaction
 */
function unlockAudioOnUserInteraction() {
  console.log('Setting up audio unlock on user interaction...');
  
  try {
    const unlockAudio = () => {
      console.log('User interaction detected, attempting to unlock audio...');
      
      if (PlayerState.audio) {
        // Try to play and immediately pause to unlock audio
        const playPromise = PlayerState.audio.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Audio unlocked successfully');
              PlayerState.audio.pause();
              PlayerState.audioUnlocked = true;
            })
            .catch(error => {
              console.error('Failed to unlock audio:', error);
            });
        }
      }
      
      // Remove the event listeners after success or several attempts
      if (PlayerState.audioUnlocked || PlayerState.unlockAttempts >= 3) {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchend', unlockAudio);
        document.removeEventListener('keydown', unlockAudio);
      } else {
        PlayerState.unlockAttempts++;
      }
    };
    
    // Add event listeners for various user interactions
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchend', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    
    console.log('Audio unlock handlers set up');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'unlockAudioOnUserInteraction' });
  }
}

/**
 * Handle visibility change events
 */
function handleVisibilityChange() {
  try {
    const isHidden = document.hidden;
    console.log(`Document visibility changed: ${isHidden ? 'hidden' : 'visible'}`);
    
    // If becoming hidden, store the current playback state
    if (isHidden) {
      if (PlayerState.activeMediaElement) {
        PlayerState.wasPlayingBeforeHidden = !PlayerState.activeMediaElement.paused;
        
        // Optionally pause when hidden (configurable)
        const pauseWhenHidden = false; // Could be a user setting
        if (pauseWhenHidden && PlayerState.wasPlayingBeforeHidden) {
          PlayerState.activeMediaElement.pause();
        }
      }
    } else {
      // If becoming visible again, restore playback if it was playing before
      if (PlayerState.wasPlayingBeforeHidden && PlayerState.activeMediaElement) {
        // Attempt to resume playback
        const playPromise = PlayerState.activeMediaElement.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error resuming playback after visibility change:', error);
          });
        }
      }
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'handleVisibilityChange' });
  }
}

/**
 * Handle keyboard shortcuts for player control
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyboardShortcuts(event) {
  try {
    // Skip if user is typing in an input field
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    const key = event.key.toLowerCase();
    
    // Space bar for play/pause
    if (key === ' ' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      
      // Toggle play/pause on active media element
      import('./player-core.js').then(module => {
        if (typeof module.togglePlayPause === 'function') {
          module.togglePlayPause();
        }
      }).catch(error => {
        ErrorLogger.handleError(error, { function: 'handleKeyboardShortcuts' });
      });
    }
    
    // 'M' for mute/unmute
    else if (key === 'm' && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      
      // Toggle mute on active media element
      import('./player-core.js').then(module => {
        if (typeof module.toggleMute === 'function') {
          module.toggleMute();
        }
      }).catch(error => {
        ErrorLogger.handleError(error, { function: 'handleKeyboardShortcuts' });
      });
    }
    
    // '?' to show keyboard shortcuts
    else if (key === '?' || (key === '/' && event.shiftKey)) {
      event.preventDefault();
      showKeyboardShortcutsInfo();
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'handleKeyboardShortcuts' });
  }
}

/**
 * Handle window resize events
 */
function handleWindowResize() {
  // Debounce resize events
  if (PlayerState.resizeTimeout) {
    clearTimeout(PlayerState.resizeTimeout);
  }
  
  PlayerState.resizeTimeout = setTimeout(() => {
    console.log('Window resized, updating layout');
    updateAllLayouts();
  }, 100); // Debounce resize events by 100ms
}

// Export public API
export {
  initializeApp
}; 