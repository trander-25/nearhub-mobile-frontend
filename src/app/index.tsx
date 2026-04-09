import { DiscoverScreen, OrganizerScreen } from '@/screens';
import { useAuth } from '@/contexts/AuthContext';
import { isOrganizerRole } from '@/utils/role';

export default function HomeScreen() {
  const { user } = useAuth();
  if (isOrganizerRole(user?.role)) {
    return <OrganizerScreen initialTab="overview" hideSegmentControl />;
  }
  return <DiscoverScreen />;
}
