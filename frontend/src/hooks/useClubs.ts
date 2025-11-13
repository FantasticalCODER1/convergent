import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Club, ClubPost } from '../types/Club';
import {
  addClubPost,
  createClub as createClubRecord,
  getClub,
  joinClub as joinClubRecord,
  leaveClub as leaveClubRecord,
  listClubPosts,
  listClubs
} from '../services/clubsService';
import type { CreateClubInput } from '../services/clubsService';
import { useAuth } from './useAuth';

type PostsState = Record<string, ClubPost[]>;

export function useClubs(options: { autoLoad?: boolean } = { autoLoad: true }) {
  const { user, refreshProfile } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostsState>({});

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listClubs();
      setClubs(list);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load clubs');
    } finally {
      setLoading(false);
    }
  }, []);

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
    async (clubId: string, text: string) => {
      const author = requireUser();
      await addClubPost(clubId, text, author);
      await fetchPosts(clubId);
    },
    [fetchPosts, user]
  );

  const postsForClub = useCallback(
    (clubId: string) => posts[clubId] ?? [],
    [posts]
  );

  const clubMap = useMemo(() => {
    return clubs.reduce<Record<string, Club>>((acc, club) => {
      acc[club.id] = club;
      return acc;
    }, {});
  }, [clubs]);

  return {
    clubs,
    clubMap,
    loading,
    error,
    refresh,
    createClub,
    joinClub,
    leaveClub,
    getClubById,
    fetchPosts,
    submitPost,
    postsForClub
  };
}
