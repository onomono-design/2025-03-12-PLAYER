/**
 * CSS Utilities Module
 * Provides functions for managing and updating CSS styles
 */

import { ErrorLogger } from '../error-logger.js';

/**
 * Generate a CSS variable definition string from an object
 * @param {Object} variables - Object of variable names and values
 * @returns {string} CSS variable definitions
 */
export function generateCSSVariables(variables) {
  try {
    if (!variables || typeof variables !== 'object') {
      return '';
    }
    
    let cssVarText = '';
    
    for (const [name, value] of Object.entries(variables)) {
      // Ensure variable names have -- prefix
      const varName = name.startsWith('--') ? name : `--${name}`;
      cssVarText += `${varName}: ${value};\n`;
    }
    
    return cssVarText;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'generateCSSVariables' });
    return '';
  }
}

/**
 * Apply CSS variables to an element
 * @param {HTMLElement} element - The element to apply variables to
 * @param {Object} variables - Object of variable names and values
 */
export function applyCSSVariables(element, variables) {
  try {
    if (!element || !variables) return;
    
    for (const [name, value] of Object.entries(variables)) {
      // Ensure variable names have -- prefix
      const varName = name.startsWith('--') ? name : `--${name}`;
      element.style.setProperty(varName, value);
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'applyCSSVariables' });
  }
}

/**
 * Apply a set of styles to an element
 * @param {HTMLElement} element - The element to apply styles to
 * @param {Object} styles - Object of style properties and values
 */
export function applyStyles(element, styles) {
  try {
    if (!element || !styles) return;
    
    for (const [property, value] of Object.entries(styles)) {
      element.style[property] = value;
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'applyStyles' });
  }
}

/**
 * Create or update a style element with the given CSS
 * @param {string} id - ID for the style element
 * @param {string} css - CSS content
 */
export function updateStyleElement(id, css) {
  try {
    // Look for existing style element with this ID
    let styleElement = document.getElementById(id);
    
    // If it doesn't exist, create it
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = id;
      document.head.appendChild(styleElement);
    }
    
    // Update the CSS content
    styleElement.textContent = css;
    
    return styleElement;
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'updateStyleElement' });
    return null;
  }
}

/**
 * Add CSS classes to an element
 * @param {HTMLElement} element - The element to add classes to
 * @param {string|Array<string>} classNames - Class name(s) to add
 */
export function addClasses(element, classNames) {
  try {
    if (!element) return;
    
    if (Array.isArray(classNames)) {
      element.classList.add(...classNames);
    } else if (typeof classNames === 'string') {
      element.classList.add(classNames);
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'addClasses' });
  }
}

/**
 * Remove CSS classes from an element
 * @param {HTMLElement} element - The element to remove classes from
 * @param {string|Array<string>} classNames - Class name(s) to remove
 */
export function removeClasses(element, classNames) {
  try {
    if (!element) return;
    
    if (Array.isArray(classNames)) {
      element.classList.remove(...classNames);
    } else if (typeof classNames === 'string') {
      element.classList.remove(classNames);
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'removeClasses' });
  }
}

/**
 * Toggle CSS classes on an element
 * @param {HTMLElement} element - The element to toggle classes on
 * @param {string|Array<string>} classNames - Class name(s) to toggle
 * @param {boolean} force - Optional force state
 */
export function toggleClasses(element, classNames, force) {
  try {
    if (!element) return;
    
    if (Array.isArray(classNames)) {
      classNames.forEach(className => {
        element.classList.toggle(className, force);
      });
    } else if (typeof classNames === 'string') {
      element.classList.toggle(classNames, force);
    }
  } catch (error) {
    ErrorLogger.handleError(error, { function: 'toggleClasses' });
  }
} 