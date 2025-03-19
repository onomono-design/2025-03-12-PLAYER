/**
 * Player Core Module
 * Handles core media player functionality including playback control and media synchronization
 */

import { PlayerState } from './shared-state.js';
import { ErrorLogger } from './error-logger.js';
import { updatePlayPauseButton, updateMuteButton, updateProgressBar, updateTimeDisplay } from './player-ui.js';

// Variables for media synchronization
let syncInterval = null;
let seekingTimeout = null;

/**
 * Initialize the core player functionality
 */
export function initializeCore() {
  console.log('Initializing player core...');
  
  try {
    // Set up event listeners for media elements
    setupMediaEventListeners();
    
    // Set up periodic muting check to prevent double audio playback
    setInterval(() => {
      // Only check when media is playing
      if (PlayerState.audio && PlayerState.video && 
          (!PlayerState.audio.paused || !PlayerState.video.paused)) {
        enforceProperMuting();
      }
    }, 1000); // Check every second
    
    // Set up media synchronization
    setupMediaSync();
    
    console.log('Player core initialized');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'initializeCore' });
  }
}

/**
 * Set up media elements and references
 */
export function setupMediaElements() {
  console.log('Setting up media elements...');
  
  try {
    // Initialize UI element references in PlayerState
    PlayerState.initializeElements();
    
    // Set up button click handlers
    setupButtonHandlers();
    
    console.log('Media elements set up complete');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'setupMediaElements' });
  }
}

/**
 * Set up button click handlers
 */
function setupButtonHandlers() {
  // Play/Pause button
  if (PlayerState.elements.playPauseBtn) {
    PlayerState.elements.playPauseBtn.addEventListener('click', togglePlayPause);
  }
  
  // Mute button
  if (PlayerState.elements.muteBtn) {
    PlayerState.elements.muteBtn.addEventListener('click', toggleMute);
  }
  
  // Scrubber
  if (PlayerState.elements.scrubber) {
    PlayerState.elements.scrubber.addEventListener('input', handleScrubberInput);
    PlayerState.elements.scrubber.addEventListener('change', handleScrubberChange);
  }
}

/**
 * Set up event listeners for media elements
 */
function setupMediaEventListeners() {
  if (!PlayerState.audio || !PlayerState.video) {
    console.error('Media elements not found');
    return;
  }
  
  // Time update events
  PlayerState.audio.addEventListener('timeupdate', handleTimeUpdate);
  PlayerState.video.addEventListener('timeupdate', handleTimeUpdate);
  
  // Seeking events
  PlayerState.audio.addEventListener('seeking', handleSeeking);
  PlayerState.audio.addEventListener('seeked', handleSeeked);
  PlayerState.video.addEventListener('seeking', handleSeeking);
  PlayerState.video.addEventListener('seeked', handleSeeked);
  
  // Buffering events
  PlayerState.audio.addEventListener('waiting', handleWaiting);
  PlayerState.audio.addEventListener('playing', handlePlaying);
  PlayerState.video.addEventListener('waiting', handleWaiting);
  PlayerState.video.addEventListener('playing', handlePlaying);
  
  // Ended events
  PlayerState.audio.addEventListener('ended', handleMediaEnded);
  PlayerState.video.addEventListener('ended', handleMediaEnded);
  
  // Error events
  PlayerState.audio.addEventListener('error', handleMediaError);
  PlayerState.video.addEventListener('error', handleMediaError);
}

/**
 * Handle time update events from media elements
 */
function handleTimeUpdate() {
  if (PlayerState.isSeeking) return;
  
  const activeMedia = PlayerState.activeMediaElement;
  if (!activeMedia) return;
  
  // Update time display
  updateTimeDisplay(activeMedia.currentTime, activeMedia.duration);
  
  // Update progress bar
  if (activeMedia.duration > 0) {
    const percentage = (activeMedia.currentTime / activeMedia.duration) * 100;
    updateProgressBar(percentage);
  }
}

