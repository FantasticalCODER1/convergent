export interface CertificateRecord {
  id: string;
  clubId?: string;
  userId: string;
  userName: string;
  clubName: string;
  eventTitle: string;
  issuedAt?: string;
  verifierId: string;
  fileUrl?: string;
  uploadedBy?: string;
  storagePath?: string;
  createdAt?: string;
}
