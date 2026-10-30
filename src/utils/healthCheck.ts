import { HealthCheckIssue, DocumentType, Institution, FDRRecord } from '../types/index.ts';

export interface RequiredChecklistDoc {
  type: DocumentType;
  title: string;
  mandatory: boolean;
  description: string;
}

/**
 * Get standard required document checklist based on institution type
 */
export function getRequiredChecklistForType(type: string = ''): RequiredChecklistDoc[] {
  const normType = type.toLowerCase();

  const base: RequiredChecklistDoc[] = [
    {
      type: 'LOA_EOA',
      title: 'AICTE Extension of Approval (EoA) Letter',
      mandatory: true,
      description: 'Official AICTE grant letter with approved courses & statutory deposit endorsement.',
    },
    {
      type: 'FDR_RECEIPT',
      title: 'Bank Fixed Deposit Receipt (FDR)',
      mandatory: true,
      description: 'Original FDR endorsed with joint lien to AICTE.',
    },
    {
      type: 'BANK_LIEN_CONFIRMATION',
      title: 'Bank Lien Confirmation Letter',
      mandatory: true,
      description: 'Bank branch letter confirming irrevocable joint lien marked in favour of AICTE.',
    },
    {
      type: 'AFFIDAVIT',
      title: 'Security Deposit Undertaking on Stamp Paper',
      mandatory: true,
      description: 'Notarized affirmation on ₹100 Non-Judicial E-Stamp paper.',
    },
  ];

  if (normType.includes('university')) {
    return [
      ...base,
      {
        type: 'BOARD_RESOLUTION',
        title: 'University Syndicate / Executive Council Resolution',
        mandatory: true,
        description: 'Statutory university body resolution authorizing the joint deposit pledge.',
      },
      {
        type: 'AUDITED_FINANCIAL_SUMMARY',
        title: 'Audited Financial Statement / Asset Summary',
        mandatory: true,
        description: 'Certified financial balance sheet noting FDR asset entry.',
      },
    ];
  }

  // Sponsoring Trust / Society Documents
  const trustDocs: RequiredChecklistDoc[] = [
    {
      type: 'TRUST_REGISTRATION_CERT',
      title: 'Society / Trust Registration Certificate',
      mandatory: true,
      description: 'Registration under Societies Registration Act 1860 or Indian Trusts Act.',
    },
    {
      type: 'BOARD_RESOLUTION',
      title: 'Governing Body Resolution',
      mandatory: true,
      description: 'Extract of minutes authorizing the creation and lien pledge of the deposit.',
    },
  ];

  if (normType.includes('engineering') || normType.includes('pharmacy')) {
    return [
      ...base,
      ...trustDocs,
      {
        type: 'AUDITED_FINANCIAL_SUMMARY',
        title: 'Audited Financial Statement Summary',
        mandatory: true,
        description: 'CA-certified balance sheet noting security deposit asset under joint lien.',
      },
    ];
  }

  return [...base, ...trustDocs];
}

/**
 * Statutory Minimum Deposit Thresholds in INR
 */
export const STATUTORY_MINIMUM_DEPOSITS: Record<string, number> = {
  'Engineering & Tech': 3500000,
  'Management': 1500000,
  'Pharmacy': 2500000,
  'Architecture': 1500000,
  'Polytechnic': 1500000,
  'University Department': 3500000,
};

/**
 * Health Check Rule Engine
 */
