import {
    isDragging,
    startX,
    startY,
    memorizedSelectedText,
    isPlainText,
    setStartX,
    setStartY,
    setIsDragging,
    setMemorizedSelectedText,
    setScrolledAndStopped,
    setIdle,
    setPreferredLanguage,
    rotationDeg,
    setRotationDegree,
    currentLyrics,
    translationEnabled,
    setTranslationEnabled,
    translatedLyrics,
    setTranslatedLyrics,
} from '../../state/lyricsState';
import { fetchAndDisplayLyrics, handleTranslations } from '../../utils/lyricsFetcher';
import { processFullLyrics } from '../../utils/translate';
import { closeLyricsPage } from './index';
import { pauseRotation, resumeRotation } from './utils';

export function attachEventHandlers(lyricsContainer: HTMLElement) {
    // Attach selection and drag events to the scrollable lyrics container
    const lyricsScrollContainer = document.getElementById('lyrics-scroll-container');
    if (!lyricsScrollContainer) return;
    
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
  
      // Option menu
      const settingsButton = document.getElementById('lyrics-settings-button');
      const settingsMenu = document.getElementById('lyrics-settings-menu');
  
      if (settingsButton && settingsMenu) {
        // Toggle menu visibility when gear icon is clicked
        settingsButton.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevents the 'click outside' listener from firing immediately
          const isHidden = settingsMenu.style.display === 'none';
          settingsMenu.style.display = isHidden ? 'block' : 'none';
        });
  
        settingsButton.addEventListener('mouseenter', () => (settingsButton.style.backgroundColor = 'rgba(255,255,255,0.1)'));
        settingsButton.addEventListener('mouseleave', () => (settingsButton.style.backgroundColor = 'transparent'));
      
        // Close menu if user clicks anywhere else on the lyrics page
        lyricsContainer.addEventListener('click', (e) => {
          // If the click is outside the menu and not on the button, hide the menu
          if (settingsMenu.style.display === 'block' && !settingsMenu.contains(e.target as Node) && e.target !== settingsButton) {
            settingsMenu.style.display = 'none';
          }
        });
  
        const languageSelect = document.getElementById('setting-language-select') as HTMLSelectElement;
        if (languageSelect) {
          // Load saved preference on startup
          const savedLanguage = Spicetify.LocalStorage.get('lyrics-plus-language') || 'any';
          setPreferredLanguage(savedLanguage);
          languageSelect.value = savedLanguage;
  
          // Add listener for changes
          languageSelect.addEventListener('change', () => {
            const newLanguage = languageSelect.value;
            // Update state and save to local storage
            setPreferredLanguage(newLanguage);
            Spicetify.LocalStorage.set('lyrics-plus-language', newLanguage);
            Spicetify.showNotification(`Lyrics language set to: ${languageSelect.options[languageSelect.selectedIndex].text}`);
          });
        }
      
        // Album Rotation Toggle
        const rotationToggle = document.getElementById('setting-toggle-rotation') as HTMLInputElement;
        if (rotationToggle) {
          rotationToggle.addEventListener('change', () => {
            const albumImg = document.getElementById("lyrics-album-image");
            if (!albumImg) return;
          
            if (rotationToggle.checked) {
              // If it's checked, resume rotation
              resumeRotation(albumImg, rotationDeg); 
            } else {
              // If it's unchecked, pause rotation
              const savedAngle = pauseRotation(albumImg);
              setRotationDegree(savedAngle);
            }
          });
        }

        const translateToggle = document.getElementById('setting-toggle-translation') as HTMLInputElement;
        if (translateToggle) {
          // Load saved preference
          //const savedTranslationToggle = Spicetify.LocalStorage.get('translation-enabled') === 'true';
          //translateToggle.checked = savedTranslationToggle;
          //setTranslationEnabled(savedTranslationToggle);
          const savedPreference = Spicetify.LocalStorage.get('translation-enabled') === 'true';
          translateToggle.checked = savedPreference;
          setTranslationEnabled(savedPreference);
          translateToggle.addEventListener('change', () => {
            if (!currentLyrics || currentLyrics.length === 0) {
              Spicetify.showNotification('Lyrics not available for translation.', true);
              translateToggle.checked = !translateToggle.checked; // Revert the checkbox
              return;
            }
            handleTranslations();
            Spicetify.LocalStorage.set('translation-enabled', translateToggle.checked.toString());
            //Spicetify.showNotification(`Translations ${translateToggle.checked ? 'Enabled' : 'Disabled'}`);
          });
        }
      }
    }
}
