/**
 * Playlist Manager Module
 * Handles playlist loading, track selection, and playlist UI
 */

import { PlayerState } from './shared-state.js';
import { ErrorLogger } from './error-logger.js';
import { updateAudioPlayerUI, updateVideoInfo } from './player-ui.js';
import { preloadTrackMedia } from './media-preloader.js';
import { enforceProperMuting } from './player-core.js';

// Default playlist URL
const DEFAULT_PLAYLIST_URL = 'playlist.json';

// Track if playlist is currently loading
let isPlaylistLoading = false;

/**
 * Initialize the playlist functionality
 */
export function initializePlaylist() {
  console.log('Initializing playlist manager...');
  
  try {
    // Set up playlist UI elements
    setupPlaylistUI();
    
    console.log('Playlist manager initialized');
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'initializePlaylist' });
  }
}

/**
 * Set up playlist UI elements and event listeners
 */
function setupPlaylistUI() {
  // Set up playlist toggle button
  const playlistToggleBtn = document.getElementById('playlistToggleBtn');
  if (playlistToggleBtn) {
    playlistToggleBtn.addEventListener('click', togglePlaylistVisibility);
  }
  
  // Set up playlist view toggle buttons
  const folderViewBtn = document.getElementById('folderViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  
  if (folderViewBtn) {
    folderViewBtn.addEventListener('click', () => {
      setPlaylistView('folders');
    });
  }
  
  if (listViewBtn) {
    listViewBtn.addEventListener('click', () => {
      setPlaylistView('list');
    });
  }
  
  // Set up playlist close button
  const closePlaylistBtn = document.getElementById('closePlaylistBtn');
  if (closePlaylistBtn) {
    closePlaylistBtn.addEventListener('click', hidePlaylist);
  }
  
  // Set up event listeners for playlist changes
  document.addEventListener('playlist-updated', (event) => {
    populatePlaylist();
  });
  
  document.addEventListener('playlist-view-changed', (event) => {
    updatePlaylistView(event.detail.view);
  });
}

/**
 * Load playlist data from JSON file
 * @param {string} url - URL to the playlist JSON file (optional)
 */
export function loadPlaylistData(url = DEFAULT_PLAYLIST_URL) {
  if (isPlaylistLoading) {
    console.log('Playlist is already loading, ignoring request');
    return;
  }
  
  isPlaylistLoading = true;
  console.log(`Loading playlist data from ${url}...`);
  
  // Show loading message
  if (PlayerState.elements.message) {
    PlayerState.elements.message.textContent = "Loading playlist...";
    PlayerState.elements.message.style.display = "block";
  }
  
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Playlist data loaded successfully');
      
      // Process the playlist data
      processPlaylistData(data);
      
      // Hide loading message
      if (PlayerState.elements.message) {
        PlayerState.elements.message.textContent = "Playlist loaded successfully";
        setTimeout(() => {
          if (PlayerState.elements.message && 
              PlayerState.elements.message.textContent === "Playlist loaded successfully") {
            PlayerState.elements.message.style.display = "none";
          }
        }, 2000);
      }
      
      isPlaylistLoading = false;
    })
    .catch(error => {
      ErrorLogger.handleError(error, { function: 'loadPlaylistData', url });
      
      // Show error message
      if (PlayerState.elements.message) {
        PlayerState.elements.message.textContent = "Error loading playlist. Using default playlist.";
        setTimeout(() => {
          if (PlayerState.elements.message && 
              PlayerState.elements.message.textContent === "Error loading playlist. Using default playlist.") {
            PlayerState.elements.message.style.display = "none";
          }
        }, 3000);
      }
      
      // Load default playlist as fallback
      initializeDefaultPlaylist();
      
      isPlaylistLoading = false;
    });
}

/**
 * Process the loaded playlist data
 * @param {Object} data - The playlist data object
 */
