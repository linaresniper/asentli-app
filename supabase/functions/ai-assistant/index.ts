// supabase/functions/ai-assistant/index.ts
//
// Edge Function del asistente de IA de Asentli. Corre en el servidor de
// Supabase (Deno), nunca en el teléfono del usuario.
//
// Flujo:
//   1. La app llama a supabase.functions.invoke('ai-assistant', { body: { message } }).
//      El SDK reenvía automáticamente el JWT de sesión de Clerk en el header
//      Authorization (mismo mecanismo que usan las consultas a `expenses`/`budgets`).
//   2. Acá creamos un cliente de Supabase "como ese usuario" (mismo Authorization),
//      así Postgres aplica RLS igual que en la app: solo puede leer sus propias
//      filas de `expenses` y `budgets`. Esta función NUNCA usa la service role key.
//   3. Con esos datos armamos un contexto en español con números reales.
//   4. Mandamos ese contexto + el mensaje del usuario a Groq (Llama). La clave
//      de Groq vive solo acá, como secreto de servidor (`supabase secrets set`).
//
// verify_jwt = false en supabase/config.toml: el login es de Clerk, no de
// Supabase Auth, así que la verificación automática de JWT de Supabase no
// aplica. La autorización real la hace RLS con el JWT reenviado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.4';

// llama-3.3-70b-versatile pasó a ser "Enterprise" en Groq (ya no está en el
// plan gratuito, devuelve 404 "no existe o no tenés acceso" con una API key
// free). openai/gpt-oss-120b sí está en el plan Free, con los mismos límites
// de rate que el 20b pero mejor calidad de respuesta.
const GROQ_MODEL = 'openai/gpt-oss-120b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Mismas 4 categorías que src/constants/categories.js, con los mismos
// nombres que src/locales/<lang>/common.json → `categories.*`. Se usan SOLO
// para el texto de contexto que lee el modelo: el desglose estructurado que
// vuelve a la app manda solo la `key`, y la app lo traduce con su propio
// i18n. Así el chat y el resto de la app no pueden decir cosas distintas.
const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  en: { food: 'Food', dairy: 'Dairy', meat: 'Meat', other: 'Other' },
  es: { food: 'Alimentos', dairy: 'Lácteos', meat: 'Carnes', other: 'Otros' },
};

const DEFAULT_LANGUAGE = 'en';

/** 'es-AR' → 'es'; cualquier idioma que no tengamos cae en inglés. */
function normalizeLanguage(raw: unknown): string {
  const base = typeof raw === 'string' ? raw.split('-')[0].toLowerCase() : '';
  return CATEGORY_LABELS[base] ? base : DEFAULT_LANGUAGE;
}

