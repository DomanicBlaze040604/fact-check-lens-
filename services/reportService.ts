import { jsPDF } from 'jspdf';
import { FactCheckResponse } from '../types';

export const generatePdfReport = (data: FactCheckResponse) => {
  // Initialize PDF
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 20;

  // Helper to check for new page
  const checkPageBreak = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - margin) {
      doc.addPage();
      y = 20;
      return true;
    }
    return false;
  };

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(16, 185, 129); // Brand Green #10B981
  doc.text("Instant Fact-Check Lens", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleString()}`, margin, y);
  y += 15;

  // --- Executive Summary Box ---
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(236, 253, 245); // Brand Light Green
  doc.roundedRect(margin, y, contentWidth, 35, 3, 3, 'FD');

  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Overall Verdict:", margin + 5, y + 10);
  
  doc.setFontSize(16);
  // Set Color based on verdict
  if (data.overall_verdict === 'true') doc.setTextColor(22, 163, 74); // Green
  else if (data.overall_verdict === 'false') doc.setTextColor(220, 38, 38); // Red
  else doc.setTextColor(217, 119, 6); // Amber/Yellow

  doc.text(data.overall_verdict.toUpperCase(), margin + 45, y + 10);

  doc.setFontSize(10);
  doc.setTextColor(50);
  doc.setFont("helvetica", "normal");
  doc.text(`AI Confidence: ${Math.round(data.overall_confidence * 100)}%`, margin + 5, y + 20);
  doc.text(`Claims Analyzed: ${data.input_summary.detected_claims_count}`, margin + 60, y + 20);
  
  y += 45;

  // --- Summary Text ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", margin, y);
  y += 8;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55); // Dark Gray
  const summaryLines = doc.splitTextToSize(data.explainable_summary, contentWidth);
  doc.text(summaryLines, margin, y);
  y += (summaryLines.length * 6) + 10;

  // --- Detailed Analysis ---
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Detailed Claims Analysis", margin, y);
  y += 10;

  data.claims.forEach((claim, idx) => {
    checkPageBreak(50);

    // Claim Header
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    const claimTitle = `Claim ${idx + 1}: ${claim.verdict.toUpperCase()}`;
    doc.text(claimTitle, margin, y);
    y += 7;

    // Claim Text
    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(80);
    const claimTextLines = doc.splitTextToSize(`"${claim.claim_text}"`, contentWidth - 5);
    doc.text(claimTextLines, margin + 5, y);
    y += (claimTextLines.length * 6) + 5;

    // Reasoning
    checkPageBreak(20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    doc.text("Analysis:", margin + 5, y);
    y += 5;
    
    doc.setTextColor(50);
    const reasoningLines = doc.splitTextToSize(claim.reasoning, contentWidth - 10);
    doc.text(reasoningLines, margin + 5, y);
    y += (reasoningLines.length * 5) + 8;

    // Proofs / Evidence
    if (claim.evidence && claim.evidence.length > 0) {
        checkPageBreak(30);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0);
        doc.text("Evidence / Proofs:", margin + 5, y);
        y += 6;

        claim.evidence.forEach(ev => {
            checkPageBreak(15);
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(37, 99, 235); // Link Blue
            
            // Generate link text
            const linkText = `• ${ev.source_title} (${ev.source_type})`;
            
            // Add clickable link using standard doc.text and doc.link
            doc.text(linkText, margin + 8, y);
            const linkWidth = doc.getTextWidth(linkText);
            doc.link(margin + 8, y - 4, linkWidth, 5, { url: ev.source_url });
            
            y += 5;

            // Optional quote
            if (ev.quote) {
               doc.setTextColor(100);
               doc.setFont("helvetica", "italic");
               const quoteLine = `  "${ev.quote.substring(0, 100)}${ev.quote.length > 100 ? '...' : ''}"`;
               doc.text(quoteLine, margin + 8, y);
               y += 5;
               doc.setFont("helvetica", "normal");
            }
        });
        y += 5;
    }
    y += 5;
  });

  // --- Footer ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${totalPages} - Generated by Instant Fact-Check Lens`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Save
  doc.save(`FactCheck-Report-${Date.now()}.pdf`);
};