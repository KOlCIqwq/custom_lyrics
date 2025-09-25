// Store references to avoid UI corruption
export type OriginalPageState = {
  children: Element[];
  parent: Element;
  topBar: Element | null;
  originalTopBarDisplay: string;
} | null;

export let originalPageState: OriginalPageState = null;
export let lyricsPageActive = false;
export let isDragging = false;
export let startX: number;
export let startY: number;
export let memorizedSelectedText: string | null = null;
export let currentLyrics: { time: number; line: string }[] = [];
export let highlightInterval: number | null = null;
export let currentHighlightedLine: string | null = null;
export let isAlbumRotating = false;
export let rotationDeg: number;
export let scrolledAndStopped = false;
export let isIdle = true;
export let isPlainText = false;
export let preferredLanguage: string = 'any';

export function setPreferredLanguage(lang: string) {
  preferredLanguage = lang;
}

export function setIsPlainText(active:boolean){
  isPlainText = active;
}

export function setIdle(active: boolean){
  isIdle = active;
}

export function setScrolledAndStopped(state: boolean){
  scrolledAndStopped = state;
}

export function setOriginalPageState(state: OriginalPageState) {
  originalPageState = state;
}

export function setAlbumRotating(active: boolean){
  isAlbumRotating = active;
}

export function setRotationDegree(degree:number){
  rotationDeg = degree;
}

export function setLyricsPageActive(active: boolean) {
  lyricsPageActive = active;
}

export function setIsDragging(dragging: boolean) {
  isDragging = dragging;
}

export function setStartX(x: number) {
  startX = x;
}

export function setStartY(y: number) {
  startY = y;
}

export function setMemorizedSelectedText(text: string | null) {
  memorizedSelectedText = text;
}

export function setCurrentLyrics(lyrics: { time: number; line: string }[]) {
  currentLyrics = lyrics;
}

export function setHighlightInterval(interval: number | null) {
  highlightInterval = interval;
}

export function setCurrentHighlightedLine(lineId: string | null) {
  currentHighlightedLine = lineId;
}
