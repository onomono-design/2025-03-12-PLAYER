/**
 * Media Player Application
 * Main entry point that initializes and coordinates all player modules
 */

import { PlayerState } from './shared-state.js';
import { initializeCore, setupMediaElements } from './player-core.js';
import { initializeUI, setupUIListeners } from './player-ui.js';
import { initializePlaylist, loadPlaylistData } from './playlist-manager.js';
import { setupXRMode } from './xr-mode.js';
import { setupDeviceDetection, setupNetworkMonitoring } from './device-utils.js';
import { ErrorLogger } from './error-logger.js';
import { setupMediaPreloader } from './media-preloader.js';
import { initializeLayoutOptimizer, fixScrubberLayout } from './layout-optimizer.js';

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
        setupDeviceDetection();
        initializeUI();
        initializeCore();
        initializePlaylist();
        setupXRMode();
        setupMediaPreloader();
        
        // Initialize layout optimizations
        initializeLayoutOptimizer();
        
        // Fix scrubber layout issues
        fixScrubberLayout();
        
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
        setupDeviceDetection();
        initializeUI();
        initializeCore();
        initializePlaylist();
        setupXRMode();
        setupMediaPreloader();
        initializeLayoutOptimizer();
        fixScrubberLayout();
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
      }).catch(err => {
        console.error('Recovery failed:', err);
      });
    }, 1000);
  }
}

/**
 * Initialize autoplay support by attempting to unlock audio playback
 * @returns {Promise} A promise that resolves when initialization is complete
 */
function initializeAutoplaySupport() {
  console.log('Initializing autoplay support...');
  
  return new Promise((resolve, reject) => {
    try {
      // Create a user interaction context
      const userInteractionContext = document.createElement('div');
      userInteractionContext.setAttribute('tabindex', '0');
      userInteractionContext.style.position = 'absolute';
      userInteractionContext.style.top = '0';
      userInteractionContext.style.left = '0';
      userInteractionContext.style.width = '1px';
      userInteractionContext.style.height = '1px';
      userInteractionContext.style.opacity = '0';
      userInteractionContext.style.pointerEvents = 'none';
      document.body.appendChild(userInteractionContext);
      
      // Focus the element
      userInteractionContext.focus();
      
      // Create user gesture events
      for (const eventType of ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend']) {
        userInteractionContext.dispatchEvent(new Event(eventType, {
          bubbles: true,
          cancelable: true,
          view: window
        }));
      }
      
      // Single reusable silent audio element
      let silentAudio = null;
      let audioContext = null;
      
      // Try with AudioContext first (better approach)
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          audioContext = new AudioContext();
          const silentBuffer = audioContext.createBuffer(1, 1, 22050);
          const source = audioContext.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(audioContext.destination);
          source.start(0);
          console.log('AudioContext created and started');
          // If this works, we're done - no need for fallback methods
          setTimeout(() => {
            userInteractionContext.remove();
            resolve();
          }, 100);
          return;
        }
      } catch (audioContextError) {
        console.warn('AudioContext initialization failed:', audioContextError);
        // Continue with fallback methods
      }
      
      // Fallback: Try with a single HTML5 Audio element
      try {
        silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1TSS0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV');
        silentAudio.volume = 0.01; // Very low volume
        
        const playPromise = silentAudio.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Successfully played silent audio');
            setTimeout(() => {
              silentAudio.pause();
              silentAudio.remove();
              silentAudio = null;
              userInteractionContext.remove();
              resolve();
            }, 100);
          }).catch(error => {
            console.warn('Failed to play silent audio:', error);
            userInteractionContext.remove();
            // Resolve anyway to continue with app initialization
            resolve();
          });
        } else {
          // Older browsers may not return a promise
          setTimeout(() => {
            if (silentAudio) {
              silentAudio.pause();
              silentAudio.remove();
              silentAudio = null;
            }
            userInteractionContext.remove();
            resolve();
          }, 100);
        }
      } catch (error) {
        console.error('Error during silent audio playback:', error);
        // Clean up and resolve to continue with initialization
        if (silentAudio) {
          silentAudio.remove();
        }
        userInteractionContext.remove();
        resolve();
      }
      
      // Set a timeout to ensure we don't hang
      const timeoutId = setTimeout(() => {
        console.warn('Autoplay support initialization timed out');
        if (silentAudio) {
          silentAudio.pause();
          silentAudio.remove();
        }
        userInteractionContext.remove();
        resolve(); // Resolve anyway to continue with app initialization
      }, 2000);
    } catch (error) {
      console.error('Error during autoplay support initialization:', error);
      reject(error);
    }
  });
}

