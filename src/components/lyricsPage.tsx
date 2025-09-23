import {
  originalPageState,
  lyricsPageActive,
  isDragging,
  startX,
  startY,
  memorizedSelectedText,
  highlightInterval,
  setOriginalPageState,
  setLyricsPageActive,
  setIsDragging,
  setStartX,
  setStartY,
  setMemorizedSelectedText,
  setCurrentHighlightedLine,
  setHighlightInterval,
  isAlbumRotating,
  setAlbumRotating,
  rotationDeg,
  setRotationDegree,
  scrolledAndStopped,
  setScrolledAndStopped,
  setIdle,
  isPlainText
} from '../state/lyricsState';
import { fetchAndDisplayLyrics } from '../utils/lyricsFetcher';
import { updateAlbumImage, getAlbumImageUrl } from '../utils/albumImageFetcher';

// Create lyrics page with proper cleanup
export function showLyricsPage() {
  // If already showing, don't recreate
  if (lyricsPageActive) {
    return;
  }

  const mainView =
    document.querySelector('.main-view-container__scroll-node-child') ||
    document.querySelector('.Root__main-view > div') ||
    document.querySelector('.Root__main-view');

  const topBar = document.querySelector('.main-topBar-container');

  if (!mainView) {
    return;
  }

  if (topBar) {
    (topBar as HTMLElement).style.display = 'none';
  }

  // Store original page state (we no longer need scrollNode)
  const children = Array.from(mainView.children);
  setOriginalPageState({
    children: children,
    parent: mainView,
    topBar: topBar, // Store the top bar element
    originalTopBarDisplay: topBar ? (topBar as HTMLElement).style.display : '', // Store its style
  });

  // Hide original content
  children.forEach((child) => {
    (child as HTMLElement).style.display = 'none';
  });

  // Create the main lyrics page container
  const lyricsContainer = document.createElement('div');
  lyricsContainer.id = 'custom-lyrics-page';
  lyricsContainer.style.cssText = `
    position: fixed; /*Use fixed positioning for a true overlay */
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--background-base, #121212);
    color: var(--text-base, #ffffff);
    z-index: 9999; /*This will now work correctly */
    user-select: text;
    display: flex;
    flex-direction: row;
    overflow: hidden; /*Still good practice to contain children */
  `;

  // Create the lyrics page content with a two-column structure
  const lyricsHTML = `
    <!-- Dynamic Background -->
    <div id="lyrics-background" style="
      position: absolute;
      top: -50px; left: -50px; right: -50px; bottom: -50px;
      background-size: cover;
      background-position: center;
      filter: blur(50px) brightness(0.6);
      transform: scale(1.1);
      opacity: 0;
      transition: opacity 1s ease-in-out;
      z-index: -1;
    "></div>

    <!-- Left Column: Information -->
    <div style="
      width: 350px;
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      flex-shrink: 0;
      z-index: 1;
      height: 100%; /* Fill parent height */
      box-sizing: border-box;
    ">
      <!-- Back Button -->
      <button id="lyrics-back-button" style="
        background:transparent; border: none; color: var(--text-base, #ffffff);
        cursor: pointer; padding: 6px; border-radius: 50%; width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        transition: background-color 0.2s; flex-shrink: 0; margin-bottom: 20px;
      ">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14.5 7.5H3.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L3.707 8.5H14.5a.5.5 0 0 0 0-1z"/>
        </svg>
      </button>

      <!-- Album Image -->
      <img id="lyrics-album-image" src="" alt="Album Art" style="
        width: 250px; height: 250px; border-radius: 50%; object-fit: cover;
        flex-shrink: 0; margin-bottom: 20px;
      "/>

      <!-- Track Info Header -->
      <div id="track-info-header" style="text-align: center; font-size: 24px; font-weight: bold; margin-bottom: 10px;"></div>
      <div id="track-info-artist" style="text-align: center; font-size: 18px; opacity: 0.7;"></div>

      <!-- Copy Button -->
      <button id="lyrics-copy-button" style="
        background:transparent; border: none; color: var(--text-base, #ffffff);
        cursor: pointer; padding: 6px; border-radius: 50%; width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        transition: background-color 0.2s; flex-shrink: 0; margin-top: 20px;
      ">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
          <path d="M9.5 1a.5.5 0 0 1 .5.5V3H6V1.5a.5.5 0 0 1 .5-.5h3zM6 2h4v-.5H6.5a.5.5 0 0 1-.5.5zm3 3.5V7H6V5.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5z"/>
        </svg>
      </button>
    </div>

    <!-- Right Column: Lyrics -->
    <div id="lyrics-scroll-container" style="
      flex-grow: 1; /* Take remaining width */
      height: 100%; /* Fill parent height */
      overflow-y: auto;
      overflow-x: hidden;
      padding: 32px 64px;
      max-width: 800px;
      margin: 0 auto;
      box-sizing: border-box;
      z-index: 1;
    ">
      <div id="lyrics-loading" style="text-align: center; padding: 64px 0;">
        <div style="font-size: 48px; margin-bottom: 16px;">🎵</div>
        <p>Loading lyrics...</p>
      </div>
      <div id="lyrics-content" style="display: none;"></div>
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
  
  lyricsContainer.setAttribute('tabindex', '0'); // Make it focusable
  lyricsContainer.focus();

  updateAlbumImage();
  updateLyricsBackground();

  // Attach selection and drag events to the scrollable lyrics container
  const lyricsScrollContainer = document.getElementById('lyrics-scroll-container');
  if (!lyricsScrollContainer) return;
  
  lyricsScrollContainer.addEventListener('mousedown', (e) => {
    setStartX(e.clientX);
    setStartY(e.clientY);
    setIsDragging(false);
  });

  // Attach selection and drag events to the scrollable lyrics container
  lyricsScrollContainer.addEventListener('mousedown', (e) => {
    setStartX(e.clientX);
    setStartY(e.clientY);
    setIsDragging(false);
  });

  lyricsScrollContainer.addEventListener('mousemove', (e) => {
    if (e.buttons === 1) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        if (!isDragging) {
          setIsDragging(true);
        }
      }
    }
  });

  lyricsScrollContainer.addEventListener('mouseup', () => {
    if (isDragging) {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        setMemorizedSelectedText(selection.toString());
      } else {
        setMemorizedSelectedText(null);
      }
    }
    setIsDragging(false);
  });

  // Handle a scroll timer of 3 seconds
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

  lyricsScrollContainer.onscroll = function () {
    setScrolledAndStopped(false);
    setIdle(false);

    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(() => {
      setScrolledAndStopped(true);
    }, 2000);
  };

  // Attach global events (copy, context menu, keyboard) to the main container
  lyricsContainer.addEventListener('copy', (e) => e.stopPropagation());
  lyricsContainer.addEventListener('contextmenu', (e) => e.stopPropagation());
  lyricsContainer.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'c') {
      const selectedText = window.getSelection()?.toString();
      if (selectedText) {
        try {
          if (document.execCommand('copy')) {
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
      e.stopPropagation();
      e.preventDefault();
    }
  });

  // Add back button functionality
  const backButton = document.getElementById('lyrics-back-button');
  if (backButton) {
    backButton.addEventListener('click', closeLyricsPage);
    backButton.addEventListener('mouseenter', () => (backButton.style.backgroundColor = 'rgba(255,255,255,0.1)'));
    backButton.addEventListener('mouseleave', () => (backButton.style.backgroundColor = 'transparent'));
  }

  // Add copy button functionality
  const copyButton = document.getElementById('lyrics-copy-button');
  if (copyButton) {
    copyButton.addEventListener('click', async () => {
      if (isPlainText == true){
        return;
      }
      lyricsContainer.focus();
      const selection = window.getSelection();
      let textToCopy = '';

      if (memorizedSelectedText) {
        textToCopy = memorizedSelectedText;
      } else if (selection && selection.toString().length > 0) {
        textToCopy = selection.toString();
      } else {
        const lyricsContentEl = document.getElementById('lyrics-content');
        if (lyricsContentEl) {
          textToCopy = lyricsContentEl.innerText;
        }
      }

      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          Spicetify.showNotification('Lyrics copied to clipboard!', false);
        } catch (err) {
          Spicetify.showNotification('Failed to copy lyrics.', true);
        }
      } else {
        Spicetify.showNotification('No lyrics to copy.', true);
      }
    });
    copyButton.addEventListener('mouseenter', () => (copyButton.style.backgroundColor = 'rgba(255,255,255,0.1)'));
    copyButton.addEventListener('mouseleave', () => (copyButton.style.backgroundColor = 'transparent'));
  }

  // Fetch and display lyrics
  fetchAndDisplayLyrics();

  // Add a style element for the background animation
  const styleEl = document.createElement('style');
  styleEl.id = 'custom-lyrics-background-style';
  styleEl.innerHTML = `
    @keyframes backgroundPan {
      0%, 100% { background-position: 0% 0%; }
      25% { background-position: 10% 20%; }
      50% { background-position: 0% 0%; }
      75% { background-position: -10% -20%; }
    }
    #lyrics-background {
      animation: backgroundPan 60s linear infinite;
    }
    #lyrics-scroll-container {
      scrollbar-width: none;
    }
  `;
  document.head.appendChild(styleEl);

  // If the song is playing before the lyrics page set it rotating, otherwise no
  updateRotationKeyframes(rotationDeg);
  const albumImg = document.getElementById("lyrics-album-image");
  if (!albumImg) return;
  albumImg.classList.add("rotating");
  setAlbumRotating(true);
  if (Spicetify.Player.isPlaying() != true){
    // We still inject the animation but set it not playing
    albumImg.classList.remove("rotating");
    setAlbumRotating(false)
  }
}

function test(message:string){
  Spicetify.showNotification(message);
}

export function handleAlbumRotation() {
  const albumImg = document.getElementById("lyrics-album-image");
  if (!albumImg) return;
  const angle = "angle " + getCurrentRotation();
  if (isAlbumRotating) {
    const saveAngle = pauseRotation(albumImg);
    setRotationDegree(saveAngle);
  } else {
    resumeRotation(albumImg,rotationDeg);
  }
}

function pauseRotation(albumImg:any) {
  const angle = getCurrentRotation();

  albumImg.classList.remove("rotating");

  albumImg.style.transform = `rotate(${angle}deg)`;
  setAlbumRotating(false);

  return angle;
}

function resumeRotation(albumImg:any, startAngle:number) {
  updateRotationKeyframes(startAngle);

  // Reflow to apply the new animation rules
  albumImg.classList.remove("rotating");
  void albumImg.offsetWidth;
  albumImg.classList.add("rotating");

  setAlbumRotating(true);
}

function getCurrentRotation() {
  const albumImg = document.getElementById("lyrics-album-image");
  if (!albumImg) return 0;

  const style = window.getComputedStyle(albumImg);
  const transform = style.getPropertyValue("transform");

  if (!transform || transform === "none") {
    return 0; // no rotation
  }

  // transform looks like "matrix(a, b, c, d, e, f)"
  const vals = transform.split("(")[1].split(")")[0].split(",");
  const a = Number(vals[0]);
  const b = Number(vals[1]);

  let angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
  if (angle < 0) {
    angle += 360;
  }
  return angle;
}

function updateRotationKeyframes(startAngle = 0) {
  const styleId = "rotation-keyframes-style";
  let styleEl = document.getElementById(styleId) as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    @keyframes rotation {
      from { transform: rotate(${startAngle}deg); }
      to { transform: rotate(${startAngle + 360}deg); }
    }

    #lyrics-album-image.rotating{
      animation: rotation 10s linear infinite;
    }
  `;
}

