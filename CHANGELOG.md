# CHANGELOG.md — Qué se construyó y en qué orden

Este documento se referencia desde `README.md`, `ARCHITECTURE.md`, `SCREENS.md`
y `SETUP_TEAM.md`, pero nunca se había escrito — esta es la primera versión.
Reconstruye las etapas ya hechas (a partir del código y de esos mismos
documentos) y agrega la etapa nueva.

> Si encontrás que alguna fecha o detalle de las etapas 1 a 3 no es exacto,
> este documento se puede corregir — lo importante es que de ahora en
> adelante cada etapa nueva se registre acá.

---

## Etapa 1 — Pantallas maquetadas (sin backend)

Se construyeron las ~20 pantallas de la app con datos **hardcodeados** (escritos
a mano), usando siempre el mismo patrón visual:

- `ScreenHeader` (flecha atrás + título + campana) y `BottomNav` (4 pestañas)
  en todas las pantallas.
- Colores centralizados en `src/theme/colors.js` — nunca un color "suelto" en
  una pantalla.
- Componentes compartidos (`Fab`, `EmptyState`, `ui.js`) para no repetir código
  entre pantallas parecidas.
- Navegación sin librerías: un `useState` con una pila de pantallas en
  `App.js` (ver `ARCHITECTURE.md`, sección 9).

En esta etapa **nada** se conectaba a un servidor — todo era diseño.

---

## Etapa 2 — Autenticación real con Clerk

Se reemplazó el login/registro de mentira (y los restos de Firebase) por
**Clerk**:

- Registro con correo + contraseña, con verificación por código de 6 dígitos.
- Inicio de sesión con correo + contraseña.
- Login con Google (`useGoogleAuth`, flujo SSO de Clerk).
- "Olvidé mi contraseña" (código por correo + contraseña nueva).
- **Persistencia de sesión**: al cerrar y volver a abrir la app, Clerk restaura
  la sesión sola (`tokenCache` + `expo-secure-store`) — no hay que loguearse
  de nuevo.
- `TermsScreen` ("Términos y condiciones") se muestra **una sola vez**: al
  aceptar, se guarda `unsafeMetadata.acceptedTerms = true` en el usuario de
  Clerk.
- "Sign out" en `ProfileScreen` cierra la sesión de verdad.

Quedó decidido: **Clerk maneja toda la identidad** (usuarios, contraseñas,
sesión). Supabase **no** se usa para login — ver `ARCHITECTURE.md`.

---

## Etapa 3 — Gastos manuales con Supabase

Se conectó la primera data real de la app:

- Tablas nuevas en Supabase: `expenses` (cada gasto manual) y `budgets` (el
  presupuesto mensual), documentadas en `DATABASE.md`.
- Cada fila se vincula al usuario con `user_id text` = el id de **Clerk**
  (no hay tabla de usuarios propia — Clerk ya es la fuente de identidad).
  RLS activada: cada usuario solo ve/edita sus propias filas
  (`auth.jwt() ->> 'sub' = user_id`).
- Se instaló **`@tanstack/react-query`** para todas las consultas y mutaciones
  a Supabase (loading / error / caché), en vez de `useEffect` + `useState` a
  mano. Hooks en `src/hooks/useExpenseData.js`.
- Pantallas nuevas: `AddExpenseScreen` (con el botón flotante "+" en Home) y
  `EditBudgetScreen`.
- Pantallas que pasaron de datos de ejemplo a datos reales: `HomeScreen`,
  `BudgetDetailsScreen`, `StatisticsScreen`, `PurchaseHistoryScreen`,
  `CardScreen` (parcialmente — ver `SCREENS.md`).
- Se identificaron y documentaron las tablas **heredadas** de la base de datos
  (`usuario`, `compra`, `billetera`, etc., creadas por el compañero antes de
  este trabajo) — ver `DATABASE.md`, sección 4. No se tocaron.
- Código viejo de Firebase (`src/screens/registro.js`, que ya no compila) quedó
  marcado como heredado/sin usar — ver `README.md`, sección 6.

---

## Etapa 4 — Perfil de usuario completo

`ProfileScreen` pasó de ser casi un placeholder (nombre/correo de Clerk +
menús que no llevaban a ningún lado) a una pantalla 100% funcional:

- **Foto de perfil editable** — 100% Clerk (`user.setProfileImage()`), nada de
  Supabase Storage. Se elige con `expo-image-picker` (cámara o galería) y se
  muestra con `user.imageUrl`. Si falla la subida, se avisa con una alerta (no
  falla en silencio).
