/* ===== Somali - Nhân vật thỏ minh họa (nguyên bản, không dùng IP có bản quyền) ===== */

const MASCOT_BACKDROPS = {
  wave: '#FCE3EC',
  book: '#DFF3EE',
  heart: '#FDE6EC',
  sleepy: '#FFF1DA',
};

function mascotSvg(type, size = 96) {
  const backdrop = MASCOT_BACKDROPS[type] || '#FCE3EC';
  const earsRot = type === 'sleepy'
    ? `<ellipse cx="38" cy="30" rx="10" ry="22" fill="#F9C9DB" transform="rotate(-45 38 30)"/>
       <ellipse cx="38" cy="30" rx="5" ry="14" fill="#F5A9C6" transform="rotate(-45 38 30)"/>
       <ellipse cx="82" cy="30" rx="10" ry="22" fill="#F9C9DB" transform="rotate(45 82 30)"/>
       <ellipse cx="82" cy="30" rx="5" ry="14" fill="#F5A9C6" transform="rotate(45 82 30)"/>`
    : `<ellipse cx="42" cy="24" rx="11" ry="24" fill="#F9C9DB" transform="rotate(-16 42 24)"/>
       <ellipse cx="42" cy="26" rx="5.5" ry="16" fill="#F5A9C6" transform="rotate(-16 42 24)"/>
       <ellipse cx="78" cy="24" rx="11" ry="24" fill="#F9C9DB" transform="rotate(16 78 24)"/>
       <ellipse cx="78" cy="26" rx="5.5" ry="16" fill="#F5A9C6" transform="rotate(16 78 24)"/>`;

  let face, arms;
  if (type === 'sleepy') {
    face = `<path d="M46 60 Q51 62 56 60" stroke="#5B3A4A" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M64 60 Q69 62 74 60" stroke="#5B3A4A" stroke-width="3" fill="none" stroke-linecap="round"/>
            <ellipse cx="60" cy="72" rx="3" ry="2.3" fill="#F5A9C6"/>
            <path d="M55 78 Q60 80 65 78" stroke="#5B3A4A" stroke-width="2" fill="none" stroke-linecap="round"/>
            <text x="88" y="42" font-size="16" fill="#D8BC8E" font-family="sans-serif">z</text>
            <text x="97" y="30" font-size="12" fill="#D8BC8E" font-family="sans-serif">z</text>`;
    arms = '';
  } else if (type === 'book') {
    face = `<path d="M46 59 Q51 55 56 59" stroke="#5B3A4A" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M64 59 Q69 55 74 59" stroke="#5B3A4A" stroke-width="3" fill="none" stroke-linecap="round"/>
            <ellipse cx="60" cy="70" rx="3" ry="2.3" fill="#F5A9C6"/>
            <path d="M54 76 Q60 80 66 76" stroke="#5B3A4A" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
    arms = `<g transform="translate(34,98)">
              <path d="M0 8 Q13 0 26 8 L26 22 Q13 15 0 22 Z" fill="#8FD4C4"/>
              <path d="M26 8 Q39 0 52 8 L52 22 Q39 15 26 22 Z" fill="#6FC0B0"/>
              <line x1="26" y1="8" x2="26" y2="22" stroke="#4E9E90" stroke-width="1.5"/>
            </g>`;
  } else if (type === 'heart') {
    face = `<path d="M45 57 Q51 50 57 57" stroke="#5B3A4A" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M63 57 Q69 50 75 57" stroke="#5B3A4A" stroke-width="3" fill="none" stroke-linecap="round"/>
            <ellipse cx="60" cy="70" rx="3" ry="2.3" fill="#F5A9C6"/>
            <path d="M52 75 Q60 84 68 75" stroke="#5B3A4A" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
    arms = `<path d="M40 100 Q50 118 60 108" stroke="#FFFFFF" stroke-width="11" fill="none" stroke-linecap="round"/>
            <path d="M80 100 Q70 118 60 108" stroke="#FFFFFF" stroke-width="11" fill="none" stroke-linecap="round"/>
            <path d="M60 100 c-6 -8 -18 -2 -12 8 c4 6 12 10 12 14 c0 -4 8 -8 12 -14 c6 -10 -6 -16 -12 -8 z" fill="#F27C9C"/>`;
  } else {
    // wave
    face = `<path d="M46 58 Q51 53 56 58" stroke="#5B3A4A" stroke-width="3" fill="none" stroke-linecap="round"/>
            <path d="M64 58 Q69 53 74 58" stroke="#5B3A4A" stroke-width="3" fill="none" stroke-linecap="round"/>
            <ellipse cx="60" cy="70" rx="3" ry="2.3" fill="#F5A9C6"/>
            <path d="M53 76 Q60 82 67 76" stroke="#5B3A4A" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
    arms = `<ellipse cx="36" cy="112" rx="7" ry="11" fill="#FFFFFF" transform="rotate(15 36 112)"/>
            <path d="M86 106 Q104 96 99 76" stroke="#FFFFFF" stroke-width="11" fill="none" stroke-linecap="round"/>
            <circle cx="99" cy="76" r="8" fill="#FFFFFF"/>`;
  }

  return `<svg viewBox="0 0 120 130" width="${size}" height="${size * 130 / 120}" aria-hidden="true">
    <circle cx="60" cy="70" r="52" fill="${backdrop}"/>
    ${earsRot}
    <circle cx="60" cy="64" r="34" fill="#FFFFFF"/>
    <ellipse cx="41" cy="70" rx="6.5" ry="4.5" fill="#FBC7D4" opacity="0.9"/>
    <ellipse cx="79" cy="70" rx="6.5" ry="4.5" fill="#FBC7D4" opacity="0.9"/>
    ${face}
    <ellipse cx="60" cy="112" rx="28" ry="20" fill="#FFFFFF"/>
    ${arms}
  </svg>`;
}
