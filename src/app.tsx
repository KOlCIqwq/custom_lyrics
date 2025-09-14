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
    width: 100%;
    min-height: 100vh;
    background: var(--background-base, #121212);
    color: var(--text-base, #ffffff);
    position: relative;
  `;
  
  // Create the lyrics page content
  const lyricsHTML = `
    <!-- Header with proper styling -->
     <div style="
      background: var(--background-elevated-base, #181818);
      padding: 16px 32px;
      display: flex;
      align-items: center; /* Vertically align all items */
      position: sticky;
      top: 0;
      z-index: 10;
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
        width: 32px;
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
  
  // Fetch and display lyrics
  fetchAndDisplayLyrics();
}

// Properly close the lyrics page
function closeLyricsPage() {
  
  if (!lyricsPageActive || !originalPageState) {
    return;
  }
  
  // Remove lyrics container
  const lyricsContainer = document.getElementById('custom-lyrics-page');
  if (lyricsContainer) {
    lyricsContainer.remove();
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
  
  if (!window.Spicetify?.Player?.data?.item) {
    if (loadingEl) loadingEl.style.display = 'none';
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
    
    // Parse and display lyrics
    let lyricsToDisplay = [];
    
    // Try synced lyrics first
    if (data.syncedLyrics) {
      const lines = data.syncedLyrics.split('\n');
      lyricsToDisplay = lines
  .map((line: string) => {
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
          if (match) {
            const text = match[4].trim();
            if (text) return text;
          }
          return null;
        })
        .filter(Boolean);
    }
    
    // Fallback to plain lyrics
    if (lyricsToDisplay.length === 0 && data.plainLyrics) {
      lyricsToDisplay = data.plainLyrics
        .split('\n')
  .map((line: string) => line.trim())
        .filter(Boolean);
    }
    
    if (lyricsToDisplay.length > 0) {
      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) {
        contentEl.style.display = 'block';
        contentEl.innerHTML = lyricsToDisplay
          .map((line: string) => `
            <p style="
              margin: 16px 0;
              font-size: 18px;
              line-height: 1.6;
              opacity: 0.9;
            ">${line}</p>
          `).join('');
      }
    } else {
      throw new Error('No lyrics found in response');
    }
    
  } catch (error) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
    if (errorDetails) errorDetails.textContent = `${title} by ${artist}`;
  }
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
      // Refresh lyrics if page is open
      if (lyricsPageActive) {
        fetchAndDisplayLyrics();
      }
    });
  }
}

export default main;