- **Datos editables** (`EditProfileScreen`): Nombre y Apellido (Clerk,
  `user.update()`), Teléfono (Supabase, tabla nueva — ver abajo). Email queda
  de solo lectura por ahora.
- **Cambiar contraseña** (`ChangePasswordScreen`, `user.updatePassword()`).
  Si la cuenta entró solo con Google (no tiene contraseña todavía), la
  pantalla detecta eso (`user.passwordEnabled`) y deja crear una sin pedir la
  actual.
- **Tabla nueva `user_profile`** (`supabase/user_profile.sql`) — solo
  `user_id` (Clerk) + `phone`, con RLS igual que `budgets`. Se creó **aparte**
  de `usuario` (la tabla heredada) porque esa tabla no tiene ninguna columna
  para vincularla a Clerk; tocarla es una decisión pendiente con el compañero
  (ver "Pendientes" abajo y `DATABASE.md`, sección 3.3).
- **Menú de Profile reorganizado** en dos secciones, **todos los botones
  funcionan de verdad**:
  - *Account*: Edit profile, Change password, My Card (→ `CardScreen`),
    Family members (→ placeholder "Próximamente", intencional — ver abajo).
  - *Your money*: Budget Details, Purchase History, Rewards (Cashback) — todas
    pantallas que ya existían, ahora también alcanzables desde Profile.
- **Se sacaron** del menú: "Payment methods" y "Settings" (no había nada real
  a donde llevarlos — duplicaban o no correspondían a ninguna pantalla) y
  "Help & support" (sin contenido real todavía). También se sacó el switch de
  **Face ID**: no activaba ninguna biometría real, era puramente decorativo.
- **"Family members" se dejó a propósito** como botón → `PlaceholderScreen`
  con el mensaje "Próximamente: varios miembros de una familia compartiendo
  presupuesto". No es decorativo por descuido: es un lugar reservado en la UI
  para un feature real que se quiere construir (ver "Pendientes").

---

## Etapa 5 — Asistente de IA real con Groq

`AIAssistantScreen` pasó de ser una maqueta con datos inventados (barras fijas,
un mensaje de "asistente" que no respondía nada, input que no enviaba) a un
chat real conectado a un modelo Llama a través de Groq:

- **Nueva Edge Function `supabase/functions/ai-assistant`** (primera Edge
  Function del proyecto) — es la única pieza que conoce la clave de Groq
  (`GROQ_API_KEY`, guardada como secreto de servidor con `supabase secrets
  set`, nunca en un archivo del repo ni en una variable `EXPO_PUBLIC_*`). La
  app nunca le habla a Groq directamente. Ver `ARCHITECTURE.md` sección 2b
  para el diagrama completo y `supabase/functions/ai-assistant/README.md`
  para los comandos de configuración/despliegue.
- **Modelo elegido: `llama-3.3-70b-versatile`** — se prefirió sobre el más
  chico (`llama-3.1-8b-instant`) porque acá importa más que el modelo respete
  al pie de la letra la instrucción de "no inventar cifras" que ganar
  milisegundos; en Groq ambos son igual de rápidos para un chat.
  **Actualización (oct. 2026):** Groq pasó `llama-3.3-70b-versatile` (y
  `llama-3.1-8b-instant`) a tier "Enterprise" — ya no responden con una
  API key del plan gratuito (404 "no existe o no tenés acceso"). Se migró
  a `openai/gpt-oss-120b`, que sí está en el plan Free con los mismos
  límites de rate (ver `supabase/functions/ai-assistant/index.ts`). De
  paso se amplió el alcance del asistente: ya no responde solo preguntas
  de presupuesto/gastos, puede charlar de cualquier tema — pero sigue sin
  poder inventar los números reales del usuario, y mantiene resguardos
  básicos (nada ilegal, peligroso o dañino).
- **Contexto con datos reales**: antes de preguntarle a Groq, la función lee
  (con el mismo token de Clerk del usuario, respetando RLS) su presupuesto,
  lo gastado este mes, el desglose por categoría y la comparación con el mes
  anterior, y se lo pasa al modelo como los únicos números que puede usar. Si
  el usuario es nuevo y no tiene datos, se le indica al modelo que lo aclare
  en vez de inventar cifras.
- **Chat funcional**: historial de mensajes en memoria (se pierde al salir de
  la pantalla — persistirlo entre sesiones queda para una etapa futura),
  burbujas de usuario y de IA diferenciadas, indicador de "escribiendo…"
  mientras se espera la respuesta, y una burbuja de error visible si Groq no
  responde (sin conexión, límite de uso, etc.) — nunca falla en silencio.
  Implementado con `useAIAssistant` (`react-query`, `useMutation`).
