# CATALOG.md — De dónde salen los productos del catálogo

Este documento existe por una sola razón: que dentro de un año alguien pueda
responder **"¿por qué está el güisquil en el catálogo y no la Coca-Cola?"**
sin tener que adivinar, y pueda actualizar la lista cuando el BCR cambie la
canasta básica sin rehacer la investigación desde cero.

`DATABASE.md` describe **la forma** de las tablas. Este describe **el
contenido** de `products` y de dónde salió cada fila.

---

## 1. La regla

El catálogo de `products` contiene **únicamente** artículos que cumplen las
dos condiciones a la vez:

1. **Pertenecen a la Canasta Básica Alimentaria (CBA) oficial de El Salvador**,
   según la define el Banco Central de Reserva a través de la ONEC.
2. **Se consiguen en las cadenas afiliadas de la app** (Walmart, Súper
   Selectos, Maxi Despensa, Despensa Familiar).

Nada de snacks, bebidas gaseosas, productos de lujo ni "surtido genérico de
supermercado". Si un producto no cumple las dos, no entra.

> **Si agregás productos a `products`, actualizá este documento.** Si no, deja
> de ser cierto y el catálogo pierde la trazabilidad que es el punto de todo
> esto.

---

## 2. Quién publica la lista oficial

**El Banco Central de Reserva (BCR), a través de la Oficina Nacional de
Estadística y Censos (ONEC).**

La ONEC absorbió a la antigua **DIGESTYC** (Dirección General de Estadística y
Censos) y hoy es una dependencia del BCR. Es quien publica el costo de la CBA
urbana y rural. Si buscás "DIGESTYC canasta básica" vas a encontrar material
viejo pero válido en su estructura: es la misma canasta.

Portal oficial de consulta de costos:
<https://onec.bcr.gob.sv/ipc_consulta/>
(permite consultar costo por área y período 2001–2026, pero **no publica la
lista de productos ni los gramos** en la interfaz web).

### Advertencia metodológica

**La metodología de la CBA salvadoreña es de 1983 y no se ha actualizado.** No
incorpora criterios de calidad nutricional, a diferencia de Costa Rica,
Guatemala o Panamá. Es la lista oficial vigente, pero está criticada y es
posible que cambie. Por eso este documento existe.

---

## 3. La composición oficial

La CBA se define en **dos niveles**, y por eso en la prensa vas a ver dos
números distintos que parecen contradecirse pero no lo hacen:

- **11 grupos** (urbana) / **9 grupos** (rural)
- **22 artículos** (urbana) / **15 artículos** (rural)

Los 22 artículos son el desglose de los 11 grupos: dentro de cada grupo el BCR
lista los artículos concretos que lo pueden satisfacer.

### Los 11 grupos — CBA urbana

| Grupo | ¿También en la rural? |
|---|---|
| Pan Francés | ❌ |
| Tortillas | ✅ |
| Arroz | ✅ |
| Carnes | ✅ |
| Grasas | ✅ |
| Huevos | ✅ |
| Leche Fluida | ✅ |
| Frutas | ✅ |
| Frijoles | ✅ |
| Verduras | ❌ |
| Azúcar | ✅ |

**La CBA rural son los mismos grupos menos Pan Francés y Verduras.**

---

## 4. Los 22 artículos — y cómo se reconstruyeron

### Qué es dato oficial y qué es reconstrucción

Hay que ser claro con esto, porque afecta cuánta confianza merece cada parte:

- **Los 11 grupos son dato oficial verificado**, publicados en la Tabla 1 del
  artículo de la UES citando a ONEC (2024). Alta confianza.
- **La asignación de artículos a cada grupo es dato oficial**, publicado por
  El Diario de Hoy citando al BCR (grasas → margarina o aceite; frutas →
  guineo, plátano o naranja; verduras → güisquil, papa, cebolla, tomate,
  repollo o chile verde; carnes → res, cerdo o pollo).
- **La enumeración final de 22 filas es una reconstrucción propia**, hecha
  cruzando las dos fuentes. **No se encontró un PDF del BCR con la tabla
  literal de 22 artículos.**

