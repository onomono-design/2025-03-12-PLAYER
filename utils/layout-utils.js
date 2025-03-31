/**
 * Layout Utilities Module
 * Centralized functionality for layout optimization and UI element positioning
 */

import { PlayerState } from '../shared-state.js';
import { ErrorLogger } from '../error-logger.js';

/**
 * Ensure player controls are centered
 */
export function ensurePlayerControlsCentered() {
  try {
    const playerControls = document.querySelector('.player-controls');
    if (!playerControls) return;
    
    // Get the window width
    const windowWidth = window.innerWidth;
    
    // Get the player controls width
    const controlsWidth = playerControls.offsetWidth;
    
    // Calculate the left position to center the controls
    const leftPosition = (windowWidth - controlsWidth) / 2;
    
    // Apply the position
    playerControls.style.left = `${leftPosition}px`;
    
    console.log(`Centered player controls (width: ${controlsWidth}px, left: ${leftPosition}px)`);
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'ensurePlayerControlsCentered' });
  }
}

/**
 * Sync the album artwork width to maintain aspect ratio
 */
export function syncAlbumArtworkWidth() {
  try {
    const albumArtwork = document.querySelector('.album-artwork');
    if (!albumArtwork) return;
    
    // Get the container width
    const containerWidth = albumArtwork.offsetWidth;
    
    // Set the height to maintain a 1:1 aspect ratio
    albumArtwork.style.height = `${containerWidth}px`;
    
    // Also update the image if it exists
    const albumArtImg = albumArtwork.querySelector('img');
    if (albumArtImg) {
      albumArtImg.style.width = `${containerWidth}px`;
      albumArtImg.style.height = `${containerWidth}px`;
    }
    
    console.log(`Synced album artwork dimensions to ${containerWidth}px`);
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'syncAlbumArtworkWidth' });
  }
}

/**
 * Sync the playlist container width with the player controls width
 */
export function syncPlaylistWidth() {
  try {
    const playerControls = document.querySelector('.player-controls');
    const playlistContainer = document.getElementById('playlistContainer');
    
    if (!playerControls || !playlistContainer) {
      console.log('Could not find player controls or playlist container');
      return;
    }
    
    // Get the computed width of the player controls
    const controlsStyle = window.getComputedStyle(playerControls);
    const controlsWidth = controlsStyle.width;
    const controlsMaxWidth = controlsStyle.maxWidth;
    
    // Apply the same width to the playlist container
    playlistContainer.style.width = controlsWidth;
    playlistContainer.style.maxWidth = controlsMaxWidth;
    
    console.log(`Synced playlist width (${controlsWidth}) with player controls`);
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'syncPlaylistWidth' });
  }
}

/**
 * Fix scrubber layout for improved touch interactions
 */
export function fixScrubberLayout() {
  try {
    const scrubber = document.getElementById('scrubber');
    const scrubberProgress = document.getElementById('scrubberProgress');
    const scrubberContainer = document.querySelector('.scrubber-container');
    
    if (!scrubber || !scrubberProgress || !scrubberContainer) {
      console.log('Could not find scrubber elements');
      return;
    }
    
    // Adjust the scrubber notch position based on current progress
    const scrubberNotch = document.querySelector('.scrubber-notch');
    if (scrubberNotch && scrubber && scrubber.value) {
      const percentage = parseFloat(scrubber.value);
      const containerWidth = scrubberContainer.offsetWidth;
      const notchPosition = (percentage / 100) * containerWidth;
      
      scrubberNotch.style.left = `${notchPosition}px`;
    }
    
    console.log('Fixed scrubber layout');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'fixScrubberLayout' });
  }
}

/**
 * Handle all layout updates at once (e.g., on resize)
 */
export function updateAllLayouts() {
  ensurePlayerControlsCentered();
  syncAlbumArtworkWidth();
  syncPlaylistWidth();
  fixScrubberLayout();
  console.log('All layouts updated');
}

