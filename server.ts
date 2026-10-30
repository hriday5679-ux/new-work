import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/server/db.ts';
import { queryDirectory } from './src/server/directoryManager.ts';
import { DEMO_CASES_CATALOG } from './src/data/fictionalDemoData.ts';
import { getRequiredChecklistForType, runDocumentHealthCheck } from './src/utils/healthCheck.ts';
import { renderDocumentTemplate } from './src/utils/documentTemplates.ts';
import type {
  UserRole,
  User,
  Institution,
  FDRRecord,
  ReleaseRequest,
  AuditLog,
  AppNotification,
  FDRLifecycleStatus,
} from './src/types/index.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Configure disk storage for real document uploads
const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max limit
});

// Initialize Gemini SDK if API key is present
let geminiAi: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
  try {
    geminiAi = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (e) {
    console.warn('Gemini AI initialization notice:', e);
  }
}

// Current active session: null by default (Dr. Rajiv K. Sharma / MAIT is ONLY used inside Demo Mode)
let currentSessionUser: User | null = null;


// Middleware to inject user into request
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userIdHeader = req.headers['x-user-id'] as string;
  const userRoleHeader = req.headers['x-user-role'] as string;

  if (userIdHeader && userRoleHeader) {
    const userInstHeader = (req.headers['x-user-institution'] as string) || '';
    const userNameHeader = (req.headers['x-user-name'] as string) || '';
    const userInstName = (req.headers['x-user-institution-name'] as string) || '';
    const userDesignation = (req.headers['x-user-designation'] as string) || '';
    const userEmail = (req.headers['x-user-email'] as string) || '';
    const userRegion = (req.headers['x-user-region'] as any) || 'Northern';

    (req as any).user = {
      id: userIdHeader,
      name: userNameHeader ? decodeURIComponent(userNameHeader) : 'Authorized Signatory',
      email: userEmail,
      role: userRoleHeader as UserRole,
      designation: userDesignation ? decodeURIComponent(userDesignation) : 'Authorized Representative',
      institutionId: userInstHeader,
      institutionName: userInstName ? decodeURIComponent(userInstName) : '',
      region: userRegion,
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer user-')) {
    const userId = authHeader.replace('Bearer ', '');
    const user = db.getUserById(userId);
    if (user) {
      (req as any).user = user;
      return next();
    }
  }
  (req as any).user = currentSessionUser;
  next();
};

// Role enforcement middleware helper
const requireRoles = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as User;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
        error: `Forbidden: Action requires ${roles.join(' or ')} permission. Current role: ${user?.role || 'Guest'}`,
        requiredRoles: roles,
        currentRole: user?.role,
      });
    }
    next();
  };
};

const api = express.Router();
api.use(authMiddleware);

// --- Auth Endpoints ---
api.get('/auth/current', (req: Request, res: Response) => {
  res.json({
    user: (req as any).user,
    availableUsers: db.getUsers(),
  });
});

api.post('/auth/login', (req: Request, res: Response) => {
  const { email, role } = req.body;
  const user = role
    ? db.getUsers().find((u: User) => u.role === role)
    : db.getUserByEmail(email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid AICTE credentials. Please choose an authorized demo persona.' });
  }

  currentSessionUser = { ...user };

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'USER_LOGIN',
    entityType: 'SYSTEM',
    entityId: user.id,
    entityLabel: `${user.name} (${user.role})`,
    details: `Successful authentication to AICTE FDR360 portal as ${user.designation}.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({
    token: `token-${user.id}`,
    user: currentSessionUser,
  });
});

api.post('/auth/switch-role', (req: Request, res: Response) => {
  const { role, userId } = req.body;
  let targetUser = userId
    ? db.getUserById(userId)
    : db.getUsers().find((u: User) => u.role === role);

  if (!targetUser && role) {
    targetUser = db.getUsers().find((u: User) => u.role === role);
  }

  if (!targetUser) {
    return res.status(404).json({ error: 'Target persona not found.' });
  }

  currentSessionUser = { ...targetUser };

  db.addAuditLog({
    userId: targetUser.id,
    userName: targetUser.name,
    role: targetUser.role,
    action: 'PERSONA_SWITCH',
    entityType: 'SYSTEM',
    entityId: targetUser.id,
    entityLabel: `Switched to ${targetUser.role}`,
    details: `Demonstration persona switched to ${targetUser.name} (${targetUser.designation}).`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({ user: currentSessionUser });
});

api.post('/auth/logout', (req: Request, res: Response) => {
  currentSessionUser = null;
  res.json({ success: true, message: 'Logged out successfully.' });
});

api.post('/auth/session', (req: Request, res: Response) => {
  const { user } = req.body;
  if (user) {
    currentSessionUser = {
      id: user.id,
      name: user.name || 'Authorized Signatory',
      email: user.email || '',
      role: user.role || 'INSTITUTION',
      designation: user.designation || 'Authorized Representative',
      institutionId: user.institutionId || '',
      institutionName: user.institutionName || '',
      region: user.region || 'Northern',
      accountStatus: user.accountStatus,
      accountType: user.accountType,
      onboardingComplete: user.onboardingComplete,
      requestedRole: user.requestedRole,
      requestedInstitutionId: user.requestedInstitutionId,
      requestedInstitutionName: user.requestedInstitutionName,
    };
  } else {
    currentSessionUser = null;
  }
  res.json({ success: true, user: currentSessionUser });
});

// --- Access Requests Management ---
api.get('/access-requests', (req: Request, res: Response) => {
  const { status } = req.query;
  let requests = db.getAccessRequests();
  if (status && status !== 'ALL') {
    requests = requests.filter(r => r.status === status);
  }
  res.json({ requests, total: requests.length });
});

api.post('/access-requests', (req: Request, res: Response) => {
  const record = db.addAccessRequest(req.body);
  const user = (req as any).user;
  db.addAuditLog({
    userId: req.body.userId || user?.id || 'sys',
    userName: req.body.userName || user?.name || 'Applicant',
    role: 'INSTITUTION',
    action: 'ACCESS_REQUEST_SUBMITTED',
    entityType: 'USER',
    entityId: record.id,
    entityLabel: `${record.userName} (${record.designation})`,
    details: `User submitted ${record.accountType} onboarding access request. Role: ${record.requestedRole}.`,
    ipAddress: req.ip || '127.0.0.1',
  });
  res.status(201).json(record);
});

api.post('/access-requests/:id/approve', requireRoles(['ADMINISTRATOR']), (req: Request, res: Response) => {
  const { role, institutionId, institutionName, adminName } = req.body;
  const adminUser = (req as any).user;
  const result = db.approveAccessRequest(req.params.id, {
    role,
    institutionId,
    institutionName,
    adminName: adminName || adminUser?.name || 'Administrator',
  });

  if (!result.request) {
    return res.status(404).json({ error: 'Access request not found.' });
  }

  db.addAuditLog({
    userId: adminUser?.id || 'admin',
    userName: adminName || adminUser?.name || 'Administrator',
    role: 'ADMINISTRATOR',
    action: 'ACCESS_REQUEST_APPROVED',
    entityType: 'USER',
    entityId: result.request.userId || req.params.id,
    entityLabel: `${result.request.userName} -> ${result.request.grantedRole || result.user?.role}`,
    details: `Approved access request. Granted role ${result.user?.role || role} and institution ${result.user?.institutionName || 'AICTE Officer'}.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({ success: true, ...result });
});

