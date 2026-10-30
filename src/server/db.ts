import fs from 'fs';
import path from 'path';
import type {
  Institution,
  FDRRecord,
  ReleaseRequest,
  User,
  UserRole,
  AccessRequest,
  AuditLog,
  AppNotification,
  DashboardMetrics,
  SystemConfig,
  FDRLifecycleStatus,
  DocumentAttachment,
} from '../types/index.ts';
import {
  DEMO_USERS,
  INITIAL_INSTITUTIONS,
  INITIAL_FDRS,
  INITIAL_RELEASE_REQUESTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
} from '../data/seedData.ts';
import {
  FICTIONAL_DEMO_INSTITUTIONS,
  FICTIONAL_DEMO_FDRS,
  buildFictionalDemoDocuments,
  FICTIONAL_DEMO_RELEASES,
} from '../data/fictionalDemoData.ts';

export interface StatutoryPolicy {
  version: string;
  sourceHandbook: string;
  isVerifiedOfficialPolicy: boolean;
  policyStatusNotice: string;
  lastUpdated: string;
  minimumDeposits: {
    engineeringUG: number;
    engineeringPG: number;
    management: number;
    pharmacy: number;
    architecture: number;
    polytechnic: number;
  };
  mandatoryLockInYears: number;
  statutoryLienMandate: string;
  requiredDocuments: string[];
  threeTierClearanceRequired: boolean;
  notes: string;
}

export interface DocumentRecord extends DocumentAttachment {
  institutionId: string;
  institutionName?: string;
  fdrId?: string;
  fdrNumber?: string;
  releaseId?: string;
  version?: number;
}

interface DatabaseSchema {
  users: User[];
  institutions: Institution[];
  fdrs: FDRRecord[];
  releaseRequests: ReleaseRequest[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  documents: DocumentRecord[];
  accessRequests: AccessRequest[];
  policy: StatutoryPolicy;
  simulatedDate: string; // ISO date string YYYY-MM-DD
  config: SystemConfig;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'fdr360_database.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Data dir notice:', e);
}

export const DEFAULT_POLICY: StatutoryPolicy = {
  version: 'APH-2024-2027-V1.2',
  sourceHandbook: 'AICTE Approval Process Handbook (APH) — Security Deposit Regulations',
  isVerifiedOfficialPolicy: false,
  policyStatusNotice: 'Configurable benchmark guidelines. Statutory amounts and conditions must be verified against the official AICTE gazette notification.',
  lastUpdated: '2026-10-27',
  minimumDeposits: {
    engineeringUG: 3500000, // ₹35 Lakhs
    engineeringPG: 1500000, // ₹15 Lakhs
    management: 1500000,    // ₹15 Lakhs
    pharmacy: 2500000,      // ₹25 Lakhs
    architecture: 1500000,  // ₹15 Lakhs
    polytechnic: 1500000,   // ₹15 Lakhs
  },
  mandatoryLockInYears: 10,
  statutoryLienMandate: 'Joint account operated by Regional Officer, AICTE & Authorized Signatory of the Institution',
  requiredDocuments: [
    'Original Fixed Deposit Receipt endorsed with joint lien to AICTE',
    'Bank Operating Mandate Letter on Official Bank Letterhead',
    'Society / Trust Governing Body Resolution for Security Deposit Creation',
    'Affidavit on Non-Judicial Stamp Paper declaring non-encumbrance',
    'Latest AICTE Letter of Approval / Extension of Approval (LoA / EoA)',
  ],
  threeTierClearanceRequired: true,
  notes: 'Security deposits are locked for a minimum tenure of 10 years and are refundable upon completion of tenure, closure of course, or reduction in intake after 3-tier clearance (RO, PGRC, Vigilance).',
};

