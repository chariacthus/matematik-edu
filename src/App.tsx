import { useEffect } from 'react';
import { useRoute, navigate } from './lib/router';
import { useStore } from './state/store';
import { Layout } from './components/Layout';
import { Toast } from './components/ui';
import { achievementById } from './engine/gamification';
import { OnboardingPage } from './pages/Onboarding';
import { DiagnosticPage } from './pages/Diagnostic';
import { DashboardPage } from './pages/Dashboard';
import { LessonPage } from './pages/Lesson';
import { DomainPage, LibraryPage } from './pages/Library';
import { PracticePage, ReviewPage } from './pages/Practice';
import { ProfilePage } from './pages/Profile';
import { SettingsPage } from './pages/Settings';

export default function App() {
  const route = useRoute();
  const profile = useStore((s) => s.profile);
  const pendingBadges = useStore((s) => s.pendingBadges);
  const clearBadges = useStore((s) => s.clearBadges);

  // En elev der ikke er kommet gennem onboarding skal ikke kunne lande
  // på forsiden — den ville være tom og forvirrende.
  useEffect(() => {
    if (!profile.onboarded && route.name !== 'onboarding') {
      navigate({ name: 'onboarding' });
    }
  }, [profile.onboarded, route.name]);

  const page = (() => {
    if (!profile.onboarded) return <OnboardingPage />;
    switch (route.name) {
      case 'onboarding':
        return <OnboardingPage />;
      case 'diagnose':
        return <DiagnosticPage />;
      case 'lesson':
        return <LessonPage skillId={route.skillId} />;
      case 'library':
        return <LibraryPage />;
      case 'domain':
        return <DomainPage domainId={route.domainId} />;
      case 'practice':
        return <PracticePage />;
      case 'review':
        return <ReviewPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  })();

  return (
    <Layout route={route}>
      {page}

      {/* Badges vises som små notifikationer, så de ikke afbryder arbejdet */}
      {pendingBadges.length ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex flex-col items-center gap-2 px-4 sm:bottom-6">
          {pendingBadges.slice(0, 3).map((id) => {
            const a = achievementById(id);
            return a ? <Toast key={id} message={`${a.icon}  ${a.name} — ${a.description}`} onDone={clearBadges} /> : null;
          })}
        </div>
      ) : null}
    </Layout>
  );
}
