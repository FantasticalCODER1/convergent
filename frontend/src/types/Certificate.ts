export interface CertificateRecord {
  id: string;
  userId: string;
  userName: string;
  clubName: string;
  eventTitle: string;
  issuedAt?: string;
  verifierId: string;
  fileUrl?: string;
  uploadedBy?: string;
  storagePath?: string;
}
