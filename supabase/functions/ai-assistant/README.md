# Edge Function `ai-assistant`

Recibe el mensaje del chat de `AIAssistantScreen`, arma el contexto real del
usuario (presupuesto, gastos del mes, comparación con el mes anterior) y le
pregunta a Groq (Llama). La clave de Groq **nunca** está en este repo.

## Guardar la clave de Groq (una vez, por proyecto)

```bash
npm install -g supabase          # si no lo tenés instalado
supabase login
supabase link --project-ref qupfliqtuvledgpocoaz
supabase secrets set GROQ_API_KEY=gsk_tu_clave_aca
```

Esto guarda el secreto del lado del servidor de Supabase. No queda en ningún
archivo del proyecto ni se sube a git.

## Desplegar / actualizar la función

```bash
supabase functions deploy ai-assistant
```

(`verify_jwt = false` ya está configurado en `supabase/config.toml` — el
login es de Clerk, no de Supabase Auth, así que la función no puede usar la
verificación nativa de JWT de Supabase. La seguridad real la da RLS: la
función reenvía el JWT de Clerk que llega de la app a Postgres, y las
políticas de `expenses`/`budgets` solo dejan ver las filas del propio
usuario.)

## Probar en local (opcional)

```bash
supabase functions serve ai-assistant --env-file <(echo "GROQ_API_KEY=gsk_tu_clave_aca")
```
