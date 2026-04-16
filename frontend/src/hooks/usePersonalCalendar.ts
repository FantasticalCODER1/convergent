import { addDays, endOfMonth, startOfMonth, subDays } from 'date-fns';
import { useMemo } from 'react';
import { composePersonalCalendar } from '../services/personalCalendarService';
import { useAuth } from './useAuth';
import { useClubs } from './useClubs';
import { useEvents } from './useEvents';
import { useSchedules } from './useSchedules';

type Options = {
  rangeStart?: Date;
  rangeEnd?: Date;
};

export function usePersonalCalendar(options: Options = {}) {
  const { user } = useAuth();
  const clubsState = useClubs();
  const rangeStart = options.rangeStart ?? subDays(startOfMonth(new Date()), 7);
  const rangeEnd = options.rangeEnd ?? addDays(endOfMonth(new Date()), 21);
  const eventsState = useEvents({
    rangeStart,
    rangeEnd
  });
  const schedulesState = useSchedules();

  const personalCalendar = useMemo(
    () =>
      composePersonalCalendar({
        clubs: clubsState.clubs,
        membershipMap: clubsState.membershipMap,
        events: eventsState.events,
        scheduleEntries: schedulesState.entries,
        scheduleDatasets: schedulesState.datasets,
        rangeStart,
        rangeEnd,
        user
      }),
    [
      clubsState.clubs,
      clubsState.membershipMap,
      eventsState.events,
      rangeEnd,
      rangeStart,
      schedulesState.datasets,
      schedulesState.entries,
      user
    ]
  );

  return {
    ...personalCalendar,
    clubs: clubsState.clubs,
    membershipMap: clubsState.membershipMap,
    memberships: clubsState.memberships,
    rsvps: eventsState.rsvps,
    toggleRsvp: eventsState.toggleRsvp,
    saveEvent: eventsState.saveEvent,
    refreshEvents: eventsState.refresh,
    loading: clubsState.loading || eventsState.loading || schedulesState.loading,
    error: clubsState.error ?? eventsState.error ?? schedulesState.error,
    rawEvents: eventsState.events,
    scheduleEntries: schedulesState.entries,
    scheduleDatasets: schedulesState.datasets
  };
}
