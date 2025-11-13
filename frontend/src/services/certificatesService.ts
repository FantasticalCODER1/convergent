import {
  Timestamp,
  addDoc,
  collection,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore';
import type { CertificateRecord } from '../types/Certificate';
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
  userId: string;
  userName: string;
  clubName: string;
  eventTitle: string;
  verifierId: string;
  fileUrl?: string;
  storagePath?: string;
  uploadedBy?: string;
};

export async function issueCertificate(input: IssueCertificateInput) {
  const docRef = await addDoc(certificatesRef, {
    userId: input.userId,
    userName: input.userName,
    clubName: input.clubName,
    eventTitle: input.eventTitle,
    verifierId: input.verifierId,
    fileUrl: input.fileUrl ?? null,
    storagePath: input.storagePath ?? null,
    uploadedBy: input.uploadedBy ?? null,
    issuedAt: serverTimestamp(),
    createdAt: serverTimestamp()
  });
  const snap = await getDoc(docRef);
  return mapCertificate(snap);
}

export async function listCertificatesForUser(userId: string) {
  const q = query(certificatesRef, where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => mapCertificate(docSnap));
}

export async function verifyCertificateByCode(code: string) {
  const q = query(certificatesRef, where('verifierId', '==', code), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return mapCertificate(snap.docs[0]);
}

export async function uploadCertificateAsset(userId: string, file: File) {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const path = `certificates/${userId}/${timestamp}_${safeName}`;
  const url = await uploadFile(path, file, { contentType: file.type });
  return { url, path };
}
