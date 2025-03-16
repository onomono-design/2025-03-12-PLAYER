/**
 * XR Mode Module
 * Handles 360° video functionality and camera controls
 */

import { PlayerState } from './shared-state.js';
import { ErrorLogger } from './error-logger.js';
import { enforceProperMuting } from './player-core.js';
import { updateUIForCurrentMode, updateAudioPlayerUI } from './player-ui.js';

// Flag to track if camera recentering is in progress
let isRecenteringInProgress = false;

/**
 * Set up XR mode functionality
 */
export function setupXRMode() {
  console.log('Setting up XR mode...');
  
  try {
    // Set up button click handlers
    setupXRButtons();
    
    console.log('XR mode setup complete');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'setupXRMode' });
  }
}

/**
 * Set up XR mode button handlers
 */
function setupXRButtons() {
  // View in XR button
  if (PlayerState.elements.viewXRBtn) {
    PlayerState.elements.viewXRBtn.addEventListener('click', switchToXRMode);
  }
  
  // Exit XR button
  if (PlayerState.elements.exitXRBtn) {
    PlayerState.elements.exitXRBtn.addEventListener('click', switchToAudioMode);
  }
  
  // Recenter camera button
  if (PlayerState.elements.recenterCameraBtn) {
    PlayerState.elements.recenterCameraBtn.addEventListener('click', recenterCamera);
  }
}

/**
 * Switch to XR mode (360° video)
 */
export function switchToXRMode() {
  console.log('Switching to XR mode');
  
  try {
    // Check if the current track has an XR scene
    const currentTrack = PlayerState.currentTrackIndex !== -1 ? 
      PlayerState.playlist[PlayerState.currentTrackIndex] : null;
    
    if (!currentTrack || !currentTrack.videoSrc || currentTrack.videoSrc.trim() === '') {
      console.log('Current track does not have an XR scene');
      
      if (PlayerState.elements.message) {
        PlayerState.elements.message.textContent = "This track does not have a 360° scene.";
        PlayerState.elements.message.style.display = "block";
        
        setTimeout(() => {
          if (PlayerState.elements.message && 
              PlayerState.elements.message.textContent === "This track does not have a 360° scene.") {
            PlayerState.elements.message.style.display = "none";
          }
        }, 3000);
      }
      
      return;
    }
    
    // Store the current playback state
    const wasPlaying = PlayerState.activeMediaElement && !PlayerState.activeMediaElement.paused;
    
    // Pause both media elements temporarily
    if (PlayerState.audio) PlayerState.audio.pause();
    if (PlayerState.video) PlayerState.video.pause();
    
    // Set XR mode flag
    PlayerState.setXRMode(true);
    
    // Update the active media element
    PlayerState.setActiveMediaElement(PlayerState.video);
    
    // Update UI for XR mode
    updateUIForCurrentMode(true);
    
    // Ensure proper muting
    enforceProperMuting();
    
    // Resume playback if it was playing before
    if (wasPlaying && PlayerState.activeMediaElement) {
      PlayerState.activeMediaElement.play().catch(error => {
        ErrorLogger.handleError(error, { function: 'switchToXRMode' });
      });
    }
    
    // Recenter the camera
    setTimeout(recenterCamera, 500);
    
    console.log('Successfully switched to XR mode');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'switchToXRMode' });
  }
}

/**
 * Switch to audio-only mode
 */
export function switchToAudioMode() {
  console.log('Switching to audio-only mode');
  
  try {
    // Store the current playback state
    const wasPlaying = PlayerState.activeMediaElement && !PlayerState.activeMediaElement.paused;
    
    // Pause both media elements temporarily
    if (PlayerState.audio) PlayerState.audio.pause();
    if (PlayerState.video) PlayerState.video.pause();
    
    // Set XR mode flag
    PlayerState.setXRMode(false);
    
    // Update the active media element
    PlayerState.setActiveMediaElement(PlayerState.audio);
    
    // Update UI for audio mode
    updateUIForCurrentMode(false);
    
    // Ensure proper muting
    enforceProperMuting();
    
    // Resume playback if it was playing before
    if (wasPlaying && PlayerState.activeMediaElement) {
      PlayerState.activeMediaElement.play().catch(error => {
        ErrorLogger.handleError(error, { function: 'switchToAudioMode' });
      });
    }
    
    // Update audio player UI with current track info
    const currentTrack = PlayerState.currentTrackIndex !== -1 ? 
      PlayerState.playlist[PlayerState.currentTrackIndex] : null;
    
    if (currentTrack) {
      updateAudioPlayerUI(
        currentTrack.title, 
        currentTrack.playlistName, 
        currentTrack.artworkUrl
      );
    }
    
    console.log('Successfully switched to audio-only mode');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'switchToAudioMode' });
  }
}

