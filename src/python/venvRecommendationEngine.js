const PROFILE_ORDER = ['primary', 'data-science', 'native-runtime', 'spark', 'gpu-ml', 'experimental'];

export const VENV_RECOMMENDATION_PROFILES = {
  primary: {
    id: 'primary',
    label: 'Primary app venv',
    summary: 'Default shared environment for the app and its common Python features.',
    characteristics: ['shared', 'core-safe', 'low-friction'],
  },
  'data-science': {
    id: 'data-science',
    label: 'Data science venv',
    summary: 'Specialized analytical stack for heavier tabular and statistical workflows.',
    characteristics: ['tabular', 'analytics', 'optional-specialization'],
  },
  'native-runtime': {
    id: 'native-runtime',
    label: 'Native runtime venv',
    summary: 'Isolated environment for packages that rely on compiled or system-level dependencies.',
    characteristics: ['native-build', 'system-deps', 'isolated'],
  },
  spark: {
    id: 'spark',
    label: 'Spark / JVM venv',
    summary: 'Isolated environment for JVM-backed or distributed-compute workloads.',
    characteristics: ['jvm', 'distributed', 'isolated'],
  },
  'gpu-ml': {
    id: 'gpu-ml',
    label: 'GPU / ML venv',
    summary: 'Dedicated environment for GPU-oriented or heavyweight ML packages.',
    characteristics: ['gpu', 'heavy-ml', 'isolated'],
  },
  experimental: {
    id: 'experimental',
    label: 'Experimental venv',
    summary: 'Separate environment for volatile or trial packages that should not affect the core app.',
    characteristics: ['experimental', 'volatile', 'isolated'],
  },
};

export const VENV_RECOMMENDATION_TRAITS = {
  core_safe: {
    id: 'core_safe',
    label: 'Core-safe workload',
    summary: 'Fits the shared app environment without special isolation needs.',
    weight: 0,
  },
  heavy_dependency_stack: {
    id: 'heavy_dependency_stack',
    label: 'Heavy dependency stack',
    summary: 'Adds substantial package weight or a broader specialized stack.',
    weight: 2,
  },
  native_runtime_required: {
    id: 'native_runtime_required',
    label: 'Native runtime required',
    summary: 'Depends on compiled binaries or system-level runtime behavior.',
    weight: 3,
  },
  gpu_acceleration: {
    id: 'gpu_acceleration',
    label: 'GPU acceleration',
    summary: 'Needs GPU-specific acceleration or CUDA-aware packages.',
    weight: 4,
    forceSecondary: true,
  },
  jvm_required: {
    id: 'jvm_required',
    label: 'JVM required',
    summary: 'Requires Java / JVM tooling in addition to the Python runtime.',
    weight: 4,
    forceSecondary: true,
  },
  distributed_compute: {
    id: 'distributed_compute',
    label: 'Distributed compute',
    summary: 'Uses clustered or distributed execution patterns.',
    weight: 3,
  },
  experimental_stack: {
    id: 'experimental_stack',
    label: 'Experimental stack',
    summary: 'Represents volatile or trial tooling that should stay isolated from the core app.',
    weight: 2,
  },
  version_conflict_risk: {
    id: 'version_conflict_risk',
    label: 'Version conflict risk',
    summary: 'Introduces a high chance of package resolver or compatibility conflicts.',
    weight: 4,
    forceSecondary: true,
  },
  alt_python_version_needed: {
    id: 'alt_python_version_needed',
    label: 'Alternate Python version',
    summary: 'Needs a different Python version than the current primary environment.',
    weight: 5,
    forceSecondary: true,
  },
  deployment_isolation_preferred: {
    id: 'deployment_isolation_preferred',
    label: 'Isolation preferred',
    summary: 'Manifest explicitly prefers a separate environment for operational safety.',
    weight: 2,
  },
};

