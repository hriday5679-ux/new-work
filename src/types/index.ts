export const TYPES_LOADED = true;

export type UserRole =
  // AICTE Employee/Officer Roles:
  | 'CHAIRMAN_MEMBER_SECRETARY'
  | 'DIRECTOR_ADVISOR'
  | 'REGIONAL_OFFICER'
  | 'ACCOUNTS_FINANCE_OFFICER'
  | 'SECTION_OFFICER'
  | 'AUDIT_OFFICER'
  | 'PORTAL_ADMIN'
  // Institution Representative Roles:
  | 'INSTITUTION_HEAD'
  | 'INSTITUTION_REGISTRAR'
  | 'INSTITUTION_ACCOUNTS'
  | 'INSTITUTION_NODAL'
  // Compatibility Aliases:
  | 'INSTITUTION'
  | 'ADMINISTRATOR'
  | 'PGRC_OFFICER'
  | 'VIGILANCE_OFFICER'
  | 'GUEST';

export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE';
export type AccountType = 'INSTITUTION' | 'AICTE';
export type UserType = 'AICTE' | 'INSTITUTION';

export interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  userType?: UserType;
  accountType?: AccountType;
  role: UserRole;
  designation: string;
  institutionId?: string;
  institutionName?: string;
  instituteCode?: string;
  region?: string;
  phone?: string;
  avatarUrl?: string;
  photoURL?: string;
  status?: AccountStatus;
  accountStatus?: AccountStatus;
  // Onboarding & Approval workflow
  onboardingComplete?: boolean;
  requestedRole?: UserRole;
  requestedInstitutionId?: string;
  requestedInstitutionName?: string;
  requestedAt?: string;
  rejectionReason?: string;
  employeeId?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt?: string;
}

export interface AccessRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  accountType: AccountType;
  designation: string;
  requestedRole: UserRole;
  requestedInstitutionId?: string;
  requestedInstitutionName?: string;
  region?: string;
  phone?: string;
  employeeId?: string;
  status: AccountStatus;
  rejectionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  grantedRole?: UserRole;
  grantedInstitutionId?: string;
}

export interface RoleChangeRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  currentRole: UserRole;
  targetRole: UserRole;
  targetRegion?: string;
  targetInstitutionId?: string;
  targetInstitutionName?: string;
  targetDesignation: string;
  justification: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export function getRoleDisplayName(role?: UserRole | string): string {
  switch (role) {
    case 'CHAIRMAN_MEMBER_SECRETARY':
      return 'Chairman / Member Secretary';
    case 'DIRECTOR_ADVISOR':
      return 'Director / Advisor (Approval Bureau)';
    case 'REGIONAL_OFFICER':
      return 'Regional Officer';
    case 'ACCOUNTS_FINANCE_OFFICER':
      return 'Accounts / Finance Officer';
    case 'SECTION_OFFICER':
      return 'Section Officer / Dealing Assistant';
    case 'AUDIT_OFFICER':
      return 'Audit Officer';
    case 'PORTAL_ADMIN':
    case 'ADMINISTRATOR':
      return 'Portal Admin';
    case 'INSTITUTION_HEAD':
      return 'Head of Institution (Principal/Director)';
    case 'INSTITUTION_REGISTRAR':
      return 'Registrar';
    case 'INSTITUTION_ACCOUNTS':
      return 'Accounts Officer';
    case 'INSTITUTION_NODAL':
      return 'Nodal Officer';
    case 'INSTITUTION':
      return 'Institution Representative';
    case 'PGRC_OFFICER':
      return 'PGRC Officer';
    case 'VIGILANCE_OFFICER':
      return 'Vigilance Officer';
    default:
      return role || 'Authorized User';
  }
}

export function isInstitutionRole(role?: UserRole | string): boolean {
  if (!role) return false;
  return [
    'INSTITUTION_HEAD',
    'INSTITUTION_REGISTRAR',
    'INSTITUTION_ACCOUNTS',
    'INSTITUTION_NODAL',
    'INSTITUTION',
  ].includes(role);
}

export function isAicteRole(role?: UserRole | string): boolean {
  if (!role) return false;
  return [
    'CHAIRMAN_MEMBER_SECRETARY',
    'DIRECTOR_ADVISOR',
    'REGIONAL_OFFICER',
    'ACCOUNTS_FINANCE_OFFICER',
    'SECTION_OFFICER',
    'AUDIT_OFFICER',
    'PORTAL_ADMIN',
    'ADMINISTRATOR',
    'PGRC_OFFICER',
    'VIGILANCE_OFFICER',
  ].includes(role);
}

