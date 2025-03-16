/**
 * Media Preloader Module
 * Handles media preloading and resource management
 */

import { PlayerState } from './shared-state.js';
import { ErrorLogger } from './error-logger.js';

/**
 * Set up media preloader
 */
export function setupMediaPreloader() {
  console.log('Setting up media preloader...');
  
  try {
    // Set up event listeners for resource cleanup
    document.addEventListener('current-track-changed', (event) => {
      // Clean up resources when track changes
      cleanupMediaResources();
    });
    
    console.log('Media preloader setup complete');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'setupMediaPreloader' });
  }
}

/**
 * Preload both audio and video for a track
 * @param {Object} track - The track to preload
 * @returns {Promise} A promise that resolves when preloading is complete
 */
export function preloadTrackMedia(track) {
  return new Promise((resolve, reject) => {
    if (!track || !track.audioSrc) {
      reject(new Error('Invalid track or missing audio source'));
      return;
    }
    
    console.log(`Preloading media for track: ${track.title}`);
    
    if (PlayerState.elements.message) {
      PlayerState.elements.message.textContent = "Preloading media...";
      PlayerState.elements.message.style.display = "block";
    }
    
    // Set up counters to track when files are loaded
    let audioLoaded = false;
    let videoLoaded = false;
    let audioAttempts = 0;
    let videoAttempts = 0;
    const maxAttempts = 3;
    
    // Function to check if both files are loaded
    const checkBothLoaded = () => {
      if (audioLoaded && (videoLoaded || !track.videoSrc)) {
        PlayerState.isAudioPreloaded = true;
        if (track.videoSrc) {
          PlayerState.isVideoPreloaded = true;
        }
        
        if (PlayerState.elements.message) {
          PlayerState.elements.message.textContent = "Media ready. Click play to start.";
          setTimeout(() => {
            if (PlayerState.elements.message && 
                PlayerState.elements.message.textContent === "Media ready. Click play to start.") {
              PlayerState.elements.message.style.display = "none";
            }
          }, 3000);
        }
        
        console.log(`Media preloaded successfully for track: ${track.title}`);
        resolve();
      }
    };
    
    // Function to retry loading audio
    const retryAudioLoad = () => {
      if (audioAttempts < maxAttempts) {
        audioAttempts++;
        console.log(`Retrying audio preload (attempt ${audioAttempts}/${maxAttempts})...`);
        
        if (PlayerState.elements.message) {
          PlayerState.elements.message.textContent = `Retrying audio preload (attempt ${audioAttempts}/${maxAttempts})...`;
        }
        
        // Create a new audio element for the retry
        const tempAudio = new Audio();
        tempAudio.preload = 'auto';
        tempAudio.src = track.audioSrc + '?retry=' + new Date().getTime(); // Add cache-busting parameter
        
        tempAudio.addEventListener('canplaythrough', function onAudioReady() {
          audioLoaded = true;
          tempAudio.removeEventListener('canplaythrough', onAudioReady);
          checkBothLoaded();
        });
        
        tempAudio.addEventListener('error', function(e) {
          console.error(`Audio preload error (attempt ${audioAttempts}/${maxAttempts}):`, e);
          if (audioAttempts < maxAttempts) {
            setTimeout(retryAudioLoad, 2000); // Wait 2 seconds before retrying
          } else {
            if (PlayerState.elements.message) {
              PlayerState.elements.message.textContent = "Error preloading audio. Continuing with limited functionality.";
            }
            
            // Continue anyway with video if possible
            if (videoLoaded) {
              setTimeout(() => {
                if (PlayerState.elements.message) {
                  PlayerState.elements.message.style.display = "none";
                }
              }, 3000);
            }
            
            reject(new Error('Failed to preload audio after multiple attempts'));
          }
        });
        
        tempAudio.load();
      }
    };
    
    // Function to retry loading video
    const retryVideoLoad = () => {
      if (!track.videoSrc) {
        videoLoaded = true;
        checkBothLoaded();
        return;
      }
      
      if (videoAttempts < maxAttempts) {
        videoAttempts++;
        console.log(`Retrying video preload (attempt ${videoAttempts}/${maxAttempts})...`);
        
        if (PlayerState.elements.message) {
          PlayerState.elements.message.textContent = `Retrying video preload (attempt ${videoAttempts}/${maxAttempts})...`;
        }
        
        // Create a new video element for the retry
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'auto';
        tempVideo.muted = true;
        tempVideo.crossOrigin = 'anonymous';
        tempVideo.src = track.videoSrc + '?retry=' + new Date().getTime(); // Add cache-busting parameter
        
        tempVideo.addEventListener('canplaythrough', function onVideoReady() {
          videoLoaded = true;
          tempVideo.removeEventListener('canplaythrough', onVideoReady);
          checkBothLoaded();
        });
        
        tempVideo.addEventListener('error', function(e) {
          console.error(`Video preload error (attempt ${videoAttempts}/${maxAttempts}):`, e);
          if (videoAttempts < maxAttempts) {
            setTimeout(retryVideoLoad, 2000); // Wait 2 seconds before retrying
          } else {
            if (PlayerState.elements.message) {
              PlayerState.elements.message.textContent = "Error preloading 360° video. Audio-only mode available.";
            }
            
            // Continue anyway with audio if possible
            if (audioLoaded) {
              setTimeout(() => {
                if (PlayerState.elements.message) {
                  PlayerState.elements.message.style.display = "none";
                }
              }, 3000);
            }
            
            // We can still resolve since audio might be available
            resolve();
          }
        });
        
        tempVideo.load();
      }
    };
    
    // Preload audio
    const tempAudio = new Audio();
    tempAudio.preload = 'auto';
    tempAudio.src = track.audioSrc;
    
    tempAudio.addEventListener('canplaythrough', function onAudioReady() {
      audioLoaded = true;
      tempAudio.removeEventListener('canplaythrough', onAudioReady);
      checkBothLoaded();
    });
    
    tempAudio.addEventListener('error', function(e) {
      console.error('Audio preload error:', e);
      retryAudioLoad();
    });
    
    // Preload video if available
    if (track.videoSrc) {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'auto';
      tempVideo.muted = true;
      tempVideo.crossOrigin = 'anonymous';
      tempVideo.src = track.videoSrc;
      
      tempVideo.addEventListener('canplaythrough', function onVideoReady() {
        videoLoaded = true;
        tempVideo.removeEventListener('canplaythrough', onVideoReady);
        checkBothLoaded();
      });
      
      tempVideo.addEventListener('error', function(e) {
        console.error('Video preload error:', e);
        retryVideoLoad();
      });
      
      tempVideo.load();
    } else {
      // No video to preload
      videoLoaded = true;
    }
    
    // Start loading audio
    tempAudio.load();
  });
}

