import { useState } from 'react';
import {
  Activity, Box, Database, FileText, GitBranch,
  Lock, Shield, Cpu, LifeBuoy,
} from 'lucide-react';
import TabBar from '../components/TabBar';
import SecretsPage from './SecretsPage';
import ContainerizationTab from './production/ContainerizationTab';
import CICDTab from './production/CICDTab';
import MonitoringTab from './production/MonitoringTab';
import DataVersioningTab from './production/DataVersioningTab';
import ModelRegistryTab from './production/ModelRegistryTab';
import DisasterRecoveryTab from './production/DisasterRecoveryTab';
import AuditLoggingTab from './production/AuditLoggingTab';
import AccessControlTab from './production/AccessControlTab';

// ─── Placeholder tab ─────────────────────────────────────────────────────────

const PLACEHOLDERS = {
  containerization: {
    icon: Box,
    title: 'Containerization',
    description: 'Manage Docker images, Compose files, and Kubernetes manifests for reproducible, portable deployments.',
    planned: [
      'Dockerfile linting and best-practice checks (non-root user, layer caching, image size)',
      'Docker Compose service health — port conflicts, missing env vars, volume mounts',
      'Kubernetes manifest validation — resource limits, liveness probes, secret references',
      'Image tag audit — flag use of :latest in production manifests',
      'Multi-stage build analysis and layer diff viewer',
    ],
  },
  cicd: {
    icon: GitBranch,
    title: 'CI/CD Pipeline',
    description: 'Inspect and improve your continuous integration and delivery workflows across GitHub Actions, GitLab CI, and other providers.',
    planned: [
      'Workflow file linter — missing timeouts, unpinned actions, wide permissions',
      'Pipeline coverage map — which branches and environments have CI protection',
      'Secret usage audit — cross-reference pipeline secrets against .env.example',
      'Deployment frequency and lead time metrics from git history',
      'Branch protection rule checker (requires GitHub API token)',
    ],
  },
  monitoring: {
    icon: Activity,
    title: 'Monitoring',
    description: 'Track observability setup across your stack — logging, metrics, tracing, and alerting configurations.',
    planned: [
      'Logging library detection — Winston, Pino, structlog, loguru, etc.',
      'OpenTelemetry / tracing SDK presence check',
      'Alert rule coverage — Prometheus rules, Datadog monitors, PagerDuty integrations',
      'Health endpoint detection — /health, /readyz, /livez route scanning',
      'Error tracking integration check — Sentry, Rollbar, Bugsnag',
    ],
  },
  dataVersioning: {
    icon: Database,
    title: 'Data Versioning',
    description: 'Audit data lineage and versioning tools for ML pipelines, training datasets, and feature stores.',
    planned: [
      'DVC configuration detection and remote storage audit',
      'Delta Lake / Iceberg table schema presence check',
      'Feature store integration scan — Feast, Tecton, Hopsworks',
      'Dataset provenance report — training data files tracked vs. untracked',
      'Data contract validation — schema drift detection across pipeline stages',
    ],
  },
  modelRegistry: {
    icon: Cpu,
    title: 'Model Registry',
    description: 'Track ML model versions, experiment metadata, and deployment lineage across your project.',
    planned: [
      'MLflow tracking server and model registry detection',
      'Weights & Biases project configuration check',
      'Model artifact audit — detect large .pkl, .pt, .onnx files checked into git',
      'Experiment reproducibility check — pinned seeds, environment snapshots',
      'Model card presence detection for documented models',
    ],
  },
  accessControl: {
    icon: Lock,
    title: 'Access Control',
    description: 'Review authentication, authorization, and role-based access configurations across your services.',
    planned: [
      'RBAC definition file scan — Kubernetes ClusterRole, Casbin policies, OPA rules',
      'OAuth / OIDC configuration audit — redirect URIs, scopes, token expiry',
      'API key permission scope review — detect overly-broad keys in .env',
      'Service account inventory — detect default or shared service accounts',
      'Zero-trust posture check — mTLS, network policy, service mesh detection',
    ],
  },
  auditLogging: {
    icon: FileText,
    title: 'Audit Logging',
    description: 'Verify that user actions, data mutations, and system events are captured and retained for compliance.',
    planned: [
      'Audit logger library detection — structured log output vs. raw console.log',
      'Sensitive operation coverage — detect DB writes/deletes without audit trail',
      'Log retention policy file check — cloud logging config, Loki rules',
      'PII in logs scanner — flag patterns that may log personal data',
      'Compliance framework mapping — align log coverage against SOC 2, GDPR requirements',
    ],
  },
  disasterRecovery: {
    icon: LifeBuoy,
    title: 'Disaster Recovery',
    description: 'Assess backup strategies, recovery time objectives, and failover configurations for critical data and services.',
    planned: [
      'Backup configuration detection — pg_dump scripts, S3 lifecycle rules, Velero',
      'RTO / RPO documentation check — recover time objectives defined in runbooks',
      'Runbook presence scan — detect RUNBOOK.md, incident response docs',
      'Multi-region / failover configuration detection',
      'Chaos engineering tooling detection — Chaos Monkey, Litmus, Gremlin',
    ],
  },
};

function PlaceholderTab({ tabKey }) {
  const cfg = PLACEHOLDERS[tabKey];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <div style={{ padding: '0 2px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 16,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 20,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 'var(--radius-md)',
          background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={20} color="var(--primary)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {cfg.title}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', padding: '2px 8px',
              borderRadius: 20, border: '1px solid var(--border)',
              color: 'var(--text-muted)', background: 'var(--bg)',
            }}>
              In Development
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            {cfg.description}
          </p>
        </div>
      </div>

      {/* Planned features */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px 24px',
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 14,
        }}>
          Planned features
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cfg.planned.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{
                width: 5, height: 5, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                background: 'var(--primary)', opacity: 0.5,
              }} />
              <span style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.55 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'secrets',          label: 'Secrets',          icon: Shield    },
  { id: 'containerization', label: 'Containerization',  icon: Box       },
  { id: 'cicd',             label: 'CI/CD Pipeline',    icon: GitBranch },
  { id: 'monitoring',       label: 'Monitoring',        icon: Activity  },
  { id: 'dataVersioning',   label: 'Data Versioning',   icon: Database  },
  { id: 'modelRegistry',    label: 'Model Registry',    icon: Cpu       },
  { id: 'accessControl',    label: 'Access Control',    icon: Lock      },
  { id: 'auditLogging',     label: 'Audit Logging',     icon: FileText  },
  { id: 'disasterRecovery', label: 'Disaster Recovery', icon: LifeBuoy  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductionPage() {
  const [activeTab, setActiveTab] = useState('secrets');

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto' }}>
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'secrets'          && <SecretsPage embedded />}
      {activeTab === 'containerization' && <ContainerizationTab />}
      {activeTab === 'cicd'             && <CICDTab />}
      {activeTab === 'monitoring'       && <MonitoringTab />}
      {activeTab === 'dataVersioning'   && <DataVersioningTab />}
      {activeTab === 'modelRegistry'    && <ModelRegistryTab />}
      {activeTab === 'disasterRecovery' && <DisasterRecoveryTab />}
      {activeTab === 'auditLogging'     && <AuditLoggingTab />}
      {activeTab === 'accessControl'    && <AccessControlTab />}
      {!['secrets','containerization','cicd','monitoring','dataVersioning','modelRegistry','disasterRecovery','auditLogging','accessControl'].includes(activeTab) && <PlaceholderTab tabKey={activeTab} />}
    </div>
  );
}
