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

## Etapa 4 — Perfil de usuario completo (esta etapa)

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
