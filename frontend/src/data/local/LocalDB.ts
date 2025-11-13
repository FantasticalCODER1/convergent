import Dexie, { type Table } from 'dexie';
import type { UserDoc, ClubDoc, EventDoc, PostDoc, CertDoc } from '../DataProvider';

export class LocalDB extends Dexie {
  users!: Table<UserDoc, string>;
  clubs!: Table<ClubDoc, string>;
  events!: Table<EventDoc, string>;
  posts!: Table<PostDoc, string>;
  certs!: Table<CertDoc, string>;

  constructor() {
    super('convergent-local');
    this.version(1).stores({
      users: 'id, email, role',
      clubs: 'id, name, category',
      events: 'id, start, type, clubId',
      posts: 'id, clubId, createdAt',
      certs: 'id, userUid, verifierId'
    });
  }
}

export const db = new LocalDB();
