import { rotationDeg, setRotationDegree } from "../state/lyricsState";

declare global {
  interface Window {
    Spicetify: any;
  }
}

export function getAlbumImageUrl(): string | null {
  if (window.Spicetify?.Player?.data?.item?.album?.images?.length > 0) {
    return window.Spicetify.Player.data.item.album.images[0].url;
  }
  return null;
}

export function updateAlbumImage() {
  const albumImage = document.getElementById('lyrics-album-image') as HTMLImageElement;
  const imageUrl = getAlbumImageUrl();
  if (albumImage && imageUrl) {
    albumImage.src = imageUrl;
  }
  /* if (imageUrl && albumImage.src !== imageUrl) {
    setRotationDegree(0);
  }
  albumImage.style.transform = `rotate(${rotationDeg})`; */
}