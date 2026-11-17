import {
  Crosshair,
  HeartPulse,
  Navigation,
  Shield,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { TacticalCalloutId } from '../types/squadshield';

export function TacticalIcon({
  id,
  className = 'w-4 h-4',
}: {
  id: TacticalCalloutId;
  className?: string;
}) {
  switch (id) {
    case 'enemy-spotted':
      return <Crosshair className={className} />;
    case 'need-backup':
      return <ShieldAlert className={className} />;
    case 'move-to-b':
      return <Navigation className={className} />;
    case 'regroup':
      return <Users className={className} />;
    case 'defend-position':
      return <Shield className={className} />;
    case 'healing-needed':
      return <HeartPulse className={className} />;
    default:
      return <Shield className={className} />;
  }
}
