import { useMemo, useState } from 'react';
import { CalendarImporter } from '../admin/CalendarImporter';
import { CertificateUploader } from '../admin/CertificateUploader';
import { EventEditor } from '../admin/EventEditor';
import type { Club } from '../../types/Club';
import type { EventRecord } from '../../types/Event';
import type { AppUser } from '../../types/User';
import type { EventInput } from '../../services/eventsService';

type Props = {
  club: Club;
  users: AppUser[];
  events: EventRecord[];
  onSaveEvent: (payload: EventInput) => Promise<unknown>;
  onRefresh: () => Promise<void> | void;
};

export function ClubManagementPanel({ club, users, events, onSaveEvent, onRefresh }: Props) {
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    [events]
  );

  return (
    <section className="space-y-4 rounded-3xl border border-emerald-400/20 bg-emerald-500/5 p-6 shadow-glass">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Club management</p>
        <h2 className="text-2xl font-semibold text-white">Manage {club.name}</h2>
        <p className="text-sm text-white/60">Events, imports, and certificates for this club stay scoped to this club.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <EventEditor
          clubId={club.id}
          event={editingEvent}
          allowedTypes={['club', 'competition']}
          title="Create or edit club events"
          description="School-wide events remain admin-only. This editor only writes club-scoped events."
          onSave={async (payload) => {
            await onSaveEvent({ ...payload, clubId: club.id, type: payload.type === 'competition' ? 'competition' : 'club' });
            setEditingEvent(null);
            await onRefresh();
          }}
          onCancelEdit={() => setEditingEvent(null)}
        />
        <CertificateUploader clubId={club.id} clubName={club.name} users={users} onIssued={onRefresh} />
      </div>

      <CalendarImporter clubId={club.id} onImported={onRefresh} />

      <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Existing events</p>
            <p className="text-sm text-white/60">Select an event to edit its club-scoped metadata.</p>
          </div>
          <span className="text-xs text-white/50">{sortedEvents.length} event{sortedEvents.length === 1 ? '' : 's'}</span>
        </div>
        {sortedEvents.length === 0 ? (
          <p className="text-sm text-white/60">No club events yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {sortedEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => setEditingEvent(event)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10"
              >
                <p className="font-medium text-white">{event.title}</p>
                <p className="text-xs text-white/60">{new Date(event.startTime).toLocaleString()}</p>
                <p className="text-xs text-white/40">{event.type}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
