export const lightColors = {
  primary: '#F5793B',
  primaryDark: '#E0632A',
  gradientTop: '#FDEDE3',
  gradientBottom: '#FDF6F0',
  backgroundLogo: '#f5f5f5',
  card: '#ffffff',
  inputBg: '#F7F5F3',
  text: '#2A2A2A',
  textLight: '#9CA3AF',
  link: '#F5793B',
  error: '#D93025',
  border: '#ECE8E4',
  bottleGreen: '#003223',
  bottleGreenText: '#003223', // alias en modo claro — en modo oscuro se vuelve verde menta legible (ver darkColors)
  saladGreen: '#8CC850',
  lightGreen: '#EAF3E3',
  balanceGreen: '#C3DFA0',
  expenseTag: '#F6DFCB',
  chatBubble: '#E3DCCF',
  mintBar: '#C7ECE0',

  // --- surfaces (semantic aliases + new) ---
  screenBg: '#FFFFFF',          // = card
  cardSoftGreen: '#EAF3E3',     // = lightGreen
  cardDark: '#003223',          // = bottleGreen (price comparator card)
  cardPink: '#F8DAD5',          // Spending Insight / Recommendation Asentli
  cardPinkText: '#8A463E',
  notifBubble: '#F1E9DC',       // beige chat bubbles in Notifications
  bannerGreen: '#2F7D57',       // large green feature cards
  bannerGreenText: '#EAF7EF',

  // --- chips / pills ---
  chipBg: '#F1EFEC',
  chipText: '#6B6B6B',
  chipActiveBg: '#003223',
  chipActiveText: '#FFFFFF',

  // --- progress + states ---
  progressTrack: '#E7E3DD',
  success: '#2E9E5B',           // cashback / positive amounts
  badgeBestPrice: '#8CC850',    // = saladGreen

  // --- categories (donut + breakdowns) ---
  // Estos 4 tienen que cumplir dos cosas a la vez: distinguirse entre sí de
  // un vistazo (son segmentos contiguos de un donut) y leerse sobre fondo
  // claro Y oscuro. Ojo: `CATEGORIES` en src/constants/categories.js importa
  // la paleta CLARA estática, así que un override en `darkColors` NO los
  // afecta — cada uno tiene que funcionar en los dos temas con un solo valor.
  catFood: '#F5793B',
  catDairy: '#8CC850',
  // Terracota. Antes era el verde botella `#003223`, que sobre el fondo
  // oscuro daba 1.27:1 de contraste — directamente invisible. Esta terracota
  // da 5.39:1 en claro y 3.34:1 en oscuro. Se eligió un paso más oscura que
  // una terracota típica para despegarla de `catFood`: el naranja y la
  // terracota son vecinos, y acá quedan a ΔE2000 22.1 (el par más flojo que
  // ya tenía la paleta era catFood/catOther, a 21.2).
  catMeat: '#B04A3E',
  catOther: '#F5C9A8',
};

// Modo oscuro: los acentos de marca que ya leen bien sobre fondo oscuro
// (primary, saladGreen, error, bannerGreen/Text, chipActiveBg/Text y las 4
// catFood/Dairy/Meat/Other) se mantienen igual — las de categoría porque
// tienen que servir en los dos temas con un solo valor (ver nota arriba). `bottleGreen` (#003223, casi
// negro) se mantiene SOLO como relleno sólido (barra inferior, chips
// activos, cardDark) porque ahí siempre lleva texto/ícono claro encima.
// `bottleGreenText` es el mismo color en modo claro, pero en oscuro pasa a
// un verde menta brillante — es el que se usa donde bottleGreen se usaba
// como color de TEXTO/ÍCONO sobre una tarjeta (título de header, íconos de
// menú), donde el verde casi negro original sería ilegible sobre un fondo
// casi negro.
export const darkColors = {
  ...lightColors,
  gradientTop: '#241A14',
  gradientBottom: '#1A1612',
  backgroundLogo: '#15120F',
  card: '#1A1612',
  inputBg: '#241F1A',
  text: '#F2EEE9',
  textLight: '#8FA89C',
  border: '#332C24',
  bottleGreenText: '#4FD8A0',
  lightGreen: '#1F2E22',
  balanceGreen: '#2B4A36',
  expenseTag: '#3B2E22',
  chatBubble: '#2A2520',
  mintBar: '#2C4A42',

  screenBg: '#1A1612',
  cardSoftGreen: '#1F2E22',
  cardPink: '#3A2620',
  cardPinkText: '#E8A89A',
  notifBubble: '#2A241C',

  chipBg: '#241F1A',
  chipText: '#B8B2A8',

  progressTrack: '#2E2820',
  success: '#3DBE75',
};

// Default export = paleta clara, para no romper nada de lo que ya importa
// `colors` directamente mientras se migra pantalla por pantalla a
// `useTheme()` (ver src/theme/ThemeContext.js).
export const colors = lightColors;