api.post('/access-requests/:id/reject', requireRoles(['ADMINISTRATOR']), (req: Request, res: Response) => {
  const { reason, adminName } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Rejection reason is required.' });
  }
  const adminUser = (req as any).user;
  const rejected = db.rejectAccessRequest(
    req.params.id,
    reason.trim(),
    adminName || adminUser?.name || 'Administrator'
  );

  if (!rejected) {
    return res.status(404).json({ error: 'Access request not found.' });
  }

  db.addAuditLog({
    userId: adminUser?.id || 'admin',
    userName: adminName || adminUser?.name || 'Administrator',
    role: 'ADMINISTRATOR',
    action: 'ACCESS_REQUEST_REJECTED',
    entityType: 'USER',
    entityId: rejected.userId || req.params.id,
    entityLabel: `${rejected.userName} (Rejected)`,
    details: `Rejected access request: "${reason}"`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({ success: true, request: rejected });
});

api.post('/auth/register', (req: Request, res: Response) => {
  const { institutionName, email, authorizedSignatoryName } = req.body;
  if (!institutionName || !email || !authorizedSignatoryName) {
    return res.status(400).json({ error: 'Institution Name, Authorized Signatory, and Official Email are mandatory.' });
  }

  // Check if institution already registered with exact same name
  const existingInst = db.getInstitutions().find(
    i => i.name.trim().toLowerCase() === institutionName.trim().toLowerCase()
  );
  if (existingInst) {
    return res.status(409).json({
      error: `An institution named "${institutionName}" is already registered (Code: ${existingInst.code}). Please sign in or use an authorized account.`,
    });
  }

  const result = db.registerInstitutionAndUser(req.body);
  currentSessionUser = result.user;

  res.status(201).json({
    user: result.user,
    institution: result.institution,
    token: `token-${result.user.id}`,
    message: 'Institution onboarding successful. Session authenticated.',
  });
});

// --- System Date Simulator & Config ---
api.get('/system/state', (req: Request, res: Response) => {
  res.json({
    simulatedDate: db.getSimulatedDate(),
    realTime: new Date().toISOString(),
    metrics: db.getDashboardMetrics(),
    config: db.getConfig(),
  });
});

api.post('/system/simulate-date', (req: Request, res: Response) => {
  const { date } = req.body;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
  }

  const currentUser = (req as any).user;
  const result = db.setSimulatedDate(date, currentUser?.name || 'Judge Demo Simulator');
  res.json({
    success: true,
    ...result,
    metrics: db.getDashboardMetrics(),
  });
});

api.get('/system/config', (req: Request, res: Response) => {
  res.json(db.getConfig());
});

api.put('/system/config', requireRoles(['ADMINISTRATOR']), (req: Request, res: Response) => {
  const updated = db.updateConfig(req.body);
  const user = (req as any).user;
  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'SETTINGS_CONFIG_UPDATED',
    entityType: 'SETTINGS',
    entityId: 'sys-config',
    entityLabel: 'System Configuration',
    details: `Updated maturity thresholds or bank list.`,
    ipAddress: req.ip || '127.0.0.1',
  });
  res.json(updated);
});

api.post('/system/reset-demo', (req: Request, res: Response) => {
  db.resetToDefault();
  const currentUser = (req as any).user;
  db.addAuditLog({
    userId: currentUser?.id || 'admin',
    userName: currentUser?.name || 'Administrator',
    role: 'ADMINISTRATOR',
    action: 'DATABASE_RESET',
    entityType: 'SYSTEM',
    entityId: 'db-root',
    entityLabel: 'Factory Reset',
    details: 'Reset all FDRs, institutions, release requests, and simulated date to default benchmark data.',
    ipAddress: req.ip || '127.0.0.1',
  });
  res.json({ success: true, message: 'Portal database reset to default demo dataset.' });
});

// --- Institutions ---
api.get('/institutions', (req: Request, res: Response) => {
  const { search, state, region, type, status, category } = req.query;
  let institutions = db.getInstitutions();

  if (category && category !== 'ALL') {
    institutions = institutions.filter((i: Institution) => i.category === category);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    institutions = institutions.filter(
      (i: Institution) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.district.toLowerCase().includes(q) ||
        (i.affiliationStatus && i.affiliationStatus.toLowerCase().includes(q))
    );
  }

  if (state && state !== 'ALL') {
    institutions = institutions.filter((i: Institution) => i.state.toLowerCase() === (state as string).toLowerCase());
  }

  if (region && region !== 'ALL') {
    institutions = institutions.filter((i: Institution) => i.region === region);
  }

  if (type && type !== 'ALL') {
    institutions = institutions.filter((i: Institution) => i.type === type);
  }

  if (status && status !== 'ALL') {
    institutions = institutions.filter((i: Institution) => i.approvalStatus === status);
  }

  res.json({ institutions, total: institutions.length });
});

// --- AICTE Institution Directory (Lazy, Paginated, Searchable) ---
api.get('/institutions/directory', (req: Request, res: Response) => {
  const { search, state, region, type, page, limit } = req.query;
  const result = queryDirectory({
    search: search as string,
    state: state as string,
    region: region as string,
    type: type as string,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 20,
  });
  res.json(result);
});

// Activate an institution from directory upon activity
api.post('/institutions/activate', (req: Request, res: Response) => {
  const { id, code, name, state, district, region, type, address } = req.body;
  if (!name || !code) {
    return res.status(400).json({ error: 'Name and AICTE ID are required.' });
  }

  let existing = db.getInstitutions().find(i => i.id === id || i.code.toLowerCase() === code.trim().toLowerCase());
  if (!existing) {
    existing = db.addInstitution({
      name,
      code,
      state: state || 'Delhi',
      district: district || '',
      region: (region as any) || 'Northern',
      type: (type as any) || 'Engineering & Tech',
      contactPerson: 'Director / Authorized Signatory',
      email: `principal@${code.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu.in`,
      phone: '+91 11 2372 4151',
      address: address || `${district || ''}, ${state || ''}`,
      approvalStatus: 'APPROVED',
      establishmentYear: 2012,
      category: 'GGSIPU_AFFILIATED',
      categoryLabel: 'AICTE Approved Institution',
      isAffiliationVerified: true,
      affiliationStatus: 'Active Directory Record',
      isDemoReference: false,
    });
  }
  res.json({ success: true, institution: existing });
});

// Demo Cases Quick Access
api.get('/demo-cases', (_req: Request, res: Response) => {
  res.json({ cases: DEMO_CASES_CATALOG });
});

// Per-Institution Vault & Checklist API
api.get('/institutions/:id/vault', (req: Request, res: Response) => {
  let inst = db.getInstitutionById(req.params.id);
  if (!inst) {
    const dirResult = queryDirectory({ search: req.params.id, limit: 1 });
    if (dirResult.institutions.length > 0) {
      inst = dirResult.institutions[0];
    } else {
      return res.status(404).json({ error: 'Institution not found.' });
    }
  }

  const fdrs = db.getFDRs().filter((f: FDRRecord) => f.institutionId === req.params.id);
  const docs = db.getAllDocuments().filter(d => d.institutionId === req.params.id);
  const checklist = getRequiredChecklistForType(inst.type);
  const healthCheckIssues = runDocumentHealthCheck(inst, fdrs, docs);

  // Map checklist items with live status
  const checklistWithStatus = checklist.map(item => {
    const matchingDocs = docs.filter(d => d.type === item.type);
    let status: 'Uploaded' | 'Verified' | 'Pending' | 'Missing' | 'Mismatch' = 'Missing';
    const hasConflict = healthCheckIssues.some(iss => iss.conflictingDocuments?.some(c => c.toLowerCase().includes(item.title.toLowerCase()) || item.title.toLowerCase().includes(c.toLowerCase())));

    if (hasConflict) {
      status = 'Mismatch';
    } else if (matchingDocs.length > 0) {
      if (matchingDocs.some(d => d.verified || d.reviewStatus === 'VERIFIED')) {
        status = 'Verified';
      } else if (matchingDocs.some(d => d.reviewStatus === 'REJECTED')) {
        status = 'Mismatch';
      } else {
        status = 'Pending';
      }
    }

    return {
      ...item,
      status,
      uploadedCount: matchingDocs.length,
      documents: matchingDocs,
    };
  });

  res.json({
    institution: inst,
    checklist: checklistWithStatus,
    documents: docs,
    fdrs,
    healthCheckIssues,
    hasUploadedDocuments: docs.length > 0,
  });
});

// Health check trigger
api.post('/institutions/:id/health-check', (req: Request, res: Response) => {
  const inst = db.getInstitutionById(req.params.id);
  if (!inst) return res.status(404).json({ error: 'Institution not found.' });

  const fdrs = db.getFDRs().filter((f: FDRRecord) => f.institutionId === req.params.id);
  const docs = db.getAllDocuments().filter(d => d.institutionId === req.params.id);
  const issues = runDocumentHealthCheck(inst, fdrs, docs);

  res.json({ issues, totalIssues: issues.length, institutionId: inst.id });
});

