import html2canvas from 'html2canvas';

class ScreenshotService {
  constructor() {
    this.screenshots = new Map();
    this.isCapturing = false;
  }

  // Capture viewport screenshot on page load
  async captureViewportOnLoad(url = window.location.pathname) {
    console.log('📸 Attempting to capture screenshot for URL:', url);
    console.log('🗂️ Current screenshots stored:', Array.from(this.screenshots.keys()));
    
    // Only capture if we haven't captured this URL before
    if (this.screenshots.has(url) || this.isCapturing) {
      console.log('⚠️ Screenshot already exists or currently capturing, skipping');
      return this.screenshots.get(url);
    }

    console.log('✅ Proceeding with screenshot capture for:', url);
    this.isCapturing = true;

    try {
      // Wait for page to be fully loaded
      await this.waitForPageLoad();

      // Hide any overlays or elements that shouldn't be in the screenshot
      const elementsToHide = this.hideElementsForScreenshot();

      // Capture full page height
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const fullPageHeight = Math.max(
        document.body.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.clientHeight,
        document.documentElement.scrollHeight,
        document.documentElement.offsetHeight
      );
      
      console.log('📏 Page dimensions:', {
        viewport: { width: viewportWidth, height: viewportHeight },
        fullPage: { height: fullPageHeight }
      });
      
      const screenshot = await html2canvas(document.body, {
        height: fullPageHeight,
        width: viewportWidth,
        x: 0,
        y: 0,
        useCORS: true,
        allowTaint: true,
        scale: 1,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (element) => {
          // Ignore heatmap overlays and tracking elements
          return element.classList?.contains('heatmap-container') ||
                 element.classList?.contains('heatmap-canvas') ||
                 element.getAttribute('data-ignore-screenshot') === 'true';
        }
      });

      // Restore hidden elements
      this.restoreElementsAfterScreenshot(elementsToHide);

      const screenshotData = {
        dataUrl: screenshot.toDataURL('image/png', 0.8), // Slightly compress
        width: screenshot.width,
        height: screenshot.height,
        viewportWidth: viewportWidth,
        viewportHeight: viewportHeight,
        fullPageHeight: fullPageHeight,
        url: url,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY
        }
      };

      // Store screenshot
      this.screenshots.set(url, screenshotData);
      console.log('💾 Screenshot stored in memory for URL:', url);

      // Store in localStorage for persistence
      this.saveToStorage(url, screenshotData);
      console.log('💾 Screenshot saved to localStorage for URL:', url);

      return screenshotData;
    } catch (error) {
      console.error('Failed to capture viewport screenshot:', error);
      return null;
    } finally {
      this.isCapturing = false;
    }
  }

  // Hide elements that shouldn't appear in screenshots
  hideElementsForScreenshot() {
    const hiddenElements = [];
    
    // Hide common overlay elements
    const selectors = [
      '.heatmap-overlay',
      '.heatmap-container',
      '[data-heatmap]',
      '.tooltip',
      '.modal',
      '.popup',
      '.notification'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.style.display !== 'none') {
          hiddenElements.push({
            element: el,
            originalDisplay: el.style.display
          });
          el.style.display = 'none';
        }
      });
    });

    return hiddenElements;
  }

  // Restore elements after screenshot
  restoreElementsAfterScreenshot(hiddenElements) {
    hiddenElements.forEach(({ element, originalDisplay }) => {
      element.style.display = originalDisplay;
    });
  }

  // Wait for page to be fully loaded
  waitForPageLoad() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        // Add small delay for any remaining renders
        setTimeout(resolve, 500);
      } else {
        window.addEventListener('load', () => {
          setTimeout(resolve, 500);
        });
      }
    });
  }

  // Get stored screenshot for a URL
  getScreenshot(url = window.location.pathname) {
    // Try memory first
    if (this.screenshots.has(url)) {
      return this.screenshots.get(url);
    }

    // Try localStorage
    const stored = this.loadFromStorage(url);
    if (stored) {
      this.screenshots.set(url, stored);
      return stored;
    }

    return null;
  }

  // Save screenshot to localStorage
  saveToStorage(url, screenshotData) {
    try {
      const key = `viewport_screenshot_${url}`;
      const dataToStore = {
        ...screenshotData,
        // Don't store the full dataUrl in localStorage due to size limits
        hasScreenshot: true
      };
      localStorage.setItem(key, JSON.stringify(dataToStore));
      
      // Store the actual image data separately with compression
      const imageKey = `viewport_image_${url}`;
      localStorage.setItem(imageKey, screenshotData.dataUrl);
    } catch (error) {
      console.warn('Failed to save screenshot to storage:', error);
    }
  }

  // Load screenshot from localStorage
  loadFromStorage(url) {
    try {
      const key = `viewport_screenshot_${url}`;
      const imageKey = `viewport_image_${url}`;
      
      const data = localStorage.getItem(key);
      const imageData = localStorage.getItem(imageKey);
      
      if (data && imageData) {
        const screenshotData = JSON.parse(data);
        screenshotData.dataUrl = imageData;
        return screenshotData;
      }
    } catch (error) {
      console.warn('Failed to load screenshot from storage:', error);
    }
    return null;
  }

  // Remove screenshot from storage
  removeScreenshot(url) {
    this.screenshots.delete(url);
    try {
      localStorage.removeItem(`viewport_screenshot_${url}`);
      localStorage.removeItem(`viewport_image_${url}`);
    } catch (error) {
      console.warn('Failed to remove screenshot from storage:', error);
    }
  }

  // Get all stored screenshots
  getAllScreenshots() {
    const screenshots = [];
    try {
      console.log('📂 Loading all screenshots from localStorage...');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('viewport_screenshot_')) {
          const url = key.replace('viewport_screenshot_', '');
          console.log('🔍 Found screenshot key for URL:', url);
          const screenshot = this.getScreenshot(url);
          if (screenshot) {
            screenshots.push(screenshot);
            console.log('✅ Loaded screenshot for URL:', url);
          }
        }
      }
      console.log('📊 Total screenshots loaded:', screenshots.length);
    } catch (error) {
      console.warn('Failed to load all screenshots:', error);
    }
    return screenshots;
  }

  // Clear all screenshots
  clearAllScreenshots() {
    this.screenshots.clear();
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('viewport_screenshot_') || key.startsWith('viewport_image_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear all screenshots:', error);
    }
  }
}

export default new ScreenshotService();