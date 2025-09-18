(async function() {
        while (!Spicetify.React || !Spicetify.ReactDOM) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        var custom_lyrics = (() => {
  // src/state/lyricsState.ts
  var originalPageState = null;
  var lyricsPageActive = false;
  var isDragging = false;
  var startX;
  var startY;
  var memorizedSelectedText = null;
  var currentLyrics = [];
  var highlightInterval = null;
  var currentHighlightedLine = null;
  function setOriginalPageState(state) {
    originalPageState = state;
  }
  function setLyricsPageActive(active) {
    lyricsPageActive = active;
  }
  function setIsDragging(dragging) {
    isDragging = dragging;
  }
  function setStartX(x) {
    startX = x;
  }
  function setStartY(y) {
    startY = y;
  }
  function setMemorizedSelectedText(text) {
    memorizedSelectedText = text;
  }
  function setCurrentLyrics(lyrics) {
    currentLyrics = lyrics;
  }
  function setHighlightInterval(interval) {
    highlightInterval = interval;
  }
  function setCurrentHighlightedLine(lineId) {
    currentHighlightedLine = lineId;
  }

  // src/utils/lyricsFetcher.ts
  async function fetchAndDisplayLyrics() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    const loadingEl = document.getElementById("lyrics-loading");
    const contentEl = document.getElementById("lyrics-content");
    const errorEl = document.getElementById("lyrics-error");
    const headerInfo = document.getElementById("track-info-header");
    const artistInfo = document.getElementById("track-info-artist");
    const errorDetails = document.getElementById("error-details");
    if (contentEl)
      contentEl.innerHTML = "";
    if (loadingEl)
      loadingEl.style.display = "none";
    if (errorEl)
      errorEl.style.display = "none";
    if (highlightInterval) {
      clearInterval(highlightInterval);
      setHighlightInterval(null);
    }
    setCurrentHighlightedLine(null);
    setCurrentLyrics([]);
    if (!((_c = (_b = (_a = window.Spicetify) == null ? void 0 : _a.Player) == null ? void 0 : _b.data) == null ? void 0 : _c.item)) {
      if (errorEl)
        errorEl.style.display = "block";
      if (errorDetails)
        errorDetails.textContent = "No track currently playing";
      return;
    }
    const track = (_d = window.Spicetify.Player.data) == null ? void 0 : _d.item;
    if (!track || !track.artists || !track.artists.length) {
      window.Spicetify.showNotification("Could not get track info.", true);
      return;
    }
    const artist = (_e = track.artists[0].name) != null ? _e : "";
    const title = track.name;
    const album_name = (_g = (_f = track.album) == null ? void 0 : _f.name) != null ? _g : "";
    const duration = (_i = (_h = track.duration) == null ? void 0 : _h.milliseconds) != null ? _i : 0;
    const duration_in_seconds = Math.ceil(duration / 1e3);
    if (headerInfo) {
      headerInfo.textContent = title;
    }
    if (artistInfo) {
      artistInfo.textContent = artist;
    }
    try {
      const baseUrl = "https://lrclib.net/api/get";
      const queryParams = new URLSearchParams({
        artist_name: artist,
        track_name: title,
        album_name,
        duration: duration_in_seconds.toString()
      });
      const url = `${baseUrl}?${queryParams.toString()}`;
      const processed = url.replace(/%20/g, "+").replace(/%28/g, "(").replace(/%29/g, ")");
      const response = await fetch(processed);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      displaySyncedLyrics(data);
    } catch (error) {
      if (loadingEl)
        loadingEl.style.display = "none";
      if (contentEl)
        contentEl.style.display = "none";
      if (errorEl)
        errorEl.style.display = "block";
      if (errorDetails)
        errorDetails.textContent = `${title} by ${artist}`;
      if (highlightInterval) {
        clearInterval(highlightInterval);
        setHighlightInterval(null);
      }
      setCurrentHighlightedLine(null);
      setCurrentLyrics([]);
    }
  }
  function displaySyncedLyrics(data) {
    const contentEl = document.getElementById("lyrics-content");
    const loadingEl = document.getElementById("lyrics-loading");
    const errorEl = document.getElementById("lyrics-error");
    if (loadingEl)
      loadingEl.style.display = "none";
    if (errorEl) {
      errorEl.style.display = "none";
      setCurrentLyrics([]);
    }
    if (contentEl)
      contentEl.style.display = "block";
    setCurrentLyrics([]);
    if (highlightInterval) {
      clearInterval(highlightInterval);
      setHighlightInterval(null);
    }
    setCurrentHighlightedLine(null);
    if (data.syncedLyrics) {
      const lines = data.syncedLyrics.split("\n");
      setCurrentLyrics(
        lines.map((line) => {
          const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
          if (match) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const milliseconds = parseInt(match[3], 10);
            const time = minutes * 60 + seconds + milliseconds / (match[3].length === 3 ? 1e3 : 100);
            const text = match[4].trim();
            if (text)
              return { time, line: text };
          }
          return null;
        }).filter(Boolean)
      );
    }
    if (currentLyrics.length === 0 && data.plainLyrics) {
      data.plainLyrics.split("\n").map((line) => line.trim()).filter(Boolean).forEach((line) => currentLyrics.push({ time: 0, line }));
    }
    if (contentEl) {
      contentEl.innerHTML = currentLyrics.map((lyric, index) => `<p id="lyric-line-${index}" class="lyric-line" data-time="${lyric.time}">${lyric.line}</p>`).join("");
      contentEl.addEventListener("click", (e) => {
        const selection = window.getSelection();
        const selectedTextLength = selection ? selection.toString().length : 0;
        if (!isDragging && selectedTextLength === 0) {
          const target = e.target;
          if (target && target.classList.contains("lyric-line")) {
            const time = parseFloat(target.dataset.time || "0");
            if (time > 0) {
              window.Spicetify.Player.seek(time * 1e3);
              if (currentHighlightedLine) {
                const prevActiveEl = document.getElementById(currentHighlightedLine);
                if (prevActiveEl) {
                  prevActiveEl.classList.remove("active");
                }
              }
              target.classList.add("active");
              setCurrentHighlightedLine(target.id);
              target.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
        } else if (isDragging) {
        } else if (selectedTextLength > 0) {
        }
      });
    }
    const styleEl = document.createElement("style");
    styleEl.id = "custom-lyrics-style";
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
    setHighlightInterval(
      window.setInterval(() => {
        const progress = window.Spicetify.Player.getProgress();
        const seconds = progress / 1e3;
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
              prevActiveEl.classList.remove("active");
            }
          }
          const newActiveEl = document.getElementById(newActiveLineId);
          if (newActiveEl) {
            newActiveEl.classList.add("active");
            newActiveEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          setCurrentHighlightedLine(newActiveLineId);
        } else if (!newActiveLineId && currentHighlightedLine) {
          const prevActiveEl = document.getElementById(currentHighlightedLine);
          if (prevActiveEl) {
            prevActiveEl.classList.remove("active");
          }
          setCurrentHighlightedLine(null);
        }
      }, 500)
    );
  }

  // src/utils/albumImageFetcher.ts
  function updateAlbumImage() {
    var _a, _b, _c, _d, _e, _f;
    const albumImage = document.getElementById("lyrics-album-image");
    if (albumImage && ((_f = (_e = (_d = (_c = (_b = (_a = window.Spicetify) == null ? void 0 : _a.Player) == null ? void 0 : _b.data) == null ? void 0 : _c.item) == null ? void 0 : _d.album) == null ? void 0 : _e.images) == null ? void 0 : _f.length) > 0) {
      albumImage.src = window.Spicetify.Player.data.item.album.images[0].url;
    }
  }

  // src/components/lyricsPage.tsx
  function showLyricsPage() {
    if (lyricsPageActive) {
      return;
    }
    const mainView = document.querySelector(".main-view-container__scroll-node-child") || document.querySelector(".main-view-container__scroll-node") || document.querySelector(".Root__main-view > div") || document.querySelector(".Root__main-view");
    if (!mainView) {
      return;
    }
    const children = Array.from(mainView.children);
    setOriginalPageState({
      children,
      parent: mainView
    });
    children.forEach((child) => {
      child.style.display = "none";
    });
    const lyricsContainer = document.createElement("div");
    lyricsContainer.id = "custom-lyrics-page";
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
    user-select: text; /* Allow text selection */
    tabindex="0"; /* Make the container focusable */
    display: flex; /* Enable flexbox for two-column layout */
    flex-direction: row; /* Arrange children in a row */
  `;
    const lyricsHTML = `
    <!-- Left Column: Album Image and Track Info -->
    <div style="
      width: 30%; /* Adjust width as needed */
      padding: 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      flex-shrink: 0;
      position: sticky;
      top: 0;
      height: 100vh; /* Take full viewport height */
      overflow-y: auto; /* Scroll if content overflows */
    ">
      <!-- Back Button -->
      <button id="lyrics-back-button" style="
        background:transparent;
        border: none;
        color: var(--text-base, #ffffff);
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        flex-shrink: 0;
        margin-bottom: 20px;
      ">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14.5 7.5H3.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L3.707 8.5H14.5a.5.5 0 0 0 0-1z"/>
        </svg>
      </button>

      <!-- Album Image -->
      <img id="lyrics-album-image" src="" alt="Album Art" style="
        width: 200px; /* Larger image size */
        height: 200px;
        border-radius: 8px;
        object-fit: cover;
        flex-shrink: 0;
        margin-bottom: 20px;
      "/>

      <!-- Track Info Header -->
      <div id="track-info-header" style="
        text-align: center;
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 10px;
      "></div>
      <div id="track-info-artist" style="
        text-align: center;
        font-size: 18px;
        opacity: 0.7;
      "></div>

      <!-- Copy Button -->
      <button id="lyrics-copy-button" style="
        background:transparent;
        border: none;
        color: var(--text-base, #ffffff);
        cursor: pointer;
        padding: 6px;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        flex-shrink: 0;
        margin-top: 20px;
      ">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
          <path d="M9.5 1a.5.5 0 0 1 .5.5V3H6V1.5a.5.5 0 0 1 .5-.5h3zM6 2h4v-.5H6.5a.5.5 0 0 1-.5.5zm3 3.5V7H6V5.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5z"/>
        </svg>
      </button>
    </div>

    <!-- Right Column: Lyrics Content -->
    <div style="
      flex-grow: 1; /* Take remaining width */
      padding: 32px;
      max-width: 800px;
      margin: 0 auto;
      overflow-y: auto; /* Make this column scrollable */
      height: 100vh; /* Take full viewport height */
    ">
      <div id="lyrics-loading" style="text-align: center; padding: 64px 0;">
        <div style="font-size: 48px; margin-bottom: 16px;">\u{1F3B5}</div>
        <p>Loading lyrics...</p>
      </div>

      <div id="lyrics-content" style="display: none;">
      </div>

      <div id="lyrics-error" style="display: none; text-align: center; padding: 64px 0;">
        <div style="font-size: 48px; margin-bottom: 16px;">\u{1F614}</div>
        <p>No lyrics found for this track</p>
        <p id="error-details" style="opacity: 0.7; font-size: 14px; margin-top: 8px;"></p>
      </div>
    </div>
  `;
    lyricsContainer.innerHTML = lyricsHTML;
    mainView.appendChild(lyricsContainer);
    setLyricsPageActive(true);
    lyricsContainer.focus();
    updateAlbumImage();
    lyricsContainer.addEventListener("mousedown", (e) => {
      setStartX(e.clientX);
      setStartY(e.clientY);
      setIsDragging(false);
    });
    lyricsContainer.addEventListener("mousemove", (e) => {
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
    lyricsContainer.addEventListener("mouseup", () => {
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
    lyricsContainer.addEventListener("copy", (e) => {
      e.stopPropagation();
    });
    lyricsContainer.addEventListener("contextmenu", (e) => {
      e.stopPropagation();
    });
    lyricsContainer.addEventListener("keydown", (e) => {
      var _a;
      if (e.ctrlKey && e.key === "c") {
        const selectedText = (_a = window.getSelection()) == null ? void 0 : _a.toString();
        if (selectedText) {
          try {
            const successful = document.execCommand("copy");
            if (successful) {
              Spicetify.showNotification("Lyrics copied to clipboard!", false);
            } else {
              Spicetify.showNotification("Failed to copy lyrics.", true);
            }
          } catch (err) {
            Spicetify.showNotification("Failed to copy lyrics.", true);
          }
        } else {
          Spicetify.showNotification("No text selected to copy.", true);
        }
        e.stopPropagation();
        e.preventDefault();
      }
    });
    const backButton = document.getElementById("lyrics-back-button");
    if (backButton) {
      backButton.addEventListener("click", closeLyricsPage);
      backButton.addEventListener("mouseenter", () => {
        backButton.style.backgroundColor = "rgba(255,255,255,0.1)";
      });
      backButton.addEventListener("mouseleave", () => {
        backButton.style.backgroundColor = "transparent";
      });
    }
    const copyButton = document.getElementById("lyrics-copy-button");
    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        lyricsContainer.focus();
        const selection = window.getSelection();
        let textToCopy = "";
        if (memorizedSelectedText) {
          textToCopy = memorizedSelectedText;
        } else if (selection && selection.toString().length > 0) {
          textToCopy = selection.toString();
        } else {
          const lyricsContentEl = document.getElementById("lyrics-content");
          if (lyricsContentEl) {
            textToCopy = lyricsContentEl.innerText;
          }
        }
        if (textToCopy) {
          const tempTextArea = document.createElement("textarea");
          tempTextArea.value = textToCopy;
          document.body.appendChild(tempTextArea);
          tempTextArea.select();
          try {
            const successful = document.execCommand("copy");
            if (successful) {
              Spicetify.showNotification("Lyrics copied to clipboard!", false);
            } else {
              Spicetify.showNotification("Failed to copy lyrics.", true);
            }
          } catch (err) {
            Spicetify.showNotification("Failed to copy lyrics.", true);
          } finally {
            document.body.removeChild(tempTextArea);
          }
        } else {
          Spicetify.showNotification("No lyrics to copy.", true);
        }
      });
      copyButton.addEventListener("mouseenter", () => {
        copyButton.style.backgroundColor = "rgba(255,255,255,0.1)";
      });
      copyButton.addEventListener("mouseleave", () => {
        copyButton.style.backgroundColor = "transparent";
      });
    }
    fetchAndDisplayLyrics();
  }
  function closeLyricsPage() {
    if (!lyricsPageActive || !originalPageState) {
      return;
    }
    if (highlightInterval) {
      clearInterval(highlightInterval);
      setHighlightInterval(null);
    }
    setCurrentHighlightedLine(null);
    setMemorizedSelectedText(null);
    const lyricsContainer = document.getElementById("custom-lyrics-page");
    if (lyricsContainer) {
      lyricsContainer.remove();
    }
    const styleEl = document.getElementById("custom-lyrics-style");
    if (styleEl) {
      styleEl.remove();
    }
    if (originalPageState && originalPageState.children) {
      originalPageState.children.forEach((child) => {
        child.style.display = "";
      });
    }
    setLyricsPageActive(false);
    setOriginalPageState(null);
  }

  // src/components/lyricsButton.tsx
  function createLyricsButton() {
    let attempts = 0;
    const tryCreateButton = () => {
      attempts++;
      if (document.querySelector("#spotify-lyrics-button")) {
        return;
      }
      const selectors = [
        ".main-nowPlayingBar-extraControls",
        ".ExtraControls",
        ".main-nowPlayingBar-right",
        '[data-testid="now-playing-bar"] .main-nowPlayingBar-right',
        ".player-controls__right",
        ".now-playing-bar__right"
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
          createFloatingButton();
          return;
        }
      }
      const button = document.createElement("button");
      button.id = "spotify-lyrics-button";
      button.className = "Button-sc-1dqy6lx-0 Button-small-small Button-ui-variant-ghost";
      button.setAttribute("aria-label", "Lyrics");
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
      button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        showLyricsPage();
      });
      button.addEventListener("mouseenter", () => {
        button.style.color = "var(--text-base, #ffffff)";
        button.style.backgroundColor = "rgba(255,255,255,0.1)";
        button.style.transform = "scale(1.06)";
      });
      button.addEventListener("mouseleave", () => {
        button.style.color = "var(--text-subdued, #b3b3b3)";
        button.style.backgroundColor = "transparent";
        button.style.transform = "scale(1)";
      });
      container.appendChild(button);
    };
    tryCreateButton();
  }
  function createFloatingButton() {
    if (document.querySelector("#spotify-lyrics-button-floating")) {
      return;
    }
    const button = document.createElement("button");
    button.id = "spotify-lyrics-button-floating";
    button.innerHTML = "Lyrics";
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
    button.addEventListener("click", showLyricsPage);
    button.addEventListener("mouseenter", () => {
      button.style.transform = "scale(1.05)";
      button.style.boxShadow = "0 6px 16px rgba(0,0,0,0.5)";
    });
    button.addEventListener("mouseleave", () => {
      button.style.transform = "scale(1)";
      button.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
    });
    document.body.appendChild(button);
  }

  // src/event-handlers/globalEventHandlers.ts
  function setupGlobalEventHandlers() {
    var _a, _b, _c;
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "l") {
        e.preventDefault();
        if (lyricsPageActive) {
          closeLyricsPage();
        } else {
          showLyricsPage();
        }
      }
    });
    if ((_c = (_b = (_a = window.Spicetify) == null ? void 0 : _a.Platform) == null ? void 0 : _b.History) == null ? void 0 : _c.listen) {
      window.Spicetify.Platform.History.listen(() => {
        if (lyricsPageActive) {
          closeLyricsPage();
        }
      });
    }
    async function main2() {
      var _a2, _b2, _c2;
      let attempts = 0;
      while (!((_b2 = (_a2 = window.Spicetify) == null ? void 0 : _a2.Player) == null ? void 0 : _b2.data) && attempts < 100) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      if (!((_c2 = window.Spicetify) == null ? void 0 : _c2.Player)) {
        return;
      }
      setTimeout(createLyricsButton, 1e3);
      if (window.Spicetify.Player.addEventListener) {
        window.Spicetify.Player.addEventListener("songchange", () => {
          if (highlightInterval) {
            clearInterval(highlightInterval);
            setHighlightInterval(null);
          }
          setCurrentHighlightedLine(null);
          if (lyricsPageActive) {
            fetchAndDisplayLyrics();
          }
          setMemorizedSelectedText(null);
          updateAlbumImage();
        });
      }
    }
    main2();
  }

  // src/app.tsx
  async function main() {
    setupGlobalEventHandlers();
  }
  var app_default = main;

  // ../../../../Local/Temp/spicetify-creator/index.jsx
  (async () => {
    await app_default();
  })();
})();

      })();