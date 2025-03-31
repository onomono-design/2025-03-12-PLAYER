/**
 * XR Mode Module
 * Handles 360° video functionality and camera controls
 */

import { PlayerState } from './shared-state.js';
import { ErrorLogger } from './error-logger.js';
import { enforceProperMuting, syncPlaybackState } from './utils/media-sync.js';
import { updateUIForCurrentMode, updateAudioPlayerUI } from './player-ui.js';
import { showMessage } from './utils/messaging.js';
import { recenterCamera } from './utils/camera-controls.js';
import { requestDeviceMotionPermission } from './utils/device-detection.js';

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
    
    // Add detailed logging to debug the issue
    console.log('Current track for XR mode:', currentTrack ? {
      title: currentTrack.title,
      videoSrc: currentTrack.videoSrc,
      audioSrc: currentTrack.audioSrc,
      index: PlayerState.currentTrackIndex
    } : 'No current track');
    
    if (!currentTrack) {
      console.error('No current track loaded, cannot switch to XR mode');
      showMessage("No chapter loaded. Cannot switch to XR mode.", 3000);
      return;
    }
    
    if (!currentTrack.videoSrc || currentTrack.videoSrc.trim() === '') {
      console.warn('Current track does not have a valid XR scene URL:', currentTrack.title);
      
      // Check for XR_Scene directly in case normalization failed
      const rawTrackData = PlayerState.rawTrackData && PlayerState.rawTrackData[PlayerState.currentTrackIndex];
      if (rawTrackData && rawTrackData.XR_Scene && rawTrackData.XR_Scene.trim() !== '') {
        console.log('Found XR_Scene in raw track data, using that instead:', rawTrackData.XR_Scene);
        currentTrack.videoSrc = rawTrackData.XR_Scene;
      } else {
        showMessage("This track does not have a 360° scene.", 3000);
        return;
      }
    }
    
    // Check if this is an XR-only track (no audio source)
    const hasAudio = currentTrack.audioSrc && currentTrack.audioSrc.trim() !== '';
    const isXROnlyTrack = !hasAudio;
    
    if (isXROnlyTrack) {
      console.log('Track is XR-only (no audio source)');
      
      // Store this state in the track object for reference elsewhere
      currentTrack.isXROnlyTrack = true;
      
      // Store in global state if available
      PlayerState.currentTrackIsXROnly = true;
      
      // Add a special class to the body for CSS targeting
      document.body.classList.add('xr-only-track');
      
      // Immediately hide the exit XR button if it exists
      if (PlayerState.elements.exitXRBtn) {
        console.log('Immediately hiding exit XR button from switchToXRMode');
        PlayerState.elements.exitXRBtn.style.display = 'none';
        PlayerState.elements.exitXRBtn.style.pointerEvents = 'none';
        PlayerState.elements.exitXRBtn.setAttribute('disabled', 'disabled');
        PlayerState.elements.exitXRBtn.classList.add('hidden');
      }
      
      // Also try direct DOM access
      const exitXRBtnDOM = document.getElementById('exitXRBtn');
      if (exitXRBtnDOM && exitXRBtnDOM !== PlayerState.elements.exitXRBtn) {
        exitXRBtnDOM.style.display = 'none';
        exitXRBtnDOM.style.pointerEvents = 'none';
        exitXRBtnDOM.setAttribute('disabled', 'disabled');
        exitXRBtnDOM.classList.add('hidden');
      }
    } else {
      // For tracks with audio, ensure we remove the XR-only markers
      currentTrack.isXROnlyTrack = false;
      PlayerState.currentTrackIsXROnly = false;
      document.body.classList.remove('xr-only-track');
    }
    
    // Store the current playback state
    const wasPlaying = PlayerState.activeMediaElement && !PlayerState.activeMediaElement.paused;
    
    // Pause both media elements temporarily
    if (PlayerState.audio) PlayerState.audio.pause();
    if (PlayerState.video) PlayerState.video.pause();
    
    // For mobile devices, ensure we have device orientation permission
    if (PlayerState.isMobileDevice) {
      // Request device orientation permission if needed
      showMessage("Requesting device access...");
      
      requestDeviceMotionPermission()
        .then(permissionGranted => {
          console.log('Device motion permission request result:', permissionGranted);
          
          // Ensure A-Frame scene is ready before completing switch
          const scene = document.querySelector('a-scene');
          if (scene) {
            scene.addEventListener('loaded', () => {
              console.log('A-Frame scene loaded, completing XR mode switch');
              completeXRModeSwitch(wasPlaying, isXROnlyTrack);
            }, { once: true });
            
            // If scene is already loaded, complete switch immediately
            if (scene.hasLoaded) {
              console.log('A-Frame scene already loaded, completing XR mode switch');
              completeXRModeSwitch(wasPlaying, isXROnlyTrack);
            }
          } else {
            console.log('A-Frame scene not found, proceeding anyway');
            completeXRModeSwitch(wasPlaying, isXROnlyTrack);
          }
        })
        .catch(error => {
          console.error('Error requesting device orientation permission:', error);
          
          // Show error message but proceed anyway
          showMessage("Limited 360° viewing available.", 3000);
          completeXRModeSwitch(wasPlaying, isXROnlyTrack);
        });
    } else {
      // Not a mobile device, proceed normally
      console.log('Not a mobile device, proceeding normally');
      completeXRModeSwitch(wasPlaying, isXROnlyTrack);
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'switchToXRMode' });
    // Attempt to continue even if there's an error
    completeXRModeSwitch(false, false);
  }
}

