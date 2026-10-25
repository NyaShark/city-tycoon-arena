const ICONS = {
  "building-2": [
    '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>',
    '<path d="M6 12H4a2 2 0 0 0-2 2v8h4"/>',
    '<path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/>',
    '<path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>'
  ],
  building: [
    '<rect width="16" height="20" x="4" y="2" rx="2"/>',
    '<path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/>',
    '<path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/>',
    '<path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>'
  ],
  flag: [
    '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>',
    '<line x1="4" x2="4" y1="22" y2="15"/>'
  ],
  spark: [
    '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>'
  ],
  receipt: [
    '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>',
    '<path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>'
  ],
  train: [
    '<rect width="16" height="16" x="4" y="3" rx="2"/>',
    '<path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/>',
    '<path d="M8 15h.01"/><path d="M16 15h.01"/>'
  ],
  bolt: [
    '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>'
  ],
  lock: [
    '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>',
    '<path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  ],
  unlock: [
    '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>',
    '<path d="M7 11V7a5 5 0 0 1 9.9-1"/>'
  ],
  trees: [
    '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"/>',
    '<path d="M7 16v6"/><path d="M13 19v3"/>',
    '<path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5"/>'
  ],
  police: [
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    '<path d="M12 8v4"/><path d="M12 16h.01"/>'
  ],
  landmark: [
    '<line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/>',
    '<line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/>',
    '<line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/>'
  ],
  wrench: [
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'
  ],
  chart: [
    '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/>',
    '<path d="M13 17V5"/><path d="M8 17v-3"/>'
  ],
  trending: [
    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>',
    '<polyline points="16 7 22 7 22 13"/>'
  ],
  "trending-down": [
    '<polyline points="22 17 13.5 8.5 8.5 13.5 2 7"/>',
    '<polyline points="16 17 22 17 22 11"/>'
  ],
  search: [
    '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'
  ],
  users: [
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>',
    '<circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>'
  ],
  ticket: [
    '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>',
    '<path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>'
  ],
  gift: [
    '<rect x="3" y="8" width="18" height="4" rx="1"/>',
    '<path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/>',
    '<path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>'
  ],
  handshake: [
    '<path d="m11 17 2 2a1 1 0 1 0 3-3"/>',
    '<path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-4-4"/>',
    '<path d="m21 3-2.8 2.8a2 2 0 0 1-2.8 0l-2.4-2.4a2 2 0 0 0-2.8 0L7 6.6a2 2 0 0 0 0 2.8l2.2 2.2"/>',
    '<path d="M3 7.5 7.5 3"/><path d="m3 3 2.8 2.8a2 2 0 0 0 2.8 0l.4-.4"/>'
  ],
  coins: [
    '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>',
    '<path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>'
  ],
  home: [
    '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    '<polyline points="9 22 9 12 15 12 15 22"/>'
  ],
  "arrow-right": [
    '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'
  ],
  key: [
    '<circle cx="7.5" cy="15.5" r="5.5"/>',
    '<path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>'
  ],
  gavel: [
    '<path d="m14.5 12.5-8 8a2.12 2.12 0 1 1-3-3l8-8"/>',
    '<path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>'
  ],
  hammer: [
    '<path d="m15 12-8.4 8.4a2.1 2.1 0 1 1-3-3L12 9"/>',
    '<path d="M17.6 4.4 20 2l2 2-2.4 2.4a2 2 0 0 1-2.8 0l-.8-.8a2 2 0 0 1 0-2.8Z"/>',
    '<path d="m9 7 4-4"/><path d="m13 11 4-4"/>'
  ],
  banknote: [
    '<rect width="20" height="12" x="2" y="6" rx="2"/>',
    '<circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/>'
  ],
  skull: [
    '<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>',
    '<path d="M8 20v2h8v-2"/><path d="M12.5 22v-2"/>',
    '<path d="M17 20a7 7 0 1 0-10 0"/>'
  ],
  crown: [
    '<path d="M11.56 3.27a.53.53 0 0 1 .88 0l3.17 4.64a1 1 0 0 0 1.52.2L20.7 5.3a.5.5 0 0 1 .8.53l-2.46 11.1a2 2 0 0 1-1.96 1.57H6.92a2 2 0 0 1-1.96-1.57L2.5 5.83a.5.5 0 0 1 .8-.53l3.57 2.81a1 1 0 0 0 1.52-.2z"/>',
    '<path d="M5 21h14"/>'
  ],
  x: ['<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'],
  refresh: [
    '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>',
    '<path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>',
    '<path d="M8 16H3v5"/>'
  ],
  volume: [
    '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3l3.8 3.8a.7.7 0 0 0 1.2-.5z"/>',
    '<path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.4 5.6a10 10 0 0 1 0 12.8"/>'
  ],
  "volume-x": [
    '<path d="M11 4.7a.7.7 0 0 0-1.2-.5L6 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h3l3.8 3.8a.7.7 0 0 0 1.2-.5z"/>',
    '<path d="m16 9 6 6"/><path d="m22 9-6 6"/>'
  ],
  "rotate-ccw": [
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>',
    '<path d="M3 3v5h5"/>'
  ],
  play: ['<polygon points="6 3 20 12 6 21 6 3"/>'],
  dice: [
    '<rect width="18" height="18" x="3" y="3" rx="2"/>',
    '<path d="M8 8h.01"/><path d="M16 8h.01"/><path d="M8 16h.01"/>',
    '<path d="M16 16h.01"/><path d="M12 12h.01"/>'
  ],
  bag: [
    '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>',
    '<path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'
  ],
  check: ['<path d="M20 6 9 17l-5-5"/>'],
  "chevron-right": ['<path d="m9 18 6-6-6-6"/>'],
  briefcase: [
    '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    '<rect width="20" height="14" x="2" y="6" rx="2"/>'
  ],
  dot: ['<circle cx="12" cy="12" r="2"/>'],
  "arrow-up": ['<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>'],
  "arrow-down": ['<path d="m19 12-7 7-7-7"/><path d="M12 5v14"/>',
  ],
  "circle-dollar": [
    '<circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>',
    '<path d="M12 18V6"/>'
  ]
};

export function icon(name, className = "") {
  const paths = ICONS[name] || ICONS.dot;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths.join("")}</svg>`;
}
