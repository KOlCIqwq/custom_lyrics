import {
  currentLyrics,
  highlightInterval,
  currentHighlightedLine,
  isDragging,
  setCurrentLyrics,
  setHighlightInterval,
  setCurrentHighlightedLine,
  scrolledAndStopped,
  setScrolledAndStopped,
  setIdle,
  isIdle,
} from '../state/lyricsState';

type Song = {
  id: number;
  name: string;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number;
  instrumental: boolean;
  plainLyrics: string;
  syncedLyrics: string;
};

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

    const data:Song = await response.json();
    if (data.syncedLyrics == null){
      throw new Error("No synced found")
    }

    displaySyncedLyrics(data);
  } catch (error) {
    // We can try to add a fallback here [DONE]
    // By using the search API or 163
    const artists = track.artists;
    // We pass the full list of artist instead of the first one
    let artistsname: Array<string> = [];
    for (const artist of artists) {
      artistsname.push(artist.name);
    }
    if (await trySearchAPI(artistsname, title, duration_in_seconds, album_name) == false) {
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
}

async function trySearchAPI(artists:Array<string>,title:string,duration:number,album_name:string){
  const baseUrl = 'https://lrclib.net/api/search';
  try {
    let queryParams = 'q=' + title;
    for (const artist of artists){
      queryParams += ' ' + artist;
    }
    const url = `${baseUrl}?${queryParams.toString()}`;
    const processed = url.replace(/%20/g, '+').replace(/%28/g, '(').replace(/%29/g, ')');
    const response = await fetch(processed);
    const songs: Song[] = await response.json();

    for (const song of songs){
      if (song.trackName === title && song.duration === duration){
        // Highly confident that this is right song
        displaySyncedLyrics(song);
        return true;
      }
    }
    throw new Error("found nothing");
  }
  catch(e){
    return false;
  }
}


export function displaySyncedLyrics(data: Song) {
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

  if (data.instrumental){
    currentLyrics.push({
      time: 0,
      line: "Instrumental, Enjoy!",
    })
  }
  else if (data.syncedLyrics) {
    const lines = data.syncedLyrics.split('\n');
    const parsedLyrics = lines
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
        .filter(Boolean) as { time: number; line: string }[];
    /* parsedLyrics.unshift({
      time: -1,
      line: `${album_name} • ${artist}`,
    }) */
    setCurrentLyrics(parsedLyrics);
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
        if (newActiveEl){
          newActiveEl.classList.add('active');
          if(isIdle){
            newActiveEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        if (newActiveEl && scrolledAndStopped == true) {
          newActiveEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setScrolledAndStopped(false);
          setIdle(true);
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