export const DATA_ANALYSIS_PYTHON_MANIFEST = {
  id: 'data-analysis',
  title: 'Data Analysis',
  type: 'page',
  scope: 'core',
  stability: 'stable',
  preferredPython: '>=3.11,<3.14',
  isolationPreference: 'shared-preferred',
  workloadTags: ['analytics', 'tabular', 'statistics'],
  runtimeRequirements: [],
  description: 'Shared Python resources this page should consume from Python Tools instead of managing locally.',
  requiredPackages: [
    { name: 'numpy', reason: 'Core numerical arrays and vectorized statistics used across profiling and analytical transforms.' },
    { name: 'pandas', reason: 'Primary in-memory tabular toolkit for wrangling, joins, audits, and analyst-friendly inspection.' },
    { name: 'scipy', reason: 'Statistical tests, distributions, optimization, and scientific routines used by the analysis stack.' },
  ],
  recommendedPackages: [
    { name: 'polars', reason: 'Faster large-table processing and lazy query planning for heavier wrangling workloads.' },
    { name: 'matplotlib', reason: 'Baseline chart rendering for static exports, profiling visuals, and reporting output.' },
    { name: 'seaborn', reason: 'Higher-level statistical plotting for EDA and comparative visuals.' },
    { name: 'statsmodels', reason: 'Classical statistical analysis, regression diagnostics, and significance workflows.' },
    { name: 'scikit-learn', reason: 'Reusable preprocessing, evaluation, and exploratory model baselines when the page grows into predictive workflows.' },
  ],
  relevantTasks: [
    { title: 'Profile incoming datasets', note: 'Use the shared environment to run profiling and audit passes before analysis modules act on a file.' },
    { title: 'Validate wrangling dependencies', note: 'Confirm that required numerical and tabular packages are available before launching data-cleaning flows.' },
    { title: 'Prepare statistical workflows', note: 'Use Python Tools as the place to confirm the environment is healthy before enabling heavier analysis features.' },
  ],
};

export const DATA_ENGINEERING_PYTHON_MANIFEST = {
  id: 'data-engineering',
  title: 'Data Engineering',
  type: 'page',
  scope: 'core',
  stability: 'stable',
  preferredPython: '>=3.11,<3.14',
  isolationPreference: 'shared-preferred',
  workloadTags: ['pipelines', 'ingestion', 'quality'],
  runtimeRequirements: [],
  description: 'Shared Python resources this page should consume from Python Tools for pipeline, ingestion, and validation workflows.',
  requiredPackages: [
    { name: 'polars', reason: 'High-throughput tabular transforms and lazy scan patterns fit batch and ingestion-heavy workflows.' },
    { name: 'pydantic', reason: 'Schema validation and typed config models help define pipeline contracts and ingestion payloads.' },
    { name: 'requests', reason: 'Reliable HTTP client support is needed for API polling, ingestion jobs, and service connectivity checks.' },
  ],
  recommendedPackages: [
    { name: 'rich', reason: 'Readable operator logs, status tables, and progress output improve pipeline diagnostics.' },
    { name: 'typer', reason: 'CLI-driven operational scripts are a practical surface for local pipeline tasks and maintenance commands.' },
    { name: 'pandas', reason: 'Useful compatibility layer for sources or tools that still expect eager DataFrame workflows.' },
  ],
  relevantTasks: [
    { title: 'Validate ingestion dependencies', note: 'Use Python Tools to confirm the shared environment is ready before enabling API pulls, contracts, or file-based ingestion flows.' },
    { title: 'Check pipeline package coverage', note: 'Keep required pipeline packages in the primary venv, and escalate heavy or specialized stacks back to Python Tools if the trait rules begin to recommend isolation.' },
    { title: 'Route specialization decisions centrally', note: 'If a future pipeline stack needs a JVM, GPU, or distributed runtime, let Python Tools own that recommendation and environment setup.' },
  ],
};

export const PYTHON_WORKLOAD_MANIFESTS = [
  DATA_ANALYSIS_PYTHON_MANIFEST,
  DATA_ENGINEERING_PYTHON_MANIFEST,
];