/**
 * Check if all media is preloaded and update UI accordingly
 */
export function checkAllMediaPreloaded() {
  if (PlayerState.isAudioPreloaded) {
    if (PlayerState.elements.message) {
      PlayerState.elements.message.textContent = "Media ready. Click play to start.";
      setTimeout(() => {
        if (PlayerState.elements.message && 
            PlayerState.elements.message.textContent === "Media ready. Click play to start.") {
          PlayerState.elements.message.style.display = "none";
        }
      }, 3000);
    }
  }
}

/**
 * Clean up resources when switching tracks to prevent memory leaks
 */
export function cleanupMediaResources() {
  console.log('Cleaning up media resources');
  
  try {
    // Remove all event listeners that might be causing memory leaks
    const cleanupElement = (element) => {
      // Create a clone of the element without event listeners
      if (element && element.parentNode) {
        const clone = element.cloneNode(true);
        if (element.parentNode) {
          element.parentNode.replaceChild(clone, element);
          return clone;
        }
      }
      return element;
    };
    
    // Clean up any temporary media elements that might be in memory
    const tempElements = document.querySelectorAll('video:not(#video360), audio:not(#audioElement)');
    tempElements.forEach(element => {
      console.log('Removing temporary media element:', element);
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    // Force garbage collection of any large objects
    if (window.gc) {
      try {
        window.gc();
        console.log('Forced garbage collection');
      } catch (e) {
        console.log('Garbage collection not available');
      }
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'cleanupMediaResources' });
  }
} 