import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cpu,
  FileText,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
} from 'lucide-react';
import LLMProviderControls from './LLMProviderControls';
import { SETTINGS_DEFAULT, useSettings } from '../../hooks/useSettings';

const T = {
  color: '#22d3ee',
  r: 'rgba(34,211,238,',
};

const cardStyle = {
  borderRadius: 12,
  padding: '14px 16px',
  border: '1px solid rgba(34,211,238,0.18)',
  background: 'rgba(34,211,238,0.04)',
};

const sectionCardStyle = {
  border: '1px solid rgba(34,211,238,0.15)',
  borderRadius: 12,
  background: 'rgba(10,15,26,0.5)',
  overflow: 'hidden',
};

const buttonStyle = {
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

const plannedOperatorGroups = [
  {
    title: 'Provider Expansion',
    items: [
      'Provider-specific capability probing',
      'Richer provider metadata and presets',
      'Side-by-side provider benchmarking',
    ],
  },
  {
    title: 'Prompt and Test Loop',
    items: [
      'Prompt asset previews and richer file inspection',
      'Prompt/version-aware saved prompt sets',
      'Compare runs across prompts and models',
      'Prompt history and result snapshots',
    ],
  },
  {
    title: 'Operational Maturity',
    items: [
      'Feature bindings editor',
      'Eval gates before rollout',
      'Richer observability and cost controls',
      'Human review and escalation workflows',
    ],
  },
];

function SmallPill({ children, tone = 'default' }) {
  const palette = tone === 'good'
    ? { bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.28)', color: '#4ade80' }
    : tone === 'warn'
      ? { bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.28)', color: '#fbbf24' }
      : { bg: `${T.r}0.08)`, border: `${T.r}0.22)`, color: T.color };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      border: `1px solid ${palette.border}`,
      background: palette.bg,
      color: palette.color,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>
      {children}
    </span>
  );
}

function CheckItem({ pass, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
      <span style={{ fontSize: 13, lineHeight: 1, color: pass ? '#4ade80' : '#f87171', flexShrink: 0 }}>
        {pass ? '✓' : '✗'}
      </span>
      <span style={{ fontSize: 11, color: pass ? 'var(--text-secondary)' : 'var(--text)' }}>{label}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingTop: 4 }}>
      <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>{text}</span>
    </div>
  );
}

