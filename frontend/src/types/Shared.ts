import type { UserRole } from './User';

export type VisibilityScope = 'school' | 'members' | 'managers' | 'private';

export type ResourceLink = {
  label: string;
  url: string;
  kind?: 'resource' | 'classroom' | 'meet' | 'reference';
};

export type AuthorSnapshot = {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
};