/**
 * Handle seeking events
 */
function handleSeeking() {
  console.log('Media seeking started');
  PlayerState.isSeeking = true;
  
  // Show loading message after a short delay if still seeking
  if (seekingTimeout) {
    clearTimeout(seekingTimeout);
  }
  
  seekingTimeout = setTimeout(() => {
    if (PlayerState.isSeeking && PlayerState.elements.message) {
      PlayerState.elements.message.textContent = "Seeking...";
      PlayerState.elements.message.style.display = "block";
    }
  }, 500);
}

/**
 * Handle seeked events
 */
function handleSeeked() {
  console.log('Media seeking ended');
  PlayerState.isSeeking = false;
  
  // Clear the timeout
  if (seekingTimeout) {
    clearTimeout(seekingTimeout);
    seekingTimeout = null;
  }
  
  // Hide loading message
  if (PlayerState.elements.message) {
    PlayerState.elements.message.style.display = "none";
  }
}

/**
 * Handle waiting (buffering) events
 */
function handleWaiting() {
  console.log('Media buffering');
  if (PlayerState.elements.message) {
    PlayerState.elements.message.textContent = "Buffering...";
    PlayerState.elements.message.style.display = "block";
  }
}

/**
 * Handle playing events
 */
function handlePlaying() {
  // Only hide the message if it's showing a buffering message
  if (PlayerState.elements.message && 
      (PlayerState.elements.message.textContent === "Buffering..." || 
       PlayerState.elements.message.textContent === "Loading media...")) {
    PlayerState.elements.message.style.display = "none";
  }
}

/**
 * Handle media ended events
 */
function handleMediaEnded() {
  console.log('Media playback ended');
  
  // Update UI
  updatePlayPauseButton(true); // paused state
  
  // Auto-advance to next track if available
  import('./playlist-manager.js').then(module => {
    module.loadNextTrack();
  }).catch(error => {
    ErrorLogger.handleError(error, { function: 'handleMediaEnded' });
  });
}

/**
 * Handle media error events
 */
function handleMediaError(event) {
  const mediaElement = event.target;
  const errorCode = mediaElement.error ? mediaElement.error.code : 'unknown';
  const errorMessage = getMediaErrorMessage(errorCode);
  
  console.error(`Media error (${errorCode}): ${errorMessage}`);
  
  ErrorLogger.handleError(new Error(`Media error: ${errorMessage}`), {
    mediaElement: mediaElement === PlayerState.audio ? 'audio' : 'video',
    errorCode,
    src: mediaElement.currentSrc
  });
}

/**
 * Get a human-readable error message for media error codes
 */
function getMediaErrorMessage(errorCode) {
  switch (errorCode) {
    case 1:
      return "The fetching process for the media resource was aborted by the user agent.";
    case 2:
      return "A network error occurred while fetching the media resource.";
    case 3:
      return "An error occurred while decoding the media resource.";
    case 4:
      return "The media resource is not supported.";
    default:
      return "An unknown error occurred.";
  }
}

/**
 * Handle scrubber input events
 */
function handleScrubberInput(event) {
  const scrubberValue = parseFloat(event.target.value);
  
  // Update progress bar immediately for visual feedback
  updateProgressBar(scrubberValue);
  
  // Calculate and display the time without actually seeking yet
  if (PlayerState.activeMediaElement && PlayerState.activeMediaElement.duration) {
    const seekTime = (scrubberValue / 100) * PlayerState.activeMediaElement.duration;
    updateTimeDisplay(seekTime, PlayerState.activeMediaElement.duration);
  }
}

/**
 * Handle scrubber change events (when user releases the scrubber)
 */
function handleScrubberChange(event) {
  const scrubberValue = parseFloat(event.target.value);
  
  if (PlayerState.activeMediaElement && PlayerState.activeMediaElement.duration) {
    const seekTime = (scrubberValue / 100) * PlayerState.activeMediaElement.duration;
    
    // Seek both media elements to maintain sync
    PlayerState.audio.currentTime = seekTime;
    PlayerState.video.currentTime = seekTime;
    
    // Update UI
    updateTimeDisplay(seekTime, PlayerState.activeMediaElement.duration);
    updateProgressBar(scrubberValue);
  }
}

