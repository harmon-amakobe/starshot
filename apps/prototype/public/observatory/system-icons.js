// Small inline control drawings keep this local study independent of icon CDNs.
const paths={
 'arrow-up-right':'<path d="M6 18 18 6M6 6h12v12"/>',
 'clock-3':'<circle cx="12" cy="12" r="9"/><path d="M12 6v6h5"/>',
 'calendar-days':'<rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4m8-4v4M4 11h16M8 15h1m6 0h1M8 18h1"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
 crosshair:'<circle cx="12" cy="12" r="7"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
 fuel:'<path d="M4 21V4h10v17M4 11h10m0-4 4 4v7a2 2 0 0 0 4 0V9l-3-3M2 21h14"/>',
 gauge:'<path d="M4 19a10 10 0 1 1 16 0ZM12 13l5-5"/><circle cx="12" cy="13" r="1"/>',
 layers:'<path d="m3 8 9-5 9 5-9 5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
 route:'<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h7a4 4 0 0 1 0 8H9a3 3 0 0 0 0 6h7"/>',
 'chevron-down':'<path d="m6 9 6 6 6-6"/>', 'chevron-left':'<path d="m15 6-6 6 6 6"/>','chevron-right':'<path d="m9 6 6 6-6 6"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',x:'<path d="m6 6 12 12M6 18 18 6"/>',
 play:'<path d="m8 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',
 scan:'<path d="M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5"/>',
 'minimize-2':'<path d="m3 3 6 6M9 3v6H3m18 12-6-6m0 6v-6h6"/>',
 'maximize-2':'<path d="M15 3h6v6m0-6-6 6M9 21H3v-6m0 6 6-6"/>',
 smile:'<circle cx="12" cy="12" r="9"/><path d="M8 14q4 5 8 0M8 9h.1M16 9h.1"/>',
 orbit:'<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-35 12 12)"/><circle cx="20" cy="6" r="1.5" fill="currentColor"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
 'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
 ruler:'<path d="m3 16 13-13 5 5L8 21Zm7-7 2 2m1-5 2 2m-8 4 2 2m-5 1 2 2"/>'
};
globalThis.lucide={createIcons(){for(const element of document.querySelectorAll('i[data-lucide]')){
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 for(const [key,value] of Object.entries({viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor','stroke-width':1.7,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);
 svg.setAttribute('class',element.className);svg.innerHTML=paths[element.dataset.lucide]||paths.orbit;element.replaceWith(svg);
}}};
