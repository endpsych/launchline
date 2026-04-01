// Authoring guide: docs/python-package-technical-properties.md

export const PYTHON_PACKAGE_CATEGORIES = [
  'all',
  'python',
  'data science',
  'machine learning',
  'deep learning',
  'nlp',
  'ai',
];

export const PYTHON_TECHNICAL_PROPERTY_CATEGORIES = {
  execution_model: {
    label: 'Execution model',
    description: 'How and when the package performs work.',
  },
  interface_shape: {
    label: 'Interface shape',
    description: 'The primary programming surface developers interact with.',
  },
  data_model: {
    label: 'Data model',
    description: 'The core abstractions and structures the package works with.',
  },
  developer_workflow: {
    label: 'Developer workflow',
    description: 'The coding pattern or mental model the package encourages.',
  },
  resource_profile: {
    label: 'Resource profile',
    description: 'The main performance, compute, or memory characteristics.',
  },
  deployment_runtime: {
    label: 'Deployment/runtime',
    description: 'Runtime dependencies, setup needs, or environment constraints.',
  },
  risk_note: {
    label: 'Risk note',
    description: 'Complexity, volatility, or operational caveats worth knowing.',
  },
};

const source = (url, label = 'Docs') => ({ label, url });

const property = (category, value, summary, sources, relevance = 'high') => ({
  category,
  value,
  summary,
  relevance,
  sources,
});

