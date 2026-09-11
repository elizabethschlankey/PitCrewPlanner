/* ---------------------------------------------------------------
   EQUIPMENT DEFINITIONS (same catalog as the Artifact version)
---------------------------------------------------------------- */
const ICONS = {
  speaker: `<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" fill="currentColor"/><circle cx="12" cy="7" r="2.4" fill="#111" stroke="#888" stroke-width=".5"/><circle cx="12" cy="15" r="3.6" fill="#111" stroke="#888" stroke-width=".5"/><circle cx="12" cy="15" r="1.2" fill="#555"/></svg>`,
  sub: `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" fill="currentColor"/><circle cx="12" cy="12" r="6" fill="#111" stroke="#888" stroke-width=".6"/><circle cx="12" cy="12" r="2" fill="#555"/></svg>`,
  timpani: `<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="7" rx="9" ry="3.2" fill="#e7c98c" stroke="#5a3a1a" stroke-width="1"/><path d="M3 7c0 6 2 12 9 12s9-6 9-12" fill="currentColor" stroke="#5a3a1a" stroke-width="1"/></svg>`,
  drum: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="6" width="18" height="12" rx="1.5" fill="currentColor" stroke="#3a2411" stroke-width="1"/><ellipse cx="12" cy="6" rx="9" ry="2.6" fill="#e7c98c" stroke="#5a3a1a" stroke-width="1"/><ellipse cx="12" cy="18" rx="9" ry="2.6" fill="#5a3a1a"/></svg>`,
  rack: `<svg viewBox="0 0 30 24" fill="none"><rect x="2" y="3" width="26" height="18" rx="1.5" fill="currentColor"/><rect x="4" y="5.5" width="22" height="2.6" fill="#222"/><rect x="4" y="9.8" width="22" height="2.6" fill="#222"/><rect x="4" y="14.1" width="22" height="2.6" fill="#222"/><rect x="4" y="18.4" width="22" height="1.8" fill="#222"/><circle cx="7" cy="6.8" r=".8" fill="#e0b13c"/><circle cx="7" cy="11.1" r=".8" fill="#e0b13c"/><circle cx="7" cy="15.4" r=".8" fill="#4a9a5b"/></svg>`,
  podium: `<svg viewBox="0 0 24 24" fill="none"><path d="M7 3h10l-1.6 10H8.6L7 3z" fill="currentColor" stroke="#000" stroke-width="1"/><rect x="10.5" y="4.6" width="3" height="1.6" rx=".4" fill="#0009"/><rect x="5" y="13" width="14" height="2.2" rx=".6" fill="#000"/><path d="M6 15.2h12l1 5.8H5l1-5.8z" fill="currentColor" stroke="#000" stroke-width="1" opacity=".85"/></svg>`,
  generator: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 9a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7H3V9z" fill="currentColor" stroke="#0c0f13" stroke-width="1"/><rect x="3" y="16" width="18" height="3" rx="1" fill="#0c0f13"/><rect x="2" y="18.5" width="3" height="2" rx=".6" fill="#0c0f13"/><rect x="19" y="18.5" width="3" height="2" rx=".6" fill="#0c0f13"/><rect x="6" y="8" width="8" height="5" rx=".8" fill="#1c1f26"/><line x1="7" y1="9.4" x2="13" y2="9.4" stroke="#4a5262" stroke-width=".7"/><line x1="7" y1="10.8" x2="13" y2="10.8" stroke="#4a5262" stroke-width=".7"/><line x1="7" y1="12.2" x2="13" y2="12.2" stroke="#4a5262" stroke-width=".7"/><circle cx="17.5" cy="10.5" r="2.1" fill="#e0b13c" stroke="#8a6a1a" stroke-width=".5"/><rect x="17" y="3.5" width="1.4" height="3" fill="#555"/></svg>`,
  cable: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 12c0-4 4-4 4-8M20 12c0 4-4 4-4 8M8 4h-4M16 20h4" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`,
  marimba: `<svg viewBox="0 0 58 24" fill="none"><rect x="1" y="18.5" width="56" height="2.6" rx="1" fill="#3a2411"/><rect x="3" y="6" width="3" height="12.5" fill="#5a3a1a"/><rect x="10" y="7.6" width="2.8" height="10.9" fill="#5a3a1a"/><rect x="17" y="9.2" width="2.6" height="9.3" fill="#5a3a1a"/><rect x="24" y="10.6" width="2.4" height="7.9" fill="#5a3a1a"/><rect x="31" y="11.8" width="2.2" height="6.7" fill="#5a3a1a"/><rect x="38" y="12.8" width="2" height="5.7" fill="#5a3a1a"/><rect x="45" y="13.6" width="1.8" height="4.9" fill="#5a3a1a"/><rect x="52" y="14.2" width="1.6" height="4.3" fill="#5a3a1a"/><rect x="1" y="1" width="10" height="4.8" rx="1.2" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".5"/><rect x="12" y="1.6" width="8.6" height="4" rx="1.1" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".5"/><rect x="21.5" y="2.1" width="7.4" height="3.4" rx="1" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".5"/><rect x="29.8" y="2.5" width="6.4" height="2.9" rx=".9" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".5"/><rect x="37.1" y="2.8" width="5.6" height="2.5" rx=".8" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".5"/><rect x="43.6" y="3" width="4.9" height="2.2" rx=".7" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".5"/><rect x="49.4" y="3.2" width="4.2" height="1.9" rx=".6" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".5"/><rect x="54.5" y="3.3" width="2.5" height="1.7" rx=".5" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".5"/></svg>`,
  xylo: `<svg viewBox="0 0 58 24" fill="none"><rect x="1" y="16" width="56" height="2.6" rx="1" fill="#3a2411"/><rect x="4" y="13" width="2.6" height="4" fill="#5a3a1a"/><rect x="11" y="13.4" width="2.4" height="3.6" fill="#5a3a1a"/><rect x="18" y="13.8" width="2.2" height="3.2" fill="#5a3a1a"/><rect x="25" y="14.1" width="2" height="2.9" fill="#5a3a1a"/><rect x="32" y="14.4" width="1.8" height="2.6" fill="#5a3a1a"/><rect x="39" y="14.6" width="1.6" height="2.4" fill="#5a3a1a"/><rect x="46" y="14.8" width="1.4" height="2.2" fill="#5a3a1a"/><rect x="1" y="1" width="10" height="4.6" rx="1.2" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".5"/><rect x="12" y="1.6" width="8.6" height="3.9" rx="1.1" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".5"/><rect x="21.5" y="2.1" width="7.4" height="3.3" rx="1" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".5"/><rect x="29.8" y="2.5" width="6.4" height="2.8" rx=".9" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".5"/><rect x="37.1" y="2.8" width="5.6" height="2.4" rx=".8" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".5"/><rect x="43.6" y="3" width="4.9" height="2.1" rx=".7" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".5"/><rect x="49.4" y="3.2" width="4.2" height="1.8" rx=".6" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".5"/><rect x="54.5" y="3.3" width="2.5" height="1.6" rx=".5" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".5"/></svg>`,
  vibraphone: `<svg viewBox="0 0 46 24" fill="none"><rect x="1" y="18" width="44" height="2.6" rx="1" fill="#333"/><rect x="1.5" y="8" width="4.5" height="10.5" rx="1" fill="#12161c"/><circle cx="3.75" cy="12" r="1.1" fill="#e0b13c"/><ellipse cx="10.5" cy="14.5" rx="1.6" ry="4.5" fill="#8b93a3" stroke="#4a5262" stroke-width=".5"/><ellipse cx="16" cy="14.9" rx="1.5" ry="4.1" fill="#8b93a3" stroke="#4a5262" stroke-width=".5"/><ellipse cx="21.4" cy="15.2" rx="1.4" ry="3.7" fill="#8b93a3" stroke="#4a5262" stroke-width=".5"/><ellipse cx="26.6" cy="15.5" rx="1.3" ry="3.3" fill="#8b93a3" stroke="#4a5262" stroke-width=".5"/><ellipse cx="31.6" cy="15.7" rx="1.2" ry="2.9" fill="#8b93a3" stroke="#4a5262" stroke-width=".5"/><ellipse cx="36.4" cy="15.9" rx="1.1" ry="2.5" fill="#8b93a3" stroke="#4a5262" stroke-width=".5"/><rect x="8" y="1" width="6.5" height="4.4" rx="1" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".5"/><rect x="15" y="1.5" width="5.6" height="3.7" rx=".9" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".5"/><rect x="21" y="1.9" width="4.9" height="3.2" rx=".8" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".5"/><rect x="26.3" y="2.2" width="4.3" height="2.8" rx=".7" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".5"/><rect x="31" y="2.5" width="3.8" height="2.4" rx=".6" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".5"/><rect x="35.2" y="2.7" width="3.3" height="2.1" rx=".5" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".5"/><rect x="39" y="2.9" width="2.9" height="1.8" rx=".4" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".5"/></svg>`,
  drumset: `<svg viewBox="0 0 24 24" fill="none"><circle cx="8" cy="14" r="6.4" fill="currentColor" stroke="#000" stroke-width="1"/><ellipse cx="8" cy="14" rx="2.4" ry="2.4" fill="#0009"/><ellipse cx="17.5" cy="7" rx="4.6" ry="1.6" fill="#c9a227" stroke="#7a611a" stroke-width=".6"/><rect x="16.8" y="8.2" width="1.4" height="4.4" fill="#555"/><ellipse cx="4" cy="5.5" rx="3" ry="1.2" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".5"/><rect x="3.3" y="6.4" width="1.4" height="4" fill="#5a3a1a"/></svg>`,
  synth: `<svg viewBox="0 0 24 24" fill="none"><rect x="1.5" y="6" width="21" height="12" rx="1.4" fill="currentColor" stroke="#111" stroke-width="1"/><rect x="3.2" y="8" width="17.6" height="7" fill="#f4f1e8"/><rect x="4.4" y="8" width="2" height="7" fill="#12161c"/><rect x="7.4" y="8" width="2" height="7" fill="#12161c"/><rect x="10.4" y="8" width="2" height="7" fill="#12161c"/><rect x="13.4" y="8" width="2" height="7" fill="#12161c"/><rect x="16.4" y="8" width="2" height="7" fill="#12161c"/><rect x="19.4" y="8" width="1.4" height="7" fill="#12161c"/></svg>`,
  mixer: `<svg viewBox="0 0 30 24" fill="none"><rect x="2" y="3" width="26" height="18" rx="1.5" fill="currentColor" stroke="#111" stroke-width="1"/><line x1="7" y1="6" x2="7" y2="18" stroke="#12161c" stroke-width="2"/><line x1="13" y1="6" x2="13" y2="18" stroke="#12161c" stroke-width="2"/><line x1="19" y1="6" x2="19" y2="18" stroke="#12161c" stroke-width="2"/><line x1="25" y1="6" x2="25" y2="18" stroke="#12161c" stroke-width="2"/><circle cx="7" cy="14" r="2" fill="#e0b13c"/><circle cx="13" cy="9" r="2" fill="#e0b13c"/><circle cx="19" cy="15.5" r="2" fill="#e0b13c"/><circle cx="25" cy="11" r="2" fill="#e0b13c"/></svg>`
};