// Notify institution for health check issue
api.post('/institutions/:id/notify-issue', (req: Request, res: Response) => {
  const inst = db.getInstitutionById(req.params.id);
  if (!inst) return res.status(404).json({ error: 'Institution not found.' });

  const { title, description, suggestedAction, issueId } = req.body;
  const user = (req as any).user;

  db.addNotification({
    targetRole: 'INSTITUTION',
    targetInstitutionId: inst.id,
    title: `Compliance Discrepancy Notice: ${title}`,
    message: `${description} Suggested Action: ${suggestedAction || 'Please upload rectified documents to your Document Vault.'}`,
    type: 'DEFICIENCY',
    linkId: inst.id,
    linkType: 'INSTITUTION',
  });

  db.addAuditLog({
    userId: user?.id || 'officer',
    userName: user?.name || 'Regional Scrutiny Officer',
    role: user?.role || 'REGIONAL_OFFICER',
    action: 'HEALTH_CHECK_DISCREPANCY_NOTIFIED',
    entityType: 'INSTITUTION',
    entityId: inst.id,
    entityLabel: `${inst.name} (${issueId || 'ISSUE'})`,
    details: `Issued compliance notice for discrepancy: "${title}". Notification dispatched to institution portal.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({ success: true, message: 'Compliance notice dispatched to institution inbox.' });
});

api.get('/institutions/:id', (req: Request, res: Response) => {
  const inst = db.getInstitutionById(req.params.id);
  if (!inst) {
    return res.status(404).json({ error: 'Institution not found.' });
  }
  const fdrs = db.getFDRs().filter((f: FDRRecord) => f.institutionId === req.params.id);
  const releaseRequests = db.getReleaseRequests().filter((r: ReleaseRequest) => r.institutionId === req.params.id);

  res.json({
    institution: inst,
    fdrs,
    releaseRequests,
  });
});

api.post('/institutions', requireRoles(['ADMINISTRATOR', 'REGIONAL_OFFICER']), (req: Request, res: Response) => {
  const {
    name,
    code,
    state,
    district,
    region,
    type,
    contactPerson,
    email,
    phone,
    address,
    establishmentYear,
    category,
    isAffiliationVerified,
    affiliationStatus,
  } = req.body;

  if (!name || !code || !state || !region) {
    return res.status(400).json({ error: 'Missing required institution fields.' });
  }

  const existing = db.getInstitutions().find((i: Institution) => i.code.toLowerCase() === code.trim().toLowerCase());
  if (existing) {
    return res.status(409).json({ error: `An institution with AICTE Permanent Code ${code} already exists.` });
  }

  const instCategory = category || 'GGSIPU_AFFILIATED';
  const created = db.addInstitution({
    name,
    code,
    state,
    district: district || '',
    region,
    type: type || 'Engineering & Tech',
    contactPerson: contactPerson || '',
    email: email || '',
    phone: phone || '',
    address: address || '',
    approvalStatus: 'APPROVED',
    establishmentYear: establishmentYear ? parseInt(establishmentYear, 10) : new Date().getFullYear(),
    category: instCategory,
    categoryLabel: instCategory === 'PRIVATE_UNIVERSITY' ? 'Private University' : 'GGSIPU Affiliated College',
    isAffiliationVerified: isAffiliationVerified ?? (instCategory === 'GGSIPU_AFFILIATED'),
    affiliationStatus:
      affiliationStatus ||
      (instCategory === 'PRIVATE_UNIVERSITY'
        ? 'State Private University'
        : isAffiliationVerified
        ? 'GGSIPU-Affiliated (Verified)'
        : 'Affiliation requires verification'),
    isDemoReference: false,
  });

  const currentUser = (req as any).user;
  db.addAuditLog({
    userId: currentUser.id,
    userName: currentUser.name,
    role: currentUser.role,
    action: 'INSTITUTION_REGISTERED',
    entityType: 'INSTITUTION',
    entityId: created.id,
    entityLabel: `${created.name} (${created.code})`,
    details: `Registered institution under AICTE ${created.region} Regional Office. Category: ${created.categoryLabel}.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.status(201).json(created);
});

api.put('/institutions/:id', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'INSTITUTION' && user.institutionId !== req.params.id) {
    return res.status(403).json({ error: 'Access denied: You can only update your own institution profile.' });
  }

  const updated = db.updateInstitution(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Institution record not found.' });
  }

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'INSTITUTION_PROFILE_UPDATED',
    entityType: 'INSTITUTION',
    entityId: updated.id,
    entityLabel: `${updated.name} (${updated.code})`,
    details: `Updated institution profile contact/address coordinates.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json(updated);
});

// --- FDRs ---
api.get('/fdrs', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { search, status, bank, maturityWindow, institutionId, category } = req.query;

  let fdrs = db.getFDRs();

  if (user?.role === 'INSTITUTION') {
    if (user?.accountStatus === 'PENDING') {
      return res.json({ fdrs: [], total: 0 });
    }
    if (user?.institutionId) {
      fdrs = fdrs.filter((f: FDRRecord) => f.institutionId === user.institutionId);
    }
  } else if (institutionId && institutionId !== 'ALL') {
    fdrs = fdrs.filter((f: FDRRecord) => f.institutionId === institutionId);
  }

  if (category && category !== 'ALL') {
    fdrs = fdrs.filter((f: FDRRecord) => f.category === category);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    fdrs = fdrs.filter(
      (f: FDRRecord) =>
        f.fdrNumber.toLowerCase().includes(q) ||
        f.institutionName.toLowerCase().includes(q) ||
        f.institutionCode.toLowerCase().includes(q) ||
        f.bankName.toLowerCase().includes(q) ||
        f.branchName.toLowerCase().includes(q)
    );
  }

  if (status && status !== 'ALL') {
    fdrs = fdrs.filter((f: FDRRecord) => f.lifecycleStatus === status);
  }

  if (bank && bank !== 'ALL') {
    fdrs = fdrs.filter((f: FDRRecord) => f.bankName === bank);
  }

  if (maturityWindow === '7') {
    fdrs = fdrs.filter((f: FDRRecord) => f.isCriticalExpiring);
  } else if (maturityWindow === '30') {
    fdrs = fdrs.filter((f: FDRRecord) => f.isUrgentExpiring);
  } else if (maturityWindow === '90') {
    fdrs = fdrs.filter((f: FDRRecord) => f.isExpiringSoon);
  } else if (maturityWindow === 'matured') {
    fdrs = fdrs.filter((f: FDRRecord) => f.isMatured || f.lifecycleStatus === 'MATURED');
  }

  res.json({ fdrs, total: fdrs.length });
});

api.get('/fdrs/:id', (req: Request, res: Response) => {
  const fdr = db.getFDRById(req.params.id);
  if (!fdr) {
    return res.status(404).json({ error: 'FDR record not found.' });
  }

  const user = (req as any).user as User;
  if (user.role === 'INSTITUTION' && user.institutionId && fdr.institutionId !== user.institutionId) {
    return res.status(403).json({ error: 'Access denied: You can only view your own institution FDRs.' });
  }

  res.json(fdr);
});

api.post('/fdrs', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const {
    institutionId,
    fdrNumber,
    bankName,
    branchName,
    ifscCode,
    principalAmount,
    interestRate,
    maturityValue,
    issueDate,
    maturityDate,
    jointHolderName,
    purpose,
    documents,
    extractedData,
  } = req.body;

  if (!fdrNumber || !bankName || !principalAmount || !issueDate || !maturityDate) {
    return res.status(400).json({ error: 'Please provide all mandatory FDR parameters.' });
  }

  if (Number(principalAmount) <= 0) {
    return res.status(400).json({ error: 'Principal amount must be a positive number.' });
  }

  let instId = institutionId;
  if (user.role === 'INSTITUTION' && user.institutionId) {
    instId = user.institutionId;
  }

  const inst = db.getInstitutionById(instId);
  if (!inst) {
    return res.status(400).json({ error: 'Specified institution was not found.' });
  }

  const duplicate = db.getFDRByNumber(fdrNumber);
  if (duplicate) {
    return res.status(409).json({
      error: `Duplicate FDR Number: An FDR with number "${fdrNumber}" is already registered for ${duplicate.institutionName}.`,
    });
  }

  const issueTime = new Date(issueDate).getTime();
  const maturityTime = new Date(maturityDate).getTime();
  if (maturityTime <= issueTime) {
    return res.status(400).json({ error: 'Maturity date must be after the issue date.' });
  }

  const calculatedMaturityValue = maturityValue || Math.round(Number(principalAmount) * (1 + (Number(interestRate || 7.0) / 100) * 10));

  const newFDR = db.createFDR({
    institutionId: inst.id,
    institutionName: inst.name,
    institutionCode: inst.code,
    fdrNumber: fdrNumber.trim().toUpperCase(),
    bankName,
    branchName: branchName || '',
    ifscCode: ifscCode || '',
    principalAmount: Number(principalAmount),
    interestRate: Number(interestRate || 7.0),
    maturityValue: calculatedMaturityValue,
    issueDate,
    maturityDate,
    jointHolderName: jointHolderName || `Regional Officer, AICTE & Principal, ${inst.name}`,
    purpose: purpose || 'Establishment of New Institution',
    lifecycleStatus: 'SUBMITTED',
    verificationStatus: 'PENDING_SCRUTINY',
    documents: documents || [],
    extractedData,
    createdBy: `${user.name} (${user.role})`,
  });

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'FDR_REGISTERED',
    entityType: 'FDR',
    entityId: newFDR.id,
    entityLabel: `${newFDR.fdrNumber} (₹${(newFDR.principalAmount / 100000).toFixed(1)}L)`,
    details: `Registered new Security Deposit FDR in joint name with AICTE at ${newFDR.bankName}. Submitted for RO scrutiny.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  db.addNotification({
    targetRole: 'REGIONAL_OFFICER',
    title: `New FDR Submitted: ${newFDR.fdrNumber}`,
    message: `${inst.name} submitted Security Deposit FDR of ₹${(newFDR.principalAmount / 100000).toFixed(1)} Lakhs. Verification required.`,
    type: 'STATUS_CHANGE',
    linkId: newFDR.id,
    linkType: 'FDR',
  });

  res.status(201).json(newFDR);
});

