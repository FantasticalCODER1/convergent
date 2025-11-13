import { db } from '../data/local/LocalDB';

export async function exportLocalAsJson() {
  const [users, clubs, events, posts, certs] = await Promise.all([
    db.users.toArray(),
    db.clubs.toArray(),
    db.events.toArray(),
    db.posts.toArray(),
    db.certs.toArray()
  ]);
  const payload = { users, clubs, events, posts, certs };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'convergent-local-export.json';
  a.click();
  URL.revokeObjectURL(url);
}
