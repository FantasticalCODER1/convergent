import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { CertificateRecord } from '../types/Certificate';
import { issueCertificate, listCertificatesForUser, uploadCertificateAsset } from '../services/certificatesService';
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

  const uploadAndIssue = useCallback(
    async (params: { targetUserId: string; targetUserName: string; clubName: string; eventTitle: string; file: File; issuedBy: string }) => {
      const { targetUserId, targetUserName, clubName, eventTitle, file, issuedBy } = params;
      const asset = await uploadCertificateAsset(targetUserId, file);
      const verifierId = uuid();
      await issueCertificate({
        userId: targetUserId,
        userName: targetUserName,
        clubName,
        eventTitle,
        verifierId,
        fileUrl: asset.url,
        storagePath: asset.path,
        uploadedBy: issuedBy
      });
      if (targetUserId === user?.id) {
        await refresh();
      }
      return verifierId;
    },
    [refresh, user?.id]
  );

  const recordLocalIssuance = useCallback(
    async (details: { clubName: string; eventTitle: string }) => {
      if (!user) throw new Error('Sign in to issue certificates.');
      const verifierId = uuid();
      await issueCertificate({
        userId: user.id,
        userName: user.name,
        clubName: details.clubName,
        eventTitle: details.eventTitle,
        verifierId
      });
      await refresh();
      return verifierId;
    },
    [refresh, user]
  );

  return {
    certificates,
    loading,
    error,
    refresh,
    uploadAndIssue,
    recordLocalIssuance
  };
}
