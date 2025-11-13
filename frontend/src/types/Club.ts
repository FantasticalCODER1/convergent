export interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  mic: string;
  schedule: string;
  logoUrl?: string;
  managerIds: string[];
  memberCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClubPost {
  id: string;
  clubId: string;
  authorId: string;
  authorName?: string;
  text: string;
  createdAt?: string;
}
