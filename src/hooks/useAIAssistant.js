import { useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import i18n from '../i18n';

// Llama a la Edge Function `ai-assistant` (Groq corre del lado del servidor,
// nunca en el teléfono — ver supabase/functions/ai-assistant/README.md).
export function useAIAssistant() {
  return useMutation({
    mutationFn: async (message) => {
      const { data: payload, error } = await supabase.functions.invoke('ai-assistant', {
        // El idioma va al servidor para que el contexto que recibe el modelo
        // use las mismas etiquetas de categoría que muestra la app.
        body: { message, language: i18n.language },
      });

      if (error) {
        let serverMessage;
        try {
          const body = await error.context?.json();
          serverMessage = body?.error;
        } catch {
          // La respuesta no era JSON (ej. sin conexión) — usamos el mensaje genérico.
        }
        throw new Error(serverMessage || i18n.t('aiAssistant:networkError'));
      }

      if (!payload?.reply) {
        throw new Error(i18n.t('aiAssistant:emptyReply'));
      }

      // `data` (opcional): números estructurados del mes actual, calculados
      // por la función con los mismos datos que ya usa para el texto — la
      // pantalla decide si los renderiza como lista/mini-gráfico además del
      // texto (ver ChatBubble en AIAssistantScreen.js).
      return { reply: payload.reply, data: payload.data ?? null };
    },
  });
}
