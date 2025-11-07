import jsPDF from "jspdf";

export function generateCertificatePdf(content, opts = {}) {
  const doc = new jsPDF();
  doc.text(content, 10, 10);
  doc.save(opts.filename || "certificate.pdf");
}
