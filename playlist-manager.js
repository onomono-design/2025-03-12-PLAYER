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

// Track if a local playlist cache is available
let localPlaylistCache = null;
let playlistLastLoaded = 0;
const PLAYLIST_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

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
  
  // Check if we have a valid cached playlist
  const now = Date.now();
  if (localPlaylistCache && (now - playlistLastLoaded) < PLAYLIST_CACHE_TTL) {
    console.log('Using cached playlist data');
    processPlaylistData(localPlaylistCache);
    return;
  }
  
  isPlaylistLoading = true;
  console.log(`Loading playlist data from ${url}...`);
  
  // Show loading message
  if (PlayerState.elements.message) {
    PlayerState.elements.message.textContent = "Loading playlist...";
    PlayerState.elements.message.style.display = "block";
  }
  
  // Add cache-busting only if it's been more than a day since last load
  const fetchUrl = (now - playlistLastLoaded) > PLAYLIST_CACHE_TTL ? 
    `${url}?t=${now}` : url;
  
  fetch(fetchUrl, {
    headers: {
      'Cache-Control': 'max-age=3600'  // Tell browser to cache for 1 hour
    }
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Playlist data loaded successfully');
      
      // Cache the playlist data
      localPlaylistCache = data;
      playlistLastLoaded = now;
      
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
    if (!data || !Array.isArray(data.tracks) && !Array.isArray(data.playlists)) {
      throw new Error('Invalid playlist data format');
    }
    
    // Handle different playlist formats
    let tracks = [];
    
    if (Array.isArray(data.tracks)) {
      tracks = data.tracks;
    } else if (Array.isArray(data.playlists)) {
      // Handle grouped playlists format
      data.playlists.forEach(playlist => {
        if (playlist.tracks && Array.isArray(playlist.tracks)) {
          playlist.tracks.forEach(track => {
            track.playlistName = track.playlistName || track.playlist || playlist.playlist_name || 'Uncategorized';
            tracks.push(track);
          });
        }
      });
    }
    
    if (tracks.length === 0) {
      throw new Error('No tracks found in playlist data');
    }
    
    console.log(`Processing ${tracks.length} tracks`);
    
    // Normalize track data
    const normalizedTracks = tracks.map(track => {
      return {
        title: track.title || 'Unknown Title',
        audioSrc: track.audioSrc || track.audio_url || '',
        videoSrc: track.videoSrc || track.XR_Scene || track.video_url || '',
        artworkUrl: track.artworkUrl || track.artwork_url || '',
        playlistName: track.playlistName || track.playlist || 'Uncategorized',
        chapter: track.chapter || 0,
        duration: track.duration || '0:00',
        isAR: track.isAR || track.IsAR || false
      };
    }).filter(track => track.audioSrc); // Only keep tracks with an audio source
    
    // Organize tracks by playlist
    const playlistGroups = {};
    const flatPlaylist = [];
    
    normalizedTracks.forEach(track => {
      // Add track to flat playlist
      flatPlaylist.push(track);
      
      // Group by playlist name
      const playlistName = track.playlistName;
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
  
  // Add click event handler
  // Use a debounce technique to prevent rapid multiple clicks
  let isProcessingClick = false;
  trackElement.addEventListener('click', (e) => {
    // Add ripple effect
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    trackElement.appendChild(ripple);
    
    // Calculate position of ripple
    const rect = trackElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Set ripple position
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    // Remove ripple after animation
    setTimeout(() => {
      ripple.remove();
    }, 600);
    
    // Prevent processing if already processing a click
    if (isProcessingClick) {
      console.log('Ignoring click - already processing another click');
      return;
    }
    
    // Set processing flag
    isProcessingClick = true;
    
    // Add loading class
    trackElement.classList.add('loading');
    
    // Get track index
    const trackIndex = parseInt(trackElement.dataset.index);
    console.log(`Track clicked: index=${trackIndex}`);
    
    // Create touch session checkpoint for mobile
    window.DIRECT_USER_INTERACTION = true;
    
    // Clear timeout after a while
    setTimeout(() => {
      window.DIRECT_USER_INTERACTION = false;
    }, 3000);
    
    // Close the playlist after selection on mobile to maximize screen space
    if (PlayerState.isMobileDevice && 
        PlayerState.elements.playlistContainer && 
        PlayerState.elements.playlistContainer.classList.contains('visible')) {
      // Delay slightly to allow user to see their selection
      setTimeout(() => {
        // Find and click the close button
        const closeButton = document.getElementById('playlistClose');
        if (closeButton) {
          closeButton.click();
        } else {
          // Fallback - hide manually
          PlayerState.elements.playlistContainer.classList.remove('visible');
        }
      }, 300);
    }
    
    // Load the track with autoplay
    loadTrack(trackIndex, true);
    
    // Reset processing flag after timeout
    setTimeout(() => {
      isProcessingClick = false;
      // Double check that loading class is removed
      trackElement.classList.remove('loading');
    }, PlayerState.isMobileDevice ? 2000 : 1000);
  });
  
  return trackElement;
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
    console.log(`Loading track at index ${index}, autoPlay: ${autoPlay}`);
    
    // Validate index
    if (index < 0 || index >= PlayerState.playlist.length) {
      console.error(`Invalid track index: ${index}`);
      return false;
    }
    
    // Get track data
    const track = PlayerState.playlist[index];
    if (!track) {
      console.error(`Track not found at index ${index}`);
      return false;
    }
    
    console.log(`Loading track: "${track.title}" from playlist "${track.playlistName}"`);
    
    // Find track element and add loading class
    const trackElement = document.querySelector(`.playlist-track[data-index="${index}"]`);
    if (trackElement) {
      trackElement.classList.add('loading');
    }
    
    // Update track indexes
    const previousTrackIndex = PlayerState.currentTrackIndex;
    PlayerState.currentTrackIndex = index;
    
    // Update active track in UI
    const trackElements = document.querySelectorAll('.playlist-track');
    trackElements.forEach(el => {
      if (parseInt(el.dataset.index) === index) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
    
    // Store current playback state
    const wasPlaying = PlayerState.isPlaying;
    
    // Show loading message
    if (PlayerState.elements.message) {
      PlayerState.elements.message.textContent = `Loading "${track.title}"...`;
      PlayerState.elements.message.style.display = "block";
    }
    
    // Reset preload flags
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
    
    // Pause current media before loading new track
    if (PlayerState.audio) PlayerState.audio.pause();
    if (PlayerState.video) PlayerState.video.pause();
    
    // Clear any pending playback attempt timeout
    if (window.playbackAttemptTimeout) {
      clearTimeout(window.playbackAttemptTimeout);
    }
    
    // Mobile-specific optimizations for loading
    const loadTimeout = PlayerState.isMobileDevice ? 1500 : 500;
    
    // Set media sources and prepare for playback immediately
    if (PlayerState.audio) {
      PlayerState.audio.src = track.audioSrc;
      PlayerState.audio.load();
    }
    
    if (PlayerState.video && track.videoSrc) {
      // For mobile devices, we'll use a sequential loading approach
      if (PlayerState.isMobileDevice) {
        // First prioritize loading the audio
        const onAudioReady = () => {
          if (PlayerState.audio) {
            PlayerState.audio.removeEventListener('canplaythrough', onAudioReady);
            
            // Then start loading video
            if (PlayerState.video) {
              PlayerState.video.src = track.videoSrc;
              PlayerState.video.load();
            }
          }
        };
        
        // Listen for audio ready state
        if (PlayerState.audio.readyState >= 3) {
          // Audio already ready, load video right away
          PlayerState.video.src = track.videoSrc;
          PlayerState.video.load();
        } else {
          PlayerState.audio.addEventListener('canplaythrough', onAudioReady, { once: true });
        }
      } else {
        // Desktop just loads both concurrently
        PlayerState.video.src = track.videoSrc;
        PlayerState.video.load();
      }
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
          // Add a slight delay for mobile devices to ensure resources are loaded
          setTimeout(() => {
            attemptPlaybackWithRetry();
          }, PlayerState.isMobileDevice ? loadTimeout : 0);
        }
      }
    } else {
      PlayerState.setActiveMediaElement(PlayerState.audio);
      enforceProperMuting();
      
      // Now attempt playback if requested
      if (autoPlay) {
        // Add a slight delay for mobile devices to ensure resources are loaded
        setTimeout(() => {
          attemptPlaybackWithRetry();
        }, PlayerState.isMobileDevice ? loadTimeout : 0);
      }
    }
    
    // Dispatch event for other components to react
    document.dispatchEvent(new CustomEvent('current-track-changed', { 
      detail: { 
        track,
        index,
        previousIndex: previousTrackIndex
      } 
    }));
    
    // Hide loading message after a delay if not autoplay
    if (!autoPlay) {
      setTimeout(() => {
        if (PlayerState.elements.message && 
            PlayerState.elements.message.textContent === `Loading "${track.title}"...`) {
          PlayerState.elements.message.style.display = "none";
        }
        removeLoadingIndicators();
      }, loadTimeout);
    }
    
    return true;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'loadTrack' });
    return false;
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