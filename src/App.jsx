import AppShell from './app-shell/AppShell';
import { LAUNCHLINE_APP_CONFIG } from './app-shell/navVariants';

export default function App() {
  return (
    <AppShell
      groups={LAUNCHLINE_APP_CONFIG.groups}
      standaloneItems={LAUNCHLINE_APP_CONFIG.standaloneItems}
      defaultActiveId={LAUNCHLINE_APP_CONFIG.defaultActiveId}
    />
  );
}