function MissingSignalsTable({ rows, label = 'Expected signals not detected' }) {
  return (
    <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
        {label}
      </div>
      <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 220px) minmax(0, 1fr) 120px 180px', gap: 12, padding: '10px 12px', background: 'rgba(255,255,255,0.03)', fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          <div>Signal</div>
          <div>What Launchline Looked For</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {rows.map((row, index) => (
          <div
            key={row.label}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 220px) minmax(0, 1fr) 120px 180px',
              gap: 12,
              padding: '10px 12px',
              borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
              alignItems: 'start',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>{row.label}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{row.description}</div>
            <div>
              <SmallPill tone={row.status === 'detected' ? 'good' : row.status === 'not detected' ? 'warn' : 'default'}>
                {row.status || 'not detected'}
              </SmallPill>
            </div>
            <div>
              {row.actionLabel && row.onAction ? (
                <button
                  type="button"
                  onClick={row.onAction}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    borderRadius: 9,
                    border: `1px solid ${T.r}0.28)`,
                    background: 'rgba(34,211,238,0.08)',
                    color: T.color,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={12} />
                  {row.actionLabel}
                </button>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileChip({ children }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      maxWidth: '100%',
      padding: '4px 8px',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.03)',
      color: 'var(--text-secondary)',
      fontSize: 11,
      fontFamily: 'var(--font-mono)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function Collapsible({ title, icon: Icon, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={sectionCardStyle}>
      <div
        onClick={() => setOpen((value) => !value)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', cursor: 'pointer', userSelect: 'none' }}
      >
        {open ? (
          <ChevronDown size={13} style={{ color: `${T.r}0.55)`, flexShrink: 0 }} />
        ) : (
          <ChevronRight size={13} style={{ color: `${T.r}0.55)`, flexShrink: 0 }} />
        )}
        {Icon && <Icon size={13} color={T.color} style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: `${T.r}0.68)`, flex: 1 }}>
          {title}
        </span>
        {badge}
      </div>
      {open && <div style={{ padding: '4px 14px 16px' }}>{children}</div>}
    </div>
  );
}

function ScoreCard({ score }) {
  const { passed, total, checks } = score;
  const scoreColor = passed === total ? '#4ade80' : passed >= Math.max(1, total * 0.6) ? '#fbbf24' : '#f87171';
  const barWidth = total > 0 ? Math.round((passed / total) * 100) : 0;
  return (
    <div style={{ ...cardStyle, borderColor: passed === total ? 'rgba(74,222,128,0.25)' : 'rgba(34,211,238,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Sparkles size={14} style={{ color: T.color, flexShrink: 0 }} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.58)`, flex: 1 }}>
          LLM Operations Readiness
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{passed}/{total}</span>
      </div>
      <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.07)', marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barWidth}%`, borderRadius: 999, background: scoreColor, transition: 'width 0.35s ease' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
        {checks.map((check) => (
          <CheckItem key={check.id} pass={check.pass} label={check.label} />
        ))}
      </div>
    </div>
  );
}

function SummaryTile({ label, value, hint, tone = 'default' }) {
  const color = tone === 'good' ? '#4ade80' : tone === 'warn' ? '#fbbf24' : 'var(--text)';
  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{hint}</div>
    </div>
  );
}

function ProviderSection({ providers }) {
  const missingRows = [
    { label: 'OpenAI', description: 'OpenAI SDK dependencies, env vars such as OPENAI_API_KEY, or source calls to OpenAI responses/chat APIs.' },
    { label: 'Anthropic', description: 'Anthropic / Claude SDK usage, ANTHROPIC_API_KEY env vars, or Claude-related source integrations.' },
    { label: 'Gemini', description: 'Gemini / Google Generative AI dependencies, Google API key env vars, or Gemini source integrations.' },
    { label: 'Azure OpenAI', description: 'Azure OpenAI env/config values, Azure client usage, or Azure-specific OpenAI source references.' },
    { label: 'Groq', description: 'Groq SDK dependencies, GROQ_API_KEY env vars, or Groq-backed model calls in source.' },
    { label: 'Grok / xAI', description: 'xAI / Grok env vars, model ids, or source references to api.x.ai or Grok integrations.' },
    { label: 'Local Model Runner', description: 'Local runner signals like Ollama, vLLM, LM Studio, llama.cpp, or localhost model endpoints.' },
  ];
  return (
    <Collapsible
      title="Provider Integrations"
      icon={Cpu}
      badge={<SmallPill tone={providers.length > 0 ? 'good' : 'warn'}>{providers.length > 0 ? `${providers.length} found` : 'none found'}</SmallPill>}
    >
      {providers.length === 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <EmptyState text="No provider signals detected yet. Launchline looked for SDK dependencies, env references, and source integrations for common hosted and local model providers." />
          <MissingSignalsTable rows={missingRows} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {providers.map((provider) => (
            <div key={provider.id} style={{ ...cardStyle, padding: '12px 14px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{provider.label}</span>
                {provider.sources.map((source) => <SmallPill key={source}>{source}</SmallPill>)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Launchline detected this provider from {provider.sources.join(', ')} signals in the loaded workspace.
              </div>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

function PromptAssetsSection({ promptAssets, onTestPromptAsset, onCreatePromptDirectory, onRunChecks, promptDirectoryNotice, checking = false }) {
  const hasSignals = promptAssets.total > 0;
  const signalRows = [
    {
      label: 'Dedicated prompts directory',
      description: 'A clear repo folder like prompts/, system-prompts/, or prompt-templates/ that separates prompts from app code.',
      status: promptAssets.hasDedicatedPromptDir ? 'detected' : 'not detected',
      actionLabel: promptAssets.hasDedicatedPromptDir ? '' : 'Create prompts/',
      onAction: promptAssets.hasDedicatedPromptDir ? null : onCreatePromptDirectory,
    },
    {
      label: 'System prompt files',
      description: 'Files whose names suggest system prompts, instructions, or long-lived control prompts.',
      status: promptAssets.systemPromptFiles.length > 0 ? 'detected' : 'not detected',
    },
    {
      label: 'Versioned prompt files',
      description: 'Prompt files that explicitly carry version numbers or versioned naming patterns.',
      status: promptAssets.versionedFiles.length > 0 ? 'detected' : 'not detected',
    },
    {
      label: 'Templated prompts',
      description: 'Prompt files containing variables or template placeholders such as {{var}}, {var}, or <var>.',
      status: promptAssets.templatedFiles.length > 0 ? 'detected' : 'not detected',
    },
  ];
  return (
    <Collapsible
      title="Prompt Assets"
      icon={FileText}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onRunChecks} style={buttonStyle} disabled={checking}>
            <RefreshCw size={13} style={checking ? { animation: 'spin 1s linear infinite' } : undefined} />
            {checking ? 'Checking…' : 'Run Check'}
          </button>
        </div>
        {promptDirectoryNotice && (
          <div style={{
            ...cardStyle,
            background: promptDirectoryNotice.tone === 'good' ? 'rgba(74,222,128,0.05)' : 'rgba(248,113,113,0.04)',
            borderColor: promptDirectoryNotice.tone === 'good' ? 'rgba(74,222,128,0.24)' : 'rgba(248,113,113,0.24)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
          }}>
            {promptDirectoryNotice.tone === 'good'
              ? <CheckCircle2 size={14} color="#4ade80" style={{ flexShrink: 0, marginTop: 1 }} />
              : <AlertTriangle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />}
            <span style={{ fontSize: 12, color: promptDirectoryNotice.tone === 'good' ? '#4ade80' : '#f87171', lineHeight: 1.6 }}>
              {promptDirectoryNotice.message}
            </span>
          </div>
        )}
        <MissingSignalsTable rows={signalRows} label="Expected prompt signals" />
        {hasSignals && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <SummaryTile label="Prompt Files" value={promptAssets.total} hint="Named prompt or template files Launchline found in the workspace." tone="good" />
              <SummaryTile label="Dedicated Dirs" value={promptAssets.dedicatedDirs.length} hint="Folders that clearly separate prompts from app code." tone={promptAssets.hasDedicatedPromptDir ? 'good' : 'warn'} />
              <SummaryTile label="Versioned Prompts" value={promptAssets.versionedFiles.length} hint="Prompt files that look versioned or explicitly tracked." tone={promptAssets.versionedFiles.length > 0 ? 'good' : 'warn'} />
              <SummaryTile label="Templated Prompts" value={promptAssets.templatedFiles.length} hint="Prompt files with variable placeholders or templates." />
            </div>
            {promptAssets.files.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
                  Detected Files
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {promptAssets.files.map((file) => (
                    <div key={file} style={{ ...cardStyle, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <FileChip>{file}</FileChip>
                      </div>
                      <button type="button" onClick={() => onTestPromptAsset?.(file)} style={buttonStyle}>
                        <TestTube2 size={13} />
                        Test in Prompt Tester
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Collapsible>
  );
}

function EvalsSection({ evals, onRunEvalAsset }) {
  const datasetCount = evals.datasets.length;
  const goldenCount = evals.goldenOutputs.length;
  const regressionCount = evals.regressionSignals.length;
  const rubricCount = evals.rubricAssets.length;
  const judgeCount = evals.judgeAssets.length;
  const thresholdCount = evals.scoreThresholdSignals.length;
  const totalSignals = datasetCount + goldenCount + regressionCount + rubricCount + judgeCount + thresholdCount + evals.promptTests.length;

  const sections = [
    {
      title: 'Eval Datasets',
      count: datasetCount,
      hint: 'Prompt cases, fixtures, benchmark inputs, or labeled samples that can be rerun as a repeatable test set.',
      items: evals.datasets,
    },
    {
      title: 'Golden Outputs',
      count: goldenCount,
      hint: 'Reference answers or approved snapshots that give Launchline something concrete to compare against.',
      items: evals.goldenOutputs,
    },
    {
      title: 'Regression Scripts',
      count: regressionCount,
      hint: 'Scripts or workflows that look like prompt-quality, benchmark, or quality-gate checks.',
      items: evals.regressionSignals,
    },
    {
      title: 'Rubrics and Scorecards',
      count: rubricCount,
      hint: 'Files that suggest the team scores outputs with explicit criteria instead of informal spot checks.',
      items: evals.rubricAssets,
    },
    {
      title: 'Judge-Based Assets',
      count: judgeCount,
      hint: 'Signals that an LLM, grader, or pairwise comparison flow is being used to score outputs.',
      items: evals.judgeAssets,
    },
    {
      title: 'Thresholds and Gates',
      count: thresholdCount,
      hint: 'Configured pass/fail or score thresholds that indicate the repo has some quality bar before rollout.',
      items: evals.scoreThresholdSignals,
    },
  ];
  const missingRows = [
    { label: 'Eval datasets', description: 'Rerunnable prompt cases, fixtures, or benchmark inputs that Launchline can treat as a repeatable test set.' },
    { label: 'Golden outputs', description: 'Expected / approved answers or snapshots that a run can compare against.' },
    { label: 'Regression scripts', description: 'Scripts or workflows that look like quality gates, benchmark runs, or eval automation.' },
    { label: 'Rubric assets', description: 'Rubrics, criteria, or scorecards that define how open-ended outputs should be judged.' },
    { label: 'Judge-based assets', description: 'Judge-model prompts, grader flows, or pairwise comparison assets for automated grading.' },
    { label: 'Thresholds and gates', description: 'Configured pass-rate or score thresholds that act as rollout or release quality bars.' },
  ];

  return (
    <Collapsible
      title="Evaluation / Evals"
      icon={Activity}
      badge={<SmallPill tone={totalSignals > 0 ? 'good' : 'warn'}>{totalSignals > 0 ? `${totalSignals} signals` : 'no signals'}</SmallPill>}
      defaultOpen={totalSignals > 0}
    >
      {totalSignals === 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <EmptyState text="No evaluation discipline signals were detected yet. Launchline looked for rerunnable datasets, golden outputs, regression scripts, rubric-driven scoring, judge-based grading, and rollout thresholds." />
          <MissingSignalsTable rows={missingRows} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <SummaryTile label="Datasets" value={datasetCount} hint="Rerunnable eval inputs and benchmark cases." tone={datasetCount > 0 ? 'good' : 'warn'} />
            <SummaryTile label="Golden Outputs" value={goldenCount} hint="Reference outputs or approved snapshots." tone={goldenCount > 0 ? 'good' : 'warn'} />
            <SummaryTile label="Regression Scripts" value={regressionCount} hint="Files that look like quality-gate or benchmark runs." tone={regressionCount > 0 ? 'good' : 'warn'} />
            <SummaryTile label="Judge or Rubric" value={rubricCount + judgeCount} hint="Structured grading assets for less deterministic tasks." tone={(rubricCount + judgeCount) > 0 ? 'good' : 'warn'} />
          </div>
          {evals.promptTests.length > 0 && (
            <div style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 8 }}>
                Prompt Test Files
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
                These files look like prompt-specific tests or eval harnesses already living in the workspace.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {evals.promptTests.map((item) => <FileChip key={item}>{item}</FileChip>)}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gap: 12 }}>
            {sections.map((section) => (
              <div key={section.title} style={{ ...cardStyle, padding: '12px 14px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
                    {section.title}
                  </span>
                  <SmallPill tone={section.count > 0 ? 'good' : 'warn'}>{section.count}</SmallPill>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: section.items.length > 0 ? 10 : 0 }}>
                  {section.hint}
                </div>
                {section.items.length > 0 ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {section.items.map((item) => (
                      <div key={`${section.title}-${item}`} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <FileChip>{item}</FileChip>
                        {section.title === 'Eval Datasets' && (
                          <button type="button" onClick={() => onRunEvalAsset?.(item)} style={buttonStyle}>
                            <TestTube2 size={13} />
                            Run Eval Set
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No strong signals detected in this category yet.</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Collapsible>
  );
}

function MultiSignalSection({ title, icon: Icon, groups, emptyText, badgeLabel }) {
  const totalSignals = groups.reduce((sum, group) => sum + group.items.length, 0);
  return (
    <Collapsible
      title={title}
      icon={Icon}
      badge={<SmallPill tone={totalSignals > 0 ? 'good' : 'warn'}>{badgeLabel(totalSignals)}</SmallPill>}
      defaultOpen={totalSignals > 0}
    >
      {totalSignals === 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <EmptyState text={emptyText} />
          <MissingSignalsTable
            rows={groups.map((group) => ({
              label: group.title,
              description: `Launchline did not detect signals for ${group.title.toLowerCase()} in the current workspace.`,
            }))}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {groups.map((group) => (
            <div key={group.title} style={{ ...cardStyle, padding: '12px 14px', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)` }}>
                  {group.title}
                </span>
                <SmallPill tone={group.items.length > 0 ? 'good' : 'warn'}>{group.items.length}</SmallPill>
              </div>
              {group.items.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No signals detected.</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {group.items.map((item) => <FileChip key={`${group.title}-${item}`}>{item}</FileChip>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

function FeatureBindingsSection({ featureBindings }) {
  const missingRows = [
    { label: 'Chat / Assistant', description: 'A feature or workflow in source that looks like a model-backed chat or assistant surface.' },
    { label: 'Summarization', description: 'Signals that the app asks a model to summarize content or state.' },
    { label: 'Extraction', description: 'Signals for structured extraction, parsing, or form-filling from model outputs.' },
    { label: 'Classification', description: 'LLM-backed labeling, routing, or classification features in app workflows.' },
    { label: 'Search / RAG', description: 'Feature-level RAG or semantic search workflows wired into product behavior.' },
    { label: 'Recommendations', description: 'Suggestion, recommendation, or guidance features backed by model calls.' },
    { label: 'Agents / Tools', description: 'Tool-calling or agent-style product capabilities exposed in the workspace.' },
    { label: 'Evaluation Workflows', description: 'In-product or scripted eval workflows connected to the app’s LLM behavior.' },
  ];
  return (
    <Collapsible
      title="Feature Bindings"
      icon={Sparkles}
      badge={<SmallPill tone={featureBindings.length > 0 ? 'good' : 'warn'}>{featureBindings.length > 0 ? `${featureBindings.length} mapped` : 'none mapped'}</SmallPill>}
      defaultOpen={featureBindings.length > 0}
    >
      {featureBindings.length === 0 ? (
        <div style={{ display: 'grid', gap: 12 }}>
          <EmptyState text="Launchline did not find strong feature-to-LLM bindings yet. As this page evolves, it will map model usage to concrete product capabilities inside the workspace." />
          <MissingSignalsTable rows={missingRows} />
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {featureBindings.map((binding) => (
            <div key={binding.id} style={{ ...cardStyle, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', display: 'grid', gap: 7 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{binding.label}</span>
                <SmallPill tone="good">detected</SmallPill>
              </div>
              <FileChip>{binding.file}</FileChip>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  );
}

function PlannedFeaturesSection() {
  return (
    <div style={sectionCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px' }}>
        <Sparkles size={13} color={T.color} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: `${T.r}0.68)`, flex: 1 }}>
          Next Build Targets
        </span>
        <SmallPill>planned</SmallPill>
      </div>
      <div style={{ padding: '4px 14px 16px', display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          This pass adds provider configuration, session-only API keys, live connection testing for supported providers, and an OpenAI model picker. The next iterations can deepen provider support, prompt testing, and rollout controls.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {plannedOperatorGroups.map((group) => (
            <div key={group.title} style={{ ...cardStyle, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: `${T.r}0.55)`, marginBottom: 10 }}>
                {group.title}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {group.items.map((item) => (
                  <div key={item} style={{ display: 'grid', gridTemplateColumns: '14px minmax(0, 1fr)', gap: 8 }}>
                    <CheckCircle2 size={12} color={T.color} style={{ marginTop: 2 }} />
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{item}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LLMOperationsTab() {
  const { settings } = useSettings();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [promptAssetRequest, setPromptAssetRequest] = useState(null);
  const [evalRunRequest, setEvalRunRequest] = useState(null);
  const [promptDirectoryNotice, setPromptDirectoryNotice] = useState(null);

  const loadStatus = useCallback(async ({ silent = false } = {}) => {
    if (!window.electronAPI?.llmOpsStatus) {
      setError('LLM Operations is unavailable in this build.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (silent) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.llmOpsStatus();
      if (!result?.ok) throw new Error(result?.error || 'Failed to scan LLM operations status.');
      setStatus(result);
    } catch (err) {
      setError(err.message || 'Failed to scan LLM operations status.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (!window.electronAPI?.onWorkspaceChanged) return undefined;
    return window.electronAPI.onWorkspaceChanged(() => {
      setPromptDirectoryNotice(null);
      loadStatus({ silent: true });
    });
  }, [loadStatus]);

  const onCreatePromptDirectory = useCallback(async () => {
    if (!window.electronAPI?.llmOpsCreatePromptsDir) {
      setPromptDirectoryNotice({ tone: 'danger', message: 'Creating prompt directories is unavailable in this build.' });
      return;
    }

    try {
      const result = await window.electronAPI.llmOpsCreatePromptsDir();
      if (!result?.ok) {
        setPromptDirectoryNotice({ tone: 'danger', message: result?.error || 'Unable to create prompts/ directory.' });
        return;
      }
      setPromptDirectoryNotice({ tone: 'good', message: result.message || 'Created prompts/ in the loaded workspace.' });
      await loadStatus({ silent: true });
    } catch (err) {
      setPromptDirectoryNotice({ tone: 'danger', message: err.message || 'Unable to create prompts/ directory.' });
    }
  }, [loadStatus]);

  if (loading && !status) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: 320, color: 'var(--text-secondary)', gap: 12 }}>
        <RefreshCw size={18} style={{ color: T.color, animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 13 }}>Scanning LLM operations posture…</div>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div style={{ ...cardStyle, borderColor: 'rgba(248,113,113,0.25)', background: 'rgba(248,113,113,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <AlertTriangle size={15} color="#f87171" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>LLM Operations scan failed</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{error}</div>
        <button type="button" onClick={() => loadStatus()} style={buttonStyle}>
          <RefreshCw size={13} />
          Try again
        </button>
      </div>
    );
  }

  const providerCount = status?.providers?.length || 0;
  const promptCount = status?.promptAssets?.total || 0;
  const evalCount = [
    ...(status?.evals?.datasets || []),
    ...(status?.evals?.goldenOutputs || []),
    ...(status?.evals?.regressionSignals || []),
    ...(status?.evals?.rubricAssets || []),
    ...(status?.evals?.judgeAssets || []),
    ...(status?.evals?.scoreThresholdSignals || []),
    ...(status?.evals?.promptTests || []),
  ].filter((value, index, array) => array.indexOf(value) === index).length;
  const bindingCount = status?.featureBindings?.length || 0;
  const llmSettings = settings?.llmOperations || SETTINGS_DEFAULT.llmOperations;
  const selectedProviderId = llmSettings.selectedProviderId || SETTINGS_DEFAULT.llmOperations.selectedProviderId;
  const configuredProvider = llmSettings.providers?.[selectedProviderId] || SETTINGS_DEFAULT.llmOperations.providers[selectedProviderId];
  const lastValidation = configuredProvider?.lastValidation || null;
  const operatorSummary = {
    providerLabel: configuredProvider?.label || selectedProviderId,
    modelId: configuredProvider?.modelId || 'No model selected',
    savedPrompts: llmSettings.savedPrompts?.length || 0,
    promptRuns: llmSettings.promptTestHistory?.length || 0,
    evalRuns: llmSettings.evalRunHistory?.length || 0,
    validationLabel: lastValidation
      ? (lastValidation.ok ? 'Connected' : 'Failed')
      : 'Not tested',
    validationTone: lastValidation
      ? (lastValidation.ok ? 'good' : 'warn')
      : 'warn',
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', background: `${T.r}0.12)`, border: `1px solid ${T.r}0.24)` }}>
            <Sparkles size={16} color={T.color} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>LLM Operations</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Preliminary workspace scanner for providers, prompt assets, evals, guardrails, retrieval, and LLM runtime discipline.
            </div>
          </div>
        </div>
        <button type="button" onClick={() => loadStatus({ silent: true })} style={buttonStyle} disabled={refreshing}>
          <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
          {refreshing ? 'Refreshing…' : 'Run Scan'}
        </button>
      </div>

      {error && (
        <div style={{ ...cardStyle, borderColor: 'rgba(248,113,113,0.24)', background: 'rgba(248,113,113,0.04)', color: '#f87171', fontSize: 12 }}>
          {error}
        </div>
      )}

      <div style={{ ...sectionCardStyle, padding: '14px 16px', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, display: 'grid', placeItems: 'center', background: `${T.r}0.12)`, border: `1px solid ${T.r}0.24)` }}>
            <Cpu size={15} color={T.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>LLM Controls / Operations</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Configure providers, choose models, test prompts, run eval sets, and inspect recent operator activity independently of what the current repo does or does not contain.
            </div>
          </div>
          <SmallPill tone={operatorSummary.validationTone}>{operatorSummary.validationLabel}</SmallPill>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <SummaryTile label="Configured Provider" value={operatorSummary.providerLabel} hint="The provider currently selected in Launchline settings." tone="good" />
          <SummaryTile label="Selected Model" value={operatorSummary.modelId} hint="The active model for prompt tests and eval runs." />
          <SummaryTile label="Saved Prompts" value={operatorSummary.savedPrompts} hint="Reusable prompt entries saved inside Launchline." tone={operatorSummary.savedPrompts > 0 ? 'good' : 'warn'} />
          <SummaryTile label="Prompt Test Runs" value={operatorSummary.promptRuns} hint="Recent prompt tests captured in Launchline history." tone={operatorSummary.promptRuns > 0 ? 'good' : 'warn'} />
          <SummaryTile label="Eval Runs" value={operatorSummary.evalRuns} hint="Saved eval summaries captured from the manual eval runner." tone={operatorSummary.evalRuns > 0 ? 'good' : 'warn'} />
        </div>

        <LLMProviderControls
          onConnectionError={setError}
          promptAssetFiles={status.promptAssets?.files || []}
          evalAssetFiles={status.evals?.datasets || []}
          promptAssetRequest={promptAssetRequest}
          evalRunRequest={evalRunRequest}
          onPromptAssetRequestHandled={(requestKey) => {
            setPromptAssetRequest((current) => (current?.key === requestKey ? null : current));
          }}
          onEvalRunRequestHandled={(requestKey) => {
            setEvalRunRequest((current) => (current?.key === requestKey ? null : current));
          }}
        />
      </div>

      <div style={{ ...sectionCardStyle, padding: '14px 16px', display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Search size={15} color={T.color} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>Workspace Signals</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              These sections only light up when Launchline finds LLM-related files, configs, prompts, eval assets, or feature bindings inside the currently loaded workspace.
            </div>
          </div>
          <button type="button" onClick={() => loadStatus({ silent: true })} style={buttonStyle} disabled={refreshing}>
            <RefreshCw size={13} style={refreshing ? { animation: 'spin 1s linear infinite' } : undefined} />
            {refreshing ? 'Refreshing…' : 'Run Scan'}
          </button>
        </div>

        <ScoreCard score={status.score} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          <SummaryTile label="Providers" value={providerCount} hint="Hosted or local model providers detected in the workspace." tone={providerCount > 0 ? 'good' : 'warn'} />
          <SummaryTile label="Prompt Assets" value={promptCount} hint="Prompt and template files identified from repo structure." tone={promptCount > 0 ? 'good' : 'warn'} />
          <SummaryTile label="Eval Signals" value={evalCount} hint="Eval, benchmark, or regression signals found in the workspace." tone={evalCount > 0 ? 'good' : 'warn'} />
          <SummaryTile label="Feature Bindings" value={bindingCount} hint="Likely app features already wired to model-backed behavior." tone={bindingCount > 0 ? 'good' : 'warn'} />
        </div>
      </div>

      <ProviderSection providers={status.providers} />
      <PromptAssetsSection
        promptAssets={status.promptAssets}
        onTestPromptAsset={(relativePath) => {
          setPromptAssetRequest({ key: `${relativePath}-${Date.now()}`, relativePath });
        }}
        onCreatePromptDirectory={onCreatePromptDirectory}
        onRunChecks={() => loadStatus({ silent: true })}
        checking={refreshing}
        promptDirectoryNotice={promptDirectoryNotice}
      />

      <EvalsSection
        evals={status.evals}
        onRunEvalAsset={(relativePath) => {
          setEvalRunRequest({ key: `${relativePath}-${Date.now()}`, relativePath });
        }}
      />

      <MultiSignalSection
        title="Guardrails and Structured Outputs"
        icon={Shield}
        groups={[
          { title: 'Moderation', items: status.guardrails.moderation },
          { title: 'Structured Outputs', items: status.guardrails.structuredOutputs },
          { title: 'Output Validation', items: status.guardrails.outputValidation },
          { title: 'Prompt Injection Handling', items: status.guardrails.promptInjectionHandling },
          { title: 'Retry or Fallback', items: status.guardrails.retryOrFallback },
        ]}
        emptyText="No strong guardrail signals were detected. This page will eventually help track moderation, schema-constrained outputs, output validation, and fallback behavior."
        badgeLabel={(count) => count > 0 ? `${count} signals` : 'no signals'}
      />

      <MultiSignalSection
        title="Retrieval and Context Operations"
        icon={Search}
        groups={[
          { title: 'Vector Stores', items: status.retrieval.vectorStores },
          { title: 'Embedding Signals', items: status.retrieval.embeddingSignals },
          { title: 'Chunking Signals', items: status.retrieval.chunkingSignals },
          { title: 'Citation Signals', items: status.retrieval.citationSignals },
          { title: 'Retrieval Tests', items: status.retrieval.retrievalTests },
        ]}
        emptyText="No retrieval or RAG discipline signals were detected. Launchline will use this section to show whether context injection appears intentional and testable."
        badgeLabel={(count) => count > 0 ? `${count} signals` : 'no signals'}
      />

      <MultiSignalSection
        title="Observability and Usage Controls"
        icon={Activity}
        groups={[
          { title: 'Token Usage', items: status.observability.tokenUsage },
          { title: 'Cost Tracking', items: status.observability.costTracking },
          { title: 'Tracing', items: status.observability.tracing },
          { title: 'Metadata Logging', items: status.observability.metadataLogging },
          { title: 'Feedback Signals', items: status.observability.feedback },
        ]}
        emptyText="No strong usage or observability signals were detected. This section tracks whether the repo can explain LLM cost, latency, token consumption, and debugging context."
        badgeLabel={(count) => count > 0 ? `${count} signals` : 'no signals'}
      />

      <FeatureBindingsSection featureBindings={status.featureBindings} />
      <PlannedFeaturesSection />
    </div>
  );
}