export type FDRLifecycleStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DOCUMENT_CHECK'
  | 'UNDER_SCRUTINY'
  | 'DEFICIENCY'
  | 'RESUBMITTED'
  | 'VERIFIED'
  | 'RECOMMENDED'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'MATURED'
  | 'RELEASE_REQUESTED'
  | 'CLEARANCE_PENDING'
  | 'APPROVED'
  | 'NOC_ISSUED'
  | 'RELEASED'
  | 'FORFEITED';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'PENDING_SCRUTINY'
  | 'VERIFIED'
  | 'REJECTED';

export type ReleaseStatus =
  | 'SUBMITTED'
  | 'UNDER_SCRUTINY'
  | 'DEFICIENCY_RAISED'
  | 'CLEARANCE_PENDING'
  | 'APPROVED'
  | 'NOC_ISSUED'
  | 'RELEASED'
  | 'REJECTED';

export type ClearanceState = 'PENDING' | 'APPROVED' | 'REJECTED' | 'OBSERVATION';

export type InstitutionCategory = 'GGSIPU_AFFILIATED' | 'PRIVATE_UNIVERSITY';

export type InstitutionType =
  | 'Engineering & Tech'
  | 'Management'
  | 'Pharmacy'
  | 'Architecture'
  | 'Polytechnic'
  | 'University Department';

export interface Institution {
  id: string;
  name: string;
  code: string; // e.g. "1-9318291011"
  state: string;
  district: string;
  region: 'Northern' | 'North-West' | 'Western' | 'Central' | 'Eastern' | 'Southern' | 'South-West';
  type: InstitutionType | string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  approvalStatus: 'APPROVED' | 'CONDITIONAL' | 'DEFICIENCY' | 'UNDER_REVIEW';
  establishmentYear: number;
  totalDepositAmount: number;
  category: InstitutionCategory;
  categoryLabel: string;
  isAffiliationVerified: boolean;
  affiliationStatus: string;
  isDemoReference: boolean;
  programmes?: string;
  documents?: DocumentAttachment[];
  timeline?: Array<{
    id: string;
    timestamp: string;
    actor: string;
    role: string;
    action: string;
    details: string;
  }>;
}

export type DocumentType =
  | 'FDR_RECEIPT'
  | 'LOA_EOA'
  | 'BANK_LIEN_CONFIRMATION'
  | 'AFFIDAVIT'
  | 'TRUST_REGISTRATION_CERT'
  | 'BOARD_RESOLUTION'
  | 'RELEASE_APPLICATION'
  | 'NO_DUES_CERT'
  | 'CANCELLED_CHEQUE_MANDATE'
  | 'AUDITED_FINANCIAL_SUMMARY'
  | 'REQUEST_LETTER'
  | 'PAYMENT_PROOF'
  | 'CLEARANCE_DOC'
  | 'JOINT_AGREEMENT'
  | 'ENCUMBRANCE_CERT'
  | 'OTHER';

export type HealthCheckSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface HealthCheckIssue {
  id: string;
  severity: HealthCheckSeverity;
  category: 'MISSING_DOCUMENT' | 'AMOUNT_MISMATCH' | 'NAME_MISMATCH' | 'LIEN_DEFECT' | 'EXPIRATION' | 'SIGNATORY';
  title: string;
  description: string;
  conflictingDocuments?: string[];
  expectedValue?: string;
  foundValue?: string;
  suggestedAction: string;
  institutionId: string;
  institutionName: string;
  resolved?: boolean;
}

export interface DocumentAttachment {
  id: string;
  type: DocumentType;
  name: string;
  url?: string;
  fileSize: string;
  uploadDate: string;
  uploadedBy: string;
  verified: boolean;
  reviewStatus?: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  ocrConfidence?: number;
  notes?: string;
  fileData?: string; // Data URL / Base64 for viewing preview
}

export interface DeficiencyNote {
  id: string;
  fdrId: string;
  raisedBy: string;
  raisedByRole: UserRole;
  raisedDate: string;
  title: string;
  description: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedBy?: string;
  resolvedDate?: string;
  resolutionRemarks?: string;
}

export interface OfficerRemark {
  id: string;
  author: string;
  role: UserRole;
  date: string;
  category: 'SCRUTINY' | 'VERIFICATION' | 'PGRC' | 'VIGILANCE' | 'GENERAL';
  comment: string;
}

export interface ExtractedOCRData {
  institutionName?: string;
  fdrNumber?: string;
  bankName?: string;
  branchName?: string;
  ifscCode?: string;
  principalAmount?: number;
  interestRate?: number;
  maturityValue?: number;
  issueDate?: string;
  maturityDate?: string;
  jointHolderName?: string;
  confidenceScore: number;
  isSimulatedDemo?: boolean;
  demoNote?: string;
  extractedAt: string;
  comparisonResults?: Array<{
    field: string;
    databaseValue: string | number;
    extractedValue: string | number;
    isMatch: boolean;
  }>;
}