const PACKAGE_TRAIT_MAP = {
  pyspark: ['jvm_required', 'distributed_compute', 'heavy_dependency_stack', 'deployment_isolation_preferred'],
  py4j: ['jvm_required'],
  ray: ['distributed_compute', 'heavy_dependency_stack'],
  dask: ['distributed_compute'],
  xgboost: ['native_runtime_required', 'heavy_dependency_stack'],
  lightgbm: ['native_runtime_required', 'heavy_dependency_stack'],
  shap: ['heavy_dependency_stack'],
  torch: ['gpu_acceleration', 'heavy_dependency_stack', 'native_runtime_required'],
  torchvision: ['gpu_acceleration', 'heavy_dependency_stack', 'native_runtime_required'],
  torchaudio: ['gpu_acceleration', 'heavy_dependency_stack', 'native_runtime_required'],
  tensorflow: ['gpu_acceleration', 'heavy_dependency_stack', 'native_runtime_required'],
  faiss: ['gpu_acceleration', 'native_runtime_required', 'heavy_dependency_stack'],
  'faiss-cpu': ['native_runtime_required', 'heavy_dependency_stack'],
  'faiss-gpu': ['gpu_acceleration', 'native_runtime_required', 'heavy_dependency_stack'],
  spacy: ['native_runtime_required'],
  sentencepiece: ['native_runtime_required'],
};

function normalizePackageName(value) {
  return String(value || '').trim().toLowerCase();
}

function parseVersionTuple(value) {
  const match = String(value || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] || 0)];
}

function compareVersionTuple(a, b) {
  for (let index = 0; index < 3; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }
  return 0;
}

function satisfiesVersionRequirement(versionText, requirement) {
  const versionTuple = parseVersionTuple(versionText);
  if (!versionTuple || !requirement) return true;
  return String(requirement)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .every((constraint) => {
      const match = constraint.match(/^(>=|<=|>|<|==|=)\s*(\d+(?:\.\d+){0,2})$/);
      if (!match) return true;
      const operator = match[1] === '=' ? '==' : match[1];
      const constraintTuple = parseVersionTuple(match[2]);
      if (!constraintTuple) return true;
      const comparison = compareVersionTuple(versionTuple, constraintTuple);
      if (operator === '>=') return comparison >= 0;
      if (operator === '<=') return comparison <= 0;
      if (operator === '>') return comparison > 0;
      if (operator === '<') return comparison < 0;
      return comparison === 0;
    });
}

