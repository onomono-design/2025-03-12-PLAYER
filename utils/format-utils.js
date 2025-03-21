/**
 * Format Utilities Module
 * Provides utility functions for formatting data
 */

/**
 * Format time in seconds to MM:SS format
 * @param {number} timeInSeconds - Time in seconds
 * @returns {string} Formatted time string in MM:SS format
 */
export function formatTime(timeInSeconds) {
  if (isNaN(timeInSeconds) || timeInSeconds < 0) {
    return "0:00";
  }
  
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Parse a time string (MM:SS or MM:SS:FF) into seconds
 * @param {string} timeString - Time string in MM:SS or MM:SS:FF format
 * @returns {number} Time in seconds
 */
export function parseTimeString(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return 0;
  }
  
  // Remove any non-numeric characters except colons
  timeString = timeString.replace(/[^0-9:]/g, '');
  
  const parts = timeString.split(':');
  
  if (parts.length === 2) {
    // MM:SS format
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return (minutes * 60) + seconds;
  } else if (parts.length === 3) {
    // MM:SS:FF format (frames)
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return (minutes * 60) + seconds;
  } else if (parts.length === 1) {
    // SS format
    return parseInt(parts[0], 10) || 0;
  }
  
  return 0;
}

/**
 * Estimate duration for tracks when exact duration isn't available
 * @param {Object} track - Track object
 * @returns {string} Formatted duration string
 */
export function estimateDuration(track) {
  if (!track) return "0:00";
  
  // If track has a numerical duration, use that
  if (track.duration && !isNaN(parseFloat(track.duration))) {
    return formatTime(parseFloat(track.duration));
  }
  
  // If track has a duration string, parse it
  if (track.duration && typeof track.duration === 'string') {
    // Try to parse the duration string
    if (track.duration.includes(':')) {
      return track.duration; // Already in MM:SS format
    }
    
    // Try to parse as seconds
    const durationSeconds = parseFloat(track.duration);
    if (!isNaN(durationSeconds)) {
      return formatTime(durationSeconds);
    }
  }
  
  // Use chapter number to create consistent durations 
  // This ensures the same track always shows the same duration
  const chapterSeed = track.chapter || 1;
  
  // Base duration on chapter number (between 2 and 5 minutes)
  const minutes = 2 + (chapterSeed % 4);
  
  // Use chapter number to determine seconds (0-59)
  const seconds = (chapterSeed * 17) % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Truncate text with ellipsis if it exceeds max length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 30) {
  if (!text || typeof text !== 'string') return '';
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Generate a unique ID for elements
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
export function generateUniqueId(prefix = 'element') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
} 