/**
 * Toggle play/pause state of the active media element
 */
export function togglePlayPause() {
  if (!PlayerState.activeMediaElement) return;
  
  if (PlayerState.activeMediaElement.paused) {
    // Show loading message if media isn't preloaded yet
    if (!(PlayerState.isXRMode ? PlayerState.isVideoPreloaded : PlayerState.isAudioPreloaded)) {
      if (PlayerState.elements.message) {
        PlayerState.elements.message.textContent = "Loading media...";
        PlayerState.elements.message.style.display = "block";
      }
    }
    
    // If this is the first time playing, set up proper mute states
    if (PlayerState.isFirstPlay) {
      if (PlayerState.isXRMode) {
        // In XR mode, unmute video but keep audio muted
        PlayerState.video.muted = false;
        PlayerState.audio.muted = true;
      } else {
        // In audio mode, unmute audio but keep video muted
        PlayerState.audio.muted = false;
        PlayerState.video.muted = true;
      }
      updateMuteButton();
      PlayerState.isFirstPlay = false;
    } else {
      // Ensure proper muting based on current mode
      enforceProperMuting();
    }
    
    // DIRECT APPROACH: Try to play directly first since we're in a user interaction event
    console.log('Direct play attempt from play button click');
    
    // Create a flag to track if we've already handled this click
    let playAttemptHandled = false;
    
    // Try to play directly - this should work because we're in a user interaction event
    const playPromise = PlayerState.activeMediaElement.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (!playAttemptHandled) {
          playAttemptHandled = true;
          console.log('Direct play succeeded');
          
          // Update the play/pause button
          updatePlayPauseButton(false); // false = playing
          
          // Update PlayerState
          PlayerState.setPlaybackState(true);
          
          // Hide any loading messages
          if (PlayerState.elements.message && 
              PlayerState.elements.message.textContent === "Loading media...") {
            PlayerState.elements.message.style.display = "none";
          }
        }
      }).catch(error => {
        if (!playAttemptHandled) {
          playAttemptHandled = true;
          console.warn('Direct play failed, trying with helper:', error);
          
          // Fall back to the helper function
          attemptMediaPlayback(
            PlayerState.activeMediaElement,
            // Success callback
            () => {
              // Update the play/pause button
              updatePlayPauseButton(false); // false = playing
              
              // Update PlayerState
              PlayerState.setPlaybackState(true);
              
              // Hide any loading messages
              if (PlayerState.elements.message && 
                  PlayerState.elements.message.textContent === "Loading media...") {
                PlayerState.elements.message.style.display = "none";
              }
            },
            // Error callback
            (error) => {
              ErrorLogger.handleError(error, { function: 'togglePlayPause' });
              updatePlayPauseButton(true); // Update to paused state
              
              // Show error message to user
              if (PlayerState.elements.message) {
                PlayerState.elements.message.textContent = "Couldn't start playback. Please try again.";
                PlayerState.elements.message.style.display = "block";
                
                setTimeout(() => {
                  if (PlayerState.elements.message && 
                      PlayerState.elements.message.textContent === "Couldn't start playback. Please try again.") {
                    PlayerState.elements.message.style.display = "none";
                  }
                }, 3000);
              }
            }
          );
        }
      });
    } else {
      // Browser doesn't support promises on media elements
      console.log('Browser does not support play promises, assuming playback started');
      
      // Update the play/pause button
      updatePlayPauseButton(false); // false = playing
      
      // Update PlayerState
      PlayerState.setPlaybackState(true);
    }
  } else {
    // Pause the active media element
    PlayerState.activeMediaElement.pause();
    
    // Update the play/pause button
    updatePlayPauseButton(true); // true = paused
    
    // Update PlayerState
    PlayerState.setPlaybackState(false);
  }
}

