// Store references to avoid UI corruption
let originalPageState: { children: Element[]; parent: Element } | null = null;
let lyricsPageActive = false;

// Create lyrics page with proper cleanup
function showLyricsPage() {
  // If already showing, don't recreate
  if (lyricsPageActive) {
    return;
  }
  
  // Find the main content area more carefully
  const mainView = document.querySelector('.main-view-container__scroll-node-child') || 
                   document.querySelector('.main-view-container__scroll-node') ||
                   document.querySelector('.Root__main-view > div') ||
                   document.querySelector('.Root__main-view');
  
  if (!mainView) {
    return;
  }
  
  // Store original display state instead of innerHTML
  const children = Array.from(mainView.children);
  originalPageState = {
    children: children,
    parent: mainView
  };
  
  // Hide original content instead of removing it
  children.forEach(child => {
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
        background: transparent;
        border: none;
        color: var(--text-base, #ffffff);
        cursor: pointer;
        padding: 8px;
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
  lyricsPageActive = true;

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
        try {
          // Attempt to copy using the modern Clipboard API
          navigator.clipboard.writeText(selectedText).then(() => {
            Spicetify.showNotification("Lyrics copied to clipboard!", false);
          }).catch(err => {
            // Fallback to document.execCommand if Clipboard API fails or is not available
            if (document.execCommand('copy')) {
              Spicetify.showNotification("Lyrics copied to clipboard!", false);
            } else {
              Spicetify.showNotification("Failed to copy lyrics.", true);
            }
          });
        } catch (err) {
          // Fallback for older browsers or restricted environments
          if (document.execCommand('copy')) {
            Spicetify.showNotification("Lyrics copied to clipboard!", false);
          } else {
            Spicetify.showNotification("Failed to copy lyrics.", true);
          }
        }
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

  // Add copy button functionality
  const copyButton = document.getElementById('lyrics-copy-button');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      const selection = window.getSelection();
      let textToCopy = '';

      if (selection && selection.toString().length > 0) {
        // If text is selected, copy the selected text
        textToCopy = selection.toString();
      } else {
        // If no text is selected, copy all visible lyrics
        const lyricsContentEl = document.getElementById('lyrics-content');
        if (lyricsContentEl) {
          textToCopy = lyricsContentEl.innerText;
        }
      }

      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          Spicetify.showNotification("Lyrics copied to clipboard!", false);
        } catch (err) {
          // Fallback to document.execCommand if Clipboard API fails or is not available
          if (document.execCommand('copy')) {
            Spicetify.showNotification("Lyrics copied to clipboard!", false);
          } else {
            Spicetify.showNotification("Failed to copy lyrics.", true);
          }
        }
      } else {
        Spicetify.showNotification("No lyrics to copy.", true);
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
function closeLyricsPage() {
  
  if (!lyricsPageActive || !originalPageState) {
    return;
  }

  // Clear the highlighting interval
  if (highlightInterval) {
    clearInterval(highlightInterval);
    highlightInterval = null;
  }
  currentHighlightedLine = null;

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
  
  lyricsPageActive = false;
  originalPageState = null;
}

// Fetch lyrics from API
async function fetchAndDisplayLyrics() {
  const loadingEl = document.getElementById('lyrics-loading');
  const contentEl = document.getElementById('lyrics-content');
  const errorEl = document.getElementById('lyrics-error');
  const headerInfo = document.getElementById('track-info-header');
  const errorDetails = document.getElementById('error-details');

  // Clear previous lyrics and hide content/loading elements
  if (contentEl) contentEl.innerHTML = '';
  if (loadingEl) loadingEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';

  // Clear any existing highlight interval
  if (highlightInterval) {
    clearInterval(highlightInterval);
    highlightInterval = null;
  }
  currentHighlightedLine = null;
  currentLyrics = []; // Clear lyrics data

  if (!window.Spicetify?.Player?.data?.item) {
    if (errorEl) errorEl.style.display = 'block';
    if (errorDetails) errorDetails.textContent = 'No track currently playing';
    return;
  }
  
  const track = Spicetify.Player.data?.item;
  if (!track || !track.artists || !track.artists.length) {
        Spicetify.showNotification("Could not get track info.", true);
        return;
  }
  const artist = track.artists[0].name ?? "";
  const title = track.name;
  const album_name = track.album?.name ?? "";
  const duration = track.duration?.milliseconds ?? 0;
  const duration_in_seconds = Math.ceil(duration / 1000);
  
  if (headerInfo) {
    headerInfo.textContent = `${title} • ${artist}`;
  }
  
  try {
    //Spicetify.showNotification(`[LYRICS] Fetching lyrics for: ${title} by ${artist}`);
    const baseUrl = 'https://lrclib.net/api/get';
    const queryParams = new URLSearchParams({
      artist_name: artist,
      track_name: title,
      album_name: album_name,
      duration: duration_in_seconds.toString(),
    });

    const url = `${baseUrl}?${queryParams.toString()}`;
    const processed = url.replace(/%20/g, "+").replace(/%28/g, "(").replace(/%29/g, ")");

    //Spicetify.showNotification(processed, true);
    
    const response = await fetch(processed);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    displaySyncedLyrics(data);
  } catch (error) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none'; // Hide lyrics content on error
    if (errorEl) errorEl.style.display = 'block';
    if (errorDetails) errorDetails.textContent = `${title} by ${artist}`;

    // Clear any existing highlight interval on error
    if (highlightInterval) {
      clearInterval(highlightInterval);
      highlightInterval = null;
    }
    currentHighlightedLine = null;
    currentLyrics = []; // Clear lyrics data on error
  }
}

let currentLyrics: { time: number; line: string }[] = [];
let highlightInterval: number | null = null;
let currentHighlightedLine: string | null = null;

function displaySyncedLyrics(data: any) {
  const contentEl = document.getElementById('lyrics-content');
  const loadingEl = document.getElementById('lyrics-loading');
  const errorEl = document.getElementById('lyrics-error');

  if (loadingEl) loadingEl.style.display = 'none';
  if (errorEl) {
    errorEl.style.display = 'none';
    currentLyrics = [];
  }
  if (contentEl) contentEl.style.display = 'block';

  currentLyrics = [];
  if (highlightInterval) {
    clearInterval(highlightInterval);
    highlightInterval = null;
  }
  currentHighlightedLine = null;

  if (data.syncedLyrics) {
    const lines = data.syncedLyrics.split('\n');
    currentLyrics = lines
      .map((line: string) => {
        const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const milliseconds = parseInt(match[3], 10);
          const time = minutes * 60 + seconds + milliseconds / (match[3].length === 3 ? 1000 : 100); // Handle both .xx and .xxx
          const text = match[4].trim();
          if (text) return { time, line: text };
        }
        return null;
      })
      .filter(Boolean) as { time: number; line: string }[];
  }

  // Fallback to plainLyrics if synced not available
  if (currentLyrics.length === 0 && data.plainLyrics) {
    data.plainLyrics
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean)
      .forEach((line: string) => currentLyrics.push({ time: 0, line })); // Assign 0 time for plain lyrics
  }

  if (contentEl) {
    contentEl.innerHTML = currentLyrics
      .map((lyric, index) => `<p id="lyric-line-${index}" class="lyric-line">${lyric.line}</p>`)
      .join('');
  }

  // Add CSS for highlighting
  const styleEl = document.createElement('style');
  styleEl.id = 'custom-lyrics-style';
  styleEl.textContent = `
    .lyric-line {
      font-size: 24px;
      margin: 16px 0;
      opacity: 0.6;
      transition: opacity 0.3s, color 0.3s, transform 0.3s;
      text-align: center;
    }
    .lyric-line.active {
      opacity: 1;
      color: var(--text-base, #ffffff);
      font-weight: 700;
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(styleEl);

  // Start highlighting interval
  highlightInterval = window.setInterval(() => {
    const progress = Spicetify.Player.getProgress();
    const seconds = progress / 1000;

    let activeLineIndex = -1;
    for (let i = currentLyrics.length - 1; i >= 0; i--) {
      if (currentLyrics[i].time <= seconds) {
        activeLineIndex = i;
        break;
      }
    }

    const newActiveLineId = activeLineIndex !== -1 ? `lyric-line-${activeLineIndex}` : null;

    if (newActiveLineId && newActiveLineId !== currentHighlightedLine) {
      if (currentHighlightedLine) {
        const prevActiveEl = document.getElementById(currentHighlightedLine);
        if (prevActiveEl) {
          prevActiveEl.classList.remove('active');
        }
      }
      const newActiveEl = document.getElementById(newActiveLineId);
      if (newActiveEl) {
        newActiveEl.classList.add('active');
        // scroll into view
        newActiveEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      currentHighlightedLine = newActiveLineId;
    } else if (!newActiveLineId && currentHighlightedLine) {
      // No active line, remove highlight from previous
      const prevActiveEl = document.getElementById(currentHighlightedLine);
      if (prevActiveEl) {
        prevActiveEl.classList.remove('active');
      }
      currentHighlightedLine = null;
    }
  }, 500);
}

// Create the lyrics button
function createLyricsButton() {
  let attempts = 0;
  const tryCreateButton = () => {
    attempts++;
    
    // Check if button already exists
    if (document.querySelector('#spotify-lyrics-button')) {
      return;
    }
    
    // Try to find the right container for the button
    const selectors = [
      '.main-nowPlayingBar-extraControls',
      '.ExtraControls',
      '.main-nowPlayingBar-right',
      '[data-testid="now-playing-bar"] .main-nowPlayingBar-right',
      '.player-controls__right',
      '.now-playing-bar__right'
    ];
    
    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) {
        break;
      }
    }
    
    if (!container) {
      if (attempts < 50) {
        setTimeout(tryCreateButton, 200);
        return;
      } else {
        // Create floating button as fallback
        createFloatingButton();
        return;
      }
    }
    
    // Create button that matches Spotify's style
    // Button: https://icons.getbootstrap.com
    const button = document.createElement('button');
    button.id = 'spotify-lyrics-button';
    button.className = 'Button-sc-1dqy6lx-0 Button-small-small Button-ui-variant-ghost';
    button.setAttribute('aria-label', 'Lyrics');
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-layout-text-sidebar" viewBox="0 0 16 16">
        <path d="M3.5 3a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zm0 3a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zM3 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m.5 2.5a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1z"/>
        <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm12-1v14h2a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zm-1 0H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9z"/>
      </svg>
    `;
    
    button.style.cssText = `
      background: transparent;
      border: none;
      color: var(--text-subdued, #b3b3b3);
      cursor: pointer;
      padding: 8px;
      margin: 0 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
      min-width: 32px;
      height: 32px;
    `;
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showLyricsPage();
    });
    
    button.addEventListener('mouseenter', () => {
      button.style.color = 'var(--text-base, #ffffff)';
      button.style.backgroundColor = 'rgba(255,255,255,0.1)';
      button.style.transform = 'scale(1.06)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.color = 'var(--text-subdued, #b3b3b3)';
      button.style.backgroundColor = 'transparent';
      button.style.transform = 'scale(1)';
    });
    
    container.appendChild(button);
  };
  
  tryCreateButton();
}

