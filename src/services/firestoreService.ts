import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase.ts';
import {
  User,
  Institution,
  FDRRecord,
  DocumentAttachment,
  ReleaseRequest,
  AuditLog,
  AccessRequest,
  RoleChangeRequest,
  UserRole,
} from '../types/index.ts';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(errInfo.error);
}

// --- User Profile Service ---

export async function getUserProfile(uid: string): Promise<User | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return { id: uid, ...snap.data() } as User;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function createUserInitialProfile(
  uid: string,
  data: { name: string; email: string }
): Promise<User> {
  const path = `users/${uid}`;
  try {
    const userDoc: Record<string, any> = {
      name: data.name || 'Authorized Representative',
      email: data.email || '',
      role: 'INSTITUTION',
      institutionId: '',
      institutionName: '',
      designation: '',
      phone: '',
      region: 'Northern',
      createdAt: new Date().toISOString(),
      onboardingComplete: false,
      accountStatus: 'PENDING',
    };
    await setDoc(doc(db, 'users', uid), userDoc, { merge: true });
    return { id: uid, ...userDoc } as User;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function createUserProfile(
  uid: string,
  profile: {
    name: string;
    email: string;
    institutionId: string;
    institutionName: string;
    designation: string;
    phone: string;
  }
): Promise<User> {
  const path = `users/${uid}`;
  try {
    const userDoc: Record<string, any> = {
      name: profile.name,
      email: profile.email,
      role: 'INSTITUTION', // Self-registered users are ALWAYS role = 'INSTITUTION'
      institutionId: '', // Strictly empty until Admin approves
      institutionName: '',
      requestedRole: 'INSTITUTION',
      requestedInstitutionId: profile.institutionId,
      requestedInstitutionName: profile.institutionName,
      accountType: 'INSTITUTION',
      accountStatus: 'PENDING',
      designation: profile.designation,
      phone: profile.phone,
      region: 'Northern',
      createdAt: new Date().toISOString(),
      onboardingComplete: true,
      requestedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', uid), userDoc);

    // Also write to accessRequests queue
    await setDoc(doc(db, 'accessRequests', uid), {
      userId: uid,
      userName: profile.name,
      userEmail: profile.email,
      accountType: 'INSTITUTION',
      designation: profile.designation,
      requestedRole: 'INSTITUTION',
      requestedInstitutionId: profile.institutionId,
      requestedInstitutionName: profile.institutionName,
      phone: profile.phone,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    });

    return { id: uid, ...userDoc } as User;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function submitAccessRequest(
  uid: string,
  requestData: {
    name: string;
    accountType: 'INSTITUTION' | 'AICTE';
    designation: string;
    requestedRole: UserRole;
    requestedInstitutionId?: string;
    requestedInstitutionName?: string;
    region?: string;
    phone?: string;
    employeeId?: string;
  }
): Promise<User> {
  const path = `users/${uid}`;
  try {
    const now = new Date().toISOString();
    const isInstitution = requestData.accountType === 'INSTITUTION';

    const updates: Record<string, any> = {
      name: requestData.name,
      accountType: requestData.accountType,
      accountStatus: isInstitution ? 'APPROVED' : 'PENDING',
      requestedRole: requestData.requestedRole,
      requestedInstitutionId: requestData.requestedInstitutionId || '',
      requestedInstitutionName: requestData.requestedInstitutionName || '',
      designation: requestData.designation,
      phone: requestData.phone || '',
      employeeId: requestData.employeeId || '',
      region: requestData.region || 'Northern',
      onboardingComplete: true,
      requestedAt: now,
      institutionId: isInstitution ? (requestData.requestedInstitutionId || '') : '',
      institutionName: isInstitution ? (requestData.requestedInstitutionName || '') : '',
      role: 'INSTITUTION', // Strictly non-privileged standard role
    };

    if (isInstitution) {
      updates.approvedAt = now;
      updates.approvedBy = 'SYSTEM_INSTITUTION_WORKSPACE';
    }

    await updateDoc(doc(db, 'users', uid), updates);

    // If AICTE officer, write to accessRequests collection for Administrator approval queue
    if (!isInstitution) {
      await setDoc(doc(db, 'accessRequests', uid), {
        userId: uid,
        userName: requestData.name,
        userEmail: auth.currentUser?.email || '',
        accountType: requestData.accountType,
        designation: requestData.designation,
        requestedRole: requestData.requestedRole,
        requestedInstitutionId: requestData.requestedInstitutionId || '',
        requestedInstitutionName: requestData.requestedInstitutionName || '',
        region: requestData.region || 'Northern',
        phone: requestData.phone || '',
        employeeId: requestData.employeeId || '',
        status: 'PENDING',
        submittedAt: now,
      });
    }

    await logAuditEvent({
      userId: uid,
      userName: requestData.name,
      role: 'INSTITUTION',
      action: isInstitution ? 'INSTITUTION_WORKSPACE_ACTIVATED' : 'ACCESS_REQUEST_SUBMITTED',
      entityType: 'USER',
      entityId: uid,
      details: isInstitution
        ? `Activated institution workspace for ${requestData.requestedInstitutionName}.`
        : `Submitted request for AICTE ${requestData.designation} role.`,
    });

    const snap = await getDoc(doc(db, 'users', uid));
    return { id: uid, ...snap.data() } as User;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function getAccessRequestsList(): Promise<AccessRequest[]> {
  const path = 'accessRequests';
  try {
    const snap = await getDocs(collection(db, 'accessRequests'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AccessRequest));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function approveFirestoreAccessRequest(
  userId: string,
  approval: {
    role: UserRole;
    institutionId?: string;
    institutionName?: string;
    adminName: string;
  }
): Promise<void> {
  const userPath = `users/${userId}`;
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'users', userId), {
      accountStatus: 'APPROVED',
      role: approval.role,
      institutionId: approval.institutionId || '',
      institutionName: approval.institutionName || '',
      approvedBy: approval.adminName,
      approvedAt: now,
    });

    await updateDoc(doc(db, 'accessRequests', userId), {
      status: 'APPROVED',
      reviewedAt: now,
      reviewedBy: approval.adminName,
      grantedRole: approval.role,
    });

    await logAuditEvent({
      userId: auth.currentUser?.uid || 'admin',
      userName: approval.adminName,
      role: 'ADMINISTRATOR',
      action: 'ACCESS_REQUEST_APPROVED',
      entityType: 'USER',
      entityId: userId,
      details: `Approved access for user. Assigned role ${approval.role} and institution ${approval.institutionName || 'AICTE Officer'}.`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }
}

export async function rejectFirestoreAccessRequest(
  userId: string,
  reason: string,
  adminName: string
): Promise<void> {
  const userPath = `users/${userId}`;
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'users', userId), {
      accountStatus: 'REJECTED',
      rejectionReason: reason,
      reviewedAt: now,
      reviewedBy: adminName,
    });

    await updateDoc(doc(db, 'accessRequests', userId), {
      status: 'REJECTED',
      rejectionReason: reason,
      reviewedAt: now,
      reviewedBy: adminName,
    });

    await logAuditEvent({
      userId: auth.currentUser?.uid || 'admin',
      userName: adminName,
      role: 'ADMINISTRATOR',
      action: 'ACCESS_REQUEST_REJECTED',
      entityType: 'USER',
      entityId: userId,
      details: `Rejected access request: "${reason}"`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, userPath);
  }
}

export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<User, 'name' | 'designation' | 'phone'>>
): Promise<void> {
  const path = `users/${uid}`;
  try {
    // Exclude role, institutionId, and accountStatus to prevent privilege escalation
    const safeUpdates: Record<string, any> = {};
    if (updates.name !== undefined) safeUpdates.name = updates.name;
    if (updates.designation !== undefined) safeUpdates.designation = updates.designation;
    if (updates.phone !== undefined) safeUpdates.phone = updates.phone;

    await updateDoc(doc(db, 'users', uid), safeUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/**
 * Saves or completes the user profile in Firestore
 * Stores: uid, name, email, userType, role, region, institutionId, status
 */
export async function saveCompleteUserProfile(
  uid: string,
  profileData: Partial<User>
): Promise<User> {
  const path = `users/${uid}`;
  try {
    const cleanUser: Record<string, any> = {
      id: uid,
      uid,
      name: profileData.name || 'Authorized User',
      email: profileData.email || '',
      userType: profileData.userType || (profileData.accountType || 'INSTITUTION'),
      accountType: profileData.accountType || profileData.userType || 'INSTITUTION',
      role: profileData.role || 'INSTITUTION',
      designation: profileData.designation || '',
      region: profileData.region || 'Northern',
      institutionId: profileData.institutionId || '',
      institutionName: profileData.institutionName || '',
      instituteCode: profileData.instituteCode || profileData.institutionId || '',
      phone: profileData.phone || '',
      status: profileData.status || profileData.accountStatus || 'ACTIVE',
      accountStatus: profileData.accountStatus || profileData.status || 'ACTIVE',
      onboardingComplete: true,
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', uid), cleanUser, { merge: true });

    // Also update Institute Account reverse-lookup index if institutionId exists
    if (cleanUser.instituteCode || cleanUser.institutionId) {
      const idxKey = (cleanUser.instituteCode || cleanUser.institutionId).replace(/[^a-zA-Z0-9_-]/g, '_');
      try {
        await setDoc(
          doc(db, 'instituteAccounts', idxKey),
          {
            instituteId: cleanUser.institutionId,
            instituteCode: cleanUser.instituteCode,
            email: cleanUser.email,
            institutionName: cleanUser.institutionName,
            designation: cleanUser.designation,
            role: cleanUser.role,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (idxErr) {
        console.warn('Institute account index write notice:', idxErr);
      }
    }

    await logAuditEvent({
      userId: uid,
      userName: cleanUser.name,
      role: cleanUser.role,
      action: 'PROFILE_UPDATED',
      entityType: 'USER',
      entityId: uid,
      details: `Profile updated with role ${cleanUser.role} and designation ${cleanUser.designation}.`,
    });

    return cleanUser as User;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

/**
 * Look up the linked contact email for an Institute ID in Firestore
 */
export async function lookupEmailByInstituteId(instituteId: string): Promise<string | null> {
  const cleanId = instituteId.trim();
  if (!cleanId) return null;

  try {
    // 1. Check instituteAccounts index collection first
    const safeKey = cleanId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const idxSnap = await getDoc(doc(db, 'instituteAccounts', safeKey));
    if (idxSnap.exists() && idxSnap.data()?.email) {
      return idxSnap.data().email;
    }

    // 2. Query users collection where instituteCode == cleanId or institutionId == cleanId
    const q1 = query(collection(db, 'users'), where('instituteCode', '==', cleanId), limit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty && snap1.docs[0].data()?.email) {
      return snap1.docs[0].data().email;
    }

    const q2 = query(collection(db, 'users'), where('institutionId', '==', cleanId), limit(1));
    const snap2 = await getDocs(q2);
    if (!snap2.empty && snap2.docs[0].data()?.email) {
      return snap2.docs[0].data().email;
    }

    // 3. Fallback: check institutions collection
    const instSnap = await getDoc(doc(db, 'institutions', cleanId));
    if (instSnap.exists() && instSnap.data()?.email) {
      return instSnap.data().email;
    }

    // 4. Fallback check local Express API
    try {
      const res = await fetch(`/api/institutions/${encodeURIComponent(cleanId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.institution?.email) {
          return data.institution.email;
        }
      }
    } catch {}

    return null;
  } catch (err) {
    console.warn('Institute ID lookup error:', err);
    return null;
  }
}

/**
 * Checks if a user is already registered for this Institute ID with the same designation.
 * Prevents duplicate registrations (e.g. one Head of Institution per institute).
 */
export async function checkInstituteDesignationConflict(
  instituteId: string,
  designation: string
): Promise<{ exists: boolean; message?: string }> {
  const cleanId = instituteId.trim();
  const cleanDesig = designation.trim().toLowerCase();

  try {
    // Search users collection for matches
    const q = query(
      collection(db, 'users'),
      where('instituteCode', '==', cleanId),
      limit(10)
    );
    const snap = await getDocs(q);

    for (const d of snap.docs) {
      const data = d.data();
      const existingDesig = (data.designation || '').toLowerCase();
      const existingRole = data.role || '';

      const isBothHead =
        (cleanDesig.includes('head') || cleanDesig.includes('principal') || cleanDesig.includes('director')) &&
        (existingDesig.includes('head') || existingDesig.includes('principal') || existingDesig.includes('director') || existingRole === 'INSTITUTION_HEAD');

      if (isBothHead) {
        return {
          exists: true,
          message:
            'A Head of Institution (Principal/Director) account already exists for this Institute ID. Only one Head of Institution is permitted per institution unless approved by the Portal Admin.',
        };
      }

      if (cleanDesig === existingDesig) {
        return {
          exists: true,
          message: `An account with designation "${data.designation}" is already registered for this Institute ID.`,
        };
      }
    }

    return { exists: false };
  } catch (err) {
    console.warn('Conflict check error (proceeding cautiously):', err);
    return { exists: false };
  }
}

/**
 * Submits a role change request from /profile to be approved by Portal Admin
 */
export async function submitRoleChangeRequest(request: {
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
}): Promise<void> {
  const path = 'roleChangeRequests';
  const now = new Date().toISOString();
  try {
    const docData: RoleChangeRequest = {
      id: `${request.userId}_${Date.now()}`,
      userId: request.userId,
      userName: request.userName,
      userEmail: request.userEmail,
      currentRole: request.currentRole,
      targetRole: request.targetRole,
      targetRegion: request.targetRegion || '',
      targetInstitutionId: request.targetInstitutionId || '',
      targetInstitutionName: request.targetInstitutionName || '',
      targetDesignation: request.targetDesignation,
      justification: request.justification,
      status: 'PENDING',
      submittedAt: now,
    };

    await setDoc(doc(db, 'roleChangeRequests', docData.id), docData);

    await logAuditEvent({
      userId: request.userId,
      userName: request.userName,
      role: request.currentRole,
      action: 'ROLE_CHANGE_REQUESTED',
      entityType: 'USER',
      entityId: request.userId,
      details: `Requested role change from ${request.currentRole} to ${request.targetRole}. Reason: ${request.justification}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getRoleChangeRequestsList(): Promise<RoleChangeRequest[]> {
  const path = 'roleChangeRequests';
  try {
    const snap = await getDocs(collection(db, 'roleChangeRequests'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as RoleChangeRequest));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function approveRoleChangeRequest(
  requestId: string,
  adminName: string
): Promise<void> {
  const path = `roleChangeRequests/${requestId}`;
  const now = new Date().toISOString();
  try {
    const reqSnap = await getDoc(doc(db, 'roleChangeRequests', requestId));
    if (!reqSnap.exists()) throw new Error('Role change request not found');

    const reqData = reqSnap.data() as RoleChangeRequest;

    // Update target user's profile
    await updateDoc(doc(db, 'users', reqData.userId), {
      role: reqData.targetRole,
      designation: reqData.targetDesignation,
      region: reqData.targetRegion || '',
      institutionId: reqData.targetInstitutionId || '',
      institutionName: reqData.targetInstitutionName || '',
      approvedBy: adminName,
      approvedAt: now,
    });

    // Update request status
    await updateDoc(doc(db, 'roleChangeRequests', requestId), {
      status: 'APPROVED',
      reviewedAt: now,
      reviewedBy: adminName,
    });

    await logAuditEvent({
      userId: auth.currentUser?.uid || 'admin',
      userName: adminName,
      role: 'PORTAL_ADMIN',
      action: 'ROLE_CHANGE_APPROVED',
      entityType: 'USER',
      entityId: reqData.userId,
      details: `Approved role change for ${reqData.userName} (${reqData.userEmail}) to ${reqData.targetRole}.`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function rejectRoleChangeRequest(
  requestId: string,
  reason: string,
  adminName: string
): Promise<void> {
  const path = `roleChangeRequests/${requestId}`;
  const now = new Date().toISOString();
  try {
    await updateDoc(doc(db, 'roleChangeRequests', requestId), {
      status: 'REJECTED',
      rejectionReason: reason,
      reviewedAt: now,
      reviewedBy: adminName,
    });

    await logAuditEvent({
      userId: auth.currentUser?.uid || 'admin',
      userName: adminName,
      role: 'PORTAL_ADMIN',
      action: 'ROLE_CHANGE_REJECTED',
      entityType: 'USER',
      entityId: requestId,
      details: `Rejected role change request. Reason: ${reason}`,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Institutions Service ---

export async function createPendingInstitution(
  data: {
    name: string;
    state?: string;
    region?: string;
    category?: 'GGSIPU_AFFILIATED' | 'PRIVATE_UNIVERSITY' | 'OTHER';
    address?: string;
  },
  uid?: string
): Promise<Institution> {
  const path = 'institutions';
  const effectiveUid = uid || auth.currentUser?.uid || 'anonymous';
  try {
    const code = `PEND-${Math.floor(100000 + Math.random() * 900000)}`;
    const instDoc = {
      name: data.name.trim(),
      code,
      state: data.state || 'Delhi',
      district: '',
      region: (data.region as any) || 'Northern',
      type: 'Engineering & Tech',
      address: data.address || '',
      approvalStatus: 'PENDING_REVIEW',
      establishmentYear: new Date().getFullYear(),
      category: data.category || 'OTHER',
      categoryLabel: 'Pending AICTE Verification',
      isAffiliationVerified: false,
      affiliationStatus: 'Affiliation requires verification',
      contactPerson: 'Authorized Signatory',
      email: '',
      phone: '',
      isPendingReview: true,
      createdByUid: effectiveUid,
      createdAt: new Date().toISOString(),
      totalDepositAmount: 0,
      activeFdrCount: 0,
      isDemoReference: false,
    };

    const docRef = await addDoc(collection(db, 'institutions'), instDoc);
    return { id: docRef.id, ...instDoc } as unknown as Institution;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getFirestoreInstitution(institutionId: string): Promise<Institution | null> {
  const path = `institutions/${institutionId}`;
  try {
    const snap = await getDoc(doc(db, 'institutions', institutionId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Institution;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

// --- FDRs Service ---

export async function getFDRsForUser(institutionId: string, isOfficer: boolean): Promise<FDRRecord[]> {
  const path = 'fdrs';
  try {
    if (!isOfficer && (!institutionId || institutionId.trim() === '')) {
      return [];
    }
    let q;
    if (isOfficer) {
      q = query(collection(db, 'fdrs'));
    } else {
      q = query(collection(db, 'fdrs'), where('institutionId', '==', institutionId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FDRRecord));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createFirestoreFDR(fdrData: Partial<FDRRecord>, uid: string): Promise<FDRRecord> {
  const path = 'fdrs';
  try {
    const record = {
      ...fdrData,
      createdByUid: uid,
      createdAt: new Date().toISOString(),
      isDemoData: false,
    };
    const docRef = await addDoc(collection(db, 'fdrs'), record);
    return { id: docRef.id, ...record } as FDRRecord;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// --- Documents Vault Service ---

export async function getDocumentsForUser(institutionId: string, isOfficer: boolean): Promise<any[]> {
  const path = 'documents';
  try {
    if (!isOfficer && (!institutionId || institutionId.trim() === '')) {
      return [];
    }
    let q;
    if (isOfficer) {
      q = query(collection(db, 'documents'));
    } else {
      q = query(collection(db, 'documents'), where('institutionId', '==', institutionId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function saveDocumentMetadata(docData: any, uid: string): Promise<any> {
  const path = 'documents';
  try {
    const record = {
      ...docData,
      uploadedByUid: uid,
      uploadedAt: new Date().toISOString(),
      isDemoData: false,
    };
    const docRef = await addDoc(collection(db, 'documents'), record);
    return { id: docRef.id, ...record };
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteDocumentMetadata(docId: string): Promise<void> {
  const path = `documents/${docId}`;
  try {
    await deleteDoc(doc(db, 'documents', docId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Release Requests Service ---

export async function getReleaseRequestsForUser(institutionId: string, isOfficer: boolean): Promise<ReleaseRequest[]> {
  const path = 'releases';
  try {
    if (!isOfficer && (!institutionId || institutionId.trim() === '')) {
      return [];
    }
    let q;
    if (isOfficer) {
      q = query(collection(db, 'releases'));
    } else {
      q = query(collection(db, 'releases'), where('institutionId', '==', institutionId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ReleaseRequest));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createFirestoreReleaseRequest(data: any, uid: string): Promise<ReleaseRequest> {
  const path = 'releases';
  try {
    const record = {
      ...data,
      submittedByUid: uid,
      createdAt: new Date().toISOString(),
      isDemoData: false,
    };
    const docRef = await addDoc(collection(db, 'releases'), record);
    return { id: docRef.id, ...record } as ReleaseRequest;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// --- Append-Only Audit Log Service ---

export async function logAuditEvent(event: {
  userId: string;
  userName: string;
  role: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  details?: string;
}): Promise<void> {
  const path = 'auditLogs';
  try {
    await addDoc(collection(db, 'auditLogs'), {
      ...event,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Non-blocking log write failure
    console.warn('Audit log write warning:', err);
  }
}
