import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { categoryLabelKey } from '../constants/categories';

/**
 * Translated name of a spending category. Single place where a category key
 * ('food', 'dairy', …) becomes visible text, so the Add Expense chips, the
 * donut legend, the budget breakdown, the purchase history and the AI chat
 * breakdown always say the same thing in the same language.
 */
export function useCategoryLabel() {
  const { t } = useTranslation('common');
  return useCallback((key) => t(categoryLabelKey(key)), [t]);
}
