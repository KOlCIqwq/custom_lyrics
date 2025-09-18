import { lyricsPageActive } from '../state/lyricsState';
import { showLyricsPage, closeLyricsPage } from '../components/lyricsPage';
import { highlightInterval, setHighlightInterval, setCurrentHighlightedLine, setMemorizedSelectedText } from '../state/lyricsState';
import { fetchAndDisplayLyrics } from '../utils/lyricsFetcher';
import { createLyricsButton } from '../components/lyricsButton';
import { updateAlbumImage } from '../utils/albumImageFetcher';

declare global {
  interface Window {
    Spicetify: any;
  }
}

export function setupGlobalEventHandlers() {
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
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.Spicetify?.Player) {
      return;
    }

    // Create button after a small delay to ensure UI is ready
    setTimeout(createLyricsButton, 1000);

    // Also try to create button when player state changes
    if (window.Spicetify.Player.addEventListener) {
      window.Spicetify.Player.addEventListener('songchange', () => {
        // Clear existing interval if any
        if (highlightInterval) {
          clearInterval(highlightInterval);
          setHighlightInterval(null);
        }
        setCurrentHighlightedLine(null);
        // Refresh lyrics if page is open
        if (lyricsPageActive) {
          fetchAndDisplayLyrics();
        }
        // Reset the copy text if song changes
        setMemorizedSelectedText(null);
        updateAlbumImage(); // Refresh album image on song change
      });
    }
  }

  main();
}