api.put('/fdrs/:id', (req: Request, res: Response) => {
  const fdr = db.getFDRById(req.params.id);
  if (!fdr) return res.status(404).json({ error: 'FDR record not found.' });

  const user = (req as any).user as User;
  if (user.role === 'INSTITUTION' && fdr.institutionId !== user.institutionId) {
    return res.status(403).json({ error: 'Access denied: You can only edit your own FDRs.' });
  }

  // Prevent Institution from self-verifying or setting status to VERIFIED or RELEASED
  const updates = { ...req.body };
  if (user.role === 'INSTITUTION') {
    delete updates.verificationStatus;
    if (['VERIFIED', 'ACTIVE', 'RELEASED', 'APPROVED', 'NOC_ISSUED'].includes(updates.lifecycleStatus)) {
      delete updates.lifecycleStatus;
    }
  }

  const updated = db.updateFDR(req.params.id, updates);
  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'FDR_UPDATED',
    entityType: 'FDR',
    entityId: fdr.id,
    entityLabel: fdr.fdrNumber,
    details: `Updated metadata/details for FDR record.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json(updated);
});

api.delete('/fdrs/:id', (req: Request, res: Response) => {
  const fdr = db.getFDRById(req.params.id);
  if (!fdr) return res.status(404).json({ error: 'FDR record not found.' });

  const user = (req as any).user as User;
  if (user.role === 'INSTITUTION' && fdr.institutionId !== user.institutionId) {
    return res.status(403).json({ error: 'Access denied: You can only delete your own FDRs.' });
  }

  const ok = db.deleteFDR(req.params.id);
  if (!ok) return res.status(500).json({ error: 'Failed to delete FDR.' });

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'FDR_DELETED',
    entityType: 'FDR',
    entityId: fdr.id,
    entityLabel: fdr.fdrNumber,
    details: `Deleted FDR deposit record (${fdr.fdrNumber}, ₹${(fdr.principalAmount / 100000).toFixed(1)}L).`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({ success: true, message: `FDR ${fdr.fdrNumber} deleted successfully.` });
});

api.post('/fdrs/clean-tests', requireRoles(['ADMINISTRATOR', 'REGIONAL_OFFICER']), (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const count = db.cleanTestFDRs();

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'TEST_ARTIFACTS_CLEANED',
    entityType: 'SYSTEM',
    entityId: 'fdr-table',
    entityLabel: 'Test Artifacts Cleaner',
    details: `Cleaned ${count} transient test FDR records from registry.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json({ success: true, removedCount: count, message: `Removed ${count} test FDR records.` });
});

// FDR Lifecycle state transition with strict transition gating
api.post('/fdrs/:id/transition', requireRoles(['REGIONAL_OFFICER', 'ADMINISTRATOR']), (req: Request, res: Response) => {
  const { nextStatus, remarks } = req.body;
  const fdr = db.getFDRById(req.params.id);
  if (!fdr) return res.status(404).json({ error: 'FDR record not found.' });

  // Gating: Disallow jumping directly from DRAFT or SUBMITTED to RELEASED without release workflow
  if (nextStatus === 'RELEASED' && !['NOC_ISSUED', 'APPROVED'].includes(fdr.lifecycleStatus)) {
    return res.status(400).json({
      error: 'Invalid transition: An FDR cannot be marked as RELEASED without completing the multi-tier release workflow and NOC issuance.',
    });
  }

  if (nextStatus === 'DEFICIENCY' && (!remarks || !remarks.trim())) {
    return res.status(400).json({ error: 'Deficiency status change requires explanatory officer remarks.' });
  }

  const oldStatus = fdr.lifecycleStatus;
  let verificationStatus = fdr.verificationStatus;

  if (nextStatus === 'VERIFIED') {
    verificationStatus = 'VERIFIED';
  } else if (nextStatus === 'DEFICIENCY') {
    verificationStatus = 'REJECTED';
  } else if (['DOCUMENT_CHECK', 'UNDER_SCRUTINY'].includes(nextStatus)) {
    verificationStatus = 'PENDING_SCRUTINY';
  }

  const updated = db.updateFDR(fdr.id, {
    lifecycleStatus: nextStatus,
    verificationStatus,
  });

  const user = (req as any).user;

  if (remarks) {
    db.addOfficerRemark(fdr.id, {
      author: user.name,
      role: user.role,
      comment: remarks,
      category: 'VERIFICATION',
    });
  }

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'LIFECYCLE_TRANSITION',
    entityType: 'FDR',
    entityId: fdr.id,
    entityLabel: fdr.fdrNumber,
    details: `Transitioned lifecycle status: ${oldStatus} → ${nextStatus}. ${remarks ? 'Remarks: ' + remarks : ''}`,
    ipAddress: req.ip || '127.0.0.1',
  });

  db.addNotification({
    targetRole: 'INSTITUTION',
    targetInstitutionId: fdr.institutionId,
    title: `FDR Status Changed to ${nextStatus}: ${fdr.fdrNumber}`,
    message: `Regional Office updated status to ${nextStatus}. ${remarks ? 'Note: ' + remarks : ''}`,
    type: 'STATUS_CHANGE',
    linkId: fdr.id,
    linkType: 'FDR',
  });

  res.json(updated);
});