// Create floating button as fallback
function createFloatingButton() {
  if (document.querySelector('#spotify-lyrics-button-floating')) {
    return;
  }
  
  const button = document.createElement('button');
  button.id = 'spotify-lyrics-button-floating';
  button.innerHTML = 'Lyrics';
  button.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 20px;
    background: var(--background-tinted-highlight, #1db954);
    border: none;
    color: #000;
    padding: 12px 24px;
    border-radius: 24px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    transition: all 0.2s;
  `;
  
  button.addEventListener('click', showLyricsPage);
  
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.05)';
    button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
  });
  
  document.body.appendChild(button);
}

// Handle keyboard shortcut (Ctrl+L)
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    if (lyricsPageActive) {
      closeLyricsPage();
    } else {
      showLyricsPage();
    }
  }
});

// Clean up on page navigation
if (window.Spicetify?.Platform?.History?.listen) {
  window.Spicetify.Platform.History.listen(() => {
    if (lyricsPageActive) {
      closeLyricsPage();
    }
  });
}

// Main initialization
async function main() {
  
  // Wait for Spicetify to be ready
  let attempts = 0;
  while (!window.Spicetify?.Player?.data && attempts < 100) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }
  
  if (!window.Spicetify?.Player) {
    return;
  }
  
  // Create button after a small delay to ensure UI is ready
  setTimeout(createLyricsButton, 1000);
  
  // Also try to create button when player state changes
  if (window.Spicetify.Player.addEventListener) {
    window.Spicetify.Player.addEventListener("songchange", () => {
      // Clear existing interval if any
      if (highlightInterval) {
        clearInterval(highlightInterval);
        highlightInterval = null;
      }
      currentHighlightedLine = null;
      // Refresh lyrics if page is open
      if (lyricsPageActive) {
        fetchAndDisplayLyrics();
      }
    });
  }
}

export default main;