export const PYTHON_PACKAGE_CATALOG = [
  {
    name: 'requests',
    category: 'python',
    description: 'Simple HTTP client for APIs, services, authentication flows, and webhook integrations.',
    docsUrl: 'https://requests.readthedocs.io/',
    technicalProperties: [
      property('interface_shape', 'HTTP client library', 'Built around request helpers, response objects, and optional persistent sessions for repeated calls.', [source('https://requests.readthedocs.io/')]),
      property('resource_profile', 'Network-bound I/O', 'Most runtime cost comes from remote latency and payload size rather than local CPU work.', [source('https://requests.readthedocs.io/')]),
      property('developer_workflow', 'Sync-first request flow', 'Typical usage is straightforward synchronous code, which keeps scripts simple but can limit throughput-heavy workloads.', [source('https://requests.readthedocs.io/')], 'medium'),
    ],
    sampleTasks: [
      'Call a REST API and normalize the JSON response',
      'Post form data or files to an external service',
      'Validate connectivity to an internal backend',
    ],
  },
  {
    name: 'pydantic',
    category: 'python',
    description: 'Typed data validation and schema modeling for settings, payloads, and structured outputs.',
    docsUrl: 'https://docs.pydantic.dev/',
    technicalProperties: [
      property('data_model', 'Type-hint-driven schema models', 'Models are declared from Python type annotations, which makes validation rules explicit and reusable.', [source('https://docs.pydantic.dev/')]),
      property('execution_model', 'Runtime validation and coercion', 'Input data is parsed against declared schemas when models are created or validated.', [source('https://docs.pydantic.dev/')]),
      property('resource_profile', 'Rust-backed validation core', 'Pydantic v2 relies on pydantic-core for fast parsing and validation behavior.', [source('https://docs.pydantic.dev/')], 'medium'),
    ],
    sampleTasks: [
      'Validate config loaded from JSON or TOML',
      'Define typed app payload contracts',
      'Parse model outputs into safe schemas',
    ],
  },
  {
    name: 'typer',
    category: 'python',
    description: 'Modern CLI framework for building reusable developer tools and app-side scripts.',
    docsUrl: 'https://typer.tiangolo.com/',
    technicalProperties: [
      property('interface_shape', 'CLI application framework', 'Commands, arguments, and options are defined in Python and exposed as terminal interfaces.', [source('https://typer.tiangolo.com/')]),
      property('developer_workflow', 'Type-hint-oriented command definitions', 'Function signatures and annotations drive parsing, help text, and shell completion behavior.', [source('https://typer.tiangolo.com/')]),
      property('deployment_runtime', 'Terminal-first execution surface', 'Best suited for scripts and operational tooling rather than long-lived background services.', [source('https://typer.tiangolo.com/')], 'medium'),
    ],
    sampleTasks: [
      'Build a command-line task runner for local automation',
      'Create a CLI to seed or inspect app data',
      'Expose admin utilities for cloned apps',
    ],
  },
  {
    name: 'rich',
    category: 'python',
    description: 'Terminal formatting library for color, tables, progress bars, and developer diagnostics.',
    docsUrl: 'https://rich.readthedocs.io/',
    technicalProperties: [
      property('interface_shape', 'Terminal rendering toolkit', 'Provides renderables, live views, console helpers, and formatting primitives for text UIs.', [source('https://rich.readthedocs.io/')]),
      property('developer_workflow', 'Composable console output', 'Encourages building readable operator-facing output instead of raw print statements.', [source('https://rich.readthedocs.io/')]),
      property('resource_profile', 'Output-focused overhead', 'Usually lightweight compared with the work being reported, but live rendering can add terminal update cost.', [source('https://rich.readthedocs.io/')], 'medium'),
    ],
    sampleTasks: [
      'Render readable console dashboards for Python tasks',
      'Show progress during data ingestion jobs',
      'Print structured logs for local tooling',
    ],
  },
  {
    name: 'numpy',
    category: 'data science',
    description: 'Core numerical array library used across scientific computing, ML, and analytics stacks.',
    docsUrl: 'https://numpy.org/doc/stable/',
    technicalProperties: [
      property('data_model', 'N-dimensional array core', 'Most work is expressed as ndarray operations over dense numerical data.', [source('https://numpy.org/doc/stable/')]),
      property('resource_profile', 'Vectorized CPU math', 'Performance comes from array-oriented native routines instead of Python loops.', [source('https://numpy.org/doc/stable/')]),
      property('developer_workflow', 'Broadcasting and array semantics', 'Developers need to think in shapes, dtypes, and vectorized transformations.', [source('https://numpy.org/doc/stable/')]),
    ],
    sampleTasks: [
      'Perform fast array math and aggregations',
      'Prepare numeric features for a model',
      'Compute vectorized statistics over large datasets',
    ],
  },
  {
    name: 'pandas',
    category: 'data science',
    description: 'Tabular data analysis library for cleaning, joining, reshaping, and exploring datasets.',
    docsUrl: 'https://pandas.pydata.org/docs/',
    technicalProperties: [
      property('data_model', 'In-memory DataFrame API', 'Data is usually loaded into DataFrame and Series objects for tabular manipulation.', [source('https://pandas.pydata.org/docs/')]),
      property('execution_model', 'Eager transformations', 'Operations generally execute when called, which is simple to reason about but can encourage step-by-step intermediate copies.', [source('https://pandas.pydata.org/docs/')]),
      property('resource_profile', 'RAM-bound tabular processing', 'Large datasets can quickly become memory-limited on local machines.', [source('https://pandas.pydata.org/docs/')]),
    ],
    sampleTasks: [
      'Load and clean CSV or Excel data',
      'Join multiple business datasets together',
      'Build summary tables for reports',
    ],
  },
  {
    name: 'polars',
    category: 'data science',
    description: 'High-performance DataFrame library suited for fast analytical pipelines and large datasets.',
    docsUrl: 'https://docs.pola.rs/',
    technicalProperties: [
      property('data_model', 'DataFrame and LazyFrame abstractions', 'Supports both immediate DataFrame work and deferred query planning through LazyFrame.', [source('https://docs.pola.rs/')]),
      property('execution_model', 'Lazy execution available', 'The lazy API builds a query plan first and executes later, which enables optimization before scanning data.', [source('https://docs.pola.rs/user-guide/lazy/schemas/', 'Lazy API docs')]),
      property('resource_profile', 'Query-engine-oriented analytics', 'Designed for fast analytical workloads with optimizer-driven execution and streaming in supported paths.', [source('https://docs.pola.rs/')]),
    ],
    sampleTasks: [
      'Profile large parquet or CSV files quickly',
      'Build lazy analytical transformations',
      'Replace slower DataFrame workloads in local tools',
    ],
  },
  {
    name: 'matplotlib',
    category: 'data science',
    description: 'Foundational plotting library for charts, dashboards, exports, and custom visual analysis.',
    docsUrl: 'https://matplotlib.org/stable/',
    technicalProperties: [
      property('interface_shape', 'Low-level plotting foundation', 'Gives direct control over figures, axes, artists, and rendering backends.', [source('https://matplotlib.org/stable/')]),
      property('developer_workflow', 'Imperative figure composition', 'Charts are typically built step by step by configuring figure objects and plot calls.', [source('https://matplotlib.org/stable/')]),
      property('deployment_runtime', 'Backend-sensitive rendering', 'Interactive and headless environments can require different backends or export strategies.', [source('https://matplotlib.org/stable/')], 'medium'),
    ],
    sampleTasks: [
      'Create static KPI charts',
      'Generate image exports for reports',
      'Plot distributions and trend lines',
    ],
  },
  {
    name: 'seaborn',
    category: 'data science',
    description: 'Higher-level statistical plotting library built on matplotlib for readable analytical visuals.',
    docsUrl: 'https://seaborn.pydata.org/',
    technicalProperties: [
      property('interface_shape', 'Statistical plotting layer', 'Wraps matplotlib with higher-level charting APIs and statistical defaults.', [source('https://seaborn.pydata.org/')]),
      property('data_model', 'DataFrame-friendly semantics', 'Many plotting functions are designed around tidy tabular data inputs.', [source('https://seaborn.pydata.org/')]),
      property('developer_workflow', 'Declarative chart helpers', 'Makes exploratory analysis faster by reducing the amount of low-level plotting code.', [source('https://seaborn.pydata.org/')], 'medium'),
    ],
    sampleTasks: [
      'Build correlation heatmaps',
      'Compare segment distributions visually',
      'Create polished charts for exploratory analysis',
    ],
  },
  {
    name: 'scikit-learn',
    category: 'machine learning',
    description: 'Classic ML toolkit for preprocessing, model training, pipelines, and evaluation.',
    docsUrl: 'https://scikit-learn.org/stable/',
    technicalProperties: [
      property('interface_shape', 'Estimator and pipeline API', 'Models, transformers, and evaluators follow a consistent fit/transform/predict pattern.', [source('https://scikit-learn.org/stable/')]),
      property('developer_workflow', 'Composable preprocessing and training pipelines', 'Encourages chaining feature transforms, models, and evaluation steps into reusable ML workflows.', [source('https://scikit-learn.org/stable/')]),
      property('resource_profile', 'CPU-oriented in-memory ML', 'Best suited to datasets and models that fit comfortably in local memory.', [source('https://scikit-learn.org/stable/')]),
    ],
    sampleTasks: [
      'Train a classifier or regressor on tabular data',
      'Run feature scaling and cross-validation',
      'Build a reusable ML pipeline for a cloned app',
    ],
  },
  {
    name: 'xgboost',
    category: 'machine learning',
    description: 'Gradient boosting library often used for strong performance on structured/tabular problems.',
    docsUrl: 'https://xgboost.readthedocs.io/',
    technicalProperties: [
      property('interface_shape', 'Gradient boosting engine', 'Focused on tree-based boosting with APIs for training, evaluation, and model persistence.', [source('https://xgboost.readthedocs.io/')]),
      property('resource_profile', 'Optimized tabular model training', 'Designed for high-performance boosting workloads and can use hardware acceleration in supported setups.', [source('https://xgboost.readthedocs.io/')]),
      property('deployment_runtime', 'Compiled native dependency', 'Installation and runtime behavior depend on native binaries rather than pure Python only.', [source('https://xgboost.readthedocs.io/')], 'medium'),
    ],
    sampleTasks: [
      'Predict customer churn or fraud risk',
      'Rank opportunities or leads by score',
      'Train a high-performance model on structured features',
    ],
  },
  {
    name: 'lightgbm',
    category: 'machine learning',
    description: 'Gradient boosting framework optimized for speed and large-scale structured datasets.',
    docsUrl: 'https://lightgbm.readthedocs.io/',
    technicalProperties: [
      property('interface_shape', 'Gradient boosting framework', 'Provides boosted tree training tuned for tabular learning tasks.', [source('https://lightgbm.readthedocs.io/')]),
      property('resource_profile', 'Fast large-scale tree training', 'Optimized for performance on wide and large structured datasets.', [source('https://lightgbm.readthedocs.io/')]),
      property('deployment_runtime', 'Compiled runtime dependency', 'Like other boosting engines, packaging and environment setup rely on native components.', [source('https://lightgbm.readthedocs.io/')], 'medium'),
    ],
    sampleTasks: [
      'Train fast tree-based models',
      'Run experiments on wide tabular datasets',
      'Benchmark alternative gradient boosting approaches',
    ],
  },
  {
    name: 'shap',
    category: 'machine learning',
    description: 'Model explainability toolkit for understanding feature impact and prediction behavior.',
    docsUrl: 'https://shap.readthedocs.io/',
    technicalProperties: [
      property('interface_shape', 'Model explainability toolkit', 'Works by wrapping trained models with explainer objects and explanation outputs.', [source('https://shap.readthedocs.io/')]),
      property('developer_workflow', 'Post-training analysis layer', 'Usually added after a model already exists, not as the primary training framework.', [source('https://shap.readthedocs.io/')]),
      property('resource_profile', 'Can be expensive on large workloads', 'Explanation generation may add significant compute cost depending on model type and sample size.', [source('https://shap.readthedocs.io/')], 'medium'),
    ],
    sampleTasks: [
      'Explain why a prediction was high or low',
      'Create feature-importance views for internal users',
      'Debug model behavior during evaluation',
    ],
  },
  {
    name: 'statsmodels',
    category: 'machine learning',
    description: 'Statistical modeling library for regressions, time series, tests, and classical analysis.',
    docsUrl: 'https://www.statsmodels.org/stable/',
    technicalProperties: [
      property('interface_shape', 'Statistical modeling toolkit', 'Focused on inferential statistics, econometrics, and classical modeling APIs.', [source('https://www.statsmodels.org/stable/')]),
      property('developer_workflow', 'Results-object-oriented analysis', 'Models typically produce rich result objects used for diagnostics, summaries, and tests.', [source('https://www.statsmodels.org/stable/')]),
      property('resource_profile', 'Classical CPU and in-memory analysis', 'Well suited to statistical workflows rather than distributed large-scale training loops.', [source('https://www.statsmodels.org/stable/')], 'medium'),
    ],
    sampleTasks: [
      'Run regression diagnostics',
      'Build forecasting baselines',
      'Perform significance and hypothesis testing',
    ],
  },
  {
    name: 'torch',
    category: 'deep learning',
    description: 'PyTorch framework for neural networks, tensors, training loops, and research-friendly workflows.',
    docsUrl: 'https://pytorch.org/docs/stable/',
    technicalProperties: [
      property('data_model', 'Tensor-first programming model', 'Core operations revolve around tensor objects and module graphs.', [source('https://pytorch.org/docs/stable/')]),
      property('execution_model', 'Define-by-run execution', 'Operations execute dynamically as Python code runs, which supports flexible debugging and model construction.', [source('https://pytorch.org/docs/stable/')]),
      property('deployment_runtime', 'CPU or GPU environment matters', 'Performance and package selection depend heavily on whether CUDA or other accelerators are needed.', [source('https://pytorch.org/docs/stable/')]),
    ],
    sampleTasks: [
      'Train a custom neural network',
      'Fine-tune a transformer model',
      'Build embedding or classification pipelines',
    ],
  },
  {
    name: 'tensorflow',
    category: 'deep learning',
    description: 'Deep learning ecosystem for production-ready training, inference, and deployment workflows.',
    docsUrl: 'https://www.tensorflow.org/api_docs',
    technicalProperties: [
      property('interface_shape', 'Deep learning platform', 'Covers model building, data pipelines, training, inference, and deployment-oriented tooling.', [source('https://www.tensorflow.org/api_docs')]),
      property('execution_model', 'Eager by default with graph optimization paths', 'You can work interactively in eager mode while still compiling functions for optimized execution.', [source('https://www.tensorflow.org/api_docs')]),
      property('deployment_runtime', 'Accelerator-aware runtime stack', 'CPU, GPU, and deployment setup details can materially change package choice and installation complexity.', [source('https://www.tensorflow.org/api_docs')]),
    ],
    sampleTasks: [
      'Train image or sequence models',
      'Export serving-ready models',
      'Prototype neural network experiments',
    ],
  },
  {
    name: 'keras',
    category: 'deep learning',
    description: 'High-level deep learning API for fast model prototyping on top of TensorFlow.',
    docsUrl: 'https://keras.io/',
    technicalProperties: [
      property('interface_shape', 'High-level neural network API', 'Abstracts lower-level training details behind layers, models, and training helpers.', [source('https://keras.io/')]),
      property('developer_workflow', 'Rapid model prototyping', 'Optimized for readable model definition and iteration speed.', [source('https://keras.io/')]),
      property('deployment_runtime', 'Usually rides on TensorFlow runtime', 'Practical environment setup is often tied to the backend runtime you are using.', [source('https://keras.io/')], 'medium'),
    ],
    sampleTasks: [
      'Build a small neural net quickly',
      'Prototype classification architectures',
      'Test training ideas before productionizing',
    ],
  },
  {
    name: 'transformers',
    category: 'deep learning',
    description: 'Hugging Face library for LLMs, encoders, tokenizers, and pretrained transformer models.',
    docsUrl: 'https://huggingface.co/docs/transformers/',
    technicalProperties: [
      property('interface_shape', 'Pretrained model and tokenizer framework', 'Centered around loading model checkpoints, tokenizers, pipelines, and training helpers.', [source('https://huggingface.co/docs/transformers/')]),
      property('deployment_runtime', 'Large model downloads are common', 'Real usage often depends on downloading checkpoints, tokenizer assets, and optional accelerator support.', [source('https://huggingface.co/docs/transformers/')]),
      property('resource_profile', 'Memory-heavy inference and training', 'Transformer workloads can be expensive in RAM and often benefit from GPUs for larger models.', [source('https://huggingface.co/docs/transformers/')]),
    ],
    sampleTasks: [
      'Run text classification or summarization',
      'Fine-tune a pretrained language model',
      'Build a local inference prototype',
    ],
  },
  {
    name: 'nltk',
    category: 'nlp',
    description: 'Classic NLP toolkit with tokenization, stemming, corpora, and linguistic processing helpers.',
    docsUrl: 'https://www.nltk.org/',
    technicalProperties: [
      property('interface_shape', 'Classical NLP toolkit', 'Exposes tokenizers, corpora, taggers, and other traditional NLP building blocks.', [source('https://www.nltk.org/')]),
      property('developer_workflow', 'Modular linguistic primitives', 'Useful for composing smaller text-processing steps rather than full production inference stacks.', [source('https://www.nltk.org/')]),
      property('deployment_runtime', 'Dataset downloads may be required', 'Many tasks rely on external corpora and resource downloads beyond the base package.', [source('https://www.nltk.org/')], 'medium'),
    ],
    sampleTasks: [
      'Tokenize and stem text documents',
      'Build simple rule-based text processing',
      'Teach or prototype foundational NLP pipelines',
    ],
  },
  {
    name: 'spacy',
    category: 'nlp',
    description: 'Industrial-strength NLP library for entity extraction, parsing, tagging, and text pipelines.',
    docsUrl: 'https://spacy.io/',
    technicalProperties: [
      property('interface_shape', 'Pipeline-oriented NLP framework', 'Organizes text processing around pipeline components, docs, spans, and model packages.', [source('https://spacy.io/')]),
      property('developer_workflow', 'Component-based text processing', 'You typically assemble or customize pipelines instead of calling isolated helper functions only.', [source('https://spacy.io/')]),
      property('deployment_runtime', 'Language models are installed separately', 'Practical usage often requires downloading package-specific pipeline models in addition to the library.', [source('https://spacy.io/')], 'medium'),
    ],
    sampleTasks: [
      'Extract named entities from user documents',
      'Build a custom text-processing pipeline',
      'Classify or structure business text',
    ],
  },
  {
    name: 'sentence-transformers',
    category: 'nlp',
    description: 'Embedding-focused toolkit for semantic similarity, retrieval, clustering, and ranking.',
    docsUrl: 'https://www.sbert.net/',
    technicalProperties: [
      property('interface_shape', 'Embedding and reranking toolkit', 'Focused on sentence embeddings, similarity scoring, and retrieval-oriented model usage.', [source('https://www.sbert.net/')]),
      property('resource_profile', 'Inference-heavy model workloads', 'Embedding generation can be computationally expensive for large corpora and benefits from acceleration.', [source('https://www.sbert.net/')]),
      property('deployment_runtime', 'Model artifacts are part of setup', 'Real deployments usually involve downloading and managing pretrained models.', [source('https://www.sbert.net/')], 'medium'),
    ],
    sampleTasks: [
      'Create semantic search embeddings',
      'Cluster support tickets by meaning',
      'Rank documents by relevance',
    ],
  },
  {
    name: 'textblob',
    category: 'nlp',
    description: 'Lightweight NLP helper library for sentiment, noun phrases, tagging, and simple analysis.',
    docsUrl: 'https://textblob.readthedocs.io/',
    technicalProperties: [
      property('interface_shape', 'Convenience NLP wrapper', 'Provides simple entry points for common text tasks without requiring a large pipeline framework.', [source('https://textblob.readthedocs.io/')]),
      property('developer_workflow', 'Rapid prototyping bias', 'Best suited to quick experiments and lightweight features rather than highly tuned production NLP stacks.', [source('https://textblob.readthedocs.io/')]),
      property('deployment_runtime', 'Corpora-backed features', 'Some operations depend on additional linguistic resources or external package components.', [source('https://textblob.readthedocs.io/')], 'medium'),
    ],
    sampleTasks: [
      'Run basic sentiment analysis',
      'Extract noun phrases from text',
      'Prototype simple NLP features fast',
    ],
  },
  {
    name: 'openai',
    category: 'ai',
    description: 'Official OpenAI Python SDK for responses, tools, multimodal tasks, and model-powered workflows.',
    docsUrl: 'https://platform.openai.com/docs/libraries/python',
    technicalProperties: [
      property('interface_shape', 'API SDK client', 'The package is primarily a client for remote model APIs rather than a local inference engine.', [source('https://platform.openai.com/docs/libraries/python')]),
      property('resource_profile', 'Network-bound service integration', 'Runtime behavior depends more on external API latency and payload size than local compute.', [source('https://platform.openai.com/docs/libraries/python')]),
      property('deployment_runtime', 'Credentials and external service access required', 'Production use depends on API keys, model access, and reliable outbound connectivity.', [source('https://platform.openai.com/docs/libraries/python')]),
    ],
    sampleTasks: [
      'Call GPT models for structured outputs',
      'Build text, image, or multimodal features',
      'Prototype AI copilots inside a cloned app',
    ],
  },
  {
    name: 'instructor',
    category: 'ai',
    description: 'Structured-output helper library that pairs well with Pydantic for reliable AI responses.',
    docsUrl: 'https://python.useinstructor.com/',
    technicalProperties: [
      property('interface_shape', 'Structured-output wrapper layer', 'Sits between model SDKs and your schema layer to enforce typed outputs more reliably.', [source('https://python.useinstructor.com/')]),
      property('developer_workflow', 'Schema-first extraction pattern', 'The package is most useful when you already model outputs with Pydantic or comparable schema definitions.', [source('https://python.useinstructor.com/')]),
      property('deployment_runtime', 'Depends on underlying model providers', 'Instructor augments provider SDKs rather than replacing the need for them.', [source('https://python.useinstructor.com/')], 'medium'),
    ],
    sampleTasks: [
      'Parse model outputs into typed schemas',
      'Build extraction workflows from unstructured text',
      'Reduce brittle prompt parsing logic',
    ],
  },
  {
    name: 'tiktoken',
    category: 'ai',
    description: 'Tokenizer utility for counting tokens, sizing prompts, and estimating model cost or fit.',
    docsUrl: 'https://github.com/openai/tiktoken',
    technicalProperties: [
      property('interface_shape', 'Tokenizer and encoding utility', 'Focused on converting text to token IDs and back using model-aligned encodings.', [source('https://github.com/openai/tiktoken', 'Repository docs')]),
      property('resource_profile', 'Local CPU utility', 'Runs locally and does not require model API calls to estimate token usage.', [source('https://github.com/openai/tiktoken', 'Repository docs')]),
      property('developer_workflow', 'Prompt budgeting tool', 'Most useful as a planning and validation step before sending data to a model.', [source('https://github.com/openai/tiktoken', 'Repository docs')], 'medium'),
    ],
    sampleTasks: [
      'Estimate prompt length before calling a model',
      'Chunk documents by token budget',
      'Track prompt size in AI features',
    ],
  },
  {
    name: 'langchain',
    category: 'ai',
    description: 'Framework for chaining model calls, tools, retrieval, and multi-step AI workflows.',
    docsUrl: 'https://python.langchain.com/docs/introduction/',
    technicalProperties: [
      property('interface_shape', 'AI orchestration framework', 'Provides abstractions for chains, tools, retrievers, prompts, and execution flows.', [source('https://python.langchain.com/docs/introduction/')]),
      property('developer_workflow', 'Composable workflow assembly', 'Encourages building AI behavior by wiring together multiple reusable components.', [source('https://python.langchain.com/docs/introduction/')]),
      property('risk_note', 'Broad and fast-moving ecosystem', 'Its scope and release velocity can make upgrade paths and dependency management more complex than smaller libraries.', [source('https://python.langchain.com/docs/introduction/')], 'medium'),
    ],
    sampleTasks: [
      'Build a retrieval-augmented assistant',
      'Compose multi-step agent workflows',
      'Wire tools and memory into a model flow',
    ],
  },
  {
    name: 'llama-index',
    category: 'ai',
    description: 'Framework focused on data connectors, indexing, retrieval, and knowledge-layer AI workflows.',
    docsUrl: 'https://docs.llamaindex.ai/',
    technicalProperties: [
      property('interface_shape', 'Retrieval and indexing framework', 'Specialized around documents, nodes, indexes, retrieval flows, and knowledge-layer orchestration.', [source('https://docs.llamaindex.ai/')]),
      property('data_model', 'Document and index abstractions', 'The framework expects you to think in indexed content units and retrieval pipelines.', [source('https://docs.llamaindex.ai/')]),
      property('deployment_runtime', 'Integration-heavy setup', 'Useful deployments usually involve model providers, storage, and connector integrations working together.', [source('https://docs.llamaindex.ai/')], 'medium'),
    ],
    sampleTasks: [
      'Index internal documents for search',
      'Build a knowledge-aware assistant',
      'Connect data sources into an AI retrieval layer',
    ],
  },
];