/* naturally-colored reference icons for the item inspector header — a
   volunteer who doesn't recognize "Timpani" by name can still see what
   it looks like. Deliberately more detailed/realistic than the flat,
   currentColor-driven ICONS above, which are tuned to read as tiny
   colored badges on the field, not as a standalone picture. */
const DETAIL_ICONS = {
  speaker: `<svg viewBox="0 0 64 64" fill="none"><rect x="10" y="4" width="44" height="56" rx="4" fill="#2b2b30" stroke="#000" stroke-width="1.5"/><rect x="13" y="7" width="38" height="50" rx="3" fill="#3a3a3f"/><rect x="24" y="1" width="16" height="4" rx="2" fill="#111"/><circle cx="32" cy="20" r="7" fill="#0c0c0e" stroke="#777" stroke-width="1.2"/><circle cx="32" cy="20" r="2.4" fill="#444"/><circle cx="32" cy="43" r="13" fill="#0c0c0e" stroke="#777" stroke-width="1.4"/><circle cx="32" cy="43" r="8" fill="#1c1c1f" stroke="#555" stroke-width=".8"/><circle cx="32" cy="43" r="3" fill="#555"/></svg>`,
  sub: `<svg viewBox="0 0 64 64" fill="none"><rect x="6" y="8" width="52" height="48" rx="4" fill="#15161a" stroke="#000" stroke-width="1.5"/><rect x="9" y="11" width="46" height="42" rx="3" fill="#202126"/><circle cx="32" cy="32" r="17" fill="#050506" stroke="#666" stroke-width="1.6"/><circle cx="32" cy="32" r="11" fill="#111318" stroke="#444" stroke-width=".8"/><circle cx="32" cy="32" r="4" fill="#3a3a3f"/><ellipse cx="14" cy="50" rx="3" ry="1.6" fill="#000" opacity=".5"/><ellipse cx="50" cy="50" rx="3" ry="1.6" fill="#000" opacity=".5"/></svg>`,
  timpani: `<svg viewBox="0 0 64 64" fill="none"><path d="M8 18c0 16 5 30 24 30s24-14 24-30" fill="#c17a3a" stroke="#5a3a1a" stroke-width="1.6"/><ellipse cx="32" cy="18" rx="24" ry="8" fill="#efe0b8" stroke="#5a3a1a" stroke-width="1.6"/><circle cx="12" cy="18.5" r="1.6" fill="#5a3a1a"/><circle cx="22" cy="11.5" r="1.6" fill="#5a3a1a"/><circle cx="42" cy="11.5" r="1.6" fill="#5a3a1a"/><circle cx="52" cy="18.5" r="1.6" fill="#5a3a1a"/><rect x="28" y="44" width="8" height="10" fill="#3a2411"/><rect x="20" y="53" width="24" height="4" rx="1.5" fill="#222"/></svg>`,
  drum: `<svg viewBox="0 0 64 64" fill="none"><rect x="6" y="12" width="52" height="40" rx="4" fill="#8a5a2e" stroke="#3a2411" stroke-width="1.6"/><ellipse cx="32" cy="12" rx="26" ry="8" fill="#efe0b8" stroke="#3a2411" stroke-width="1.6"/><ellipse cx="32" cy="52" rx="26" ry="8" fill="#3a2411"/><circle cx="10" cy="12" r="1.6" fill="#3a2411"/><circle cx="22" cy="5" r="1.6" fill="#3a2411"/><circle cx="42" cy="5" r="1.6" fill="#3a2411"/><circle cx="54" cy="12" r="1.6" fill="#3a2411"/></svg>`,
  rack: `<svg viewBox="0 0 80 64" fill="none"><rect x="4" y="4" width="72" height="56" rx="3" fill="#1b2a5e" stroke="#0c1230" stroke-width="1.6"/><rect x="8" y="9" width="64" height="9" fill="#12172c"/><rect x="8" y="21" width="64" height="9" fill="#12172c"/><rect x="8" y="33" width="64" height="9" fill="#12172c"/><rect x="8" y="45" width="64" height="9" fill="#12172c"/><circle cx="14" cy="13.5" r="2" fill="#e0b13c"/><circle cx="14" cy="25.5" r="2" fill="#4a9a5b"/><circle cx="14" cy="37.5" r="2" fill="#e0b13c"/><circle cx="14" cy="49.5" r="2" fill="#c1443a"/><rect x="24" y="10.5" width="40" height="6" rx="1" fill="#2c3f8f"/><rect x="24" y="22.5" width="40" height="6" rx="1" fill="#2c3f8f"/><rect x="24" y="34.5" width="40" height="6" rx="1" fill="#2c3f8f"/><rect x="24" y="46.5" width="40" height="6" rx="1" fill="#2c3f8f"/></svg>`,
  podium: `<svg viewBox="0 0 64 64" fill="none"><path d="M18 6h28l-5 30H23L18 6z" fill="#1b2a5e" stroke="#000" stroke-width="1.4"/><rect x="27" y="10" width="10" height="5" rx="1" fill="#0009"/><path d="M23 36h18v3H23z" fill="#000"/><path d="M15 39h34l3 19H12l3-19z" fill="#1b2a5e" stroke="#000" stroke-width="1.4" opacity=".92"/><line x1="26" y1="43" x2="38" y2="43" stroke="#0006" stroke-width="1"/><line x1="24" y1="49" x2="40" y2="49" stroke="#0006" stroke-width="1"/><rect x="10" y="58" width="44" height="4" rx="1.5" fill="#000"/></svg>`,
  generator: `<svg viewBox="0 0 64 64" fill="none"><path d="M6 24a10 10 0 0 1 10-10h32a10 10 0 0 1 10 10v18H6V24z" fill="#2f2f33" stroke="#0c0f13" stroke-width="1.4"/><rect x="6" y="42" width="52" height="8" rx="2" fill="#0c0f13"/><rect x="4" y="50" width="8" height="6" rx="1.6" fill="#0c0f13"/><rect x="52" y="50" width="8" height="6" rx="1.6" fill="#0c0f13"/><rect x="14" y="20" width="24" height="14" rx="2" fill="#1c1f26"/><line x1="17" y1="24" x2="35" y2="24" stroke="#4a5262" stroke-width="1.2"/><line x1="17" y1="28" x2="35" y2="28" stroke="#4a5262" stroke-width="1.2"/><line x1="17" y1="32" x2="35" y2="32" stroke="#4a5262" stroke-width="1.2"/><circle cx="47" cy="27" r="6" fill="#e0b13c" stroke="#8a6a1a" stroke-width="1"/><rect x="45.5" y="8" width="3" height="10" fill="#555"/><circle cx="47" cy="7" r="2.4" fill="#333"/></svg>`,
  cable: `<svg viewBox="0 0 64 64" fill="none"><path d="M10 48c0-8 8-8 8-16s-8-8-8-16 8-8 8-16" stroke="#e0b13c" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="10" cy="6" r="5" fill="#1c1c1f" stroke="#e0b13c" stroke-width="1.6"/><circle cx="10" cy="6" r="1.6" fill="#e0b13c"/><path d="M54 16c0 8-8 8-8 16s8 8 8 16-8 8-8 16" stroke="#8a93a3" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="54" cy="58" r="5" fill="#1c1c1f" stroke="#8a93a3" stroke-width="1.6"/><circle cx="54" cy="58" r="1.6" fill="#8a93a3"/></svg>`,
  marimba: `<svg viewBox="0 0 120 64" fill="none"><rect x="4" y="46" width="112" height="4" rx="1.5" fill="#3a2411"/><rect x="6" y="50" width="4" height="12" fill="#2a1a0c"/><rect x="110" y="50" width="4" height="12" fill="#2a1a0c"/><rect x="8" y="16" width="12" height="30" rx="1.5" fill="#5a3a1a"/><rect x="24" y="18" width="10.6" height="27.5" rx="1.4" fill="#5a3a1a"/><rect x="38" y="20.5" width="9.4" height="24.5" rx="1.3" fill="#5a3a1a"/><rect x="51" y="22.8" width="8.4" height="21.7" rx="1.2" fill="#5a3a1a"/><rect x="63" y="24.8" width="7.4" height="19.4" rx="1.1" fill="#5a3a1a"/><rect x="74" y="26.6" width="6.4" height="17.4" rx="1" fill="#5a3a1a"/><rect x="84" y="28.2" width="5.6" height="15.8" rx=".9" fill="#5a3a1a"/><rect x="93" y="29.6" width="4.9" height="14.4" rx=".8" fill="#5a3a1a"/><rect x="8" y="1" width="12" height="9.5" rx="2" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".7"/><rect x="24" y="3" width="10.6" height="8.2" rx="1.8" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".7"/><rect x="38" y="4.6" width="9.4" height="7" rx="1.6" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".7"/><rect x="51" y="5.8" width="8.4" height="6" rx="1.4" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".7"/><rect x="63" y="6.8" width="7.4" height="5.2" rx="1.2" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".7"/><rect x="74" y="7.6" width="6.4" height="4.6" rx="1" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".7"/><rect x="84" y="8.3" width="5.6" height="4" rx=".9" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".7"/><rect x="93" y="8.9" width="4.9" height="3.4" rx=".8" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".7"/></svg>`,
  xylo: `<svg viewBox="0 0 120 56" fill="none"><rect x="4" y="40" width="112" height="4" rx="1.5" fill="#3a2411"/><rect x="6" y="44" width="4" height="10" fill="#2a1a0c"/><rect x="110" y="44" width="4" height="10" fill="#2a1a0c"/><rect x="10" y="30" width="10" height="9" fill="#5a3a1a"/><rect x="25" y="31.6" width="8.8" height="7.6" fill="#5a3a1a"/><rect x="39" y="33" width="7.8" height="6.6" fill="#5a3a1a"/><rect x="51" y="34.2" width="6.8" height="5.8" fill="#5a3a1a"/><rect x="62" y="35.2" width="6" height="5" fill="#5a3a1a"/><rect x="72" y="36" width="5.2" height="4.4" fill="#5a3a1a"/><rect x="8" y="1" width="12" height="9" rx="2" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".7"/><rect x="24" y="3" width="10.6" height="7.8" rx="1.8" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".7"/><rect x="38" y="4.6" width="9.4" height="6.6" rx="1.6" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".7"/><rect x="51" y="5.8" width="8.4" height="5.6" rx="1.4" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".7"/><rect x="63" y="6.8" width="7.4" height="4.8" rx="1.2" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".7"/><rect x="74" y="7.6" width="6.4" height="4.2" rx="1" fill="#f4f1e8" stroke="#8a6a3a" stroke-width=".7"/></svg>`,
  vibraphone: `<svg viewBox="0 0 100 56" fill="none"><rect x="2" y="42" width="96" height="4" rx="1.5" fill="#333"/><rect x="3" y="18" width="9" height="24" rx="2" fill="#12161c"/><circle cx="7.5" cy="27" r="2.2" fill="#e0b13c"/><ellipse cx="22" cy="32" rx="3.2" ry="9" fill="#8b93a3" stroke="#4a5262" stroke-width=".6"/><ellipse cx="33" cy="32.8" rx="3" ry="8.2" fill="#8b93a3" stroke="#4a5262" stroke-width=".6"/><ellipse cx="44" cy="33.4" rx="2.8" ry="7.4" fill="#8b93a3" stroke="#4a5262" stroke-width=".6"/><ellipse cx="54" cy="34" rx="2.6" ry="6.6" fill="#8b93a3" stroke="#4a5262" stroke-width=".6"/><ellipse cx="64" cy="34.6" rx="2.4" ry="5.8" fill="#8b93a3" stroke="#4a5262" stroke-width=".6"/><ellipse cx="74" cy="35" rx="2.2" ry="5" fill="#8b93a3" stroke="#4a5262" stroke-width=".6"/><rect x="16" y="1" width="13" height="9" rx="2" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".6"/><rect x="30" y="2.6" width="11.2" height="7.6" rx="1.8" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".6"/><rect x="42" y="3.8" width="9.8" height="6.6" rx="1.6" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".6"/><rect x="53" y="4.6" width="8.6" height="5.8" rx="1.4" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".6"/><rect x="63" y="5.2" width="7.6" height="5.2" rx="1.2" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".6"/><rect x="72" y="5.6" width="6.6" height="4.6" rx="1" fill="#c7d0dc" stroke="#5c6b82" stroke-width=".6"/><rect x="46" y="46" width="4" height="8" fill="#222"/><rect x="40" y="53" width="16" height="3" rx="1" fill="#111"/></svg>`,
  drumset: `<svg viewBox="0 0 64 64" fill="none"><circle cx="22" cy="42" r="17" fill="#3a3a3f" stroke="#000" stroke-width="1.4"/><circle cx="22" cy="42" r="6" fill="#0009"/><rect x="30" y="20" width="16" height="12" rx="1.6" fill="#e7c98c" stroke="#5a3a1a" stroke-width="1.2"/><line x1="30" y1="26" x2="46" y2="26" stroke="#5a3a1a" stroke-width=".8"/><ellipse cx="50" cy="12" rx="12" ry="3" fill="#c9a227" stroke="#7a611a" stroke-width="1"/><rect x="49.2" y="15" width="1.6" height="10" fill="#555"/><ellipse cx="10" cy="10" rx="8" ry="2.4" fill="#e7c98c" stroke="#5a3a1a" stroke-width=".8"/><rect x="9.3" y="12.4" width="1.4" height="9" fill="#5a3a1a"/></svg>`,
  synth: `<svg viewBox="0 0 100 48" fill="none"><rect x="2" y="6" width="96" height="36" rx="2.4" fill="#12161c" stroke="#000" stroke-width="1.2"/><rect x="6" y="18" width="88" height="20" fill="#f4f1e8"/><line x1="17" y1="18" x2="17" y2="38" stroke="#12161c" stroke-width="1"/><line x1="28" y1="18" x2="28" y2="38" stroke="#12161c" stroke-width="1"/><line x1="39" y1="18" x2="39" y2="38" stroke="#12161c" stroke-width="1"/><line x1="50" y1="18" x2="50" y2="38" stroke="#12161c" stroke-width="1"/><line x1="61" y1="18" x2="61" y2="38" stroke="#12161c" stroke-width="1"/><line x1="72" y1="18" x2="72" y2="38" stroke="#12161c" stroke-width="1"/><line x1="83" y1="18" x2="83" y2="38" stroke="#12161c" stroke-width="1"/><rect x="13" y="18" width="6" height="12" fill="#12161c"/><rect x="24" y="18" width="6" height="12" fill="#12161c"/><rect x="46" y="18" width="6" height="12" fill="#12161c"/><rect x="57" y="18" width="6" height="12" fill="#12161c"/><rect x="68" y="18" width="6" height="12" fill="#12161c"/><circle cx="14" cy="12" r="2.6" fill="#e0b13c"/><circle cx="24" cy="12" r="2.6" fill="#e0b13c"/><circle cx="34" cy="12" r="2.6" fill="#e0b13c"/><rect x="50" y="9" width="24" height="6" rx="1.4" fill="#2c3f8f"/></svg>`,
  mixer: `<svg viewBox="0 0 100 60" fill="none"><rect x="2" y="2" width="96" height="56" rx="3" fill="#12161c" stroke="#000" stroke-width="1.4"/><line x1="16" y1="8" x2="16" y2="52" stroke="#2c3f8f" stroke-width="2.4"/><line x1="32" y1="8" x2="32" y2="52" stroke="#2c3f8f" stroke-width="2.4"/><line x1="48" y1="8" x2="48" y2="52" stroke="#2c3f8f" stroke-width="2.4"/><line x1="64" y1="8" x2="64" y2="52" stroke="#2c3f8f" stroke-width="2.4"/><line x1="80" y1="8" x2="80" y2="52" stroke="#2c3f8f" stroke-width="2.4"/><rect x="12" y="30" width="8" height="5" rx="1.4" fill="#e0b13c"/><rect x="28" y="16" width="8" height="5" rx="1.4" fill="#e0b13c"/><rect x="44" y="38" width="8" height="5" rx="1.4" fill="#e0b13c"/><rect x="60" y="22" width="8" height="5" rx="1.4" fill="#e0b13c"/><rect x="76" y="34" width="8" height="5" rx="1.4" fill="#e0b13c"/><circle cx="16" cy="12" r="3" fill="#2f2f33" stroke="#666" stroke-width=".6"/><circle cx="32" cy="12" r="3" fill="#2f2f33" stroke="#666" stroke-width=".6"/><circle cx="48" cy="12" r="3" fill="#2f2f33" stroke="#666" stroke-width=".6"/><circle cx="64" cy="12" r="3" fill="#2f2f33" stroke="#666" stroke-width=".6"/><circle cx="80" cy="12" r="3" fill="#2f2f33" stroke="#666" stroke-width=".6"/></svg>`
};

