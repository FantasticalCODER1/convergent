import {
  Timestamp,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import type { CertificateRecord } from '../types/Certificate';
import { callFunction } from '../firebase/functions';
import { firestore } from '../firebase/firestore';
import { uploadFile } from '../firebase/storage';

const certificatesRef = collection(firestore, 'certificates');

function toIso(value?: Timestamp | null) {
  if (!value) return undefined;
  return value.toDate().toISOString();
}

function mapCertificate(snapshot: any): CertificateRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    clubId: data.clubId,
    userId: data.userId,
    userName: data.userName,
    clubName: data.clubName,
    eventTitle: data.eventTitle,
    issuedAt: toIso(data.issuedAt),
    verifierId: data.verifierId,
    fileUrl: data.fileUrl,
    uploadedBy: data.uploadedBy,
    storagePath: data.storagePath
  };
}

export type IssueCertificateInput = {
  clubId: string;
  userId: string;
  userName?: string;
  clubName: string;
  eventTitle: string;
  fileUrl?: string;
  storagePath?: string;
  uploadedBy?: string;
};

export async function issueCertificate(input: IssueCertificateInput) {
  return callFunction<IssueCertificateInput, CertificateRecord>('issueCertificate', input);
}

export async function listCertificatesForUser(userId: string) {
  const q = query(certificatesRef, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => mapCertificate(docSnap))
    .sort((a, b) => String(b.issuedAt ?? '').localeCompare(String(a.issuedAt ?? '')));
}

export async function listCertificatesForClub(clubId: string) {
  return callFunction<{ clubId: string }, CertificateRecord[]>('listClubCertificates', { clubId });
}

export async function verifyCertificateByCode(code: string) {
  return callFunction<{ code: string }, CertificateRecord | null>('verifyCertificate', { code });
}

export async function uploadCertificateAsset(clubId: string, userId: string, file: File) {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = `certificates/${clubId}/${userId}/${timestamp}_${safeName}`;
  const url = await uploadFile(path, file, { contentType: file.type });
  return { url, path };
}
