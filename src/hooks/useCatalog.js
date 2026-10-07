import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-expo';
import { supabase } from '../lib/supabase';

// Catálogo de productos y precios por comercio.
//
// Diferencia importante con useExpenseData.js: esos hooks leen datos PRIVADOS
// del usuario y filtran por `user_id`. Estos leen CATÁLOGO COMPARTIDO — las
// mismas filas para todos. No hay `user_id` en la query; la RLS ya permite
// que cualquier usuario logueado lea todo (ver supabase/catalog.sql).
//
// Por eso el `queryKey` tampoco lleva el userId: cachear por usuario sería
// desperdiciar memoria guardando N copias de lo mismo.

const STORE_COLS = 'id, slug, name, category, cashback_pct, logo_url, address';
const PRODUCT_COLS = 'id, slug, name, unit, category, cba_group, image_url, icon';

// El catálogo cambia poco (precios, semanalmente en el mejor caso). No tiene
// sentido re-pedirlo en cada montaje como hacemos con los gastos.
const CATALOG_STALE_TIME = 5 * 60 * 1000;

/** Comercios afiliados activos, alfabéticos. */
export function useStores() {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['stores'],
    enabled: Boolean(isSignedIn),
    staleTime: CATALOG_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select(STORE_COLS)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Catálogo con el precio de cada producto en un comercio.
 *
 * `storeId` opcional: sin él devuelve el catálogo con el precio MÁS BAJO
 * disponible de cada producto (que es lo que tiene sentido mostrar en una
 * vitrina general). Con él, solo lo que vende ese comercio.
 *
 * Devuelve [{ id, slug, name, unit, category, icon, image_url, price,
 *             storeId, storeName, offerCount }]
 * con `price` ya en número (no string) y `null` si nadie lo cotiza.
 */
export function useStoreProducts({ storeId = null, category = null } = {}) {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['catalog-products', storeId, category],
    enabled: Boolean(isSignedIn),
    staleTime: CATALOG_STALE_TIME,
    queryFn: async () => {
      // Una sola query con join embebido en vez de N+1: traemos cada producto
      // con todas sus ofertas y elegimos acá la más barata.
      let query = supabase
        .from('products')
        .select(`${PRODUCT_COLS}, store_products ( price, in_stock, store_id, stores ( id, name ) )`)
        .eq('is_active', true)
        .order('name');

      if (category) query = query.eq('category', category);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((p) => {
        const offers = (p.store_products ?? [])
          .filter((o) => o.in_stock)
          .filter((o) => (storeId ? o.store_id === storeId : true))
          .map((o) => ({ price: Number(o.price), store: o.stores }))
          .sort((a, b) => a.price - b.price);

        const best = offers[0] ?? null;
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          unit: p.unit,
          category: p.category,
          cbaGroup: p.cba_group,
          imageUrl: p.image_url,
          icon: p.icon,
          price: best?.price ?? null,
          storeId: best?.store?.id ?? null,
          storeName: best?.store?.name ?? null,
          offerCount: offers.length,
        };
      });
    },
  });
}

/**
 * Todos los comercios que venden un producto, del más barato al más caro.
 * Es lo que alimenta el comparador. `best` se CALCULA (el primero), no viene
 * marcado desde la base.
 */
export function useProductPrices(productId) {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['product-prices', productId],
    enabled: Boolean(isSignedIn && productId),
    staleTime: CATALOG_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_products')
        .select('price, in_stock, updated_at, stores ( id, slug, name, cashback_pct )')
        .eq('product_id', productId)
        .eq('in_stock', true)
        .order('price', { ascending: true });
      if (error) throw error;

      return (data ?? []).map((row, i) => ({
        storeId: row.stores?.id,
        storeName: row.stores?.name,
        cashbackPct: Number(row.stores?.cashback_pct ?? 0),
        price: Number(row.price),
        updatedAt: row.updated_at,
        best: i === 0,
      }));
    },
  });
}

/** Un producto por slug — para abrir el comparador desde un enlace fijo. */
export function useProductBySlug(slug) {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ['product', slug],
    enabled: Boolean(isSignedIn && slug),
    staleTime: CATALOG_STALE_TIME,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_COLS)
        .eq('slug', slug)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}
