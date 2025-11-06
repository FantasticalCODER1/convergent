/**
 * Project: Convergent
 * Author: GPT-5 Codex
 * Date: 2025-11-06
 */
// Generates a basic certificate PDF using jsPDF for shareable exports.
// TODO: Swap to server-rendered templates for richer branding and AI-powered summaries.

import jsPDF from 'jspdf';

export function generateCertificatePdf({ studentName, clubName, eventName, date, qrDataUrl }) {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(32);
  doc.text('Certificate of Participation', 20, 40);

  doc.setFontSize(18);
  doc.text(`This certifies that ${studentName}`, 20, 60);
  doc.text(`participated in ${eventName} (${clubName})`, 20, 75);
  doc.text(`Date: ${date}`, 20, 90);

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 240, 130, 40, 40);
  }

  return doc;
}
