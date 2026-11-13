// Genera los diagramas de arquitectura (estilo AWS Architecture Icons) en inglés y español.
// Uso: node docs/architecture/build-diagrams.js   (o pnpm docs:diagrams)
// Salida: docs/architecture/{architecture,dataflow}.{en,es}.svg

const fs = require('fs');
const path = require('path');

const OUT = __dirname;
const FONT = 'Arial, Helvetica, sans-serif';

// Colores por categoría, como en la paleta de AWS.
const C = {
  ink: '#232F3E',
  grey: '#545B64',
  front: '#8C4FFF',
  compute: '#ED7100',
  security: '#DD344C',
  storage: '#7AA116',
  messaging: '#E7157B',
  files: '#01A88D',
  brand: '#0E5E63',
};

// Glifos de 24×24 (los mismos trazos de components/Icon.tsx) más algunos propios del diagrama.
const G = {
  phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  screens: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  onboarding: 'M5 12l5 5 9-10',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  database: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4',
  gear: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  widget: 'M4 4h16v7H4zM4 15h7v5H4zM15 15h5v5h-5z',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  key: 'M8 14a4 4 0 1 1 3.5-6H21v3h-2v3h-3v-3h-4.5A4 4 0 0 1 8 14z',
  fingerprint: 'M12 11v3a8 8 0 0 1-1.5 4.7M8 9.5a4 4 0 0 1 8 0V13M5 12a7 7 0 0 1 12.5-4.3M19 12v1a12 12 0 0 1-.8 4.3M8.5 14.5A5 5 0 0 1 8 17',
  bell: 'M6 17V11a6 6 0 0 1 12 0v6l2 2H4zM10 21h4',
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
  folder: 'M3 6h6l2 2h10v11H3z',
  user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21a8 8 0 0 1 16 0',
  form: 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h3',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function glyph(name, x, y, size, color = '#fff', stroke = 1.8) {
  const s = size / 24;
  return `<path d="${G[name]}" transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${color}" stroke-width="${stroke / s * s}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** Ícono de servicio: cuadrado de color con glifo blanco y etiqueta de una o dos líneas debajo. */
function service(cx, cy, color, icon, label, sub) {
  const x = cx - 24;
  const y = cy - 24;
  const lines = label.split('\n');
  let out = `<rect x="${x}" y="${y}" width="48" height="48" rx="6" fill="${color}"/>`;
  out += glyph(icon, x + 10, y + 10, 28);
  lines.forEach((l, i) => {
    out += `<text x="${cx}" y="${cy + 42 + i * 14}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${C.ink}">${esc(l)}</text>`;
  });
  if (sub) {
    out += `<text x="${cx}" y="${cy + 42 + lines.length * 14}" text-anchor="middle" font-family="${FONT}" font-size="10.5" fill="${C.grey}">${esc(sub)}</text>`;
  }
  return out;
}

/** Grupo con borde y etiqueta en la esquina (como "AWS Cloud" o "VPC"). */
function group(x, y, w, h, { title, color, icon, dashed = false, fill = 'none' }) {
  let out = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${color}" stroke-width="1.5"${dashed ? ' stroke-dasharray="6 4"' : ''}/>`;
  if (icon) {
    out += `<rect x="${x}" y="${y}" width="28" height="28" fill="${color}"/>` + glyph(icon, x + 5, y + 5, 18);
    out += `<text x="${x + 36}" y="${y + 19}" font-family="${FONT}" font-size="13" font-weight="bold" fill="${C.ink}">${esc(title)}</text>`;
  } else {
    out += `<text x="${x + 10}" y="${y + 19}" font-family="${FONT}" font-size="12" font-weight="bold" fill="${color}">${esc(title)}</text>`;
  }
  return out;
}

/** Subred: bloque relleno sin borde con título pequeño (como las subnets públicas/privadas). */
function band(x, y, w, h, fill, color, title) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/><text x="${x + 10}" y="${y + 18}" font-family="${FONT}" font-size="12" font-weight="bold" fill="${color}">${esc(title)}</text>`;
}

/** Flecha ortogonal por una lista de puntos. */
function arrow(points, { dashed = false, color = C.grey } = {}) {
  const d = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="1.5"${dashed ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#arrow)"/>`;
}

