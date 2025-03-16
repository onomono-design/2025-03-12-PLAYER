/**
 * Player UI Module
 * Handles all UI-related functionality for the media player
 */

import { PlayerState } from './shared-state.js';
import { ErrorLogger } from './error-logger.js';

/**
 * Initialize the player UI
 */
export function initializeUI() {
  console.log('Initializing player UI...');
  
  try {
    // Set up UI event listeners
    setupUIListeners();
    
    // Ensure player controls are centered
    ensurePlayerControlsCentered();
    
    // Sync album artwork width
    syncAlbumArtworkWidth();
    
    // Sync playlist width with player controls
    syncPlaylistWidth();
    
    console.log('Player UI initialized');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'initializeUI' });
  }
}

/**
 * Set up UI event listeners
 */
export function setupUIListeners() {
  // Listen for window resize events
  window.addEventListener('resize', () => {
    ensurePlayerControlsCentered();
    syncAlbumArtworkWidth();
    syncPlaylistWidth();
  });
  
  // Listen for XR mode changes
  document.addEventListener('xr-mode-changed', (event) => {
    updateUIForCurrentMode(event.detail.isXRMode);
  });
  
  // Listen for playback state changes
  document.addEventListener('playback-state-changed', (event) => {
    updatePlayPauseButton(!event.detail.isPlaying);
  });
  
  // Listen for track changes
  document.addEventListener('current-track-changed', (event) => {
    if (event.detail.track) {
      updateVideoInfo(event.detail.track.title, event.detail.track.playlistName);
    }
  });
  
  // Listen for playlist toggle events
  document.addEventListener('click', (event) => {
    const playlistToggle = event.target.closest('#playlistToggle');
    const playlistClose = event.target.closest('#playlistClose');
    
    if (playlistToggle || playlistClose) {
      // Ensure playlist width is synced when toggling
      setTimeout(syncPlaylistWidth, 10);
      
      // If opening the playlist, sync width again after animation completes
      if (playlistToggle) {
        setTimeout(syncPlaylistWidth, 300);
      }
    }
  });
  
  // Add direct listeners to playlist toggle buttons
  const playlistToggleBtn = document.getElementById('playlistToggle');
  const playlistCloseBtn = document.getElementById('playlistClose');
  const playlistOverlay = document.getElementById('playlistOverlay');
  
  if (playlistToggleBtn) {
    playlistToggleBtn.addEventListener('click', () => {
      // Sync width before showing the playlist
      syncPlaylistWidth();
      
      // Sync width again after animation completes
      setTimeout(syncPlaylistWidth, 300);
    });
  }
  
  if (playlistCloseBtn) {
    playlistCloseBtn.addEventListener('click', syncPlaylistWidth);
  }
  
  if (playlistOverlay) {
    playlistOverlay.addEventListener('click', syncPlaylistWidth);
  }
}

/**
 * Update the play/pause button to reflect the current state
 * @param {boolean} isPaused - Whether the media is paused
 */
export function updatePlayPauseButton(isPaused) {
  if (!PlayerState.elements.playPauseBtn) return;
  
  if (isPaused) {
    PlayerState.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
  } else {
    PlayerState.elements.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
  }
}

/**
 * Update the mute button to reflect the current state
 */
export function updateMuteButton() {
  if (!PlayerState.elements.muteBtn || !PlayerState.activeMediaElement) return;
  
  if (PlayerState.activeMediaElement.muted) {
    PlayerState.elements.muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    PlayerState.elements.muteBtn.classList.add('muted');
  } else {
    PlayerState.elements.muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    PlayerState.elements.muteBtn.classList.remove('muted');
  }
}

/**
 * Update the progress bar
 * @param {number} percentage - The percentage of progress (0-100)
 */
export function updateProgressBar(percentage) {
  if (!PlayerState.elements.scrubberProgress || !PlayerState.elements.scrubber) return;
  
  // Update the progress bar width
  PlayerState.elements.scrubberProgress.style.width = `${percentage}%`;
  
  // Update the scrubber value
  PlayerState.elements.scrubber.value = percentage;
}

/**
 * Update the time display
 * @param {number} currentTime - The current playback time in seconds
 * @param {number} duration - The total duration in seconds
 */
export function updateTimeDisplay(currentTime, duration) {
  if (!PlayerState.elements.currentTimeDisplay || !PlayerState.elements.durationDisplay) return;
  
  // Format the times
  const formattedCurrentTime = formatTime(Math.floor(currentTime));
  const formattedDuration = formatTime(Math.floor(duration));
  
  // Update the displays
  PlayerState.elements.currentTimeDisplay.textContent = formattedCurrentTime;
  PlayerState.elements.durationDisplay.textContent = formattedDuration;
}