api.post('/fdrs/:id/documents', (req: Request, res: Response) => {
  const fdr = db.getFDRById(req.params.id);
  if (!fdr) return res.status(404).json({ error: 'FDR record not found.' });

  const { type, name, fileSize, ocrConfidence, notes, extractedData, fileData } = req.body;
  const user = (req as any).user;

  const newDoc = {
    id: `doc-${Date.now()}`,
    type: type || 'FDR_RECEIPT',
    name: name || 'Document.pdf',
    fileSize: fileSize || '1.5 MB',
    uploadDate: db.getSimulatedDate(),
    uploadedBy: user.name,
    verified: false,
    reviewStatus: 'NEEDS_REVIEW' as const,
    ocrConfidence: ocrConfidence || 95,
    notes,
    fileData,
  };

  const currentDocs = fdr.documents || [];
  currentDocs.push(newDoc);

  const updates: Partial<typeof fdr> = { documents: currentDocs };
  if (extractedData) {
    updates.extractedData = extractedData;
  }

  const updated = db.updateFDR(fdr.id, updates);

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'DOCUMENT_UPLOADED',
    entityType: 'DOCUMENT',
    entityId: newDoc.id,
    entityLabel: `${newDoc.name} (${fdr.fdrNumber})`,
    details: `Uploaded new ${newDoc.type} document with review status NEEDS_REVIEW.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json(updated);
});

api.post('/fdrs/:id/deficiencies', requireRoles(['REGIONAL_OFFICER', 'ADMINISTRATOR']), (req: Request, res: Response) => {
  const { title, description } = req.body;
  if (!title || !description || !title.trim() || !description.trim()) {
    return res.status(400).json({ error: 'Title and detailed description are mandatory when raising a deficiency.' });
  }

  const user = (req as any).user;
  const updated = db.addDeficiencyNote(req.params.id, {
    raisedBy: user.name,
    raisedByRole: user.role,
    title: title.trim(),
    description: description.trim(),
  });

  if (!updated) return res.status(404).json({ error: 'FDR record not found.' });

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'DEFICIENCY_RAISED',
    entityType: 'FDR',
    entityId: updated.id,
    entityLabel: updated.fdrNumber,
    details: `Raised statutory deficiency: "${title}" - ${description}`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json(updated);
});

api.put('/fdrs/:id/deficiencies/:defId/resolve', (req: Request, res: Response) => {
  const { resolutionRemarks } = req.body;
  if (!resolutionRemarks || !resolutionRemarks.trim()) {
    return res.status(400).json({ error: 'Resolution remarks are required to resolve a deficiency.' });
  }

  const user = (req as any).user;
  const updated = db.resolveDeficiencyNote(req.params.id, req.params.defId, {
    resolvedBy: user.name,
    resolutionRemarks: resolutionRemarks.trim(),
  });

  if (!updated) return res.status(404).json({ error: 'FDR or deficiency note not found.' });

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'DEFICIENCY_RESOLVED',
    entityType: 'FDR',
    entityId: updated.id,
    entityLabel: updated.fdrNumber,
    details: `Resolved deficiency item with notes: ${resolutionRemarks}`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json(updated);
});

api.post('/fdrs/:id/remarks', requireRoles(['REGIONAL_OFFICER', 'PGRC_OFFICER', 'VIGILANCE_OFFICER', 'ADMINISTRATOR']), (req: Request, res: Response) => {
  const { comment, category } = req.body;
  if (!comment || !comment.trim()) return res.status(400).json({ error: 'Comment text is required.' });

  const user = (req as any).user;
  const updated = db.addOfficerRemark(req.params.id, {
    author: user.name,
    role: user.role,
    comment: comment.trim(),
    category: category || 'GENERAL',
  });

  if (!updated) return res.status(404).json({ error: 'FDR record not found.' });

  res.json(updated);
});

// --- Document Vault & Real File Storage ---
api.post('/documents/upload', upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded or file rejected by validator.' });
  }

  const user = (req as any).user;
  const filename = req.file.filename;
  const originalName = req.file.originalname;
  const sizeBytes = req.file.size;
  const sizeStr = sizeBytes > 1024 * 1024
    ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
    : `${(sizeBytes / 1024).toFixed(1)} KB`;

  const instId = req.body.institutionId || user?.institutionId || 'inst-01';
  const inst = db.getInstitutionById(instId);

  const doc = db.addDocument({
    name: originalName,
    type: (req.body.type as any) || 'OTHER',
    url: req.body.cloudUrl || `/api/documents/file/${filename}`,
    fileSize: sizeStr,
    uploadedBy: user?.name || 'Authorized Signatory',
    verified: false,
    institutionId: instId,
    institutionName: inst?.name || user?.institutionName || '',
    fdrId: req.body.fdrId,
    fdrNumber: req.body.fdrNumber,
    releaseId: req.body.releaseId,
    reviewStatus: 'NEEDS_REVIEW',
    notes: req.body.notes || 'Uploaded via FDR360 Document Vault',
    version: 1,
  });

  db.addAuditLog({
    userId: user?.id || 'sys',
    userName: user?.name || 'Signatory',
    role: user?.role || 'INSTITUTION',
    action: 'DOCUMENT_UPLOADED',
    entityType: 'DOCUMENT',
    entityId: doc.id,
    entityLabel: `${doc.name} (${doc.type})`,
    details: `Uploaded statutory file (${sizeStr}) to secure vault for ${inst?.name || 'Institution'}.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.status(201).json(doc);
});

api.get('/documents/file/:filename', (req: Request, res: Response) => {
  const filePath = path.resolve(process.cwd(), 'data', 'uploads', req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Stored document file not found.' });
  }
});

api.get('/documents', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { institutionId, type, search } = req.query;

  if (user?.role === 'INSTITUTION' && user?.accountStatus === 'PENDING') {
    return res.json({ documents: [], total: 0 });
  }

  let docs = db.getAllDocuments(user?.role, user?.institutionId);

  if (institutionId && institutionId !== 'ALL' && user?.role !== 'INSTITUTION') {
    docs = docs.filter(d => d.institutionId === institutionId);
  }

  if (type && type !== 'ALL') {
    docs = docs.filter(d => d.type === type);
  }

  if (search) {
    const q = (search as string).toLowerCase();
    docs = docs.filter(
      d =>
        d.name.toLowerCase().includes(q) ||
        (d.fdrNumber && d.fdrNumber.toLowerCase().includes(q)) ||
        (d.institutionName && d.institutionName.toLowerCase().includes(q))
    );
  }

  res.json({ documents: docs, total: docs.length });
});

api.post('/documents', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const instId = req.body.institutionId || user?.institutionId || 'inst-01';
  const inst = db.getInstitutionById(instId);

  const doc = db.addDocument({
    ...req.body,
    institutionId: instId,
    institutionName: inst?.name || user?.institutionName || '',
    uploadedBy: user?.name || 'Authorized Signatory',
  });

  res.status(201).json(doc);
});

api.get('/documents/:id', (req: Request, res: Response) => {
  const doc = db.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found in vault.' });
  }

  const inst = db.getInstitutionById(doc.institutionId);
  const fdr = doc.fdrId ? db.getFDRById(doc.fdrId) : undefined;
  const allInstDocs = db.getAllDocuments().filter(d => d.institutionId === doc.institutionId);
  const allInstFdrs = inst ? db.getFDRs().filter(f => f.institutionId === inst.id) : [];

  let healthCheckIssues: any[] = [];
  if (inst) {
    healthCheckIssues = runDocumentHealthCheck(inst, allInstFdrs, allInstDocs)
      .filter(iss => iss.conflictingDocuments?.some(name => doc.name.toLowerCase().includes(name.toLowerCase()) || doc.type.toLowerCase().includes(name.toLowerCase())));
  }

  if (!doc.fileData && inst) {
    doc.fileData = renderDocumentTemplate({
      docId: doc.id,
      docName: doc.name,
      docType: doc.type,
      institutionId: inst.id,
      institutionName: inst.name,
      institutionCode: inst.code,
      state: inst.state,
      region: inst.region,
      address: inst.address,
      headOfInstitution: inst.contactPerson,
      fdrNumber: fdr?.fdrNumber,
      bankName: fdr?.bankName,
      branchName: fdr?.branchName,
      ifscCode: fdr?.ifscCode,
      principalAmount: fdr?.principalAmount,
      interestRate: fdr?.interestRate,
      issueDate: fdr?.issueDate,
      maturityDate: fdr?.maturityDate,
      isDemo: true,
    });
  }

  res.json({
    document: doc,
    institution: inst,
    fdr,
    healthCheckIssues,
  });
});

