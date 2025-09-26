import {
    isAlbumRotating,
    rotationDeg,
    setAlbumRotating,
    setRotationDegree,
} from '../../state/lyricsState';

export function handleAlbumRotation() {
    const albumImg = document.getElementById("lyrics-album-image");
    if (!albumImg) return;
    if (isAlbumRotating) {
      const saveAngle = pauseRotation(albumImg);
      setRotationDegree(saveAngle);
    } else {
      resumeRotation(albumImg,rotationDeg);
    }
}
  
export function pauseRotation(albumImg:any) {
    const angle = getCurrentRotation();
  
    albumImg.classList.remove("rotating");
  
    albumImg.style.transform = `rotate(${angle}deg)`;
    setAlbumRotating(false);
  
    return angle;
}
  
export function resumeRotation(albumImg:any, startAngle:number) {
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
  
export function updateRotationKeyframes(startAngle = 0) {
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

export function resetLyricsViewScroll() {
    const lyricsScrollContainer = document.getElementById('lyrics-scroll-container');
    if (lyricsScrollContainer) {
      lyricsScrollContainer.scrollTop = 0;
    }
}

export function test(message:string){
    Spicetify.showNotification(message);
}