/**
 * Toggle mute state of the active media element
 */
export function toggleMute() {
  if (!PlayerState.activeMediaElement) return;
  
  // Toggle mute state
  PlayerState.activeMediaElement.muted = !PlayerState.activeMediaElement.muted;
  
  // Update the mute button
  updateMuteButton();
}

/**
 * Set up media synchronization to keep audio and video in sync
 */
export function setupMediaSync() {
  console.log('Setting up media synchronization...');
  
  try {
    // Clear any existing sync interval
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
    
    // Set up a new sync interval
    syncInterval = setInterval(() => {
      // Only sync if both media elements exist and one of them is playing
      if (PlayerState.audio && PlayerState.video && 
          (!PlayerState.audio.paused || !PlayerState.video.paused)) {
        syncMediaPlayback();
      }
    }, 1000); // Check sync every second
    
    // Clean up the interval when the page is unloaded
    window.addEventListener('beforeunload', () => {
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
    });
    
    console.log('Media synchronization set up');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'setupMediaSync' });
  }
}

/**
 * Enforce proper muting to prevent double audio playback
 */
export function enforceProperMuting() {
  try {
    // Skip if media elements are not available
    if (!PlayerState.audio || !PlayerState.video) {
      return;
    }
    
    // If audio is playing, mute the video
    if (!PlayerState.audio.paused) {
      if (!PlayerState.video.muted) {
        console.log('Muting video to prevent double audio playback');
        PlayerState.video.muted = true;
      }
    }
    
    // Update mute button
    import('./player-ui.js').then(module => {
      module.updateMuteButton();
    }).catch(error => {
      console.error('Error updating mute button:', error);
    });
  } catch (error) {
    console.error('Error enforcing proper muting:', error);
  }
}

/**
 * Attempt to play media with enhanced browser compatibility
 * @param {HTMLMediaElement} mediaElement - The media element to play
 * @param {Function} onSuccess - Callback function when playback starts successfully
 * @param {Function} onError - Callback function when playback fails
 */
