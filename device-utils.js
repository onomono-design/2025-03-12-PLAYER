/**
 * Device Utilities Module
 * Handles device detection, orientation, and network connectivity
 */

import { PlayerState } from './shared-state.js';
import { ErrorLogger } from './error-logger.js';

/**
 * Set up device detection and initialize device-specific features
 */
export function setupDeviceDetection() {
  console.log('Setting up device detection...');
  
  try {
    // Detect if we're on a mobile device
    checkIfMobile();
    
    // Check device orientation if on mobile
    if (PlayerState.isMobileDevice) {
      checkOrientation();
      
      // Add orientation change listener for mobile devices
      window.addEventListener('orientationchange', checkOrientation);
      
      // Check for device motion permission on iOS if experience hasn't started yet
      if (PlayerState.isIOS && !PlayerState.experienceStarted) {
        // Listen for the experience-started event
        document.addEventListener('experience-started', () => {
          console.log('Experience started event received, skipping permission overlay');
          PlayerState.experienceStarted = true;
        });
        
        // Only check for permission if the experience hasn't been started
        if (!PlayerState.experienceStarted) {
          checkDeviceMotionPermission();
        }
      }
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'setupDeviceDetection' });
  }
}

/**
 * Enhanced mobile device detection with feature detection
 * @returns {boolean} Whether the device is a mobile device
 */
export function checkIfMobile() {
  try {
    // First check using user agent (traditional method)
    const userAgentCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Then check using feature detection (more reliable)
    const touchCheck = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
    
    // Check screen size as well
    const screenSizeCheck = window.innerWidth <= 768;
    
    // Combine all checks
    PlayerState.isMobileDevice = userAgentCheck || (touchCheck && screenSizeCheck);
    
    // Specific iOS detection
    PlayerState.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    console.log(`Device detection: Mobile: ${PlayerState.isMobileDevice}, iOS: ${PlayerState.isIOS}`);
    console.log(`Detection methods: UserAgent: ${userAgentCheck}, Touch: ${touchCheck}, ScreenSize: ${screenSizeCheck}`);
    
    // Apply mobile-specific UI adjustments
    if (PlayerState.isMobileDevice) {
      document.body.classList.add('mobile-device');
      
      // Add specific class for iOS devices
      if (PlayerState.isIOS) {
        document.body.classList.add('ios-device');
      }
      
      // Adjust controls for touch interfaces
      const controlButtons = document.querySelectorAll('.control-button');
      controlButtons.forEach(button => {
        button.classList.add('touch-friendly');
      });
      
      // Make scrubber more touch-friendly
      const scrubberElement = document.getElementById('scrubber');
      if (scrubberElement) {
        scrubberElement.classList.add('touch-friendly');
      }
    }
    
    // Dispatch event for other modules to react
    document.dispatchEvent(new CustomEvent('device-type-detected', { 
      detail: { 
        isMobile: PlayerState.isMobileDevice,
        isIOS: PlayerState.isIOS
      } 
    }));
    
    return PlayerState.isMobileDevice;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'checkIfMobile' });
    return false;
  }
}

/**
 * Enhanced orientation check with better handling for different devices
 * @returns {boolean} Whether the device is in portrait orientation
 */
export function checkOrientation() {
  try {
    // Get the current orientation
    const isPortrait = window.matchMedia("(orientation: portrait)").matches;
    
    console.log(`Device orientation: ${isPortrait ? 'Portrait' : 'Landscape'}`);
    
    // Add orientation-specific classes to the body
    if (isPortrait) {
      document.body.classList.add('portrait');
      document.body.classList.remove('landscape');
    } else {
      document.body.classList.add('landscape');
      document.body.classList.remove('portrait');
    }
    
    // Show a message for XR mode in portrait orientation
    if (PlayerState.isXRMode && isPortrait) {
      showMessage("Rotate your device to landscape for the best 360° experience.", 5000);
    } else {
      // Hide the message if it's showing the orientation message
      if (PlayerState.elements.message && 
          PlayerState.elements.message.textContent === "Rotate your device to landscape for the best 360° experience.") {
        PlayerState.elements.message.style.display = "none";
      }
    }
    
    // Dispatch event for other modules to react
    document.dispatchEvent(new CustomEvent('orientation-changed', { 
      detail: { isPortrait } 
    }));
    
    return isPortrait;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'checkOrientation' });
    return false;
  }
}

/**
 * Check and request device motion permission on iOS devices
 * @param {boolean} devMode - If true, shows the permission overlay regardless of device type (for development)
 */
