/**
 * Media Preloader Module
 * Handles media preloading and resource management
 */

import { PlayerState } from './shared-state.js';
import { ErrorLogger } from './error-logger.js';

// Keep track of preloaded media to avoid redundant loads
const preloadedMedia = new Map();

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
    
    // Clean up resources when page unloads
    window.addEventListener('beforeunload', () => {
      cleanupMediaResources(true); // force cleanup of all resources
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
    
    // Check if media is already preloaded
    const trackId = track.audioSrc;
    if (preloadedMedia.has(trackId) && preloadedMedia.get(trackId).loaded) {
      console.log(`Media for track "${track.title}" already preloaded, skipping`);
      PlayerState.isAudioPreloaded = true;
      if (track.videoSrc) {
        PlayerState.isVideoPreloaded = true;
      }
      resolve();
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
    
    // Create storage for media elements
    let tempAudio = null;
    let tempVideo = null;
    
    // Function to check if both files are loaded
    const checkBothLoaded = () => {
      if (audioLoaded && (videoLoaded || !track.videoSrc)) {
        PlayerState.isAudioPreloaded = true;
        if (track.videoSrc) {
          PlayerState.isVideoPreloaded = true;
        }
        
        // Store info that this media is preloaded
        preloadedMedia.set(trackId, {
          loaded: true,
          audio: tempAudio,
          video: tempVideo
        });
        
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
        
        // Clean up previous audio element if it exists
        if (tempAudio) {
          tempAudio.removeAttribute('src');
          tempAudio.load();
          tempAudio = null;
        }
        
        // Create a new audio element for the retry
        tempAudio = new Audio();
        tempAudio.preload = 'auto';
        tempAudio.src = track.audioSrc; // No cache-busting parameter
        
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
        
        // Clean up previous video element if it exists
        if (tempVideo) {
          tempVideo.removeAttribute('src');
          tempVideo.load();
          tempVideo = null;
        }
        
        // Create a new video element for the retry
        tempVideo = document.createElement('video');
        tempVideo.preload = 'auto';
        tempVideo.muted = true;
        tempVideo.crossOrigin = 'anonymous';
        tempVideo.src = track.videoSrc; // No cache-busting parameter
        
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
    tempAudio = new Audio();
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
      tempVideo = document.createElement('video');
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
 * @param {boolean} cleanAll - Whether to clean all resources (true) or just current track (false)
 */
export function cleanupMediaResources(cleanAll = false) {
  console.log('Cleaning up media resources');
  
  try {
    if (cleanAll) {
      // Clean up all cached media resources
      preloadedMedia.forEach((mediaData, trackId) => {
        if (mediaData.audio) {
          mediaData.audio.removeAttribute('src');
          mediaData.audio.load();
        }
        if (mediaData.video) {
          mediaData.video.removeAttribute('src');
          mediaData.video.load();
        }
      });
      
      // Clear the cache
      preloadedMedia.clear();
    } else {
      // Clean up just the resources for tracks that aren't the current or next track
      const currentTrackId = PlayerState.currentTrack?.audioSrc;
      const nextTrackId = PlayerState.getNextTrack()?.audioSrc;
      
      preloadedMedia.forEach((mediaData, trackId) => {
        if (trackId !== currentTrackId && trackId !== nextTrackId) {
          if (mediaData.audio) {
            mediaData.audio.removeAttribute('src');
            mediaData.audio.load();
          }
          if (mediaData.video) {
            mediaData.video.removeAttribute('src');
            mediaData.video.load();
          }
          preloadedMedia.delete(trackId);
        }
      });
    }
    
    // Force garbage collection for older browsers
    if (window.gc) {
      window.gc();
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'cleanupMediaResources' });
  }
} 