function processPlaylistData(data) {
  try {
    // Validate playlist data
    if (!data || !Array.isArray(data.tracks) || data.tracks.length === 0) {
      throw new Error('Invalid playlist data format');
    }
    
    console.log(`Processing ${data.tracks.length} tracks`);
    
    // Organize tracks by playlist
    const playlistGroups = {};
    const flatPlaylist = [];
    
    data.tracks.forEach(track => {
      // Ensure track has required properties
      if (!track.title || !track.audioSrc) {
        console.warn('Skipping invalid track:', track);
        return;
      }
      
      // Add track to flat playlist
      flatPlaylist.push(track);
      
      // Group by playlist name
      const playlistName = track.playlistName || 'Uncategorized';
      if (!playlistGroups[playlistName]) {
        playlistGroups[playlistName] = [];
      }
      playlistGroups[playlistName].push(track);
    });
    
    // Update PlayerState
    PlayerState.playlist = flatPlaylist;
    PlayerState.playlistGroups = playlistGroups;
    
    // Dispatch event for playlist update
    PlayerState.setPlaylist(flatPlaylist);
    
    // Load the first track if no track is currently loaded
    // But don't auto-play it - set autoPlay to false for initial load
    if (PlayerState.currentTrackIndex === -1 && flatPlaylist.length > 0) {
      loadTrack(0, false); // Explicitly set autoPlay to false for initial load
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'processPlaylistData' });
    initializeDefaultPlaylist();
  }
}

/**
 * Initialize a default playlist as fallback
 */
export function initializeDefaultPlaylist() {
  console.log('Initializing default playlist');
  
  // Create a simple default playlist
  const defaultPlaylist = {
    tracks: [
      {
        title: "Default Track",
        playlistName: "Default Playlist",
        audioSrc: "assets/audio/default-track.mp3",
        artworkUrl: "assets/images/default-artwork.jpg"
      }
    ]
  };
  
  // Process the default playlist
  processPlaylistData(defaultPlaylist);
}

/**
 * Populate the playlist UI with tracks
 */
export function populatePlaylist() {
  if (!PlayerState.elements.playlistTracks) {
    console.error('Playlist tracks container not found');
    return;
  }
  
  try {
    // Clear existing playlist items
    PlayerState.elements.playlistTracks.innerHTML = '';
    
    // Determine which view to use
    if (PlayerState.currentPlaylistView === 'folders') {
      populateFolderView();
    } else {
      populateListView();
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'populatePlaylist' });
  }
}

/**
 * Populate the playlist UI with folder view
 */
function populateFolderView() {
  const playlistGroups = PlayerState.playlistGroups;
  const fragment = document.createDocumentFragment();
  
  // Create a section for each playlist group
  Object.keys(playlistGroups).forEach(playlistName => {
    const tracks = playlistGroups[playlistName];
    
    // Create playlist section
    const section = document.createElement('div');
    section.className = 'playlist-section';
    
    // Create playlist header
    const header = document.createElement('div');
    header.className = 'playlist-header';
    header.textContent = playlistName;
    section.appendChild(header);
    
    // Create tracks container
    const tracksContainer = document.createElement('div');
    tracksContainer.className = 'playlist-tracks-container';
    
    // Add tracks to container
    tracks.forEach((track, index) => {
      const trackElement = createTrackElement(track, getGlobalTrackIndex(track));
      tracksContainer.appendChild(trackElement);
    });
    
    section.appendChild(tracksContainer);
    fragment.appendChild(section);
  });
  
  // Add all elements to the playlist container
  PlayerState.elements.playlistTracks.appendChild(fragment);
}

/**
 * Populate the playlist UI with list view
 */
function populateListView() {
  const playlist = PlayerState.playlist;
  const fragment = document.createDocumentFragment();
  
  // Create a flat list of all tracks
  playlist.forEach((track, index) => {
    const trackElement = createTrackElement(track, index);
    fragment.appendChild(trackElement);
  });
  
  // Add all elements to the playlist container
  PlayerState.elements.playlistTracks.appendChild(fragment);
}

/**
 * Create a track element for the playlist UI
 * @param {Object} track - The track object
 * @param {number} index - The track index in the flat playlist
 * @returns {HTMLElement} The track element
 */
