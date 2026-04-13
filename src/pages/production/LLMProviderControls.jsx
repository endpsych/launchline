import { useCallback, useEffect, useMemo, useState } from 'react';
import { Cpu, ExternalLink, Eye, EyeOff, KeyRound, RefreshCw, Sparkles, TestTube2 } from 'lucide-react';
import Modal from '../../components/Modal';
import { SETTINGS_DEFAULT, useSettings } from '../../hooks/useSettings';
import { inputStyle, Section } from '../../ui-kit/forms/SettingsLayout';
import {
  getProviderModelCatalog,
  getProviderModelCatalogEntry,
  providerHasModelCatalog,
} from '../../data/llmModelCatalogs';

const T = {
  color: '#22d3ee',
  r: 'rgba(34,211,238,',
};

const SESSION_KEY_STORAGE = 'launchline.llm.sessionKeys';

const providerOptions = [
  { id: 'openai', label: 'OpenAI', hasCatalog: true, docsLabel: 'Platform docs' },
  { id: 'anthropic', label: 'Anthropic', hasCatalog: true, docsLabel: 'Anthropic docs' },
  { id: 'gemini', label: 'Gemini', hasCatalog: true, docsLabel: 'Google AI docs' },
  { id: 'azure-openai', label: 'Azure OpenAI', hasCatalog: true, docsLabel: 'Azure docs' },
  { id: 'groq', label: 'Groq', hasCatalog: true, docsLabel: 'Groq docs' },
  { id: 'grok', label: 'Grok / xAI', hasCatalog: true, docsLabel: 'xAI docs' },
  { id: 'custom', label: 'Custom Endpoint', docsLabel: 'Endpoint docs' },
  { id: 'local', label: 'Local Model Gateway', docsLabel: 'Gateway docs' },
];

const actionButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 14px',
  borderRadius: 10,
  border: `1px solid ${T.r}0.28)`,
  background: 'rgba(34,211,238,0.08)',
  color: T.color,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  ...actionButtonStyle,
  background: 'rgba(255,255,255,0.04)',
  color: 'var(--text)',
  border: '1px solid rgba(255,255,255,0.1)',
};

const positiveButtonStyle = {
  ...actionButtonStyle,
  background: 'rgba(34,197,94,0.1)',
  border: '1px solid rgba(34,197,94,0.25)',
  color: '#4ade80',
};

const cardStyle = {
  borderRadius: 12,
  padding: '14px 16px',
  border: '1px solid rgba(34,211,238,0.18)',
  background: 'rgba(255,255,255,0.02)',
};

function readSessionKeys() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY_STORAGE);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSessionKeys(nextValue) {
  try {
    window.sessionStorage.setItem(SESSION_KEY_STORAGE, JSON.stringify(nextValue));
  } catch {}
}

function SmallPill({ children, tone = 'default' }) {
  const palette = tone === 'good'
    ? { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.28)', color: '#4ade80' }
    : tone === 'warn'
      ? { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.28)', color: '#fbbf24' }
      : tone === 'danger'
        ? { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.28)', color: '#f87171' }
        : { bg: `${T.r}0.08)`, border: `${T.r}0.22)`, color: T.color };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, border: `1px solid ${palette.border}`, background: palette.bg, color: palette.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {children}
    </span>
  );
}

function providerFromSettings(settings, providerId) {
  return settings?.llmOperations?.providers?.[providerId]
    || SETTINGS_DEFAULT.llmOperations.providers[providerId]
    || null;
}

function providerLabelForId(providerId) {
  return providerOptions.find((option) => option.id === providerId)?.label || providerId || 'Unknown provider';
}

function bindingTypeFromFeatureId(featureId) {
  switch (featureId) {
    case 'summarization':
    case 'recommendation':
      return 'generation';
    case 'classification':
      return 'classification';
    case 'search':
      return 'retrieval';
    case 'agents':
      return 'agent';
    case 'evals':
      return 'evaluation';
    default:
      return 'manual';
  }
}

function normalizeBindingKey(entry) {
  const detectorId = String(entry?.detectorId || entry?.id || '').trim().toLowerCase();
  const sourceFile = String(entry?.sourceFile || entry?.file || '').trim().toLowerCase();
  const featureName = String(entry?.featureName || entry?.label || '').trim().toLowerCase();
  return [detectorId, sourceFile, featureName].filter(Boolean).join('::');
}

function runtimeFromSettings(settings) {
  return settings?.llmOperations?.runtime || SETTINGS_DEFAULT.llmOperations.runtime;
}

function formatMoney(value) {
  if (typeof value !== 'number') return '—';
  return `$${value.toFixed(value >= 1 ? 2 : value >= 0.1 ? 3 : 4)}`;
}

function formatDuration(value) {
  if (typeof value !== 'number') return '—';
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)} s`;
}

function formatNumber(value) {
  if (typeof value !== 'number') return '—';
  return value.toLocaleString();
}

function formatPercent(value) {
  if (typeof value !== 'number') return '—';
  return `${Math.round(value * 100)}%`;
}

function estimateRunCost({ usage, catalogEntry }) {
  if (!usage || !catalogEntry) return null;
  const promptTokens = typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : null;
  const completionTokens = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : null;
  const inputPrice = typeof catalogEntry.inputPrice === 'number' ? catalogEntry.inputPrice : null;
  const outputPrice = typeof catalogEntry.outputPrice === 'number' ? catalogEntry.outputPrice : null;
  if (promptTokens == null || completionTokens == null || inputPrice == null || outputPrice == null) return null;
  return ((promptTokens / 1000000) * inputPrice) + ((completionTokens / 1000000) * outputPrice);
}

function maskKey(value) {
  if (!value) return 'No key loaded';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••••${value.slice(-4)}`;
}

function derivePromptTitle(value, fallback = 'Reusable prompt') {
  const firstLine = String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return fallback;
  return firstLine.length > 48 ? `${firstLine.slice(0, 48).trimEnd()}…` : firstLine;
}

function promptPreview(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No prompt text saved yet.';
  return normalized.length > 84 ? `${normalized.slice(0, 84).trimEnd()}…` : normalized;
}

function responsePreview(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return 'No response text was returned.';
  return normalized.length > 112 ? `${normalized.slice(0, 112).trimEnd()}…` : normalized;
}

function categorizeFailure(error) {
  const message = String(error || '').toLowerCase();
  if (!message) return '';
  if (message.includes('timed out') || message.includes('timeout')) return 'timeout';
  if (message.includes('rate limit') || message.includes('429')) return 'rate_limit';
  if (message.includes('api key') || message.includes('401') || message.includes('403') || message.includes('unauthorized')) return 'auth';
  if (message.includes('schema') || message.includes('json')) return 'schema';
  if (message.includes('network') || message.includes('fetch') || message.includes('socket') || message.includes('econn')) return 'network';
  return 'provider_error';
}

function normalizeComparableText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function asStringArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function suggestEvalMode(dataset) {
  if (!dataset?.cases?.length) return 'exact_match';
  if (dataset.cases.some((entry) => entry?.humanReview)) return 'human_review';
  if (dataset.cases.some((entry) => (entry?.rubric || []).length > 0)) return 'rubric_based';
  if (dataset.cases.some((entry) => (entry?.rules?.mustInclude || []).length > 0 || (entry?.rules?.mustNotInclude || []).length > 0 || (entry?.rules?.requiredFields || []).length > 0)) return 'rule_based';
  if (dataset.cases.some((entry) => entry?.expected)) return 'exact_match';
  return 'human_review';
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function computeEvalSummary(cases) {
  const passCount = cases.filter((entry) => entry.status === 'pass').length;
  const failCount = cases.filter((entry) => entry.status === 'fail').length;
  const reviewCount = cases.filter((entry) => entry.status === 'review').length;
  const escalatedCount = cases.filter((entry) => entry.escalated).length;
  const latencyValues = cases.map((entry) => entry.latencyMs).filter((value) => typeof value === 'number');
  return {
    totalCases: cases.length,
    passCount,
    failCount,
    reviewCount,
    escalatedCount,
    totalTokens: cases.reduce((sum, entry) => sum + (entry?.usage?.total_tokens || 0), 0),
    estimatedCost: cases.reduce((sum, entry) => sum + (typeof entry?.estimatedCost === 'number' ? entry.estimatedCost : 0), 0),
    averageLatencyMs: latencyValues.length ? latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length : null,
  };
}

function parseEvalDatasetText(relativePath, content) {
  const extension = String(relativePath || '').split('.').pop()?.toLowerCase() || '';
  let rawCases = [];

  if (extension === 'json') {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) rawCases = parsed;
    else if (Array.isArray(parsed?.cases)) rawCases = parsed.cases;
  } else if (extension === 'jsonl') {
    rawCases = String(content || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } else {
    rawCases = String(content || '')
      .split(/\r?\n\r?\n+/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => ({ prompt: block }));
  }

  return rawCases
    .map((entry, index) => {
      if (typeof entry === 'string') {
        return {
          id: `case-${index + 1}`,
          title: `Case ${index + 1}`,
          prompt: entry.trim(),
          expected: '',
        };
      }

      const prompt = String(
        entry?.prompt
        || entry?.input
        || entry?.question
        || entry?.instruction
        || entry?.messages?.map?.((message) => message?.content || '').join('\n')
        || ''
      ).trim();
      const expected = String(
        entry?.expected
        || entry?.golden
        || entry?.reference
        || entry?.ideal
        || entry?.target
        || ''
      ).trim();
      const title = String(entry?.title || entry?.name || `Case ${index + 1}`).trim();

      if (!prompt) return null;
      return {
        id: String(entry?.id || `case-${index + 1}`),
        title,
        prompt,
        expected,
        rules: {
          mustInclude: asStringArray(entry?.mustInclude || entry?.must_include || entry?.requiredPhrases),
          mustNotInclude: asStringArray(entry?.mustNotInclude || entry?.must_not_include || entry?.forbiddenPhrases),
          requiredFields: asStringArray(entry?.requiredFields || entry?.required_fields),
        },
        rubric: asStringArray(entry?.rubric || entry?.criteria || entry?.scorecard),
        humanReview: Boolean(entry?.humanReview || entry?.human_review),
      };
    })
    .filter(Boolean)
    .slice(0, 20);
}

function evaluateExactMatch(entry, outputText) {
  const expected = normalizeComparableText(entry?.expected);
  const actual = normalizeComparableText(outputText);
  if (!expected) {
    return { status: 'review', rationale: 'No golden output was supplied for this case.' };
  }
  return expected === actual
    ? { status: 'pass', rationale: 'Output matched the expected text after normalization.' }
    : { status: 'fail', rationale: 'Output did not match the expected text exactly after normalization.' };
}

function evaluateRuleBased(entry, outputText) {
  const normalizedOutput = normalizeComparableText(outputText);
  const mustInclude = entry?.rules?.mustInclude || [];
  const mustNotInclude = entry?.rules?.mustNotInclude || [];
  const requiredFields = entry?.rules?.requiredFields || [];
  const parsedOutput = parseJsonSafe(outputText);

  const missingIncludes = mustInclude.filter((value) => !normalizedOutput.includes(normalizeComparableText(value)));
  const forbiddenHits = mustNotInclude.filter((value) => normalizedOutput.includes(normalizeComparableText(value)));
  const missingFields = requiredFields.filter((field) => !(parsedOutput && typeof parsedOutput === 'object' && Object.prototype.hasOwnProperty.call(parsedOutput, field)));

  if (missingIncludes.length === 0 && forbiddenHits.length === 0 && missingFields.length === 0) {
    return { status: 'pass', rationale: 'Output satisfied the detected include/exclude and required-field rules.' };
  }

  const problems = [];
  if (missingIncludes.length > 0) problems.push(`missing required phrases: ${missingIncludes.join(', ')}`);
  if (forbiddenHits.length > 0) problems.push(`included forbidden phrases: ${forbiddenHits.join(', ')}`);
  if (missingFields.length > 0) problems.push(`missing required fields: ${missingFields.join(', ')}`);
  return {
    status: 'fail',
    rationale: problems.join('; '),
  };
}

function buildJudgePrompt({ entry, outputText }) {
  return [
    'You are grading an LLM evaluation case.',
    'Return strict JSON only with this schema: {"verdict":"pass|fail|review","reason":"short explanation"}',
    '',
    `Case title: ${entry?.title || 'Untitled case'}`,
    `Prompt: ${entry?.prompt || ''}`,
    entry?.expected ? `Expected / golden output: ${entry.expected}` : '',
    (entry?.rubric || []).length > 0 ? `Rubric criteria:\n- ${entry.rubric.join('\n- ')}` : '',
    ((entry?.rules?.mustInclude || []).length > 0 || (entry?.rules?.mustNotInclude || []).length > 0 || (entry?.rules?.requiredFields || []).length > 0)
      ? `Rules:\n- Must include: ${(entry?.rules?.mustInclude || []).join(', ') || 'none'}\n- Must not include: ${(entry?.rules?.mustNotInclude || []).join(', ') || 'none'}\n- Required fields: ${(entry?.rules?.requiredFields || []).join(', ') || 'none'}`
      : '',
    `Model output: ${outputText || ''}`,
  ].filter(Boolean).join('\n');
}

function parseJudgeVerdict(outputText) {
  const parsed = parseJsonSafe(outputText);
  const verdict = String(parsed?.verdict || '').trim().toLowerCase();
  if (['pass', 'fail', 'review'].includes(verdict)) {
    return {
      status: verdict,
      rationale: String(parsed?.reason || 'Judge model returned a verdict.').trim(),
    };
  }

  const normalized = normalizeComparableText(outputText);
  if (normalized.includes('pass')) return { status: 'pass', rationale: 'Judge model returned a pass-oriented response.' };
  if (normalized.includes('fail')) return { status: 'fail', rationale: 'Judge model returned a fail-oriented response.' };
  return { status: 'review', rationale: 'Judge model did not return a strict verdict.' };
}

function UsageMetricGrid({ usage, estimatedCost = null, latencyMs = null }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
      <div style={cardStyle}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Prompt Tokens</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{usage?.prompt_tokens ?? '—'}</div>
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Completion Tokens</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{usage?.completion_tokens ?? '—'}</div>
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Total Tokens</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{usage?.total_tokens ?? '—'}</div>
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Estimated Cost</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{formatMoney(estimatedCost)}</div>
      </div>
      <div style={cardStyle}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Latency</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{formatDuration(latencyMs)}</div>
      </div>
    </div>
  );
}

