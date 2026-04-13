export const CONVERGENT_CATEGORIES = [
  {
    key: 'school_wide',
    label: 'School-wide',
    shortLabel: 'School-wide',
    description: 'Shared events, notices, and operational updates for the full school.'
  },
  {
    key: 'academic',
    label: 'Academic',
    shortLabel: 'Academic',
    description: 'Timetables, classes, subject blocks, and academic resources.'
  },
  {
    key: 'club',
    label: 'Club',
    shortLabel: 'Club',
    description: 'Co-curricular clubs and student-led operational activity.'
  },
  {
    key: 'society',
    label: 'Society',
    shortLabel: 'Society',
    description: 'Societies, student forums, and interest-led communities.'
  },
  {
    key: 'supw',
    label: 'SUPW',
    shortLabel: 'SUPW',
    description: 'Socially Useful Productive Work groups, schedules, and updates.'
  },
  {
    key: 'sta',
    label: 'STA',
    shortLabel: 'STA',
    description: 'Structured STA programming, activity groups, and operations.'
  },
  {
    key: 'centre_of_excellence',
    label: 'Centre of Excellence',
    shortLabel: 'COE',
    description: 'Centres of Excellence and their specialist opportunities.'
  },
  {
    key: 'meals',
    label: 'Meals',
    shortLabel: 'Meals',
    description: 'Dining schedules, service timings, and meal plan updates.'
  }
] as const;

export type ConvergentCategoryKey = (typeof CONVERGENT_CATEGORIES)[number]['key'];

export const CATEGORY_LABELS = Object.fromEntries(
  CONVERGENT_CATEGORIES.map((category) => [category.key, category.label])
) as Record<ConvergentCategoryKey, string>;

const categoryKeySet = new Set<string>(CONVERGENT_CATEGORIES.map((category) => category.key));

export function normalizeCategory(value?: string | null, fallback: ConvergentCategoryKey = 'club'): ConvergentCategoryKey {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (categoryKeySet.has(normalized)) {
    return normalized as ConvergentCategoryKey;
  }
  if (normalized === 'school' || normalized === 'schoolwide') return 'school_wide';
  if (normalized === 'coe') return 'centre_of_excellence';
  return fallback;
}

export function getCategoryMeta(category?: string | null) {
  const key = normalizeCategory(category);
  return CONVERGENT_CATEGORIES.find((item) => item.key === key) ?? CONVERGENT_CATEGORIES[0];
}

export const GROUP_CATEGORY_KEYS: ConvergentCategoryKey[] = ['club', 'society', 'supw', 'sta', 'centre_of_excellence'];