function createTrackElement(track, index) {
  const trackElement = document.createElement('div');
  trackElement.className = 'playlist-track';
  trackElement.dataset.index = index;
  
  // Add active class if this is the current track
  if (index === PlayerState.currentTrackIndex) {
    trackElement.classList.add('active');
  }
  
  // Create track info
  const trackInfo = document.createElement('div');
  trackInfo.className = 'track-info';
  
  // Create track title
  const title = document.createElement('div');
  title.className = 'track-title';
  title.textContent = track.title;
  trackInfo.appendChild(title);
  
  // Create track artist if available
  if (track.artist) {
    const artist = document.createElement('div');
    artist.className = 'track-artist';
    artist.textContent = track.artist;
    trackInfo.appendChild(artist);
  }
  
  // Add XR indicator if track has video
  if (track.videoSrc) {
    const xrIndicator = document.createElement('div');
    xrIndicator.className = 'xr-indicator';
    xrIndicator.innerHTML = '<i class="fas fa-vr-cardboard"></i>';
    xrIndicator.title = '360° Experience Available';
    trackElement.appendChild(xrIndicator);
  }
  
  // Add track info to track element
  trackElement.appendChild(trackInfo);
  
  // Add click event listener with IMPROVED direct autoplay approach
  trackElement.addEventListener('click', (e) => {
    // Add ripple effect
    addRippleEffect(e, trackElement);
    
    // Add loading indicator
    trackElement.classList.add('loading');
    
    // Show loading message
    if (PlayerState.elements.message) {
      PlayerState.elements.message.textContent = "Loading track...";
      PlayerState.elements.message.style.display = "block";
    }
    
    // Get current active media element before loading new track
    const previousMediaElement = PlayerState.activeMediaElement;
    
    // Pause current playback if any
    if (previousMediaElement && !previousMediaElement.paused) {
      previousMediaElement.pause();
    }
    
    // IMPORTANT: Set a flag to indicate this is a direct user interaction
    window.DIRECT_USER_INTERACTION = true;
    
    // Load the track with autoPlay explicitly set to true
    loadTrack(index, true);
    
    // Additional safety measure: Try to play directly after a short delay
    // This ensures we attempt playback right after the track is loaded
    setTimeout(() => {
      if (PlayerState.activeMediaElement) {
        console.log('Additional direct play attempt from track click');
        
        // If we're in XR mode, ensure proper muting
        if (PlayerState.isXRMode) {
          PlayerState.video.muted = false;
          PlayerState.audio.muted = true;
        } else {
          PlayerState.audio.muted = false;
          PlayerState.video.muted = true;
        }
        
        // Force a play attempt with all available browser tricks
        import('./player-core.js').then(module => {
          module.attemptMediaPlayback(
            PlayerState.activeMediaElement,
            // Success callback
            () => {
              console.log('Additional play attempt succeeded');
              PlayerState.setPlaybackState(true);
              
              import('./player-ui.js').then(uiModule => {
                uiModule.updatePlayPauseButton(false); // false = playing
              });
              
              // Hide loading message
              if (PlayerState.elements.message) {
                PlayerState.elements.message.textContent = "Playing";
                setTimeout(() => {
                  if (PlayerState.elements.message && 
                      PlayerState.elements.message.textContent === "Playing") {
                    PlayerState.elements.message.style.display = "none";
                  }
                }, 1000);
              }
              
              // Remove loading class
              trackElement.classList.remove('loading');
            },
            // Error callback
            (playError) => {
              console.error('All play attempts failed:', playError);
              
              // One final desperate attempt - click the play button programmatically
              if (PlayerState.elements.playPauseBtn) {
                console.log('Final attempt: Clicking play button programmatically');
                PlayerState.elements.playPauseBtn.click();
              }
              
              // Remove loading class
              trackElement.classList.remove('loading');
            }
          );
        });
      }
    }, 300); // Increased delay to ensure track is loaded
    
    // Clear the user interaction flag after 1 second
    setTimeout(() => {
      window.DIRECT_USER_INTERACTION = false;
    }, 1000);
  });
  
  return trackElement;
}

/**
 * Add ripple effect to an element on click
 * @param {MouseEvent} event - The click event
 * @param {HTMLElement} element - The element to add the ripple to
 */
