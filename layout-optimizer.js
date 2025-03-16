/**
 * Layout Optimizer Module
 * Handles layout optimizations for consistent spacing and mobile-specific layouts
 */

import { PlayerState } from './shared-state.js';
import { ErrorLogger } from './error-logger.js';

/**
 * Initialize layout optimizations
 */
export function initializeLayoutOptimizer() {
  console.log('Initializing layout optimizer...');
  
  try {
    // Set up iframe-aware margin consistency
    alignPlayerControlsWithIframeMargins();
    
    // Set up mobile-specific layout optimizations
    if (PlayerState.isMobileDevice) {
      optimizeMobileLayout();
    }
    
    console.log('Layout optimizer initialized');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'initializeLayoutOptimizer' });
  }
}

/**
 * Align player controls with iframe margins
 * Ensures player controls have the same distance from the edge as the iframe has from the viewport
 */
function alignPlayerControlsWithIframeMargins() {
  console.log('Setting up player controls alignment...');
  
  try {
    // Function to calculate and apply consistent margins
    function updateControlsMargins() {
      // Get the iframe element (if we're in an iframe)
      const isInIframe = window !== window.parent;
      
      if (isInIframe) {
        // We need to communicate with the parent window to get its margins
        // This requires the parent page to provide this information via postMessage
        window.parent.postMessage({ type: 'REQUEST_IFRAME_MARGINS' }, '*');
      } else {
        // If not in iframe, use a default padding or calculate from viewport
        const viewportPadding = Math.min(window.innerWidth * 0.05, 20); // 5% of width or 20px max
        applyControlsMargins(viewportPadding);
      }
    }
    
    // Apply the margins to player controls
    function applyControlsMargins(margin) {
      const playerControls = document.querySelector('.player-controls');
      const playerContainer = document.querySelector('.player-container');
      
      if (playerControls) {
        // Apply horizontal margins
        playerControls.style.paddingLeft = `${margin}px`;
        playerControls.style.paddingRight = `${margin}px`;
        
        // Adjust width to account for padding
        playerControls.style.width = `calc(100% - ${margin * 2}px)`;
        
        console.log(`Applied ${margin}px margins to player controls`);
      }
      
      if (playerContainer) {
        // Apply consistent margins to the player container as well
        playerContainer.style.paddingLeft = `${margin}px`;
        playerContainer.style.paddingRight = `${margin}px`;
      }
    }
    
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
 * Pins album artwork to top and player controls to bottom of viewport
 */
function optimizeMobileLayout() {
  console.log('Optimizing layout for mobile device');
  
  try {
    // Get key elements
    const albumArtworkContainer = document.querySelector('.album-artwork-container');
    const trackInfoContainer = document.querySelector('.track-info-container');
    const playerControls = document.querySelector('.player-controls');
    const audioPlayerContainer = document.querySelector('.audio-player-container');
    const videoPlayerContainer = document.querySelector('.video-player-container');
    
    // Function to apply mobile-specific layout
    function applyMobileLayout() {
      // Add mobile-specific classes
      document.body.classList.add('mobile-optimized');
      
      // Pin album artwork and track info to top
      if (albumArtworkContainer && trackInfoContainer) {
        // Create a container for top elements if it doesn't exist
        let topContainer = document.querySelector('.mobile-top-container');
        if (!topContainer) {
          topContainer = document.createElement('div');
          topContainer.className = 'mobile-top-container';
          
          // Move elements to the top container
          const parent = albumArtworkContainer.parentNode;
          parent.insertBefore(topContainer, parent.firstChild);
          
          topContainer.appendChild(albumArtworkContainer);
          topContainer.appendChild(trackInfoContainer);
        }
        
        // Style the top container
        topContainer.style.position = 'fixed';
        topContainer.style.top = '0';
        topContainer.style.left = '0';
        topContainer.style.width = '100%';
        topContainer.style.padding = '15px';
        topContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        topContainer.style.zIndex = '100';
        topContainer.style.boxSizing = 'border-box';
      }
      
      // Pin player controls to bottom
      if (playerControls) {
        // Create a container for bottom elements if it doesn't exist
        let bottomContainer = document.querySelector('.mobile-bottom-container');
        if (!bottomContainer) {
          bottomContainer = document.createElement('div');
          bottomContainer.className = 'mobile-bottom-container';
          
          // Move player controls to the bottom container
          document.body.appendChild(bottomContainer);
          bottomContainer.appendChild(playerControls);
        }
        
        // Style the bottom container
        bottomContainer.style.position = 'fixed';
        bottomContainer.style.bottom = '0';
        bottomContainer.style.left = '0';
        bottomContainer.style.width = '100%';
        bottomContainer.style.padding = '15px';
        bottomContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        bottomContainer.style.zIndex = '100';
        bottomContainer.style.boxSizing = 'border-box';
        
        // Ensure player controls take full width
        playerControls.style.width = '100%';
        playerControls.style.left = '0';
        playerControls.style.transform = 'none';
      }
      
      // Add padding to main containers to account for fixed elements
      const topHeight = document.querySelector('.mobile-top-container')?.offsetHeight || 0;
      const bottomHeight = document.querySelector('.mobile-bottom-container')?.offsetHeight || 0;
      
      if (audioPlayerContainer) {
        audioPlayerContainer.style.paddingTop = `${topHeight + 15}px`;
        audioPlayerContainer.style.paddingBottom = `${bottomHeight + 15}px`;
      }
      
      if (videoPlayerContainer) {
        videoPlayerContainer.style.paddingTop = `${topHeight + 15}px`;
        videoPlayerContainer.style.paddingBottom = `${bottomHeight + 15}px`;
      }
    }
    
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

/**
 * Fix scrubber and time display positioning
 * Addresses specific issues with scrubber notch scaling and time display positioning
 */
export function fixScrubberLayout() {
  console.log('Fixing scrubber layout issues...');
  
  try {
    const scrubber = PlayerState.elements.scrubber;
    const scrubberProgress = PlayerState.elements.scrubberProgress;
    const currentTimeDisplay = PlayerState.elements.currentTimeDisplay;
    const durationDisplay = PlayerState.elements.durationDisplay;
    const scrubberContainer = document.querySelector('.scrubber-container');
    const scrubberWrapper = document.querySelector('.scrubber-wrapper');
    
    if (!scrubber || !scrubberWrapper) {
      console.warn('Scrubber elements not found');
      return;
    }
    
    // Remove any existing custom elements to avoid duplicates
    const existingNotch = document.querySelector('.scrubber-notch');
    if (existingNotch) existingNotch.remove();
    
    const existingProgressRegion = document.querySelector('.progress-region');
    if (existingProgressRegion) existingProgressRegion.remove();
    
    // 1. Fix scrubber notch scaling
    const notch = document.createElement('div');
    notch.className = 'scrubber-notch';
    scrubberWrapper.appendChild(notch);
    
    // Style the notch
    notch.style.position = 'absolute';
    notch.style.width = '12px';
    notch.style.height = '12px';
    notch.style.borderRadius = '50%';
    notch.style.backgroundColor = '#333';
    notch.style.top = '50%';
    notch.style.transform = 'translateY(-50%)';
    notch.style.zIndex = '3';
    notch.style.pointerEvents = 'none'; // Allow clicks to pass through to the scrubber
    notch.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.3)';
    notch.style.transition = 'transform 0.1s ease-out';
    
    // 2. Add progress region
    const progressRegion = document.createElement('div');
    progressRegion.className = 'progress-region';
    
    // Create buffered progress indicator
    const bufferedProgress = document.createElement('div');
    bufferedProgress.className = 'buffered-progress';
    
    // Create played progress indicator
    const playedProgress = document.createElement('div');
    playedProgress.className = 'played-progress';
    
    // Add to DOM
    progressRegion.appendChild(bufferedProgress);
    progressRegion.appendChild(playedProgress);
    scrubberWrapper.insertBefore(progressRegion, scrubber);
    
    // Style the progress region
    progressRegion.style.position = 'absolute';
    progressRegion.style.height = '5px';
    progressRegion.style.width = '100%';
    progressRegion.style.backgroundColor = 'rgba(0, 0, 0, 0.15)';
    progressRegion.style.borderRadius = '5px';
    progressRegion.style.overflow = 'hidden';
    progressRegion.style.top = '50%';
    progressRegion.style.transform = 'translateY(-50%)';
    progressRegion.style.zIndex = '1';
    
    // Style the buffered progress
    bufferedProgress.style.position = 'absolute';
    bufferedProgress.style.height = '100%';
    bufferedProgress.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    bufferedProgress.style.width = '0%';
    bufferedProgress.style.zIndex = '1';
    
    // Style the played progress
    playedProgress.style.position = 'absolute';
    playedProgress.style.height = '100%';
    playedProgress.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    playedProgress.style.width = '0%';
    playedProgress.style.zIndex = '2';
    
    // 3. Fix time display positioning
    if (currentTimeDisplay && durationDisplay && scrubberContainer) {
      // Ensure time displays don't overflow
      currentTimeDisplay.style.minWidth = '45px';
      durationDisplay.style.minWidth = '45px';
      
      // Make sure scrubber container has proper spacing
      scrubberContainer.style.display = 'flex';
      scrubberContainer.style.alignItems = 'center';
      scrubberContainer.style.gap = '8px';
      
      // Ensure time displays have proper text alignment
      currentTimeDisplay.style.textAlign = 'left';
      durationDisplay.style.textAlign = 'right';
      
      // Make sure the scrubber wrapper takes the available space
      scrubberWrapper.style.flexGrow = '1';
      scrubberWrapper.style.position = 'relative';
      scrubberWrapper.style.height = '20px'; // Increase height for better touch target
      scrubberWrapper.style.display = 'flex';
      scrubberWrapper.style.alignItems = 'center';
    }
    
    // 4. Make scrubber transparent but keep it interactive
    scrubber.style.opacity = '0';
    scrubber.style.cursor = 'pointer';
    scrubber.style.zIndex = '4'; // Ensure it's on top for interactions
    
    // Update notch position function
    function updateNotchPosition() {
      const percent = parseFloat(scrubber.value);
      const scrubberRect = scrubberWrapper.getBoundingClientRect();
      const notchWidth = notch.offsetWidth;
      
      // Calculate position (accounting for notch width)
      const position = (percent / 100) * (scrubberRect.width - notchWidth) + (notchWidth / 2);
      notch.style.left = `${position}px`;
      
      // Update played progress width
      playedProgress.style.width = `${percent}%`;
    }
    
    // Update buffered progress
    function updateBufferedProgress() {
      if (!PlayerState.activeMediaElement) return;
      
      try {
        if (PlayerState.activeMediaElement.buffered.length > 0) {
          const bufferedEnd = PlayerState.activeMediaElement.buffered.end(PlayerState.activeMediaElement.buffered.length - 1);
          const duration = PlayerState.activeMediaElement.duration;
          
          if (duration > 0) {
            const bufferedPercent = (bufferedEnd / duration) * 100;
            bufferedProgress.style.width = `${bufferedPercent}%`;
          }
        }
      } catch (error) {
        console.warn('Error updating buffered progress:', error);
      }
    }
    
    // Add event listeners
    scrubber.addEventListener('input', updateNotchPosition);
    scrubber.addEventListener('change', updateNotchPosition);
    
    // Add hover and active states for the notch
    scrubberWrapper.addEventListener('mouseenter', () => {
      notch.style.transform = 'translateY(-50%) scale(1.2)';
    });
    
    scrubberWrapper.addEventListener('mouseleave', () => {
      notch.style.transform = 'translateY(-50%) scale(1)';
    });
    
    scrubber.addEventListener('mousedown', () => {
      notch.style.transform = 'translateY(-50%) scale(1.4)';
      document.body.classList.add('scrubbing');
    });
    
    document.addEventListener('mouseup', () => {
      if (document.body.classList.contains('scrubbing')) {
        notch.style.transform = 'translateY(-50%) scale(1)';
        document.body.classList.remove('scrubbing');
      }
    });
    
    // Update progress on timeupdate and progress events
    if (PlayerState.audio) {
      PlayerState.audio.addEventListener('timeupdate', () => {
        if (PlayerState.activeMediaElement === PlayerState.audio && !PlayerState.isSeeking) {
          updateNotchPosition();
        }
      });
      
      PlayerState.audio.addEventListener('progress', updateBufferedProgress);
    }
    
    if (PlayerState.video) {
      PlayerState.video.addEventListener('timeupdate', () => {
        if (PlayerState.activeMediaElement === PlayerState.video && !PlayerState.isSeeking) {
          updateNotchPosition();
        }
      });
      
      PlayerState.video.addEventListener('progress', updateBufferedProgress);
    }
    
    // Handle window resize
    window.addEventListener('resize', updateNotchPosition);
    
    // Initial setup
    updateNotchPosition();
    updateBufferedProgress();
    
    console.log('Scrubber layout fixes applied');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'fixScrubberLayout' });
  }
}

// Export public API
export {
  alignPlayerControlsWithIframeMargins,
  optimizeMobileLayout
}; 