function uniqueList(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getRuntimeVersion(runtimeSnapshot) {
  return runtimeSnapshot?.venv?.interpreterVersion
    || runtimeSnapshot?.python?.version
    || '';
}

function getInstalledPackageNames(runtimeSnapshot) {
  const packages = Array.isArray(runtimeSnapshot?.venv?.packages) ? runtimeSnapshot.venv.packages : [];
  return new Set(
    packages
      .map((pkg) => normalizePackageName(pkg.name))
      .filter(Boolean)
  );
}

function resolveProfileId(traitIds, manifest, packagesByName) {
  if (traitIds.includes('gpu_acceleration')) return 'gpu-ml';
  if (traitIds.includes('jvm_required') || traitIds.includes('distributed_compute')) return 'spark';
  if (traitIds.includes('experimental_stack')) return 'experimental';
  if (traitIds.includes('native_runtime_required')) return 'native-runtime';
  const packageNames = [
    ...(manifest.requiredPackages || []).map((pkg) => normalizePackageName(pkg.name)),
    ...(manifest.recommendedPackages || []).map((pkg) => normalizePackageName(pkg.name)),
  ];
  const packageCategories = uniqueList(packageNames.map((name) => packagesByName.get(name)?.category));
  if (packageCategories.some((category) => ['data science', 'machine learning', 'deep learning'].includes(category))) {
    return 'data-science';
  }
  return 'primary';
}

function buildTraitObjects(traitIds) {
  return traitIds
    .map((traitId) => VENV_RECOMMENDATION_TRAITS[traitId])
    .filter(Boolean);
}

function buildRecommendationCopy({ outcome, traits, coverage, manifest, profile }) {
  if (outcome === 'use_primary_venv') {
    if (coverage.missingRequiredCount > 0) {
      return 'This workload still fits the primary app venv, but the shared environment is missing some required packages.';
    }
    return 'This workload fits the primary app venv and does not currently justify a separate environment.';
  }
  if (outcome === 'allow_primary_but_monitor') {
    return `The primary venv is still acceptable, but keep an eye on ${traits.slice(0, 2).map((trait) => trait.label.toLowerCase()).join(' and ')} as this workload grows.`;
  }
  const reasonText = traits.slice(0, 3).map((trait) => trait.label.toLowerCase()).join(', ');
  return `A separate ${profile.label.toLowerCase()} is recommended because this workload introduces ${reasonText}.`;
}

export function evaluateManifestVenvStrategy({ manifest, runtimeSnapshot, packageCatalog = [] }) {
  const catalogByName = new Map(packageCatalog.map((pkg) => [normalizePackageName(pkg.name), pkg]));
  const installedPackageNames = getInstalledPackageNames(runtimeSnapshot);
  const requiredPackages = Array.isArray(manifest?.requiredPackages) ? manifest.requiredPackages : [];
  const recommendedPackages = Array.isArray(manifest?.recommendedPackages) ? manifest.recommendedPackages : [];
  const allPackageNames = uniqueList([
    ...requiredPackages.map((pkg) => normalizePackageName(pkg.name)),
    ...recommendedPackages.map((pkg) => normalizePackageName(pkg.name)),
  ]);
  const allPackages = allPackageNames.map((name) => catalogByName.get(name)).filter(Boolean);
  const missingRequiredPackages = requiredPackages
    .map((pkg) => normalizePackageName(pkg.name))
    .filter((name) => !installedPackageNames.has(name));
  const coverage = {
    requiredCount: requiredPackages.length,
    missingRequiredCount: missingRequiredPackages.length,
    readyRequiredCount: requiredPackages.length - missingRequiredPackages.length,
    missingRequiredPackages,
  };

  const traitIds = [];
  const runtimeRequirements = uniqueList((manifest?.runtimeRequirements || []).map((item) => String(item).trim().toLowerCase()));
  const workloadTags = uniqueList((manifest?.workloadTags || []).map((item) => String(item).trim().toLowerCase()));

  if (!satisfiesVersionRequirement(getRuntimeVersion(runtimeSnapshot), manifest?.preferredPython)) {
    traitIds.push('alt_python_version_needed');
  }
  if (runtimeRequirements.includes('java') || runtimeRequirements.includes('jvm')) {
    traitIds.push('jvm_required');
  }
  if (runtimeRequirements.includes('distributed-compute')) {
    traitIds.push('distributed_compute');
  }
  if (runtimeRequirements.includes('gpu')) {
    traitIds.push('gpu_acceleration');
  }
  if (runtimeRequirements.includes('native-runtime') || runtimeRequirements.includes('compiled-runtime')) {
    traitIds.push('native_runtime_required');
  }
  if (manifest?.stability === 'experimental') {
    traitIds.push('experimental_stack');
  }
  if (manifest?.isolationPreference === 'prefer-secondary') {
    traitIds.push('deployment_isolation_preferred');
  }
  if (manifest?.conflictRisk === 'high') {
    traitIds.push('version_conflict_risk');
  }

  allPackageNames.forEach((name) => {
    (PACKAGE_TRAIT_MAP[name] || []).forEach((traitId) => traitIds.push(traitId));
  });

  const packageCategories = uniqueList(allPackages.map((pkg) => pkg.category));
  if (
    allPackageNames.length >= 8
    || packageCategories.includes('deep learning')
    || (packageCategories.includes('machine learning') && allPackageNames.length >= 5)
  ) {
    traitIds.push('heavy_dependency_stack');
  }
  if (workloadTags.includes('distributed') || workloadTags.includes('clustered')) {
    traitIds.push('distributed_compute');
  }

  const dedupedTraitIds = uniqueList(traitIds);
  if (dedupedTraitIds.length === 0) {
    dedupedTraitIds.push('core_safe');
  }
  const traits = buildTraitObjects(dedupedTraitIds);
  const score = traits.reduce((total, trait) => total + (trait.weight || 0), 0);
  const forceSecondary = traits.some((trait) => trait.forceSecondary);

  let outcome = 'use_primary_venv';
  if (forceSecondary || score >= 8) {
    outcome = 'strongly_recommend_secondary_venv';
  } else if (score >= 5) {
    outcome = 'recommend_secondary_venv';
  } else if (score >= 3) {
    outcome = 'allow_primary_but_monitor';
  }

  const suggestedProfileId = resolveProfileId(dedupedTraitIds, manifest, catalogByName);
  const suggestedProfile = VENV_RECOMMENDATION_PROFILES[suggestedProfileId] || VENV_RECOMMENDATION_PROFILES.primary;
  const rationale = buildRecommendationCopy({ outcome, traits, coverage, manifest, profile: suggestedProfile });

  return {
    manifestId: manifest?.id || null,
    title: manifest?.title || 'Unnamed workload',
    outcome,
    score,
    rationale,
    traits,
    traitIds: dedupedTraitIds,
    coverage,
    suggestedProfile,
    primaryVenvSuitable: outcome === 'use_primary_venv' || outcome === 'allow_primary_but_monitor',
    preferredPython: manifest?.preferredPython || null,
    workloadTags,
    packageCategories,
  };
}

export function evaluateWorkspaceVenvStrategy({ manifests = [], runtimeSnapshot, packageCatalog = [] }) {
  const workloads = manifests.map((manifest) => evaluateManifestVenvStrategy({ manifest, runtimeSnapshot, packageCatalog }));
  const severityRank = {
    use_primary_venv: 0,
    allow_primary_but_monitor: 1,
    recommend_secondary_venv: 2,
    strongly_recommend_secondary_venv: 3,
  };
  const highestSeverityWorkload = workloads.reduce((currentHighest, workload) => {
    if (!currentHighest) return workload;
    return severityRank[workload.outcome] > severityRank[currentHighest.outcome] ? workload : currentHighest;
  }, null);

  const secondaryCandidates = workloads.filter((workload) => !workload.primaryVenvSuitable);
  const monitorCount = workloads.filter((workload) => workload.outcome === 'allow_primary_but_monitor').length;

  let summaryTitle = 'Primary app venv is suitable';
  let summaryNote = 'Current workloads fit the shared environment strategy.';
  if (highestSeverityWorkload?.outcome === 'allow_primary_but_monitor') {
    summaryTitle = 'Primary app venv is acceptable with monitoring';
    summaryNote = `${monitorCount} workload${monitorCount === 1 ? '' : 's'} should stay on the shared venv for now, but should be watched as their dependency stack grows.`;
  }
  if (secondaryCandidates.length > 0) {
    summaryTitle = `${secondaryCandidates.length} workload${secondaryCandidates.length === 1 ? '' : 's'} may justify a separate venv`;
    summaryNote = 'Keep one primary app venv as the default, and isolate only the workloads whose traits cross the recommendation threshold.';
  }

  return {
    policy: 'one-primary-with-optional-specialized-envs',
    primaryProfile: VENV_RECOMMENDATION_PROFILES.primary,
    profiles: PROFILE_ORDER.map((profileId) => VENV_RECOMMENDATION_PROFILES[profileId]),
    workloads,
    highestSeverityWorkload,
    secondaryCandidates,
    summaryTitle,
    summaryNote,
  };
}
