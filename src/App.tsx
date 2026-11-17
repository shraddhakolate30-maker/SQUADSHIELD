/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WorkspaceShell } from './components/WorkspaceShell';
import { SquadShieldProvider, useSquadShield } from './context/SquadShieldContext';
import { DashboardScreen } from './screens/DashboardScreen';
import { LandingScreen } from './screens/LandingScreen';
import { ModeratorScreen } from './screens/ModeratorScreen';
import { SafetyScreen } from './screens/SafetyScreen';
import { SmartModerationScreen } from './screens/SmartModerationScreen';
import { SquadChatScreen } from './screens/SquadChatScreen';

function SquadShieldRouter() {
  const { activeScreen } = useSquadShield();

  if (activeScreen === 'landing') {
    return <LandingScreen />;
  }

  return (
    <WorkspaceShell>
      {activeScreen === 'dashboard' && <DashboardScreen />}
      {activeScreen === 'chat' && <SquadChatScreen />}
      {activeScreen === 'moderation' && <SmartModerationScreen />}
      {activeScreen === 'moderator' && <ModeratorScreen />}
      {activeScreen === 'safety' && <SafetyScreen />}
    </WorkspaceShell>
  );
}

export default function App() {
  return (
    <SquadShieldProvider>
      <SquadShieldRouter />
    </SquadShieldProvider>
  );
}
