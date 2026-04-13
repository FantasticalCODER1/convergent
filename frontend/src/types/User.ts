export type UserRole = 'student' | 'master' | 'manager' | 'admin';
export type ResidencyStatus = 'boarding' | 'day';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  clubsJoined: string[];
  grade?: string;
  section?: string;
  house?: string;
  residency?: ResidencyStatus;
  scheduleAudienceKey?: string;
  authProvider?: string;
  profileCompletedAt?: string;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSnapshot extends AppUser {
  phoneNumber?: string;
  houses?: string[];
}