- **Botones rápidos funcionan de verdad**: "¿Cómo gasto menos?" manda un
  mensaje predefinido al asistente; "Subir ticket" abre cámara o galería
  (`expo-image-picker`) y adjunta la imagen al chat — todavía sin OCR, el
  asistente responde un mensaje fijo avisando que el análisis automático
  llega en otra etapa.
- **Gráfico semanal conectado**: el box "Gastos por Semana" que antes tenía
  barras y una "sugerencia de ahorro" inventadas a mano ahora usa los gastos
  reales del mes (`useMonthExpenses` + `weeklyBars`, el mismo cálculo que ya
  usa `HomeScreen`) — se sacó el número de ahorro inventado.
- **Íconos**: se reemplazaron todos los emojis sueltos de la pantalla por
  `Ionicons`, siguiendo el mismo estándar que `HomeScreen`.
- **Se sacó** el botón "Ver comparación" (navegaba a `PriceComparerScreen`)
  para dejar el lugar a los dos botones rápidos pedidos arriba;
  `PriceComparerScreen` sigue siendo alcanzable desde `CardScreen` y
  `BasketScreen`.

---

## Etapa 6 — Pasada transversal: cámara/galería, i18n, modo oscuro, notificaciones reales, chat

Pasada sobre toda la app, pedida como una auditoría general más 5 frentes de
mejora. Arrancó con 5 fases; después se sumaron tres más (la pasada fina de
i18n, el render de Markdown del chat y los huecos sueltos de la auditoría).
El plan original se perdió con la sesión que lo armó, así que la auditoría se
rehízo sobre el código y sus hallazgos están en la Fase 8 y en Pendientes.

### Fase 1 — Cámara y galería (`expo-image-picker`)

Auditoría encontró dos gaps reales en `ProfileScreen.js` (foto de perfil) y
`AIAssistantScreen.js` ("Subir ticket"): ninguno envolvía las llamadas a
`ImagePicker.launchCameraAsync`/`launchImageLibraryAsync` en try/catch, así
que una excepción real (no un simple "cancelado por el usuario", que ya se
manejaba bien) quedaba sin capturar; y el texto de permiso de `app.json`
hablaba solo de "foto de perfil" aunque el mismo picker también se usa para
adjuntar un ticket al chat.

- Se agregó `try/catch` alrededor de las 4 llamadas (`fromCamera`/`fromLibrary`
  en `ProfileScreen.js`, `openCamera`/`openGallery` en `AIAssistantScreen.js`),
  con un `Alert.alert` de error genérico si el picker falla de verdad.
- Se reescribieron `cameraPermission`/`photosPermission` en `app.json` para
  cubrir ambos usos (perfil y ticket) en vez de mencionar solo perfil, y ya
  en inglés (idioma por defecto de la Fase 2). **Importante:** este string
  lo inyecta el plugin de Expo al compilar la app nativa — no puede seguir el
  idioma elegido en runtime (i18next es JS, esto es nativo), así que queda
  fijo en inglés sin importar el idioma que el usuario elija después.
- Nada de esto cambia comportamiento cuando el picker funciona normal — solo
  agrega manejo para el caso de excepción real, que antes no tenía feedback.

### Fase 2 — Internacionalización (i18next, inglés + español)

- **`src/i18n/index.js`**: i18next + react-i18next con 10 namespaces
  (`common`, `auth`, `home`, `budget`, `profile`, `profileEdit`, `shopping`,
  `settings`, `aiAssistant`, `notifications`) y 20 archivos en
  `src/locales/{en,es}/`. **Inglés es el idioma por defecto**, explícito: no
  se mira el idioma del dispositivo.
- Las 27 pantallas activas y los 4 componentes con texto pasaron a
  `useTranslation`. No queda ninguna cadena de UI escrita a mano.
- El idioma elegido se guarda en AsyncStorage y se aplica al arrancar (ver
  Fase 3, comparte el mismo blob de preferencias).
- `useSuspense: false` a propósito: los recursos están embebidos en el bundle,
  no hay carga asíncrona que suspender.

### Fase 3 — Modo oscuro

- **`src/context/PreferencesProvider.js`**: un único blob en AsyncStorage
  (`asentli:preferences`) para idioma + tema, para no tener dos mecanismos de
  storage compitiendo. Default explícito: inglés + claro.
- **`src/theme/ThemeContext.js`** expone `{ colors, isDark, toggleTheme }`.
  Las 27 pantallas y los 6 componentes migraron al patrón
  `createStyles(colors)`; no queda ningún fondo ni borde claro escrito a mano.
