/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Sample data set for seeding Firestore with baseline clubs during initial deploys.
// TODO: Replace with admin UI-driven seeding once migration flows are ready.

export const sampleClubs = [
  {
    slug: 'debating-society',
    name: 'Debating Society',
    description: 'Sharpen public speaking and critical thinking with weekly debate rounds.',
    frequency: 'Weekly • Thursdays',
    masterInCharge: 'Mr. Singh',
    masterId: null,
    managerIds: []
  },
  {
    slug: 'robotics-club',
    name: 'Robotics Club',
    description: 'Build autonomous robots and compete in inter-school challenges.',
    frequency: 'Weekly • Wednesdays',
    masterInCharge: 'Ms. Kapoor',
    masterId: null,
    managerIds: []
  },
  {
    slug: 'echo-publication',
    name: 'Echo Publication',
    description: 'Student-led editorial board covering campus stories and features.',
    frequency: 'Bi-weekly • Mondays',
    masterInCharge: 'Mrs. Dutta',
    masterId: null,
    managerIds: []
  }
];