/**
 * Set up iframe-aware margin consistency
 */
export function alignPlayerControlsWithIframeMargins() {
  console.log('Setting up player controls alignment for iframes...');
  
  try {
    // Function to update controls margins
    const updateControlsMargins = () => {
      // Check if we're in an iframe
      const isInIframe = window !== window.top;
      
      if (isInIframe) {
        document.body.classList.add('in-iframe');
      } else {
        document.body.classList.remove('in-iframe');
      }
      
      // In iframe, try to get iframe offset from parent if available
      if (isInIframe) {
        try {
          // Try to send a message to parent to request margins
          window.parent.postMessage({ type: 'REQUEST_IFRAME_MARGINS' }, '*');
        } catch (e) {
          console.log('Could not communicate with parent window:', e);
        }
      }
    };
    
    // Function to apply margins to controls
    const applyControlsMargins = (margin) => {
      const playerControls = document.querySelector('.player-controls');
      if (!playerControls) return;
      
      // Apply margins
      if (margin) {
        playerControls.style.padding = 
          `${margin.top}px ${margin.right}px ${margin.bottom}px ${margin.left}px`;
        console.log(`Applied iframe margins: ${JSON.stringify(margin)}`);
      }
    };
    
    // Listen for messages from parent window with iframe margin information
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'IFRAME_MARGINS') {
        applyControlsMargins(event.data.margin);
      }
    });
    
    // Initialize on load and resize
    window.addEventListener('load', updateControlsMargins);
    window.addEventListener('resize', updateControlsMargins);
    
    // Initial call
    updateControlsMargins();
    
    // Export function to be called from parent window if needed
    window.updatePlayerControlsMargins = updateControlsMargins;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'alignPlayerControlsWithIframeMargins' });
  }
}

/**
 * Optimize layout for mobile devices
 */
export function optimizeMobileLayout() {
  console.log('Optimizing layout for mobile device');
  
  try {
    // Flag to track if we're in optimized mode already
    let isOptimized = document.body.classList.contains('mobile-optimized');
    
    // Function to apply mobile-specific layouts
    const applyMobileLayout = () => {
      const isMobile = PlayerState.isMobileDevice;
      const isPortrait = window.matchMedia("(orientation: portrait)").matches;
      const isXRMode = PlayerState.isXRMode;
      
      console.log(`Applying mobile layout - Mobile: ${isMobile}, Portrait: ${isPortrait}, XR: ${isXRMode}`);
      
      // If not a mobile device, remove mobile optimizations and return
      if (!isMobile) {
        document.body.classList.remove('mobile-optimized');
        isOptimized = false;
        return;
      }
      
      // Add mobile optimization class
      document.body.classList.add('mobile-optimized');
      isOptimized = true;
      
      // Add orientation classes
      if (isPortrait) {
        document.body.classList.add('portrait');
        document.body.classList.remove('landscape');
      } else {
        document.body.classList.add('landscape');
        document.body.classList.remove('portrait');
      }
      
      // Special handling for XR mode in portrait
      if (isXRMode && isPortrait) {
        document.body.classList.add('xr-portrait-warning');
      } else {
        document.body.classList.remove('xr-portrait-warning');
      }
      
      // Update control positions
      ensurePlayerControlsCentered();
      syncAlbumArtworkWidth();
      syncPlaylistWidth();
    };
    
    // Apply layout on orientation change
    window.addEventListener('orientationchange', () => {
      // Wait for orientation change to complete
      setTimeout(applyMobileLayout, 300);
    });
    
    // Apply layout on resize
    window.addEventListener('resize', () => {
      // Use debounce to avoid excessive calls
      clearTimeout(window.resizeTimer);
      window.resizeTimer = setTimeout(applyMobileLayout, 250);
    });
    
    // Apply layout on XR mode change
    document.addEventListener('xr-mode-changed', applyMobileLayout);
    
    // Initial application
    applyMobileLayout();
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'optimizeMobileLayout' });
  }
} 