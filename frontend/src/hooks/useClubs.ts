import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MembershipRecord } from '../types/Membership';
import type { PostRecord } from '../types/Post';
import type { Club } from '../types/Club';
import {
  addClubPost,
  createClub as createClubRecord,
  getClub,
  joinClub as joinClubRecord,
  leaveClub as leaveClubRecord,
  listClubPosts,
  listClubMembershipRequests,
  listClubs,
  listMembershipsForUser,
  setClubMembershipStatus
} from '../services/clubsService';
import type { ClubPostInput, CreateClubInput, MembershipRequestRecord } from '../services/clubsService';
import { useAuth } from './useAuth';

type PostsState = Record<string, PostRecord[]>;
type RequestsState = Record<string, MembershipRequestRecord[]>;

export function useClubs(options: { autoLoad?: boolean } = { autoLoad: true }) {
  const { user, refreshProfile } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [memberships, setMemberships] = useState<MembershipRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostsState>({});
  const [membershipRequests, setMembershipRequests] = useState<RequestsState>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, membershipRecords] = await Promise.all([
        listClubs(),
        user ? listMembershipsForUser(user.id) : Promise.resolve([])
      ]);
      setClubs(list);
      setMemberships(membershipRecords);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load clubs');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (options.autoLoad) {
      void refresh();
    }
  }, [options.autoLoad, refresh]);

  const getClubById = useCallback(
    async (id: string) => {
      const cached = clubs.find((club) => club.id === id);
      if (cached) return cached;
      return getClub(id);
    },
    [clubs]
  );

  const requireUser = () => {
    if (!user) {
      throw new Error('Sign in to manage clubs.');
    }
    return user;
  };

  const createClub = useCallback(
    async (input: CreateClubInput) => {
      const author = requireUser();
      await createClubRecord(input, author);
      await refresh();
      await refreshProfile?.();
    },
    [refresh, refreshProfile, user]
  );

  const joinClub = useCallback(
    async (clubId: string) => {
      const current = requireUser();
      await joinClubRecord(clubId, current);
      await refreshProfile?.();
      await refresh();
    },
    [refresh, refreshProfile, user]
  );

  const leaveClub = useCallback(
    async (clubId: string) => {
      const current = requireUser();
      await leaveClubRecord(clubId, current);
      await refreshProfile?.();
      await refresh();
    },
    [refresh, refreshProfile, user]
  );

  const fetchPosts = useCallback(
    async (clubId: string) => {
      const thread = await listClubPosts(clubId);
      setPosts((state) => ({ ...state, [clubId]: thread }));
      return thread;
    },
    []
  );

  const submitPost = useCallback(
    async (clubId: string, input: ClubPostInput) => {
      const author = requireUser();
      await addClubPost(clubId, input, author);
      await fetchPosts(clubId);
    },
    [fetchPosts, user]
  );

  const postsForClub = useCallback(
    (clubId: string) => posts[clubId] ?? [],
    [posts]
  );

  const fetchMembershipRequests = useCallback(
    async (clubId: string) => {
      const requests = await listClubMembershipRequests(clubId);
      setMembershipRequests((state) => ({ ...state, [clubId]: requests }));
      return requests;
    },
    []
  );

  const membershipRequestsForClub = useCallback(
    (clubId: string) => membershipRequests[clubId] ?? [],
    [membershipRequests]
  );

  const reviewMembership = useCallback(
    async (clubId: string, userId: string, status: 'approved' | 'rejected') => {
      await setClubMembershipStatus(clubId, userId, status);
      await refresh();
      await refreshProfile?.();
      await fetchMembershipRequests(clubId);
    },
    [fetchMembershipRequests, refresh, refreshProfile]
  );

  const clubMap = useMemo(() => {
    return clubs.reduce<Record<string, Club>>((acc, club) => {
      acc[club.id] = club;
      return acc;
    }, {});
  }, [clubs]);

  const membershipMap = useMemo(() => {
    return memberships.reduce<Record<string, MembershipRecord>>((acc, membership) => {
      acc[membership.groupId] = membership;
      return acc;
    }, {});
  }, [memberships]);

  return {
    clubs,
    clubMap,
    memberships,
    membershipMap,
    loading,
    error,
    refresh,
    createClub,
    joinClub,
    leaveClub,
    getClubById,
    fetchPosts,
    submitPost,
    postsForClub,
    fetchMembershipRequests,
    membershipRequestsForClub,
    reviewMembership
  };
}
