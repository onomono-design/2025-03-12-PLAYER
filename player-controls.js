/**
 * 360° Video Player Controls
 * This script handles all the functionality for the 360° video player including:
 * - Video playback controls (play/pause, rewind, fast forward)
 * - Scrubber functionality with progress indication
 * - Volume controls
 * - Camera reset for 360° view
 * - Touch support for mobile devices
 * - Mobile device motion permission handling
 * - Preloading of video assets
 * - Scene and playlist information display
 * - Keyboard shortcuts (spacebar for play/pause)
 */

document.addEventListener('DOMContentLoaded', function () {
  // Get DOM elements
  const video = document.getElementById('video360');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const rewindBtn = document.getElementById('rewindBtn');
  const forwardBtn = document.getElementById('forwardBtn');
  const muteBtn = document.getElementById('muteBtn');
  const resetCameraBtn = document.getElementById('resetCameraBtn');
  const message = document.getElementById('message');
  const scrubber = document.getElementById('scrubber');
  const scrubberProgress = document.getElementById('scrubberProgress');
  const currentTimeDisplay = document.getElementById('currentTime');
  const durationDisplay = document.getElementById('duration');
  const cameraEntity = document.getElementById('cameraEntity');
  const permissionOverlay = document.getElementById('permissionOverlay');
  const enableMotionBtn = document.getElementById('enableMotion');
  const videosphere = document.getElementById('videosphere');
  const sceneNameElement = document.getElementById('sceneName');
  const playlistNameElement = document.getElementById('playlistName');
  
  let isScrubbing = false;
  let isVideoPreloaded = false;
  let isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  let isFirstPlay = true; // Track if this is the first time the user presses play
  let isInputFocused = false; // Track if an input element is focused

  // ===== SCENE AND PLAYLIST INFORMATION =====
  
  // Set scene and playlist information
  // This could be dynamically loaded from a database or configuration file
  function updateVideoInfo(sceneName, playlistName) {
    if (sceneNameElement && sceneName) {
      sceneNameElement.textContent = sceneName;
    }
    
    if (playlistNameElement && playlistName) {
      playlistNameElement.textContent = playlistName;
    }
  }
  
  // Example: Update with video information
  // In a real application, this would be pulled from metadata or a database
  updateVideoInfo("Japantown", "San Francisco 360°");
  
  // You could also extract this from the video filename or path
  function extractSceneInfoFromVideoPath() {
    const videoSrc = video.querySelector('source').src;
    const filename = videoSrc.split('/').pop();
    
    // Example: Extract scene name from filename (e.g., "2025-03-08-JAPANTOWN-XR1-LOW.mp4")
    if (filename) {
      const parts = filename.split('-');
      if (parts.length >= 4) {
        // Extract the scene name (e.g., "JAPANTOWN")
        const sceneName = parts[3].charAt(0) + parts[3].slice(1).toLowerCase();
        updateVideoInfo(sceneName, "San Francisco 360°");
      }
    }
  }
  
  // Uncomment to use automatic extraction from filename
  // extractSceneInfoFromVideoPath();

  // ===== PRELOADING AND INITIALIZATION =====
  
  // Start preloading the video immediately
  preloadVideo();
  
  // Check if we need to request device motion permission (for mobile)
  if (isMobileDevice) {
    checkDeviceMotionPermission();
  }
  
  /**
   * Preload the video to ensure it's ready when the user presses play
   */
  function preloadVideo() {
    message.textContent = "Preloading video...";
    
    // Create a temporary video element to preload the video
    const tempVideo = document.createElement('video');
    tempVideo.src = video.querySelector('source').src;
    tempVideo.muted = true;
    tempVideo.preload = 'auto';
    tempVideo.crossOrigin = 'anonymous';
    
    // Listen for enough data to be loaded
    tempVideo.addEventListener('canplaythrough', function() {
      isVideoPreloaded = true;
      message.textContent = "Video preloaded. Click play to start.";
      setTimeout(() => {
        if (message.textContent === "Video preloaded. Click play to start.") {
          message.style.display = "none";
        }
      }, 3000);
      
      // Clean up the temporary video element
      tempVideo.src = '';
      tempVideo.load();
    });
    
    // Handle preload errors
    tempVideo.addEventListener('error', function(e) {
      console.error('Video preload error:', e);
      message.textContent = "Error preloading video. Click play to try again.";
    });
    
    // Start loading
    tempVideo.load();
  }
  
  /**
   * Check and request device motion permission on mobile devices
   */
  function checkDeviceMotionPermission() {
    // Check if DeviceMotionEvent is available and requires permission
    if (typeof DeviceMotionEvent !== 'undefined' && 
        typeof DeviceMotionEvent.requestPermission === 'function') {
      
      // Show the permission overlay
      permissionOverlay.style.display = 'flex';
      
      // Add click handler for the enable button
      enableMotionBtn.addEventListener('click', function() {
        DeviceMotionEvent.requestPermission()
          .then(response => {
            if (response === 'granted') {
              // Permission granted, hide overlay
              permissionOverlay.style.display = 'none';
              message.textContent = "Motion controls enabled. Use your phone to look around.";
              setTimeout(() => message.style.display = "none", 3000);
            } else {
              // Permission denied
              permissionOverlay.style.display = 'none';
              message.textContent = "Motion controls denied. Use touch to look around.";
              setTimeout(() => message.style.display = "none", 3000);
            }
          })
          .catch(error => {
            console.error('Error requesting device motion permission:', error);
            permissionOverlay.style.display = 'none';
            message.textContent = "Error enabling motion controls.";
            setTimeout(() => message.style.display = "none", 3000);
          });
      });
    } else {
      // Device motion doesn't require permission or isn't available
      console.log('Device motion permission not required or not available');
    }
  }

  // ===== VIDEO EVENT HANDLERS =====
  
  // Error handling
  video.addEventListener('error', (e) => {
    console.error('Video Error:', e);
    message.textContent = "Error loading video";
    message.style.display = "block";
  });

  // Metadata loaded handler
  video.addEventListener('loadedmetadata', () => {
    console.log('Video metadata loaded');
    
    // Set max value of scrubber to video duration in seconds
    scrubber.max = Math.floor(video.duration);
    
    // Format and display duration
    durationDisplay.textContent = formatTime(video.duration);
    
    // Initialize progress bar to 0
    updateProgressBar(0);
    
    if (!isVideoPreloaded) {
      message.textContent = "Video ready. Click play to start.";
    }
  });

  // Video data loaded handler
  video.addEventListener('loadeddata', () => {
    console.log('Video data loaded');
    
    // Ensure the videosphere is visible and ready
    videosphere.setAttribute('visible', 'true');
    
    if (isMobileDevice) {
      message.textContent = "360° Video Loaded. Use your phone to look around.";
    } else {
      message.textContent = "360° Video Loaded. Use your mouse to look around.";
    }
    
    setTimeout(() => message.style.display = "none", 3000);
  });
  
  // Update time display and scrubber position during playback
  video.addEventListener('timeupdate', () => {
    if (!isScrubbing) {
      const currentTime = Math.floor(video.currentTime);
      const duration = Math.floor(video.duration) || 1;
      const progressPercentage = (currentTime / duration) * 100;
      
      scrubber.value = currentTime;
      currentTimeDisplay.textContent = formatTime(currentTime);
      
      // Update progress bar width
      updateProgressBar(progressPercentage);
    }
  });

  // ===== BUTTON CLICK HANDLERS =====
  
  // Set initial button state to match video
  if (video.muted) {
    muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
    muteBtn.classList.add('muted');
  } else {
    muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
    muteBtn.classList.remove('muted');
  }

  /**
   * Toggle play/pause state of the video
   */
  function togglePlayPause() {
    if (video.paused) {
      // Show loading message if video isn't preloaded yet
      if (!isVideoPreloaded) {
        message.textContent = "Loading video...";
        message.style.display = "block";
      }
      
      // If this is the first time playing, unmute the video
      if (isFirstPlay) {
        video.muted = false;
        muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        muteBtn.classList.remove('muted');
        isFirstPlay = false;
      }
      
      // Play the video
      video.play()
        .then(() => {
          playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
          if (message.textContent === "Loading video...") {
            message.style.display = "none";
          }
        })
        .catch(error => {
          console.error('Error playing video:', error);
          message.textContent = "Error playing video. Please try again.";
        });
    } else {
      video.pause();
      playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
  }

  // Play/Pause button handler
  playPauseBtn.addEventListener('click', togglePlayPause);

  // Rewind button handler
  rewindBtn.addEventListener('click', function () {
    video.currentTime = Math.max(0, video.currentTime - 10); // Rewind 10 seconds
  });
  
  // Fast forward button handler
  forwardBtn.addEventListener('click', function () {
    video.currentTime = Math.min(video.duration, video.currentTime + 10); // Forward 10 seconds
  });

  // Mute button handler
  muteBtn.addEventListener('click', function() {
    if (video.muted) {
      video.muted = false;
      muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
      muteBtn.classList.remove('muted');
    } else {
      video.muted = true;
      muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
      muteBtn.classList.add('muted');
    }
  });
  
  // Reset camera orientation
  resetCameraBtn.addEventListener('click', function() {
    // Wait for A-Frame to be fully initialized
    if (cameraEntity && cameraEntity.components && cameraEntity.components['look-controls']) {
      // Reset the camera rotation
      cameraEntity.setAttribute('rotation', '0 0 0');
      
      // Reset the look-controls component's state
      const lookControls = cameraEntity.components['look-controls'];
      if (lookControls) {
        lookControls.pitchObject.rotation.x = 0;
        lookControls.yawObject.rotation.y = 0;
      }
      
      // Show a brief message
      message.textContent = "Camera view reset";
      message.style.display = "block";
      setTimeout(() => message.style.display = "none", 1500);
    }
  });
  
  // ===== KEYBOARD CONTROLS =====
  
  // Track when an input element is focused to prevent spacebar triggering play/pause
  document.addEventListener('focusin', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      isInputFocused = true;
    }
  });
  
  document.addEventListener('focusout', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      isInputFocused = false;
    }
  });
  
  // Add keyboard event listener for spacebar to toggle play/pause
  if (!isMobileDevice) {
    document.addEventListener('keydown', function(e) {
      // Check if spacebar was pressed and no input element is focused
      if (e.code === 'Space' && !isInputFocused) {
        e.preventDefault(); // Prevent page scrolling
        togglePlayPause();
      }
    });
  }
  
  // ===== SCRUBBER FUNCTIONALITY =====
  
  // Mouse events for scrubber
  scrubber.addEventListener('mousedown', () => {
    isScrubbing = true;
  });
  
  scrubber.addEventListener('mouseup', () => {
    isScrubbing = false;
    video.currentTime = scrubber.value;
    const percentage = (scrubber.value / scrubber.max) * 100;
    updateProgressBar(percentage);
  });
  
  scrubber.addEventListener('input', () => {
    currentTimeDisplay.textContent = formatTime(scrubber.value);
    const percentage = (scrubber.value / scrubber.max) * 100;
    updateProgressBar(percentage);
  });
  
  // Touch support for mobile
  scrubber.addEventListener('touchstart', () => {
    isScrubbing = true;
  });
  
  scrubber.addEventListener('touchend', () => {
    isScrubbing = false;
    video.currentTime = scrubber.value;
    const percentage = (scrubber.value / scrubber.max) * 100;
    updateProgressBar(percentage);
  });
  
  // ===== HELPER FUNCTIONS =====
  
  /**
   * Updates the progress bar width based on the current playback position
   * @param {number} percentage - The percentage of the video that has been played
   */
  function updateProgressBar(percentage) {
    scrubberProgress.style.width = `${percentage}%`;
  }
  
  /**
   * Formats seconds into MM:SS format
   * @param {number} seconds - The time in seconds to format
   * @return {string} The formatted time string
   */
  function formatTime(seconds) {
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}); 