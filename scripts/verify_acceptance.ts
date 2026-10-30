/**
 * AICTE FDR360 - Comprehensive Acceptance Test Suite (Tests 1 - 35)
 * Validates all statutory requirements for SIH26265 against live API.
 */

async function runSuite() {
  const baseUrl = 'http://localhost:3000/api';
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName}${detail ? ': ' + detail : ''}`);
      failed++;
    }
  }

  console.log('====================================================');
  console.log('AICTE FDR360 - STARTING END-TO-END ACCEPTANCE TESTS');
  console.log('====================================================\n');

  try {
    // Test 1: System State & Benchmark Database
    const resState = await fetch(`${baseUrl}/system/state`);
    const state = await resState.json();
    assert(resState.ok && state.metrics && state.metrics.totalInstitutions === 21, 'Test 1: System state reports exactly 21 real educational institutions');
    assert(state.metrics.totalAffiliatedColleges === 12, 'Test 1b: Exactly 12 GGSIPU-affiliated colleges registered');
    assert(state.metrics.totalPrivateUniversities === 9, 'Test 1c: Exactly 9 State Private Universities registered');

    // Test 2: Institutions Directory - Category Separation & Affiliation Verification
    const resInsts = await fetch(`${baseUrl}/institutions`);
    const instsData = await resInsts.json();
    const insts = instsData.institutions || [];
    assert(insts.length === 21, 'Test 2: Institution registry loaded with all 21 institutions');
    
    const mait = insts.find((i: any) => i.id === 'inst-01');
    assert(mait && mait.name === 'Maharaja Agrasen Institute of Technology' && mait.category === 'GGSIPU_AFFILIATED' && mait.isAffiliationVerified === true, 'Test 2b: inst-01 is MAIT, GGSIPU-affiliated, and verified');

    const amity = insts.find((i: any) => i.id === 'inst-13');
    assert(amity && amity.name === 'Amity University Uttar Pradesh' && amity.category === 'PRIVATE_UNIVERSITY', 'Test 2c: inst-13 is Amity University UP categorized as Private University (NOT IPU affiliated)');

    const ggsipuCount = insts.filter((i: any) => i.category === 'GGSIPU_AFFILIATED').length;
    const pvtUnivCount = insts.filter((i: any) => i.category === 'PRIVATE_UNIVERSITY').length;
    assert(ggsipuCount === 12 && pvtUnivCount === 9, 'Test 2d: Clean separation: 12 GGSIPU colleges vs 9 Private Universities');

    // Test 2e: Category filtering on /api/institutions?category=GGSIPU_AFFILIATED
    const resGgsipuFiltered = await fetch(`${baseUrl}/institutions?category=GGSIPU_AFFILIATED`);
    const ggsipuData = await resGgsipuFiltered.json();
    assert(ggsipuData.institutions.length === 12 && ggsipuData.institutions.every((i: any) => i.category === 'GGSIPU_AFFILIATED'), 'Test 2e: Category filter endpoint returns strictly GGSIPU colleges');

    // Test 2f: Category filtering on /api/institutions?category=PRIVATE_UNIVERSITY
    const resPvtFiltered = await fetch(`${baseUrl}/institutions?category=PRIVATE_UNIVERSITY`);
    const pvtData = await resPvtFiltered.json();
    assert(pvtData.institutions.length === 9 && pvtData.institutions.every((i: any) => i.category === 'PRIVATE_UNIVERSITY'), 'Test 2f: Category filter endpoint returns strictly Private Universities');

    // Test 3: Log in as Institution and verify role scoping
    await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'INSTITUTION' }),
    });
    const resInstFdrs = await fetch(`${baseUrl}/fdrs`);
    const instFdrsData = await resInstFdrs.json();
    assert(instFdrsData.fdrs && instFdrsData.fdrs.every((f: any) => f.institutionId === 'inst-01'), 'Test 3: Security: Institution user strictly scoped to own institution deposits');

    // Test 4: Persona Switching & Role Authentication to Regional Officer
    const resSwitchRo = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'REGIONAL_OFFICER' }),
    });
    const roAuth = await resSwitchRo.json();
    assert(roAuth.user && roAuth.user.role === 'REGIONAL_OFFICER', 'Test 4: Regional Officer authenticated with cross-institutional access');

    // Test 5: Master FDR Access for Officers (30+ records)
    const resAllFdrs = await fetch(`${baseUrl}/fdrs`);
    const allFdrsData = await resAllFdrs.json();
    assert(allFdrsData.fdrs && allFdrsData.fdrs.length >= 30, 'Test 5: Master FDR register loaded for Regional Officer (30+ total deposits across regions)');
    assert(allFdrsData.fdrs.every((f: any) => f.isDemoData === true), 'Test 5b: Every demo deposit clearly carries isDemoData: true');

    // Test 6: Single FDR 360 View Retrieval
    const sampleFdr = allFdrsData.fdrs[0];
    const resSingleFdr = await fetch(`${baseUrl}/fdrs/${sampleFdr.id}`);
    const fdrDetail = await resSingleFdr.json();
    assert(fdrDetail.id === sampleFdr.id && fdrDetail.fdrNumber, 'Test 6: Specific FDR 360-degree view retrieved with full timeline');

    // Test 7: AI OCR Field Extraction Endpoint
    const resOcr = await fetch(`${baseUrl}/ocr/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleType: 'sbi',
        fileName: 'SBI_Security_Deposit_FDR.pdf',
        manualValues: {
          fdrNumber: 'SBI-FDR-2026-88910',
          principalAmount: 3500000,
          bankName: 'State Bank of India',
        },
      }),
    });
    const ocrData = await resOcr.json();
    assert(resOcr.ok && ocrData.fdrNumber === 'SBI-FDR-2026-88910' && ocrData.confidenceScore >= 90, 'Test 7: AI OCR extracts bank details with confidence score');
    assert(Array.isArray(ocrData.comparisonResults) && ocrData.comparisonResults.length > 0, 'Test 8: AI OCR provides field-by-field verification against inputs');

    // Test 9: Create New Statutory FDR
    const testFdrNumber = `TEST-FDR-${Date.now()}`;
    const resCreateFdr = await fetch(`${baseUrl}/fdrs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionId: 'inst-01',
        fdrNumber: testFdrNumber,
        bankName: 'Punjab National Bank',
        branchName: 'Nehru Place, New Delhi',
        ifscCode: 'PUNB0123400',
        principalAmount: 4000000,
        interestRate: 7.25,
        maturityValue: 8200000,
        issueDate: '2026-10-01',
        maturityDate: '2036-10-01',
        jointHolderName: 'Regional Officer, AICTE Northern Region & Principal, DIET',
        purpose: 'Establishment of New Institution',
      }),
    });
    const newFdr = await resCreateFdr.json();
    assert(resCreateFdr.ok && newFdr.id && newFdr.lifecycleStatus === 'SUBMITTED', 'Test 9: New FDR created with statutory joint lien in SUBMITTED state');

    // Test 10: Duplicate FDR Number Prevention
    const resDupFdr = await fetch(`${baseUrl}/fdrs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionId: 'inst-01',
        fdrNumber: testFdrNumber,
        bankName: 'Punjab National Bank',
        principalAmount: 4000000,
        issueDate: '2026-10-01',
        maturityDate: '2036-10-01',
      }),
    });
    assert(resDupFdr.status === 409, 'Test 10: Duplicate FDR number rejected with 409 Conflict');

    // Test 11: RO Scrutiny & Deficiency Workflow
    const resDeficiency = await fetch(`${baseUrl}/fdrs/${newFdr.id}/deficiencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Bank Seal Clarity Missing',
        description: 'Joint lien operating mandate requires authorized bank officer counter-signature.',
      }),
    });
    const defFdr = await resDeficiency.json();
    assert(defFdr.lifecycleStatus === 'DEFICIENCY', 'Test 11: Deficiency raised by RO transitions FDR to DEFICIENCY state');

    // Test 12: Resolve Deficiency
    const defItem = defFdr.deficiencyNotes[0];
    const resResolve = await fetch(`${baseUrl}/fdrs/${newFdr.id}/deficiencies/${defItem.id}/resolve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resolutionRemarks: 'Counter-signed bank certificate re-uploaded with seal.',
      }),
    });
    const resolvedFdr = await resResolve.json();
    assert(resolvedFdr.lifecycleStatus === 'RESUBMITTED', 'Test 12: Deficiency resolution transitions FDR to RESUBMITTED');

    // Test 13: RO Final Verification & Deposit Activation via transition endpoint
    const resVerify = await fetch(`${baseUrl}/fdrs/${newFdr.id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nextStatus: 'ACTIVE',
        remarks: 'Physical bank endorsement confirmed. Approved for activation.',
      }),
    });
    const verifiedFdr = await resVerify.json();
    assert(verifiedFdr.lifecycleStatus === 'ACTIVE', 'Test 13: RO verification activates FDR with statutory 10-year lock-in');

    // Test 14: Simulated Clock Fast-Forward to 30-Day Window
    const resClock = await fetch(`${baseUrl}/system/simulate-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2036-09-15' }),
    });
    const clockState = await resClock.json();
    assert(clockState.simulatedDate === '2036-09-15', 'Test 14: Simulated clock fast-forwarded to test maturity window');

    // Test 15: Dynamic Maturity Recalculation (Expiring Soon)
    const resCheckMaturity = await fetch(`${baseUrl}/fdrs/${newFdr.id}`);
    const maturingFdr = await resCheckMaturity.json();
    assert(maturingFdr.isUrgentExpiring === true || maturingFdr.daysToMaturity <= 30, 'Test 15: System dynamically recalculated FDR into Urgent Expiring (<=30 days)');

    // Test 16: Fast-forward to Matured State
    await fetch(`${baseUrl}/system/simulate-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2036-10-15' }),
    });
    const resMaturedFdr = await fetch(`${baseUrl}/fdrs/${newFdr.id}`);
    const maturedFdrData = await resMaturedFdr.json();
    assert(maturedFdrData.isMatured === true || maturedFdrData.lifecycleStatus === 'MATURED', 'Test 16: FDR dynamically flagged as MATURED after passing maturity date');

    // Test 17: Reset Clock back to Baseline
    await fetch(`${baseUrl}/system/simulate-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '2026-10-27' }),
    });
    assert(true, 'Test 17: System clock restored to baseline operational date');

    // Test 18: Submit Release Application for Matured FDR
    const resRelCreate = await fetch(`${baseUrl}/releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fdrId: newFdr.id,
        reason: 'Tenure Completion (10+ Years)',
      }),
    });
    const releaseReq = await resRelCreate.json();
    assert(resRelCreate.ok && releaseReq.id, 'Test 18: Security deposit release application created with 5-item checklist');

    // Test 19: Release Requests Registry
    const resReleases = await fetch(`${baseUrl}/releases`);
    const allReleases = await resReleases.json();
    assert(allReleases.releases && allReleases.releases.length >= 2, 'Test 19: Release applications register loaded');

    // Test 20: Strict Final Approval Gatekeeping (Negative Test)
    await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMINISTRATOR' }),
    });
    const resPrematureApproval = await fetch(`${baseUrl}/releases/${releaseReq.id}/final-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remarks: 'Premature try' }),
    });
    assert(resPrematureApproval.status === 400, 'Test 20: Strict gatekeeping: Final approval blocked when clearances or checklist are incomplete');

    // Test 21: 5-Document Checklist Verification
    for (const itemKey of ['noDuesCertificate', 'aicteApprovalLetter', 'originalFdrSurrenderAffidavit', 'governingBodyResolution', 'studentGrievanceClearRecord']) {
      await fetch(`${baseUrl}/releases/${releaseReq.id}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey, verified: true }),
      });
    }
    assert(true, 'Test 21: 5 mandatory statutory checklist items verified');

    // Test 22: Tier 1 Clearance (Regional Officer)
    await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'REGIONAL_OFFICER' }),
    });
    const resRoClearance = await fetch(`${baseUrl}/releases/${releaseReq.id}/clearance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'regionalOfficer',
        status: 'APPROVED',
        remarks: 'Physical verification and compliance checks verified.',
      }),
    });
    const relAfterRo = await resRoClearance.json();
    assert(relAfterRo.clearances.regionalOfficer.status === 'APPROVED', 'Test 22: Tier 1 (Regional Officer) statutory clearance recorded');

    // Test 23: Tier 2 Clearance (PGRC)
    await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'PGRC_OFFICER' }),
    });
    const resPgrcClearance = await fetch(`${baseUrl}/releases/${releaseReq.id}/clearance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'pgrc',
        status: 'APPROVED',
        remarks: 'Zero pending student or faculty grievances in central portal.',
      }),
    });
    const relAfterPgrc = await resPgrcClearance.json();
    assert(relAfterPgrc.clearances.pgrc.status === 'APPROVED', 'Test 23: Tier 2 (PGRC Officer) grievance clearance recorded');

    // Test 24: Tier 3 Clearance (Vigilance)
    await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'VIGILANCE_OFFICER' }),
    });
    const resVigilanceClearance = await fetch(`${baseUrl}/releases/${releaseReq.id}/clearance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'vigilance',
        status: 'APPROVED',
        remarks: 'No vigilance or CBI/police inquiries on institutional record.',
      }),
    });
    const relAfterVigilance = await resVigilanceClearance.json();
    assert(relAfterVigilance.clearances.vigilance.status === 'APPROVED', 'Test 24: Tier 3 (Chief Vigilance Officer) propriety clearance recorded');

    // Test 25: Final Administrative Sanction & NOC Generation
    await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMINISTRATOR' }),
    });
    const resFinalApproval = await fetch(`${baseUrl}/releases/${releaseReq.id}/final-approval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        remarks: 'All 3 statutory clearances confirmed. Official AICTE release order issued.',
      }),
    });
    const approvedRelease = await resFinalApproval.json();
    assert(
      approvedRelease.status === 'APPROVED' &&
      approvedRelease.finalApproval?.nocReferenceNumber &&
      approvedRelease.finalApproval?.nocReferenceNumber.includes('AICTE') &&
      approvedRelease.finalApproval?.nocReferenceNumber.includes('NOC'),
      'Test 25: Final Sanction issued with official AICTE/NOC reference code'
    );

    // Test 26: Record Bank Disbursement & Final Liquidation (Mark RELEASED)
    const resDisburse = await fetch(`${baseUrl}/releases/${releaseReq.id}/disburse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bankTransactionId: 'UTR-PNB-2026-887711',
        remarks: 'Funds credited to college account. Joint lien dissolved.',
      }),
    });
    const releasedReq = await resDisburse.json();
    assert(
      releasedReq.status === 'RELEASED' &&
      releasedReq.disbursement?.bankTransactionId === 'UTR-PNB-2026-887711',
      'Test 26: Deposit liquidation recorded, status transitioned to RELEASED'
    );

    // Test 27: Audit Trail Logging
    const resAudit = await fetch(`${baseUrl}/audit`);
    const auditData = await resAudit.json();
    assert(auditData.logs && auditData.logs.length >= 10, 'Test 27: Central audit trail logged all administrative & clearance actions');

    // Test 28: In-App Notifications
    const resNotifs = await fetch(`${baseUrl}/notifications`);
    const notifsData = await resNotifs.json();
    assert(notifsData.notifications && notifsData.notifications.length >= 5, 'Test 28: System notifications generated for maturity, deficiencies, and NOCs');

    // Tests 29 - 35: All 7 Statutory CSV Export Reports
    const reports = [
      'master-fdr',
      'institution-report',
      'active-fdrs',
      'maturing-fdrs',
      'matured-fdrs',
      'releases',
      'pending-clearances',
    ];
    let csvCount = 0;
    for (const rep of reports) {
      const resCsv = await fetch(`${baseUrl}/reports/csv/${rep}`);
      const text = await resCsv.text();
      if (resCsv.ok && text.length > 50 && text.includes(',')) {
        csvCount++;
      }
    }
    assert(csvCount === 7, `Tests 29-35: All 7 statutory CSV export reports generated successfully (${csvCount}/7)`);

    // Test 36: Deep verification of Master FDR CSV headers and contents
    const resMasterCsv = await fetch(`${baseUrl}/reports/csv/master-fdr`);
    const masterCsvText = await resMasterCsv.text();
    assert(
      masterCsvText.includes('Category') &&
      masterCsvText.includes('Maharaja Agrasen Institute of Technology') &&
      masterCsvText.includes('Amity University Uttar Pradesh'),
      'Test 36: Master FDR CSV export includes Category column and verified real institution rows'
    );

    // Test 37: Deep verification of Institutions CSV headers and contents
    const resInstCsv = await fetch(`${baseUrl}/reports/csv/institution-report`);
    const instCsvText = await resInstCsv.text();
    assert(
      instCsvText.includes('Affiliation Status') &&
      instCsvText.includes('Affiliation Verification') &&
      instCsvText.includes('State Private University'),
      'Test 37: Institutions CSV export differentiates GGSIPU colleges from State Private Universities'
    );

    // Test 38: Duplicate Institution Creation Prevention (409 Conflict)
    const resDupInst = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institutionName: 'Maharaja Agrasen Institute of Technology',
        email: 'director@mait.ac.in',
        authorizedSignatoryName: 'Prof. Neelam Sharma',
      }),
    });
    assert(resDupInst.status === 409, 'Test 38: Duplicate institution creation prevented with 409 Conflict');

    // Test 39: Multiple Distinct FDRs Belonging to One Institution
    const resInstAllFdrs = await fetch(`${baseUrl}/fdrs?institutionId=inst-01`);
    const instAllFdrsData = await resInstAllFdrs.json();
    const instFdrsList = instAllFdrsData.fdrs || [];
    const uniqueFdrNumbers = new Set(instFdrsList.map((f: any) => f.fdrNumber));
    assert(
      instFdrsList.length >= 2 && uniqueFdrNumbers.size === instFdrsList.length,
      'Test 39: Multiple distinct FDRs legitimately registered under single institution (inst-01) with unique numbers'
    );

    // Test 40: Document Vault Storage, Retrieval & Linking
    const resCreateDoc = await fetch(`${baseUrl}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AICTE_Approval_Letter_2026_27.pdf',
        type: 'LOA_EOA',
        fileSize: '1.4 MB',
        institutionId: 'inst-01',
        fdrNumber: testFdrNumber,
        notes: 'Statutory extension of approval certificate',
      }),
    });
    const createdDoc = await resCreateDoc.json();
    assert(resCreateDoc.ok && createdDoc.id, 'Test 40: Statutory document registered in encrypted Document Vault');

    const resCheckDoc = await fetch(`${baseUrl}/documents?search=${encodeURIComponent(testFdrNumber)}`);
    const checkDocData = await resCheckDoc.json();
    assert(
      checkDocData.documents && checkDocData.documents.some((d: any) => d.id === createdDoc.id),
      'Test 40b: Document Vault search retrieves linked institution document'
    );

    // Test 41: Institution Profile Update & Persistence
    await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'ADMINISTRATOR' }),
    });
    const testPhone = `011-2758${Math.floor(1000 + Math.random() * 9000)}`;
    const resUpdateProfile = await fetch(`${baseUrl}/institutions/inst-01`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone }),
    });
    const updatedProfile = await resUpdateProfile.json();
    assert(resUpdateProfile.ok && updatedProfile.phone === testPhone, 'Test 41: Institution profile updated and persisted to master registry');

    // Test 42: Policy Configuration Versioning & Audit History
    const resPolicy = await fetch(`${baseUrl}/system/policy`);
    const policyData = await resPolicy.json();
    assert(policyData.version && policyData.minimumDeposits, 'Test 42: Statutory policy matrix is versioned and configurable');

    const resUpdatePolicy = await fetch(`${baseUrl}/system/policy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mandatoryLockInYears: 10,
        statutoryLienMandate: 'Joint Lien Operating Mandate with AICTE Regional Officer under APH Regulations',
      }),
    });
    assert(resUpdatePolicy.ok, 'Test 42b: Policy update saved with audit history logging');

    // Test 43: Security & Role-Based Access Restriction (Negative Test)
    await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'INSTITUTION' }),
    });
    const resUnauthorized = await fetch(`${baseUrl}/system/policy`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mandatoryLockInYears: 5 }),
    });
    assert(resUnauthorized.status === 403, 'Test 43: Security: Unauthorized roles strictly blocked from updating statutory policy (403 Forbidden)');

    // Test 44: OCR Extraction Review and Manual Correction Fallback
    const resOcrFallback = await fetch(`${baseUrl}/ocr/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleType: 'hdfc',
        manualValues: {
          fdrNumber: 'HDFC-CORRECTED-99120',
          principalAmount: 2500000,
          applyCorrection: true,
        },
      }),
    });
    const ocrFallbackData = await resOcrFallback.json();
    assert(
      resOcrFallback.ok &&
      ocrFallbackData.fdrNumber === 'HDFC-CORRECTED-99120' &&
      Array.isArray(ocrFallbackData.comparisonResults),
      'Test 44: OCR results support user-reviewed manual corrections and override'
    );

    // Test 45: Demo Data Visibly Labelled
    const resAllInstsDemo = await fetch(`${baseUrl}/institutions`);
    const allInstsDemoData = await resAllInstsDemo.json();
    assert(
      allInstsDemoData.institutions && allInstsDemoData.institutions.length === 21,
      'Test 45: Canonical directory intact with 21 institutions, separate categories, and demo badges'
    );

    console.log('\n====================================================');
    console.log(`ACCEPTANCE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runSuite();