- **`src/theme/colors.js`** suma `darkColors`. El detalle fino es
  `bottleGreenText`: en modo claro es el mismo verde botella `#003223`, pero
  en oscuro pasa a un verde menta `#4FD8A0`. `bottleGreen` se mantiene como
  relleno sólido (barra inferior, chips activos) porque ahí siempre lleva
  texto claro encima; `bottleGreenText` es el que se usa donde ese verde casi
  negro era color de TEXTO o ÍCONO, que sobre fondo oscuro sería ilegible.
- **`SettingsScreen`** (pantalla nueva, se llega desde Perfil → Ajustes):
  selector de idioma y switch de modo oscuro.
- La `StatusBar` sigue el tema desde `App.js`.

### Fase 4 — Notificaciones reales (en la app)

- **`src/hooks/useNotifications.js`**: alertas derivadas de datos reales con
  los mismos hooks que ya usan Home y el asistente — presupuesto al 80%, al
  100%, y gasto grande (más del 30% del presupuesto, o más de $100 si
  todavía no hay presupuesto configurado).
- **Sin tabla ni trigger nuevos**: se recalculan en cada render, así que una
  alerta desaparece sola apenas deja de ser cierta. No hay estado que
  sincronizar ni que pueda quedar viejo.
- `NotificationsScreen` se reescribió sobre eso (antes eran burbujas de
  ejemplo escritas a mano), con `EmptyState` cuando no hay nada que avisar.
- **Alcance real de esta fase:** es un centro de alertas *dentro* de la app.
  No hay push ni notificaciones locales — ver Pendientes.

### Fase 5 — Respuestas estructuradas en el chat

- La Edge Function suma `buildStructuredData`: los mismos números que ya
  calculaba para armar la prosa, pero sin aplanar, en el campo `data` de la
  respuesta.
- `ChatCategoryBreakdown` en `AIAssistantScreen` los dibuja como mini-barras
  por categoría en vez de texto plano, cuando vienen.

### Fase 6 — Pasada de i18n sobre lo que había quedado afuera

Auditoría posterior encontró 7 lugares donde todavía salía texto que no
seguía el idioma elegido. El más grave no era de idioma sino de
**consistencia**: `src/constants/categories.js` tenía `label: 'Food'` fijo en
inglés y la Edge Function tenía **su propia** tabla `CATEGORY_LABELS` en
español, así que el desglose del chat decía "Alimentos" mientras el donut de
Statistics decía "Food", con la app en un solo idioma.

- **Una sola fuente de verdad para categorías.** `categories.js` ya no tiene
  `label`: la `key` (`food`/`dairy`/`meat`/`other`) es a la vez lo que guarda
  la base y la clave i18n `common:categories.*`. El nuevo hook
  `src/hooks/useCategoryLabel.js` es el único lugar donde una key se vuelve
  texto visible, y lo usan AddExpense, Statistics, BudgetDetails,
  PurchaseHistory, CardScreen y el desglose del chat.
- **La Edge Function dejó de mandar `label`**: devuelve solo `{ key, amount }`
  y la app traduce. Además ahora recibe `language` en el body, para que el
  texto de contexto que lee el modelo use las mismas etiquetas que ve el
  usuario (`normalizeLanguage` colapsa `es-AR` → `es` y cae a inglés para
  idiomas que no tenemos).
- **Saludo y respuesta de "ticket recibido" del chat**: viajan como `textKey`,
  no como texto ya resuelto, así cambian de idioma en vivo en vez de quedar
  congelados en el idioma que había al abrir la pantalla.
- **Errores**: `clerkErrors.js` (10 códigos) y `useGoogleAuth` pasaron a
  `auth:errors.*`; los del asistente a `aiAssistant:networkError`/`emptyReply`.
  Los textos propios de Clerk quedan solo como último recurso para códigos no
  mapeados.
- **Fechas**: se sacaron el array `MONTHS` en inglés y el
  `toLocaleDateString('en-US')` de AddExpense. Nuevos `monthShortName()` y
  `formatDate()` leen de `common:months.*`. `relativeDayGroup` devuelve claves
  (`today`/`yesterday`/`lastWeek`/`earlier`) y la pantalla traduce. También
  `Week 1` estaba en duro → `common:week`.
- **`comparisonText`** armaba la frase de Statistics concatenando en inglés.
  Pasó a ser `comparisonInsight()`, que devuelve `{ key, amount }`; la frase
  vive en `home:statistics.insight.*` con interpolación, porque el orden de
  las palabras cambia entre idiomas y concatenar no sobrevive la traducción.

Verificado: 305 claves estáticas y las 9 familias dinámicas existen en `en` y
`es`, y los 20 archivos de locale tienen paridad exacta de claves.

