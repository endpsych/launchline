import { Activity, Archive, Box, Cpu, FileText, GitBranch, LifeBuoy, Lock, Shield, Sparkles } from 'lucide-react';

import PythonTools from '../pages/PythonTools';
import SecretsPage from '../pages/SecretsPage';
import CICDPage from '../pages/CICDPage';
import LLMOperationsPage from '../pages/LLMOperationsPage';
import AccessControlPage from '../pages/AccessControlPage';
import AuditLoggingPage from '../pages/AuditLoggingPage';
import DisasterRecoveryPage from '../pages/DisasterRecoveryPage';
import MonitoringPage from '../pages/MonitoringPage';
import ContainerizationPage from '../pages/ContainerizationPage';
import DataVersioningPage from '../pages/DataVersioningPage';
import ModelRegistryPage from '../pages/ModelRegistryPage';

function PythonIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 3h4.5A3.5 3.5 0 0 1 17 6.5V9H9.5A2.5 2.5 0 0 0 7 11.5v1A2.5 2.5 0 0 1 4.5 15H3V8.5A5.5 5.5 0 0 1 8.5 3H9Z" />
      <path d="M15 21h-4.5A3.5 3.5 0 0 1 7 17.5V15h7.5a2.5 2.5 0 0 0 2.5-2.5v-1A2.5 2.5 0 0 1 19.5 9H21v6.5A5.5 5.5 0 0 1 15.5 21H15Z" />
      <circle cx="13.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M7 9h8" />
      <path d="M9 15h8" />
    </svg>
  );
}

export const LAUNCHLINE_APP_CONFIG = {
  groups: [],
  standaloneItems: [
    { id: 'python-tools',  label: 'Python',     icon: PythonIcon, page: PythonTools,   subtitle: 'uv-first Python capability center' },
    { id: 'secrets',       label: 'Secrets',    icon: Shield,     page: SecretsPage,   subtitle: 'Secrets hygiene and environment file checks' },
    { id: 'cicd',          label: 'CI/CD',      icon: GitBranch,  page: CICDPage,      subtitle: 'Pipelines, workflows, and delivery checks' },
    { id: 'llm-operations', label: 'LLMOps', icon: Sparkles, page: LLMOperationsPage, subtitle: 'Providers, prompts, evals, and model operations posture' },
    { id: 'access-control', label: 'Access Control', icon: Lock,  page: AccessControlPage, subtitle: 'Authentication, authorization, and RBAC review' },
    { id: 'audit-logging', label: 'Audit Logging', icon: FileText, page: AuditLoggingPage, subtitle: 'Traceability, audit trails, and retention posture' },
    { id: 'disaster-recovery', label: 'Disaster Recovery', icon: LifeBuoy, page: DisasterRecoveryPage, subtitle: 'Backups, runbooks, failover, and recovery posture' },
    { id: 'monitoring',    label: 'Monitoring', icon: Activity, page: MonitoringPage, subtitle: 'Logging, metrics, tracing, and alerting posture' },
    { id: 'containerization', label: 'Containerization', icon: Box, page: ContainerizationPage, subtitle: 'Docker, Compose, and Kubernetes posture' },
    { id: 'data-versioning', label: 'Data Versioning', icon: Archive, page: DataVersioningPage, subtitle: 'DVC, data assets, schemas, and reproducibility posture' },
    { id: 'model-registry', label: 'Model Registry', icon: Cpu, page: ModelRegistryPage, subtitle: 'Experiment tracking, model artifacts, and registry posture' },
  ],
  defaultActiveId: 'python-tools',
};
