import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

// Render del Markdown que devuelve el asistente de IA.
//
// Parser propio a propósito, en vez de una librería (ver CHANGELOG, Etapa 6
// fase 6): la entrada no es Markdown arbitrario de internet, es la salida de
// un modelo cuyo system prompt controlamos nosotros y que tiene fijado el
// subconjunto que puede usar (ver supabase/functions/ai-assistant/index.ts).
// Además el requisito que más valor tiene acá — resaltar montos y
// porcentajes — no lo trae ninguna librería: habría que interceptar su regla
// de texto igual, peleando contra su sistema de estilos. Acá es la última
// pasada del tokenizador inline.
//
// Lo que NO cubre (degrada a texto plano, nunca peor que no parsear nada):
// tablas, bloques ``` de código, links, imágenes y listas anidadas.

// Un token inline por alternativa. El orden importa: `**` antes que `*`, si
// no la negrita se parsea como dos itálicas vacías.
const INLINE_RE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`)/g;

// Montos ($1,234.50, -$12.30, $0.50) y porcentajes (85%, 12.5 %).
const AMOUNT_RE = /(-?\$\s?\d[\d,]*(?:\.\d+)?|-?\d+(?:[.,]\d+)?\s?%)/g;

const HEADING_RE = /^(#{1,6})\s+(.*)$/;
const BULLET_RE = /^\s*[-*•]\s+(.*)$/;
const ORDERED_RE = /^\s*(\d+)[.)]\s+(.*)$/;

/** Markdown en bloques: [{ type, ... }]. Líneas en blanco separan bloques. */
function parseBlocks(input) {
  const lines = String(input ?? '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      flushParagraph();
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      continue;
    }

    const ordered = line.match(ORDERED_RE);
    if (ordered) {
      flushParagraph();
      blocks.push({ type: 'item', marker: `${ordered[1]}.`, text: ordered[2] });
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      flushParagraph();
      blocks.push({ type: 'item', marker: '•', text: bullet[1] });
      continue;
    }

    // Línea suelta: se acumula en el párrafo actual (los saltos simples
    // dentro de un párrafo no son saltos en Markdown).
    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks;
}

/** Resalta montos y porcentajes dentro de un fragmento de texto plano. */
function renderAmounts(text, keyPrefix, styles) {
  const parts = text.split(AMOUNT_RE);
  return parts.map((part, i) =>
    // Los índices impares son los grupos capturados por el split.
    i % 2 === 1 ? (
      <Text key={`${keyPrefix}-a${i}`} style={styles.amount}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

/** Negritas, itálicas, `code` y realce de montos dentro de una línea. */
function renderInline(text, keyPrefix, styles) {
  const parts = String(text).split(INLINE_RE);

  return parts.flatMap((part, i) => {
    if (!part) return [];
    const key = `${keyPrefix}-i${i}`;

    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return (
        <Text key={key} style={styles.bold}>
          {renderAmounts(part.slice(2, -2), key, styles)}
        </Text>
      );
    }
    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return (
        <Text key={key} style={styles.italic}>
          {renderAmounts(part.slice(1, -1), key, styles)}
        </Text>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <Text key={key} style={styles.code}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return renderAmounts(part, key, styles);
  });
}

/**
 * Muestra la respuesta del asistente con formato.
 * `style` es el estilo base del texto (tamaño, color, lineHeight) — el mismo
 * que usaría un <Text> plano, para que la burbuja no cambie de aspecto.
 */
export default function MarkdownText({ text, style }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const blocks = useMemo(() => parseBlocks(text), [text]);

  if (!blocks.length) return null;

  return (
    <View>
      {blocks.map((block, i) => {
        const key = `b${i}`;
        const spacing = i === 0 ? null : styles.blockSpacing;

        if (block.type === 'heading') {
          return (
            <Text
              key={key}
              style={[style, styles.heading, block.level === 1 && styles.headingLarge, spacing]}
            >
              {renderInline(block.text, key, styles)}
            </Text>
          );
        }

        if (block.type === 'item') {
          return (
            <View key={key} style={[styles.itemRow, spacing]}>
              <Text style={[style, styles.marker]}>{block.marker}</Text>
              <Text style={[style, styles.itemText]}>{renderInline(block.text, key, styles)}</Text>
            </View>
          );
        }

        return (
          <Text key={key} style={[style, spacing]}>
            {renderInline(block.text, key, styles)}
          </Text>
        );
      })}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    blockSpacing: { marginTop: 10 },

    heading: { fontWeight: '800', fontSize: 15, lineHeight: 21, color: colors.text },
    headingLarge: { fontSize: 17, lineHeight: 23 },

    bold: { fontWeight: '800' },
    italic: { fontStyle: 'italic' },
    code: {
      fontFamily: 'monospace',
      backgroundColor: colors.inputBg,
      color: colors.bottleGreenText,
    },

    // Montos y porcentajes en el naranja de marca, para que no se pierdan
    // en el párrafo. Hereda tamaño y peso del contexto (si cae dentro de una
    // negrita, queda naranja Y en negrita).
    amount: { color: colors.primary, fontWeight: '800' },

    itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
    // `marker` con ancho fijo para que las viñetas y los números queden
    // alineados entre sí y el texto del ítem tenga sangría pareja.
    marker: { width: 22, fontWeight: '800', color: colors.primary },
    itemText: { flex: 1 },
  });
