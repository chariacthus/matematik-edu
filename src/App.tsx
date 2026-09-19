import { useEffect } from 'react';
import { useRoute, navigate } from './lib/router';
import { useStore } from './state/store';
import { Layout } from './components/Layout';
import { LevelUpBanner, Toast } from './components/ui';
import { achievementById, levelTitle } from './engine/gamification';
import { OnboardingPage } from './pages/Onboarding';
import { DiagnosticPage } from './pages/Diagnostic';
import { DashboardPage } from './pages/Dashboard';
import { LessonPage } from './pages/Lesson';
import { DomainPage, LibraryPage } from './pages/Library';
import { PracticePage, ReviewPage } from './pages/Practice';
import { ExamPage } from './pages/Exam';
import { ProfilePage } from './pages/Profile';
import { SettingsPage } from './pages/Settings';

function BadgeToast({ id, onDone }: { id: string | undefined; onDone: () => void }) {
  const badge = id ? achievementById(id) : undefined;
  if (!badge) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 sm:bottom-6">
      <button onClick={onDone} className="pointer-events-auto max-w-sm" aria-label="Luk besked">
        <Toast key={id} message={badge.name} icon={badge.icon} onDone={onDone} />
      </button>
    </div>
  );
}

export default function App() {
  const route = useRoute();
  const profile = useStore((s) => s.profile);
  const pendingBadges = useStore((s) => s.pendingBadges);
  const dismissBadge = useStore((s) => s.dismissBadge);
  const pendingLevelUp = useStore((s) => s.pendingLevelUp);
  const clearLevelUp = useStore((s) => s.clearLevelUp);

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
      case 'exam':
        return <ExamPage />;
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

      {/* Ét badge ad gangen, nederst og over menuen. Tre bannere på én
          gang dækkede indholdet - og det man lige har præsteret er ikke
          vigtigere end det man er i gang med at læse. */}
      {/* Niveauskift fylder mere end et badge og vises derfor øverst. */}
      {pendingLevelUp !== null ? (
        <LevelUpBanner level={pendingLevelUp} title={levelTitle(pendingLevelUp)} onDone={clearLevelUp} />
      ) : null}

      <BadgeToast id={pendingBadges[0]} onDone={dismissBadge} />
    </Layout>
  );
}