function addRippleEffect(event, element) {
  const rect = element.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  
  element.appendChild(ripple);
  
  // Remove ripple after animation completes
  setTimeout(() => {
    ripple.remove();
  }, 600);
}

/**
 * Get the global index of a track in the flat playlist
 * @param {Object} track - The track to find
 * @returns {number} The index of the track or -1 if not found
 */
function getGlobalTrackIndex(track) {
  return PlayerState.playlist.findIndex(t => 
    t.title === track.title && 
    t.audioSrc === track.audioSrc
  );
}

/**
 * Load a track by index
 * @param {number} index - The index of the track to load
 * @param {boolean} autoPlay - Whether to automatically start playback (defaults to false)
 */
export function loadTrack(index, autoPlay = false) {
  try {
    // Validate index
    if (index < 0 || index >= PlayerState.playlist.length) {
      throw new Error(`Invalid track index: ${index}`);
    }
    
    console.log(`Loading track at index ${index}, autoPlay: ${autoPlay}`);
    
    // Get the track
    const track = PlayerState.playlist[index];
    
    // Update current track index
    PlayerState.setCurrentTrack(index);
    
    // Update UI to show the track is loading
    if (PlayerState.elements.message) {
      PlayerState.elements.message.textContent = "Loading track...";
      PlayerState.elements.message.style.display = "block";
    }
    
    // Update active track in playlist UI
    updateActiveTrackInPlaylist(index);
    
    // Update audio player UI immediately
    updateAudioPlayerUI(
      track.title, 
      track.artist || track.playlistName, 
      track.artworkUrl
    );
    
    // Update video info if available
    if (track.videoSrc) {
      updateVideoInfo(track.title, track.playlistName);
    }
    
    // Reset preloaded flags
    PlayerState.isAudioPreloaded = false;
    PlayerState.isVideoPreloaded = false;
    
    // Function to remove loading indicators
    const removeLoadingIndicators = () => {
      // Remove loading class from track element
      const trackElement = document.querySelector(`.playlist-track[data-index="${index}"]`);
      if (trackElement) {
        trackElement.classList.remove('loading');
      }
    };
    
    // Set media sources and prepare for playback immediately
    if (PlayerState.audio) {
      PlayerState.audio.src = track.audioSrc;
      PlayerState.audio.load();
    }
    
    if (PlayerState.video && track.videoSrc) {
      PlayerState.video.src = track.videoSrc;
      PlayerState.video.load();
    } else if (PlayerState.video) {
      // Clear video source if track doesn't have one
      PlayerState.video.removeAttribute('src');
      PlayerState.video.load();
    }
    
    // Set the active media element based on current mode
    if (PlayerState.isXRMode) {
      if (!track.videoSrc) {
        // Switch to audio mode if track doesn't have video
        import('./xr-mode.js').then(module => {
          module.switchToAudioMode();
          // After switching mode, ensure proper muting
          enforceProperMuting();
          
          // Now attempt playback if requested
          if (autoPlay) {
            attemptPlaybackWithRetry();
          }
        });
      } else {
        PlayerState.setActiveMediaElement(PlayerState.video);
        enforceProperMuting();
        
        // Now attempt playback if requested
        if (autoPlay) {
          attemptPlaybackWithRetry();
        }
      }
    } else {
      PlayerState.setActiveMediaElement(PlayerState.audio);
      enforceProperMuting();
      
      // Now attempt playback if requested
      if (autoPlay) {
        attemptPlaybackWithRetry();
      }
    }
    
    // Start preloading in the background
    preloadTrackMedia(track)
      .then(() => {
        console.log('Track media preloaded successfully');
        removeLoadingIndicators();
        
        // If autoPlay was requested but playback hasn't started yet, try again
        if (autoPlay && PlayerState.activeMediaElement && PlayerState.activeMediaElement.paused) {
          console.log('Track preloaded but not playing yet - trying again');
          attemptPlaybackWithRetry();
        }
      })
      .catch(error => {
        ErrorLogger.handleError(error, { function: 'loadTrack.preload' });
        removeLoadingIndicators();
      });
    
    // Improved function to attempt playback with retry
    function attemptPlaybackWithRetry() {
      // Check if we have a direct user interaction context
      const hasDirectUserInteraction = window.DIRECT_USER_INTERACTION === true;
      console.log(`Attempting playback with${hasDirectUserInteraction ? '' : 'out'} direct user interaction`);
      
      // If we're in a direct user interaction, try playing directly first
      if (hasDirectUserInteraction && PlayerState.activeMediaElement) {
        console.log('Direct play attempt with user interaction');
        
        // Set proper mute states
        if (PlayerState.isXRMode) {
          PlayerState.video.muted = false;
          PlayerState.audio.muted = true;
        } else {
          PlayerState.audio.muted = false;
          PlayerState.video.muted = true;
        }
        
        // Try direct play first
        const playPromise = PlayerState.activeMediaElement.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('Direct play succeeded');
            
            // Update playback state
            PlayerState.setPlaybackState(true);
            
            // Update UI
            import('./player-ui.js').then(module => {
              module.updatePlayPauseButton(false); // false = playing
            });
            
            // Hide loading message
            if (PlayerState.elements.message) {
              PlayerState.elements.message.textContent = "Playing";
              setTimeout(() => {
                if (PlayerState.elements.message && 
                    PlayerState.elements.message.textContent === "Playing") {
                  PlayerState.elements.message.style.display = "none";
                }
              }, 1000);
            }
          }).catch(error => {
            console.warn('Direct play failed, falling back to helper:', error);
            fallbackToHelper();
          });
        } else {
          // Browser doesn't support promises on media elements
          console.log('Browser does not support play promises, falling back to helper');
          fallbackToHelper();
        }
      } else {
        // No direct user interaction, use helper directly
        fallbackToHelper();
      }
      
      // Helper function to use the attemptMediaPlayback helper
      function fallbackToHelper() {
        import('./player-core.js').then(module => {
          module.attemptMediaPlayback(
            PlayerState.activeMediaElement,
            // Success callback
            () => {
              console.log('Helper play succeeded');
              
              // Update playback state
              PlayerState.setPlaybackState(true);
              
              // Update UI
              import('./player-ui.js').then(module => {
                module.updatePlayPauseButton(false); // false = playing
              });
              
              // Hide loading message
              if (PlayerState.elements.message) {
                PlayerState.elements.message.textContent = "Playing";
                setTimeout(() => {
                  if (PlayerState.elements.message && 
                      PlayerState.elements.message.textContent === "Playing") {
                    PlayerState.elements.message.style.display = "none";
                  }
                }, 1000);
              }
            },
            // Error callback
            (error) => {
              console.error('Failed to autoplay track:', error);
              ErrorLogger.handleError(error, { function: 'loadTrack.autoplay' });
              
              // Last resort - try clicking the play button programmatically
              if (PlayerState.elements.playPauseBtn) {
                console.log('Last resort: Clicking play button programmatically');
                PlayerState.elements.playPauseBtn.click();
              } else {
                // Show message about autoplay being blocked
                if (PlayerState.elements.message) {
                  PlayerState.elements.message.textContent = "Track loaded. Click play to start.";
                  setTimeout(() => {
                    if (PlayerState.elements.message && 
                        PlayerState.elements.message.textContent === "Track loaded. Click play to start.") {
                      PlayerState.elements.message.style.display = "none";
                    }
                  }, 3000);
                }
              }
            }
          );
        }).catch(error => {
          ErrorLogger.handleError(error, { function: 'loadTrack.importPlayerCore' });
        });
      }
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'loadTrack', index });
    
    // Remove loading indicators even if there was an error
    const trackElement = document.querySelector(`.playlist-track[data-index="${index}"]`);
    if (trackElement) {
      trackElement.classList.remove('loading');
    }
  }
}