/* sizes are relative footprints, not literal scale — small = podiums/
   markers, large = marimba/sub/generator — so the pit box zoom view
   reads like a real setup chart instead of a wall of same-size icons.
   `ar` (width/height) gives naturally-wide gear (racks, bar percussion)
   a wide footprint instead of squeezing it into a square. */
const CATALOG = [
  {id:'generator',  name:'Generator',      icon:'generator', color:'#2f2f33', size:20},
  {id:'mixer',      name:'Mixer',          icon:'mixer',     color:'#12161c', size:16, ar:1.25},
  {id:'podL',       name:'Large Podium',   icon:'podium',    color:'#1b2a5e', size:14},
  {id:'podM',       name:'Medium Podium',  icon:'podium',    color:'#12161c', size:16},
  {id:'podS',       name:'Small Podium',   icon:'podium',    color:'#1b2a5e', size:14},
  {id:'sub',        name:'Subwoofer',      icon:'sub',       color:'#12161c', size:26},
  {id:'spkSL',      name:'Left Small Speaker',   icon:'speaker', color:'#3a3a3f', size:13},
  {id:'spkLL',      name:'Left Large Speaker',   icon:'speaker', color:'#2c3f8f', size:21},
  {id:'spkSR',      name:'Right Small Speaker',  icon:'speaker', color:'#3a3a3f', size:13},
  {id:'spkLR',      name:'Right Large Speaker',  icon:'speaker', color:'#2c3f8f', size:21},
];
const INSTRUMENT_CATALOG = [
  {id:'inst-vibe',      name:'Vibraphone',   icon:'vibraphone', color:'#5c6b82', size:20, ar:1.9},
  {id:'inst-marimba',   name:'Marimba',      icon:'marimba',    color:'#8a5a2e', size:22, ar:2.4},
  {id:'inst-xylo',      name:'Xylophone',    icon:'xylo',       color:'#c9a227', size:18, ar:2.2},
  {id:'inst-rack',      name:'Rack',         icon:'rack',       color:'#2c3f8f', size:22, ar:1.25},
  {id:'inst-timpani',   name:'Timpani',      icon:'timpani',    color:'#8a5a2e', size:26},
  {id:'inst-drumset',   name:'Drum Set',     icon:'drumset',    color:'#3a3a3f', size:25},
  {id:'inst-synth',     name:'Synth',        icon:'synth',      color:'#12161c', size:19},
  {id:'bass',           name:'Bass Drum',    icon:'drum',       color:'#8a5a2e', size:24},
];
const CUSTOM_DEFAULTS = {icon:'cable', color:'#5b6472', size:19};

