import { Suspense, lazy, useEffect } from 'react';
import { useRoute, navigate } from './lib/router';
import { useStore } from './state/store';
import { Layout } from './components/Layout';
import { LevelUpBanner, Skeleton, Toast } from './components/ui';
import { achievementById, levelTitle } from './engine/gamification';
import { play, setSoundEnabled } from './lib/sound';
import { DashboardPage } from './pages/Dashboard';

// Forsiden er med fra start. Resten hentes først når eleven går derhen.
const lessonChunk = () => import('./pages/Lesson');
const libraryChunk = () => import('./pages/Library');
const practiceChunk = () => import('./pages/Practice');

const OnboardingPage = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.OnboardingPage })));
const DiagnosticPage = lazy(() => import('./pages/Diagnostic').then((m) => ({ default: m.DiagnosticPage })));
const LessonPage = lazy(() => lessonChunk().then((m) => ({ default: m.LessonPage })));
const LibraryPage = lazy(() => libraryChunk().then((m) => ({ default: m.LibraryPage })));
const DomainPage = lazy(() => libraryChunk().then((m) => ({ default: m.DomainPage })));
const PracticePage = lazy(() => practiceChunk().then((m) => ({ default: m.PracticePage })));
const ReviewPage = lazy(() => practiceChunk().then((m) => ({ default: m.ReviewPage })));
const ExamPage = lazy(() => import('./pages/Exam').then((m) => ({ default: m.ExamPage })));
const ProfilePage = lazy(() => import('./pages/Profile').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));

function BadgeToast({ id, onDone }: { id: string | undefined; onDone: () => void }) {
  const badge = id ? achievementById(id) : undefined;
  if (!badge) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 lg:bottom-6 lg:pl-60">
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
  const sound = useStore((s) => s.settings.sound);

  // De sider eleven oftest går til, hentes når browseren har tid, så
  // første tryk ikke venter på netværket.
  useEffect(() => {
    const later = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    later(() => {
      void lessonChunk();
      void libraryChunk();
      void practiceChunk();
    });
  }, []);

  useEffect(() => setSoundEnabled(sound), [sound]);
  useEffect(() => {
    if (pendingLevelUp) play('levelUp');
  }, [pendingLevelUp]);
  const firstBadge = pendingBadges[0];
  useEffect(() => {
    if (firstBadge) play('badge');
  }, [firstBadge]);

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
      <Suspense fallback={<Skeleton lines={4} />}>{page}</Suspense>

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
