import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

/**
 * Pide permiso de ubicación en primer plano y lee la posición actual.
 *
 * status: 'loading' | 'denied' | 'error' | 'ready'
 * coords: { latitude, longitude } cuando status === 'ready'.
 * retry(): vuelve a pedir permiso y posición (p. ej. después de ir a Ajustes).
 */
export function useUserLocation() {
  const [state, setState] = useState({ status: 'loading', coords: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState({ status: 'loading', coords: null });
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setState({ status: 'denied', coords: null });
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setState({
            status: 'ready',
            coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
          });
        }
      } catch {
        if (!cancelled) setState({ status: 'error', coords: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