export function attemptMediaPlayback(mediaElement, onSuccess, onError) {
  if (!mediaElement) {
    console.error('No media element provided for playback');
    if (onError) onError(new Error('No media element provided'));
    return;
  }
  
  console.log('Attempting to play media element:', mediaElement);
  
  // Track if we've already succeeded to avoid calling success callback multiple times
  let hasSucceeded = false;
  
  // Check if we're in a direct user interaction context
  const hasDirectUserInteraction = window.DIRECT_USER_INTERACTION === true;
  console.log(`Media playback attempt with${hasDirectUserInteraction ? '' : 'out'} direct user interaction context`);
  
  // Create a stronger user interaction context
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
  
  // Focus the element to strengthen the user interaction context
  userInteractionContext.focus();
  
  // Create a user gesture by triggering events on the context
  for (const eventType of ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend']) {
    userInteractionContext.dispatchEvent(new MouseEvent(eventType, {
      bubbles: true,
      cancelable: true,
      view: window
    }));
  }
  
  // If we have a direct user interaction, try the simplest approach first
  if (hasDirectUserInteraction) {
    console.log('Attempting direct play with user interaction context');
    
    // Try to play directly first
    const directPlayPromise = mediaElement.play();
    
    if (directPlayPromise !== undefined) {
      directPlayPromise.then(() => {
        console.log('Direct play succeeded with user interaction context');
        if (!hasSucceeded && onSuccess) {
          hasSucceeded = true;
          onSuccess();
        }
        
        // Remove the temporary element
        userInteractionContext.remove();
      }).catch(error => {
        console.warn('Direct play failed even with user interaction context:', error);
        // Continue with the more complex approaches
        attemptWithAllFallbacks();
      });
    } else {
      // Browser doesn't support promises on media elements
      console.log('Browser does not support play promises, continuing with fallbacks');
      attemptWithAllFallbacks();
    }
  } else {
    // No direct user interaction, use all fallbacks
    attemptWithAllFallbacks();
  }
  
  // Function to attempt playback with all fallback mechanisms
  function attemptWithAllFallbacks() {
    // Create a button that we'll click programmatically
    const tempButton = document.createElement('button');
    tempButton.style.position = 'absolute';
    tempButton.style.top = '0';
    tempButton.style.left = '0';
    tempButton.style.width = '1px';
    tempButton.style.height = '1px';
    tempButton.style.opacity = '0';
    tempButton.style.pointerEvents = 'none';
    document.body.appendChild(tempButton);
    
    // Add click handler to the button that will play the media
    tempButton.addEventListener('click', function clickHandler() {
      // Remove the event listener to prevent multiple calls
      tempButton.removeEventListener('click', clickHandler);
      
      // Try to unlock audio on iOS first
      unlockAudioOnIOS()
        .then(() => {
          console.log('iOS audio unlocked or not needed');
          
          // Use a timeout to ensure the media element is ready
          setTimeout(() => {
            // First attempt: direct play
            console.log('First attempt: direct play');
            const playPromise = mediaElement.play();
            
            if (playPromise !== undefined) {
              playPromise.then(() => {
                console.log('Direct playback started successfully');
                if (!hasSucceeded && onSuccess) {
                  hasSucceeded = true;
                  onSuccess();
                }
                
                // Remove the temporary elements
                userInteractionContext.remove();
                tempButton.remove();
              }).catch(error => {
                console.warn('Direct play failed:', error);
                
                // Second attempt: Try with AudioContext
                console.log('Second attempt: Using AudioContext');
                tryPlayWithAudioContext()
                  .then(() => {
                    // Try playing again after creating audio context
                    return mediaElement.play();
                  })
                  .then(() => {
                    console.log('AudioContext approach succeeded');
                    if (!hasSucceeded && onSuccess) {
                      hasSucceeded = true;
                      onSuccess();
                    }
                    
                    // Remove the temporary elements
                    userInteractionContext.remove();
                    tempButton.remove();
                  })
                  .catch(audioContextError => {
                    console.warn('AudioContext approach failed:', audioContextError);
                    
                    // Third attempt: Try with gesture simulation
                    console.log('Third attempt: Using gesture simulation');
                    tryPlayWithGestureSimulation(mediaElement)
                      .then(() => {
                        console.log('Gesture simulation succeeded');
                        if (!hasSucceeded && onSuccess) {
                          hasSucceeded = true;
                          onSuccess();
                        }
                        
                        // Remove the temporary elements
                        userInteractionContext.remove();
                        tempButton.remove();
                      })
                      .catch(gestureError => {
                        console.warn('Gesture simulation failed:', gestureError);
                        
                        // Fourth attempt: Try with a silent audio trick
                        console.log('Fourth attempt: Using silent audio trick');
                        tryPlayWithSilentAudio()
                          .then(() => {
                            // Try playing again after playing silent audio
                            return mediaElement.play();
                          })
                          .then(() => {
                            console.log('Silent audio trick succeeded');
                            if (!hasSucceeded && onSuccess) {
                              hasSucceeded = true;
                              onSuccess();
                            }
                            
                            // Remove the temporary elements
                            userInteractionContext.remove();
                            tempButton.remove();
                          })
                          .catch(silentAudioError => {
                            console.error('All autoplay attempts failed:', silentAudioError);
                            
                            // All approaches failed, call error callback
                            if (onError) {
                              onError(new Error('Autoplay blocked by browser after multiple attempts'));
                            }
                            
                            // Remove the temporary elements
                            userInteractionContext.remove();
                            tempButton.remove();
                          });
                      });
                  });
              });
            } else {
              console.warn('Play promise is undefined, browser might not support promises on media elements');
              
              // Try a direct check for playback after a short delay
              setTimeout(() => {
                if (!mediaElement.paused) {
                  console.log('Playback appears to have started (no promise)');
                  if (!hasSucceeded && onSuccess) {
                    hasSucceeded = true;
                    onSuccess();
                  }
                } else {
                  console.warn('Playback did not start (no promise)');
                  if (onError) {
                    onError(new Error('Playback did not start (no promise support)'));
                  }
                }
                
                // Remove the temporary elements
                userInteractionContext.remove();
                tempButton.remove();
              }, 500);
            }
          }, 100);
        })
        .catch(error => {
          console.warn('iOS audio unlock failed or not needed:', error);
          // Continue with playback attempts anyway
          if (onError) {
            onError(error);
          }
          
          // Remove the temporary elements
          userInteractionContext.remove();
          tempButton.remove();
        });
    });
    
    // Simulate a click on the button
    tempButton.click();
  }
}