/**
 * Complete the switch to XR mode
 * @param {boolean} wasPlaying - Whether media was playing before the switch
 * @param {boolean} isXROnlyTrack - Whether this is an XR-only track with no audio
 */
export function completeXRModeSwitch(wasPlaying, isXROnlyTrack = false) {
  console.log('Completing XR mode switch, wasPlaying:', wasPlaying, 'isXROnlyTrack:', isXROnlyTrack);
  
  try {
    // Make sure we have a current track
    const currentTrack = PlayerState.currentTrackIndex !== -1 ? 
      PlayerState.playlist[PlayerState.currentTrackIndex] : null;
    
    if (!currentTrack) {
      console.error('No current track available for XR mode');
      return;
    }
    
    // Get the video source from either the normalized track or raw track data
    let videoSrc = currentTrack.videoSrc;
    if (!videoSrc || videoSrc.trim() === '') {
      // Try to get it from raw track data as fallback
      const rawTrack = PlayerState.rawTrackData && PlayerState.rawTrackData[PlayerState.currentTrackIndex];
      if (rawTrack && rawTrack.XR_Scene) {
        videoSrc = rawTrack.XR_Scene;
        console.log('Using XR_Scene from raw track data:', videoSrc);
        // Update the normalized track with this source
        currentTrack.videoSrc = videoSrc;
      }
    }
    
    // Update the video source in the DOM
    const videoSource = document.getElementById('videoSource');
    if (videoSource && videoSrc) {
      console.log(`Updating video source to: ${videoSrc}`);
      videoSource.src = videoSrc;
      
      // Force the video element to reload
      const video360 = document.getElementById('video360');
      if (video360) {
        video360.load();
      }
    }
    
    // Set XR mode flag
    PlayerState.setXRMode(true);
    
    // Update the active media element
    PlayerState.setActiveMediaElement(PlayerState.video);
    
    // Update UI for XR mode
    updateUIForCurrentMode(true);
    
    // Handle exit XR button visibility
    if (PlayerState.elements.exitXRBtn) {
      if (isXROnlyTrack) {
        // XR-only track should hide the exit button
        console.log('XR-only track: hiding exit XR button - XR MODULE');
        PlayerState.elements.exitXRBtn.style.display = 'none';
        PlayerState.elements.exitXRBtn.style.pointerEvents = 'none';
        PlayerState.elements.exitXRBtn.setAttribute('disabled', 'disabled');
        PlayerState.elements.exitXRBtn.classList.add('hidden');
        
        // Also try direct DOM access as fallback
        const exitXRBtnDOM = document.getElementById('exitXRBtn');
        if (exitXRBtnDOM && exitXRBtnDOM !== PlayerState.elements.exitXRBtn) {
          console.log('Found exitXRBtn through direct DOM access, hiding it too');
          exitXRBtnDOM.style.display = 'none';
          exitXRBtnDOM.style.pointerEvents = 'none';
          exitXRBtnDOM.setAttribute('disabled', 'disabled');
          exitXRBtnDOM.classList.add('hidden');
        }
      } else {
        // Normal track should show the exit button
        PlayerState.elements.exitXRBtn.style.display = 'flex';
        PlayerState.elements.exitXRBtn.style.pointerEvents = 'auto';
        PlayerState.elements.exitXRBtn.removeAttribute('disabled');
        PlayerState.elements.exitXRBtn.classList.remove('hidden');
      }
    } else {
      console.warn('Exit XR button element not found in PlayerState');
      
      // Try direct DOM access as fallback
      const exitXRBtnDOM = document.getElementById('exitXRBtn');
      if (exitXRBtnDOM) {
        console.log('Found exitXRBtn through direct DOM access');
        if (isXROnlyTrack) {
          exitXRBtnDOM.style.display = 'none';
          exitXRBtnDOM.style.pointerEvents = 'none';
          exitXRBtnDOM.setAttribute('disabled', 'disabled');
          exitXRBtnDOM.classList.add('hidden');
        } else {
          exitXRBtnDOM.style.display = 'flex';
          exitXRBtnDOM.style.pointerEvents = 'auto';
          exitXRBtnDOM.removeAttribute('disabled');
          exitXRBtnDOM.classList.remove('hidden');
        }
      }
    }
    
    // Ensure proper muting
    enforceProperMuting();
    
    // For mobile devices, add a longer delay and preload check before playing
    const playbackDelay = PlayerState.isMobileDevice ? 2000 : 500;
    
    // Show loading message
    showMessage("Loading 360° scene...");
    
    setTimeout(() => {
      // Show the video player container
      if (PlayerState.elements.videoPlayerContainer) {
        PlayerState.elements.videoPlayerContainer.classList.remove('hidden');
      }
      
      // Hide the audio player container
      if (PlayerState.elements.audioPlayerContainer) {
        PlayerState.elements.audioPlayerContainer.classList.add('hidden');
      }
      
      // Resume playback if it was playing before
      if (wasPlaying && PlayerState.video) {
        console.log('Resuming playback in XR mode');
        
        PlayerState.video.play()
          .then(() => {
            console.log('Video playback started successfully');
            PlayerState.setPlaybackState(true);
            
            // Hide loading message
            showMessage("360° scene loaded", 1500);
            
            // Ensure audio and video are in sync
            syncPlaybackState();
          })
          .catch(error => {
            console.error('Error starting video playback:', error);
            showMessage("Error starting playback. Try the play button.", 3000);
          });
      } else {
        // Hide loading message after a delay
        setTimeout(() => {
          showMessage("360° scene ready. Press play to start.", 2000);
        }, 500);
      }
    }, playbackDelay);
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'completeXRModeSwitch' });
  }
}

