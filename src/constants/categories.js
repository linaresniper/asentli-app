import { colors } from '../theme/colors';

// Single source of truth for spending categories.
// `key` is what's stored in expenses.category (matches the DB CHECK constraint)
// AND the i18n key under `common:categories.*`. There is deliberately no
// `label` here: the visible name is resolved at render time with
// `useCategoryLabel()` (src/hooks/useCategoryLabel.js) so it follows the
// language the user picked. The Edge Function of the AI assistant uses these
// same keys, so the chat breakdown and the rest of the app can never disagree.
export const CATEGORIES = [
  { key: 'food', color: colors.catFood, icon: 'nutrition' },
  { key: 'dairy', color: colors.catDairy, icon: 'cafe' },
  { key: 'meat', color: colors.catMeat, icon: 'restaurant' },
  { key: 'other', color: colors.catOther, icon: 'ellipsis-horizontal' },
];

export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key);

export const CATEGORY_BY_KEY = CATEGORIES.reduce((acc, c) => {
  acc[c.key] = c;
  return acc;
}, {});

/** i18n key for a category, falling back to `other` for unknown values. */
export function categoryLabelKey(key) {
  return `categories.${CATEGORY_BY_KEY[key] ? key : 'other'}`;
}

export function categoryColor(key) {
  return CATEGORY_BY_KEY[key]?.color ?? colors.catOther;
}

export function categoryIcon(key) {
  return CATEGORY_BY_KEY[key]?.icon ?? 'ellipsis-horizontal';
}

// Convenience for the store/merchant quick-picks on the Add Expense form.
export const KNOWN_MERCHANTS = [
  'Súper Selectos',
  'La Despensa Familiar',
  'Farmacia San Nicolás',
  'Panadería La Espiga',
  'Carnicería El Novillo',
];