// a brand-new template starts pre-loaded with this layout instead of a
// blank field. This is the *real* setup from the Coppell Away game (the
// first event built in this app) — same items, same positions, same
// wiring/setup notes and helper tags — since that's the actual set
// expected to carry forward to every upcoming game. Positions are
// percentages of the field; helpersNeeded/notes/timing are omitted where
// they'd just be the defaults (1 helper, no note, no timing).
const STARTER_TEMPLATE_ITEMS = [
  {typeId:'inst-timpani', label:'Timpani',              xPct:74.86, yPct:74.74, needsHelp:true},
  {typeId:'mixer',        label:'Mixer',                xPct:49.45, yPct:95.05, needsHelp:true, helpersNeeded:2,
    notes:'The Mixer will connect to the Subwoofer and the other to the generator.  This will require two individuals as it is heavy and bulky!'},
  {typeId:'sub',          label:'Subwoofer',            xPct:49.42, yPct:84.70, needsHelp:true},
  {typeId:'inst-vibe',    label:'Vibraphone',           xPct:31.55, yPct:71.02},
  {typeId:'inst-vibe',    label:'Vibraphone',           xPct:40.84, yPct:71.42, timing:'halftime'},
  {typeId:'inst-vibe',    label:'Vibraphone',           xPct:44.73, yPct:70.83},
  {typeId:'inst-vibe',    label:'Vibraphone',           xPct:54.70, yPct:70.89},
  {typeId:'inst-vibe',    label:'Vibraphone',           xPct:59.67, yPct:71.20},
  {typeId:'inst-vibe',    label:'Vibraphone',           xPct:64.17, yPct:71.04},
  {typeId:'inst-vibe',    label:'Vibraphone',           xPct:36.30, yPct:71.22},
  {typeId:'inst-marimba', label:'Marimba',              xPct:43.11, yPct:78.35},
  {typeId:'inst-marimba', label:'Marimba',              xPct:37.31, yPct:78.25},
  {typeId:'inst-marimba', label:'Marimba',              xPct:32.11, yPct:78.84},
  {typeId:'inst-marimba', label:'Marimba',              xPct:49.55, yPct:77.67},
  {typeId:'inst-marimba', label:'Marimba',              xPct:55.71, yPct:78.16},
  {typeId:'inst-marimba', label:'Marimba',              xPct:61.34, yPct:78.35},
  {typeId:'inst-marimba', label:'Marimba',              xPct:67.32, yPct:78.16},
  {typeId:'inst-synth',   label:'Synth',                xPct:23.98, yPct:79.04, timing:'halftime'},
  {typeId:'inst-synth',   label:'Synth',                xPct:27.62, yPct:78.74},
  {typeId:'inst-drumset', label:'Drum Set',             xPct:49.62, yPct:70.54, needsHelp:true},
  {typeId:'spkSR',        label:'Right Small Speaker',  xPct:55.83, yPct:86.85, needsHelp:true,
    notes:'Small speaker yellow and orange wires go to the subwoofer  for power and sound'},
  {typeId:'spkSL',        label:'Left Small Speaker',   xPct:44.63, yPct:87.08, needsHelp:true},
  {typeId:'spkLL',        label:'Left Large Speaker',   xPct:36.22, yPct:87.37, needsHelp:true, timing:'anytime',
    notes:'L left speaker brown connector wire goes into the S left speaker. Make sure wires are clean and excess goes under speaker.'},
  {typeId:'spkLR',        label:'Right Large Speaker',  xPct:64.13, yPct:85.92, needsHelp:true,
    notes:'Right L speak has yellow wire hooks into the small right speaker.  Make sure wires are nice and straight and excess should be put under the speaker out of sight.'},
  {typeId:'inst-rack',    label:'Rack',                 xPct:26.86, yPct:71.12},
  {typeId:'inst-rack',    label:'Rack',                 xPct:68.24, yPct:71.65},
  {typeId:'podL',         label:'Large Podium',         xPct:50.26, yPct:63.64, needsHelp:true},
  {typeId:'podL',         label:'Large Podium',         xPct:21.64, yPct:64.46, needsHelp:true, timing:'anytime'},
  {typeId:'podL',         label:'Large Podium',         xPct:78.37, yPct:64.17, needsHelp:true},
  {typeId:'podM',         label:'Medium Podium',        xPct:35.75, yPct:12.90, needsHelp:true},
  {typeId:'podM',         label:'Medium Podium',        xPct:64.30, yPct:13.72, needsHelp:true},
  {typeId:'bass',         label:'Bass Drum',            xPct:23.52, yPct:71.04, needsHelp:true,
    notes:'Help student with bulky items'},
  {typeId:'bass',         label:'Bass Drum',            xPct:71.54, yPct:71.83},
  {typeId:'generator',    label:'Generator',            xPct:41.21, yPct:93.75, needsHelp:true},
];

