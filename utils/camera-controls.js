/**
 * Camera Controls Module
 * Centralized functionality for camera manipulation in XR mode
 */

import { PlayerState } from '../shared-state.js';
import { ErrorLogger } from '../error-logger.js';
import { showMessage } from './messaging.js';

// Flag to track if recentering is in progress
let isRecenteringInProgress = false;

/**
 * Recenter the camera in XR mode
 * @returns {boolean} Whether recentering was successful
 */
export function recenterCamera() {
  // Prevent multiple recentering operations at once
  if (isRecenteringInProgress) {
    console.log('Camera recentering already in progress, ignoring request');
    return false;
  }
  
  console.log('Recentering camera');
  isRecenteringInProgress = true;
  
  try {
    // Show a message
    showMessage("Recentering view...");
    
    // Try different methods to recenter the camera
    
    // Method 1: Use A-Frame's built-in function if available
    if (window.recenterCameraFromAFrame) {
      console.log('Using A-Frame recenter function');
      const success = window.recenterCameraFromAFrame();
      
      if (success) {
        console.log('A-Frame camera recentering successful');
        
        // Update message
        setTimeout(() => {
          showMessage("View recentered", 1500);
        }, 500);
        
        isRecenteringInProgress = false;
        return true;
      }
    }
    
    // Method 2: Find the camera entity by ID
    const cameraById = document.querySelector('#cameraEntity');
    if (cameraById) {
      console.log('Found camera entity by ID, attempting to recenter');
      
      // Try both methods to ensure one works
      
      // Method 2a: Dispatch an event to the camera entity
      console.log('Dispatching recenter event to camera');
      cameraById.dispatchEvent(new CustomEvent('recenter'));
      
      // Method 2b: Try to directly call the component's method if available
      if (cameraById.components && cameraById.components['camera-recenter']) {
        console.log('Directly calling component recenter method');
        cameraById.components['camera-recenter'].recenter();
      }
      
      // Update message
      setTimeout(() => {
        showMessage("View recentered", 1500);
      }, 500);
      
      isRecenteringInProgress = false;
      return true;
    }
    
    // Method 3: Get the camera entity by selector and manipulate it directly
    const camera = document.querySelector('[camera]');
    if (camera) {
      console.log('Found camera by selector, attempting to recenter');
      
      // Detect if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      console.log('Device detected as:', isMobile ? 'mobile' : 'desktop');
      
      // Set the target rotation to 0,0,0 for complete centering
      const targetRotation = { x: 0, y: 0, z: 0 };
      
      if (isMobile) {
        // On mobile, try to completely remove and re-add the look-controls
        const oldLookControlsData = camera.getAttribute('look-controls');
        camera.removeAttribute('look-controls');
        
        // Set rotation directly without look-controls
        setTimeout(() => {
          camera.setAttribute('rotation', targetRotation);
          
          // Re-add look-controls after setting rotation
          setTimeout(() => {
            camera.setAttribute('look-controls', oldLookControlsData);
          }, 100);
        }, 50);
      } else {
        // On desktop, just set the rotation
        camera.setAttribute('rotation', targetRotation);
        
        // Also try to directly manipulate the look-controls if available
        if (camera.components && camera.components['look-controls']) {
          const lookControls = camera.components['look-controls'];
          if (lookControls.pitchObject) lookControls.pitchObject.rotation.x = 0;
          if (lookControls.yawObject) lookControls.yawObject.rotation.y = 0;
        }
      }
      
      console.log('Applied camera recentering');
      
      // Update message
      setTimeout(() => {
        showMessage("View recentered", 1500);
      }, 500);
      
      isRecenteringInProgress = false;
      return true;
    }
    
    // If we got here, we couldn't find the camera
    console.error('Could not find camera entity');
    showMessage("Could not recenter view", 1500);
    isRecenteringInProgress = false;
    return false;
    
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'recenterCamera' });
    showMessage("Error recentering view", 1500);
    
    // Reset the flag
    isRecenteringInProgress = false;
    return false;
  }
} 