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
      
      // Create and play multiple silent audio elements with different formats
      const audioFormats = [
        // MP3 silent audio
        'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV',
        // WAV silent audio
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      ];
      
      // Try to create an AudioContext
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const audioContext = new AudioContext();
          const silentBuffer = audioContext.createBuffer(1, 1, 22050);
          const source = audioContext.createBufferSource();
          source.buffer = silentBuffer;
          source.connect(audioContext.destination);
          source.start(0);
          console.log('AudioContext created and started');
        }
      } catch (audioContextError) {
        console.warn('AudioContext initialization failed:', audioContextError);
      }
      
      // Play all audio formats in parallel
      const audioPromises = audioFormats.map(format => {
        const audio = new Audio(format);
        audio.volume = 0.1;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          return playPromise.then(() => {
            console.log(`Successfully played silent audio: ${format.substring(0, 30)}...`);
            setTimeout(() => {
              audio.pause();
              audio.remove();
            }, 100);
          }).catch(error => {
            console.warn(`Failed to play silent audio: ${format.substring(0, 30)}...`, error);
            audio.remove();
          });
        }
        return Promise.resolve();
      });
      
      // Set a timeout to ensure we don't hang
      const timeoutId = setTimeout(() => {
        console.warn('Autoplay support initialization timed out');
        userInteractionContext.remove();
        resolve(); // Resolve anyway to continue with app initialization
      }, 3000);
      
      // Wait for all audio attempts to complete
      Promise.all(audioPromises)
        .then(() => {
          clearTimeout(timeoutId);
          console.log('Autoplay support initialization complete');
          userInteractionContext.remove();
          resolve();
        })
        .catch(error => {
          clearTimeout(timeoutId);
          console.warn('Autoplay support initialization failed:', error);
          userInteractionContext.remove();
          // Resolve anyway to continue with app initialization
          resolve();
        });
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
  const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV');
  silentAudio.volume = 0.1;
  
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
        console.warn('Failed to unlock audio on user interaction:', error);
        silentAudio.remove();
      });
  }
  
  // Try to create an AudioContext as well
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const audioContext = new AudioContext();
      const silentBuffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      console.log('AudioContext created on user interaction');
    }
  } catch (error) {
    console.warn('Failed to create AudioContext on user interaction:', error);
  }
}

/**
 * Handle visibility change events
 */
function handleVisibilityChange() {
  if (document.hidden) {
    // Page is hidden (in background)
    console.log('Page hidden, handling background state');
    
    // Pause media if playing to avoid unexpected background playback
    if (PlayerState.isPlaying && PlayerState.activeMediaElement) {
      // Store the current playback state to restore it when the page becomes visible again
      PlayerState.wasPlayingBeforeHidden = true;
      
      // Pause the media
      PlayerState.activeMediaElement.pause();
      
      // Update UI without changing the internal isPlaying state
      import('./player-ui.js').then(module => {
        module.updatePlayPauseButton(true); // true = paused
      });
    }
  } else {
    // Page is visible (in foreground)
    console.log('Page visible, handling foreground state');
    
    // Resume playback if it was playing before being hidden
    if (PlayerState.wasPlayingBeforeHidden && PlayerState.activeMediaElement) {
      // Reset the flag
      PlayerState.wasPlayingBeforeHidden = false;
      
      // Try to resume playback
      import('./player-core.js').then(module => {
        module.attemptMediaPlayback(
          PlayerState.activeMediaElement,
          // Success callback
          () => {
            console.log('Resumed playback after page became visible');
            PlayerState.setPlaybackState(true);
            
            import('./player-ui.js').then(uiModule => {
              uiModule.updatePlayPauseButton(false); // false = playing
            });
          },
          // Error callback
          (error) => {
            console.warn('Failed to resume playback after page became visible:', error);
            PlayerState.setPlaybackState(false);
          }
        );
      });
    }
  }
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} event - The keyboard event
 */
function handleKeyboardShortcuts(event) {
  // Only handle keyboard shortcuts if not in an input field
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }
  
  switch (event.key) {
    case ' ': // Spacebar
      event.preventDefault();
      // Toggle play/pause
      import('./player-core.js').then(module => {
        module.togglePlayPause();
      });
      break;
    case 'ArrowRight':
      // Next track
      import('./playlist-manager.js').then(module => {
        module.loadNextTrack();
      });
      break;
    case 'ArrowLeft':
      // Previous track
      import('./playlist-manager.js').then(module => {
        module.loadPreviousTrack();
      });
      break;
    case 'm':
      // Toggle mute
      import('./player-core.js').then(module => {
        module.toggleMute();
      });
      break;
    case 'f':
      // Toggle fullscreen
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
  // Update UI elements that depend on window size
  import('./player-ui.js').then(module => {
    module.ensurePlayerControlsCentered();
    module.syncAlbumArtworkWidth();
  });
  
  // Check orientation on mobile
  if (PlayerState.isMobileDevice) {
    import('./device-utils.js').then(module => {
      module.checkOrientation();
    });
  }
}

// Export public API
export {
  initializeApp
}; 