### Fase 7 — Markdown en las respuestas de la IA

El modelo responde en Markdown (`**negrita**`, listas, títulos) y la pantalla
lo mostraba crudo: asteriscos a la vista y listas sin viñeta ni sangría.

- **`src/components/MarkdownText.js`**, parser propio (~190 líneas): bloques
  (títulos `#`, listas con viñeta y numeradas, párrafos) e inline (negrita,
  itálica, `code`).
- **Montos y porcentajes resaltados** en el naranja de marca — `$1,234.50`,
  `68.6%`, `-$12.30` — para que no se pierdan en el párrafo. Es la última
  pasada del tokenizador inline, así que funciona también dentro de una
  negrita (queda naranja Y en negrita).
- **Por qué parser propio y no una librería:** `react-native-markdown-display`
  está sin publicar desde dic. 2023 y arrastra `markdown-it@10` y
  `react-native-fit-image` (2022) contra React 19.2 / RN 0.86; el fork
  mantenido suma una fuente nativa (`@react-native-vector-icons`) que pide
  prebuild, con `@expo/vector-icons` ya en el proyecto. `react-native-marked`
  sí era viable (mantenida, y `react-native-svg` ya está). Se eligió el parser
  propio porque la entrada no es Markdown arbitrario sino la salida de un
  prompt que controlamos, el realce de montos no lo trae ninguna librería
  (habría que interceptar su regla de texto igual), el tema sale gratis con
  `useTheme()`, y lo que no se parsea degrada a texto plano — nunca peor que
  antes.
- **El system prompt ahora fija ese subconjunto**: se le pide explícitamente
  al modelo que no use tablas, bloques ` ``` `, links ni listas anidadas,
  porque el parser no los cubre.
- Si en algún momento el asistente necesita tablas o código de verdad, se
  cambia la implementación interna de `MarkdownText` por `react-native-marked`
  sin tocar `ChatBubble`.

### Fase 8 — Huecos sueltos de la auditoría

- **Auto-scroll del chat**: el `ScrollView` de `AIAssistantScreen` no tenía
  `ref`, así que la respuesta aparecía abajo de lo visible. Ahora baja solo
  vía `onContentSizeChange` (y no en el montaje inicial, con un flag, para no
  saltar apenas abrís la pantalla).
- **Botón "Add" de `ShoppingStoreScreen`**: era el único `TouchableOpacity`
  de una pantalla activa sin `onPress` — se veía tocable y no hacía nada.
  Ahora lleva un contador de carrito local, y el badge muestra ese número en
  vez del `3` que estaba escrito a mano (y se oculta en cero).
- **Se borraron 3 archivos huérfanos**: `LandingPage.js`, `registro.js` y
  `walletdetails.js` no los importaba nadie — eran los únicos sin
  `useTranslation` ni `useTheme`, y `walletdetails.js` todavía usaba la
  paleta clara estática.
- **`ARCHITECTURE.md`**: el diagrama decía `openai/gpt-oss-20b` cuando el
  código usa `120b`. De paso se realinearon las 32 líneas del diagrama que
  medían un carácter de más y rompían el marco.

### Fase 9 — Colores de categoría legibles en modo oscuro

`catMeat` era `#003223`, el verde botella casi negro: sobre el fondo oscuro
daba **1.27:1** de contraste, o sea invisible en el donut de Statistics, en
el desglose de BudgetDetails y en el del chat.

- **`catMeat` pasa a `#B04A3E`**, una terracota. Se eligió un paso más
  oscura que una terracota típica (`#C1554A`) porque a ese tono quedaba a
  ΔE2000 **18.4** de `catFood` (`#F5793B`) — naranja y terracota son vecinos,
  y son segmentos contiguos del donut. A `#B04A3E` la separación sube a
  **22.1**, por encima del par más flojo que la paleta ya tenía
  (catFood/catOther, 21.2), y a **17.7** simulando deuteranopía.
- Medido en todos los contextos donde se usa: 5.39:1 sobre card claro,
  3.34:1 sobre card oscuro, 4.96:1 / 3.03:1 sobre los `inputBg`, y 5.39:1
  para el texto blanco del chip activo en AddExpense.
- **Nota importante encontrada en el camino:** `CATEGORIES` en
  `src/constants/categories.js` importa la paleta **clara** estática, así que
  un override en `darkColors` no afecta a los colores de categoría. Cada uno
  tiene que funcionar en los dos temas con un solo valor. Quedó documentado
  en `colors.js` para que no se intente el override y se pierda tiempo.
