export type UserRole = 'student' | 'teacher' | 'manager' | 'admin';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  clubsJoined: string[];
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserSnapshot extends AppUser {
  phoneNumber?: string;
  houses?: string[];
}