// Function to update the dynamic background
export function updateLyricsBackground() {
  const backgroundEl = document.getElementById('lyrics-background') as HTMLElement;
  const imageUrl = getAlbumImageUrl();
  if (backgroundEl && imageUrl) {
    backgroundEl.style.backgroundImage = `url(${imageUrl})`;
    backgroundEl.style.opacity = '1';
  }
}

// Properly close the lyrics page
export function closeLyricsPage() {
  if (!lyricsPageActive || !originalPageState) {
    return;
  }

  // Clear intervals and state
  if (highlightInterval) {
    clearInterval(highlightInterval);
    setHighlightInterval(null);
  }
  setCurrentHighlightedLine(null);
  setMemorizedSelectedText(null);

  // Remove lyrics page elements
  document.getElementById('custom-lyrics-page')?.remove();
  document.getElementById('custom-lyrics-style')?.remove();
  document.getElementById('custom-lyrics-background-style')?.remove();
  document.getElementById('album-rotation-style')?.remove();
  setRotationDegree(0); // When closing the tab just reset the rotation

  // Restore original content visibility
  if (originalPageState.children) {
    originalPageState.children.forEach((child: Element) => {
      (child as HTMLElement).style.display = '';
    });
  }

  if (originalPageState.topBar) {
    // Restore topbar
    (originalPageState.topBar as HTMLElement).style.display = originalPageState.originalTopBarDisplay || '';
  }
  
  setLyricsPageActive(false);
  setOriginalPageState(null);
}

export function resetLyricsViewScroll() {
  const lyricsScrollContainer = document.getElementById('lyrics-scroll-container');
  if (lyricsScrollContainer) {
    lyricsScrollContainer.scrollTop = 0;
  }
}