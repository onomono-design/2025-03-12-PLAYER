/**
 * Media Synchronization Module
 * Handles synchronization between audio and video elements
 */

import { PlayerState } from '../shared-state.js';
import { ErrorLogger } from '../error-logger.js';

// Variables for tracking synchronization
let syncInterval = null;
const SYNC_INTERVAL_MS = 1000; // Check sync every second
const MAX_SYNC_DIFF_SEC = 0.3; // Maximum allowed time difference in seconds

/**
 * Setup media synchronization between audio and video
 */
export function setupMediaSync() {
  console.log('Setting up media synchronization...');
  
  try {
    // Clear any existing sync interval
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    
    // Set up periodic sync check
    syncInterval = setInterval(() => {
      syncMediaPlayback();
    }, SYNC_INTERVAL_MS);
    
    console.log('Media synchronization set up with interval:', SYNC_INTERVAL_MS, 'ms');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'setupMediaSync' });
  }
}

/**
 * Enforce proper muting between audio and video elements
 * Ensures only one element is producing sound at a time
 */
export function enforceProperMuting() {
  try {
    // Skip if media elements are not available
    if (!PlayerState.audio || !PlayerState.video) {
      return;
    }
    
    const audio = PlayerState.audio;
    const video = PlayerState.video;
    
    if (PlayerState.isXRMode) {
      // In XR mode, video should be unmuted, audio should be muted
      if (!video.muted) {
        console.log('XR mode: Ensuring audio is muted');
        audio.muted = true;
      }
    } else {
      // In audio mode, audio should be unmuted, video should be muted
      if (!audio.muted) {
        console.log('Audio mode: Ensuring video is muted');
        video.muted = true;
      }
    }
    
    // Update mute button to reflect current state
    import('../player-ui.js').then(module => {
      if (typeof module.updateMuteButton === 'function') {
        module.updateMuteButton();
      }
    }).catch(error => {
      console.error('Error updating mute button:', error);
    });
  } catch (error) {
    console.error('Error enforcing proper muting:', error);
  }
}

/**
 * Synchronize playback between audio and video elements
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
    
    // Only sync if the difference is significant
    if (timeDiff > MAX_SYNC_DIFF_SEC) {
      console.log(`Media out of sync by ${timeDiff.toFixed(2)}s - synchronizing`);
      
      // Determine the primary media element based on mode
      if (PlayerState.isXRMode) {
        // In XR mode, video is the master
        audio.currentTime = video.currentTime;
      } else {
        // In audio mode, audio is the master
        video.currentTime = audio.currentTime;
      }
      
      // Ensure playback state is synced
      syncPlaybackState();
    }
  } catch (error) {
    console.error('Error synchronizing media playback:', error);
  }
}

/**
 * Synchronize play/pause state between audio and video
 */
export function syncPlaybackState() {
  try {
    // Skip if we don't have both media elements
    if (!PlayerState.audio || !PlayerState.video) {
      return;
    }
    
    const audio = PlayerState.audio;
    const video = PlayerState.video;
    
    // Check if either element is playing
    const isAudioPlaying = !audio.paused;
    const isVideoPlaying = !video.paused;
    
    if (PlayerState.isXRMode) {
      // In XR mode, video is the master
      if (isVideoPlaying && audio.paused) {
        console.log('Syncing audio play state to playing video');
        audio.play().catch(error => {
          console.error('Error playing audio during sync:', error);
        });
      } else if (!isVideoPlaying && !audio.paused) {
        console.log('Syncing audio pause state to paused video');
        audio.pause();
      }
    } else {
      // In audio mode, audio is the master
      if (isAudioPlaying && video.paused) {
        console.log('Syncing video play state to playing audio');
        video.play().catch(error => {
          console.error('Error playing video during sync:', error);
        });
      } else if (!isAudioPlaying && !video.paused) {
        console.log('Syncing video pause state to paused audio');
        video.pause();
      }
    }
    
    // Ensure proper muting regardless of playback state
    enforceProperMuting();
  } catch (error) {
    console.error('Error synchronizing playback state:', error);
  }
} 