- **Mismo defecto, otro lugar:** la segunda barra semanal de `HomeScreen`
  usaba `colors.bottleGreen` como relleno, también 1.27:1 en oscuro. Pasó a
  `colors.bottleGreenText`, que en modo claro es exactamente el mismo
  `#003223` (cero cambio visual) y en oscuro es el verde menta `#4FD8A0`
  (9.99:1).

---

**Queda sin tocar a propósito** (sigue en Pendientes): `BasketScreen` recibe
un `onBell` que no usa y que `App.js` tampoco le pasa, su badge de carrito
dice `3` en duro, `SettingsScreen` es la única sub-pantalla de Perfil sin
`BottomNav`, y 7 pantallas siguen con datos de ejemplo.

---

## Etapa 7 — Catálogo real: canasta básica, comercios y precios

Las tres pantallas de compras (`ShoppingStoreScreen`, `PriceComparerScreen`,
`AffiliatedBusinessesScreen`) dejaron de ser maquetas con arrays escritos a
mano y leen de Supabase.

### La decisión de fondo: de dónde salen los datos

Antes de escribir una línea se investigó si existía una API de precios de
supermercados para El Salvador. **No existe ninguna** — los agregadores LATAM
cubren México, Brasil, Argentina, Perú y Chile, no Centroamérica. Se
descartó el scraping: Súper Selectos bloquea explícitamente a los bots de
extracción en su `robots.txt`, y la *Ley Especial contra los Delitos
Informáticos* (Decreto 260, Art. 4) castiga el acceso "excediendo la
autorización" con 1 a 4 años. Además, scrapear a un comercio al que se le va
a pedir que firme un contrato de afiliación es mal negocio.

La fuente elegida es **carga manual con los comercios afiliados como
proveedores del dato**: el modelo de negocio (5 % de comisión por compra) ya
da el mecanismo contractual para pedir la lista de precios.

### El catálogo son 22 productos, no "surtido de supermercado"

`products` contiene **únicamente** los 22 artículos de la **Canasta Básica
Alimentaria oficial de El Salvador**, publicada por el BCR a través de la
ONEC (que absorbió a la DIGESTYC). Nada de snacks, gaseosas ni productos de
lujo.

La estructura oficial tiene dos niveles —**11 grupos / 22 artículos** en la
urbana, **9 grupos / 15 artículos** en la rural— y la enumeración cargada
reproduce exactamente ambos totales, lo que valida el mapeo.

> **Toda la trazabilidad está en [`CATALOG.md`](CATALOG.md)**: institución,
> documento, fecha de publicación, fecha de carga, qué es dato oficial y qué
> es reconstrucción, y cómo actualizar si el BCR cambia la canasta. Se separó
> de `DATABASE.md` a propósito: uno describe la forma de las tablas, el otro
> justifica el contenido.

### Tablas nuevas (`supabase/catalog.sql`)

`stores`, `products`, `store_products`, `price_history`. **No se tocó ninguna
tabla heredada** (`comercio`, `producto`, `compra`, `detalle_compra`…).

- **Primeras tablas compartidas del esquema.** Todo lo anterior era privado
  por usuario (`user_id` + RLS "solo lo tuyo"); estas las lee entera
  cualquier usuario logueado y las escribe solo un `admin`, vía el helper
  `public.is_admin()`, que lee `public_metadata.role` del mismo JWT de Clerk.
- `price_history` **se llena sola** con un trigger: ni la app ni el panel
  tienen que acordarse, y ningún cliente tiene permiso de `insert`.
- `products.cba_group` e `in_cba_rural` guardan la trazabilidad en la propia
  fila, no solo en un documento.
- Los precios de la semilla están marcados `source = 'manual'` y **son
  inventados** — hay un comentario en el SQL con el `delete` para limpiarlos
  apenas entren precios reales.

### Las tres decisiones del equipo

- **Categorías**: el catálogo reusa las 4 de gasto (`food`/`dairy`/`meat`/
  `other`), así una compra puede generar el gasto en la categoría correcta.
  `other` queda vacío: ningún artículo de la CBA cae ahí.
- **Huevos en `food`**, no en `dairy` — no son lácteo.
- **Nombres en español**, porque son dato y no cadena de UI.
- **La unidad de los huevos quedó en "Unidad", no "Cartón".** Fue un cambio
  sobre lo aprobado, con motivo: la unidad vive en `products` y es canónica
  para los cuatro comercios. Si uno cotizara el cartón de 30 y otro el de 12,
  el comparador mostraría $5.70 contra $2.40 como si el segundo fuera más
  barato. Para mostrar el empaque real hace falta una columna de presentación
  en `store_products`, no cambiar la unidad.

### Pantallas