const DEFAULT_CONFIG: SystemConfig = {
  maturityThresholds: {
    criticalDays: 7,
    urgentDays: 30,
    upcomingDays: 90,
  },
  banksList: [
    'State Bank of India',
    'Punjab National Bank',
    'Canara Bank',
    'Bank of Baroda',
    'Union Bank of India',
    'Indian Bank',
    'HDFC Bank',
    'ICICI Bank',
    'Axis Bank',
    'UCO Bank',
    'Bank of India',
  ],
  autoAlertsEnabled: true,
  allowDemoDateSimulation: true,
};

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadDatabase();
    this.recalculateFDRStatuses();
  }

  private getDefaultState(): DatabaseSchema {
    const demoDocs = buildFictionalDemoDocuments();
    return {
      users: JSON.parse(JSON.stringify(DEMO_USERS)),
      institutions: [
        ...JSON.parse(JSON.stringify(FICTIONAL_DEMO_INSTITUTIONS)),
        ...JSON.parse(JSON.stringify(INITIAL_INSTITUTIONS)),
      ],
      fdrs: [
        ...JSON.parse(JSON.stringify(FICTIONAL_DEMO_FDRS)),
        ...JSON.parse(JSON.stringify(INITIAL_FDRS)),
      ],
      releaseRequests: [
        ...JSON.parse(JSON.stringify(FICTIONAL_DEMO_RELEASES)),
        ...JSON.parse(JSON.stringify(INITIAL_RELEASE_REQUESTS)),
      ],
      auditLogs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
      notifications: JSON.parse(JSON.stringify(INITIAL_NOTIFICATIONS)),
      documents: demoDocs,
      accessRequests: [],
      policy: JSON.parse(JSON.stringify(DEFAULT_POLICY)),
      simulatedDate: '2026-10-27',
      config: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
    };
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed && Array.isArray(parsed.fdrs) && Array.isArray(parsed.institutions)) {
          if (!parsed.config) {
            parsed.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
          }
          if (!parsed.policy) {
            parsed.policy = JSON.parse(JSON.stringify(DEFAULT_POLICY));
          }
          if (!Array.isArray(parsed.documents)) {
            parsed.documents = [];
          }
          if (!Array.isArray(parsed.accessRequests)) {
            parsed.accessRequests = [];
          }

          // Ensure all 12 Fictional Demo Institutions are present
          for (const demoInst of FICTIONAL_DEMO_INSTITUTIONS) {
            if (!parsed.institutions.some((i: Institution) => i.id === demoInst.id)) {
              parsed.institutions.push(JSON.parse(JSON.stringify(demoInst)));
            }
          }

          // Ensure all Fictional Demo FDRs are present
          for (const demoFdr of FICTIONAL_DEMO_FDRS) {
            if (!parsed.fdrs.some((f: FDRRecord) => f.id === demoFdr.id)) {
              parsed.fdrs.push(JSON.parse(JSON.stringify(demoFdr)));
            }
          }

          // Ensure all Fictional Demo Releases are present
          for (const demoRel of FICTIONAL_DEMO_RELEASES) {
            if (!parsed.releaseRequests.some((r: ReleaseRequest) => r.id === demoRel.id)) {
              parsed.releaseRequests.push(JSON.parse(JSON.stringify(demoRel)));
            }
          }

          // Ensure all Fictional Demo Documents are seeded
          const demoDocs = buildFictionalDemoDocuments();
          for (const demoDoc of demoDocs) {
            const existingIdx = parsed.documents.findIndex((d: any) => d.id === demoDoc.id);
            if (existingIdx === -1) {
              parsed.documents.push(demoDoc);
            } else if (!parsed.documents[existingIdx].fileData && demoDoc.fileData) {
              parsed.documents[existingIdx].fileData = demoDoc.fileData;
            }
          }

          // Seed documents from FDRs if empty
          if (parsed.documents.length === 0) {
            for (const f of parsed.fdrs) {
              if (Array.isArray(f.documents)) {
                for (const d of f.documents) {
                  parsed.documents.push({
                    ...d,
                    institutionId: f.institutionId,
                    institutionName: f.institutionName,
                    fdrId: f.id,
                    fdrNumber: f.fdrNumber,
                    version: 1,
                  });
                }
              }
            }
          }

          // Check if seed institutions need upgrading to real canonical names
          const needsInstitutionUpgrade = !parsed.institutions.some((i: Institution) =>
            i.name.includes('Maharaja Agrasen') || i.name.includes('Amity University')
          );

          if (needsInstitutionUpgrade) {
            // Keep any user-created institutions
            const userInstitutions = parsed.institutions.filter(
              (i: Institution) => !INITIAL_INSTITUTIONS.some(init => init.id === i.id) && !FICTIONAL_DEMO_INSTITUTIONS.some(f => f.id === i.id)
            );
            parsed.institutions = [
              ...JSON.parse(JSON.stringify(FICTIONAL_DEMO_INSTITUTIONS)),
              ...JSON.parse(JSON.stringify(INITIAL_INSTITUTIONS)),
              ...userInstitutions,
            ];
          }

          // Ensure canonical references and demo data flags across all FDRs
          for (const f of parsed.fdrs) {
            const inst = parsed.institutions.find((i: Institution) => i.id === f.institutionId);
            if (inst) {
              f.institutionName = inst.name;
              f.institutionCode = inst.code;
              f.category = inst.category;
            }
            f.isDemoData = true;
            if (!f.demoNote) {
              f.demoNote = 'DEMO DATA — NOT REAL. Benchmark simulation for AICTE evaluation.';
            }
          }

          // Ensure canonical references for all Release Requests
          if (Array.isArray(parsed.releaseRequests)) {
            for (const r of parsed.releaseRequests) {
              const inst = parsed.institutions.find((i: Institution) => i.id === r.institutionId);
              if (inst) {
                r.institutionName = inst.name;
                r.institutionCode = inst.code;
              }
            }
          }

          // Calculate correct totalDepositAmount per institution
          for (const inst of parsed.institutions) {
            const instFdrs = parsed.fdrs.filter(
              (f: FDRRecord) => f.institutionId === inst.id && f.lifecycleStatus !== 'RELEASED'
            );
            inst.totalDepositAmount = instFdrs.reduce((acc: number, f: FDRRecord) => acc + (f.principalAmount || 0), 0);
          }

          this.saveDatabase(parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Using fresh database state:', e);
    }
    const defaultData = this.getDefaultState();
    this.saveDatabase(defaultData);
    return defaultData;
  }

  public saveDatabase(dataToSave?: DatabaseSchema) {
    try {
      const data = dataToSave || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database to disk:', e);
    }
  }

  public resetToDefault() {
    this.data = this.getDefaultState();
    this.recalculateFDRStatuses();
    this.saveDatabase();
  }

  public getSimulatedDate(): string {
    return this.data.simulatedDate || '2026-10-27';
  }

  public getConfig(): SystemConfig {
    return this.data.config || DEFAULT_CONFIG;
  }

  public updateConfig(newConfig: Partial<SystemConfig>): SystemConfig {
    this.data.config = {
      ...this.data.config,
      ...newConfig,
      maturityThresholds: {
        ...this.data.config.maturityThresholds,
        ...(newConfig.maturityThresholds || {}),
      },
    };
    this.recalculateFDRStatuses();
    this.saveDatabase();
    return this.data.config;
  }

  public setSimulatedDate(newDate: string, actorName = 'System / Judge Demo Simulator'): { simulatedDate: string; updatedFDRsCount: number; newAlerts: number } {
    const oldDate = this.data.simulatedDate;
    this.data.simulatedDate = newDate;

    const { updatedCount, newAlerts } = this.recalculateFDRStatuses(true);

    this.addAuditLog({
      userId: 'user-admin-01',
      userName: actorName,
      role: 'ADMINISTRATOR',
      action: 'SIMULATED_TIME_SHIFT',
      entityType: 'TIME_SIMULATOR',
      entityId: 'sim-clock',
      entityLabel: `Date Shift: ${oldDate} → ${newDate}`,
      details: `Simulated portal clock advanced to ${newDate}. Evaluated ${updatedCount} FDRs for maturity and generated ${newAlerts} alerts.`,
      ipAddress: '127.0.0.1',
    });

    this.saveDatabase();
    return { simulatedDate: newDate, updatedFDRsCount: updatedCount, newAlerts };
  }

  private getDaysDifference(targetDateStr: string, fromDateStr: string): number {
    const target = new Date(targetDateStr + 'T00:00:00Z').getTime();
    const from = new Date(fromDateStr + 'T00:00:00Z').getTime();
    return Math.round((target - from) / (1000 * 60 * 60 * 24));
  }

  public recalculateFDRStatuses(generateAlerts = false): { updatedCount: number; newAlerts: number } {
    const currentDate = this.getSimulatedDate();
    const thresholds = this.data.config?.maturityThresholds || DEFAULT_CONFIG.maturityThresholds;
    let updatedCount = 0;
    let newAlerts = 0;

    for (const fdr of this.data.fdrs) {
      // Ensure canonical institution link
      const inst = this.data.institutions.find(i => i.id === fdr.institutionId);
      if (inst) {
        fdr.institutionName = inst.name;
        fdr.institutionCode = inst.code;
        fdr.category = inst.category;
      }
      fdr.isDemoData = true;
      if (!fdr.demoNote) {
        fdr.demoNote = 'DEMO DATA — NOT REAL. Benchmark simulation for AICTE evaluation.';
      }

      const days = this.getDaysDifference(fdr.maturityDate, currentDate);
      fdr.daysToMaturity = days;
      fdr.isMatured = days <= 0;
      fdr.isExpiringSoon = days > 0 && days <= thresholds.upcomingDays;
      fdr.isUrgentExpiring = days > 0 && days <= thresholds.urgentDays;
      fdr.isCriticalExpiring = days > 0 && days <= thresholds.criticalDays;

      const previousStatus = fdr.lifecycleStatus;

      // Only transition active/expiring/matured if not in release workflow
      if (['VERIFIED', 'ACTIVE', 'EXPIRING', 'MATURED'].includes(fdr.lifecycleStatus)) {
        if (days <= 0) {
          fdr.lifecycleStatus = 'MATURED';
        } else if (days <= thresholds.urgentDays) {
          fdr.lifecycleStatus = 'EXPIRING';
        } else if (days <= thresholds.upcomingDays) {
          fdr.lifecycleStatus = 'EXPIRING';
        } else {
          fdr.lifecycleStatus = 'ACTIVE';
        }

        if (previousStatus !== fdr.lifecycleStatus) {
          updatedCount++;
          if (generateAlerts && (fdr.lifecycleStatus === 'EXPIRING' || fdr.lifecycleStatus === 'MATURED')) {
            const notifTitle = fdr.lifecycleStatus === 'MATURED'
              ? `FDR Matured Alert: ${fdr.fdrNumber}`
              : days <= thresholds.criticalDays
              ? `CRITICAL ALERT: FDR Expiring in ${days} Days: ${fdr.fdrNumber}`
              : `FDR Expiring in ${days} Days: ${fdr.fdrNumber}`;

            const exists = this.data.notifications.some(
              n => n.linkId === fdr.id && n.title.includes(fdr.fdrNumber) && !n.read
            );

            if (!exists) {
              this.addNotification({
                targetRole: 'ALL',
                targetInstitutionId: fdr.institutionId,
                title: notifTitle,
                message: `Security Deposit FDR ${fdr.fdrNumber} (₹${(fdr.principalAmount / 100000).toFixed(1)}L) for ${fdr.institutionName} reaches maturity on ${fdr.maturityDate}. Immediate renewal or release action required.`,
                type: 'MATURITY_WARNING',
                linkId: fdr.id,
                linkType: 'FDR',
              });
              newAlerts++;
            }
          }
        }
      }
    }

    return { updatedCount, newAlerts };
  }

  // --- Institutions ---
  public getInstitutions(): Institution[] {
    return this.data.institutions;
  }

  public getInstitutionById(id: string): Institution | undefined {
    return this.data.institutions.find(i => i.id === id);
  }

  public addInstitution(instData: Omit<Institution, 'id' | 'totalDepositAmount'>): Institution {
    const id = `inst-${Date.now()}`;
    const newInst: Institution = {
      ...instData,
      id,
      totalDepositAmount: 0,
      documents: [],
      timeline: [
        {
          id: `tl-inst-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: 'Regional Officer / Administrator',
          role: 'ADMINISTRATOR',
          action: 'INSTITUTION_REGISTERED',
          details: `Registered institution under AICTE ${instData.region} Region. Approval status: ${instData.approvalStatus || 'APPROVED'}.`,
        },
      ],
    };
    this.data.institutions.unshift(newInst);
    this.saveDatabase();
    return newInst;
  }

  public updateInstitution(id: string, updates: Partial<Institution>): Institution | undefined {
    const index = this.data.institutions.findIndex(i => i.id === id);
    if (index === -1) return undefined;
    this.data.institutions[index] = { ...this.data.institutions[index], ...updates };
    this.saveDatabase();
    return this.data.institutions[index];
  }

  // --- FDRs ---
  public getFDRs(): FDRRecord[] {
    this.recalculateFDRStatuses();
    return this.data.fdrs;
  }

  public getFDRById(id: string): FDRRecord | undefined {
    this.recalculateFDRStatuses();
    return this.data.fdrs.find(f => f.id === id);
  }

  public getFDRByNumber(fdrNumber: string): FDRRecord | undefined {
    return this.data.fdrs.find(f => f.fdrNumber.trim().toLowerCase() === fdrNumber.trim().toLowerCase());
  }

  public createFDR(fdrData: Omit<FDRRecord, 'id' | 'createdAt' | 'updatedAt' | 'deficiencyNotes' | 'officerRemarks'>): FDRRecord {
    const id = `fdr-${Date.now()}`;
    const now = new Date().toISOString();
    const newFDR: FDRRecord = {
      ...fdrData,
      id,
      deficiencyNotes: [],
      officerRemarks: [],
      createdAt: now,
      updatedAt: now,
    };

    this.data.fdrs.unshift(newFDR);

    const inst = this.data.institutions.find(i => i.id === fdrData.institutionId);
    if (inst) {
      inst.totalDepositAmount += fdrData.principalAmount;
      if (!inst.timeline) inst.timeline = [];
      inst.timeline.push({
        id: `tl-${Date.now()}`,
        timestamp: now,
        actor: fdrData.createdBy || 'Institution',
        role: 'INSTITUTION',
        action: 'FDR_SUBMITTED',
        details: `Submitted new Security Deposit FDR ${fdrData.fdrNumber} for ₹${(fdrData.principalAmount / 100000).toFixed(1)} Lakhs.`,
      });
    }

    this.recalculateFDRStatuses();
    this.saveDatabase();
    return newFDR;
  }

  public updateFDR(id: string, updates: Partial<FDRRecord>): FDRRecord | undefined {
    const index = this.data.fdrs.findIndex(f => f.id === id);
    if (index === -1) return undefined;
    this.data.fdrs[index] = {
      ...this.data.fdrs[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.recalculateFDRStatuses();
    this.saveDatabase();
    return this.data.fdrs[index];
  }

  public deleteFDR(id: string): boolean {
    const index = this.data.fdrs.findIndex(f => f.id === id);
    if (index === -1) return false;
    const fdr = this.data.fdrs[index];
    this.data.fdrs.splice(index, 1);
    const inst = this.data.institutions.find(i => i.id === fdr.institutionId);
    if (inst) {
      inst.totalDepositAmount = Math.max(0, inst.totalDepositAmount - fdr.principalAmount);
    }
    // Also remove associated vault documents
    if (Array.isArray(this.data.documents)) {
      this.data.documents = this.data.documents.filter(d => d.fdrId !== id);
    }
    this.recalculateFDRStatuses();
    this.saveDatabase();
    return true;
  }

  public cleanTestFDRs(): number {
    const before = this.data.fdrs.length;
    this.data.fdrs = this.data.fdrs.filter(f => !f.fdrNumber.startsWith('TEST-'));
    const removed = before - this.data.fdrs.length;
    if (removed > 0) {
      if (Array.isArray(this.data.documents)) {
        this.data.documents = this.data.documents.filter(d => !d.fdrNumber?.startsWith('TEST-'));
      }
      this.recalculateFDRStatuses();
      this.saveDatabase();
    }
    return removed;
  }

  public addOfficerRemark(fdrId: string, remark: { author: string; role: any; comment: string; category: any }): FDRRecord | undefined {
    const fdr = this.data.fdrs.find(f => f.id === fdrId);
    if (!fdr) return undefined;
    const newRemark = {
      id: `rem-${Date.now()}`,
      author: remark.author,
      role: remark.role,
      date: this.getSimulatedDate(),
      category: remark.category || 'GENERAL',
      comment: remark.comment,
    };
    fdr.officerRemarks.push(newRemark);
    fdr.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return fdr;
  }

  public addDeficiencyNote(fdrId: string, note: { raisedBy: string; raisedByRole: any; title: string; description: string }): FDRRecord | undefined {
    const fdr = this.data.fdrs.find(f => f.id === fdrId);
    if (!fdr) return undefined;
    const newNote = {
      id: `def-${Date.now()}`,
      fdrId,
      raisedBy: note.raisedBy,
      raisedByRole: note.raisedByRole,
      raisedDate: this.getSimulatedDate(),
      title: note.title,
      description: note.description,
      status: 'OPEN' as const,
    };
    fdr.deficiencyNotes.push(newNote);
    fdr.lifecycleStatus = 'DEFICIENCY';
    fdr.verificationStatus = 'REJECTED';
    fdr.updatedAt = new Date().toISOString();

    this.addNotification({
      targetRole: 'INSTITUTION',
      targetInstitutionId: fdr.institutionId,
      title: `Deficiency Raised on FDR: ${fdr.fdrNumber}`,
      message: `${note.title}: ${note.description}`,
      type: 'DEFICIENCY',
      linkId: fdr.id,
      linkType: 'FDR',
    });

    this.saveDatabase();
    return fdr;
  }

  public resolveDeficiencyNote(fdrId: string, defId: string, resolution: { resolvedBy: string; resolutionRemarks: string }): FDRRecord | undefined {
    const fdr = this.data.fdrs.find(f => f.id === fdrId);
    if (!fdr) return undefined;
    const note = fdr.deficiencyNotes.find(d => d.id === defId);
    if (!note) return undefined;

    note.status = 'RESOLVED';
    note.resolvedBy = resolution.resolvedBy;
    note.resolvedDate = this.getSimulatedDate();
    note.resolutionRemarks = resolution.resolutionRemarks;

    const hasOpenDeficiencies = fdr.deficiencyNotes.some(d => d.status === 'OPEN');
    if (!hasOpenDeficiencies) {
      fdr.lifecycleStatus = 'RESUBMITTED';
      fdr.verificationStatus = 'PENDING_SCRUTINY';
    }
    fdr.updatedAt = new Date().toISOString();
    this.saveDatabase();
    return fdr;
  }

  // --- Release Requests ---
  public getReleaseRequests(): ReleaseRequest[] {
    return this.data.releaseRequests;
  }

  public getReleaseRequestById(id: string): ReleaseRequest | undefined {
    return this.data.releaseRequests.find(r => r.id === id);
  }

  public createReleaseRequest(reqData: Omit<ReleaseRequest, 'id' | 'submittedDate' | 'timeline'>): ReleaseRequest {
    const id = `rel-${Date.now()}`;
    const now = new Date().toISOString();
    const newReq: ReleaseRequest = {
      ...reqData,
      id,
      submittedDate: this.getSimulatedDate(),
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: now,
          actor: reqData.submittedBy,
          role: 'INSTITUTION',
          action: 'SUBMITTED_RELEASE_REQUEST',
          remarks: `Release application filed for FDR ${reqData.fdrNumber} (₹${reqData.principalAmount.toLocaleString('en-IN')}) due to ${reqData.reason}.`,
        },
      ],
    };

    this.data.releaseRequests.unshift(newReq);

    // Update corresponding FDR lifecycle state to RELEASE_REQUESTED
    const fdr = this.data.fdrs.find(f => f.id === reqData.fdrId);
    if (fdr) {
      fdr.lifecycleStatus = 'RELEASE_REQUESTED';
      fdr.updatedAt = now;
    }

    this.addNotification({
      targetRole: 'REGIONAL_OFFICER',
      title: `New Security Deposit Release Request: ${reqData.fdrNumber}`,
      message: `${reqData.institutionName} has submitted a release request for ₹${(reqData.principalAmount / 100000).toFixed(1)} Lakhs.`,
      type: 'STATUS_CHANGE',
      linkId: id,
      linkType: 'RELEASE',
    });

    this.saveDatabase();
    return newReq;
  }

  public updateReleaseClearance(
    requestId: string,
    tier: 'regionalOfficer' | 'pgrc' | 'vigilance',
    clearanceData: {
      status: 'APPROVED' | 'REJECTED' | 'OBSERVATION';
      officerName: string;
      role: any;
      remarks: string;
      referenceNo?: string;
    }
  ): ReleaseRequest | undefined {
    const req = this.data.releaseRequests.find(r => r.id === requestId);
    if (!req) return undefined;

    if (tier === 'regionalOfficer') {
      req.clearances.regionalOfficer = {
        ...req.clearances.regionalOfficer,
        status: clearanceData.status,
        officerName: clearanceData.officerName,
        role: clearanceData.role,
        date: this.getSimulatedDate(),
        remarks: clearanceData.remarks,
        referenceNo: clearanceData.referenceNo,
      };
    } else if (tier === 'pgrc') {
      req.clearances.pgrc = {
        ...req.clearances.pgrc,
        status: clearanceData.status,
        officerName: clearanceData.officerName,
        role: clearanceData.role,
        date: this.getSimulatedDate(),
        remarks: clearanceData.remarks,
        referenceNo: clearanceData.referenceNo,
      };
    } else if (tier === 'vigilance') {
      req.clearances.vigilance = {
        ...req.clearances.vigilance,
        status: clearanceData.status,
        officerName: clearanceData.officerName,
        role: clearanceData.role,
        date: this.getSimulatedDate(),
        remarks: clearanceData.remarks,
        referenceNo: clearanceData.referenceNo,
      };
    }

    req.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: clearanceData.officerName,
      role: clearanceData.role,
      action: `${tier.toUpperCase()}_CLEARANCE_${clearanceData.status}`,
      remarks: clearanceData.remarks,
    });

    const allApproved =
      req.clearances.regionalOfficer.status === 'APPROVED' &&
      req.clearances.pgrc.status === 'APPROVED' &&
      req.clearances.vigilance.status === 'APPROVED';

    const hasObservation =
      req.clearances.regionalOfficer.status === 'OBSERVATION' ||
      req.clearances.pgrc.status === 'OBSERVATION' ||
      req.clearances.vigilance.status === 'OBSERVATION';

    const hasRejection =
      req.clearances.regionalOfficer.status === 'REJECTED' ||
      req.clearances.pgrc.status === 'REJECTED' ||
      req.clearances.vigilance.status === 'REJECTED';

    if (hasRejection) {
      req.status = 'REJECTED';
    } else if (hasObservation) {
      req.status = 'DEFICIENCY_RAISED';
    } else if (allApproved) {
      req.status = 'CLEARANCE_PENDING';
      // Advance FDR status to CLEARANCE_PENDING
      const fdr = this.data.fdrs.find(f => f.id === req.fdrId);
      if (fdr) {
        fdr.lifecycleStatus = 'CLEARANCE_PENDING';
      }
    }

    this.saveDatabase();
    return req;
  }

  public approveFinalRelease(
    requestId: string,
    approvalData: { approvedBy: string; approvedRole: any; remarks: string }
  ): ReleaseRequest | undefined {
    const req = this.data.releaseRequests.find(r => r.id === requestId);
    if (!req) return undefined;

    const allApproved =
      req.clearances.regionalOfficer.status === 'APPROVED' &&
      req.clearances.pgrc.status === 'APPROVED' &&
      req.clearances.vigilance.status === 'APPROVED';

    if (!allApproved) {
      throw new Error('Cannot issue final approval: RO, PGRC, and Vigilance clearances must ALL be approved.');
    }

    // Check that all 5 checklist items are verified
    const allChecked = Object.values(req.checklist).every((item: any) => item.verified);
    if (!allChecked) {
      throw new Error('Cannot issue final approval: All statutory checklist documents must be verified.');
    }

    const nocRef = `AICTE/FDR-REL/${new Date().getFullYear()}/NOC-${Math.floor(1000 + Math.random() * 9000)}`;

    req.status = 'APPROVED';
    req.finalApproval = {
      approvedBy: approvalData.approvedBy,
      approvedRole: approvalData.approvedRole,
      approvedDate: this.getSimulatedDate(),
      remarks: approvalData.remarks,
      nocReferenceNumber: nocRef,
      nocDispatchDate: this.getSimulatedDate(),
    };

    req.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: approvalData.approvedBy,
      role: approvalData.approvedRole,
      action: 'NOC_ISSUED_AND_APPROVED',
      remarks: `No Objection Certificate & Release Order generated (${nocRef}). Bank mandate dispatched.`,
    });

    // Advance FDR status to NOC_ISSUED / APPROVED
    const fdr = this.data.fdrs.find(f => f.id === req.fdrId);
    if (fdr) {
      fdr.lifecycleStatus = 'NOC_ISSUED';
      fdr.updatedAt = new Date().toISOString();
    }

    this.addNotification({
      targetRole: 'INSTITUTION',
      targetInstitutionId: req.institutionId,
      title: `Security Deposit Release Approved! NOC Issued: ${nocRef}`,
      message: `Your release request for FDR ${req.fdrNumber} (₹${(req.principalAmount / 100000).toFixed(1)} Lakhs) has received final AICTE sanction. Download your official NOC.`,
      type: 'RELEASE_APPROVED',
      linkId: req.id,
      linkType: 'RELEASE',
    });

    this.saveDatabase();
    return req;
  }

  public recordDisbursement(
    requestId: string,
    disbursementData: { referenceNo: string; bankTransactionId: string; disbursedBy: string; remarks: string }
  ): ReleaseRequest | undefined {
    const req = this.data.releaseRequests.find(r => r.id === requestId);
    if (!req) return undefined;

    if (req.status !== 'APPROVED') {
      throw new Error('Cannot mark as RELEASED: Request must be in APPROVED state first.');
    }

    req.status = 'RELEASED';
    req.disbursement = {
      date: this.getSimulatedDate(),
      referenceNo: disbursementData.referenceNo,
      bankTransactionId: disbursementData.bankTransactionId,
      disbursedBy: disbursementData.disbursedBy,
      remarks: disbursementData.remarks,
    };

    req.timeline.push({
      id: `tl-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: disbursementData.disbursedBy,
      role: 'ADMINISTRATOR',
      action: 'FUNDS_RELEASED_AND_CLOSED',
      remarks: `Bank confirmation received (Txn ID: ${disbursementData.bankTransactionId}). Deposit lien liquidated and refunded.`,
    });

    // Transition FDR to RELEASED
    const fdr = this.data.fdrs.find(f => f.id === req.fdrId);
    if (fdr) {
      fdr.lifecycleStatus = 'RELEASED';
      fdr.updatedAt = new Date().toISOString();
    }

    // Deduct from Institution total deposit amount
    const inst = this.data.institutions.find(i => i.id === req.institutionId);
    if (inst) {
      inst.totalDepositAmount = Math.max(0, inst.totalDepositAmount - req.principalAmount);
    }

    this.addNotification({
      targetRole: 'INSTITUTION',
      targetInstitutionId: req.institutionId,
      title: `Security Deposit Refund Disbursed: ${req.fdrNumber}`,
      message: `Bank confirmation recorded. Security deposit refund of ₹${(req.principalAmount / 100000).toFixed(1)} Lakhs is completed.`,
      type: 'STATUS_CHANGE',
      linkId: req.id,
      linkType: 'RELEASE',
    });

    this.saveDatabase();
    return req;
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  public addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>) {
    const newLog: AuditLog = {
      ...log,
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs.pop();
    }
    this.saveDatabase();
  }

  // --- Notifications ---
  public getNotifications(userRole?: string, institutionId?: string): AppNotification[] {
    return this.data.notifications.filter(n => {
      if (!userRole) return true;
      if (n.targetRole === 'ALL') {
        if (n.targetInstitutionId && institutionId && n.targetInstitutionId !== institutionId) {
          return false;
        }
        return true;
      }
      if (n.targetRole === userRole) {
        if (n.targetInstitutionId && institutionId && n.targetInstitutionId !== institutionId) {
          return false;
        }
        return true;
      }
      return false;
    });
  }

  public addNotification(notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.data.notifications.unshift(newNotif);
    this.saveDatabase();
  }

  public markNotificationAsRead(id: string): boolean {
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(userRole?: string): void {
    for (const notif of this.data.notifications) {
      if (!userRole || notif.targetRole === 'ALL' || notif.targetRole === userRole) {
        notif.read = true;
      }
    }
    this.saveDatabase();
  }

  // --- Users & Auth ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public addUser(userData: Omit<User, 'id'>): User {
    const id = `user-${Date.now()}`;
    const newUser: User = { ...userData, id };
    this.data.users.push(newUser);
    this.saveDatabase();
    return newUser;
  }

  // --- Access Requests ---
  public getAccessRequests(): AccessRequest[] {
    if (!Array.isArray(this.data.accessRequests)) {
      this.data.accessRequests = [];
    }
    return this.data.accessRequests;
  }

  public getAccessRequestById(id: string): AccessRequest | undefined {
    return this.getAccessRequests().find(r => r.id === id || r.userId === id);
  }

  public addAccessRequest(reqData: Omit<AccessRequest, 'id' | 'submittedAt' | 'status'> & { id?: string }): AccessRequest {
    const list = this.getAccessRequests();
    const existingIndex = list.findIndex(r => r.id === reqData.id || r.userId === reqData.userId);
    const now = new Date().toISOString();
    const record: AccessRequest = {
      id: reqData.id || reqData.userId || `req-${Date.now()}`,
      userId: reqData.userId,
      userName: reqData.userName,
      userEmail: reqData.userEmail,
      accountType: reqData.accountType,
      designation: reqData.designation,
      requestedRole: reqData.requestedRole,
      requestedInstitutionId: reqData.requestedInstitutionId,
      requestedInstitutionName: reqData.requestedInstitutionName,
      region: reqData.region,
      phone: reqData.phone,
      employeeId: reqData.employeeId,
      status: 'PENDING',
      submittedAt: now,
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...record };
    } else {
      list.unshift(record);
    }

    // Also update or create in users table
    const targetUser = this.data.users.find(u => u.id === reqData.userId || u.email.toLowerCase() === reqData.userEmail.toLowerCase());
    if (targetUser) {
      targetUser.name = reqData.userName;
      targetUser.accountType = reqData.accountType;
      targetUser.accountStatus = 'PENDING';
      targetUser.requestedRole = reqData.requestedRole;
      targetUser.requestedInstitutionId = reqData.requestedInstitutionId;
      targetUser.requestedInstitutionName = reqData.requestedInstitutionName;
      targetUser.designation = reqData.designation;
      targetUser.phone = reqData.phone;
      targetUser.employeeId = reqData.employeeId;
      targetUser.region = reqData.region || targetUser.region;
      targetUser.onboardingComplete = true;
      targetUser.institutionId = ''; // Strictly empty while pending
    } else {
      this.data.users.push({
        id: reqData.userId,
        name: reqData.userName,
        email: reqData.userEmail,
        role: 'INSTITUTION',
        designation: reqData.designation,
        institutionId: '',
        institutionName: '',
        requestedRole: reqData.requestedRole,
        requestedInstitutionId: reqData.requestedInstitutionId,
        requestedInstitutionName: reqData.requestedInstitutionName,
        region: reqData.region || 'Northern',
        phone: reqData.phone,
        employeeId: reqData.employeeId,
        accountType: reqData.accountType,
        accountStatus: 'PENDING',
        onboardingComplete: true,
      });
    }

    this.saveDatabase();
    return record;
  }

  public approveAccessRequest(
    id: string,
    approval: { role?: UserRole; institutionId?: string; institutionName?: string; adminName: string }
  ): { user?: User; request?: AccessRequest } {
    const req = this.getAccessRequests().find(r => r.id === id || r.userId === id);
    if (!req) return {};

    const finalRole = approval.role || req.requestedRole || 'INSTITUTION';
    const finalInstId = approval.institutionId !== undefined ? approval.institutionId : (req.requestedInstitutionId || '');
    const finalInstName = approval.institutionName !== undefined ? approval.institutionName : (req.requestedInstitutionName || '');
    const now = new Date().toISOString();

    req.status = 'APPROVED';
    req.reviewedAt = now;
    req.reviewedBy = approval.adminName;

    // Update user in users list
    let targetUser = this.data.users.find(u => u.id === req.userId || u.email.toLowerCase() === req.userEmail.toLowerCase());
    if (targetUser) {
      targetUser.role = finalRole;
      targetUser.institutionId = finalInstId;
      targetUser.institutionName = finalInstName;
      targetUser.accountStatus = 'APPROVED';
      targetUser.approvedBy = approval.adminName;
      targetUser.approvedAt = now;
    } else {
      targetUser = {
        id: req.userId,
        name: req.userName,
        email: req.userEmail,
        role: finalRole,
        designation: req.designation,
        institutionId: finalInstId,
        institutionName: finalInstName,
        region: req.region || 'Northern',
        phone: req.phone,
        accountType: req.accountType,
        accountStatus: 'APPROVED',
        onboardingComplete: true,
        approvedBy: approval.adminName,
        approvedAt: now,
      };
      this.data.users.push(targetUser);
    }

    this.saveDatabase();
    return { user: targetUser, request: req };
  }

  public rejectAccessRequest(id: string, reason: string, adminName: string): AccessRequest | undefined {
    const req = this.getAccessRequests().find(r => r.id === id || r.userId === id);
    if (!req) return undefined;

    const now = new Date().toISOString();
    req.status = 'REJECTED';
    req.rejectionReason = reason;
    req.reviewedAt = now;
    req.reviewedBy = adminName;

    const targetUser = this.data.users.find(u => u.id === req.userId || u.email.toLowerCase() === req.userEmail.toLowerCase());
    if (targetUser) {
      targetUser.accountStatus = 'REJECTED';
      targetUser.rejectionReason = reason;
    }

    this.saveDatabase();
    return req;
  }

  // --- Document Vault ---
  public getAllDocuments(userRole?: string, institutionId?: string): DocumentRecord[] {
    if (!Array.isArray(this.data.documents)) {
      this.data.documents = [];
    }
    if (userRole === 'INSTITUTION' && institutionId) {
      return this.data.documents.filter(d => d.institutionId === institutionId);
    }
    return this.data.documents;
  }

  public getDocumentById(id: string): DocumentRecord | undefined {
    if (!Array.isArray(this.data.documents)) return undefined;
    return this.data.documents.find(d => d.id === id);
  }

  public addDocument(docData: Omit<DocumentRecord, 'id' | 'uploadDate'>): DocumentRecord {
    if (!Array.isArray(this.data.documents)) {
      this.data.documents = [];
    }
    const id = `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newDoc: DocumentRecord = {
      ...docData,
      id,
      uploadDate: this.getSimulatedDate(),
      verified: docData.verified ?? false,
      reviewStatus: docData.reviewStatus || 'NEEDS_REVIEW',
      version: docData.version || 1,
    };
    this.data.documents.unshift(newDoc);
    this.saveDatabase();
    return newDoc;
  }

  public updateDocument(id: string, updates: Partial<DocumentRecord>): DocumentRecord | undefined {
    if (!Array.isArray(this.data.documents)) return undefined;
    const doc = this.data.documents.find(d => d.id === id);
    if (!doc) return undefined;
    Object.assign(doc, updates);
    this.saveDatabase();
    return doc;
  }

  public deleteDocument(id: string): boolean {
    if (!Array.isArray(this.data.documents)) return false;
    const index = this.data.documents.findIndex(d => d.id === id);
    if (index === -1) return false;
    this.data.documents.splice(index, 1);
    this.saveDatabase();
    return true;
  }

  // --- Statutory Policy ---
  public getPolicy(): StatutoryPolicy {
    if (!this.data.policy) {
      this.data.policy = JSON.parse(JSON.stringify(DEFAULT_POLICY));
    }
    return this.data.policy;
  }

  public updatePolicy(updates: Partial<StatutoryPolicy>): StatutoryPolicy {
    this.data.policy = {
      ...this.getPolicy(),
      ...updates,
      lastUpdated: this.getSimulatedDate(),
    };
    this.saveDatabase();
    return this.data.policy;
  }

  // --- Public New Institution Registration ---
  public registerInstitutionAndUser(regData: {
    institutionName: string;
    permanentCode?: string;
    category: 'GGSIPU_AFFILIATED' | 'PRIVATE_UNIVERSITY';
    state: string;
    district: string;
    region: 'Northern' | 'North-West' | 'Western' | 'Central' | 'Eastern' | 'Southern' | 'South-West';
    type: 'Engineering & Tech' | 'Management' | 'Pharmacy' | 'Architecture' | 'Polytechnic';
    contactPerson: string;
    email: string;
    phone: string;
    address: string;
    establishmentYear: number;
    authorizedSignatoryName: string;
    designation: string;
    isDraft?: boolean;
    initialDocuments?: DocumentAttachment[];
  }): { user: User; institution: Institution } {
    const instId = `inst-reg-${Date.now()}`;
    const code = regData.permanentCode?.trim() || `1-${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const category = regData.category || 'GGSIPU_AFFILIATED';
    const isAffiliationVerified = category === 'GGSIPU_AFFILIATED';

    const newInst: Institution = {
      id: instId,
      name: regData.institutionName.trim(),
      code,
      state: regData.state,
      district: regData.district,
      region: regData.region || 'Northern',
      type: regData.type || 'Engineering & Tech',
      contactPerson: regData.contactPerson || regData.authorizedSignatoryName,
      email: regData.email.trim().toLowerCase(),
      phone: regData.phone || '',
      address: regData.address || '',
      approvalStatus: regData.isDraft ? 'UNDER_REVIEW' : 'UNDER_REVIEW',
      establishmentYear: regData.establishmentYear || new Date().getFullYear(),
      totalDepositAmount: 0,
      category,
      categoryLabel: category === 'PRIVATE_UNIVERSITY' ? 'State Private University' : 'GGSIPU Affiliated College',
      isAffiliationVerified,
      affiliationStatus:
        category === 'PRIVATE_UNIVERSITY'
          ? 'State Private University'
          : isAffiliationVerified
          ? 'GGSIPU-Affiliated (Verified)'
          : 'Affiliation requires verification',
      isDemoReference: false,
      documents: regData.initialDocuments || [],
      timeline: [
        {
          id: `tl-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: regData.authorizedSignatoryName,
          role: 'INSTITUTION',
          action: regData.isDraft ? 'REGISTRATION_DRAFT_SAVED' : 'REGISTRATION_SUBMITTED',
          details: `Self-registered institution via public portal. Permanent Code assigned: ${code}.`,
        },
      ],
    };

    this.data.institutions.push(newInst);

    // Create user account
    const userId = `user-reg-${Date.now()}`;
    const newUser: User = {
      id: userId,
      name: regData.authorizedSignatoryName,
      email: regData.email.trim().toLowerCase(),
      role: 'INSTITUTION',
      designation: regData.designation || 'Principal / Authorized Officer',
      institutionId: instId,
      institutionName: newInst.name,
      region: newInst.region,
    };

    this.data.users.push(newUser);

    // If initial documents provided, add to vault
    if (Array.isArray(regData.initialDocuments)) {
      for (const doc of regData.initialDocuments) {
        this.addDocument({
          ...doc,
          institutionId: instId,
          institutionName: newInst.name,
        });
      }
    }

    this.addAuditLog({
      userId: newUser.id,
      userName: newUser.name,
      role: newUser.role,
      action: 'PUBLIC_INSTITUTION_REGISTERED',
      entityType: 'INSTITUTION',
      entityId: newInst.id,
      entityLabel: `${newInst.name} (${newInst.code})`,
      details: `New institution self-registered with AICTE Portal. Category: ${newInst.categoryLabel}. Authorized User: ${newUser.name}.`,
      ipAddress: '127.0.0.1',
    });

    this.addNotification({
      targetRole: 'REGIONAL_OFFICER',
      title: `New Institution Registered: ${newInst.name}`,
      message: `${newInst.name} (${newInst.code}) has completed online onboarding. Documents submitted for review.`,
      type: 'STATUS_CHANGE',
      linkId: newInst.id,
      linkType: 'INSTITUTION',
    });

    this.saveDatabase();
    return { user: newUser, institution: newInst };
  }

  // --- Metrics ---
  public getDashboardMetrics(institutionId?: string): DashboardMetrics {
    this.recalculateFDRStatuses();
    let fdrs = this.data.fdrs;
    let institutions = this.data.institutions;
    let releases = this.data.releaseRequests;

    if (institutionId && institutionId !== 'ALL') {
      fdrs = fdrs.filter(f => f.institutionId === institutionId);
      institutions = institutions.filter(i => i.id === institutionId);
      releases = releases.filter(r => r.institutionId === institutionId);
    }

    let totalDepositValue = 0;
    let activeFDRs = 0;
    let expiringIn7Days = 0;
    let expiringIn30Days = 0;
    let expiringIn90Days = 0;
    let maturedFDRs = 0;
    let pendingVerification = 0;
    let deficienciesCount = 0;
    let releasedFDRs = 0;

    for (const f of fdrs) {
      totalDepositValue += f.principalAmount;
      if (f.lifecycleStatus === 'ACTIVE') activeFDRs++;
      if (f.isCriticalExpiring) expiringIn7Days++;
      if (f.isUrgentExpiring) expiringIn30Days++;
      if (f.isExpiringSoon) expiringIn90Days++;
      if (f.isMatured || f.lifecycleStatus === 'MATURED') maturedFDRs++;
      if (['DOCUMENT_CHECK', 'UNDER_SCRUTINY', 'RESUBMITTED'].includes(f.lifecycleStatus)) {
        pendingVerification++;
      }
      if (f.lifecycleStatus === 'DEFICIENCY') deficienciesCount++;
      if (f.lifecycleStatus === 'RELEASED') releasedFDRs++;
    }

    let pendingReleaseRequests = 0;
    let pendingRO = 0;
    let pendingPGRC = 0;
    let pendingVig = 0;

    for (const r of releases) {
      if (['SUBMITTED', 'UNDER_SCRUTINY', 'CLEARANCE_PENDING'].includes(r.status)) {
        pendingReleaseRequests++;
      }
      if (r.clearances.regionalOfficer.status === 'PENDING') pendingRO++;
      if (r.clearances.pgrc.status === 'PENDING') pendingPGRC++;
      if (r.clearances.vigilance.status === 'PENDING') pendingVig++;
    }

    const totalAffiliatedColleges = institutions.filter(i => i.category === 'GGSIPU_AFFILIATED').length;
    const totalPrivateUniversities = institutions.filter(i => i.category === 'PRIVATE_UNIVERSITY').length;

    return {
      totalInstitutions: institutions.length,
      totalAffiliatedColleges,
      totalPrivateUniversities,
      totalFDRs: fdrs.length,
      totalDepositValue,
      activeFDRs,
      expiringIn7Days,
      expiringIn30Days,
      expiringIn90Days,
      maturedFDRs,
      pendingVerification,
      deficienciesCount,
      pendingReleaseRequests,
      pendingClearances: {
        ro: pendingRO,
        pgrc: pendingPGRC,
        vigilance: pendingVig,
      },
      releasedFDRs,
    };
  }
}

export const db = new Database();