export function checkDeviceMotionPermission(devMode = false) {
  try {
    // Skip if the experience has already been started via the start experience screen
    if (PlayerState.experienceStarted) {
      console.log('Experience already started, skipping permission check');
      return;
    }
    
    // Only proceed if we're on iOS or in dev mode
    if (!PlayerState.isIOS && !devMode) return;
    
    console.log('Checking device motion permission for iOS device' + (devMode ? ' (DEV MODE)' : ''));
    
    // Check if DeviceOrientationEvent is available and requires permission
    if ((typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') || devMode) {
      
      // Set up permission request button if needed
      const permissionOverlay = document.getElementById('permissionOverlay');
      const enableMotionBtn = document.getElementById('enableMotion');
      
      if (permissionOverlay && enableMotionBtn) {
        console.log('Setting up device motion permission request UI');
        
        // Show the permission overlay
        permissionOverlay.style.display = 'flex';
        
        // Set up the button click handler
        enableMotionBtn.addEventListener('click', () => {
          if (devMode) {
            // In dev mode, just hide the overlay when clicked
            console.log('DEV MODE: Simulating permission granted');
            permissionOverlay.style.display = 'none';
            showMessage("DEV MODE: Motion permission simulated", 3000);
            
            // Set the experience started flag
            PlayerState.experienceStarted = true;
          } else {
            // Normal iOS permission flow
            DeviceOrientationEvent.requestPermission()
              .then(permissionState => {
                if (permissionState === 'granted') {
                  console.log('Device motion permission granted');
                  permissionOverlay.style.display = 'none';
                  
                  // Set the experience started flag
                  PlayerState.experienceStarted = true;
                } else {
                  console.log('Device motion permission denied');
                  showMessage("Motion controls disabled. Some features may be limited.", 5000);
                  permissionOverlay.style.display = 'none';
                  
                  // Set the experience started flag even if permission was denied
                  PlayerState.experienceStarted = true;
                }
              })
              .catch(error => {
                ErrorLogger.handleError(error, { function: 'requestDeviceMotionPermission' });
                showMessage("Error requesting motion permission. Some features may be limited.", 5000);
                permissionOverlay.style.display = 'none';
                
                // Set the experience started flag even if there was an error
                PlayerState.experienceStarted = true;
              });
          }
        });
      }
    } else {
      console.log('Device does not require explicit motion permission');
      
      // Set the experience started flag
      PlayerState.experienceStarted = true;
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'checkDeviceMotionPermission' });
    
    // Set the experience started flag even if there was an error
    PlayerState.experienceStarted = true;
  }
}

/**
 * Force show the start experience overlay for development purposes
 * This can be called from the browser console to test the overlay on desktop
 */
export function showStartExperienceOverlay() {
  console.log('Showing start experience overlay for development testing');
  const startExperienceOverlay = document.getElementById('startExperienceOverlay');
  if (startExperienceOverlay) {
    startExperienceOverlay.style.display = 'flex';
    return "Start experience overlay shown. Call this function again to reset.";
  } else {
    return "Start experience overlay not found.";
  }
}

// Make the function available globally for console access
if (typeof window !== 'undefined') {
  window.showStartExperienceOverlay = showStartExperienceOverlay;
  // Don't log dev functions in production
  // console.log('Dev function available: showStartExperienceOverlay()');
}

/**
 * Monitor network connectivity and handle offline/online events
 */
export function setupNetworkMonitoring() {
  console.log('Setting up network connectivity monitoring');
  
  try {
    // Variable to track if we're currently offline
    let isOffline = !navigator.onLine;
    
    // Function to handle going offline
    const handleOffline = () => {
      console.log('Network connection lost');
      isOffline = true;
      
      // Show a message to the user
      showMessage("Network connection lost. Playback may be affected.", 5000);
      
      // Dispatch event for other modules to react
      document.dispatchEvent(new CustomEvent('network-status-changed', { 
        detail: { isOnline: false } 
      }));
    };
    
    // Function to handle coming back online
    const handleOnline = () => {
      console.log('Network connection restored');
      
      // Only show a message if we were previously offline
      if (isOffline) {
        showMessage("Network connection restored.", 3000);
        
        // Dispatch event for other modules to react
        document.dispatchEvent(new CustomEvent('network-status-changed', { 
          detail: { isOnline: true } 
        }));
        
        isOffline = false;
      }
    };
    
    // Set up event listeners for online/offline events
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    
    // Check initial state
    if (isOffline) {
      console.log('Starting in offline mode');
      showMessage("No network connection. Some features may be limited.", 5000);
      
      // Dispatch initial event
      document.dispatchEvent(new CustomEvent('network-status-changed', { 
        detail: { isOnline: false } 
      }));
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'setupNetworkMonitoring' });
  }
}

/**
 * Helper function to show a message to the user
 * @param {string} text - The message text
 * @param {number} duration - How long to show the message in milliseconds
 */
function showMessage(text, duration = 3000) {
  if (PlayerState.elements.message) {
    PlayerState.elements.message.textContent = text;
    PlayerState.elements.message.style.display = "block";
    
    // Hide the message after a delay
    setTimeout(() => {
      if (PlayerState.elements.message && 
          PlayerState.elements.message.textContent === text) {
        PlayerState.elements.message.style.display = "none";
      }
    }, duration);
  }
} 