- **`ShoppingStoreScreen`**: `useStoreProducts()`. Los chips de categoría se
  **derivan del catálogo** en vez de estar escritos a mano, así `other` no
  aparece como pestaña vacía. Cada tarjeta muestra el precio más bajo
  disponible y en qué comercio. Precios con `formatMoney`, no strings.
- **`PriceComparerScreen`**: `useProductPrices()`. Ya no muestra un producto
  fijo — la búsqueda es un selector sobre el catálogo. `best` se **calcula**
  (el más barato) en vez de venir marcado a mano, y la "Recomendación
  Asentli", que era una frase fija con un ahorro inventado, ahora se computa
  con la diferencia real entre el comercio más barato y el más caro, más el
  cashback del ganador. Cada precio muestra cuándo se actualizó.
- **`AffiliatedBusinessesScreen`**: `useStores()`. El cashback deja de ser
  string y sale de `stores.cashback_pct`.
- Las tres manejan carga, error y vacío con `ActivityIndicator` y
  `EmptyState`, en vez de asumir que siempre hay datos.

### Hooks

`src/hooks/useCatalog.js`: `useStores`, `useStoreProducts`, `useProductPrices`,
`useProductBySlug`. A diferencia de `useExpenseData`, **no filtran por
`user_id` ni lo meten en el `queryKey`** — es catálogo compartido, cachear una
copia por usuario sería desperdicio. `staleTime` de 5 minutos: el catálogo
cambia semanalmente en el mejor caso.

`useStoreProducts` trae productos y ofertas en **una sola query** con join
embebido y elige la más barata en el cliente, en vez de hacer N+1.

---

## Pendientes (anotados, no se pierden)

Cosas que se mencionaron durante el desarrollo pero que son trabajo futuro,
no de esta etapa:

- **Face ID / biometría real** — hoy no hay ningún lock biométrico. Haría falta
  `expo-local-authentication` y lógica de bloqueo en el `RootGate` de `App.js`.
- **"Family members"** — varios usuarios compartiendo un mismo presupuesto y
  gastos. Implica decidir cómo se modela una "familia" en la base de datos
  (¿una tabla `family` con varios `user_id` de Clerk?) y cómo cambian las RLS
  de `expenses`/`budgets` para permitir lectura compartida.
- **Email editable** en `EditProfileScreen` — cambiar el correo en Clerk es un
  flujo con verificación (correo nuevo + código), no se conectó todavía.
- **Unificar `usuario` con Clerk** (opcional) — si el equipo decide que vale la
  pena, agregar una columna `clerk_id` nullable a `usuario` y migrar
  `user_profile` (y quizás `expenses`) para usar esa tabla en vez de una
  propia. Ver `DATABASE.md`, sección 3.3, y las preguntas para el compañero.
- **Tablas heredadas sin confirmar RLS** — no se sabe si `usuario`, `compra`,
  etc. tienen Row Level Security activada. Ver `DATABASE.md`, sección 6.2.
- **Convención de nombres mixta** (inglés en tablas nuevas, español en las
  heredadas) — decidir si unificar antes de tener datos reales de usuarios.
- **Navegación sin librería** (`useState` + pila manual en `App.js`) — funciona,
  pero si la app sigue creciendo conviene evaluar React Navigation (URLs,
  animaciones, botón atrás de Android integrado).
- **Landing web desconectada** — la landing (`Landing.jsx`/`Login.jsx`, repo
  aparte) no usa Clerk ni Supabase; el login ahí es un formulario que no hace
  nada real. Conectarla implicaría usar `@clerk/clerk-react` con el mismo
  proyecto de Clerk que la app móvil.
- **Credenciales de Google propias para producción** — hoy el login con Google
  usa las credenciales de desarrollo que da Clerk. Para producción hace falta
  un Client ID/Secret de Google Cloud propios.
- **RewardsScreen, AvailableOffersScreen, DiscountsOffersScreen,
  PriceComparerScreen, AffiliatedBusinessesScreen, ShoppingStoreScreen,
  BasketScreen** — siguen con datos de ejemplo; dependen de datos de
  comercios/ofertas que todavía no se definieron.
- **OCR de tickets** — "Subir ticket" en `AIAssistantScreen` ya adjunta la
  imagen al chat, pero el asistente no la analiza todavía (responde un
  mensaje fijo). Falta elegir un servicio de OCR/vision y cargarlo como gasto
  automáticamente.
- **Historial del chat de IA no persiste** — vive solo en memoria mientras la
  pantalla está abierta. Guardarlo (por sesión o por usuario) es trabajo
  futuro, probablemente una tabla nueva en Supabase.