/**
 * Try to unlock audio playback on iOS devices
 * @returns {Promise} A promise that resolves when audio is unlocked or rejects on failure
 */
function unlockAudioOnIOS() {
  return new Promise((resolve, reject) => {
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (!isIOS) {
      // Not iOS, no need to unlock
      resolve();
      return;
    }
    
    console.log('Attempting to unlock audio on iOS');
    
    // Create a temporary audio element
    const tempAudio = document.createElement('audio');
    tempAudio.setAttribute('playsinline', '');
    tempAudio.setAttribute('webkit-playsinline', '');
    tempAudio.setAttribute('preload', 'auto');
    tempAudio.src = 'data:audio/mpeg;base64,/+MYxAAAAANIAUAAAASEEB/jwOFM/0MM/90b/+RhST/w4NFwOjf///PZu////9lns5GFDv//l9GlUIEEIAAAgIg8Ir/JGq3/+MYxDsLIj5QMYcoAP0dv9HIjUcH//yYSg+CIbkGP//8w0bLVjUP///3Z0x5QCAv/yLjwtGKTEFNRTMuOTeqqqqqqqqqqqqq/+MYxEkNmdJkUYc4AKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
    tempAudio.volume = 0.01;
    tempAudio.style.display = 'none';
    document.body.appendChild(tempAudio);
    
    // Set a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      cleanup();
      resolve(); // Resolve anyway to continue with playback attempts
    }, 2000);
    
    // Function to clean up
    const cleanup = () => {
      clearTimeout(timeoutId);
      tempAudio.removeEventListener('play', onPlay);
      tempAudio.removeEventListener('error', onError);
      tempAudio.pause();
      tempAudio.remove();
    };
    
    // Event handlers
    const onPlay = () => {
      console.log('iOS audio unlock successful');
      cleanup();
      resolve();
    };
    
    const onError = (error) => {
      console.warn('iOS audio unlock error:', error);
      cleanup();
      reject(error);
    };
    
    // Add event listeners
    tempAudio.addEventListener('play', onPlay);
    tempAudio.addEventListener('error', onError);
    
    // Try to play
    const playPromise = tempAudio.play();
    if (playPromise === undefined) {
      // Browser doesn't return a promise, assume it worked
      onPlay();
    }
  });
}

/**
 * Try to play media using AudioContext API
 * @returns {Promise} A promise that resolves when AudioContext is created
 */
