import { useState, useEffect, useCallback } from 'react';
import settingsSchema from '../shared/settingsSchema';

const {
  SETTINGS_DEFAULT,
  deepMerge,
  normalizeSettings,
} = settingsSchema;

export { SETTINGS_DEFAULT };

/**
 * useSettings — reads and writes app configuration.
 *
 * Returns { settings, loading, save }
 *   settings — current config object (never null, falls back to defaults)
 *   loading  — true while loading from disk
 *   save     — async (partial) => void  — merges partial update and persists
 */
export function useSettings() {
  const [settings, setSettings] = useState(SETTINGS_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState(null);
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    if (!window.electronAPI) { setLoading(false); return; }
    window.electronAPI.readSettings()
      .then(s => { if (s) setSettings(normalizeSettings(s)); setLoading(false); })
      .catch(() => setLoading(false));

    window.electronAPI.settingsStorageInfo?.()
      .then((info) => { if (info) setStorageInfo(info); })
      .catch(() => {});
  }, []);

  const save = useCallback(async (partial) => {
    const merged = normalizeSettings(deepMerge(settings, partial));
    setSettings(merged);
    if (window.electronAPI) await window.electronAPI.writeSettings(merged);
    setSavedAt(Date.now());
    return merged;
  }, [settings]);

  const setSection = useCallback(async (key, value) => (
    save({ [key]: value })
  ), [save]);

  const refreshStorageInfo = useCallback(async () => {
    if (!window.electronAPI?.settingsStorageInfo) return null;
    const info = await window.electronAPI.settingsStorageInfo();
    setStorageInfo(info || null);
    return info || null;
  }, []);

  const exportSettings = useCallback(async () => {
    if (!window.electronAPI?.exportSettings) {
      return { ok: false, error: 'Settings export is unavailable.' };
    }
    return window.electronAPI.exportSettings();
  }, []);

  const importSettings = useCallback(async () => {
    if (!window.electronAPI?.importSettings) {
      return { ok: false, error: 'Settings import is unavailable.' };
    }
    const result = await window.electronAPI.importSettings();
    if (result?.ok && result.settings) {
      const normalized = normalizeSettings(result.settings);
      setSettings(normalized);
      setSavedAt(Date.now());
    }
    return result;
  }, []);

  const resetSettings = useCallback(async () => {
    if (!window.electronAPI?.resetSettings) {
      return { ok: false, error: 'Settings reset is unavailable.' };
    }
    const result = await window.electronAPI.resetSettings();
    if (result?.ok && result.settings) {
      const normalized = normalizeSettings(result.settings);
      setSettings(normalized);
      setSavedAt(Date.now());
    }
    return result;
  }, []);

  return {
    settings,
    loading,
    save,
    savedAt,
    setSection,
    storageInfo,
    refreshStorageInfo,
    exportSettings,
    importSettings,
    resetSettings,
  };
}

// ── Legal framework data ──────────────────────────────────────────────────────
export const LEGAL_FRAMEWORKS = {
  GDPR: {
    name:        'GDPR',
    full:        'General Data Protection Regulation',
    jurisdiction:'European Union',
    url:         'https://gdpr-info.eu/',
    color:       '#5B9AFF',
    applies:     ['Spain', 'Germany', 'France', 'Italy', 'Portugal', 'Netherlands', 'Belgium', 'Poland', 'Sweden', 'Denmark'],
  },
  LOPD: {
    name:        'LOPD-GDD',
    full:        'Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales',
    jurisdiction:'Spain',
    url:         'https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673',
    color:       '#F59E0B',
    applies:     ['Spain'],
  },
  ePrivacy: {
    name:        'ePrivacy',
    full:        'ePrivacy Directive (Cookie Law)',
    jurisdiction:'European Union',
    url:         'https://edpb.europa.eu/',
    color:       '#8B5CF6',
    applies:     ['Spain', 'Germany', 'France', 'Italy', 'Portugal', 'Netherlands', 'Belgium', 'Poland', 'Sweden', 'Denmark'],
  },
  CCPA: {
    name:        'CCPA',
    full:        'California Consumer Privacy Act',
    jurisdiction:'United States (California)',
    url:         'https://oag.ca.gov/privacy/ccpa',
    color:       '#EC4899',
    applies:     ['United States'],
  },
  LGPD: {
    name:        'LGPD',
    full:        'Lei Geral de Proteção de Dados',
    jurisdiction:'Brazil',
    url:         'https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd',
    color:       '#10B981',
    applies:     ['Brazil'],
  },
  PDPA: {
    name:        'PDPA',
    full:        'Personal Data Protection Act',
    jurisdiction:'Thailand / Singapore',
    url:         'https://www.pdpc.gov.sg/',
    color:       '#F59E0B',
    applies:     ['Thailand', 'Singapore'],
  },
};

export const COUNTRIES = [
  'Spain', 'Germany', 'France', 'Italy', 'Portugal',
  'Netherlands', 'Belgium', 'Poland', 'Sweden', 'Denmark',
  'United Kingdom', 'United States', 'Brazil', 'Mexico',
  'Argentina', 'Colombia', 'Chile', 'Thailand', 'Singapore',
  'Other',
];

export const CURRENCIES = ['€', '$', '£', 'R$', 'MXN', 'COP', 'CLP', 'Other'];

export const TIMEZONES = [
  'Europe/Madrid', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Europe/Rome', 'Europe/Lisbon', 'America/New_York', 'America/Chicago',
  'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo',
  'America/Mexico_City', 'America/Bogota', 'America/Santiago',
  'Asia/Bangkok', 'Asia/Singapore', 'UTC',
];

/**
 * getRelevantFrameworks — returns legal frameworks that apply to a country.
 */
export function getRelevantFrameworks(country) {
  return Object.values(LEGAL_FRAMEWORKS).filter(f =>
    f.applies.includes(country) || f.applies.includes('Other')
  );
}
