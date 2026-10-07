import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { haversineKm, normalizeName } from '../lib/geo';

// Supermercados cercanos desde OpenStreetMap (API Overpass).
//
// Se llama directo desde la app: Overpass es público, gratis y no usa clave,
// así que no hay secreto que esconder en una Edge Function. A cambio, hay que
// ser buen ciudadano con su servidor: cacheamos por ~100 m de posición y
// 10 minutos, y pedimos un máximo acotado de resultados.

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

// overpass-api.de responde 406 a clientes sin User-Agent identificable.
const OVERPASS_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  Accept: 'application/json',
  'User-Agent': 'Asentli/1.0 (app movil; supermercados cercanos)',
};

// Palabras que no distinguen una cadena de otra: en OSM la misma sucursal
// aparece como 'Selectos San Jacinto' o 'Super Selectos', y en la base el
// comercio se llama 'Súper Selectos' / 'La Despensa Familiar'.
const GENERIC_WORDS = new Set(['super', 'supermercado', 'la', 'el', 'los', 'las']);

const DEFAULT_RADIUS_M = 3000;
const FALLBACK_RADIUS_M = 8000;
const MIN_RESULTS = 3;
const MAX_RESULTS = 60;
const STALE_TIME = 10 * 60 * 1000;

function buildQuery(lat, lon, radius) {
  const around = `around:${radius},${lat},${lon}`;
  return (
    `[out:json][timeout:25];(` +
    `node["shop"="supermarket"](${around});` +
    `way["shop"="supermarket"](${around});` +
    `);out center ${MAX_RESULTS};`
  );
}

async function fetchOverpass(query) {
  let lastError;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: OVERPASS_HEADERS,
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      const json = await res.json();
      return json.elements ?? [];
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

function toSupermarket(el, origin) {
  const latitude = el.lat ?? el.center?.lat;
  const longitude = el.lon ?? el.center?.lon;
  if (latitude == null || longitude == null) return null;
  const tags = el.tags ?? {};
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const address = [street, tags['addr:city']].filter(Boolean).join(', ');
  return {
    id: `${el.type}/${el.id}`,
    name: tags.name || tags.brand || null,
    brand: tags.brand || null,
    latitude,
    longitude,
    address: address || null,
    distanceKm: haversineKm(origin, { latitude, longitude }),
  };
}

/** 'Súper Selectos' → 'selectos', 'La Despensa Familiar' → 'despensa familiar'. */
function chainKey(s) {
  return normalizeName(s)
    .split(' ')
    .filter((w) => w && !GENERIC_WORDS.has(w))
    .join(' ');
}

/**
 * Devuelve el comercio afiliado cuyo nombre aparece (como palabras completas)
 * en el nombre o la marca de OSM. Palabras completas para que 'La Despensa de
 * Don Juan' no cuente como 'Despensa Familiar'.
 */
function matchAffiliated(market, stores) {
  const haystack = ` ${normalizeName(`${market.brand ?? ''} ${market.name ?? ''}`)} `;
  if (!haystack.trim()) return null;
  return (
    stores.find((s) => {
      const key = chainKey(s.name) || chainKey(s.slug);
      return key && haystack.includes(` ${key} `);
    }) ?? null
  );
}

/**
 * Supermercados cerca de `coords`, ordenados por distancia.
 *
 * `stores` (de useStores) se usa para marcar `affiliatedStore` en los que
 * pertenecen a una cadena afiliada.
 *
 * Devuelve [{ id, name, brand, latitude, longitude, address, distanceKm,
 *             affiliatedStore }]
 */
export function useNearbySupermarkets(coords, stores) {
  const lat = coords?.latitude?.toFixed(3);
  const lon = coords?.longitude?.toFixed(3);

  const query = useQuery({
    queryKey: ['nearby-supermarkets', lat, lon],
    enabled: lat != null && lon != null,
    staleTime: STALE_TIME,
    queryFn: async () => {
      const origin = { latitude: Number(lat), longitude: Number(lon) };
      let elements = await fetchOverpass(buildQuery(lat, lon, DEFAULT_RADIUS_M));
      if (elements.length < MIN_RESULTS) {
        elements = await fetchOverpass(buildQuery(lat, lon, FALLBACK_RADIUS_M));
      }
      return elements
        .map((el) => toSupermarket(el, origin))
        .filter((m) => m && m.name)
        .sort((a, b) => a.distanceKm - b.distanceKm);
    },
  });

  const data = useMemo(() => {
    if (!query.data) return query.data;
    const list = stores ?? [];
    return query.data.map((m) => ({ ...m, affiliatedStore: matchAffiliated(m, list) }));
  }, [query.data, stores]);

  return { ...query, data };
}