api.put('/documents/:id', (req: Request, res: Response) => {
  const updated = db.updateDocument(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Document not found.' });
  res.json(updated);
});

api.delete('/documents/:id', (req: Request, res: Response) => {
  const ok = db.deleteDocument(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Document not found.' });
  res.json({ success: true, message: 'Document removed from vault.' });
});

// --- Statutory Policy ---
api.get('/system/policy', (_req: Request, res: Response) => {
  res.json(db.getPolicy());
});

api.put('/system/policy', requireRoles(['ADMINISTRATOR']), (req: Request, res: Response) => {
  const user = (req as any).user;
  const updated = db.updatePolicy(req.body);

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'POLICY_UPDATED',
    entityType: 'SETTINGS',
    entityId: 'statutory-policy',
    entityLabel: updated.version,
    details: `Updated AICTE Security Deposit statutory policy configuration.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.json(updated);
});

// --- Release Requests ---
api.get('/releases', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { institutionId } = req.query;
  let releases = db.getReleaseRequests();

  if (user?.role === 'INSTITUTION') {
    if (user?.accountStatus === 'PENDING') {
      return res.json({ releases: [], total: 0 });
    }
    if (user?.institutionId) {
      releases = releases.filter((r: ReleaseRequest) => r.institutionId === user.institutionId);
    }
  } else if (institutionId && institutionId !== 'ALL') {
    releases = releases.filter((r: ReleaseRequest) => r.institutionId === institutionId);
  }

  res.json({ releases, total: releases.length });
});

api.get('/releases/:id', (req: Request, res: Response) => {
  const release = db.getReleaseRequestById(req.params.id);
  if (!release) return res.status(404).json({ error: 'Release request not found.' });

  const user = (req as any).user as User;
  if (user.role === 'INSTITUTION' && user.institutionId && release.institutionId !== user.institutionId) {
    return res.status(403).json({ error: 'Access denied: You can only view your own release requests.' });
  }

  res.json(release);
});

api.post('/releases', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const { fdrId, reason, checklist } = req.body;

  if (!fdrId || !reason) {
    return res.status(400).json({ error: 'FDR selection and release reason are required.' });
  }

  const fdr = db.getFDRById(fdrId);
  if (!fdr) return res.status(404).json({ error: 'Selected FDR not found.' });

  if (user.role === 'INSTITUTION' && fdr.institutionId !== user.institutionId) {
    return res.status(403).json({ error: 'Access denied: You can only apply for releases for your own FDRs.' });
  }

  const existingReq = db.getReleaseRequests().find(
    (r: ReleaseRequest) => r.fdrId === fdrId && !['RELEASED', 'REJECTED'].includes(r.status)
  );
  if (existingReq) {
    return res.status(409).json({ error: 'An active release request is already in process for this FDR.' });
  }

  const newRelease = db.createReleaseRequest({
    fdrId: fdr.id,
    fdrNumber: fdr.fdrNumber,
    institutionId: fdr.institutionId,
    institutionName: fdr.institutionName,
    institutionCode: fdr.institutionCode,
    principalAmount: fdr.principalAmount,
    bankName: fdr.bankName,
    reason,
    status: 'SUBMITTED',
    submittedBy: `${user.name} (${user.designation})`,
    checklist: checklist || {
      noDuesCertificate: { uploaded: true, verified: false, fileName: 'No_Dues_Certificate.pdf' },
      aicteApprovalLetter: { uploaded: true, verified: false, fileName: 'AICTE_Approval_Order.pdf' },
      originalFdrSurrenderAffidavit: { uploaded: true, verified: false, fileName: 'Surrender_Affidavit_Notarized.pdf' },
      governingBodyResolution: { uploaded: true, verified: false, fileName: 'Trust_Resolution.pdf' },
      studentGrievanceClearRecord: { uploaded: true, verified: false, fileName: 'Grievance_Clearance.pdf' },
    },
    clearances: {
      regionalOfficer: {
        status: 'PENDING',
        role: 'REGIONAL_OFFICER',
      },
      pgrc: {
        status: 'PENDING',
        role: 'PGRC_OFFICER',
        pendingGrievanceCount: 0,
      },
      vigilance: {
        status: 'PENDING',
        role: 'VIGILANCE_OFFICER',
        inquiryStatus: 'CLEAR',
      },
    },
  });

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'RELEASE_REQUEST_SUBMITTED',
    entityType: 'RELEASE',
    entityId: newRelease.id,
    entityLabel: `${newRelease.fdrNumber} (₹${(newRelease.principalAmount / 100000).toFixed(1)}L)`,
    details: `Initiated security deposit refund request under grounds: ${reason}. Forwarded to 3-tier clearance desk.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  res.status(201).json(newRelease);
});

api.put('/releases/:id/checklist', requireRoles(['REGIONAL_OFFICER', 'ADMINISTRATOR']), (req: Request, res: Response) => {
  const { itemKey, verified, fileName } = req.body;
  const release = db.getReleaseRequestById(req.params.id);
  if (!release) return res.status(404).json({ error: 'Release request not found.' });

  if (!release.checklist[itemKey as keyof typeof release.checklist]) {
    return res.status(400).json({ error: 'Invalid checklist key.' });
  }

  (release.checklist as any)[itemKey].verified = verified;
  if (fileName) {
    (release.checklist as any)[itemKey].fileName = fileName;
    (release.checklist as any)[itemKey].uploaded = true;
  }

  const user = (req as any).user;
  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    role: user.role,
    action: 'CHECKLIST_ITEM_VERIFIED',
    entityType: 'RELEASE',
    entityId: release.id,
    entityLabel: release.fdrNumber,
    details: `Marked checklist document "${itemKey}" verification as ${verified ? 'VERIFIED' : 'PENDING'}.`,
    ipAddress: req.ip || '127.0.0.1',
  });

  db.saveDatabase();
  res.json(release);
});

