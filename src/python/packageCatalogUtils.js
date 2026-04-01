import { PYTHON_PACKAGE_CATALOG, PYTHON_PACKAGE_CATEGORIES } from '../ui-showcase/data/pythonPackageCatalog';

export const PACKAGE_CATALOG_STATUS_OPTIONS = ['discovered', 'shortlisted', 'approved', 'experimental', 'archived'];

export const PACKAGE_CATALOG_STATUS_META = {
  discovered: { label: 'Discovered', color: '#93c5fd', border: 'rgba(147,197,253,0.2)', background: 'rgba(147,197,253,0.08)' },
  shortlisted: { label: 'Shortlisted', color: '#fbbf24', border: 'rgba(251,191,36,0.22)', background: 'rgba(251,191,36,0.08)' },
  approved: { label: 'Approved', color: '#4ade80', border: 'rgba(74,222,128,0.18)', background: 'rgba(74,222,128,0.08)' },
  experimental: { label: 'Experimental', color: '#f472b6', border: 'rgba(244,114,182,0.2)', background: 'rgba(244,114,182,0.08)' },
  archived: { label: 'Archived', color: '#94a3b8', border: 'rgba(148,163,184,0.2)', background: 'rgba(148,163,184,0.08)' },
};

export const PACKAGE_INSTALL_VARIANT_PRESETS = {
  unstructured: {
    defaultInstallSpec: 'unstructured[pdf]',
    installVariants: [
      { id: 'base', label: 'Base', spec: 'unstructured' },
      { id: 'pdf', label: 'PDF', spec: 'unstructured[pdf]' },
      { id: 'docx-pdf', label: 'DOCX + PDF', spec: 'unstructured[docx,pdf]' },
    ],
  },
  torch: {
    defaultInstallSpec: 'torch',
    installVariants: [
      { id: 'base', label: 'Base', spec: 'torch' },
      { id: 'torch-2x', label: '2.x range', spec: 'torch>=2,<3' },
    ],
  },
  langchain: {
    defaultInstallSpec: 'langchain',
    installVariants: [
      { id: 'base', label: 'LangChain', spec: 'langchain' },
      { id: 'community', label: 'Community', spec: 'langchain-community' },
    ],
  },
  'llama-index': {
    defaultInstallSpec: 'llama-index',
    installVariants: [
      { id: 'base', label: 'LlamaIndex', spec: 'llama-index' },
      { id: 'core', label: 'Core', spec: 'llama-index-core' },
    ],
  },
};

export function normalizeCatalogCategory(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return PYTHON_PACKAGE_CATEGORIES.includes(normalized) && normalized !== 'all'
    ? normalized
    : 'python';
}

export function normalizeCatalogStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return PACKAGE_CATALOG_STATUS_OPTIONS.includes(normalized) ? normalized : 'approved';
}

export function normalizeCatalogEntry(entry) {
  const name = String(entry?.name || '').trim();
  if (!name) return null;
  const preset = PACKAGE_INSTALL_VARIANT_PRESETS[name.toLowerCase()] || {};
  const defaultInstallSpec = String(entry?.defaultInstallSpec || preset.defaultInstallSpec || name).trim() || name;
  const installVariantsSource = Array.isArray(entry?.installVariants) && entry.installVariants.length
    ? entry.installVariants
    : (Array.isArray(preset.installVariants) ? preset.installVariants : []);
  return {
    name,
    category: normalizeCatalogCategory(entry?.category),
    description: String(entry?.description || '').trim() || 'No description has been added yet.',
    docsUrl: String(entry?.docsUrl || '').trim(),
    status: normalizeCatalogStatus(entry?.status),
    source: String(entry?.source || 'custom').trim() || 'custom',
    sampleTasks: Array.isArray(entry?.sampleTasks) ? entry.sampleTasks.filter(Boolean) : [],
    technicalProperties: Array.isArray(entry?.technicalProperties) ? entry.technicalProperties : [],
    defaultInstallSpec,
    installVariants: Array.isArray(installVariantsSource)
      ? installVariantsSource
          .map((variant) => {
            const spec = String(variant?.spec || '').trim();
            if (!spec) return null;
            return {
              id: String(variant?.id || spec).trim(),
              label: String(variant?.label || spec).trim() || spec,
              spec,
            };
          })
          .filter(Boolean)
      : [],
  };
}

export function getCatalogStatusMeta(status) {
  return PACKAGE_CATALOG_STATUS_META[normalizeCatalogStatus(status)] || PACKAGE_CATALOG_STATUS_META.approved;
}

export function pickDocumentationUrl(info) {
  const projectUrls = info?.project_urls || {};
  const preferredKeys = ['Documentation', 'Docs', 'Homepage', 'Home', 'Source', 'Repository'];
  for (const key of preferredKeys) {
    if (projectUrls[key]) return projectUrls[key];
  }
  return info?.docs_url || info?.home_page || '';
}

export function inferCatalogCategoryFromPyPI(info) {
  const classifiers = Array.isArray(info?.classifiers) ? info.classifiers.map((item) => item.toLowerCase()) : [];
  const keywords = String(info?.keywords || '').toLowerCase();
  const haystack = `${classifiers.join(' ')} ${keywords}`;
  if (haystack.includes('deep learning')) return 'deep learning';
  if (haystack.includes('machine learning')) return 'machine learning';
  if (haystack.includes('natural language') || haystack.includes('nlp')) return 'nlp';
  if (haystack.includes('artificial intelligence') || haystack.includes('llm') || haystack.includes('generative ai')) return 'ai';
  if (haystack.includes('scientific/engineering') || haystack.includes('data') || haystack.includes('analytics')) return 'data science';
  return 'python';
}

export function buildCatalogEntryFromPyPI(packageName, payload) {
  const info = payload?.info || {};
  return normalizeCatalogEntry({
    name: info.name || packageName,
    category: inferCatalogCategoryFromPyPI(info),
    description: info.summary || info.description || 'Imported from PyPI.',
    docsUrl: pickDocumentationUrl(info),
    status: 'discovered',
    source: 'pypi',
    sampleTasks: [],
    technicalProperties: [],
    defaultInstallSpec: info.name || packageName,
  });
}

export function mergePackageCatalog(customEntries = [], catalogOverrides = {}) {
  const merged = new Map();
  PYTHON_PACKAGE_CATALOG.forEach((pkg) => {
    const override = catalogOverrides[pkg.name] || {};
    merged.set(pkg.name, normalizeCatalogEntry({
      ...pkg,
      ...override,
      name: pkg.name,
      sampleTasks: override.sampleTasks || pkg.sampleTasks || [],
      technicalProperties: override.technicalProperties || pkg.technicalProperties || [],
      status: override.status || pkg.status || 'approved',
      source: override.source || pkg.source || 'seed',
    }));
  });
  (customEntries || []).map(normalizeCatalogEntry).filter(Boolean).forEach((pkg) => {
    const override = catalogOverrides[pkg.name] || {};
    merged.set(pkg.name, normalizeCatalogEntry({
      ...pkg,
      ...override,
      name: pkg.name,
      sampleTasks: override.sampleTasks || pkg.sampleTasks || [],
      technicalProperties: override.technicalProperties || pkg.technicalProperties || [],
    }));
  });
  return Array.from(merged.values()).filter(Boolean);
}