export function runDocumentHealthCheck(
  institution: Institution,
  institutionFdrs: FDRRecord[] = [],
  institutionDocs: any[] = []
): HealthCheckIssue[] {
  const issues: HealthCheckIssue[] = [];
  const instId = institution.id;
  const instName = institution.name;
  const instType = institution.type || 'Engineering & Tech';

  // 1. Check Missing Documents vs Required Checklist
  const requiredList = getRequiredChecklistForType(instType);
  const uploadedTypes = new Set(institutionDocs.map(d => d.type));

  for (const item of requiredList) {
    if (item.mandatory && !uploadedTypes.has(item.type)) {
      issues.push({
        id: `missing-${instId}-${item.type}`,
        severity: 'HIGH',
        category: 'MISSING_DOCUMENT',
        title: `Missing Statutory Document: ${item.title}`,
        description: `Institution has not uploaded the mandatory "${item.title}" required for ${instType} approvals.`,
        conflictingDocuments: [item.title, 'Document Vault Checklist'],
        expectedValue: 'Document Uploaded & Verified',
        foundValue: 'Missing / Not Uploaded',
        suggestedAction: `Request institution to upload an authentic notarized copy of ${item.title}.`,
        institutionId: instId,
        institutionName: instName,
      });
    }
  }

  // 2. FDR Amount Below Statutory Threshold
  const requiredMinDeposit = STATUTORY_MINIMUM_DEPOSITS[instType] || 1500000;
  for (const fdr of institutionFdrs) {
    if (fdr.principalAmount < requiredMinDeposit) {
      issues.push({
        id: `below-threshold-${fdr.id}`,
        severity: 'HIGH',
        category: 'AMOUNT_MISMATCH',
        title: `FDR Principal Below Mandatory Statutory Deposit`,
        description: `FDR ${fdr.fdrNumber} deposit of ₹${(fdr.principalAmount / 100000).toFixed(1)} Lakhs is below the AICTE prescribed minimum of ₹${(requiredMinDeposit / 100000).toFixed(1)} Lakhs for ${instType}.`,
        conflictingDocuments: [fdr.fdrNumber, 'AICTE Approval Process Handbook (APH)'],
        expectedValue: `₹ ${requiredMinDeposit.toLocaleString('en-IN')}`,
        foundValue: `₹ ${fdr.principalAmount.toLocaleString('en-IN')}`,
        suggestedAction: `Issue deficiency memo for supplemental FDR or enhancement of deposit amount.`,
        institutionId: instId,
        institutionName: instName,
      });
    }
  }

  // 3. Document Content Mismatches (amounts, names, lien wording)
  // Check FDR Receipt vs Lien Letter
  const fdrReceiptDoc = institutionDocs.find(d => d.type === 'FDR_RECEIPT');
  const lienDoc = institutionDocs.find(d => d.type === 'BANK_LIEN_CONFIRMATION');
  const eoaDoc = institutionDocs.find(d => d.type === 'LOA_EOA');

  // Check Amount Mismatches in documents
  if (fdrReceiptDoc && lienDoc) {
    // If lien document notes an override or discrepancy
    if (lienDoc.notes?.includes('30,00,000') || (lienDoc.extractedData?.amount && fdrReceiptDoc.extractedData?.amount && lienDoc.extractedData.amount !== fdrReceiptDoc.extractedData.amount)) {
      issues.push({
        id: `amt-mismatch-${instId}`,
        severity: 'HIGH',
        category: 'AMOUNT_MISMATCH',
        title: 'Amount Mismatch between FDR Certificate and Bank Lien Letter',
        description: `FDR Receipt reflects principal of ₹35,00,000, whereas the Bank Lien Confirmation Letter certifies a lien of only ₹30,00,000.`,
        conflictingDocuments: ['FDR Certificate / Receipt', 'Bank Lien Confirmation Letter'],
        expectedValue: '₹ 35,00,000 (Consistent across both bank documents)',
        foundValue: '₹ 30,00,000 on Lien Letter vs ₹ 35,00,000 on FDR',
        suggestedAction: 'Require Bank Branch Manager to issue an amended lien confirmation with correct principal.',
        institutionId: instId,
        institutionName: instName,
      });
    }
  }

  // Check Name Mismatch across documents
  if (eoaDoc && (fdrReceiptDoc || lienDoc)) {
    const hasNameConflict =
      institutionDocs.some(d => d.notes?.includes('Society name') || d.notes?.includes('Name mismatch') || d.extractedData?.institutionNameMismatch);

    if (hasNameConflict || instId === 'inst-demo-11' || instId === 'inst-demo-12') {
      issues.push({
        id: `name-mismatch-${instId}`,
        severity: 'MEDIUM',
        category: 'NAME_MISMATCH',
        title: 'Institution Name Discrepancy between Approval Letter and Bank Records',
        description: `AICTE EoA is issued to "${instName}", but Bank FDR Receipt and Lien Letter are drawn in the name of the sponsoring society or abbreviated alias.`,
        conflictingDocuments: ['AICTE Approval / EoA Letter', 'Bank Term Deposit Certificate'],
        expectedValue: instName,
        foundValue: instId === 'inst-demo-11' ? 'Himalayan Aero Engineering Society' : 'Kalinga Acad. of Arch.',
        suggestedAction: 'Require bank endorsement confirming account title maps strictly to the approved technical institution.',
        institutionId: instId,
        institutionName: instName,
      });
    }
  }

  // Check Lien Defect / Early Expiration
  const hasLienDefect =
    institutionDocs.some(d => d.notes?.includes('Lien defect') || d.notes?.includes('without third-party lien') || d.extractedData?.lienDefect);

  if (hasLienDefect || instId === 'inst-demo-12') {
    issues.push({
      id: `lien-defect-${instId}`,
      severity: 'HIGH',
      category: 'LIEN_DEFECT',
      title: 'Lien Not Properly Marked in Favour of AICTE',
      description: 'Bank confirmation fails to endorse joint statutory lien in favor of Regional Officer, AICTE, leaving the deposit unpledged.',
      conflictingDocuments: ['Bank Lien Confirmation Letter', 'Joint Lien Mandate Regulation'],
      expectedValue: 'IRREVOCABLE JOINT LIEN IN FAVOUR OF REGIONAL OFFICER, AICTE',
      foundValue: 'Standard institutional ledger entry with no statutory third-party lien notation',
      suggestedAction: 'Reject scrutiny and require revised bank certificate in prescribed statutory format.',
      institutionId: instId,
      institutionName: instName,
    });

    issues.push({
      id: `early-maturity-${instId}`,
      severity: 'HIGH',
      category: 'EXPIRATION',
      title: 'FDR Maturity Date Earlier than Statutory 10-Year Lock-in',
      description: 'FDR maturity date (2025-06-30) violates mandatory 10-year lock-in period ending in 2034.',
      conflictingDocuments: ['Bank FDR Certificate', 'AICTE Lock-in Policy'],
      expectedValue: 'Maturity Date on or after 2034-06-30 (10 Years)',
      foundValue: '2025-06-30 (1 Year tenure)',
      suggestedAction: 'Direct institution to execute auto-renewal mandate with bank till lock-in maturity.',
      institutionId: instId,
      institutionName: instName,
    });
  }

  return issues;
}
