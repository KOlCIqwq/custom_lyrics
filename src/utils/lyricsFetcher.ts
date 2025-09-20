import {
  currentLyrics,
  highlightInterval,
  currentHighlightedLine,
  isDragging,
  setCurrentLyrics,
  setHighlightInterval,
  setCurrentHighlightedLine,
} from '../state/lyricsState';

declare global {
  interface Window {
    Spicetify: any;
  }
}

// Fetch lyrics from API
export async function fetchAndDisplayLyrics() {
  const loadingEl = document.getElementById('lyrics-loading');
  const contentEl = document.getElementById('lyrics-content');
  const errorEl = document.getElementById('lyrics-error');
  const headerInfo = document.getElementById('track-info-header');
  const artistInfo = document.getElementById('track-info-artist');
  const errorDetails = document.getElementById('error-details');

  if (contentEl) contentEl.innerHTML = '';
  if (loadingEl) loadingEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';

  if (highlightInterval) {
    clearInterval(highlightInterval);
    setHighlightInterval(null);
  }
  setCurrentHighlightedLine(null);
  setCurrentLyrics([]);

  if (!window.Spicetify?.Player?.data?.item) {
    if (errorEl) errorEl.style.display = 'block';
    if (errorDetails) errorDetails.textContent = 'No track currently playing';
    return;
  }

  const track = window.Spicetify.Player.data?.item;
  if (!track || !track.artists || !track.artists.length) {
    window.Spicetify.showNotification('Could not get track info.', true);
    return;
  }
  const artist = track.artists[0].name ?? '';
  const title = track.name;
  const album_name = track.album?.name ?? '';
  const duration = track.duration?.milliseconds ?? 0;
  const duration_in_seconds = Math.ceil(duration / 1000);

  if (headerInfo) headerInfo.textContent = title;
  if (artistInfo) artistInfo.textContent = artist;

  try {
    const baseUrl = 'https://lrclib.net/api/get';
    const queryParams = new URLSearchParams({
      artist_name: artist,
      track_name: title,
      album_name: album_name,
      duration: duration_in_seconds.toString(),
    });

    const url = `${baseUrl}?${queryParams.toString()}`;
    const processed = url.replace(/%20/g, '+').replace(/%28/g, '(').replace(/%29/g, ')');
    const response = await fetch(processed);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    displaySyncedLyrics(data);
  } catch (error) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
    if (errorDetails) errorDetails.textContent = `${title} by ${artist}`;

    if (highlightInterval) {
      clearInterval(highlightInterval);
      setHighlightInterval(null);
    }
    setCurrentHighlightedLine(null);
    setCurrentLyrics([]);
  }
}

export function displaySyncedLyrics(data: any) {
  const contentEl = document.getElementById('lyrics-content');
  const loadingEl = document.getElementById('lyrics-loading');
  const errorEl = document.getElementById('lyrics-error');

  if (loadingEl) loadingEl.style.display = 'none';
  if (errorEl) {
    errorEl.style.display = 'none';
    setCurrentLyrics([]);
  }
  if (contentEl) contentEl.style.display = 'block';

  setCurrentLyrics([]);
  if (highlightInterval) {
    clearInterval(highlightInterval);
    setHighlightInterval(null);
  }
  setCurrentHighlightedLine(null);

  if (data.syncedLyrics) {
    const lines = data.syncedLyrics.split('\n');
    setCurrentLyrics(
      lines
        .map((line: string) => {
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
          if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3], 10);
            const time = minutes * 60 + seconds + milliseconds / (match[3].length === 3 ? 1000 : 100);
            const text = match[4].trim();
            if (text) return { time, line: text };
          }
          return null;
        })
        .filter(Boolean) as { time: number; line: string }[],
    );
  }

  if (currentLyrics.length === 0 && data.plainLyrics) {
    data.plainLyrics
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean)
      .forEach((line: string) => currentLyrics.push({ time: -1, line }));
  }

  if (contentEl) {
    contentEl.innerHTML = currentLyrics
      .map((lyric, index) => `<p id="lyric-line-${index}" class="lyric-line" data-time="${lyric.time}">${lyric.line}</p>`)
      .join('');

    contentEl.addEventListener('click', (e) => {
      const selection = window.getSelection();
      const selectedTextLength = selection ? selection.toString().length : 0;

      if (!isDragging && selectedTextLength === 0) {
        const target = e.target as HTMLElement;
        if (target && target.classList.contains('lyric-line')) {
          const time = parseFloat(target.dataset.time || '0');
          if (time >= 0) { // Allow seeking to time 0
            window.Spicetify.Player.seek(time * 1000);
            if (currentHighlightedLine) {
              const prevActiveEl = document.getElementById(currentHighlightedLine);
              if (prevActiveEl) prevActiveEl.classList.remove('active');
            }
            target.classList.add('active');
            setCurrentHighlightedLine(target.id);
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    });
  }

  // Remove old style element if it exists
  document.getElementById('custom-lyrics-style')?.remove();
  
  // Add CSS for highlighting and the scrolling fix
  const styleEl = document.createElement('style');
  styleEl.id = 'custom-lyrics-style';
  styleEl.textContent = `
    #lyrics-content {
      /* Add space at the bottom equal to half the screen height */
      padding-bottom: 50vh;
      box-sizing: border-box;
    }
    .lyric-line {
    font-size: 24px;
    margin: 16px 0;
    opacity: 0.6;
    transition: opacity 0.3s, color 0.3s, transform 0.3s;
    text-align: center;
    cursor: pointer;
    color: #ffffffc4;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
  }
  .lyric-line.active {
    color: #ffffffff;
    opacity: 1;
    font-weight: 1000;
    transform: scale(1.05);
    text-shadow: 3px 3px 6px rgba(0,0,0,0.9);
  }
  `;
  document.head.appendChild(styleEl);

  // Start highlighting interval
  setHighlightInterval(
    window.setInterval(() => {
      const progress = window.Spicetify.Player.getProgress();
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
          if (prevActiveEl) prevActiveEl.classList.remove('active');
        }
        const newActiveEl = document.getElementById(newActiveLineId);
        if (newActiveEl) {
          newActiveEl.classList.add('active');
          newActiveEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setCurrentHighlightedLine(newActiveLineId);
      } else if (!newActiveLineId && currentHighlightedLine) {
        const prevActiveEl = document.getElementById(currentHighlightedLine);
        if (prevActiveEl) prevActiveEl.classList.remove('active');
        setCurrentHighlightedLine(null);
      }
    }, 150), // Interval can be a bit faster for better accuracy
  );
}