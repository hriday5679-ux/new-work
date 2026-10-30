import { UserRole, User, Institution } from '../types/index.ts';

/**
 * Checks whether a user can view a given institution's record.
 * - Chairman, Director, Accounts, Section Officer, Audit Officer, Portal Admin can view all institutions.
 * - Regional Officer can view only institutions in their assigned region (e.g., "Northern", "Western").
 * - Institution roles can view only their own institution.
 */
export function canUserViewInstitution(user: User | null, inst: Institution): boolean {
  if (!user) return false;
  const role = user.role;

  // Institution users can only view their own institute
  if (
    role === 'INSTITUTION' ||
    role === 'INSTITUTION_HEAD' ||
    role === 'INSTITUTION_REGISTRAR' ||
    role === 'INSTITUTION_ACCOUNTS' ||
    role === 'INSTITUTION_NODAL'
  ) {
    if (!user.institutionId) return false;
    return (
      inst.id === user.institutionId ||
      inst.code === user.institutionId ||
      inst.code === user.instituteCode
    );
  }

  // Regional Officers can only view institutions in their own region
  if (role === 'REGIONAL_OFFICER') {
    if (!user.region) return true; // fallback
    const userReg = user.region.toLowerCase().replace(/[^a-z]/g, '');
    const instReg = (inst.region || '').toLowerCase().replace(/[^a-z]/g, '');
    return instReg.includes(userReg) || userReg.includes(instReg);
  }

  // All other AICTE officers / Admins can view all institutions
  return true;
}

/**
 * Portal Admin cannot view financial documents / sensitive bank amounts.
 */
export function canViewFinancialDetails(user: User | null): boolean {
  if (!user) return false;
  if (user.role === 'PORTAL_ADMIN') {
    return false; // Specifically restricted per AICTE security guidelines
  }
  return true;
}

/**
 * Can the user perform first-level scrutiny (mark verified/missing, update status)?
 * Allowed: Section Officer / Dealing Assistant, Regional Officer, Director, Chairman, Administrator
 */
export function canPerformFirstLevelScrutiny(user: User | null): boolean {
  if (!user) return false;
  return [
    'SECTION_OFFICER',
    'REGIONAL_OFFICER',
    'DIRECTOR_ADVISOR',
    'CHAIRMAN_MEMBER_SECRETARY',
    'ADMINISTRATOR',
  ].includes(user.role);
}

/**
 * Can the user verify documents?
 * Allowed: Section Officer, Regional Officer, Director, Chairman
 */
export function canVerifyDocuments(user: User | null): boolean {
  if (!user) return false;
  return [
    'SECTION_OFFICER',
    'REGIONAL_OFFICER',
    'DIRECTOR_ADVISOR',
    'CHAIRMAN_MEMBER_SECRETARY',
    'ADMINISTRATOR',
  ].includes(user.role);
}

/**
 * Can the user give Regional Officer recommendations?
 */
export function canGiveRecommendations(user: User | null): boolean {
  if (!user) return false;
  return ['REGIONAL_OFFICER', 'ADMINISTRATOR'].includes(user.role);
}

/**
 * Can the user perform second-level review/approval?
 * Allowed: Director / Advisor (Approval Bureau), Chairman, Administrator
 */
export function canSecondLevelApproval(user: User | null): boolean {
  if (!user) return false;
  return ['DIRECTOR_ADVISOR', 'CHAIRMAN_MEMBER_SECRETARY', 'ADMINISTRATOR'].includes(user.role);
}

/**
 * Can the user perform final approve, reject, forfeit, and release actions?
 * Allowed: Chairman / Member Secretary, Administrator
 */
export function canFinalApproveRelease(user: User | null): boolean {
  if (!user) return false;
  return ['CHAIRMAN_MEMBER_SECRETARY', 'ADMINISTRATOR'].includes(user.role);
}

/**
 * Can the user process refunds / disbursements?
 * Allowed: Accounts / Finance Officer, Administrator
 */
export function canProcessRefund(user: User | null): boolean {
  if (!user) return false;
  return ['ACCOUNTS_FINANCE_OFFICER', 'ADMINISTRATOR'].includes(user.role);
}

/**
 * Can the user submit a deposit release request?
 * Allowed: Head of Institution (Principal/Director) only
 */
export function canSubmitReleaseRequest(user: User | null): boolean {
  if (!user) return false;
  return ['INSTITUTION_HEAD', 'INSTITUTION', 'ADMINISTRATOR'].includes(user.role);
}

/**
 * Can the user add FDR and bank details / receipts?
 * Allowed: Institution Accounts Officer, Institution Head, Administrator
 */
export function canAddFDRDetails(user: User | null): boolean {
  if (!user) return false;
  return [
    'INSTITUTION_ACCOUNTS',
    'INSTITUTION_HEAD',
    'INSTITUTION',
    'ACCOUNTS_FINANCE_OFFICER',
    'ADMINISTRATOR',
  ].includes(user.role);
}

/**
 * Can the user upload documents?
 * Allowed: Institution Registrar, Institution Nodal Officer, Institution Head, Accounts Officer
 */
export function canUploadDocuments(user: User | null): boolean {
  if (!user) return false;
  return [
    'INSTITUTION_HEAD',
    'INSTITUTION_REGISTRAR',
    'INSTITUTION_NODAL',
    'INSTITUTION_ACCOUNTS',
    'INSTITUTION',
    'ADMINISTRATOR',
  ].includes(user.role);
}

/**
 * Can manage users and roles, and approve role changes?
 * Allowed: Portal Admin, Administrator
 */
export function canManageUsers(user: User | null): boolean {
  if (!user) return false;
  return ['PORTAL_ADMIN', 'ADMINISTRATOR'].includes(user.role);
}

/**
 * Is this user in read-only audit mode?
 * Audit Officer has read-only access to everything, plus the audit log.
 */
export function isReadOnlyAudit(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'AUDIT_OFFICER';
}