/** Círculo numerado de paso. */
function step(n, x, y) {
  return `<circle cx="${x}" cy="${y}" r="11" fill="${C.ink}"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="bold" fill="#fff">${n}</text>`;
}

function svg(w, h, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.grey}"/></marker></defs>
<rect width="${w}" height="${h}" fill="#fff"/>
${body}
</svg>
`;
}

// ---------------------------------------------------------------------------------------------------------
// Textos
// ---------------------------------------------------------------------------------------------------------

const T = {
  en: {
    archTitle: 'Al Día architecture',
    device: 'Android / iOS device',
    app: 'Al Día app (Expo SDK 54 · React Native)',
    ui: 'UI layer · expo-router',
    logic: 'Domain logic · lib/',
    native: 'Native modules',
    os: 'Operating system services',
    screens: '24 screens',
    screensSub: 'tabs + stack',
    lockUi: 'Lock screen',
    lockUiSub: 'PIN pad',
    onboarding: 'Onboarding',
    onboardingSub: 'splash + 3 steps',
    overlays: 'Overlays',
    overlaysSub: 'toast · confirm · sheet',
    store: 'Data store',
    storeSub: 'store.ts',
    security: 'Security',
    securitySub: 'security.ts',
    settings: 'Settings',
    settingsSub: 'settings.ts',
    engine: 'Due-date engine',
    engineSub: 'schedule.ts',
    bridge: 'Widget bridge',
    bridgeSub: 'widgetBridge.tsx',
    backup: 'Backup',
    backupSub: 'backup.ts',
    asyncStorage: 'AsyncStorage',
    secureStore: 'SecureStore',
    localAuth: 'Local\nAuthentication',
    notifications: 'expo-notifications',
    widget: 'android-widget',
    files: 'FileSystem\n+ Sharing',
    sandbox: 'App sandbox',
    keystore: 'Keystore /\nKeychain',
    sensor: 'Biometric\nsensor',
    tray: 'Notification\ntray',
    homescreen: 'Home screen',
    sharesheet: 'Share sheet /\nFiles',
    flowTitle: 'Al Día data flow',
    flowGroup: 'On-device data flow (no backend, no account)',
    user: 'User',
    forms: 'Forms',
    formsSub: 'card · service · loan',
    persist: 'Persist',
    outputs: 'Outputs',
    views: 'Home · Calendar\nStats',
    planner: 'Reminder planner',
    plannerSub: 'next 60 days',
    widgetOut: 'Home screen\nwidget',
    trayOut: 'Notification\nat 9:00',
    s1: 'Register or update a payment',
    s2: 'Save JSON document',
    s3: 'Compute due dates and status',
    s4: 'Render, schedule, refresh widget',
    s5: 'OS delivers reminder',
    s6: 'Tap opens detail · mark as paid',
  },
  es: {
    archTitle: 'Arquitectura de Al Día',
    device: 'Dispositivo Android / iOS',
    app: 'App Al Día (Expo SDK 54 · React Native)',
    ui: 'Capa de UI · expo-router',
    logic: 'Lógica de dominio · lib/',
    native: 'Módulos nativos',
    os: 'Servicios del sistema operativo',
    screens: '24 vistas',
    screensSub: 'pestañas + stack',
    lockUi: 'Bloqueo',
    lockUiSub: 'teclado de PIN',
    onboarding: 'Bienvenida',
    onboardingSub: 'splash + 3 pasos',
    overlays: 'Capas globales',
    overlaysSub: 'aviso · confirmación · hoja',
    store: 'Datos',
    storeSub: 'store.ts',
    security: 'Seguridad',
    securitySub: 'security.ts',
    settings: 'Ajustes',
    settingsSub: 'settings.ts',
    engine: 'Motor de vencimientos',
    engineSub: 'schedule.ts',
    bridge: 'Puente del widget',
    bridgeSub: 'widgetBridge.tsx',
    backup: 'Copia de seguridad',
    backupSub: 'backup.ts',
    asyncStorage: 'AsyncStorage',
    secureStore: 'SecureStore',
    localAuth: 'Local\nAuthentication',
    notifications: 'expo-notifications',
    widget: 'android-widget',
    files: 'FileSystem\n+ Sharing',
    sandbox: 'Almacenamiento\nde la app',
    keystore: 'Keystore /\nKeychain',
    sensor: 'Sensor\nbiométrico',
    tray: 'Bandeja de\nnotificaciones',
    homescreen: 'Pantalla de inicio',
    sharesheet: 'Compartir /\nArchivos',
    flowTitle: 'Flujo de datos de Al Día',
    flowGroup: 'Flujo de datos en el dispositivo (sin backend, sin cuenta)',
    user: 'Usuario',
    forms: 'Formularios',
    formsSub: 'tarjeta · servicio · préstamo',
    persist: 'Persistencia',
    outputs: 'Salidas',
    views: 'Inicio · Calendario\nEstadísticas',
    planner: 'Planificador de avisos',
    plannerSub: 'próximos 60 días',
    widgetOut: 'Widget de\npantalla de inicio',
    trayOut: 'Aviso a\nlas 9:00',
    s1: 'Registra o actualiza un pago',
    s2: 'Guarda el documento JSON',
    s3: 'Calcula fechas y estados',
    s4: 'Pinta, programa avisos, actualiza widget',
    s5: 'El sistema entrega el aviso',
    s6: 'Tocar abre el detalle · marcar pagado',
  },
};

// ---------------------------------------------------------------------------------------------------------
// Diagrama 1: arquitectura por capas
// ---------------------------------------------------------------------------------------------------------

function architecture(t) {
  const W = 1200;
  const H = 860;
  // Las columnas empiezan después de los títulos de banda para que ninguna flecha los cruce.
  const cols = [330, 480, 630, 780, 930, 1080];
  const yUi = 175;
  const yLogic = 335;
  const yNative = 500;
  const yOs = 740;
  let b = '';

  b += group(20, 20, 1160, 820, { title: t.device, color: C.ink, icon: 'phone' });
  b += group(40, 64, 1120, 540, { title: t.app, color: C.brand, icon: 'layers' });
  b += band(60, 104, 1080, 140, '#F1ECFF', C.front, t.ui);
  b += band(60, 262, 1080, 150, '#FDF1E6', C.compute, t.logic);
  b += band(60, 430, 1080, 160, '#EEF5E6', '#3F6212', t.native);
  b += group(40, 628, 1120, 196, { title: t.os, color: C.grey, dashed: true });

  // Flechas primero, para que queden debajo de los íconos.
  const down = (x, y1, y2) => arrow([[x, y1], [x, y2]]);
  b += down(cols[0], yUi + 64, yLogic - 28);
  b += down(cols[1], yUi + 64, yLogic - 28);
  for (const i of [0, 1, 3, 4, 5]) b += down(cols[i], yLogic + 64, yNative - 28);
  b += arrow([[cols[1] + 26, yLogic + 10], [cols[2] - 50, yLogic + 10], [cols[2] - 50, yNative - 40], [cols[2] - 12, yNative - 40], [cols[2] - 12, yNative - 28]]);
  for (let i = 0; i < 6; i++) b += down(cols[i], yNative + (i === 2 || i === 5 ? 78 : 64), yOs - 28);
  // Motor → puente del widget (horizontal).
  b += arrow([[cols[3] + 26, yLogic], [cols[4] - 28, yLogic]]);

  b += service(cols[0], yUi, C.front, 'screens', t.screens, t.screensSub);
  b += service(cols[1], yUi, C.front, 'lock', t.lockUi, t.lockUiSub);
  b += service(cols[2], yUi, C.front, 'onboarding', t.onboarding, t.onboardingSub);
  b += service(cols[3], yUi, C.front, 'layers', t.overlays, t.overlaysSub);

  b += service(cols[0], yLogic, C.compute, 'database', t.store, t.storeSub);
  b += service(cols[1], yLogic, C.security, 'shield', t.security, t.securitySub);
  b += service(cols[2], yLogic, C.compute, 'sliders', t.settings, t.settingsSub);
  b += service(cols[3], yLogic, C.compute, 'calendar', t.engine, t.engineSub);
  b += service(cols[4], yLogic, C.compute, 'widget', t.bridge, t.bridgeSub);
  b += service(cols[5], yLogic, C.files, 'download', t.backup, t.backupSub);

  b += service(cols[0], yNative, C.storage, 'database', t.asyncStorage);
  b += service(cols[1], yNative, C.security, 'key', t.secureStore);
  b += service(cols[2], yNative, C.security, 'fingerprint', t.localAuth);
  b += service(cols[3], yNative, C.messaging, 'bell', t.notifications);
  b += service(cols[4], yNative, C.messaging, 'widget', t.widget);
  b += service(cols[5], yNative, C.files, 'folder', t.files);

  b += service(cols[0], yOs, C.ink, 'folder', t.sandbox);
  b += service(cols[1], yOs, C.ink, 'key', t.keystore);
  b += service(cols[2], yOs, C.ink, 'fingerprint', t.sensor);
  b += service(cols[3], yOs, C.ink, 'bell', t.tray);
  b += service(cols[4], yOs, C.ink, 'home', t.homescreen);
  b += service(cols[5], yOs, C.ink, 'share', t.sharesheet);

  return svg(W, H, b, t.archTitle);
}

// ---------------------------------------------------------------------------------------------------------
// Diagrama 2: flujo de datos numerado
// ---------------------------------------------------------------------------------------------------------

function dataflow(t) {
  const W = 1000;
  const H = 640;
  let b = '';
  b += group(20, 20, 960, 520, { title: t.flowGroup, color: C.brand, icon: 'phone' });
  b += band(560, 70, 230, 400, '#F1ECFF', C.front, t.outputs);

  const yMid = 255;
  const xUser = 85;
  const xForms = 215;
  const xStore = 350;
  const xEngine = 480;
  const xOut = 675;
  const xTray = 885;
  const rows = [140, 255, 370];

  // Flechas.
  b += arrow([[xUser + 26, yMid], [xForms - 28, yMid]]);
  b += arrow([[xForms + 26, yMid], [xStore - 28, yMid]]);
  b += arrow([[xStore, yMid + 64], [xStore, 395]]);
  b += arrow([[xStore + 26, yMid], [xEngine - 28, yMid]]);
  b += arrow([[xEngine + 26, yMid], [600, yMid], [600, rows[0]], [xOut - 28, rows[0]]]);
  b += arrow([[600, yMid], [xOut - 28, yMid]]);
  b += arrow([[600, yMid], [600, rows[2]], [xOut - 28, rows[2]]]);
  b += arrow([[xOut + 26, rows[1]], [xTray - 28, rows[1]]]);
  b += arrow([[xTray, rows[1] + 70], [xTray, 500], [xForms, 500], [xForms, yMid + 82]], { dashed: true });

  b += service(xUser, yMid, C.ink, 'user', t.user);
  b += service(xForms, yMid, C.front, 'form', t.forms, t.formsSub);
  b += service(xStore, yMid, C.compute, 'database', t.store, t.storeSub);
  b += service(xStore, 420, C.storage, 'database', t.asyncStorage);
  b += service(xEngine, yMid, C.compute, 'calendar', t.engine, t.engineSub);
  b += service(xOut, rows[0], C.front, 'screens', t.views);
  b += service(xOut, rows[1], C.messaging, 'clock', t.planner, t.plannerSub);
  b += service(xOut, rows[2], C.messaging, 'widget', t.widgetOut);
  b += service(xTray, rows[1], C.ink, 'bell', t.trayOut);

  // Pasos numerados y leyenda.
  b += step(1, (xUser + xForms) / 2, yMid - 16);
  b += step(2, (xForms + xStore) / 2, yMid - 16);
  b += step(3, (xStore + xEngine) / 2, yMid - 16);
  b += step(4, 600, yMid - 16 - 30);
  b += step(5, (xOut + xTray) / 2, rows[1] - 16);
  b += step(6, (xForms + xTray) / 2, 500);

  const legend = [t.s1, t.s2, t.s3, t.s4, t.s5, t.s6];
  legend.forEach((s, i) => {
    const lx = 40 + (i % 3) * 320;
    const y = 572 + Math.floor(i / 3) * 26;
    b += step(i + 1, lx, y - 4).replace('r="11"', 'r="8"').replace('font-size="12"', 'font-size="10"');
    b += `<text x="${lx + 14}" y="${y}" font-family="${FONT}" font-size="10.5" fill="${C.ink}">${esc(s)}</text>`;
  });

  return svg(W, H, b, t.flowTitle);
}

for (const lang of ['en', 'es']) {
  fs.writeFileSync(path.join(OUT, `architecture.${lang}.svg`), architecture(T[lang]));
  fs.writeFileSync(path.join(OUT, `dataflow.${lang}.svg`), dataflow(T[lang]));
}
console.log('Diagramas generados en', OUT);
