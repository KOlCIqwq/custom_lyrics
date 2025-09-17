import {
  originalPageState,
  lyricsPageActive,
  isDragging,
  startX,
  startY,
  memorizedSelectedText,
  currentHighlightedLine,
  highlightInterval,
  setOriginalPageState,
  setLyricsPageActive,
  setIsDragging,
  setStartX,
  setStartY,
  setMemorizedSelectedText,
  setCurrentHighlightedLine,
  setHighlightInterval,
  setCurrentLyrics,
} from '../state/lyricsState';
import { fetchAndDisplayLyrics } from '../utils/lyricsFetcher';

// Create lyrics page with proper cleanup
export function showLyricsPage() {
  // If already showing, don't recreate
  if (lyricsPageActive) {
    return;
  }

  // Find the main content area more carefully
  const mainView =
    document.querySelector('.main-view-container__scroll-node-child') ||
    document.querySelector('.main-view-container__scroll-node') ||
    document.querySelector('.Root__main-view > div') ||
    document.querySelector('.Root__main-view');

  if (!mainView) {
    return;
  }

  // Store original display state instead of innerHTML
  const children = Array.from(mainView.children);
  setOriginalPageState({
    children: children,
    parent: mainView,
  });

  // Hide original content instead of removing it
  children.forEach((child) => {
    (child as HTMLElement).style.display = 'none';
  });

  // Create lyrics container
  const lyricsContainer = document.createElement('div');
  lyricsContainer.id = 'custom-lyrics-page';
  lyricsContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    background: var(--background-base, #121212);
    color: var(--text-base, #ffffff);
    z-index: 1000; /* High z-index to cover everything */
    overflow-y: auto; /* Make the container itself scrollable */
    user-select: text; /* Allow text selection */
    tabindex="0"; /* Make the container focusable */
  `;

  // Create the lyrics page content
  const lyricsHTML = `
    <!-- Header with proper styling -->
     <div style="
      padding: 16px 32px;
      display: flex;
      align-items: center; /* Vertically align all items */
      position: sticky;
      top: 0;
      z-index: 10;
      background: var(--background-base, #121212);
      border-bottom: 1px solid rgba(255,255,255,0.1);
    ">
      <!-- Left side: Back button -->
      <button id="lyrics-back-button" style="
        background: transparent;
        border: none;
        color: var(--text-base, #ffffff);
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        width: 32px; /* FIX: Corrected width for proper button shape */
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        flex-shrink: 0; /* Prevent the button from shrinking */
      ">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.03.47a.75.75 0 0 1 0 1.06L4.56 8l6.47 6.47a.75.75 0 1 1-1.06 1.06L2.44 8 9.97.47a.75.75 0 0 1 1.06 0z"/>
        </svg>
      </button>

      <!-- Middle Spacer-->
      <div style="flex-grow: 1;"></div>

      <!-- Right side: Title and track info stacked vertically -->
      <div style="text-align: right;">
        <h1 style="margin: 0; font-size: 24px; font-weight: 700;">Lyrics</h1>
        <p id="track-info-header" style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.7;">Loading...</p>
      </div>
      <!-- Copy Button -->
      <button id="lyrics-copy-button" style="
        background:transparent;
        border: none;
        color: var(--text-base, #ffffff);
        cursor: pointer;
        padding: 6px;
        margin-top: 35px;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        flex-shrink: 0;
        margin-left: 16px; /* Space from title */
      ">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
          <path d="M9.5 1a.5.5 0 0 1 .5.5V3H6V1.5a.5.5 0 0 1 .5-.5h3zM6 2h4v-.5H6.5a.5.5 0 0 1-.5.5zm3 3.5V7H6V5.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5z"/>
        </svg>
      </button>
    </div>

    <!-- Main content area -->
    <div style="padding: 32px; max-width: 800px; margin: 0 auto;">
      <div id="lyrics-loading" style="text-align: center; padding: 64px 0;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎵</div>
        <p>Loading lyrics...</p>
      </div>

      <div id="lyrics-content" style="display: none;">
      </div>

      <div id="lyrics-error" style="display: none; text-align: center; padding: 64px 0;">
        <div style="font-size: 48px; margin-bottom: 16px;">😔</div>
        <p>No lyrics found for this track</p>
        <p id="error-details" style="opacity: 0.7; font-size: 14px; margin-top: 8px;"></p>
      </div>
    </div>
  `;

  lyricsContainer.innerHTML = lyricsHTML;
  mainView.appendChild(lyricsContainer);
  setLyricsPageActive(true);
  lyricsContainer.focus(); // Focus the container to enable keyboard events

  lyricsContainer.addEventListener('mousedown', (e) => {
    setStartX(e.clientX);
    setStartY(e.clientY);
    setIsDragging(false);
    //Spicetify.showNotification(`mousedown: isDragging=${isDragging}`, false);
  });

  lyricsContainer.addEventListener('mousemove', (e) => {
    if (e.buttons === 1) {
      // Left mouse button is pressed
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      // If mouse moves more than a few pixels, consider it a drag
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        if (!isDragging) {
          // Only notify once when dragging starts
          setIsDragging(true);
          //Spicetify.showNotification(`mousemove: isDragging=${isDragging}`, false);
        }
      }
    }
  });

  lyricsContainer.addEventListener('mouseup', () => {
    //Spicetify.showNotification(`mouseup: isDragging=${isDragging}`, false);
    if (isDragging) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        setMemorizedSelectedText(selection.toString());
        //Spicetify.showNotification(`Memorized selected text: "${memorizedSelectedText.substring(0, 20)}..."`, false);
      } else {
        setMemorizedSelectedText(null);
      }
    }
    setIsDragging(false);
  });

  // Allow copying text and context menu
  // Not working? Seems like the hot keys are being blocked
  lyricsContainer.addEventListener('copy', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up and being cancelled
  });
  lyricsContainer.addEventListener('contextmenu', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up and being cancelled
  });

  // Handle Ctrl+C for copying selected text
  lyricsContainer.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'c') {
      const selectedText = window.getSelection()?.toString();
      if (selectedText) {
        // Use document.execCommand('copy') directly for Ctrl+C
        // This might be more reliable in some webview environments
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            Spicetify.showNotification('Lyrics copied to clipboard!', false);
          } else {
            Spicetify.showNotification('Failed to copy lyrics.', true);
          }
        } catch (err) {
          Spicetify.showNotification('Failed to copy lyrics.', true);
        }
      } else {
        Spicetify.showNotification('No text selected to copy.', true);
      }
      e.stopPropagation(); // Prevent event from bubbling up and being cancelled
      e.preventDefault(); // Prevent default Ctrl+C behavior
    }
  });

  // Add back button functionality with proper cleanup
  const backButton = document.getElementById('lyrics-back-button');
  if (backButton) {
    backButton.addEventListener('click', closeLyricsPage);

    // Add hover effect
    backButton.addEventListener('mouseenter', () => {
      backButton.style.backgroundColor = 'rgba(255,255,255,0.1)';
    });
    backButton.addEventListener('mouseleave', () => {
      backButton.style.backgroundColor = 'transparent';
    });
  }

  // Add copy button
  const copyButton = document.getElementById('lyrics-copy-button');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      // Ensure the lyrics container is focused before attempting to get selection
      lyricsContainer.focus();
      const selection = window.getSelection();
      let textToCopy = '';

      if (memorizedSelectedText) {
        textToCopy = memorizedSelectedText;
        //Spicetify.showNotification(`Copying memorized text: "${textToCopy.substring(0, 20)}..."`, false);
      } else if (selection && selection.toString().length > 0) {
        // If text is selected, copy the selected text
        textToCopy = selection.toString();
        // Spicetify.showNotification(`Copying current selection: "${textToCopy.substring(0, 20)}..."`, false);
      } else {
        // If no text is selected, copy all visible lyrics
        const lyricsContentEl = document.getElementById('lyrics-content');
        if (lyricsContentEl) {
          textToCopy = lyricsContentEl.innerText;
          //Spicetify.showNotification(`Copying all lyrics.`, false);
        }
      }

      if (textToCopy) {
        // Create a temporary textarea to copy the text
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = textToCopy;
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            Spicetify.showNotification('Lyrics copied to clipboard!', false);
          } else {
            Spicetify.showNotification('Failed to copy lyrics.', true);
          }
        } catch (err) {
          Spicetify.showNotification('Failed to copy lyrics.', true);
        } finally {
          document.body.removeChild(tempTextArea);
        }
      } else {
        Spicetify.showNotification('No lyrics to copy.', true);
      }
    });

    // Add hover effect for copy button
    copyButton.addEventListener('mouseenter', () => {
      copyButton.style.backgroundColor = 'rgba(255,255,255,0.1)';
    });
    copyButton.addEventListener('mouseleave', () => {
      copyButton.style.backgroundColor = 'transparent';
    });
  }

  // Fetch and display lyrics
  fetchAndDisplayLyrics();
}

// Properly close the lyrics page
export function closeLyricsPage() {
  if (!lyricsPageActive || !originalPageState) {
    return;
  }

  // Clear the highlighting interval and memorized text
  if (highlightInterval) {
    clearInterval(highlightInterval);
    setHighlightInterval(null);
  }
  setCurrentHighlightedLine(null);
  setMemorizedSelectedText(null); // Clear memorized text on page close

  // Remove lyrics container
  const lyricsContainer = document.getElementById('custom-lyrics-page');
  if (lyricsContainer) {
    lyricsContainer.remove();
  }
  // Remove the custom style element
  const styleEl = document.getElementById('custom-lyrics-style');
  if (styleEl) {
    styleEl.remove();
  }

  // Restore original content visibility
  if (originalPageState && originalPageState.children) {
    originalPageState.children.forEach((child: Element) => {
      (child as HTMLElement).style.display = '';
    });
  }

  setLyricsPageActive(false);
  setOriginalPageState(null);
}
