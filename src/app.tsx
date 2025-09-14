import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

// Store original content for restoration
let originalContent: {
  html: string;
  mainView: Element | null;
} | null = null;

// This component will be rendered as a full page
function LyricsPage() {
  const [lyrics, setLyrics] = useState<{ time: number; line: string }[]>([]);
  const [currentLine, setCurrentLine] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [trackInfo, setTrackInfo] = useState<{title: string, artist: string, album: string}>({
    title: "", artist: "", album: ""
  });

  // This effect will run once to fetch the lyrics for the current track
  useEffect(() => {
    const fetchLyrics = async () => {
      setLoading(true);
      const track = Spicetify.Player.data?.item;
      if (!track || !track.artists || !track.artists.length) {
        Spicetify.showNotification("Could not get track info.", true);
        setLoading(false);
        return;
      }

      const artist = track.artists[0].name;
      const title = track.name;
      const album_name = track.album?.name ?? "";
      const duration = track.duration?.milliseconds ?? 0;
      const duration_in_seconds = Math.ceil(duration / 1000);

      setTrackInfo({ title, artist, album: album_name });

      try {
        const baseUrl = 'https://lrclib.net/api/get';
        const queryParams = new URLSearchParams({
          artist_name: artist,
          track_name: title,
          album_name: album_name,
          duration: duration_in_seconds.toString(),
        });
        const url = `${baseUrl}?${queryParams.toString()}`;
        const processed = url.replace(/%20/g, "+").replace(/%28/g, "(").replace(/%29/g, ")");

        const res = await fetch(processed);
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        const parsedLyrics = parseLyrics(data);
        setLyrics(parsedLyrics);
      } catch (err) {
        const err_message = "Failed to fetch lyrics" + err;
        Spicetify.showNotification(err_message, true);
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
    
    // Listen for song changes and update lyrics
    const handleSongChange = () => {
      fetchLyrics();
    };
    
    Spicetify.Player.addEventListener("songchange", handleSongChange);
    
    return () => {
      Spicetify.Player.removeEventListener("songchange", handleSongChange);
    };
  }, []);

  const parseLyrics = (data: any) => {
    // Prioritize synced lyrics if they exist and are not empty
    if (data && data.syncedLyrics) {
      const lines = data.syncedLyrics.split('\n');
      const lyricsArray = lines
        .map((line: string) => {
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2})\](.*)/);
          if (!match) return null;
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const milliseconds = parseInt(match[3], 10);
          const text = match[4].trim();
          const time = minutes * 60 + seconds + milliseconds / 100;
          if (!text) return null;
          return { time, line: text };
        })
        .filter(Boolean);
      if (lyricsArray.length > 0) {
        return lyricsArray;
      }
    }

    // Fallback to plain lyrics
    if (data && data.plainLyrics) {
      return data.plainLyrics.split('\n')
        .map((line: string) => ({ time: 0, line: line.trim() }))
        .filter((item: { time: number; line: string }) => item.line);
    }
    return [];
  };

  // This effect syncs the lyrics with the player progress
  useEffect(() => {
    if (!lyrics.length) return;
    const hasSyncedLyrics = lyrics.some(l => l.time > 0);
    if (!hasSyncedLyrics) {
      setCurrentLine(lyrics[0]?.line || "");
      return;
    }

    const interval = setInterval(() => {
      const progress = Spicetify.Player.getProgress();
      const seconds = progress / 1000;
      const activeLine = lyrics.reduce((prev, curr) => {
        return curr.time <= seconds ? curr : prev;
      });
      if (activeLine) {
        setCurrentLine(activeLine.line);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [lyrics]);

  const goBack = () => {
    restoreOriginalContent();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--spice-main)',
      color: 'var(--spice-text)',
      padding: '0',
      margin: '0'
    }}>
      {/* Header */}
      <div style={{
        background: 'var(--spice-sidebar)',
        padding: '16px 24px',
        borderBottom: '1px solid var(--spice-border)',
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: '0',
        zIndex: '100'
      }}>
        <button
          onClick={goBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--spice-text)',
            cursor: 'pointer',
            marginRight: '16px',
            padding: '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = 'var(--spice-button-disabled)')}
          onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background= 'transparent')}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
          </svg>
        </button>
        
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 'bold', 
            margin: '0 0 4px 0' 
          }}>
            Lyrics
          </h1>
          {trackInfo.title && (
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--spice-subtext)', 
              margin: '0' 
            }}>
              {trackInfo.title} • {trackInfo.artist}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        padding: '32px 24px',
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center',
            padding: '64px 0',
            color: 'var(--spice-subtext)'
          }}>
            <div style={{ 
              fontSize: '48px',
              marginBottom: '16px'
            }}>🎵</div>
            Loading lyrics...
          </div>
        ) : !lyrics.length ? (
          <div style={{ 
            textAlign: 'center',
            padding: '64px 0',
            color: 'var(--spice-subtext)'
          }}>
            <div style={{ 
              fontSize: '48px',
              marginBottom: '16px'
            }}>📝</div>
            No lyrics found for this track.
          </div>
        ) : (
          <div style={{ lineHeight: '1.8' }}>
            {lyrics.map((l, idx) => (
              <p
                key={idx}
                style={{
                  color: l.line === currentLine ? 'var(--spice-accent)' : 'var(--spice-text)',
                  fontSize: l.line === currentLine ? '20px' : '18px',
                  fontWeight: l.line === currentLine ? '600' : '400',
                  margin: '16px 0',
                  transition: 'all 0.3s ease',
                  textAlign: 'center',
                  padding: l.line === currentLine ? '8px 16px' : '4px 8px',
                  borderRadius: '8px',
                  background: l.line === currentLine ? 'rgba(var(--spice-rgb-accent), 0.1)' : 'transparent',
                }}
              >
                {l.line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Store React root for cleanup
let reactRoot: any = null;

// Function to restore original content
const restoreOriginalContent = () => {
  if (reactRoot) {
    if (reactRoot.unmount) {
      reactRoot.unmount();
    }
    reactRoot = null;
  }
  
  const lyricsContainer = document.getElementById('custom-lyrics-page');
  if (lyricsContainer && lyricsContainer.parentNode) {
    lyricsContainer.parentNode.removeChild(lyricsContainer);
  }
  
  if (originalContent && originalContent.mainView) {
    originalContent.mainView.innerHTML = originalContent.html;
    originalContent = null;
  }
};

// Function to create and navigate to the lyrics page
const navigateToLyricsPage = () => {
  // Find the main content area
  const mainView = document.querySelector('.main-view-container__scroll-node-child') || 
                   document.querySelector('.main-view-container .os-content') ||
                   document.querySelector('[data-testid="main-content"]') ||
                   document.querySelector('.main-view-container__scroll-node') ||
                   document.querySelector('.Root__main-view .os-content');
  
  if (!mainView) {
    console.error('Could not find main content area');
    Spicetify.showNotification('Could not navigate to lyrics page', true);
    return;
  }

  // Store original content for restoration
  originalContent = {
    html: mainView.innerHTML,
    mainView: mainView
  };
  
  // Clear and create container for our page
  mainView.innerHTML = '';
  const lyricsPageContainer = document.createElement('div');
  lyricsPageContainer.id = 'custom-lyrics-page';
  lyricsPageContainer.style.cssText = `
    width: 100%;
    height: 100%;
    min-height: 100vh;
  `;
  
  mainView.appendChild(lyricsPageContainer);
  
  // Render the React component
  if ((ReactDOM as any).createRoot) {
    reactRoot = (ReactDOM as any).createRoot(lyricsPageContainer);
    reactRoot.render(<LyricsPage />);
  } else {
    (ReactDOM as any).render(<LyricsPage />, lyricsPageContainer);
  }
  
  // Update browser history for proper navigation
  try {
    if (window.history && window.history.pushState) {
      window.history.pushState({ page: 'lyrics' }, 'Lyrics', window.location.href);
    }
  } catch (error) {
    console.warn('[LYRICS] Could not update history state:', error);
  }
  
  // Listen for popstate events to handle back navigation
  const handlePopState = (event: PopStateEvent) => {
    if (!event.state || event.state.page !== 'lyrics') {
      restoreOriginalContent();
      window.removeEventListener('popstate', handlePopState);
    }
  };
  
  // Add event listener for back navigation
  window.addEventListener('popstate', handlePopState);
  
  // Handle keyboard navigation (ESC key to go back)
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      restoreOriginalContent();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  
  document.addEventListener('keydown', handleKeyDown);
};

// Main function that Spicetify will run
async function main() {
  // Wait for Spicetify APIs to be available
  while (!Spicetify?.Player?.addEventListener) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Create the lyrics button in the bottom bar
  try {
    const waitForPlayerControls = async () => {
      let attempts = 0;
      while (attempts < 50) {
        const playerControls = document.querySelector('.main-nowPlayingBar-right .main-nowPlayingBar-extraControls') ||
                              document.querySelector('.main-nowPlayingBar-right') ||
                              document.querySelector('[data-testid="now-playing-bar"] .main-nowPlayingBar-right');
        
        if (playerControls) {
          return playerControls;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      throw new Error('Player controls not found');
    };

    const playerControls = await waitForPlayerControls();

    // Create button manually
    const buttonElement = document.createElement('button');
    buttonElement.className = 'main-genericButton-button main-playButton-button';
    buttonElement.setAttribute('aria-label', 'Show lyrics');
    buttonElement.setAttribute('data-testid', 'control-button-lyrics');
    buttonElement.innerHTML = `
      <svg role="img" height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M13.426 2.574a2.265 2.265 0 0 0-1.6-.663c-.624 0-1.191.252-1.6.663l-4.5 4.5a2.265 2.265 0 0 0 0 3.199 2.265 2.265 0 0 0 3.199 0l4.5-4.5a2.265 2.265 0 0 0 .663-1.6c0-.624-.252-1.191-.662-1.599zM12.012 4.988L7.512 9.488a.765.765 0 0 1-1.077 0 .765.765 0 0 1 0-1.077l4.5-4.5a.765.765 0 0 1 1.077 0c.141.141.223.335.223.538a.765.765 0 0 1-.223.539z"/>
        <path d="M1.75 13c0 .69.56 1.25 1.25 1.25H6A1.25 1.25 0 0 0 7.25 13V9A1.25 1.25 0 0 0 6 7.75H3A1.25 1.25 0 0 0 1.75 9v4zm1.5-4c0-.138.112-.25.25-.25h3c.138 0 .25.112.25.25v4c0 .138-.112.25-.25.25H3a.25.25 0 0 1-.25-.25V9z"/>
      </svg>
    `;
    buttonElement.title = 'Show Lyrics';
    
    // Navigate to lyrics page instead of opening modal
    buttonElement.addEventListener('click', navigateToLyricsPage);

    // Add styling to match other buttons
    buttonElement.style.cssText = `
      background: transparent;
      border: none;
      color: var(--spice-subtext);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 4px;
      margin-left: 8px;
    `;

    // Add hover effects
    buttonElement.addEventListener('mouseenter', () => {
      buttonElement.style.color = 'var(--spice-text)';
      buttonElement.style.backgroundColor = 'var(--spice-button-disabled)';
    });

    buttonElement.addEventListener('mouseleave', () => {
      buttonElement.style.color = 'var(--spice-subtext)';
      buttonElement.style.backgroundColor = 'transparent';
    });

    playerControls.appendChild(buttonElement);
    console.log("[LYRICS] Button created and added successfully");

  } catch (error) {
    console.error("[LYRICS] Failed to create button:", error);
  }

  // Clean up on extension unload
  const cleanup = () => {
    restoreOriginalContent();
  };

  // Add cleanup to window unload (optional)
  window.addEventListener('beforeunload', cleanup);

  console.log("[LYRICS] Extension loaded successfully");
}

export default main;