/**
 * Recenter the camera in XR mode
 */
export function recenterCamera() {
  // Prevent multiple recentering operations at once
  if (isRecenteringInProgress) {
    console.log('Camera recentering already in progress, ignoring request');
    return;
  }
  
  console.log('Recentering camera');
  isRecenteringInProgress = true;
  
  try {
    // Show a message
    if (PlayerState.elements.message) {
      PlayerState.elements.message.textContent = "Recentering view...";
      PlayerState.elements.message.style.display = "block";
    }
    
    // Try different methods to recenter the camera
    
    // Method 1: Use A-Frame's built-in function if available
    if (window.recenterCameraFromAFrame) {
      console.log('Using A-Frame recenter function');
      const success = window.recenterCameraFromAFrame();
      
      if (success) {
        console.log('A-Frame camera recentering successful');
        
        // Hide message after a short delay
        setTimeout(() => {
          if (PlayerState.elements.message) {
            PlayerState.elements.message.textContent = "View recentered";
            
            setTimeout(() => {
              if (PlayerState.elements.message && 
                  PlayerState.elements.message.textContent === "View recentered") {
                PlayerState.elements.message.style.display = "none";
              }
            }, 1500);
          }
        }, 500);
        
        isRecenteringInProgress = false;
        return;
      }
    }
    
    // Method 2: Get the camera entity and manipulate it directly
    const cameraEntity = getLatestCameraEntity();
    if (cameraEntity) {
      console.log('Using direct camera entity manipulation');
      
      // Get the current device type
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log('Device detected as:', isMobile ? 'mobile' : 'desktop');
      
      // Set the target rotation to 0,0,0 for complete centering
      const targetRotation = { x: 0, y: 0, z: 0 };
      
      if (isMobile) {
        // On mobile, try to completely remove and re-add the look-controls
        const oldLookControlsData = cameraEntity.getAttribute('look-controls');
        cameraEntity.removeAttribute('look-controls');
        
        // Set rotation directly without look-controls
        setTimeout(() => {
          cameraEntity.setAttribute('rotation', targetRotation);
          
          // Re-add look-controls after setting rotation
          setTimeout(() => {
            cameraEntity.setAttribute('look-controls', oldLookControlsData);
          }, 100);
        }, 50);
      } else {
        // On desktop, just set the rotation
        cameraEntity.setAttribute('rotation', targetRotation);
        
        // Also try to directly manipulate the look-controls if available
        if (cameraEntity.components && cameraEntity.components['look-controls']) {
          const lookControls = cameraEntity.components['look-controls'];
          if (lookControls.pitchObject) lookControls.pitchObject.rotation.x = 0;
          if (lookControls.yawObject) lookControls.yawObject.rotation.y = 0;
        }
      }
      
      console.log('Applied camera recentering');
      
      // Update message
      setTimeout(() => {
        if (PlayerState.elements.message) {
          PlayerState.elements.message.textContent = "View recentered";
          setTimeout(() => {
            if (PlayerState.elements.message && 
                PlayerState.elements.message.textContent === "View recentered") {
              PlayerState.elements.message.style.display = "none";
            }
          }, 1500);
        }
      }, 500);
    } else {
      console.error('Could not find camera entity');
      
      if (PlayerState.elements.message) {
        PlayerState.elements.message.textContent = "Could not recenter view";
        setTimeout(() => {
          if (PlayerState.elements.message && 
              PlayerState.elements.message.textContent === "Could not recenter view") {
            PlayerState.elements.message.style.display = "none";
          }
        }, 1500);
      }
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'recenterCamera' });
    
    if (PlayerState.elements.message) {
      PlayerState.elements.message.textContent = "Error recentering view";
      setTimeout(() => {
        if (PlayerState.elements.message && 
            PlayerState.elements.message.textContent === "Error recentering view") {
          PlayerState.elements.message.style.display = "none";
        }
      }, 1500);
    }
  }
  
  // Reset the flag after a delay to ensure the operation completes
  setTimeout(() => {
    isRecenteringInProgress = false;
  }, 1000);
}

/**
 * Get the latest camera entity from the A-Frame scene
 * @returns {Object|null} The camera entity or null if not found
 */
function getLatestCameraEntity() {
  try {
    // Try to get the camera entity by ID first
    let camera = document.getElementById('cameraEntity');
    
    // If not found by ID, try to get it from the scene
    if (!camera) {
      const scene = document.querySelector('a-scene');
      if (scene) {
        camera = scene.querySelector('[camera]');
      }
    }
    
    return camera;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'getLatestCameraEntity' });
    return null;
  }
} 