api.post('/releases/:id/clearance', (req: Request, res: Response) => {
  const { tier, status, remarks, referenceNo } = req.body;
  const user = (req as any).user as User;

  if (!['regionalOfficer', 'pgrc', 'vigilance'].includes(tier)) {
    return res.status(400).json({ error: 'Invalid clearance tier.' });
  }

  // Enforce remarks for observation or rejection
  if ((status === 'REJECTED' || status === 'OBSERVATION') && (!remarks || !remarks.trim())) {
    return res.status(400).json({ error: 'Remarks are mandatory when recording an Observation or Rejection.' });
  }

  if (tier === 'regionalOfficer' && !['REGIONAL_OFFICER', 'ADMINISTRATOR'].includes(user.role)) {
    return res.status(403).json({ error: 'Only AICTE Regional Officers can record Regional Clearance.' });
  }
  if (tier === 'pgrc' && !['PGRC_OFFICER', 'ADMINISTRATOR'].includes(user.role)) {
    return res.status(403).json({ error: 'Only PGRC Officers can grant Student/Faculty Grievance Clearance.' });
  }
  if (tier === 'vigilance' && !['VIGILANCE_OFFICER', 'ADMINISTRATOR'].includes(user.role)) {
    return res.status(403).json({ error: 'Only AICTE Vigilance Officers can grant Vigilance Clearance.' });
  }

  try {
    const updated = db.updateReleaseClearance(req.params.id, tier as any, {
      status,
      officerName: user.name,
      role: user.role,
      remarks: remarks || `Clearance marked as ${status} by ${user.role}.`,
      referenceNo,
    });

    if (!updated) return res.status(404).json({ error: 'Release request not found.' });

    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: `${tier.toUpperCase()}_CLEARANCE_UPDATE`,
      entityType: 'RELEASE',
      entityId: updated.id,
      entityLabel: `${updated.fdrNumber} (Tier: ${tier})`,
      details: `Officer recorded clearance decision: ${status}. Remarks: ${remarks || 'None'}`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

api.post('/releases/:id/final-approval', requireRoles(['ADMINISTRATOR']), (req: Request, res: Response) => {
  const { remarks } = req.body;
  const user = (req as any).user as User;

  try {
    const approved = db.approveFinalRelease(req.params.id, {
      approvedBy: user.name,
      approvedRole: user.role,
      remarks: remarks || 'Sanctioned for release after multi-tier regulatory clearances.',
    });

    if (!approved) return res.status(404).json({ error: 'Release request not found.' });

    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'RELEASE_SANCTIONED_NOC_ISSUED',
      entityType: 'RELEASE',
      entityId: approved.id,
      entityLabel: `NOC: ${approved.finalApproval?.nocReferenceNumber}`,
      details: `Full final clearance approved. Dispatched AICTE No Objection Certificate to branch manager.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(approved);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

api.post('/releases/:id/disburse', requireRoles(['ADMINISTRATOR']), (req: Request, res: Response) => {
  const { referenceNo, bankTransactionId, remarks } = req.body;
  const user = (req as any).user as User;

  if (!bankTransactionId) {
    return res.status(400).json({ error: 'Bank Transaction / UTR ID is required to record disbursement.' });
  }

  try {
    const released = db.recordDisbursement(req.params.id, {
      referenceNo: referenceNo || `DISB-${Date.now()}`,
      bankTransactionId: bankTransactionId.trim(),
      disbursedBy: user.name,
      remarks: remarks || 'Funds liquidated and transferred to beneficiary institution account.',
    });

    if (!released) return res.status(404).json({ error: 'Release request not found.' });

    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'DEPOSIT_LIQUIDATED_RELEASED',
      entityType: 'RELEASE',
      entityId: released.id,
      entityLabel: `${released.fdrNumber} (Txn: ${bankTransactionId})`,
      details: `Recorded bank disbursement of ₹${(released.principalAmount / 100000).toFixed(1)} Lakhs. Status set to RELEASED.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    res.json(released);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// --- AI OCR Extraction ---
api.post('/ocr/extract', async (req: Request, res: Response) => {
  const { imageBase64, mimeType, fileName, sampleType, manualValues } = req.body;

  let extractedResult: any = null;

  if (geminiAi && imageBase64) {
    try {
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
      const response = await geminiAi.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: mimeType || 'image/png',
                },
              },
              {
                text: `You are an AI document verification OCR specialist for the All India Council for Technical Education (AICTE). 
Analyze this FDR (Fixed Deposit Receipt) or security deposit bank certificate.
Extract the following information accurately in JSON format:
- institutionName: exact college / institute name
- fdrNumber: fixed deposit receipt or certificate number
- bankName: full name of issuing bank (e.g. State Bank of India, Punjab National Bank, Canara Bank, HDFC Bank)
- branchName: branch location and name
- ifscCode: 11 character IFSC code
- principalAmount: deposit principal in Indian Rupees (number only)
- interestRate: annual interest percentage (number only, e.g. 7.25)
- maturityValue: maturity sum in Indian Rupees (number only)
- issueDate: date of issue in YYYY-MM-DD format
- maturityDate: date of maturity in YYYY-MM-DD format
- jointHolderName: names of joint account operators (must note if AICTE Regional Officer is included)
- confidenceScore: integer 0 to 100 representing image clarity and extraction confidence

Respond ONLY with valid JSON. No conversational text or markdown code fences.`,
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      const rawJson = response.text ? response.text.trim() : '{}';
      extractedResult = JSON.parse(rawJson);
      extractedResult.isSimulatedDemo = false;
    } catch (e: any) {
      console.warn('Gemini OCR extraction failed, falling back to simulated extraction:', e.message);
    }
  }

  if (!extractedResult) {
    const demoPresets: Record<string, any> = {
      sbi: {
        institutionName: 'Maharaja Agrasen Institute of Technology',
        fdrNumber: `SBI-FDR-2026-88910`,
        bankName: 'State Bank of India',
        branchName: 'Rohini Sector 22 Branch, New Delhi',
        ifscCode: 'SBIN0011550',
        principalAmount: 3500000,
        interestRate: 7.1,
        maturityValue: 7035000,
        issueDate: '2016-11-10',
        maturityDate: '2026-11-10',
        jointHolderName: 'Regional Officer, AICTE Northern Region & Director, MAIT',
        confidenceScore: 97,
        isSimulatedDemo: true,
        demoNote: 'DEMO DATA — NOT REAL: Simulated AI OCR Extraction for Review Only. Real institution reference for benchmarking.',
      },
      pnb: {
        institutionName: 'Bhagwan Parshuram Institute of Technology',
        fdrNumber: `PNB-FDR-2016-90214`,
        bankName: 'Punjab National Bank',
        branchName: 'Rohini Sector 17 Branch, Delhi',
        ifscCode: 'PUNB0492800',
        principalAmount: 2000000,
        interestRate: 7.2,
        maturityValue: 4010000,
        issueDate: '2016-10-12',
        maturityDate: '2026-10-12',
        jointHolderName: 'Regional Officer, AICTE Northern Region & Principal, BPIT',
        confidenceScore: 95,
        isSimulatedDemo: true,
        demoNote: 'DEMO DATA — NOT REAL: Simulated AI OCR Extraction for Review Only. Real institution reference for benchmarking.',
      },
      hdfc: {
        institutionName: 'Guru Tegh Bahadur Institute of Technology',
        fdrNumber: `HDFC-FDR-2023-77610`,
        bankName: 'HDFC Bank',
        branchName: 'Rajouri Garden Branch, New Delhi',
        ifscCode: 'HDFC0000053',
        principalAmount: 8000000,
        interestRate: 7.35,
        maturityValue: 16900000,
        issueDate: '2023-08-01',
        maturityDate: '2033-08-01',
        jointHolderName: 'Regional Officer, AICTE Northern Region & Director, GTBIT',
        confidenceScore: 96,
        isSimulatedDemo: true,
        demoNote: 'DEMO DATA — NOT REAL: Simulated AI OCR Extraction for Review Only. Real institution reference for benchmarking.',
      },
    };

    extractedResult = { ...(demoPresets[sampleType || 'sbi'] || demoPresets.sbi) };
  }

  // Calculate comparison against entered database values if provided
  const comparisonResults = [];
  if (manualValues) {
    if (manualValues.fdrNumber) {
      comparisonResults.push({
        field: 'FDR Number',
        databaseValue: manualValues.fdrNumber,
        extractedValue: extractedResult.fdrNumber,
        isMatch: String(manualValues.fdrNumber).trim().toUpperCase() === String(extractedResult.fdrNumber).trim().toUpperCase(),
      });
    }
    if (manualValues.principalAmount !== undefined) {
      comparisonResults.push({
        field: 'Principal Amount (₹)',
        databaseValue: Number(manualValues.principalAmount),
        extractedValue: Number(extractedResult.principalAmount),
        isMatch: Number(manualValues.principalAmount) === Number(extractedResult.principalAmount),
      });
    }
    if (manualValues.bankName) {
      comparisonResults.push({
        field: 'Bank Name',
        databaseValue: manualValues.bankName,
        extractedValue: extractedResult.bankName,
        isMatch: String(manualValues.bankName).toLowerCase().includes(String(extractedResult.bankName).toLowerCase()) ||
                 String(extractedResult.bankName).toLowerCase().includes(String(manualValues.bankName).toLowerCase()),
      });
    }
    if (manualValues.maturityDate) {
      comparisonResults.push({
        field: 'Maturity Date',
        databaseValue: manualValues.maturityDate,
        extractedValue: extractedResult.maturityDate,
        isMatch: manualValues.maturityDate === extractedResult.maturityDate,
      });
    }
  }

  if (manualValues && manualValues.applyCorrection) {
    if (manualValues.fdrNumber) extractedResult.fdrNumber = manualValues.fdrNumber;
    if (manualValues.principalAmount) extractedResult.principalAmount = manualValues.principalAmount;
    if (manualValues.bankName) extractedResult.bankName = manualValues.bankName;
  }

  res.json({
    ...extractedResult,
    fileName: fileName || 'Uploaded_Document.pdf',
    comparisonResults,
    extractedAt: new Date().toISOString(),
  });
});

// --- Dashboard Stats ---
api.get('/stats/dashboard', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  if (user?.role === 'INSTITUTION' && user?.accountStatus === 'PENDING') {
    return res.json({
      totalActiveFDRs: 0,
      totalDepositValue: 0,
      expiringIn7Days: 0,
      expiringIn30Days: 0,
      expiringIn90Days: 0,
      maturedUnclaimed: 0,
      maturedUnclaimedAmount: 0,
      pendingClearances: 0,
      pendingScrutiny: 0,
      deficienciesCount: 0,
      reconciliationMismatches: 0,
      activeInstitutionsCount: 0,
      totalInstitutionsCount: 0,
      bankDistribution: {},
      simulatedDate: db.getSimulatedDate(),
    });
  }
  const instId = (req.query.institutionId as string) || (user?.role === 'INSTITUTION' ? user?.institutionId : undefined);
  res.json(db.getDashboardMetrics(instId));
});

// --- Audit Logs ---
api.get('/audit', (req: Request, res: Response) => {
  const { entityType, role, search } = req.query;
  let logs = db.getAuditLogs();

  if (entityType && entityType !== 'ALL') {
    logs = logs.filter((l: AuditLog) => l.entityType === entityType);
  }
  if (role && role !== 'ALL') {
    logs = logs.filter((l: AuditLog) => l.role === role);
  }
  if (search) {
    const q = (search as string).toLowerCase();
    logs = logs.filter(
      (l: AuditLog) =>
        l.entityLabel.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.userName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q)
    );
  }

  res.json({ logs, total: logs.length });
});

// --- Notifications ---
api.get('/notifications', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  const notifications = db.getNotifications(user.role, user.institutionId);
  const unreadCount = notifications.filter((n: AppNotification) => !n.read).length;
  res.json({ notifications, unreadCount });
});

api.put('/notifications/:id/read', (req: Request, res: Response) => {
  db.markNotificationAsRead(req.params.id);
  res.json({ success: true });
});

api.post('/notifications/mark-all-read', (req: Request, res: Response) => {
  const user = (req as any).user as User;
  db.markAllNotificationsAsRead(user.role);
  res.json({ success: true });
});

// --- Downloadable CSV Reports ---
api.get('/reports/csv/:reportType', (req: Request, res: Response) => {
  const { reportType } = req.params;
  const { institutionId } = req.query;
  const user = (req as any).user as User;
  const simulatedDate = db.getSimulatedDate();

  let targetInstId: string | undefined = undefined;
  if (user?.role === 'INSTITUTION') {
    if (user?.accountStatus === 'PENDING') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="AICTE_Report_${simulatedDate}.csv"`);
      return res.send('No authorized records available for pending institution account.');
    }
    targetInstId = user?.institutionId;
  } else if (institutionId && institutionId !== 'ALL') {
    targetInstId = institutionId as string;
  }

  const getFilteredFdrs = () => {
    let list = db.getFDRs();
    if (targetInstId) list = list.filter((f: FDRRecord) => f.institutionId === targetInstId);
    return list;
  };

  const getFilteredReleases = () => {
    let list = db.getReleaseRequests();
    if (targetInstId) list = list.filter((r: ReleaseRequest) => r.institutionId === targetInstId);
    return list;
  };

  if (reportType === 'master-fdr' || reportType === 'fdr') {
    const fdrs = getFilteredFdrs();
    const headers = [
      'FDR Number',
      'Institution Name',
      'AICTE Code',
      'Category',
      'Bank Name',
      'Branch',
      'IFSC Code',
      'Principal Amount (INR)',
      'Interest Rate (%)',
      'Maturity Value (INR)',
      'Issue Date',
      'Maturity Date',
      'Days to Maturity',
      'Status',
      'Joint Lien Mandate',
      'Benchmark Tag',
    ];
    const rows = fdrs.map((f: FDRRecord) => [
      `"${f.fdrNumber}"`,
      `"${f.institutionName}"`,
      `"${f.institutionCode}"`,
      `"${f.category === 'PRIVATE_UNIVERSITY' ? 'Private University' : 'GGSIPU Affiliated College'}"`,
      `"${f.bankName}"`,
      `"${f.branchName}"`,
      `"${f.ifscCode}"`,
      f.principalAmount,
      f.interestRate,
      f.maturityValue,
      f.issueDate,
      f.maturityDate,
      f.daysToMaturity ?? '',
      f.lifecycleStatus,
      `"${f.jointHolderName}"`,
      '"DEMO DATA — NOT REAL"',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="AICTE_Master_FDR_Register_${simulatedDate}.csv"`);
    return res.send(csvContent);
  }

  if (reportType === 'active-fdrs') {
    const fdrs = getFilteredFdrs().filter((f: FDRRecord) => f.lifecycleStatus === 'ACTIVE');
    const headers = ['FDR Number', 'Institution Name', 'AICTE Code', 'Bank Name', 'Principal (INR)', 'Maturity Date', 'Days to Maturity'];
    const rows = fdrs.map((f: FDRRecord) => [
      `"${f.fdrNumber}"`,
      `"${f.institutionName}"`,
      `"${f.institutionCode}"`,
      `"${f.bankName}"`,
      f.principalAmount,
      f.maturityDate,
      f.daysToMaturity ?? '',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="AICTE_Active_FDRs_${simulatedDate}.csv"`);
    return res.send(csvContent);
  }

  if (reportType === 'maturing-fdrs' || reportType === 'expiring-fdrs') {
    const fdrs = getFilteredFdrs().filter((f: FDRRecord) => f.isExpiringSoon || f.isUrgentExpiring || f.isCriticalExpiring);
    const headers = [
      'Urgency',
      'FDR Number',
      'Institution Name',
      'Bank Name',
      'Principal (INR)',
      'Maturity Date',
      'Days Remaining',
      'Current Status',
    ];
    const rows = fdrs.map((f: FDRRecord) => [
      f.isCriticalExpiring ? 'CRITICAL (<=7 Days)' : f.isUrgentExpiring ? 'URGENT (<=30 Days)' : 'UPCOMING (<=90 Days)',
      `"${f.fdrNumber}"`,
      `"${f.institutionName}"`,
      `"${f.bankName}"`,
      f.principalAmount,
      f.maturityDate,
      f.daysToMaturity ?? '',
      f.lifecycleStatus,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="AICTE_Maturing_FDRs_Alert_Report_${simulatedDate}.csv"`);
    return res.send(csvContent);
  }

  if (reportType === 'matured-fdrs') {
    const fdrs = getFilteredFdrs().filter((f: FDRRecord) => f.isMatured || f.lifecycleStatus === 'MATURED');
    const headers = ['FDR Number', 'Institution Name', 'Bank Name', 'Principal (INR)', 'Maturity Date', 'Status'];
    const rows = fdrs.map((f: FDRRecord) => [
      `"${f.fdrNumber}"`,
      `"${f.institutionName}"`,
      `"${f.bankName}"`,
      f.principalAmount,
      f.maturityDate,
      f.lifecycleStatus,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="AICTE_Matured_FDRs_${simulatedDate}.csv"`);
    return res.send(csvContent);
  }

  if (reportType === 'releases') {
    const releases = getFilteredReleases();
    const headers = [
      'Request ID',
      'FDR Number',
      'Institution Name',
      'AICTE Code',
      'Amount (INR)',
      'Reason',
      'Submission Date',
      'Overall Status',
      'RO Clearance',
      'PGRC Clearance',
      'Vigilance Clearance',
      'NOC Ref Number',
      'Disbursement Txn ID',
    ];
    const rows = releases.map((r: ReleaseRequest) => [
      r.id,
      `"${r.fdrNumber}"`,
      `"${r.institutionName}"`,
      `"${r.institutionCode}"`,
      r.principalAmount,
      `"${r.reason}"`,
      r.submittedDate,
      r.status,
      r.clearances.regionalOfficer.status,
      r.clearances.pgrc.status,
      r.clearances.vigilance.status,
      `"${r.finalApproval?.nocReferenceNumber || 'PENDING'}"`,
      `"${r.disbursement?.bankTransactionId || 'PENDING'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="AICTE_Security_Deposit_Releases_${simulatedDate}.csv"`);
    return res.send(csvContent);
  }

  if (reportType === 'pending-clearances') {
    const releases = getFilteredReleases().filter((r: ReleaseRequest) => !['APPROVED', 'RELEASED', 'REJECTED'].includes(r.status));
    const headers = ['Request ID', 'Institution Name', 'FDR Number', 'Amount (INR)', 'RO Status', 'PGRC Status', 'Vigilance Status', 'Pending Items'];
    const rows = releases.map((r: ReleaseRequest) => {
      const pendingTiers = [];
      if (r.clearances.regionalOfficer.status === 'PENDING') pendingTiers.push('RO');
      if (r.clearances.pgrc.status === 'PENDING') pendingTiers.push('PGRC');
      if (r.clearances.vigilance.status === 'PENDING') pendingTiers.push('Vigilance');
      return [
        r.id,
        `"${r.institutionName}"`,
        `"${r.fdrNumber}"`,
        r.principalAmount,
        r.clearances.regionalOfficer.status,
        r.clearances.pgrc.status,
        r.clearances.vigilance.status,
        `"${pendingTiers.join(', ') || 'Under Scrutiny'}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="AICTE_Pending_Clearances_Backlog_${simulatedDate}.csv"`);
    return res.send(csvContent);
  }

  if (reportType === 'institutions' || reportType === 'institution-report') {
    const institutions = db.getInstitutions();
    const headers = [
      'Institution Code',
      'Institution Name',
      'Category',
      'Affiliation Status',
      'Affiliation Verification',
      'State',
      'District',
      'Region',
      'Discipline Type',
      'Approval Status',
      'Total Deposit (INR)',
      'Benchmark Status',
    ];
    const rows = institutions.map((i: Institution) => [
      `"${i.code}"`,
      `"${i.name}"`,
      `"${i.categoryLabel || (i.category === 'PRIVATE_UNIVERSITY' ? 'Private University' : 'GGSIPU Affiliated College')}"`,
      `"${i.affiliationStatus || ''}"`,
      `"${i.isAffiliationVerified ? 'VERIFIED' : 'REQUIRES VERIFICATION'}"`,
      `"${i.state}"`,
      `"${i.district}"`,
      i.region,
      `"${i.type}"`,
      i.approvalStatus,
      i.totalDepositAmount,
      '"DEMO REFERENCE"',
    ]);
    const csvContent = [headers.join(','), ...rows.map((r: (string | number)[]) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="AICTE_Institutions_Directory_${simulatedDate}.csv"`);
    return res.send(csvContent);
  }

  res.status(400).json({ error: 'Unknown report type requested.' });
});

app.use('/api', api);

// Mount Vite or serve static
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AICTE FDR360] Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to bootstrap server:', err);
});