export interface FDRRecord {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  fdrNumber: string;
  bankName: string;
  branchName: string;
  ifscCode: string;
  principalAmount: number;
  interestRate: number;
  maturityValue: number;
  issueDate: string; // YYYY-MM-DD
  maturityDate: string; // YYYY-MM-DD
  jointHolderName: string; // e.g. "Regional Officer, AICTE & Principal"
  purpose: 'Establishment of New Institution' | 'Additional Intake / New Programme' | 'Endowment Security' | 'Course Conversion' | string;
  lifecycleStatus: FDRLifecycleStatus;
  verificationStatus: VerificationStatus;
  documents: DocumentAttachment[];
  extractedData?: ExtractedOCRData;
  deficiencyNotes: DeficiencyNote[];
  officerRemarks: OfficerRemark[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  category?: InstitutionCategory;
  isDemoData?: boolean;
  isDemoReference?: boolean;
  demoNote?: string;
  // Dynamic maturity flags computed relative to current simulated date:
  daysToMaturity?: number;
  isMatured?: boolean;
  isExpiringSoon?: boolean; // <= 90 days
  isUrgentExpiring?: boolean; // <= 30 days
  isCriticalExpiring?: boolean; // <= 7 days
}

export interface ReleaseChecklistItem {
  uploaded: boolean;
  verified: boolean;
  documentId?: string;
  fileName?: string;
  fileData?: string;
}

export interface ReleaseChecklist {
  noDuesCertificate: ReleaseChecklistItem;
  aicteApprovalLetter: ReleaseChecklistItem;
  originalFdrSurrenderAffidavit: ReleaseChecklistItem;
  governingBodyResolution: ReleaseChecklistItem;
  studentGrievanceClearRecord: ReleaseChecklistItem;
}

export interface ClearanceItem {
  status: ClearanceState;
  officerName?: string;
  role: UserRole;
  date?: string;
  remarks?: string;
  referenceNo?: string;
}

export interface ReleaseRequest {
  id: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  principalAmount: number;
  bankName: string;
  reason: 'Course Closure' | 'Reduction in Intake' | 'Tenure Completion (10+ Years)' | 'Conversion of Institution' | string;
  status: ReleaseStatus;
  submittedDate: string;
  submittedBy: string;
  checklist: ReleaseChecklist;
  clearances: {
    regionalOfficer: ClearanceItem;
    pgrc: ClearanceItem & { pendingGrievanceCount: number };
    vigilance: ClearanceItem & { inquiryStatus: 'CLEAR' | 'UNDER_INQUIRY' | 'CLOSED' };
  };
  finalApproval?: {
    approvedBy: string;
    approvedRole: UserRole;
    approvedDate: string;
    remarks: string;
    nocReferenceNumber: string;
    nocDispatchDate?: string;
  };
  disbursement?: {
    date: string;
    referenceNo: string;
    bankTransactionId: string;
    disbursedBy: string;
    remarks: string;
  };
  timeline: Array<{
    id: string;
    timestamp: string;
    actor: string;
    role: UserRole | string;
    action: string;
    remarks: string;
  }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole | string;
  action: string;
  entityType: 'FDR' | 'RELEASE' | 'INSTITUTION' | 'DOCUMENT' | 'SYSTEM' | 'TIME_SIMULATOR' | 'SETTINGS' | 'USER';
  entityId: string;
  entityLabel: string;
  details: string;
  ipAddress: string;
}

export interface AppNotification {
  id: string;
  targetRole: UserRole | 'ALL';
  targetInstitutionId?: string;
  title: string;
  message: string;
  type: 'MATURITY_WARNING' | 'DEFICIENCY' | 'CLEARANCE_REQUEST' | 'STATUS_CHANGE' | 'SYSTEM' | 'RELEASE_APPROVED';
  read: boolean;
  timestamp: string;
  linkId?: string;
  linkType?: 'FDR' | 'RELEASE' | 'INSTITUTION';
}

export interface MaturityThresholds {
  criticalDays: number; // default 7
  urgentDays: number;   // default 30
  upcomingDays: number; // default 90
}

export interface SystemConfig {
  maturityThresholds: MaturityThresholds;
  banksList: string[];
  autoAlertsEnabled: boolean;
  allowDemoDateSimulation: boolean;
}

export interface DashboardMetrics {
  totalInstitutions: number;
  totalAffiliatedColleges: number;
  totalPrivateUniversities: number;
  totalFDRs: number;
  totalDepositValue: number;
  activeFDRs: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  expiringIn90Days: number;
  maturedFDRs: number;
  pendingVerification: number;
  deficienciesCount: number;
  pendingReleaseRequests: number;
  pendingClearances: {
    ro: number;
    pgrc: number;
    vigilance: number;
  };
  releasedFDRs: number;
}
