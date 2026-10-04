import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { seedWorld, setForecast } from '../domain/world';
import type { Forecast, Persona, Register, World } from '../domain/types';
import { DEFAULT_MODEL } from '../domain/ai';

const KEY = 'streamchart:world:v3';
const SETTINGS = 'streamchart:settings:v1';

export interface Settings {
  register: Register;
  persona: Persona;
  apiKey: string;
  model: string;
  theme: 'light' | 'dark';
}

const defaultSettings: Settings = { register: 'curious', persona: 'citizen', apiKey: '', model: DEFAULT_MODEL, theme: 'light' };

function load<T>(k: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(k);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    /* storage unavailable */
  }
  return fallback();
}

function save(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* quota or private mode: the demo still works in memory */
  }
}

interface Ctx {
  world: World;
  setWorld: (f: (w: World) => World) => void;
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
  reset: () => void;
  toast: string | null;
  showToast: (t: string) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

// The citizen persona is Mathis; the other personas see the same record with their own tools.
export const PERSONA_PERSON: Record<Persona, string> = { citizen: 'mathis', technician: 'camille', ecologist: 'ferreira' };

async function fetchForecast(lat = 43.6047, lon = 1.4442): Promise<Forecast> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum&forecast_days=7&timezone=Europe%2FParis`;
  const j = await (await fetch(url)).json();
  return {
    source: 'open-meteo',
    fetchedAt: new Date().toISOString(),
    days: j.daily.time.map((d: string, i: number) => ({ date: d, tmax: j.daily.temperature_2m_max[i], precip: j.daily.precipitation_sum[i] })),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [world, setW] = useState<World>(() => {
    const w = load<World | null>(KEY, () => null);
    return w && w.version === 3 ? w : seedWorld();
  });
  const [settings, setS] = useState<Settings>(() => ({ ...defaultSettings, ...load<Partial<Settings>>(SETTINGS, () => ({})) }));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => save(KEY, world), [world]);
  useEffect(() => save(SETTINGS, settings), [settings]);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  // Real weather: Open-Meteo 7-day forecast for Toulouse, refreshed at most every 3 hours.
  useEffect(() => {
    if (world.forecast?.source === 'open-meteo' && Date.now() - new Date(world.forecast.fetchedAt).getTime() < 3 * 3_600_000) return;
    if (world.forecast?.source === 'simulated') return;
    fetchForecast()
      .then((f) => setW((w) => setForecast(w, f)))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast((cur) => (cur === t ? null : cur)), 5200);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      world,
      setWorld: (f) => setW((w) => f(w)),
      settings,
      setSettings: (p) => setS((s) => ({ ...s, ...p })),
      reset: () => {
        const w = seedWorld();
        setW(w);
        fetchForecast()
          .then((f) => setW((cur) => setForecast(cur, f)))
          .catch(() => undefined);
      },
      toast,
      showToast,
    }),
    [world, settings, toast, showToast],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('StoreProvider missing');
  return c;
}

// --- tiny hash router ---
export function useRoute(): string[] {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash);
      window.scrollTo({ top: 0 });
      document.querySelector('.main')?.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean);
}

export function go(path: string) {
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
}
