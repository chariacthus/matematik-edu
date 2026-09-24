import type { PlanItem } from '../engine/planner';
import { navigate } from './router';

export function openPlanItem(item: PlanItem) {
  if (item.kind === 'diagnose') navigate({ name: 'diagnose' });
  else navigate({ name: 'lesson', skillId: item.skillId });
}