/**
 * Switch back to audio-only mode
 */
export function switchToAudioMode() {
  console.log('Switching to audio-only mode');
  
  try {
    // Check if this is an XR-only track (no audio link)
    const currentTrack = PlayerState.currentTrackIndex !== -1 ? 
      PlayerState.playlist[PlayerState.currentTrackIndex] : null;
    
    if (currentTrack) {
      // Check for empty/missing audio source
      const hasAudioSource = currentTrack.audioSrc && currentTrack.audioSrc.trim() !== '';
      
      // If no audio source, don't allow switch to audio mode
      if (!hasAudioSource) {
        console.log('This track has no audio source - remaining in XR mode');
        showMessage("Audio mode not available for this track", 2000);
        return;
      }
    }
    
    // Save current time and play state
    const currentTime = PlayerState.video ? PlayerState.video.currentTime : 0;
    const wasPlaying = PlayerState.video && !PlayerState.video.paused;
    
    // Show a brief message
    showMessage("Switching to audio mode...");
    
    // Pause both media elements to prevent any unexpected playback
    if (PlayerState.video) PlayerState.video.pause();
    if (PlayerState.audio) PlayerState.audio.pause();
    
    // Set audio time to match video time for perfect sync
    if (PlayerState.audio && !isNaN(currentTime)) {
      PlayerState.audio.currentTime = currentTime;
    }
    
    // Set XR mode flag
    PlayerState.setXRMode(false);
    
    // Update the active media element
    PlayerState.setActiveMediaElement(PlayerState.audio);
    
    // Update UI for audio mode
    updateUIForCurrentMode(false);
    
    // Ensure proper muting
    enforceProperMuting();
    
    // Resume playback if it was playing before
    if (wasPlaying && PlayerState.audio) {
      console.log('Resuming playback in audio mode');
      
      PlayerState.audio.play()
        .then(() => {
          console.log('Audio playback started successfully');
          PlayerState.setPlaybackState(true);
          
          // Clear message
          showMessage("Audio mode", 1500);
          
          // Ensure audio and video are in sync
          syncPlaybackState();
        })
        .catch(error => {
          console.error('Error starting audio playback:', error);
          showMessage("Error starting playback. Try the play button.", 3000);
        });
    } else {
      // Hide message after a delay
      showMessage("Ready for playback", 1500);
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'switchToAudioMode' });
  }
} 