/**
 * Update the active track in the playlist UI
 * @param {number} index - The index of the active track
 */
function updateActiveTrackInPlaylist(index) {
  // Remove active class and loading indicator from all tracks
  const trackElements = document.querySelectorAll('.playlist-track');
  trackElements.forEach(element => {
    element.classList.remove('active');
    element.classList.remove('loading');
  });
  
  // Add active class to current track
  const activeTrack = document.querySelector(`.playlist-track[data-index="${index}"]`);
  if (activeTrack) {
    activeTrack.classList.add('active');
    
    // Scroll to active track
    activeTrack.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/**
 * Load the next track in the playlist
 * @param {boolean} autoPlay - Whether to automatically start playback (defaults to true)
 */
export function loadNextTrack(autoPlay = true) {
  if (PlayerState.playlist.length === 0) return;
  
  let nextIndex = PlayerState.currentTrackIndex + 1;
  
  // Loop back to the beginning if at the end
  if (nextIndex >= PlayerState.playlist.length) {
    nextIndex = 0;
  }
  
  loadTrack(nextIndex, autoPlay);
}

/**
 * Load the previous track in the playlist
 * @param {boolean} autoPlay - Whether to automatically start playback (defaults to true)
 */
export function loadPreviousTrack(autoPlay = true) {
  if (PlayerState.playlist.length === 0) return;
  
  let prevIndex = PlayerState.currentTrackIndex - 1;
  
  // Loop to the end if at the beginning
  if (prevIndex < 0) {
    prevIndex = PlayerState.playlist.length - 1;
  }
  
  loadTrack(prevIndex, autoPlay);
}

/**
 * Set the playlist view mode
 * @param {string} view - The view mode ('folders' or 'list')
 */
export function setPlaylistView(view) {
  if (view !== 'folders' && view !== 'list') {
    console.error(`Invalid playlist view: ${view}`);
    return;
  }
  
  PlayerState.setCurrentPlaylistView(view);
}

/**
 * Update the playlist view based on the current view mode
 * @param {string} view - The view mode
 */
function updatePlaylistView(view) {
  // Update view buttons
  const folderViewBtn = document.getElementById('folderViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  
  if (folderViewBtn && listViewBtn) {
    if (view === 'folders') {
      folderViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
    } else {
      folderViewBtn.classList.remove('active');
      listViewBtn.classList.add('active');
    }
  }
  
  // Update playlist container class
  if (PlayerState.elements.playlistContainer) {
    PlayerState.elements.playlistContainer.className = `playlist-container ${view}-view`;
  }
  
  // Repopulate the playlist with the new view
  populatePlaylist();
}

/**
 * Toggle playlist visibility
 */
export function togglePlaylistVisibility() {
  if (!PlayerState.elements.playlistOverlay) return;
  
  const isVisible = PlayerState.elements.playlistOverlay.classList.contains('visible');
  
  if (isVisible) {
    hidePlaylist();
  } else {
    showPlaylist();
  }
}

/**
 * Show the playlist
 */
export function showPlaylist() {
  if (!PlayerState.elements.playlistOverlay) return;
  
  PlayerState.elements.playlistOverlay.classList.add('visible');
  
  // Ensure the active track is visible
  setTimeout(() => {
    const activeTrack = document.querySelector('.playlist-track.active');
    if (activeTrack) {
      activeTrack.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 300);
}

/**
 * Hide the playlist
 */
export function hidePlaylist() {
  if (!PlayerState.elements.playlistOverlay) return;
  
  PlayerState.elements.playlistOverlay.classList.remove('visible');
}

/**
 * Search the playlist for tracks matching a query
 * @param {string} query - The search query
 * @returns {Array} Array of matching tracks
 */
export function searchPlaylist(query) {
  if (!query || typeof query !== 'string') return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  return PlayerState.playlist.filter(track => {
    const title = (track.title || '').toLowerCase();
    const artist = (track.artist || '').toLowerCase();
    const playlist = (track.playlistName || '').toLowerCase();
    
    return title.includes(normalizedQuery) || 
           artist.includes(normalizedQuery) || 
           playlist.includes(normalizedQuery);
  });
}

/**
 * Filter the playlist to show only tracks with 360° video
 * @returns {Array} Array of tracks with 360° video
 */
export function filterXRTracks() {
  return PlayerState.playlist.filter(track => track.videoSrc);
} 