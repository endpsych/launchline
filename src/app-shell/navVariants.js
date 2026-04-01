import { FileCode2, Rocket } from 'lucide-react';

import PythonTools from '../pages/PythonTools';
import ProductionPage from '../pages/ProductionPage';

export const LAUNCHLINE_APP_CONFIG = {
  groups: [],
  standaloneItems: [
    { id: 'python-tools',  label: 'Python Tools', icon: FileCode2, page: PythonTools,    subtitle: 'uv-first Python capability center' },
    { id: 'production',    label: 'Production',   icon: Rocket,    page: ProductionPage, subtitle: 'Secrets, CI/CD, monitoring & deployment' },
  ],
  defaultActiveId: 'python-tools',
};