/**
 * Set up global event listeners
 */
function setupGlobalEventListeners() {
  // Listen for keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Listen for window resize events
  window.addEventListener('resize', handleWindowResize);
  
  // Listen for visibility changes to handle background/foreground transitions
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Listen for user interaction to unlock audio
  document.addEventListener('click', unlockAudioOnUserInteraction, { once: true });
  document.addEventListener('touchstart', unlockAudioOnUserInteraction, { once: true });
}

/**
 * Unlock audio playback on first user interaction
 */
function unlockAudioOnUserInteraction() {
  console.log('User interaction detected, attempting to unlock audio');
  
  // Create and play a silent audio element
  const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1TSS0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV');
  silentAudio.volume = 0.01; // Very low volume
  
  const playPromise = silentAudio.play();
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        console.log('Audio unlocked by user interaction');
        setTimeout(() => {
          silentAudio.pause();
          silentAudio.remove();
        }, 100);
      })
      .catch(error => {
        console.warn('Failed to unlock audio:', error);
        silentAudio.remove();
      });
  }
}

/**
 * Handle visibility change events
 */
function handleVisibilityChange() {
  if (document.hidden) {
    console.log('Page is now hidden, pausing playback and cleaning up resources');
    
    // Pause playback when page is hidden
    if (PlayerState.audio && !PlayerState.audio.paused) {
      PlayerState.audio.pause();
    }
    
    if (PlayerState.video && !PlayerState.video.paused) {
      PlayerState.video.pause();
    }
    
    // Clean up resources to save bandwidth
    import('./media-preloader.js').then(module => {
      module.cleanupMediaResources(true);  // Clean up all resources when page is hidden
    }).catch(error => {
      console.error('Error cleaning up resources:', error);
    });
  } else {
    console.log('Page is now visible');
  }
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyboardShortcuts(event) {
  // Skip handling if user is typing in an input field
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }
  
  switch (event.key) {
    case ' ':
      // Space bar: Play/Pause
      event.preventDefault(); // Prevent scrolling
      import('./player-core.js').then(module => {
        module.togglePlayPause();
      });
      break;
    case 'ArrowRight':
      // Right arrow: Seek forward
      event.preventDefault();
      if (PlayerState.audio) {
        PlayerState.audio.currentTime += 10; // Skip ahead 10 seconds
      }
      break;
    case 'ArrowLeft':
      // Left arrow: Seek backward
      event.preventDefault();
      if (PlayerState.audio) {
        PlayerState.audio.currentTime -= 10; // Skip back 10 seconds
      }
      break;
    case 'm':
    case 'M':
      // M: Toggle mute
      import('./player-core.js').then(module => {
        module.toggleMute();
      });
      break;
    case 'f':
    case 'F':
      // F: Toggle fullscreen
      import('./player-ui.js').then(module => {
        module.toggleFullscreen();
      });
      break;
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
    
    // Update layout elements
    import('./layout-optimizer.js').then(module => {
      module.ensurePlayerControlsCentered();
      module.syncAlbumArtworkWidth();
      module.fixScrubberLayout();
    }).catch(error => {
      ErrorLogger.handleError(error, { function: 'handleWindowResize' });
    });
  }, 100); // Debounce resize events by 100ms
}

// Export public API
export {
  initializeApp
}; 