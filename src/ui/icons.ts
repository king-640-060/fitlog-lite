export type IconName = 'home' | 'settings' | 'utensils' | 'dumbbell' | 'scale' | 'plus' | 'x' | 'search' | 'archive' | 'check' | 'trash' | 'edit' | 'download' | 'upload' | 'chevron' | 'calendar' | 'activity' | 'trend' | 'more' | 'leaf' | 'info' | 'sunrise' | 'sun' | 'moon' | 'snack' | 'stairs'

const iconPaths: Record<IconName, string> = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10M9 20v-6h6v6"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z"/><circle cx="12" cy="12" r="3"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  dumbbell: '<path d="M14.4 14.4 9.6 9.6M18.7 21.3l2.6-2.6M2.7 5.3l2.6-2.6M21.3 18.7l-3.4-3.4M8.7 6.1 5.3 2.7M16 16l-4 4-8-8 4-4M20 12l-8-8-4 4 8 8Z"/>',
  scale: '<path d="m16 16 3-8 3 8a5 5 0 0 1-6 0ZM2 16l3-8 3 8a5 5 0 0 1-6 0ZM7 21h10M12 3v18M3 7h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="m18 6-12 12M6 6l12 12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  archive: '<path d="M3 6h18M5 6v14h14V6M8 3h8l2 3H6l2-3Z"/><path d="M9 11h6"/>',
  check: '<path d="m20 6-11 11-5-5"/>', trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
  download: '<path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14"/>', upload: '<path d="M12 21V9m0 0 4 4m-4-4-4 4M5 3h14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>', calendar: '<path d="M3 5h18v16H3zM16 3v4M8 3v4M3 10h18"/>',
  activity: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  stairs: '<path d="M3 20h5v-5h5v-5h5V5h3"/>',
  trend: '<path d="M3 18 9 12l4 4 8-9"/><path d="M15 7h6v6"/>',
  more: '<circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/>',
  leaf: '<path d="M20 4C12 4 6 8 6 14c0 3 2 5 5 5 6 0 9-7 9-15Z"/><path d="M4 21c2-5 6-9 12-12"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  sunrise: '<path d="M3 18h18M6 14a6 6 0 0 1 12 0M12 3v3M4.5 7.5l2 2M19.5 7.5l-2 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 15.2A8.7 8.7 0 0 1 8.8 3.5 8.7 8.7 0 1 0 20.5 15.2Z"/>',
  snack: '<path d="M6 11h12l-1.2 8H7.2L6 11ZM5 11h14M8 8c0-1.3 1-2 2-2m4 2c0-1.3 1-2 2-2"/>',
}

export function icon(name: IconName, size = 20): string {
  return `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`
}

