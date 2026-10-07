import i18n from '../i18n';

// Turns a Clerk error into a single localized message for the UI.
// Los textos viven en `auth:errors.*` (en/es) y se resuelven con `i18n.t`
// porque esto no es un componente — las pantallas que lo llaman ya están
// suscritas a i18n con `useTranslation`, así que el mensaje sigue el idioma
// elegido. Clerk sigue mandando sus propios textos en inglés: solo los
// usamos como último recurso, cuando el código de error no está mapeado.
const MAPPED_CODES = new Set([
  'form_identifier_exists',
  'form_password_incorrect',
  'form_identifier_not_found',
  'form_password_pwned',
  'form_password_length_too_short',
  'form_param_format_invalid',
  'form_code_incorrect',
  'verification_failed',
  'session_exists',
  'too_many_requests',
]);

export function clerkErrorMessage(err, fallback) {
  const generic = fallback ?? i18n.t('auth:errors.generic');
  const first = err?.errors?.[0];
  if (!first) return err?.message || generic;
  if (MAPPED_CODES.has(first.code)) return i18n.t(`auth:errors.${first.code}`);
  return first.longMessage || first.message || generic;
}
