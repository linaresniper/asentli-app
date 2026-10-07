import { CATEGORIES } from '../constants/categories';
import { weekBucketsOfMonth, relativeDayGroup, RELATIVE_GROUP_ORDER, formatMoney } from './dates';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function sumAmount(expenses = []) {
  return expenses.reduce((acc, e) => acc + num(e.amount), 0);
}

/** { food, dairy, meat, other } — every key present, 0 default. */
export function sumByCategory(expenses = []) {
  const out = {};
  CATEGORIES.forEach((c) => {
    out[c.key] = 0;
  });
  expenses.forEach((e) => {
    if (out[e.category] === undefined) out.other += num(e.amount);
    else out[e.category] += num(e.amount);
  });
  return out;
}

/** [{ key, color, value, pct }] for all 4 categories. pct in 0..1. */
export function donutData(expenses = []) {
  const byCat = sumByCategory(expenses);
  const total = sumAmount(expenses);
  return CATEGORIES.map((c) => ({
    key: c.key,
    color: c.color,
    value: byCat[c.key],
    pct: total > 0 ? byCat[c.key] / total : 0,
  }));
}

/** Per-category spend as a share of the monthly budget (0 budget -> 0). */
export function budgetBreakdown(expenses = [], monthlyTotal = 0) {
  const byCat = sumByCategory(expenses);
  const budget = num(monthlyTotal);
  return CATEGORIES.map((c) => ({
    key: c.key,
    color: c.color,
    icon: c.icon,
    amount: byCat[c.key],
    pct: budget > 0 ? byCat[c.key] / budget : 0,
  }));
}

/** Four bars for the current month. Returns [{ n, amount }] (n = 1..4). */
export function weeklyBars(expenses = [], ref = new Date()) {
  const buckets = weekBucketsOfMonth(ref);
  return buckets.map((b) => {
    const amount = expenses.reduce((acc, e) => {
      const t = new Date(e.spent_at).getTime();
      return t >= b.from.getTime() && t < b.to.getTime() ? acc + num(e.amount) : acc;
    }, 0);
    return { n: b.n, amount };
  });
}

/** [{ key, items }] in today / yesterday / lastWeek / earlier order, non-empty only.
 *  `key` is an i18n key under `common:relativeDays.*` — the screen translates it. */
export function groupByRelativeDate(expenses = [], now = new Date()) {
  const groups = {};
  expenses.forEach((e) => {
    const key = relativeDayGroup(e.spent_at, now);
    (groups[key] = groups[key] || []).push(e);
  });
  return RELATIVE_GROUP_ORDER.filter((key) => groups[key]?.length).map((key) => ({
    key,
    items: groups[key].sort((a, b) => new Date(b.spent_at) - new Date(a.spent_at)),
  }));
}

/**
 * Which "$X more/less than last period" line to show, as an i18n key under
 * `home:statistics.insight.*` plus the values to interpolate. The sentence
 * itself lives in the locale files — it can't be concatenated here because
 * word order differs between languages.
 */
export function comparisonInsight(current, previous) {
  const cur = num(current);
  const prev = num(previous);
  if (prev <= 0 && cur <= 0) return { key: 'none' };
  if (prev <= 0) return { key: 'first' };
  const diff = cur - prev;
  if (Math.abs(diff) < 0.01) return { key: 'same' };
  return { key: diff > 0 ? 'more' : 'less', amount: formatMoney(Math.abs(diff)) };
}

/** Presupuesto restante del mes (puede ser negativo si ya se pasó). */
export function remainingBudget(expenses = [], monthlyTotal = 0) {
  return num(monthlyTotal) - sumAmount(expenses);
}

/** Fracción 0..n del presupuesto ya gastada (0 si no hay presupuesto). */
export function percentUsed(expenses = [], monthlyTotal = 0) {
  const budget = num(monthlyTotal);
  if (budget <= 0) return 0;
  return sumAmount(expenses) / budget;
}