- **Notificaciones push / locales** — lo que hay es un centro de alertas
  dentro de la app (Etapa 6, Fase 4): la alerta solo existe si el usuario
  abre la pantalla de la campana, justo cuando ya no la necesita. Falta
  instalar `expo-notifications`, pedir permisos, registrar el token y
  disparar desde los mismos umbrales que ya calcula `useNotifications`.
  Falta también un badge de no leídas en la campana (`ScreenHeader` no lo
  soporta) y estado de leído/descartado.
- **`BasketScreen` recibe un `onBell` que no usa**, y `App.js` tampoco se lo
  pasa: el slot derecho del header lo ocupa el carrito. Prop fantasma, y el
  badge de ese carrito dice `3` en duro.
- **`SettingsScreen` es la única sub-pantalla de Perfil sin `BottomNav`** (y
  la única a la que `App.js` no le pasa `onNavigate`). Se sale solo con la
  flecha de atrás.
- **El Markdown del chat no cubre tablas, bloques ` ``` `, links ni listas
  anidadas** (Etapa 6, Fase 7). Hoy el system prompt le pide al modelo que no
  los use. Si el asistente necesita emitirlos, se cambia la implementación
  interna de `MarkdownText` por `react-native-marked` sin tocar `ChatBubble`.
- **Panel de administración de precios** — hoy el catálogo se carga desde el
  dashboard de Supabase. Cuando eso duela: panel web aparte (Vite/Next +
  Clerk + Supabase), con rol `merchant` para que cada comercio actualice lo
  suyo, e **importación CSV**, que probablemente sea la función principal —
  los comercios van a mandar Excel, no van a cargar 300 productos a mano.
- **Precios de la semilla son inventados** — `source = 'manual'` en
  `store_products`. Limpiar con `delete from public.store_products where
  source = 'manual';` apenas entren precios reales.
- **Los `cashback_pct` de la semilla son de ejemplo**, no hay contrato de
  afiliación firmado detrás. No mostrarlos como promesa al usuario.
- **Solicitud LAIP a la Defensoría del Consumidor** — PRECOMPRA
  (`precompra.defensoria.gob.sv`) tiene 100.000+ productos de 170
  supermercados con actualización semanal, entregados por las propias
  empresas. No tiene API pública, pero es información pública: se puede pedir
  por Ley de Acceso a la Información Pública. Gratis, lento, y nadie lo está
  haciendo.
- **Imágenes de producto** — `products.image_url` está vacío; hoy se usa
  `products.icon` (Ionicons) como fallback. Falta cargar fotos a Supabase
  Storage y completar desde Open Food Facts por `barcode` (ODbL, pero solo
  1.310 productos etiquetados El Salvador).
- **Carrito real** — `ShoppingStoreScreen` cuenta en estado local; no
  persiste ni se conecta con `BasketScreen`.

---

## Etapa 8 — Mapa de supermercados cercanos (OpenStreetMap)

La vista **Mapa** de `AffiliatedBusinessesScreen` dejó de ser un placeholder.

- **Dependencias nuevas:** `react-native-maps` y `expo-location` (las dos
  vienen en Expo Go). El plugin de `expo-location` en `app.json` define el
  texto del permiso de ubicación.
- **De dónde salen los puntos:** OpenStreetMap, vía la API pública Overpass
  (`shop=supermarket` en un radio de 3 km, o 8 km si hay menos de 3). Es gratis
  y no usa clave, así que se llama directo desde la app sin Edge Function. Si
  `overpass-api.de` falla, se prueba con un mirror. **Obligatorio:** mostrar
  "© OpenStreetMap contributors" junto al mapa (licencia ODbL).
- **Cómo se reconoce un afiliado:** el nombre o la marca de OSM se compara con
  `stores.name` sin palabras genéricas ("Súper", "La"…) y por palabras
  completas: "Selectos San Jacinto" → Súper Selectos, "Despensa de Don Juan"
  → no es afiliado. Ver `src/hooks/useNearbySupermarkets.js`.
- **Archivos:** `src/lib/geo.js`, `src/hooks/useUserLocation.js`,
  `src/hooks/useNearbySupermarkets.js`, `src/components/NearbyMap.native.js`
  (y `.web.js`, que muestra un aviso porque react-native-maps no soporta web).

**Pendiente:**
- **API key de Google Maps para builds de Android** (no hace falta en Expo
  Go). Ver `SETUP_TEAM.md`.
- Los datos de OSM pueden tener huecos o nombres mal escritos. Si hace falta
  precisión, se puede agregar una tabla `store_locations` con las coordenadas
  de cada sucursal afiliada.