/**
 * Format time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Update the audio player UI with track information
 * @param {string} title - The track title
 * @param {string} artist - The artist name
 * @param {string} artworkUrl - The URL to the album artwork
 */
export function updateAudioPlayerUI(title, artist, artworkUrl) {
  if (!PlayerState.elements.audioTitle || !PlayerState.elements.audioArtist) return;
  
  // Update title and artist
  PlayerState.elements.audioTitle.textContent = title || 'Unknown Title';
  PlayerState.elements.audioArtist.textContent = artist || 'Unknown Artist';
  
  // Update album artwork if provided
  if (artworkUrl && PlayerState.elements.albumArt) {
    PlayerState.elements.albumArt.src = artworkUrl;
    PlayerState.elements.albumArt.alt = `${title} Album Artwork`;
  }
}

/**
 * Update the video information display
 * @param {string} sceneName - The scene name
 * @param {string} playlistName - The playlist name
 */
export function updateVideoInfo(sceneName, playlistName) {
  if (!PlayerState.elements.sceneName || !PlayerState.elements.playlistName) return;
  
  PlayerState.elements.sceneName.textContent = sceneName || 'Unknown Scene';
  PlayerState.elements.playlistName.textContent = playlistName || 'Unknown Playlist';
}

/**
 * Update the UI based on the current mode (XR or audio-only)
 * @param {boolean} isXRMode - Whether the player is in XR mode
 */
export function updateUIForCurrentMode(isXRMode) {
  if (!PlayerState.elements.audioPlayerContainer || !PlayerState.elements.videoPlayerContainer) return;
  
  if (isXRMode) {
    // Show video player, hide audio player
    PlayerState.elements.videoPlayerContainer.classList.remove('hidden');
    PlayerState.elements.audioPlayerContainer.classList.add('hidden');
    
    // Show recenter camera button if available
    if (PlayerState.elements.recenterCameraBtn) {
      PlayerState.elements.recenterCameraBtn.style.display = 'block';
    }
  } else {
    // Show audio player, hide video player
    PlayerState.elements.audioPlayerContainer.classList.remove('hidden');
    PlayerState.elements.videoPlayerContainer.classList.add('hidden');
    
    // Hide recenter camera button if available
    if (PlayerState.elements.recenterCameraBtn) {
      PlayerState.elements.recenterCameraBtn.style.display = 'none';
    }
  }
  
  // Update the document body class
  if (isXRMode) {
    document.body.classList.add('xr-mode');
    document.body.classList.remove('audio-mode');
  } else {
    document.body.classList.add('audio-mode');
    document.body.classList.remove('xr-mode');
  }
}

/**
 * Ensure the player controls are centered
 */
export function ensurePlayerControlsCentered() {
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
}

/**
 * Sync the album artwork width to maintain aspect ratio
 */
export function syncAlbumArtworkWidth() {
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
}

/**
 * Toggle fullscreen mode
 */
export function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // Enter fullscreen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.webkitRequestFullscreen) {
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) {
      document.documentElement.msRequestFullscreen();
    }
  } else {
    // Exit fullscreen
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
}

/**
 * Show keyboard shortcuts info for desktop users
 */
export function showKeyboardShortcutsInfo() {
  if (PlayerState.isMobileDevice) return;
  
  const message = 
    "Keyboard shortcuts: Space = Play/Pause, Arrow Keys = Previous/Next Track, M = Mute, F = Fullscreen";
  
  if (PlayerState.elements.message) {
    PlayerState.elements.message.textContent = message;
    PlayerState.elements.message.style.display = "block";
    
    // Hide after a delay
    setTimeout(() => {
      if (PlayerState.elements.message && 
          PlayerState.elements.message.textContent === message) {
        PlayerState.elements.message.style.display = "none";
      }
    }, 5000);
  }
}

/**
 * Sync the playlist container width with the player controls width
 * This ensures consistent UI appearance across the application
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
    
    // Set up a MutationObserver to watch for changes to the player controls style
    if (!window.playlistWidthObserver) {
      window.playlistWidthObserver = new MutationObserver((mutations) => {
        // Only update if the mutations affect attributes we care about
        const relevantMutation = mutations.some(mutation => 
          mutation.type === 'attributes' && 
          (mutation.attributeName === 'style' || mutation.attributeName === 'class')
        );
        
        if (relevantMutation) {
          // Use setTimeout to batch multiple rapid changes
          clearTimeout(window.playlistWidthSyncTimeout);
          window.playlistWidthSyncTimeout = setTimeout(() => {
            syncPlaylistWidth();
          }, 50);
        }
      });
      
      // Start observing the player controls for style changes
      window.playlistWidthObserver.observe(playerControls, { 
        attributes: true,
        attributeFilter: ['style', 'class']
      });
      
      console.log('Set up MutationObserver for player controls style changes');
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'syncPlaylistWidth' });
  }
} 