const TIMING_OPTIONS = [
  {v:'', label:'— Not set —'},
  {v:'pre', label:'Pre-Event Setup'},
  {v:'before-kickoff', label:'Before Kickoff / Downbeat'},
  {v:'halftime', label:'Halftime Swap'},
  {v:'post', label:'Post-Event Teardown'},
  {v:'anytime', label:'Anytime'},
];
// "Timpani" and "Rack" used to exist as separate Equipment-tab AND
// Instruments-tab entries (identical icon/color, different id) — their
// counts never matched what was actually on the field. Consolidated
// down to one entry each (under Instruments); this keeps any item
// placed under the old id resolving to the same visual definition.
const LEGACY_TYPE_ALIASES = {timpani:'inst-timpani', rack:'inst-rack'};
function resolveTypeId(typeId){
  return LEGACY_TYPE_ALIASES[typeId] || typeId;
}
function catalogFor(typeId){
  if(typeId.startsWith('custom:')) return {id:typeId, name:typeId.slice(7), ...CUSTOM_DEFAULTS};
  typeId = resolveTypeId(typeId);
  return CATALOG.find(c=>c.id===typeId) || INSTRUMENT_CATALOG.find(c=>c.id===typeId) || {id:typeId, name:typeId, ...CUSTOM_DEFAULTS};
}
// on-screen chip dimensions for a catalog entry — width follows the
// optional `ar` (width/height) so wide gear (racks, bar percussion)
// renders as a wide footprint instead of being squeezed into a square.
function chipDims(cat){
  return {w: Math.round(cat.size*(cat.ar||1)), h: cat.size};
}

// shorten an equipment label for the crowded on-field tag (the palette,
// inspector, and assignments panel keep the full name) — a generic
// word-abbreviation pass so it still works if the catalog gets renamed
const ABBR_WORDS = {
  Left:'L', Right:'R', Large:'Lg', Small:'Sm', Medium:'Med',
  Podium:'Pod', Speaker:'Spkr', Generator:'Gen', Subwoofer:'Sub',
  Vibraphone:'Vibe', Timpani:'Timp', Drum:'Dr', Synthesizer:'Synth'
};
function abbreviateLabel(name){
  let s = name.split(/\s+/).map(w=>ABBR_WORDS[w]||w).join(' ');
  if(s.length>11) s = s.slice(0,10)+'…';
  return s;
}

