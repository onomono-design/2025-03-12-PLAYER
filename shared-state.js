/**
 * Shared State Module
 * Maintains state that needs to be accessed across multiple modules
 */

// Player state object
export const PlayerState = {
  // Media elements
  audio: null,
  video: null,
  activeMediaElement: null,
  
  // Playback state
  isPlaying: false,
  isSeeking: false,
  isFirstPlay: true,
  wasPlayingBeforeHidden: false, // Tracks if media was playing before page was hidden
  
  // Mode state
  isXRMode: false,
  isAudioPreloaded: false,
  isVideoPreloaded: false,
  
  // Device state
  isMobileDevice: false,
  isIOS: false,
  experienceStarted: false, // Tracks if the start experience has been completed
  
  // Playlist state
  playlist: [],
  playlistGroups: {},
  currentTrackIndex: -1,
  currentPlaylistView: "folders",
  
  // UI elements (to be populated after DOM is loaded)
  elements: {
    message: null,
    playPauseBtn: null,
    muteBtn: null,
    scrubber: null,
    scrubberProgress: null,
    currentTimeDisplay: null,
    durationDisplay: null,
    playerControls: null,
    playlistContainer: null,
    playlistTracks: null,
    playlistOverlay: null,
    audioPlayerContainer: null,
    videoPlayerContainer: null,
    albumArt: null,
    audioTitle: null,
    audioArtist: null,
    viewXRBtn: null,
    exitXRBtn: null,
    sceneName: null,
    playlistName: null,
    recenterCameraBtn: null
  },
  
  // Methods to update state
  setActiveMediaElement(element) {
    this.activeMediaElement = element;
    // Dispatch event for other modules to react
    document.dispatchEvent(new CustomEvent('active-media-changed', { 
      detail: { element } 
    }));
  },
  
  setPlaybackState(isPlaying) {
    this.isPlaying = isPlaying;
    // Dispatch event for other modules to react
    document.dispatchEvent(new CustomEvent('playback-state-changed', { 
      detail: { isPlaying } 
    }));
  },
  
  setXRMode(isXRMode) {
    this.isXRMode = isXRMode;
    // Dispatch event for other modules to react
    document.dispatchEvent(new CustomEvent('xr-mode-changed', { 
      detail: { isXRMode } 
    }));
  },
  
  setCurrentTrack(index) {
    this.currentTrackIndex = index;
    // Dispatch event for other modules to react
    document.dispatchEvent(new CustomEvent('current-track-changed', { 
      detail: { 
        index,
        track: this.playlist[index] || null
      } 
    }));
  },
  
  setPlaylist(playlist) {
    this.playlist = playlist;
    // Dispatch event for other modules to react
    document.dispatchEvent(new CustomEvent('playlist-updated', { 
      detail: { playlist } 
    }));
  },
  
  setCurrentPlaylistView(view) {
    this.currentPlaylistView = view;
    // Dispatch event for other modules to react
    document.dispatchEvent(new CustomEvent('playlist-view-changed', { 
      detail: { view } 
    }));
  },
  
  // Initialize UI element references
  initializeElements() {
    // Get references to all UI elements
    this.elements.message = document.getElementById('message');
    this.elements.playPauseBtn = document.getElementById('playPauseBtn');
    this.elements.muteBtn = document.getElementById('muteBtn');
    this.elements.scrubber = document.getElementById('scrubber');
    this.elements.scrubberProgress = document.getElementById('scrubberProgress');
    this.elements.currentTimeDisplay = document.getElementById('currentTime');
    this.elements.durationDisplay = document.getElementById('duration');
    this.elements.playerControls = document.getElementById('playerControls');
    this.elements.playlistContainer = document.getElementById('playlistContainer');
    this.elements.playlistTracks = document.getElementById('playlistTracks');
    this.elements.playlistOverlay = document.getElementById('playlistOverlay');
    this.elements.audioPlayerContainer = document.getElementById('audioPlayerContainer');
    this.elements.videoPlayerContainer = document.getElementById('videoPlayerContainer');
    this.elements.albumArt = document.getElementById('albumArt');
    this.elements.audioTitle = document.getElementById('audioTitle');
    this.elements.audioArtist = document.getElementById('audioArtist');
    this.elements.viewXRBtn = document.getElementById('viewXRBtn');
    this.elements.exitXRBtn = document.getElementById('exitXRBtn');
    this.elements.sceneName = document.getElementById('sceneName');
    this.elements.playlistName = document.getElementById('playlistName');
    this.elements.recenterCameraBtn = document.getElementById('recenterCameraBtn');
    
    // Initialize media elements
    this.audio = document.getElementById('audioElement');
    this.video = document.getElementById('video360');
    
    // Set active media element to audio by default
    this.activeMediaElement = this.audio;
  }
}; 