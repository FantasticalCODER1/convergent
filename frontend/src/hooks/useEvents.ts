import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EventRecord } from '../types/Event';
import {
  EventInput,
  ImportedEventPayload,
  listEvents,
  listRsvpsForUser,
  rsvpToEvent,
  saveEvent,
  upsertImportedEvents
} from '../services/eventsService';
import { useAuth } from './useAuth';

type Options = { autoLoad?: boolean };

export function useEvents(options: Options = { autoLoad: true }) {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [rsvps, setRsvps] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEvents();
      setEvents(data);
      if (user) {
        const userRsvps = await listRsvpsForUser(user.id);
        setRsvps(userRsvps);
      } else {
        setRsvps({});
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (options.autoLoad) {
      void refresh();
    }
  }, [options.autoLoad, refresh]);

  const attendingEvents = useMemo(() => new Set(Object.entries(rsvps).filter(([, value]) => value).map(([id]) => id)), [rsvps]);

  const toggleRsvp = useCallback(
    async (eventId: string, attending: boolean) => {
      if (!user) throw new Error('Sign in to RSVP');
      await rsvpToEvent(eventId, user, attending);
      setRsvps((prev) => ({ ...prev, [eventId]: attending }));
      await refresh();
    },
    [user, refresh]
  );

  const persistEvent = useCallback(
    async (payload: EventInput) => {
      const saved = await saveEvent(payload);
      setEvents((prev) => {
        const idx = prev.findIndex((event) => event.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [...prev, saved].sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
      });
      return saved;
    },
    []
  );

  const importEvents = useCallback(async (payloads: ImportedEventPayload[]) => {
    await upsertImportedEvents(payloads);
    await refresh();
  }, [refresh]);

  return {
    events,
    loading,
    error,
    refresh,
    attendingEvents,
    rsvps,
    toggleRsvp,
    saveEvent: persistEvent,
    importEvents
  };
}
