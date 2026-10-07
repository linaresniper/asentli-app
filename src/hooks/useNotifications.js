import { useBudget, useMonthExpenses } from './useExpenseData';
import { sumAmount, percentUsed, remainingBudget } from '../lib/expenseMath';

// Un gasto cuenta como "grande" si supera este % del presupuesto mensual, o
// un monto fijo si todavía no hay presupuesto configurado.
const LARGE_EXPENSE_BUDGET_RATIO = 0.3;
const LARGE_EXPENSE_FALLBACK_AMOUNT = 100;

/**
 * Alertas calculadas en el cliente a partir de datos reales (sin tabla ni
 * trigger nuevo — ver CHANGELOG, Etapa 6). Se recalculan en cada render con
 * los mismos hooks que ya usan HomeScreen/AIAssistantScreen, así que
 * desaparecen solas apenas el estado que las disparó deja de ser cierto.
 */
export function useNotifications() {
  const budgetQ = useBudget();
  const expensesQ = useMonthExpenses();

  const isLoading = budgetQ.isLoading || expensesQ.isLoading;
  const monthlyTotal = budgetQ.data?.monthlyTotal ?? 0;
  const expenses = expensesQ.data ?? [];
  const spent = sumAmount(expenses);
  const pct = percentUsed(expenses, monthlyTotal);

  const alerts = [];

  if (monthlyTotal > 0 && pct >= 1) {
    alerts.push({
      id: 'budget-over',
      type: 'budgetOver',
      spent,
      monthlyTotal,
      percent: Math.round(pct * 100),
    });
  } else if (monthlyTotal > 0 && pct >= 0.8) {
    alerts.push({
      id: 'budget-warning',
      type: 'budgetWarning',
      percent: Math.round(pct * 100),
      remaining: remainingBudget(expenses, monthlyTotal),
    });
  }

  const largeThreshold =
    monthlyTotal > 0 ? monthlyTotal * LARGE_EXPENSE_BUDGET_RATIO : LARGE_EXPENSE_FALLBACK_AMOUNT;

  expenses
    .filter((e) => Number(e.amount) >= largeThreshold)
    .forEach((e) => {
      alerts.push({
        id: `large-${e.id}`,
        type: 'largeExpense',
        amount: Number(e.amount),
        merchant: e.merchant || null,
        spentAt: e.spent_at,
      });
    });

  return { alerts, isLoading };
}
