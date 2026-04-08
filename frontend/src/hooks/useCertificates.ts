import { useCallback, useEffect, useState } from 'react';
import type { CertificateRecord } from '../types/Certificate';
import { listCertificatesForUser } from '../services/certificatesService';
import { useAuth } from './useAuth';

export function useCertificates(options: { autoLoad?: boolean } = { autoLoad: true }) {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listCertificatesForUser(user.id);
      setCertificates(data);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load certificates');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (options.autoLoad && user) {
      void refresh();
    }
  }, [options.autoLoad, refresh, user]);

  return {
    certificates,
    loading,
    error,
    refresh
  };
}
