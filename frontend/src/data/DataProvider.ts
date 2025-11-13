export type Role = 'student' | 'teacher' | 'manager' | 'admin';

export type UserDoc = {
  id: string;
  name: string;
  email: string;
  role: Role;
  photoURL?: string;
  clubsJoined: string[];
};

export type ClubDoc = {
  id: string;
  name: string;
  desc: string;
  category: string;
  mic: string;
  schedule: string;
  managers: string[];
};

export type EventDoc = {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'club' | 'school' | 'competition';
  location?: string;
  description?: string;
  clubId?: string;
};

export type PostDoc = {
  id: string;
  clubId: string;
  text: string;
  authorUid: string;
  createdAt: number;
};

export type CertDoc = {
  id: string;
  userUid: string;
  name: string;
  eventTitle: string;
  clubName: string;
  issuedAt: number;
  verifierId: string;
};

export interface DataProvider {
  getUser(id: string): Promise<UserDoc | undefined>;
  upsertUser(u: UserDoc): Promise<void>;
  listUsers(): Promise<UserDoc[]>;
  updateUserRole(id: string, role: Role): Promise<void>;

  listClubs(): Promise<ClubDoc[]>;
  createClub(input: Omit<ClubDoc, 'id'>): Promise<string>;
  getClub(id: string): Promise<ClubDoc | undefined>;

  listPosts(clubId: string): Promise<PostDoc[]>;
  addPost(clubId: string, text: string, authorUid: string): Promise<string>;

  listEvents(): Promise<EventDoc[]>;
  createEvent(input: Omit<EventDoc, 'id'>): Promise<string>;

  listCertsForUser(uid: string): Promise<CertDoc[]>;
  createCert(input: Omit<CertDoc, 'id'>): Promise<string>;
  getCertByVerifier(verifierId: string): Promise<CertDoc | undefined>;
}