### Por qué la reconstrucción es confiable

Tiene dos verificaciones aritméticas independientes que cierran exactas:

```
Pan francés          1
Tortillas            1
Arroz                1
Carnes               3   (res, cerdo, pollo)
Grasas               2   (aceite, margarina)
Huevos               1
Leche fluida         1
Frutas               3   (guineo, plátano, naranja)
Verduras             6   (güisquil, papa, cebolla, tomate, repollo, chile verde)
Frijoles             2   (rojo de seda, rojo tinto)
Azúcar               1
                    ──
            TOTAL   22   ← coincide con el total urbano que reportan las fuentes

menos Pan francés   -1
menos Verduras      -6
                    ──
            RURAL   15   ← coincide con el total rural que reportan las fuentes
```

Que **ambos** totales (22 y 15) cierren con la misma enumeración es una señal
fuerte de que el mapeo es correcto. Aun así: es reconstrucción, no
transcripción. Si aparece el documento primario del BCR, verificar contra él.

### La lista cargada

Es la que está en la sección 7 de `supabase/catalog.sql`, con `cba_group` e
`in_cba_rural` en cada fila para que la trazabilidad viva en la propia base y
no solo acá.

| # | Producto | Grupo CBA | Unidad | Categoría app | Rural |
|---|---|---|---|---|---|
| 1 | Pan francés | Pan Francés | Unidad | `food` | — |
| 2 | Tortillas de maíz | Tortillas | Paquete | `food` | ✅ |
| 3 | Arroz | Arroz | Libra | `food` | ✅ |
| 4 | Carne de res | Carnes | Libra | `meat` | ✅ |
| 5 | Carne de cerdo | Carnes | Libra | `meat` | ✅ |
| 6 | Pollo | Carnes | Libra | `meat` | ✅ |
| 7 | Aceite | Grasas | Botella 750 ml | `food` | ✅ |
| 8 | Margarina | Grasas | Libra | `food` | ✅ |
| 9 | Huevos | Huevos | **Unidad** | `food` | ✅ |
| 10 | Leche fluida | Leche Fluida | Litro | `dairy` | ✅ |
| 11 | Guineo | Frutas | Libra | `food` | ✅ |
| 12 | Plátano | Frutas | Unidad | `food` | ✅ |
| 13 | Naranja | Frutas | Unidad | `food` | ✅ |
| 14 | Güisquil | Verduras | Unidad | `food` | — |
| 15 | Papa | Verduras | Libra | `food` | — |
| 16 | Cebolla | Verduras | Libra | `food` | — |
| 17 | Tomate | Verduras | Libra | `food` | — |
| 18 | Repollo | Verduras | Unidad | `food` | — |
| 19 | Chile verde | Verduras | Unidad | `food` | — |
| 20 | Frijol rojo de seda | Frijoles | Libra | `food` | ✅ |
| 21 | Frijol rojo tinto | Frijoles | Libra | `food` | ✅ |
| 22 | Azúcar | Azúcar | Libra | `food` | ✅ |

---

## 5. Decisiones del equipo (y por qué)

Estas no salen de la fuente oficial — las tomó el equipo y conviene que
queden escritas.

**Las categorías son las 4 de gasto.** `products.category` reusa
`food`/`dairy`/`meat`/`other`, las mismas de `expenses.category` y de
`src/constants/categories.js`. Así, cuando una compra genere un gasto, la
categoría sale sola. **`other` queda vacío** en la semilla: ningún artículo de
la CBA cae ahí. La categoría sigue existiendo para gastos del usuario.

**Los huevos son `food`, no `dairy`.** No son lácteo. Decisión explícita.

**La unidad de los huevos es "Unidad", no "Cartón".** Esto importa más de lo
que parece: si un comercio carga el precio del cartón de 30 y otro el de 12, el
comparador miente — mostraría $5.70 contra $2.40 como si el segundo fuera más
barato. La unidad vive en `products`, no en `store_products`, justamente para
que sea **canónica**: todos los comercios cotizan la misma cosa. Si más
adelante se quiere mostrar "cartón de 30 · $5.70", eso es una columna de
presentación en `store_products` (`package_label`), no un cambio de unidad.
El mismo razonamiento aplica a cualquier producto que se venda en empaques
distintos según la cadena.