function categoryLabel(key: string, language: string) {
  return CATEGORY_LABELS[language]?.[key] ?? CATEGORY_LABELS[DEFAULT_LANGUAGE][key] ?? key;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function formatMoney(n: number) {
  const value = Number.isFinite(n) ? n : 0;
  const [int, dec] = Math.abs(value).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${value < 0 ? '-' : ''}$${grouped}.${dec}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

type Expense = { amount: number | string; category: string };

function sumAmount(expenses: Expense[]) {
  return expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
}

function sumByCategory(expenses: Expense[]) {
  const out: Record<string, number> = { food: 0, dairy: 0, meat: 0, other: 0 };
  for (const e of expenses) {
    const amount = Number(e.amount) || 0;
    if (out[e.category] === undefined) out.other += amount;
    else out[e.category] += amount;
  }
  return out;
}

function buildContext(
  monthlyBudget: number,
  current: Expense[],
  previous: Expense[],
  language: string,
) {
  const totalThisMonth = sumAmount(current);
  const totalLastMonth = sumAmount(previous);
  const hasAnyData = monthlyBudget > 0 || current.length > 0 || previous.length > 0;

  if (!hasAnyData) {
    return (
      'El usuario todavía NO tiene presupuesto ni gastos cargados en la app. ' +
      'No inventes ningún número: decile claramente que primero cargue su presupuesto ' +
      'y sus gastos para poder ayudarlo con eso.'
    );
  }

  const lines: string[] = [];
  lines.push(
    `Presupuesto mensual configurado: ${monthlyBudget > 0 ? formatMoney(monthlyBudget) : 'no configurado todavía'}.`
  );
  lines.push(
    `Gastado en lo que va del mes: ${formatMoney(totalThisMonth)}` +
      (monthlyBudget > 0
        ? ` (${Math.round((totalThisMonth / monthlyBudget) * 100)}% del presupuesto).`
        : '.')
  );
  if (monthlyBudget > 0) {
    lines.push(`Restante del presupuesto este mes: ${formatMoney(monthlyBudget - totalThisMonth)}.`);
  }

  const byCategory = sumByCategory(current);
  if (current.length > 0) {
    const breakdown = Object.entries(byCategory)
      .map(([key, amount]) => `${categoryLabel(key, language)}: ${formatMoney(amount)}`)
      .join(', ');
    lines.push(`Desglose por categoría este mes: ${breakdown}.`);
  } else {
    lines.push('Todavía no hay gastos cargados este mes.');
  }

  if (previous.length > 0) {
    const diff = totalThisMonth - totalLastMonth;
    if (Math.abs(diff) < 0.01) {
      lines.push(`El mes pasado gastó ${formatMoney(totalLastMonth)}, prácticamente igual que este mes.`);
    } else {
      const dir = diff > 0 ? 'más' : 'menos';
      lines.push(
        `El mes pasado gastó ${formatMoney(totalLastMonth)}, es decir ${formatMoney(Math.abs(diff))} ${dir} que en lo que va de este mes.`
      );
    }
  } else {
    lines.push('No hay gastos registrados del mes anterior para comparar.');
  }

  return lines.join('\n');
}

// Mismos números que ya calcula buildContext, pero sin aplanar a prosa —
// para que el chat pueda renderizar un desglose estructurado (lista/mini-
// gráfico) en vez de solo texto. Solo se devuelve si hay gastos este mes.
function buildStructuredData(monthlyBudget: number, current: Expense[]) {
  if (current.length === 0) return null;
  const spent = sumAmount(current);
  const byCategory = sumByCategory(current);
  return {
    budget: monthlyBudget,
    spent,
    remaining: monthlyBudget > 0 ? monthlyBudget - spent : null,
    percentUsed: monthlyBudget > 0 ? spent / monthlyBudget : null,
    // Sin `label` a propósito: la app resuelve el nombre visible con su
    // propio i18n (useCategoryLabel), así el desglose del chat siempre está
    // en el idioma elegido en la app, aunque el usuario escriba en otro.
    byCategory: Object.entries(byCategory)
      .filter(([, amount]) => amount > 0)
      .map(([key, amount]) => ({ key, amount })),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'No autenticado.' }, 401);
    }

    let message: string | undefined;
    let language = DEFAULT_LANGUAGE;
    try {
      const body = await req.json();
      message = body?.message;
      language = normalizeLanguage(body?.language);
    } catch {
      return jsonResponse({ error: 'Cuerpo de la solicitud inválido.' }, 400);
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return jsonResponse({ error: 'Falta el mensaje.' }, 400);
    }

    const groqKey = Deno.env.get('GROQ_API_KEY')?.trim();
    if (!groqKey) {
      return jsonResponse(
        { error: 'El asistente no está configurado en el servidor (falta GROQ_API_KEY).' },
        500
      );
    }

    // Cliente "como el usuario": mismo JWT de Clerk que llegó en el request.
    // RLS filtra automáticamente sus propias filas de expenses/budgets.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const now = new Date();
    const monthStart = startOfMonth(now);
    const prevMonthStart = startOfMonth(addMonths(now, -1));

    const [budgetRes, currentRes, previousRes] = await Promise.all([
      supabase.from('budgets').select('monthly_total').maybeSingle(),
      supabase
        .from('expenses')
        .select('amount, category')
        .gte('spent_at', monthStart.toISOString())
        .lte('spent_at', now.toISOString()),
      supabase
        .from('expenses')
        .select('amount, category')
        .gte('spent_at', prevMonthStart.toISOString())
        .lt('spent_at', monthStart.toISOString()),
    ]);

    const queryError = budgetRes.error || currentRes.error || previousRes.error;
    if (queryError) {
      console.error('ai-assistant: query error', JSON.stringify(queryError));
      return jsonResponse({ error: 'No pude leer tus datos de gastos ahora mismo.' }, 500);
    }

    const monthlyBudget = Number(budgetRes.data?.monthly_total ?? 0);
    const current = currentRes.data ?? [];
    const contextText = buildContext(monthlyBudget, current, previousRes.data ?? [], language);
    const structuredData = buildStructuredData(monthlyBudget, current);

    const systemPrompt = [
      'Sos el asistente de Asentli, una app de control de gastos del hogar. Podés charlar y responder cualquier tipo de pregunta, no solo de plata — sé útil, claro y lo más completo que la pregunta amerite.',
      'Mantené siempre un comportamiento responsable: nunca das consejos ilegales, peligrosos para la salud/seguridad de alguien, ni contenido de odio, sexual, o que facilite dañar a otros. Si te piden algo así, decliná con amabilidad y explicá brevemente por qué.',
      'Respondé siempre en el mismo idioma en el que el usuario te escribe su mensaje (si escribe en inglés, respondé en inglés; si escribe en español, respondé en español; y así con cualquier otro idioma), con un tono amable y directo. Esto es independiente del idioma que tenga seleccionado el resto de la app.',
      // El chat renderiza Markdown con un parser propio acotado
      // (src/components/MarkdownText.js). Le fijamos al modelo exactamente
      // ese subconjunto para que no mande tablas ni bloques de código, que
      // se verían como texto plano con los símbolos a la vista.
      'Formato de tus respuestas: podés usar **negrita** para destacar lo importante, listas con "- " o "1. " para enumerar, y títulos cortos con "## " si la respuesta es larga. NO uses tablas, bloques de código con ```, links en Markdown, imágenes ni listas anidadas: la app no los sabe mostrar y se verían rotos. Para respuestas cortas, texto corrido está bien.',
      'Cuando la pregunta sea sobre la plata, los gastos o el presupuesto DEL USUARIO (no preguntas generales de finanzas), estos son los ÚNICOS datos reales que podés usar — no inventes ni un solo número que no esté acá:',
      contextText,
    ].join('\n\n');

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.5,
        max_tokens: 800,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      }),
    });

    if (!groqRes.ok) {
      const groqErrorBody = await groqRes.text();
      console.error('ai-assistant: groq error', groqRes.status, groqErrorBody);
      const status = groqRes.status === 429 ? 429 : 502;
      const errorMessage =
        status === 429
          ? 'El asistente está muy solicitado ahora mismo. Probá de nuevo en un momento.'
          : 'El asistente no pudo responder. Probá de nuevo en un momento.';
      return jsonResponse({ error: errorMessage }, status);
    }

    const groqData = await groqRes.json();
    const reply = groqData?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return jsonResponse({ error: 'El asistente no devolvió una respuesta.' }, 502);
    }

    return jsonResponse({ reply, data: structuredData });
  } catch (err) {
    console.error('ai-assistant: unexpected error', err);
    return jsonResponse({ error: 'Error inesperado en el asistente.' }, 500);
  }
});