function tryPlayWithAudioContext() {
  return new Promise((resolve, reject) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        return reject(new Error('AudioContext not supported'));
      }
      
      // Create audio context
      const audioContext = new AudioContext();
      
      // Create and play a silent buffer
      const silentBuffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = silentBuffer;
      source.connect(audioContext.destination);
      source.start(0);
      
      // Resolve after a short delay
      setTimeout(resolve, 100);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Try to play media by simulating a user gesture
 * @param {HTMLMediaElement} mediaElement - The media element to play
 * @returns {Promise} A promise that resolves when playback starts
 */
function tryPlayWithGestureSimulation(mediaElement) {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary button that we'll click programmatically
      const tempButton = document.createElement('button');
      tempButton.style.position = 'absolute';
      tempButton.style.top = '0';
      tempButton.style.left = '0';
      tempButton.style.width = '1px';
      tempButton.style.height = '1px';
      tempButton.style.opacity = '0';
      tempButton.style.pointerEvents = 'none';
      document.body.appendChild(tempButton);
      
      // Add click handler
      tempButton.addEventListener('click', function clickHandler() {
        // Remove the event listener to prevent multiple calls
        tempButton.removeEventListener('click', clickHandler);
        
        // Try to play the media
        mediaElement.play()
          .then(() => {
            tempButton.remove();
            resolve();
          })
          .catch(error => {
            tempButton.remove();
            reject(error);
          });
      });
      
      // Simulate a click
      tempButton.click();
      
      // Also try touch events for mobile
      tempButton.dispatchEvent(new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      
      tempButton.dispatchEvent(new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Try to play media using a silent audio trick
 * @returns {Promise} A promise that resolves when silent audio is played
 */
function tryPlayWithSilentAudio() {
  return new Promise((resolve, reject) => {
    try {
      // Create a silent audio element
      const silentAudio = document.createElement('audio');
      silentAudio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV';
      silentAudio.volume = 0.1;
      silentAudio.style.display = 'none';
      document.body.appendChild(silentAudio);
      
      // Set a timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        cleanup();
        resolve(); // Resolve anyway to continue with playback attempts
      }, 2000);
      
      // Function to clean up
      const cleanup = () => {
        clearTimeout(timeoutId);
        silentAudio.removeEventListener('play', onPlay);
        silentAudio.removeEventListener('error', onError);
        silentAudio.pause();
        setTimeout(() => {
          silentAudio.remove();
        }, 100);
      };
      
      // Event handlers
      const onPlay = () => {
        console.log('Silent audio played successfully');
        cleanup();
        resolve();
      };
      
      const onError = (error) => {
        console.warn('Silent audio play error:', error);
        cleanup();
        reject(error);
      };
      
      // Add event listeners
      silentAudio.addEventListener('play', onPlay);
      silentAudio.addEventListener('error', onError);
      
      // Try to play
      const playPromise = silentAudio.play();
      if (playPromise === undefined) {
        // Browser doesn't return a promise, assume it worked
        onPlay();
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Synchronize media playback between audio and video
 */
function syncMediaPlayback() {
  try {
    // Skip sync if we don't have both media elements
    if (!PlayerState.audio || !PlayerState.video) {
      return;
    }
    
    // Skip sync if user is seeking
    if (PlayerState.isSeeking) {
      return;
    }
    
    const audio = PlayerState.audio;
    const video = PlayerState.video;
    
    // Only sync if one or both elements are playing
    if (audio.paused && video.paused) {
      return;
    }
    
    // Calculate time difference
    const timeDiff = Math.abs(audio.currentTime - video.currentTime);
    
    // Only sync if the difference is significant (more than 0.3 seconds)
    if (timeDiff > 0.3) {
      console.log(`Media out of sync by ${timeDiff.toFixed(2)}s - synchronizing`);
      
      // Determine the primary media element based on which one is playing
      if (!audio.paused && video.paused) {
        // Audio is playing but video is paused
        video.currentTime = audio.currentTime;
        
        // If we're in XR mode, also play the video
        if (PlayerState.isXRMode) {
          video.play().catch(error => {
            console.error('Error playing video during sync:', error);
          });
        }
      } else if (audio.paused && !video.paused) {
        // Video is playing but audio is paused
        audio.currentTime = video.currentTime;
        
        // If we're not in XR mode, also play the audio
        if (!PlayerState.isXRMode) {
          audio.play().catch(error => {
            console.error('Error playing audio during sync:', error);
          });
        }
      } else {
        // Both are playing - sync based on mode
        if (PlayerState.isXRMode) {
          audio.currentTime = video.currentTime;
        } else {
          video.currentTime = audio.currentTime;
        }
      }
    }
  } catch (error) {
    console.error('Error synchronizing media playback:', error);
  }
} 