**Los nombres están en español.** Son datos, no cadenas de interfaz: no pasan
por i18next. Si algún día la app necesita el catálogo en inglés, se agrega
`name_en` a `products`; no se traduce en el cliente.

**Las imágenes van a Supabase Storage**, y se completan desde Open Food Facts
cuando haya código de barras (`products.barcode`). Open Food Facts es ODbL
(permite uso comercial citando la fuente) pero solo tiene **1.310 productos**
etiquetados El Salvador, así que va a cubrir una parte. Mientras no haya foto,
`products.icon` tiene un Ionicon y la app lo usa como fallback.

---

## 6. Cómo actualizar esto cuando cambie la CBA

1. Verificar en <https://onec.bcr.gob.sv/ipc_consulta/> o en el BCR si cambió
   la composición (no solo el costo — el **costo** cambia todos los meses, la
   **composición** casi nunca).
2. Si cambió: conseguir el documento nuevo, anotarlo en la sección 7 de acá
   abajo con su fecha, y actualizar la tabla de la sección 4.
3. Ajustar la semilla en `supabase/catalog.sql`, el `check` de `cba_group` si
   aparecen grupos nuevos, y los `in_cba_rural`.
4. Para los productos que salgan de la canasta: `update public.products set
   is_active = false where slug = '…'` en vez de `delete`, para no romper el
   histórico de `price_history` ni las referencias.

---

## 7. Registro de versiones de la fuente

| Qué | Cuándo |
|---|---|
| **Composición de la CBA usada** | Publicada por ONEC/BCR, vigente al 2024 según la fuente primaria consultada. Metodología base: **1983**. |
| **Fecha de la investigación y carga** | **3 de octubre de 2026** |
| **Cargado por** | Semilla de `supabase/catalog.sql`, sección 7 |
| **Próxima verificación sugerida** | Al cierre de cada año fiscal, o si la prensa reporta un cambio de metodología |

### Fuentes consultadas

1. **Lemus Mejía, G. M. (2024).** *Canasta básica alimentaria en El Salvador:
   análisis de precios, inflación y seguridad alimentaria.* Revista de Ciencias
   Económicas, Facultad de Ciencias Económicas, Universidad de El Salvador,
   Vol. 2, Núm. 1, pp. 29–40. Presentado marzo 2024, aceptado mayo 2024.
   **Tabla 1** — composición urbana/rural, citando a ONEC (2024).
   <https://revistas.ues.edu.sv/index.php/rce/article/download/3320/4246/10070>
   → De acá salen **los 11 grupos**.

2. **El Diario de Hoy (2024).** *Esta es la escasa canasta básica en El
   Salvador.*
   <https://www.elsalvador.com/h-noticias/h-negocios/el-salvador-escasa-canasta-basic/1124190/2024/>
   → De acá sale **qué artículos componen cada grupo**, citando al BCR.

3. **Infobae (24/09/2026).** *¿Qué impide comparar el precio de la canasta
   básica alimentaria salvadoreña con las de otros países centroamericanos?*
   <https://www.infobae.com/el-salvador/2026/09/24/que-impide-comparar-el-precio-de-la-canasta-basica-alimentaria-salvadorena-con-las-de-otros-paises-centroamericanos/>
   → De acá salen **los totales 22 / 15** y la **metodología de 1983**.

4. **ONEC / BCR** — Consulta de IPC y Canasta Básica Alimentaria.
   <https://onec.bcr.gob.sv/ipc_consulta/>
   → Portal oficial. Consultado: **no publica la lista de productos**.

### Pendiente de verificación

> El equipo mencionó un **estudio de mercado propio con datos de BCR/DIGESTYC**
> en documentos Word/PDF fuera de este repo. **No se pudo contrastar**: no está
> en el repositorio (se buscó en los 9 documentos existentes). Si aparece y
> contradice la reconstrucción de la sección 4, **gana el estudio** y hay que
> corregir acá y en `supabase/catalog.sql`.