function EvalRunnerModal({
  dataset,
  evalAssetFiles,
  providerLabel,
  providerConfig,
  runtime,
  evalRunHistory,
  evalMode,
  onEvalModeChange,
  judgeModelId,
  onJudgeModelIdChange,
  onPickJudgeModel,
  canPickCatalogModel,
  onReviewCase,
  onCaseNoteChange,
  onToggleCaseEscalation,
  onSaveRun,
  onLoadEvalAsset,
  loading,
  onClose,
  onRun,
  running,
  result,
}) {
  const recentRuns = evalRunHistory.slice(0, 5);
  const previousRuns = evalRunHistory.slice(5, 10);
  const averagePassRate = (runs) => {
    if (!runs.length) return null;
    return runs.reduce((sum, entry) => sum + (entry.totalCases ? (entry.passCount / entry.totalCases) : 0), 0) / runs.length;
  };
  const recentPassRate = averagePassRate(recentRuns);
  const previousPassRate = averagePassRate(previousRuns);
  const trendDelta = recentPassRate != null && previousPassRate != null ? recentPassRate - previousPassRate : null;
  const trendTone = trendDelta == null ? 'default' : trendDelta > 0.01 ? 'good' : trendDelta < -0.01 ? 'danger' : 'warn';
  const gateThreshold = Number(runtime?.evalGateMinPassRate) || 0;
  const gateEnforced = !!runtime?.requireEvalGatePass;
  const gatePassRate = result?.totalCases ? (result.passCount / result.totalCases) : null;
  const gatePassed = gatePassRate == null ? null : gatePassRate >= gateThreshold;

  return (
    <Modal
      onClose={onClose}
      title="Eval Runner"
      subtitle="Run a detected eval dataset against the currently selected provider and model, then save the results into Launchline's eval history."
      icon={<TestTube2 size={18} color={T.color} />}
      accentColor={T.color}
      maxWidth={980}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Dataset</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{dataset?.title || 'No dataset loaded'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{dataset?.relativePath || 'Choose a detected eval dataset from the scanner.'}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Provider</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{providerLabel}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{providerConfig?.modelId || 'No model selected'}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Dataset Cases</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{dataset?.cases?.length || 0}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
              Launchline currently supports JSON, JSONL, and simple text-based prompt lists.
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>History Trend</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
              {recentPassRate == null ? 'No saved trend yet' : `${Math.round(recentPassRate * 100)}% recent pass rate`}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <SmallPill tone={trendTone}>
                {trendDelta == null ? 'baseline only' : trendDelta > 0.01 ? `up ${Math.round(trendDelta * 100)} pts` : trendDelta < -0.01 ? `down ${Math.abs(Math.round(trendDelta * 100))} pts` : 'flat'}
              </SmallPill>
              <SmallPill>{`${evalRunHistory.length} saved runs`}</SmallPill>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Eval Gate</div>
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{formatPercent(gateThreshold)}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SmallPill tone={gateEnforced ? 'warn' : 'default'}>{gateEnforced ? 'enforced' : 'advisory'}</SmallPill>
                {gatePassed != null && <SmallPill tone={gatePassed ? 'good' : 'danger'}>{gatePassed ? 'gate passed' : 'gate blocked'}</SmallPill>}
              </div>
            </div>
          </div>
        </div>

        {dataset?.error && (
          <div style={{ ...cardStyle, borderColor: 'rgba(248,113,113,0.24)', background: 'rgba(248,113,113,0.04)', color: '#f87171', fontSize: 12 }}>
            {dataset.error}
          </div>
        )}

        {running === false && dataset?.error == null && dataset?.cases?.length === 0 && (
          <div style={{ ...cardStyle, borderColor: 'rgba(251,191,36,0.22)', background: 'rgba(251,191,36,0.05)', color: '#fbbf24', fontSize: 12, lineHeight: 1.6 }}>
            Launchline could not find runnable prompt cases in this file yet. JSON arrays, JSONL rows, or simple text blocks are supported in this first version.
          </div>
        )}

        {(!dataset?.cases?.length || dataset?.error) && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>
                Detected Eval Datasets
              </div>
              <SmallPill tone={evalAssetFiles.length > 0 ? 'good' : 'warn'}>
                {evalAssetFiles.length > 0 ? `${evalAssetFiles.length} detected` : 'none detected'}
              </SmallPill>
            </div>

            {evalAssetFiles.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Launchline has not detected any runnable eval datasets in the loaded workspace yet. Add JSON, JSONL, or simple prompt-case files and they will appear here for direct loading.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Choose a detected dataset to load it into the manual eval runner.
                </div>
                {evalAssetFiles.map((entry) => (
                  <div
                    key={entry.relativePath}
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      display: 'grid',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{entry.label || entry.relativePath}</div>
                      {entry.type && <SmallPill>{entry.type}</SmallPill>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                      {entry.relativePath}
                    </div>
                    <div>
                      <button type="button" onClick={() => onLoadEvalAsset(entry.relativePath)} style={secondaryButtonStyle}>
                        <Sparkles size={13} />
                        Load dataset
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ ...cardStyle, display: 'grid', gap: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>Evaluation Mode</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {[
              { id: 'exact_match', label: 'Exact-match', hint: 'Compares the model output to the expected text after normalization.' },
              { id: 'rule_based', label: 'Rule-based', hint: 'Checks required phrases, forbidden phrases, and required JSON fields.' },
              { id: 'rubric_based', label: 'Rubric-based', hint: 'Runs the dataset and keeps cases in review so an operator can score against rubric criteria.' },
              { id: 'judge_model', label: 'Judge-model', hint: 'Uses a model to grade the output against the prompt, expected answer, and rubric.' },
              { id: 'human_review', label: 'Human review', hint: 'Runs the outputs and leaves every case for manual pass/fail review.' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => onEvalModeChange(mode.id)}
                style={{
                  ...secondaryButtonStyle,
                  display: 'grid',
                  justifyItems: 'start',
                  gap: 6,
                  textAlign: 'left',
                  background: evalMode === mode.id ? 'rgba(34,211,238,0.1)' : secondaryButtonStyle.background,
                  border: evalMode === mode.id ? `1px solid ${T.r}0.28)` : secondaryButtonStyle.border,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 700 }}>{mode.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{mode.hint}</span>
              </button>
            ))}
          </div>
          {evalMode === 'judge_model' && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: canPickCatalogModel ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
                <input
                  type="text"
                  value={judgeModelId}
                  onChange={(event) => onJudgeModelIdChange(event.target.value)}
                  placeholder="Judge model id"
                  style={inputStyle}
                />
                {canPickCatalogModel && (
                  <button type="button" onClick={onPickJudgeModel} style={secondaryButtonStyle}>
                    <Sparkles size={13} />
                    Pick model
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Launchline will call the selected judge model after each case run and ask it for a strict pass / fail / review verdict.
              </div>
            </div>
          )}
        </div>

        {dataset?.cases?.length > 0 && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Loaded Cases</div>
              <SmallPill>{`${dataset.cases.length} ready`}</SmallPill>
            </div>
            <div style={{ display: 'grid', gap: 8, maxHeight: '28vh', overflowY: 'auto' }}>
              {dataset.cases.map((entry) => (
                <div key={entry.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{entry.title}</div>
                    {entry.expected && <SmallPill tone="good">golden output</SmallPill>}
                    {(entry.rules?.mustInclude?.length || entry.rules?.mustNotInclude?.length || entry.rules?.requiredFields?.length) > 0 && <SmallPill>rules</SmallPill>}
                    {(entry.rubric || []).length > 0 && <SmallPill>rubric</SmallPill>}
                    {entry.humanReview && <SmallPill tone="warn">manual review</SmallPill>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{promptPreview(entry.prompt)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onRun}
            style={positiveButtonStyle}
            disabled={loading || running || !(dataset?.cases?.length > 0) || (evalMode === 'judge_model' && !judgeModelId.trim())}
          >
            <TestTube2 size={13} />
            {loading ? 'Loading dataset…' : running ? 'Running eval set…' : 'Run Eval Set'}
          </button>
          {result && (
            <button
              type="button"
              onClick={onSaveRun}
              style={actionButtonStyle}
              disabled={result.saved || (gateEnforced && gatePassed === false)}
            >
              <Sparkles size={13} />
              {result.saved ? 'Saved to history' : gateEnforced && gatePassed === false ? 'Gate blocked' : 'Save Eval Run'}
            </button>
          )}
        </div>

        {result && (
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ ...cardStyle, borderColor: 'rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Cases</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{result.totalCases}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Pass / Fail / Review</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{result.passCount}/{result.failCount}/{result.reviewCount}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Escalations</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{result.escalatedCount || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Eval Mode</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{result.modeLabel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Estimated Cost</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{formatMoney(result.estimatedCost)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Avg Latency</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{formatDuration(result.averageLatencyMs)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Gate Status</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: gatePassed ? '#4ade80' : '#f87171' }}>{gatePassed == null ? '—' : gatePassed ? 'Pass' : 'Blocked'}</div>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 10 }}>Case Results</div>
              <div style={{ display: 'grid', gap: 8, maxHeight: '34vh', overflowY: 'auto' }}>
                {result.cases.map((entry) => (
                  <div key={entry.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{entry.title}</div>
                      <SmallPill tone={entry.status === 'pass' ? 'good' : entry.status === 'fail' ? 'danger' : 'warn'}>{entry.status}</SmallPill>
                      {entry.escalated && <SmallPill tone="danger">escalated</SmallPill>}
                      {typeof entry.estimatedCost === 'number' && <SmallPill>{`cost ${formatMoney(entry.estimatedCost)}`}</SmallPill>}
                      {typeof entry.latencyMs === 'number' && <SmallPill>{`latency ${formatDuration(entry.latencyMs)}`}</SmallPill>}
                    </div>
                    {entry.expected && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        Expected: {promptPreview(entry.expected)}
                      </div>
                    )}
                    {(entry.rules?.mustInclude?.length || entry.rules?.mustNotInclude?.length || entry.rules?.requiredFields?.length) > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        Rules: include [{(entry.rules?.mustInclude || []).join(', ') || 'none'}], forbid [{(entry.rules?.mustNotInclude || []).join(', ') || 'none'}], fields [{(entry.rules?.requiredFields || []).join(', ') || 'none'}]
                      </div>
                    )}
                    {(entry.rubric || []).length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        Rubric: {(entry.rubric || []).join(' · ')}
                      </div>
                    )}
                    {entry.rationale && (
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                        Evaluation note: {entry.rationale}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                      Result: {responsePreview(entry.outputText || entry.error)}
                    </div>
                    {(result.mode === 'human_review' || result.mode === 'rubric_based') && (
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => onReviewCase(entry.id, 'pass')} style={positiveButtonStyle}>Mark Pass</button>
                        <button type="button" onClick={() => onReviewCase(entry.id, 'fail')} style={secondaryButtonStyle}>Mark Fail</button>
                        <button type="button" onClick={() => onReviewCase(entry.id, 'review')} style={secondaryButtonStyle}>Keep Review</button>
                        <button type="button" onClick={() => onToggleCaseEscalation(entry.id)} style={entry.escalated ? positiveButtonStyle : secondaryButtonStyle}>
                          {entry.escalated ? 'Escalated' : 'Escalate'}
                        </button>
                        </div>
                        <textarea
                          value={entry.reviewNote || ''}
                          onChange={(event) => onCaseNoteChange(entry.id, event.target.value)}
                          placeholder="Add operator review notes or escalation context"
                          style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 10 }}>Recent Eval Runs</div>
          {evalRunHistory.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Eval runs will appear here after you execute a detected dataset.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {evalRunHistory.map((entry) => (
                <div key={entry.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{entry.title}</div>
                    <SmallPill>{`${entry.passCount}/${entry.totalCases} pass`}</SmallPill>
                    {entry.modeLabel && <SmallPill>{entry.modeLabel}</SmallPill>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {entry.providerLabel} · {entry.modelId || 'no model'} · {new Date(entry.ranAt).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <SmallPill>{`cost ${formatMoney(entry.estimatedCost)}`}</SmallPill>
                    <SmallPill>{`latency ${formatDuration(entry.averageLatencyMs)}`}</SmallPill>
                    <SmallPill>{`tokens ${entry.totalTokens || 0}`}</SmallPill>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ProviderModelPickerModal({ catalog, selectedModelId, onClose, onSelect }) {
  const [sortKey, setSortKey] = useState('inputPrice');
  const [sortDirection, setSortDirection] = useState('asc');

  const sortedRows = useMemo(() => {
    const rows = [...(catalog?.models || [])];
    rows.sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortDirection === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }
      if (typeof leftValue === 'number') return -1;
      if (typeof rightValue === 'number') return 1;
      return sortDirection === 'asc'
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
    return rows;
  }, [catalog?.models, sortDirection, sortKey]);

  const changeSort = (nextKey) => {
    if (sortKey === nextKey) setSortDirection((value) => value === 'asc' ? 'desc' : 'asc');
    else { setSortKey(nextKey); setSortDirection('asc'); }
  };

  return (
    <Modal
      onClose={onClose}
      title={`${catalog?.providerLabel || 'Provider'} Model Picker`}
      subtitle={`Curated reference catalog based on official ${catalog?.providerLabel || 'provider'} model docs as of ${catalog?.updatedAt || 'the latest Launchline refresh'}.`}
      icon={<Sparkles size={18} color={T.color} />}
      accentColor={T.color}
      maxWidth={1120}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <SmallPill>{sortedRows.length} models</SmallPill>
          {(catalog?.sources || []).map((source) => (
            <a key={source.url} href={source.url} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.color, fontSize: 12, textDecoration: 'none' }}>
              <ExternalLink size={12} />
              {source.label}
            </a>
          ))}
        </div>
        <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 130px', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <button type="button" onClick={() => changeSort('id')} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' }}>Model</button>
            <button type="button" onClick={() => changeSort('inputPrice')} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' }}>Input</button>
            <button type="button" onClick={() => changeSort('cachedInputPrice')} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' }}>Cached</button>
            <button type="button" onClick={() => changeSort('outputPrice')} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' }}>Output</button>
            <button type="button" onClick={() => changeSort('contextWindow')} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' }}>Context</button>
            <button type="button" onClick={() => changeSort('maxOutputTokens')} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, textAlign: 'left' }}>Max Out</button>
            <div>Capabilities</div>
            <div style={{ textAlign: 'right' }}>Select</div>
          </div>
          <div style={{ maxHeight: '58vh', overflowY: 'auto' }}>
            {sortedRows.map((row) => {
              const selected = row.id === selectedModelId;
              return (
                <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 130px', gap: 12, padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', background: selected ? 'rgba(34,211,238,0.07)' : 'transparent', alignItems: 'center' }}>
                  <div style={{ display: 'grid', gap: 5 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{row.id}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{row.summary}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatMoney(row.inputPrice)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatMoney(row.cachedInputPrice)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatMoney(row.outputPrice)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatNumber(row.contextWindow)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatNumber(row.maxOutputTokens)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {row.supportsStructuredOutputs && <SmallPill tone="good">structured</SmallPill>}
                    {row.supportsTools && <SmallPill tone="good">tools</SmallPill>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="button" onClick={() => onSelect(row)} style={selected ? positiveButtonStyle : actionButtonStyle}>{selected ? 'Selected' : 'Use model'}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function PromptTesterModal({
  providerLabel,
  providerConfig,
  runtime,
  sessionSummary,
  sessionBudgetUsd,
  promptDraft,
  onPromptDraftChange,
  comparisonModelId,
  onComparisonModelIdChange,
  comparisonPromptDraft,
  onComparisonPromptDraftChange,
  useSamePromptForComparison,
  onUseSamePromptForComparisonChange,
  onPickComparisonModel,
  savedPromptTitle,
  onSavedPromptTitleChange,
  savedPromptVersion,
  onSavedPromptVersionChange,
  savedPrompts,
  onSavePrompt,
  onLoadSavedPrompt,
  onDeleteSavedPrompt,
  promptAssetFiles,
  onLoadPromptAsset,
  promptTestHistory,
  onLoadHistoryPrompt,
  onClearPromptHistory,
  onRunComparison,
  comparisonRunning,
  comparisonResult,
  canPickCatalogModel,
  onClose,
  onRun,
  running,
  result,
}) {
  const usage = result?.usage || null;
  const overBudget = typeof sessionBudgetUsd === 'number'
    && typeof sessionSummary.estimatedCost === 'number'
    && sessionSummary.estimatedCost > sessionBudgetUsd;
  return (
    <Modal onClose={onClose} title="Prompt Tester" subtitle="Send a direct test prompt using the currently selected provider, model, and runtime settings." icon={<TestTube2 size={18} color={T.color} />} accentColor={T.color} maxWidth={960}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Provider</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{providerLabel}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Model</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', wordBreak: 'break-all' }}>{providerConfig?.modelId || 'Not set'}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Endpoint</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{providerConfig?.baseUrl || 'Not set'}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Session Totals</div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{sessionSummary.runCount} runs this session</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {formatNumber(sessionSummary.totalTokens)} tokens · {formatMoney(sessionSummary.estimatedCost)} · avg latency {formatDuration(sessionSummary.averageLatencyMs)}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <SmallPill tone={overBudget ? 'danger' : 'good'}>{`budget ${formatMoney(sessionBudgetUsd)}`}</SmallPill>
                {overBudget && <SmallPill tone="danger">over budget</SmallPill>}
                {Object.entries(sessionSummary.failureCategories || {}).slice(0, 2).map(([category, count]) => (
                  <SmallPill key={category} tone="danger">{`${category} ${count}`}</SmallPill>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(280px, 1fr)', gap: 14, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Prompt</div>
              <textarea
                value={promptDraft}
                onChange={(event) => onPromptDraftChange(event.target.value)}
                placeholder="Write a prompt to test the selected provider and model."
                style={{ ...inputStyle, minHeight: 220, resize: 'vertical', lineHeight: 1.6 }}
              />
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <SmallPill>{`temperature ${runtime.temperature}`}</SmallPill>
              <SmallPill>{`max output ${runtime.maxOutputTokens}`}</SmallPill>
              <SmallPill>{`timeout ${runtime.timeoutMs}ms`}</SmallPill>
              <SmallPill>{`retries ${runtime.retries}`}</SmallPill>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Comparison Run</div>
                <SmallPill>same provider</SmallPill>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: canPickCatalogModel ? 'minmax(0, 1fr) auto' : 'minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={comparisonModelId}
                    onChange={(event) => onComparisonModelIdChange(event.target.value)}
                    placeholder="Comparison model id"
                    style={inputStyle}
                  />
                  {canPickCatalogModel && (
                    <button type="button" onClick={onPickComparisonModel} style={secondaryButtonStyle}>
                      <Sparkles size={13} />
                      Pick model
                    </button>
                  )}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={useSamePromptForComparison}
                    onChange={(event) => onUseSamePromptForComparisonChange(event.target.checked)}
                  />
                  Use the same prompt for the comparison run
                </label>
                {!useSamePromptForComparison && (
                  <textarea
                    value={comparisonPromptDraft}
                    onChange={(event) => onComparisonPromptDraftChange(event.target.value)}
                    placeholder="Write a comparison prompt if you want to compare two prompts instead of reusing the current one."
                    style={{ ...inputStyle, minHeight: 120, resize: 'vertical', lineHeight: 1.6 }}
                  />
                )}
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Run the current prompt/model against a second model, or compare the current prompt with a second prompt using the same provider settings.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={onRun} style={positiveButtonStyle} disabled={running || !promptDraft.trim()}>
                <TestTube2 size={13} />
                {running ? 'Running…' : 'Run prompt test'}
              </button>
              <button
                type="button"
                onClick={onRunComparison}
                style={actionButtonStyle}
                disabled={comparisonRunning || !promptDraft.trim() || !comparisonModelId.trim() || (!useSamePromptForComparison && !comparisonPromptDraft.trim())}
              >
                <Sparkles size={13} />
                {comparisonRunning ? 'Comparing…' : 'Run comparison'}
              </button>
            </div>

            {result && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ ...cardStyle, borderColor: result.ok ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)', background: result.ok ? 'rgba(74,222,128,0.04)' : 'rgba(248,113,113,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <SmallPill tone={result.ok ? 'good' : 'danger'}>{result.ok ? 'success' : 'failed'}</SmallPill>
                    {result.rawId && <SmallPill>{result.rawId}</SmallPill>}
                    {!result.ok && result.failureCategory && <SmallPill tone="danger">{result.failureCategory}</SmallPill>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {result.ok ? 'Prompt test completed using the currently selected provider configuration.' : (result.error || 'Prompt test failed.')}
                  </div>
                </div>

                {result.ok && (
                  <>
                    <div style={cardStyle}>
                      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Assistant Response</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {result.outputText || 'No text was returned by the provider.'}
                      </div>
                    </div>
                    <UsageMetricGrid usage={usage} estimatedCost={result.estimatedCost} latencyMs={result.latencyMs} />
                  </>
                )}
              </div>
            )}

            {comparisonResult && (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={cardStyle}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 10 }}>Comparison Results</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                    {[
                      { key: 'primary', label: 'Primary run', modelId: providerConfig?.modelId || '', promptLabel: 'Current prompt', data: comparisonResult.primary },
                      { key: 'comparison', label: 'Comparison run', modelId: comparisonModelId, promptLabel: useSamePromptForComparison ? 'Same prompt' : 'Comparison prompt', data: comparisonResult.comparison },
                    ].map((entry) => (
                      <div key={entry.key} style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{entry.label}</div>
                          <SmallPill tone={entry.data?.ok ? 'good' : 'danger'}>{entry.data?.ok ? 'success' : 'failed'}</SmallPill>
                        </div>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.modelId || 'No model set'} · {entry.promptLabel}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                            {entry.data?.ok ? (entry.data?.outputText || 'No text was returned by the provider.') : (entry.data?.error || 'Comparison run failed.')}
                          </div>
                          {entry.data?.ok && <UsageMetricGrid usage={entry.data?.usage || null} estimatedCost={entry.data?.estimatedCost} latencyMs={entry.data?.latencyMs} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 10 }}>Reusable Test Prompts</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px', gap: 8 }}>
                  <input
                    type="text"
                    value={savedPromptTitle}
                    onChange={(event) => onSavedPromptTitleChange(event.target.value)}
                    placeholder="Prompt name"
                    style={inputStyle}
                  />
                  <input
                    type="text"
                    value={savedPromptVersion}
                    onChange={(event) => onSavedPromptVersionChange(event.target.value)}
                    placeholder="v1"
                    style={inputStyle}
                  />
                </div>
                <button type="button" onClick={onSavePrompt} style={actionButtonStyle} disabled={!promptDraft.trim()}>
                  <Sparkles size={13} />
                  Save reusable prompt
                </button>
                {savedPrompts.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    Save test prompts here so you can rerun common checks without rewriting them every time.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {savedPrompts.map((entry) => (
                      <div key={entry.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{entry.title}</div>
                          {entry.version && <SmallPill>{entry.version}</SmallPill>}
                          {entry.providerLabel && <SmallPill tone="good">{entry.providerLabel}</SmallPill>}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{promptPreview(entry.prompt)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {entry.modelId || 'no model'} · updated {new Date(entry.updatedAt || entry.createdAt || Date.now()).toLocaleString()}
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button type="button" onClick={() => onLoadSavedPrompt(entry)} style={secondaryButtonStyle}>Use</button>
                          <button type="button" onClick={() => onDeleteSavedPrompt(entry.id)} style={secondaryButtonStyle}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 10 }}>Workspace Prompt Assets</div>
              {promptAssetFiles.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  No prompt files were detected in the loaded workspace yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {promptAssetFiles.map((relativePath) => (
                    <div key={relativePath} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{relativePath}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => onLoadPromptAsset(relativePath)} style={secondaryButtonStyle}>Load into tester</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>Recent Test Runs</div>
                {promptTestHistory.length > 0 && (
                  <button type="button" onClick={onClearPromptHistory} style={secondaryButtonStyle}>Clear</button>
                )}
              </div>
              {promptTestHistory.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  Prompt test history will appear here after you run prompts through the tester.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {promptTestHistory.map((entry) => (
                    <div key={entry.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{entry.title}</div>
                        <SmallPill tone={entry.ok ? 'good' : 'danger'}>{entry.ok ? 'success' : 'failed'}</SmallPill>
                        {entry.failureCategory && <SmallPill tone="danger">{entry.failureCategory}</SmallPill>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {entry.providerLabel} · {entry.modelId || 'no model'} · {new Date(entry.ranAt).toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{responsePreview(entry.outputPreview || entry.error)}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {entry.usage?.total_tokens != null && <SmallPill>{`tokens ${entry.usage.total_tokens}`}</SmallPill>}
                        {typeof entry.estimatedCost === 'number' && <SmallPill>{`cost ${formatMoney(entry.estimatedCost)}`}</SmallPill>}
                        {typeof entry.latencyMs === 'number' && <SmallPill>{`latency ${formatDuration(entry.latencyMs)}`}</SmallPill>}
                        <button type="button" onClick={() => onLoadHistoryPrompt(entry)} style={secondaryButtonStyle}>Reuse prompt</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function LLMProviderControls({
  onConnectionError,
  promptAssetFiles = [],
  evalAssetFiles = [],
  detectedFeatureBindings = [],
  promptAssetRequest = null,
  onPromptAssetRequestHandled,
  evalRunRequest = null,
  onEvalRunRequestHandled,
  activeSection = 'overview',
}) {
  const { settings, loading, save } = useSettings();
  const [sessionApiKeys, setSessionApiKeys] = useState(() => readSessionKeys());
  const [showApiKey, setShowApiKey] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [modelPickerTarget, setModelPickerTarget] = useState('primary');
  const [testingConnection, setTestingConnection] = useState(false);
  const [promptTesterOpen, setPromptTesterOpen] = useState(false);
  const [promptDraft, setPromptDraft] = useState('Summarize why structured outputs matter for production AI apps in three short bullet points.');
  const [comparisonModelId, setComparisonModelId] = useState('');
  const [comparisonPromptDraft, setComparisonPromptDraft] = useState('');
  const [useSamePromptForComparison, setUseSamePromptForComparison] = useState(true);
  const [savedPromptTitle, setSavedPromptTitle] = useState('Structured outputs explainer');
  const [savedPromptVersion, setSavedPromptVersion] = useState('v1');
  const [featureDraft, setFeatureDraft] = useState({
    featureName: '',
    bindingType: 'manual',
    providerId: 'openai',
    modelId: '',
    notes: '',
  });
  const [promptTestRunning, setPromptTestRunning] = useState(false);
  const [comparisonRunning, setComparisonRunning] = useState(false);
  const [promptTestResult, setPromptTestResult] = useState(null);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [sessionPromptRuns, setSessionPromptRuns] = useState([]);
  const [evalRunnerOpen, setEvalRunnerOpen] = useState(false);
  const [evalRunDraft, setEvalRunDraft] = useState(null);
  const [evalRunLoading, setEvalRunLoading] = useState(false);
  const [evalRunRunning, setEvalRunRunning] = useState(false);
  const [evalRunResult, setEvalRunResult] = useState(null);
  const [evalMode, setEvalMode] = useState('exact_match');
  const [judgeModelId, setJudgeModelId] = useState('');

  const currentSettings = settings || SETTINGS_DEFAULT;
  const selectedProviderId = currentSettings.llmOperations?.selectedProviderId || SETTINGS_DEFAULT.llmOperations.selectedProviderId;
  const providerConfig = providerFromSettings(currentSettings, selectedProviderId);
  const savedPrompts = currentSettings.llmOperations?.savedPrompts || [];
  const promptTestHistory = currentSettings.llmOperations?.promptTestHistory || [];
  const evalRunHistory = currentSettings.llmOperations?.evalRunHistory || [];
  const featureBindings = currentSettings.llmOperations?.featureBindings || [];
  const runtime = runtimeFromSettings(currentSettings);
  const providerMeta = providerOptions.find((option) => option.id === selectedProviderId) || providerOptions[0];
  const sessionKey = sessionApiKeys[selectedProviderId] || '';
  const providerCatalog = getProviderModelCatalog(selectedProviderId);
  const modelCatalogEntry = getProviderModelCatalogEntry(selectedProviderId, providerConfig?.modelId);
  const lastValidation = providerConfig?.lastValidation || null;
  const showOverview = activeSection === 'overview';
  const showProvider = activeSection === 'provider';
  const showWorkflows = activeSection === 'workflows';
  const showRuntime = activeSection === 'runtime';
  const showBindings = activeSection === 'bindings';
  const importedFeatureBindingKeys = useMemo(
    () => new Set(featureBindings.map((entry) => normalizeBindingKey(entry)).filter(Boolean)),
    [featureBindings],
  );
  const featureBindingSuggestions = useMemo(
    () => detectedFeatureBindings
      .map((entry) => ({
        detectorId: entry.id,
        label: entry.label,
        sourceFile: entry.file,
        bindingType: bindingTypeFromFeatureId(entry.id),
      }))
      .filter((entry) => !importedFeatureBindingKeys.has(normalizeBindingKey(entry))),
    [detectedFeatureBindings, importedFeatureBindingKeys],
  );
  const sessionSummary = useMemo(() => {
    const successfulRuns = sessionPromptRuns.filter((entry) => entry?.ok);
    const latencyValues = successfulRuns.map((entry) => entry.latencyMs).filter((value) => typeof value === 'number');
    const failureCategories = sessionPromptRuns
      .filter((entry) => !entry?.ok && entry?.failureCategory)
      .reduce((accumulator, entry) => {
        accumulator[entry.failureCategory] = (accumulator[entry.failureCategory] || 0) + 1;
        return accumulator;
      }, {});
    return {
      runCount: sessionPromptRuns.length,
      totalTokens: successfulRuns.reduce((sum, entry) => sum + (entry?.usage?.total_tokens || 0), 0),
      estimatedCost: successfulRuns.reduce((sum, entry) => sum + (typeof entry?.estimatedCost === 'number' ? entry.estimatedCost : 0), 0),
      averageLatencyMs: latencyValues.length ? latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length : null,
      failureCategories,
    };
  }, [sessionPromptRuns]);

  useEffect(() => {
    writeSessionKeys(sessionApiKeys);
  }, [sessionApiKeys]);

  useEffect(() => {
    setComparisonModelId((currentValue) => currentValue || providerConfig?.modelId || '');
  }, [providerConfig?.modelId]);

  useEffect(() => {
    setJudgeModelId((currentValue) => currentValue || providerConfig?.modelId || '');
  }, [providerConfig?.modelId]);

  useEffect(() => {
    setFeatureDraft((current) => {
      if (current.providerId === selectedProviderId && current.modelId === (providerConfig?.modelId || '')) {
        return current;
      }
      if (current.featureName || current.notes) {
        return current;
      }
      return {
        ...current,
        providerId: selectedProviderId,
        modelId: providerConfig?.modelId || '',
      };
    });
  }, [providerConfig?.modelId, selectedProviderId]);

  const saveLlmSettings = useCallback(async (partial) => {
    await save({ llmOperations: partial });
  }, [save]);

  const onProviderFieldChange = useCallback(async (field, value) => {
    await saveLlmSettings({ providers: { [selectedProviderId]: { [field]: value } } });
  }, [saveLlmSettings, selectedProviderId]);

  const onRuntimeFieldChange = useCallback(async (field, value) => {
    await saveLlmSettings({ runtime: { [field]: value } });
  }, [saveLlmSettings]);

  const onSessionKeyChange = useCallback((providerId, value) => {
    setSessionApiKeys((prev) => ({ ...prev, [providerId]: value }));
  }, []);

  const onTestConnection = useCallback(async () => {
    if (!window.electronAPI?.llmOpsTestConnection) {
      onConnectionError?.('Connection testing is unavailable in this build.');
      return;
    }
    setTestingConnection(true);
    onConnectionError?.('');
    try {
      const result = await window.electronAPI.llmOpsTestConnection({
        providerId: selectedProviderId,
        baseUrl: providerConfig?.baseUrl,
        modelId: providerConfig?.modelId,
        organization: providerConfig?.organization,
        project: providerConfig?.project,
        deployment: providerConfig?.deployment,
        apiVersion: providerConfig?.apiVersion,
        apiKey: sessionApiKeys[selectedProviderId] || '',
        timeoutMs: runtime.timeoutMs,
      });
      const nextValidation = {
        ok: !!result?.ok,
        message: result?.ok ? (result.message || 'Connection succeeded.') : (result?.error || 'Connection failed.'),
        checkedAt: Date.now(),
        validatedModel: result?.validatedModel || providerConfig?.modelId,
        capabilities: result?.capabilities || null,
      };
      await saveLlmSettings({ providers: { [selectedProviderId]: { lastValidation: nextValidation } } });
      if (!result?.ok) onConnectionError?.(result?.error || 'Connection failed.');
    } catch (err) {
      const nextValidation = {
        ok: false,
        message: err.message || 'Connection failed.',
        checkedAt: Date.now(),
        validatedModel: providerConfig?.modelId,
        capabilities: null,
      };
      await saveLlmSettings({ providers: { [selectedProviderId]: { lastValidation: nextValidation } } });
      onConnectionError?.(err.message || 'Connection failed.');
    } finally {
      setTestingConnection(false);
    }
  }, [onConnectionError, providerConfig, runtime.timeoutMs, saveLlmSettings, selectedProviderId, sessionApiKeys]);

  const invokePromptTest = useCallback(async ({ modelId, prompt }) => {
    if (!window.electronAPI?.llmOpsRunPromptTest) {
      return { ok: false, error: 'Prompt testing is unavailable in this build.' };
    }
    const startedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const response = await window.electronAPI.llmOpsRunPromptTest({
      providerId: selectedProviderId,
      baseUrl: providerConfig?.baseUrl,
      modelId,
      organization: providerConfig?.organization,
      project: providerConfig?.project,
      deployment: providerConfig?.deployment,
      apiVersion: providerConfig?.apiVersion,
      apiKey: sessionApiKeys[selectedProviderId] || '',
      timeoutMs: runtime.timeoutMs,
      maxOutputTokens: runtime.maxOutputTokens,
      temperature: runtime.temperature,
      prompt,
    });
    const endedAt = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
    const catalogEntry = getProviderModelCatalogEntry(selectedProviderId, modelId);
    return {
      ...response,
      latencyMs: Math.max(0, endedAt - startedAt),
      estimatedCost: estimateRunCost({ usage: response?.usage, catalogEntry }),
    };
  }, [providerConfig, runtime, selectedProviderId, sessionApiKeys]);

  const appendPromptHistoryEntries = useCallback(async (entries) => {
    setSessionPromptRuns((currentValue) => [...entries, ...currentValue].slice(0, 20));
    await saveLlmSettings({
      promptTestHistory: [...entries, ...promptTestHistory].slice(0, 20),
    });
  }, [promptTestHistory, saveLlmSettings]);

  const createHistoryEntry = useCallback((result, { prompt, modelId, variantLabel = '', compareGroupId = '' }) => ({
    id: `llm-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: derivePromptTitle(prompt),
    prompt,
    providerId: selectedProviderId,
    providerLabel: providerMeta.label,
    modelId: modelId || '',
    baseUrl: providerConfig?.baseUrl || '',
    ok: !!result?.ok,
    error: result?.ok ? '' : (result?.error || 'Prompt test failed.'),
    failureCategory: result?.ok ? '' : categorizeFailure(result?.error),
    outputText: result?.outputText || '',
    outputPreview: result?.outputText || '',
    usage: result?.usage || null,
    estimatedCost: typeof result?.estimatedCost === 'number' ? result.estimatedCost : null,
    latencyMs: typeof result?.latencyMs === 'number' ? result.latencyMs : null,
    rawId: result?.rawId || '',
    ranAt: Date.now(),
    variantLabel,
    compareGroupId,
  }), [providerConfig?.baseUrl, providerMeta.label, selectedProviderId]);

  const onRunPromptTest = useCallback(async () => {
    setPromptTestRunning(true);
    setPromptTestResult(null);
    setComparisonResult(null);
    try {
      const result = await invokePromptTest({
        modelId: providerConfig?.modelId,
        prompt: promptDraft,
      });
      setPromptTestResult(result);
      await appendPromptHistoryEntries([
        createHistoryEntry(result, { prompt: promptDraft, modelId: providerConfig?.modelId }),
      ]);
    } catch (err) {
      const failure = { ok: false, error: err.message || 'Prompt test failed.' };
      setPromptTestResult(failure);
      await appendPromptHistoryEntries([
        createHistoryEntry(failure, { prompt: promptDraft, modelId: providerConfig?.modelId }),
      ]);
    } finally {
      setPromptTestRunning(false);
    }
  }, [appendPromptHistoryEntries, createHistoryEntry, invokePromptTest, promptDraft, providerConfig?.modelId]);

  const onRunComparison = useCallback(async () => {
    const comparisonPrompt = useSamePromptForComparison ? promptDraft : comparisonPromptDraft;
    setComparisonRunning(true);
    setComparisonResult(null);
    try {
      const [primaryResult, secondaryResult] = await Promise.all([
        invokePromptTest({
          modelId: providerConfig?.modelId,
          prompt: promptDraft,
        }),
        invokePromptTest({
          modelId: comparisonModelId,
          prompt: comparisonPrompt,
        }),
      ]);
      const compareGroupId = `compare-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setPromptTestResult(primaryResult);
      setComparisonResult({
        primary: primaryResult,
        comparison: secondaryResult,
        comparedAt: Date.now(),
      });
      await appendPromptHistoryEntries([
        createHistoryEntry(primaryResult, { prompt: promptDraft, modelId: providerConfig?.modelId, variantLabel: 'primary', compareGroupId }),
        createHistoryEntry(secondaryResult, { prompt: comparisonPrompt, modelId: comparisonModelId, variantLabel: 'comparison', compareGroupId }),
      ]);
    } catch (err) {
      setComparisonResult({
        primary: { ok: false, error: err.message || 'Comparison run failed.' },
        comparison: { ok: false, error: err.message || 'Comparison run failed.' },
        comparedAt: Date.now(),
      });
    } finally {
      setComparisonRunning(false);
    }
  }, [appendPromptHistoryEntries, comparisonModelId, comparisonPromptDraft, createHistoryEntry, invokePromptTest, promptDraft, providerConfig?.modelId, useSamePromptForComparison]);

  const onSaveReusablePrompt = useCallback(async () => {
    const trimmedPrompt = promptDraft.trim();
    if (!trimmedPrompt) return;
    const title = (savedPromptTitle || '').trim() || derivePromptTitle(trimmedPrompt);
    const version = (savedPromptVersion || '').trim() || 'v1';
    const now = Date.now();
    const existing = savedPrompts.find((entry) => entry.title.trim().toLowerCase() === title.toLowerCase());
    const nextEntry = existing
      ? {
          ...existing,
          title,
          version,
          prompt: trimmedPrompt,
          providerId: selectedProviderId,
          providerLabel: providerMeta.label,
          modelId: providerConfig?.modelId || '',
          updatedAt: now,
        }
      : {
          id: `prompt-${now}-${Math.random().toString(36).slice(2, 8)}`,
          title,
          version,
          prompt: trimmedPrompt,
          providerId: selectedProviderId,
          providerLabel: providerMeta.label,
          modelId: providerConfig?.modelId || '',
          createdAt: now,
          updatedAt: now,
        };
    const nextPrompts = existing
      ? savedPrompts.map((entry) => entry.id === existing.id ? nextEntry : entry)
      : [nextEntry, ...savedPrompts].slice(0, 24);
    await saveLlmSettings({ savedPrompts: nextPrompts });
    setSavedPromptTitle(title);
    setSavedPromptVersion(version);
  }, [promptDraft, providerConfig?.modelId, providerMeta.label, savedPromptTitle, savedPromptVersion, savedPrompts, saveLlmSettings, selectedProviderId]);

  const onDeleteSavedPrompt = useCallback(async (promptId) => {
    const nextPrompts = savedPrompts.filter((entry) => entry.id !== promptId);
    await saveLlmSettings({ savedPrompts: nextPrompts });
  }, [savedPrompts, saveLlmSettings]);

  const onLoadSavedPrompt = useCallback(async (entry) => {
    setPromptDraft(entry?.prompt || '');
    setSavedPromptTitle(entry?.title || derivePromptTitle(entry?.prompt || ''));
    setSavedPromptVersion(entry?.version || 'v1');
    if (entry?.providerId) {
      await saveLlmSettings({
        selectedProviderId: entry.providerId,
        providers: {
          [entry.providerId]: {
            modelId: entry?.modelId || '',
          },
        },
      });
    }
    setPromptTestResult(null);
    setComparisonResult(null);
    setPromptTesterOpen(true);
  }, [saveLlmSettings]);

  const onLoadHistoryPrompt = useCallback((entry) => {
    setPromptDraft(entry?.prompt || '');
    setSavedPromptTitle(entry?.title || derivePromptTitle(entry?.prompt || ''));
    setSavedPromptVersion(entry?.version || 'v1');
    if (entry?.modelId) setComparisonModelId(entry.modelId);
    setPromptTestResult(entry?.ok
      ? {
          ok: true,
          outputText: entry.outputText || entry.outputPreview || '',
          usage: entry.usage || null,
          estimatedCost: typeof entry?.estimatedCost === 'number' ? entry.estimatedCost : null,
          latencyMs: typeof entry?.latencyMs === 'number' ? entry.latencyMs : null,
          rawId: entry.rawId || '',
        }
      : {
          ok: false,
          error: entry?.error || 'Prompt test failed.',
        });
    setComparisonResult(null);
    setPromptTesterOpen(true);
  }, []);

  const onClearPromptHistory = useCallback(async () => {
    setSessionPromptRuns([]);
    await saveLlmSettings({ promptTestHistory: [] });
  }, [saveLlmSettings]);

  const saveFeatureBindings = useCallback(async (nextBindings) => {
    await saveLlmSettings({ featureBindings: nextBindings });
  }, [saveLlmSettings]);

  const onAddFeatureBinding = useCallback(async () => {
    const featureName = String(featureDraft.featureName || '').trim();
    if (!featureName) return;
    const providerId = featureDraft.providerId || selectedProviderId;
    const nextEntry = {
      id: `binding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      featureName,
      bindingType: featureDraft.bindingType || 'manual',
      providerId,
      providerLabel: providerLabelForId(providerId),
      modelId: String(featureDraft.modelId || '').trim(),
      enabled: true,
      notes: String(featureDraft.notes || '').trim(),
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveFeatureBindings([nextEntry, ...featureBindings].slice(0, 24));
    setFeatureDraft({
      featureName: '',
      bindingType: 'manual',
      providerId: selectedProviderId,
      modelId: providerConfig?.modelId || '',
      notes: '',
    });
  }, [featureBindings, featureDraft, providerConfig?.modelId, saveFeatureBindings, selectedProviderId]);

  const onUpdateFeatureBinding = useCallback(async (bindingId, patch) => {
    const nextBindings = featureBindings.map((entry) => {
      if (entry.id !== bindingId) return entry;
      const nextEntry = { ...entry, ...patch, updatedAt: Date.now() };
      if (Object.prototype.hasOwnProperty.call(patch, 'providerId')) {
        nextEntry.providerLabel = providerLabelForId(patch.providerId);
      }
      return nextEntry;
    });
    await saveFeatureBindings(nextBindings);
  }, [featureBindings, saveFeatureBindings]);

  const onDeleteFeatureBinding = useCallback(async (bindingId) => {
    await saveFeatureBindings(featureBindings.filter((entry) => entry.id !== bindingId));
  }, [featureBindings, saveFeatureBindings]);

  const onImportDetectedFeatureBinding = useCallback(async (suggestion) => {
    const nextEntry = {
      id: `binding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      detectorId: suggestion.detectorId,
      sourceFile: suggestion.sourceFile,
      featureName: suggestion.label,
      bindingType: suggestion.bindingType || 'manual',
      providerId: selectedProviderId,
      providerLabel: providerMeta.label,
      modelId: providerConfig?.modelId || '',
      enabled: true,
      notes: `Imported from workspace signal: ${suggestion.sourceFile}`,
      source: 'workspace',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveFeatureBindings([nextEntry, ...featureBindings].slice(0, 24));
  }, [featureBindings, providerConfig?.modelId, providerMeta.label, saveFeatureBindings, selectedProviderId]);

  const onImportAllDetectedFeatureBindings = useCallback(async () => {
    if (featureBindingSuggestions.length === 0) return;
    const timestamp = Date.now();
    const importedEntries = featureBindingSuggestions.map((suggestion, index) => ({
      id: `binding-${timestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      detectorId: suggestion.detectorId,
      sourceFile: suggestion.sourceFile,
      featureName: suggestion.label,
      bindingType: suggestion.bindingType || 'manual',
      providerId: selectedProviderId,
      providerLabel: providerMeta.label,
      modelId: providerConfig?.modelId || '',
      enabled: true,
      notes: `Imported from workspace signal: ${suggestion.sourceFile}`,
      source: 'workspace',
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    await saveFeatureBindings([...importedEntries, ...featureBindings].slice(0, 24));
  }, [featureBindingSuggestions, featureBindings, providerConfig?.modelId, providerMeta.label, saveFeatureBindings, selectedProviderId]);

  const appendEvalHistoryEntry = useCallback(async (entry) => {
    await saveLlmSettings({
      evalRunHistory: [entry, ...evalRunHistory].slice(0, 12),
    });
  }, [evalRunHistory, saveLlmSettings]);

  const loadPromptAsset = useCallback(async (relativePath) => {
    setPromptTesterOpen(true);
    setPromptTestResult(null);
    setComparisonResult(null);

    if (!window.electronAPI?.llmOpsReadPromptAsset) {
      setPromptTestResult({ ok: false, error: 'Prompt asset loading is unavailable in this build.' });
      return;
    }

    try {
      const result = await window.electronAPI.llmOpsReadPromptAsset({ relativePath });
      if (!result?.ok) {
        setPromptTestResult({ ok: false, error: result?.error || 'Unable to load prompt asset.' });
        return;
      }
      setPromptDraft(result.content || '');
      setSavedPromptTitle(result.title || derivePromptTitle(result.content, 'Workspace prompt'));
    } catch (err) {
      setPromptTestResult({ ok: false, error: err.message || 'Unable to load prompt asset.' });
    }
  }, []);

  const loadEvalAsset = useCallback(async (relativePath) => {
    setEvalRunnerOpen(true);
    setEvalRunLoading(true);
    setEvalRunResult(null);

    if (!window.electronAPI?.llmOpsReadEvalAsset) {
      setEvalRunDraft({ error: 'Eval asset loading is unavailable in this build.' });
      setEvalRunLoading(false);
      return;
    }

    try {
      const result = await window.electronAPI.llmOpsReadEvalAsset({ relativePath });
      if (!result?.ok) {
        setEvalRunDraft({ error: result?.error || 'Unable to load eval dataset.' });
        setEvalRunLoading(false);
        return;
      }
      const cases = parseEvalDatasetText(result.relativePath, result.content);
      const nextDraft = {
        relativePath: result.relativePath,
        title: result.title || 'Workspace eval set',
        loadedAt: result.loadedAt || Date.now(),
        cases,
      };
      setEvalMode(suggestEvalMode(nextDraft));
      setEvalRunDraft({
        relativePath: result.relativePath,
        title: result.title || 'Workspace eval set',
        loadedAt: result.loadedAt || Date.now(),
        cases,
      });
    } catch (err) {
      setEvalRunDraft({ error: err.message || 'Unable to load eval dataset.' });
    } finally {
      setEvalRunLoading(false);
    }
  }, []);

  const onOpenEvalRunner = useCallback(() => {
    setEvalRunLoading(false);
    setEvalRunResult(null);
    setEvalRunnerOpen(true);
  }, []);

  const onRunEvalSet = useCallback(async () => {
    if (!evalRunDraft?.cases?.length) return;
    setEvalRunRunning(true);
    setEvalRunResult(null);
    try {
      const caseResults = [];
      for (const entry of evalRunDraft.cases) {
        const result = await invokePromptTest({
          modelId: providerConfig?.modelId,
          prompt: entry.prompt,
        });
        let evaluation = { status: 'review', rationale: 'No evaluation mode matched this case.' };
        if (evalMode === 'exact_match') {
          evaluation = evaluateExactMatch(entry, result?.outputText || '');
        } else if (evalMode === 'rule_based') {
          evaluation = evaluateRuleBased(entry, result?.outputText || '');
        } else if (evalMode === 'judge_model') {
          const judgeResult = await invokePromptTest({
            modelId: judgeModelId || providerConfig?.modelId,
            prompt: buildJudgePrompt({ entry, outputText: result?.outputText || '' }),
          });
          evaluation = {
            ...parseJudgeVerdict(judgeResult?.outputText || ''),
            judgeUsage: judgeResult?.usage || null,
            judgeEstimatedCost: typeof judgeResult?.estimatedCost === 'number' ? judgeResult.estimatedCost : null,
            judgeLatencyMs: typeof judgeResult?.latencyMs === 'number' ? judgeResult.latencyMs : null,
            judgeModelId: judgeModelId || providerConfig?.modelId || '',
          };
        } else if (evalMode === 'rubric_based') {
          evaluation = {
            status: 'review',
            rationale: (entry?.rubric || []).length > 0
              ? 'Rubric criteria loaded. Review the output manually and mark the final verdict.'
              : 'No rubric criteria were embedded in this case, so Launchline left it for manual review.',
          };
        } else if (evalMode === 'human_review') {
          evaluation = {
            status: 'review',
            rationale: 'Human review mode keeps the case open until an operator marks it pass or fail.',
          };
        }
        caseResults.push({
          ...entry,
          status: evaluation.status,
          rationale: evaluation.rationale,
          reviewNote: '',
          escalated: false,
          outputText: result?.outputText || '',
          error: result?.error || '',
          usage: result?.usage || null,
          estimatedCost: typeof result?.estimatedCost === 'number' ? result.estimatedCost : null,
          latencyMs: typeof result?.latencyMs === 'number' ? result.latencyMs : null,
          ok: !!result?.ok,
          judgeUsage: evaluation.judgeUsage || null,
          judgeEstimatedCost: typeof evaluation.judgeEstimatedCost === 'number' ? evaluation.judgeEstimatedCost : null,
          judgeLatencyMs: typeof evaluation.judgeLatencyMs === 'number' ? evaluation.judgeLatencyMs : null,
          judgeModelId: evaluation.judgeModelId || '',
        });
      }
      const summaryStats = computeEvalSummary(caseResults);
      const modeLabelMap = {
        exact_match: 'Exact-match',
        rule_based: 'Rule-based',
        rubric_based: 'Rubric-based',
        judge_model: 'Judge-model',
        human_review: 'Human review',
      };
      const summary = {
        id: `eval-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: evalRunDraft.title,
        relativePath: evalRunDraft.relativePath,
        providerId: selectedProviderId,
        providerLabel: providerMeta.label,
        modelId: providerConfig?.modelId || '',
        mode: evalMode,
        modeLabel: modeLabelMap[evalMode] || evalMode,
        judgeModelId: evalMode === 'judge_model' ? (judgeModelId || providerConfig?.modelId || '') : '',
        ranAt: Date.now(),
        ...summaryStats,
        totalTokens: summaryStats.totalTokens + caseResults.reduce((sum, entry) => sum + (entry?.judgeUsage?.total_tokens || 0), 0),
        estimatedCost: summaryStats.estimatedCost + caseResults.reduce((sum, entry) => sum + (typeof entry?.judgeEstimatedCost === 'number' ? entry.judgeEstimatedCost : 0), 0),
        gateThreshold: Number(runtime.evalGateMinPassRate) || 0,
        gatePassRate: summaryStats.totalCases ? (summaryStats.passCount / summaryStats.totalCases) : null,
        gatePassed: summaryStats.totalCases ? ((summaryStats.passCount / summaryStats.totalCases) >= (Number(runtime.evalGateMinPassRate) || 0)) : null,
        gateEnforced: !!runtime.requireEvalGatePass,
        cases: caseResults,
        saved: false,
      };
      setEvalRunResult(summary);
    } finally {
      setEvalRunRunning(false);
    }
  }, [evalMode, evalRunDraft, invokePromptTest, judgeModelId, providerConfig?.modelId, providerMeta.label, runtime.evalGateMinPassRate, runtime.requireEvalGatePass, selectedProviderId]);

  const onReviewEvalCase = useCallback((caseId, nextStatus) => {
    setEvalRunResult((currentValue) => {
      if (!currentValue) return currentValue;
      const nextCases = currentValue.cases.map((entry) => entry.id === caseId ? { ...entry, status: nextStatus, rationale: `Marked ${nextStatus} during manual review.` } : entry);
      const summaryStats = computeEvalSummary(nextCases);
      return {
        ...currentValue,
        ...summaryStats,
        gatePassRate: summaryStats.totalCases ? (summaryStats.passCount / summaryStats.totalCases) : null,
        gatePassed: summaryStats.totalCases ? ((summaryStats.passCount / summaryStats.totalCases) >= (Number(runtime.evalGateMinPassRate) || 0)) : null,
        cases: nextCases,
        saved: false,
      };
    });
  }, [runtime.evalGateMinPassRate]);

  const onCaseNoteChange = useCallback((caseId, nextNote) => {
    setEvalRunResult((currentValue) => {
      if (!currentValue) return currentValue;
      const nextCases = currentValue.cases.map((entry) => entry.id === caseId ? { ...entry, reviewNote: nextNote } : entry);
      return {
        ...currentValue,
        cases: nextCases,
        saved: false,
      };
    });
  }, []);

  const onToggleCaseEscalation = useCallback((caseId) => {
    setEvalRunResult((currentValue) => {
      if (!currentValue) return currentValue;
      const nextCases = currentValue.cases.map((entry) => entry.id === caseId ? { ...entry, escalated: !entry.escalated } : entry);
      const summaryStats = computeEvalSummary(nextCases);
      return {
        ...currentValue,
        ...summaryStats,
        gatePassRate: summaryStats.totalCases ? (summaryStats.passCount / summaryStats.totalCases) : null,
        gatePassed: summaryStats.totalCases ? ((summaryStats.passCount / summaryStats.totalCases) >= (Number(runtime.evalGateMinPassRate) || 0)) : null,
        cases: nextCases,
        saved: false,
      };
    });
  }, [runtime.evalGateMinPassRate]);

  const onSaveEvalRun = useCallback(async () => {
    if (!evalRunResult) return;
    const savedEntry = {
      id: evalRunResult.id,
      title: evalRunResult.title,
      relativePath: evalRunResult.relativePath,
      providerId: evalRunResult.providerId,
      providerLabel: evalRunResult.providerLabel,
      modelId: evalRunResult.modelId,
      mode: evalRunResult.mode,
      modeLabel: evalRunResult.modeLabel,
      judgeModelId: evalRunResult.judgeModelId || '',
      ranAt: evalRunResult.ranAt,
      totalCases: evalRunResult.totalCases,
      passCount: evalRunResult.passCount,
      failCount: evalRunResult.failCount,
      reviewCount: evalRunResult.reviewCount,
      escalatedCount: evalRunResult.escalatedCount || 0,
      totalTokens: evalRunResult.totalTokens,
      estimatedCost: evalRunResult.estimatedCost,
      averageLatencyMs: evalRunResult.averageLatencyMs,
      gateThreshold: evalRunResult.gateThreshold,
      gatePassRate: evalRunResult.gatePassRate,
      gatePassed: evalRunResult.gatePassed,
      gateEnforced: evalRunResult.gateEnforced,
    };
    await appendEvalHistoryEntry(savedEntry);
    setEvalRunResult((currentValue) => currentValue ? { ...currentValue, saved: true } : currentValue);
  }, [appendEvalHistoryEntry, evalRunResult]);

  useEffect(() => {
    if (!promptAssetRequest?.relativePath) return undefined;
    let cancelled = false;

    (async () => {
      if (!cancelled) {
        await loadPromptAsset(promptAssetRequest.relativePath);
      }
      if (!cancelled) {
        onPromptAssetRequestHandled?.(promptAssetRequest.key);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadPromptAsset, onPromptAssetRequestHandled, promptAssetRequest]);

  useEffect(() => {
    if (!evalRunRequest?.relativePath) return undefined;
    let cancelled = false;

    (async () => {
      if (!cancelled) {
        await loadEvalAsset(evalRunRequest.relativePath);
      }
      if (!cancelled) {
        onEvalRunRequestHandled?.(evalRunRequest.key);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [evalRunRequest, loadEvalAsset, onEvalRunRequestHandled]);

  if (loading) return null;

  const sectionTitle = showProvider
    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Cpu size={16} /> Provider Settings</span>
    : showRuntime
      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><RefreshCw size={16} /> Runtime and Policy</span>
      : showBindings
        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Sparkles size={16} /> Feature Bindings</span>
        : showWorkflows
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TestTube2 size={16} /> Prompt and Eval Workflows</span>
          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><Cpu size={16} /> Operations Overview</span>;

  return (
    <>
      <Section title={sectionTitle}>
        <div style={{ display: 'grid', gap: 14 }}>
          {(showProvider) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Provider</div>
              <select value={selectedProviderId} onChange={(event) => saveLlmSettings({ selectedProviderId: event.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                {providerOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Model ID</div>
              <input type="text" value={providerConfig?.modelId || ''} onChange={(event) => onProviderFieldChange('modelId', event.target.value)} style={inputStyle} placeholder="gpt-5.4-mini" />
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Base URL</div>
              <input type="text" value={providerConfig?.baseUrl || ''} onChange={(event) => onProviderFieldChange('baseUrl', event.target.value)} style={inputStyle} placeholder="https://api.openai.com/v1" />
            </div>
          </div>
          )}

          {showProvider && (selectedProviderId === 'openai' || selectedProviderId === 'azure-openai') && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {selectedProviderId === 'openai' ? (
                <>
                  <input type="text" value={providerConfig?.organization || ''} onChange={(event) => onProviderFieldChange('organization', event.target.value)} style={inputStyle} placeholder="OpenAI organization (optional)" />
                  <input type="text" value={providerConfig?.project || ''} onChange={(event) => onProviderFieldChange('project', event.target.value)} style={inputStyle} placeholder="OpenAI project (optional)" />
                </>
              ) : (
                <>
                  <input type="text" value={providerConfig?.deployment || ''} onChange={(event) => onProviderFieldChange('deployment', event.target.value)} style={inputStyle} placeholder="Azure deployment name" />
                  <input type="text" value={providerConfig?.apiVersion || ''} onChange={(event) => onProviderFieldChange('apiVersion', event.target.value)} style={inputStyle} placeholder="Azure API version" />
                </>
              )}
            </div>
          )}

          {showProvider && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <KeyRound size={14} color={T.color} />
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>API Key</div>
              <SmallPill tone={sessionKey ? 'good' : 'warn'}>{sessionKey ? 'loaded for session' : 'not loaded'}</SmallPill>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 8, alignItems: 'center' }}>
                <input type={showApiKey ? 'text' : 'password'} value={sessionKey} onChange={(event) => onSessionKeyChange(selectedProviderId, event.target.value)} style={inputStyle} placeholder="Stored only for the current Launchline session" autoComplete="off" />
                <button type="button" onClick={() => setShowApiKey((value) => !value)} style={secondaryButtonStyle}>{showApiKey ? <EyeOff size={13} /> : <Eye size={13} />}{showApiKey ? 'Mask' : 'Show'}</button>
                <button type="button" onClick={() => onSessionKeyChange(selectedProviderId, '')} style={secondaryButtonStyle}>Clear</button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>Launchline keeps API keys in browser session storage for the current app session only. They are not written into persistent app settings.</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <SmallPill>{maskKey(sessionKey)}</SmallPill>
                {providerConfig?.docsUrl && <a href={providerConfig.docsUrl} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: T.color, fontSize: 12, textDecoration: 'none' }}><ExternalLink size={12} />{providerMeta.docsLabel}</a>}
              </div>
            </div>
          </div>
          )}

          {(showOverview || showWorkflows || showProvider) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {providerMeta.hasCatalog && <button type="button" onClick={() => { setModelPickerTarget('primary'); setModelPickerOpen(true); }} style={actionButtonStyle}><Sparkles size={13} />Pick model</button>}
            <button type="button" onClick={onTestConnection} style={positiveButtonStyle} disabled={testingConnection}><TestTube2 size={13} />{testingConnection ? 'Testing…' : 'Test connection'}</button>
            <button type="button" onClick={() => setPromptTesterOpen(true)} style={actionButtonStyle}><Sparkles size={13} />Prompt tester</button>
            <button type="button" onClick={onOpenEvalRunner} style={actionButtonStyle}><TestTube2 size={13} />Eval runner</button>
          </div>
          )}

          {(showOverview || showWorkflows || showProvider) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Selected Model</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{providerConfig?.modelId || 'No model selected'}</div>
              {modelCatalogEntry ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{modelCatalogEntry.summary}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {modelCatalogEntry.supportsStructuredOutputs && <SmallPill tone="good">structured outputs</SmallPill>}
                    {modelCatalogEntry.supportsTools && <SmallPill tone="good">tools support</SmallPill>}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {providerCatalog
                    ? 'This model is outside Launchline\'s curated provider catalog, so custom metadata will be used.'
                    : 'This provider does not have a curated Launchline catalog yet, so custom metadata will be used.'}
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Validation State</div>
              {lastValidation ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <SmallPill tone={lastValidation.ok ? 'good' : 'danger'}>{lastValidation.ok ? 'connected' : 'failed'}</SmallPill>
                    {lastValidation.validatedModel && <SmallPill>{lastValidation.validatedModel}</SmallPill>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{lastValidation.message}</div>
                  {lastValidation.capabilities && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      <SmallPill tone={lastValidation.capabilities.structuredOutputs ? 'good' : 'warn'}>
                        {lastValidation.capabilities.structuredOutputs ? 'structured outputs' : 'no structured outputs'}
                      </SmallPill>
                      <SmallPill tone={lastValidation.capabilities.tools ? 'good' : 'warn'}>
                        {lastValidation.capabilities.tools ? 'tools support' : 'no tools support'}
                      </SmallPill>
                      <SmallPill tone={lastValidation.capabilities.promptCaching ? 'good' : 'warn'}>
                        {lastValidation.capabilities.promptCaching ? 'prompt caching' : 'no prompt caching'}
                      </SmallPill>
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Last checked {new Date(lastValidation.checkedAt).toLocaleString()}</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Run a connection test to validate the current provider configuration.</div>
              )}
            </div>
          </div>
          )}

          {(showOverview || showWorkflows) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Saved Prompts</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{savedPrompts.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
                Reusable prompt entries saved inside Launchline.
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Prompt Test Runs</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{promptTestHistory.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
                Recent prompt tests captured in Launchline history.
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Eval Runs</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{evalRunHistory.length}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
                Saved eval summaries captured from the manual eval runner.
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Session Totals</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>{sessionSummary.runCount}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 8 }}>
                Prompt runs captured during the current Launchline session.
              </div>
            </div>
          </div>
          )}

          {showWorkflows && (
          <div style={cardStyle}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Workflow surfaces</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Use the prompt tester to run direct prompts and comparisons with the current provider settings. Use the eval runner to load detected datasets, choose an evaluation mode, review case outcomes, and save the run into eval history.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <SmallPill tone={promptAssetFiles.length > 0 ? 'good' : 'warn'}>{promptAssetFiles.length > 0 ? `${promptAssetFiles.length} prompt assets available` : 'no prompt assets detected'}</SmallPill>
                <SmallPill tone={evalAssetFiles.length > 0 ? 'good' : 'warn'}>{evalAssetFiles.length > 0 ? `${evalAssetFiles.length} eval datasets available` : 'no eval datasets detected'}</SmallPill>
                <SmallPill tone={sessionSummary.runCount > 0 ? 'good' : 'warn'}>{sessionSummary.runCount > 0 ? `${sessionSummary.runCount} runs this session` : 'no session runs yet'}</SmallPill>
              </div>
            </div>
          </div>
          )}

          {showRuntime && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Runtime Behavior</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <input type="number" min="0" max="2" step="0.1" value={runtime.temperature} onChange={(event) => onRuntimeFieldChange('temperature', Number(event.target.value))} style={inputStyle} />
                <input type="number" min="1" step="1" value={runtime.maxOutputTokens} onChange={(event) => onRuntimeFieldChange('maxOutputTokens', Number(event.target.value))} style={inputStyle} />
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Request Policy</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <input type="number" min="1000" step="1000" value={runtime.timeoutMs} onChange={(event) => onRuntimeFieldChange('timeoutMs', Number(event.target.value))} style={inputStyle} />
                <input type="number" min="0" step="1" value={runtime.retries} onChange={(event) => onRuntimeFieldChange('retries', Number(event.target.value))} style={inputStyle} />
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Fallback Model</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={!!runtime.enableFallback} onChange={(event) => onRuntimeFieldChange('enableFallback', event.target.checked)} />
                  Enable fallback model
                </label>
                <input type="text" value={runtime.fallbackModelId} onChange={(event) => onRuntimeFieldChange('fallbackModelId', event.target.value)} style={inputStyle} placeholder="Optional fallback model id" />
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Budget Guardrail</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <input type="number" min="0" step="0.1" value={runtime.sessionBudgetUsd} onChange={(event) => onRuntimeFieldChange('sessionBudgetUsd', Number(event.target.value))} style={inputStyle} />
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Launchline compares prompt-test session cost against this threshold and warns when the current session goes over budget.
                </div>
              </div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>Eval Gate</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <input type="number" min="0" max="1" step="0.05" value={runtime.evalGateMinPassRate} onChange={(event) => onRuntimeFieldChange('evalGateMinPassRate', Number(event.target.value))} style={inputStyle} />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={!!runtime.requireEvalGatePass} onChange={(event) => onRuntimeFieldChange('requireEvalGatePass', event.target.checked)} />
                  Require the eval gate to pass before a run can be marked ready
                </label>
              </div>
            </div>
          </div>
          )}

          {showBindings && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>Feature Bindings Editor</div>
              <SmallPill tone="good">linked</SmallPill>
              <SmallPill>{`${featureBindings.length} mapped`}</SmallPill>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
              Capture which product features rely on LLM behavior, import detected workspace signals into managed bindings, and keep provider/model assignments explicit for each mapped capability.
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {featureBindingSuggestions.length > 0 && (
                <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, flex: 1 }}>
                      Detected Workspace Bindings
                    </div>
                    <SmallPill>{`${featureBindingSuggestions.length} ready to import`}</SmallPill>
                    <button type="button" onClick={onImportAllDetectedFeatureBindings} style={actionButtonStyle}>
                      <Sparkles size={13} />
                      Import all
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {featureBindingSuggestions.map((entry) => (
                      <div
                        key={`${entry.detectorId}-${entry.sourceFile}`}
                        style={{
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 10,
                          padding: '10px 12px',
                          background: 'rgba(255,255,255,0.02)',
                          display: 'grid',
                          gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', flex: 1 }}>{entry.label}</div>
                          <SmallPill>{entry.bindingType}</SmallPill>
                          <button type="button" onClick={() => onImportDetectedFeatureBinding(entry)} style={secondaryButtonStyle}>
                            <Sparkles size={13} />
                            Import
                          </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <SmallPill tone="good">workspace signal</SmallPill>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <SmallPill>{entry.sourceFile}</SmallPill>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1.1fr) 160px 160px 160px minmax(0, 1fr) auto', gap: 8, alignItems: 'start' }}>
                <input
                  type="text"
                  value={featureDraft.featureName}
                  onChange={(event) => setFeatureDraft((current) => ({ ...current, featureName: event.target.value }))}
                  placeholder="Feature name"
                  style={inputStyle}
                />
                <select
                  value={featureDraft.bindingType}
                  onChange={(event) => setFeatureDraft((current) => ({ ...current, bindingType: event.target.value }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="manual">Manual</option>
                  <option value="generation">Generation</option>
                  <option value="classification">Classification</option>
                  <option value="retrieval">Retrieval</option>
                  <option value="agent">Agent / Tools</option>
                  <option value="evaluation">Evaluation</option>
                </select>
                <select
                  value={featureDraft.providerId}
                  onChange={(event) => {
                    const nextProviderId = event.target.value;
                    const nextProviderConfig = providerFromSettings(currentSettings, nextProviderId);
                    setFeatureDraft((current) => ({
                      ...current,
                      providerId: nextProviderId,
                      modelId: current.modelId || nextProviderConfig?.modelId || '',
                    }));
                  }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {providerOptions.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={featureDraft.modelId}
                  onChange={(event) => setFeatureDraft((current) => ({ ...current, modelId: event.target.value }))}
                  placeholder="Model id"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={featureDraft.notes}
                  onChange={(event) => setFeatureDraft((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Short notes"
                  style={inputStyle}
                />
                <button type="button" onClick={onAddFeatureBinding} style={actionButtonStyle} disabled={!featureDraft.featureName.trim()}>
                  <Sparkles size={13} />
                  Add binding
                </button>
              </div>

              {featureBindings.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  No feature bindings have been mapped yet. Add a feature here to start documenting which LLM-backed capabilities exist in this workspace or product.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {featureBindings.map((entry) => (
                    <div key={entry.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, 1.1fr) 160px 160px 160px 120px auto', gap: 8, alignItems: 'center' }}>
                        <input
                          type="text"
                          value={entry.featureName || ''}
                          onChange={(event) => onUpdateFeatureBinding(entry.id, { featureName: event.target.value })}
                          style={inputStyle}
                        />
                        <select
                          value={entry.bindingType || 'manual'}
                          onChange={(event) => onUpdateFeatureBinding(entry.id, { bindingType: event.target.value })}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                          <option value="manual">Manual</option>
                          <option value="generation">Generation</option>
                          <option value="classification">Classification</option>
                          <option value="retrieval">Retrieval</option>
                          <option value="agent">Agent / Tools</option>
                          <option value="evaluation">Evaluation</option>
                        </select>
                        <select
                          value={entry.providerId || selectedProviderId}
                          onChange={(event) => onUpdateFeatureBinding(entry.id, { providerId: event.target.value })}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                          {providerOptions.map((option) => (
                            <option key={option.id} value={option.id}>{option.label}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={entry.modelId || ''}
                          onChange={(event) => onUpdateFeatureBinding(entry.id, { modelId: event.target.value })}
                          style={inputStyle}
                          placeholder="Model id"
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <input
                            type="checkbox"
                            checked={entry.enabled !== false}
                            onChange={(event) => onUpdateFeatureBinding(entry.id, { enabled: event.target.checked })}
                          />
                          Enabled
                        </label>
                        <button type="button" onClick={() => onDeleteFeatureBinding(entry.id)} style={secondaryButtonStyle}>Delete</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 8, alignItems: 'start' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <SmallPill tone="good">{entry.providerLabel || providerLabelForId(entry.providerId) || providerMeta.label}</SmallPill>
                          <SmallPill>{entry.bindingType || 'manual'}</SmallPill>
                          <SmallPill tone={entry.source === 'workspace' ? 'good' : 'default'}>
                            {entry.source === 'workspace' ? 'workspace imported' : 'manual'}
                          </SmallPill>
                          {entry.sourceFile && <SmallPill>{entry.sourceFile}</SmallPill>}
                        </div>
                        <textarea
                          value={entry.notes || ''}
                          onChange={(event) => onUpdateFeatureBinding(entry.id, { notes: event.target.value })}
                          placeholder="Notes about how this feature uses LLMs"
                          style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </Section>

      {modelPickerOpen && (
        <ProviderModelPickerModal
          catalog={providerCatalog}
          selectedModelId={modelPickerTarget === 'comparison' ? comparisonModelId : modelPickerTarget === 'judge' ? judgeModelId : providerConfig?.modelId}
          onClose={() => setModelPickerOpen(false)}
          onSelect={async (model) => {
            if (modelPickerTarget === 'comparison') {
              setComparisonModelId(model.id);
            } else if (modelPickerTarget === 'judge') {
              setJudgeModelId(model.id);
            } else {
              await saveLlmSettings({ providers: { [selectedProviderId]: { modelId: model.id } } });
            }
            setModelPickerOpen(false);
          }}
        />
      )}

      {promptTesterOpen && (
        <PromptTesterModal
          providerLabel={providerMeta.label}
          providerConfig={providerConfig}
          runtime={runtime}
          sessionSummary={sessionSummary}
          sessionBudgetUsd={runtime.sessionBudgetUsd}
          promptDraft={promptDraft}
          onPromptDraftChange={setPromptDraft}
          savedPromptTitle={savedPromptTitle}
          onSavedPromptTitleChange={setSavedPromptTitle}
          savedPromptVersion={savedPromptVersion}
          onSavedPromptVersionChange={setSavedPromptVersion}
          savedPrompts={savedPrompts}
          onSavePrompt={onSaveReusablePrompt}
          onLoadSavedPrompt={onLoadSavedPrompt}
          onDeleteSavedPrompt={onDeleteSavedPrompt}
          promptAssetFiles={promptAssetFiles}
          onLoadPromptAsset={loadPromptAsset}
          promptTestHistory={promptTestHistory}
          onLoadHistoryPrompt={onLoadHistoryPrompt}
          onClearPromptHistory={onClearPromptHistory}
          comparisonModelId={comparisonModelId}
          onComparisonModelIdChange={setComparisonModelId}
          comparisonPromptDraft={comparisonPromptDraft}
          onComparisonPromptDraftChange={setComparisonPromptDraft}
          useSamePromptForComparison={useSamePromptForComparison}
          onUseSamePromptForComparisonChange={setUseSamePromptForComparison}
          onPickComparisonModel={() => {
            setModelPickerTarget('comparison');
            setModelPickerOpen(true);
          }}
          onRunComparison={onRunComparison}
          comparisonRunning={comparisonRunning}
          comparisonResult={comparisonResult}
          canPickCatalogModel={providerHasModelCatalog(selectedProviderId)}
          onClose={() => setPromptTesterOpen(false)}
          onRun={onRunPromptTest}
          running={promptTestRunning}
          result={promptTestResult}
        />
      )}

      {evalRunnerOpen && (
        <EvalRunnerModal
          dataset={evalRunDraft}
          evalAssetFiles={evalAssetFiles}
          providerLabel={providerMeta.label}
          providerConfig={providerConfig}
          runtime={runtime}
          evalRunHistory={evalRunHistory}
          evalMode={evalMode}
          onEvalModeChange={setEvalMode}
          judgeModelId={judgeModelId}
          onJudgeModelIdChange={setJudgeModelId}
          onPickJudgeModel={() => {
            setModelPickerTarget('judge');
            setModelPickerOpen(true);
          }}
          canPickCatalogModel={providerHasModelCatalog(selectedProviderId)}
          onReviewCase={onReviewEvalCase}
          onCaseNoteChange={onCaseNoteChange}
          onToggleCaseEscalation={onToggleCaseEscalation}
          onSaveRun={onSaveEvalRun}
          onLoadEvalAsset={loadEvalAsset}
          loading={evalRunLoading}
          onClose={() => setEvalRunnerOpen(false)}
          onRun={onRunEvalSet}
          running={evalRunRunning}
          result={evalRunResult}
        />
      )}
    </>
  );
}
