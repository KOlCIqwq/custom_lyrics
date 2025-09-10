import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

// This component will be rendered inside a modal
function LyricsView() {
  const [lyrics, setLyrics] = useState<{ time: number; line: string }[]>([]);
  const [currentLine, setCurrentLine] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

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

      // Convert into seconds
      const duration_in_seconds = Math.ceil(duration / 1000);

      // Process strings
      /* const artist_processed = artist.replace(/ /g, "+");
      const title_processed = title.replace(/ /g, "+");
      const album_name_processed = album_name.replace(/ /g, "+"); */

      try {
        //const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(title)}&album_name=${encodeURIComponent(album_name)}&duration=${encodeURIComponent(duration_in_seconds)}`;
        //const processed = url.replace(/%20/g, "+");
        const baseUrl = 'https://lrclib.net/api/get';

        const queryParams = new URLSearchParams({
            artist_name: artist,
            track_name: title,
            album_name: album_name,
            duration: duration_in_seconds.toString(),
        });

        const url = `${baseUrl}?${queryParams.toString()}`;
        const processed_plus = url.replace(/%20/g, "+");
        const processed_left = processed_plus.replace(/%28/g, "(");
        const processed = processed_left.replace(/%29/g, ")");
        Spicetify.showNotification(processed, true);
        const res = await fetch(
          processed
        );
        
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        const data = await res.json();
        Spicetify.showNotification(data, true);
        setLyrics(data);
      } catch (err) {
        console.error("Failed to fetch lyrics:", err);
        Spicetify.showNotification("Failed to fetch lyrics.", true);
      } finally {
        setLoading(false);
      }
    };

    fetchLyrics();
  }, []);

  // This effect syncs the lyrics with the player progress (only for synced lyrics)
  useEffect(() => {
    if (!lyrics.length) return;

    // Check if we have synced lyrics (time-based) or plain lyrics
    const hasSyncedLyrics = lyrics.length > 0 && lyrics[0].time !== lyrics[0].time || lyrics.some(l => l.time > 0);

    if (!hasSyncedLyrics) {
      // For plain lyrics, just show the first line or all lyrics
      setCurrentLine(lyrics[0]?.line || "");
      return;
    }

    const interval = setInterval(() => {
      const progress = Spicetify.Player.getProgress(); // in ms
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
  
  if (loading) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        Loading lyrics...
      </div>
    );
  }

  if (!lyrics.length) {
    return (
      <div style={{ padding: "16px", textAlign: "center" }}>
        No lyrics found for this track.
      </div>
    );
  }

  return (
    <div className="p-2" style={{ maxHeight: "400px", overflowY: "auto" }}>
      <div>
        {lyrics.map((l, idx) => (
          <p
            key={idx}
            style={{
              color: l.line === currentLine ? "var(--spice-button-active)" : "var(--spice-text)",
              fontWeight: l.line === currentLine ? "bold" : "normal",
              textAlign: "center",
              margin: "10px 0",
              fontSize: "18px",
              transition: "color 0.3s, font-weight 0.3s",
            }}
          >
            {l.line}
          </p>
        ))}
      </div>
    </div>
  );
}

// Main function that Spicetify will run
async function main() {
    // Wait for Spicetify APIs to be available
    while (!Spicetify?.Player?.addEventListener || !Spicetify?.PopupModal) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    const openLyricsModal = () => {
        
        // Create a container for the React component
        const modalContainer = document.createElement("div");
        
        const root = (ReactDOM as any).createRoot
            ? (ReactDOM as any).createRoot(modalContainer)
            : null;
        if (root) {
            root.render(<LyricsView />);
        } else {
            // Fallback for React 17 or lower
            (ReactDOM as any).render(<LyricsView />, modalContainer);
        }

        // Display the modal with the rendered component
        Spicetify.PopupModal.display({
            title: "Lyrics",
            content: modalContainer,
            isLarge: true,
        });
    };

    // Create the lyrics button using manual DOM manipulation
    try {
        // Wait for the player controls to be ready
        const waitForPlayerControls = async () => {
            let attempts = 0;
            while (attempts < 50) {
                // Try multiple possible containers for better placement
                const playerControls = 
                    document.querySelector('.main-nowPlayingBar-right .main-nowPlayingBar-extraControls') ||
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
        
        // Create button manually since Spicetify.Player.Button might not be available
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
        buttonElement.addEventListener('click', openLyricsModal);
        
        // Add some styling to match other buttons
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
    
    console.log("[LYRICS] Extension loaded successfully");
}

export default main;
