/**
 * Device Detection Module
 * Provides utilities for detecting device type, capabilities, and orientation
 */

import { PlayerState } from '../shared-state.js';
import { ErrorLogger } from '../error-logger.js';
import { showMessage } from './messaging.js';

/**
 * Detect if the current device is a mobile device
 * @returns {boolean} Whether the current device is mobile
 */
export function detectMobileDevice() {
  try {
    // Use regex to detect common mobile user agents
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Also check screen size as a secondary indicator
    const isSmallScreen = window.innerWidth <= 768;
    
    // Check if the device has touch support as tertiary indicator
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Combine checks - if device has mobile UA OR (small screen AND touch)
    const result = isMobile || (isSmallScreen && hasTouch);
    
    console.log(`Device detection - Mobile: ${result}, UA Mobile: ${isMobile}, Small Screen: ${isSmallScreen}, Touch: ${hasTouch}`);
    
    return result;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'detectMobileDevice' });
    return false; // Default to desktop if detection fails
  }
}

/**
 * Detect if the current device is iOS
 * @returns {boolean} Whether the current device is iOS
 */
export function detectIOSDevice() {
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'detectIOSDevice' });
    return false;
  }
}

/**
 * Check the current device orientation
 * @returns {Object} Object with orientation information
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
      const messageElement = document.getElementById('message');
      if (messageElement && 
          messageElement.textContent === "Rotate your device to landscape for the best 360° experience.") {
        messageElement.style.display = "none";
      }
    }
    
    // Dispatch event for other modules to react
    document.dispatchEvent(new CustomEvent('orientation-changed', { 
      detail: { isPortrait } 
    }));
    
    return { isPortrait, isLandscape: !isPortrait };
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'checkOrientation' });
    return { isPortrait: false, isLandscape: true };
  }
}

/**
 * Detect WebGL and XR capabilities of the device
 * @returns {Object} Object with capabilities information
 */
export function detectDeviceCapabilities() {
  try {
    // Check for WebGL support
    let hasWebGL = false;
    try {
      const canvas = document.createElement('canvas');
      hasWebGL = !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      hasWebGL = false;
    }
    
    // Check for WebXR support
    const hasWebXR = 'xr' in navigator;
    
    // Check for DeviceMotionEvent support (for mobile gyroscope)
    const hasDeviceMotion = 'DeviceMotionEvent' in window;
    
    // Check for orientation API
    const hasOrientationAPI = 'DeviceOrientationEvent' in window;
    
    // Check for fullscreen API
    const hasFullscreenAPI = document.documentElement.requestFullscreen || 
                            document.documentElement.webkitRequestFullscreen ||
                            document.documentElement.mozRequestFullScreen ||
                            document.documentElement.msRequestFullscreen;
    
    console.log(`Device capabilities - WebGL: ${hasWebGL}, WebXR: ${hasWebXR}, DeviceMotion: ${hasDeviceMotion}, OrientationAPI: ${hasOrientationAPI}, FullscreenAPI: ${!!hasFullscreenAPI}`);
    
    return {
      hasWebGL,
      hasWebXR,
      hasDeviceMotion,
      hasOrientationAPI,
      hasFullscreenAPI: !!hasFullscreenAPI,
      isXRCapable: hasWebGL && (hasWebXR || hasDeviceMotion || hasOrientationAPI)
    };
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'detectDeviceCapabilities' });
    return {
      hasWebGL: false,
      hasWebXR: false,
      hasDeviceMotion: false,
      hasOrientationAPI: false,
      hasFullscreenAPI: false,
      isXRCapable: false
    };
  }
}

/**
 * Request device motion and orientation permissions
 * @returns {Promise<boolean>} Promise resolving to whether permissions were granted
 */
export async function requestDeviceMotionPermission() {
  try {
    // Check if we need to request permission (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      console.log('Requesting device orientation permission');
      
      // Show message
      showMessage("Requesting device access...");
      
      const permissionState = await DeviceOrientationEvent.requestPermission();
      const granted = permissionState === 'granted';
      
      if (granted) {
        console.log('Device orientation permission granted');
        showMessage("Access granted. You can now use 360° features.", 2000);
      } else {
        console.log('Device orientation permission denied');
        showMessage("Limited 360° viewing without device motion.", 3000);
      }
      
      return granted;
    } else if (typeof DeviceMotionEvent !== 'undefined' && 
               typeof DeviceMotionEvent.requestPermission === 'function') {
      console.log('Requesting device motion permission');
      
      // Show message
      showMessage("Requesting device access...");
      
      const permissionState = await DeviceMotionEvent.requestPermission();
      const granted = permissionState === 'granted';
      
      if (granted) {
        console.log('Device motion permission granted');
        showMessage("Access granted. You can now use 360° features.", 2000);
      } else {
        console.log('Device motion permission denied');
        showMessage("Limited 360° viewing without device motion.", 3000);
      }
      
      return granted;
    }
    
    // No permission needed, assume granted
    return true;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'requestDeviceMotionPermission' });
    showMessage("Error requesting device access. Some features may be limited.", 3000);
    return false;
  }
} 