import { v4 as uuid } from 'uuid';
import { db } from './LocalDB';
import type { DataProvider, UserDoc, Role, ClubDoc, EventDoc, PostDoc, CertDoc } from '../DataProvider';

export class LocalProvider implements DataProvider {
  async getUser(id: string) {
    return db.users.get(id);
  }

  async upsertUser(u: UserDoc) {
    await db.users.put(u);
  }

  async listUsers() {
    return db.users.toArray();
  }

  async updateUserRole(id: string, role: Role) {
    await db.users.update(id, { role });
  }

  async listClubs() {
    return db.clubs.toArray();
  }

  async createClub(input: Omit<ClubDoc, 'id'>) {
    const id = uuid();
    await db.clubs.add({ ...input, id });
    return id;
  }

  async getClub(id: string) {
    return db.clubs.get(id);
  }

  async listPosts(clubId: string) {
    const items = await db.posts.where('clubId').equals(clubId).sortBy('createdAt');
    return items.reverse();
  }

  async addPost(clubId: string, text: string, authorUid: string) {
    const id = uuid();
    await db.posts.add({ id, clubId, text, authorUid, createdAt: Date.now() });
    return id;
  }

  async listEvents() {
    return db.events.toArray();
  }

  async createEvent(input: Omit<EventDoc, 'id'>) {
    const id = uuid();
    await db.events.add({ ...input, id });
    return id;
  }

  async listCertsForUser(uid: string) {
    return db.certs.where('userUid').equals(uid).toArray();
  }

  async createCert(input: Omit<CertDoc, 'id'>) {
    const id = uuid();
    await db.certs.add({ ...input, id });
    return id;
  }

  async getCertByVerifier(verifierId: string) {
    return db.certs.where('verifierId').equals(verifierId).first();
  }
}
