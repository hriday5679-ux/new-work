import { DocumentType } from '../types/index.ts';

export interface DocumentRenderContext {
  docId: string;
  docName: string;
  docType: DocumentType;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  address?: string;
  state?: string;
  region?: string;
  headOfInstitution?: string;
  fdrNumber?: string;
  bankName?: string;
  branchName?: string;
  ifscCode?: string;
  principalAmount?: number;
  interestRate?: number;
  maturityValue?: number;
  issueDate?: string;
  maturityDate?: string;
  uploadedBy?: string;
  uploadDate?: string;
  isDemo?: boolean;
  academicYear?: string;
  // Specific override flags for mismatch demo cases
  overrideName?: string;
  overrideAmount?: number;
  overrideLienText?: string;
  overrideMaturityDate?: string;
}

/**
 * Format Indian Currency INR (e.g. ₹35,00,000)
 */
export function formatINR(amount: number = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Convert number to words in Indian Numbering format
 */
export function amountInWords(num: number = 0): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero Rupees Only';

  function convert(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? convert(n % 10000000) : '');
  }

  return 'Rupees ' + convert(Math.floor(num)).trim() + ' Only';
}

/**
 * Generate Realistic Government & Institutional HTML Document
 */
export function renderDocumentTemplate(ctx: DocumentRenderContext): string {
  const instName = ctx.overrideName || ctx.institutionName || 'Apex Institute of Engineering & Technology';
  const headName = ctx.headOfInstitution || 'Dr. A. K. Deshmukh';
  const fdrNo = ctx.fdrNumber || 'FDR-2024-884109';
  const bank = ctx.bankName || 'State Bank of India';
  const branch = ctx.branchName || 'University Campus Branch';
  const ifsc = ctx.ifscCode || 'SBIN0004218';
  const amount = ctx.overrideAmount !== undefined ? ctx.overrideAmount : (ctx.principalAmount || 3500000);
  const amountWords = amountInWords(amount);
  const formattedAmt = formatINR(amount);
  const issueDate = ctx.issueDate || '2024-04-15';
  const maturityDate = ctx.overrideMaturityDate || ctx.maturityDate || '2034-04-15';
  const rate = ctx.interestRate || 7.25;
  const matValue = ctx.maturityValue ? formatINR(ctx.maturityValue) : formatINR(Math.round(amount * (1 + (rate / 100) * 10)));
  const ay = ctx.academicYear || '2024-2025';
  const region = ctx.region || 'Northern';
  const state = ctx.state || 'Delhi';
  const address = ctx.address || 'Institutional Area, Phase-I';
  const aicteCode = ctx.institutionCode || '1-DEMO-001';

  // 1. AICTE Extension of Approval (EoA) Letter
  if (ctx.docType === 'LOA_EOA') {
    return `
      <div class="doc-body font-serif text-slate-900 leading-relaxed text-sm">
        <!-- AICTE Header -->
        <div class="text-center border-b-2 border-slate-900 pb-4 mb-6">
          <div class="flex items-center justify-center gap-3 mb-2">
            <div class="w-12 h-12 rounded-full border-2 border-slate-800 flex items-center justify-center font-bold text-xs uppercase bg-amber-50">
              AICTE
            </div>
          </div>
          <h1 class="text-base font-black tracking-wider uppercase text-slate-900">All India Council for Technical Education</h1>
          <p class="text-xs text-slate-700 italic font-sans">(A Statutory Body of the Government of India, Ministry of Education)</p>
          <p class="text-[11px] text-slate-600 font-sans mt-0.5">Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070 | Website: www.aicte-india.org</p>
        </div>

        <div class="flex justify-between items-baseline mb-4 text-xs font-mono">
          <div><strong>F.No.</strong> ${region}/1-${aicteCode.replace(/[^0-9]/g, '') || '9318291'}/EOA/${ay}</div>
          <div><strong>Date:</strong> 30-Apr-2024</div>
        </div>

        <div class="mb-4 text-xs">
          <p><strong>To,</strong></p>
          <p>The Principal Secretary (Technical Education),</p>
          <p>Government of ${state}, Higher & Technical Education Department</p>
        </div>

        <div class="mb-4 text-xs">
          <p class="font-bold uppercase tracking-wide underline mb-1">
            Sub: Extension of Approval (EoA) / Continuation of Approval for the Academic Year ${ay}
          </p>
          <p>
            <strong>Ref:</strong> Application of the Institution for Extension of Approval for the Academic Year ${ay} with mandatory Security Deposit / FDR endorsement compliance.
          </p>
        </div>

        <p class="text-xs text-justify mb-3">
          Sir / Madam, In terms of the provisions under the All India Council for Technical Education (Grant of Approvals for Technical Institutions) Regulations, 2020 notified on 4th February 2020 and amended from time to time, I am directed to convey the approval to:
        </p>

        <!-- Institution Details Table -->
        <table class="w-full border-collapse border border-slate-400 text-xs mb-4">
          <tbody>
            <tr class="bg-slate-100">
              <td class="border border-slate-400 p-2 font-bold w-1/3">Permanent Institute ID</td>
              <td class="border border-slate-400 p-2 font-mono">${aicteCode}</td>
            </tr>
            <tr>
              <td class="border border-slate-400 p-2 font-bold">Name of the Institution</td>
              <td class="border border-slate-400 p-2 font-bold text-blue-950">${instName}</td>
            </tr>
            <tr class="bg-slate-100">
              <td class="border border-slate-400 p-2 font-bold">Institution Address</td>
              <td class="border border-slate-400 p-2">${address}, ${state}</td>
            </tr>
            <tr>
              <td class="border border-slate-400 p-2 font-bold">AICTE Regional Office</td>
              <td class="border border-slate-400 p-2">${region} Regional Office</td>
            </tr>
            <tr class="bg-slate-100">
              <td class="border border-slate-400 p-2 font-bold">Head of Institution</td>
              <td class="border border-slate-400 p-2">${headName}</td>
            </tr>
            <tr>
              <td class="border border-slate-400 p-2 font-bold">Mandated Security Deposit (FDR)</td>
              <td class="border border-slate-400 p-2 font-semibold text-emerald-800">${formattedAmt} in Joint Name with Regional Officer, AICTE</td>
            </tr>
          </tbody>
        </table>

        <p class="text-xs text-justify mb-3">
          The technical institution shall strictly abide by the rules, regulations, guidelines and standards of AICTE. The Security Deposit / Fixed Deposit Receipt of ${formattedAmt} (${amountWords}) pledged in the joint name of <em>Regional Officer, AICTE & Principal/Director, ${instName}</em> under FDR No. <strong>${fdrNo}</strong> shall remain under lien to AICTE for the mandated lock-in period and cannot be released or encumbered without explicit prior written No Objection Certificate (NOC) from AICTE.
        </p>

        <!-- Signatures -->
        <div class="mt-12 flex justify-between items-end text-xs pt-4">
          <div class="text-center">
            <div class="w-24 h-24 border border-dashed border-slate-400 rounded-full flex items-center justify-center text-[10px] text-slate-400 mx-auto mb-1">
              [ Official Seal / Stamp ]
            </div>
            <p class="font-bold">AICTE ${region} Regional Office</p>
          </div>
          <div class="text-right">
            <div class="h-10 mb-1 font-serif italic text-slate-800 font-bold text-sm">
              Prof. Rajive Kumar
            </div>
            <p class="font-bold text-slate-900">Member Secretary, AICTE</p>
            <p class="text-[11px] text-slate-600">Approval & Regulatory Bureau</p>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Bank FDR Certificate / Receipt
  if (ctx.docType === 'FDR_RECEIPT') {
    const lienText = ctx.overrideLienText || 'LIEN MARKED IN FAVOUR OF REGIONAL OFFICER, AICTE';
    return `
      <div class="doc-body font-sans text-slate-900 text-xs">
        <!-- Bank Header -->
        <div class="border-4 border-double border-slate-800 p-4 rounded bg-amber-50/20">
          <div class="flex justify-between items-center border-b-2 border-slate-800 pb-3 mb-4">
            <div>
              <h1 class="text-lg font-black tracking-wide uppercase text-blue-950">${bank}</h1>
              <p class="text-[11px] font-semibold text-slate-700">${branch} | IFSC: ${ifsc}</p>
            </div>
            <div class="text-right">
              <span class="inline-block bg-blue-950 text-white text-[11px] font-bold px-2.5 py-1 rounded">
                TERM DEPOSIT RECEIPT / SPECIAL FDR
              </span>
              <p class="text-[11px] font-mono mt-1 text-slate-700">Receipt No: <strong>${fdrNo}</strong></p>
            </div>
          </div>

          <!-- Rubber Stamp Banner for Lien -->
          <div class="my-3 p-2.5 bg-red-100 border-2 border-red-600 rounded text-center rotate-[-1deg]">
            <p class="text-xs font-black tracking-wider text-red-900 uppercase">
              *** ${lienText} ***
            </p>
            <p class="text-[10px] text-red-800 font-medium">
              Not transferable. No loan / overdraft or premature encashment permitted without written AICTE clearance.
            </p>
          </div>

          <!-- Key Details Grid -->
          <table class="w-full border-collapse border border-slate-300 text-xs my-4 bg-white">
            <tbody>
              <tr>
                <td class="border border-slate-300 p-2 font-bold bg-slate-100 w-1/3">Account Title (Joint Operation)</td>
                <td class="border border-slate-300 p-2 font-bold text-slate-900">
                  Regional Officer, AICTE (${region}) & Director/Principal, ${instName}
                </td>
              </tr>
              <tr>
                <td class="border border-slate-300 p-2 font-bold bg-slate-100">Permanent Institute ID</td>
                <td class="border border-slate-300 p-2 font-mono">${aicteCode}</td>
              </tr>
              <tr>
                <td class="border border-slate-300 p-2 font-bold bg-slate-100">Principal Deposit Amount</td>
                <td class="border border-slate-300 p-2 font-black text-blue-950 text-sm">
                  ${formattedAmt}
                  <span class="text-xs font-normal text-slate-600 block">(${amountWords})</span>
                </td>
              </tr>
              <tr>
                <td class="border border-slate-300 p-2 font-bold bg-slate-100">Interest Rate (% p.a.)</td>
                <td class="border border-slate-300 p-2 font-bold">${rate}% p.a. (Cumulative Quarterly Compounding)</td>
              </tr>
              <tr>
                <td class="border border-slate-300 p-2 font-bold bg-slate-100">Date of Deposit (Effective)</td>
                <td class="border border-slate-300 p-2 font-mono font-semibold">${issueDate}</td>
              </tr>
              <tr>
                <td class="border border-slate-300 p-2 font-bold bg-slate-100">Maturity Date</td>
                <td class="border border-slate-300 p-2 font-mono font-bold text-amber-900">${maturityDate}</td>
              </tr>
              <tr>
                <td class="border border-slate-300 p-2 font-bold bg-slate-100">Estimated Maturity Value</td>
                <td class="border border-slate-300 p-2 font-mono font-bold text-emerald-800">${matValue}</td>
              </tr>
            </tbody>
          </table>

          <p class="text-[10px] text-slate-600 text-justify mb-6">
            The bank acknowledges receipt of the sum above as Security Deposit in joint name as per AICTE Approval Process Handbook guidelines. The principal and accrued interest are held under statutory lien in favor of the All India Council for Technical Education.
          </p>

          <div class="flex justify-between items-end pt-6 border-t border-slate-300 text-xs">
            <div class="text-center">
              <p class="font-bold text-slate-800">Entered By: Clerk / Officer</p>
              <p class="text-[10px] text-slate-500">Employee No: 48921</p>
            </div>
            <div class="text-center">
              <div class="w-20 h-10 border border-slate-400 rounded flex items-center justify-center text-[9px] text-slate-400 italic mb-1">
                [Bank Cashier Stamp]
              </div>
            </div>
            <div class="text-right">
              <div class="font-serif italic font-bold text-slate-900">M. V. Narayanan</div>
              <p class="font-bold text-slate-900">Chief Branch Manager</p>
              <p class="text-[10px] text-slate-600">${bank}, ${branch}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 3. Bank Lien Confirmation Letter
  if (ctx.docType === 'BANK_LIEN_CONFIRMATION') {
    const isLienDefect = ctx.overrideLienText !== undefined;
    const lienClause = isLienDefect
      ? 'The deposit has been recorded in the institution ledger, without third-party lien notation.'
      : `We hereby confirm that Fixed Deposit Receipt No. <strong>${fdrNo}</strong> dated ${issueDate} for ${formattedAmt} (${amountWords}) standing in the name of <em>${instName}</em> has been duly marked under <strong>EXCLUSIVE JOINT LIEN IN FAVOUR OF REGIONAL OFFICER, ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)</strong>.`;

    return `
      <div class="doc-body font-serif text-slate-900 leading-relaxed text-xs">
        <div class="border-b-2 border-slate-800 pb-3 mb-4 flex justify-between items-center">
          <div>
            <h1 class="text-base font-black text-slate-900 uppercase">${bank}</h1>
            <p class="text-xs font-sans text-slate-700">${branch} | Branch Code: 04218 | Phone: 011-2391092</p>
          </div>
          <div class="text-right font-mono text-[11px]">
            <p><strong>Ref:</strong> ${bank.substring(0, 3).toUpperCase()}/LIEN/AICTE/${fdrNo.slice(-6)}</p>
            <p><strong>Date:</strong> ${issueDate}</p>
          </div>
        </div>

        <div class="mb-4 text-xs">
          <p><strong>To,</strong></p>
          <p>The Regional Officer,</p>
          <p>All India Council for Technical Education (AICTE),</p>
          <p>${region} Regional Office</p>
        </div>

        <div class="mb-4 text-xs">
          <p class="font-bold underline">
            SUBJECT: CONFIRMATION OF STATUTORY LIEN ON FIXED DEPOSIT RECEIPT NO. ${fdrNo}
          </p>
        </div>

        <p class="mb-3 text-justify">Dear Sir / Madam,</p>

        <p class="mb-3 text-justify">
          ${lienClause}
        </p>

        <p class="mb-3 text-justify">
          We explicitly undertake that the aforesaid deposit of <strong>${formattedAmt}</strong> maturing on <strong>${maturityDate}</strong> shall not be encashed, refunded, adjusted, transferred or renewed without obtaining an authentic prior written No Objection Certificate (NOC) bearing official seal from the All India Council for Technical Education.
        </p>

        <p class="mb-4 text-justify">
          The bank operating mandate mandates that operation of this account shall strictly require the joint signatures of the <em>Regional Officer, AICTE</em> and the <em>Authorized Signatory of ${instName}</em>.
        </p>

        <div class="mt-12 flex justify-between items-end pt-4">
          <div class="text-center">
            <div class="w-24 h-24 border border-slate-400 rounded-full flex items-center justify-center text-[10px] text-slate-400 mx-auto mb-1">
              [ Official Bank Seal ]
            </div>
            <p class="font-bold font-sans text-[11px]">${bank}</p>
          </div>
          <div class="text-right">
            <div class="font-serif italic font-bold text-sm mb-1">V. K. Mahajan</div>
            <p class="font-bold text-slate-900">Branch Manager / Authorized Officer</p>
            <p class="text-[11px] text-slate-600 font-sans">Staff No: 881023 | ${branch}</p>
          </div>
        </div>
      </div>
    `;
  }

  // 4. Security Deposit Undertaking on Stamp Paper
  if (ctx.docType === 'AFFIDAVIT') {
    return `
      <div class="doc-body font-serif text-slate-900 text-xs">
        <!-- Stamp Paper Top Border -->
        <div class="border-4 border-amber-800 p-4 rounded bg-amber-50/40 mb-4">
          <div class="text-center border-b-2 border-amber-900 pb-3 mb-3">
            <div class="text-[10px] uppercase tracking-widest text-amber-950 font-sans font-bold">Government of India — National Capital / State Territory</div>
            <h1 class="text-base font-black tracking-widest uppercase text-amber-950">Non-Judicial E-Stamp Certificate</h1>
            <div class="flex justify-between items-center text-[10px] font-mono mt-2 text-slate-700">
              <span>Certificate No: <strong>IN-DL${Math.floor(Math.random() * 899999 + 100000)}Y</strong></span>
              <span>Stamp Duty: <strong>₹ 100/- (One Hundred Only)</strong></span>
            </div>
          </div>
          <p class="text-[10px] text-center italic text-slate-600 mb-1">
            Issued to: ${instName} | Consideration: AICTE Security Deposit Undertaking
          </p>
        </div>

        <h2 class="text-center font-bold uppercase tracking-wide underline text-sm mb-4">
          Undertaking / Affidavit on Security Deposit Lien Pledge
        </h2>

        <p class="text-justify mb-3">
          I, <strong>${headName}</strong>, aged about 52 years, authorized representative of the Society/Trust running <strong>${instName}</strong> (Permanent AICTE Institute ID: <code>${aicteCode}</code>), do hereby solemnly affirm and state on oath as under:
        </p>

        <ol class="list-decimal pl-5 space-y-2 text-justify mb-4">
          <li>
            That the Institution has deposited a sum of <strong>${formattedAmt}</strong> (${amountWords}) by way of Fixed Deposit Receipt No. <strong>${fdrNo}</strong> with <strong>${bank}</strong>, ${branch} in joint name with Regional Officer, AICTE.
          </li>
          <li>
            That the said Fixed Deposit has been pledged with AICTE as Security Deposit in strict compliance with the AICTE Approval Process Regulations.
          </li>
          <li>
            That the Institution shall not seek release, lien withdrawal, or credit against the said Fixed Deposit before the expiry of the mandatory statutory lock-in period of 10 (ten) years.
          </li>
          <li>
            That the Council shall have the absolute right to forfeit the Security Deposit in part or full in the event of violation of AICTE norms, student grievance liability, or statutory deficiencies.
          </li>
        </ol>

        <div class="mt-8 flex justify-between items-end pt-4 border-t border-slate-300">
          <div>
            <p class="text-[10px] text-slate-500 uppercase">Notarized & Attested</p>
            <p class="font-bold text-xs mt-1">Advocate & Notary Public</p>
            <p class="text-[10px] font-mono">Reg. No. NOT/2019/DEL</p>
          </div>
          <div class="text-right">
            <div class="italic font-bold text-sm mb-1">${headName}</div>
            <p class="font-bold text-xs text-slate-900">DEPONENT</p>
            <p class="text-[10px] text-slate-600 font-sans">Authorized Signatory / Principal</p>
            <p class="text-[10px] text-slate-600 font-sans">${instName}</p>
          </div>
        </div>
      </div>
    `;
  }

  // 5. Society / Trust Registration Certificate
  if (ctx.docType === 'TRUST_REGISTRATION_CERT') {
    return `
      <div class="doc-body font-serif text-slate-900 text-xs">
        <div class="border-4 border-slate-800 p-6 rounded bg-slate-50/50">
          <div class="text-center border-b border-slate-400 pb-3 mb-4">
            <p class="text-[11px] uppercase tracking-widest text-slate-600 font-sans font-bold">Government of ${state}</p>
            <h1 class="text-base font-black tracking-wide uppercase text-slate-900 mt-1">
              Office of the Registrar of Societies / Public Charitable Trusts
            </h1>
            <p class="text-xs italic text-slate-700 mt-0.5">Under Societies Registration Act XXI of 1860</p>
          </div>

          <div class="text-center my-6">
            <p class="text-xs font-mono font-bold text-slate-800 mb-2">Registration No: S/${Math.floor(Math.random() * 89999 + 10000)}/EST</p>
            <h2 class="text-sm font-bold uppercase tracking-wider underline">Certificate of Registration</h2>
          </div>

          <p class="text-justify leading-relaxed mb-4">
            I hereby certify that the Society / Trust known as <strong>"${instName.replace(/Institute.*/, 'Educational & Charitable Trust')}"</strong>, having its registered office at ${address}, has this day been duly registered under the Societies Registration Act (XXI of 1860).
          </p>

          <p class="text-justify leading-relaxed mb-6">
            Given under my hand and official seal at the District Center, ${state}, on this 14th day of September, 1999.
          </p>

          <div class="flex justify-between items-end pt-8 border-t border-slate-300">
            <div class="text-center">
              <div class="w-20 h-20 border border-slate-400 rounded-full flex items-center justify-center text-[10px] text-slate-400 mx-auto mb-1">
                [ Official Seal ]
              </div>
            </div>
            <div class="text-right">
              <div class="font-serif italic font-bold text-sm mb-1">R. P. Saxena, IAS</div>
              <p class="font-bold text-slate-900">Registrar of Societies</p>
              <p class="text-[10px] text-slate-600 font-sans">Department of Registration, Govt. of ${state}</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 6. Board / Governing Body Resolution
  if (ctx.docType === 'BOARD_RESOLUTION') {
    return `
      <div class="doc-body font-sans text-slate-900 text-xs">
        <div class="border-b-2 border-slate-800 pb-3 mb-4 flex justify-between items-center">
          <div>
            <h1 class="text-base font-black text-blue-950 uppercase">${instName}</h1>
            <p class="text-[11px] text-slate-600">Sponsoring Trust / Society Board Secretariat</p>
          </div>
          <div class="text-right font-mono text-[11px]">
            <p><strong>Extract No:</strong> GB-RES/2024-03</p>
            <p><strong>Date:</strong> 12-Mar-2024</p>
          </div>
        </div>

        <h2 class="text-center font-bold uppercase tracking-wide underline text-sm mb-4">
          Extract of the Minutes of the Meeting of the Governing Body
        </h2>

        <p class="text-justify mb-3">
          A meeting of the Governing Body of the Society / Institution was held on 12th March 2024 at the Registered Office. The following resolution was proposed, seconded, and passed unanimously:
        </p>

        <div class="p-3 bg-slate-100 border-l-4 border-blue-900 my-4 text-justify italic">
          "RESOLVED THAT the Institution do create a Fixed Deposit Receipt (FDR) in the sum of <strong>${formattedAmt}</strong> (${amountWords}) with <strong>${bank}</strong> in joint name with the <em>Regional Officer, All India Council for Technical Education (AICTE)</em> towards statutory Security Deposit for Approval / Extension of Approval.
          <br/><br/>
          FURTHER RESOLVED THAT <strong>${headName}</strong>, Principal / Director, is hereby authorized to execute necessary indemnity, stamp undertakings, and bank mandate letters on behalf of the Society."
        </div>

        <div class="mt-8 flex justify-between items-end pt-4 border-t border-slate-300">
          <div>
            <p class="font-bold text-xs">Certified True Copy</p>
            <p class="text-[10px] text-slate-500">Board Resolution Archive</p>
          </div>
          <div class="text-right">
            <div class="font-serif italic font-bold text-sm mb-1">Dr. S. K. Goel</div>
            <p class="font-bold text-xs text-slate-900">Chairman / General Secretary</p>
            <p class="text-[10px] text-slate-600">Governing Body of the Society</p>
          </div>
        </div>
      </div>
    `;
  }

  // 7. Refund / Release Application from Head of Institution
  if (ctx.docType === 'RELEASE_APPLICATION' || ctx.docType === 'REQUEST_LETTER') {
    return `
      <div class="doc-body font-serif text-slate-900 leading-relaxed text-xs">
        <div class="border-b-2 border-slate-800 pb-3 mb-4 flex justify-between items-center">
          <div>
            <h1 class="text-base font-black text-slate-900 uppercase">${instName}</h1>
            <p class="text-[11px] font-sans text-slate-600">${address}, ${state} | Code: ${aicteCode}</p>
          </div>
          <div class="text-right font-mono text-[11px]">
            <p><strong>Ref:</strong> INST/AICTE-REL/2026/01</p>
            <p><strong>Date:</strong> 15-Jan-2026</p>
          </div>
        </div>

        <div class="mb-4 text-xs font-sans">
          <p><strong>To,</strong></p>
          <p>The Member Secretary / Regional Officer,</p>
          <p>All India Council for Technical Education (AICTE),</p>
          <p>${region} Regional Office</p>
        </div>

        <div class="mb-4 text-xs font-bold underline">
          SUBJECT: FORMAL APPLICATION FOR REFUND / RELEASE OF SECURITY DEPOSIT FDR NO. ${fdrNo} (₹ ${amount.toLocaleString('en-IN')})
        </div>

        <p class="mb-3 text-justify">Respected Sir / Madam,</p>

        <p class="mb-3 text-justify">
          We respectfully submit this formal application requesting the release of the Security Deposit Fixed Deposit Receipt No. <strong>${fdrNo}</strong> amounting to <strong>${formattedAmt}</strong> (${amountWords}) deposited in joint name with AICTE at <strong>${bank}</strong>, ${branch}.
        </p>

        <p class="mb-3 text-justify">
          <strong>Grounds for Release:</strong> The institution has successfully completed the mandated 10 (ten) years lock-in period as prescribed under the AICTE Approval Process Regulations. There are zero pending student grievances before the PGRC, and no vigilance or audit objections remain outstanding against our institution.
        </p>

        <p class="mb-4 text-justify">
          Enclosed herewith are the verified statutory documents: (1) Original FDR copy, (2) Joint Lien Certificate, (3) University No-Dues Certificate, (4) Board Resolution, and (5) Cancelled Cheque with RTGS Mandate for processing electronic disbursement.
        </p>

        <div class="mt-8 flex justify-between items-end pt-4 border-t border-slate-300">
          <div>
            <div class="w-20 h-10 border border-slate-400 rounded flex items-center justify-center text-[9px] text-slate-400 italic mb-1">
              [Inst. Stamp]
            </div>
          </div>
          <div class="text-right">
            <div class="italic font-bold text-sm mb-1">${headName}</div>
            <p class="font-bold text-xs text-slate-900">Head of Institution / Director</p>
            <p class="text-[10px] text-slate-600 font-sans">${instName}</p>
          </div>
        </div>
      </div>
    `;
  }

  // 8. No-Dues / Closure Certificate
  if (ctx.docType === 'NO_DUES_CERT') {
    return `
      <div class="doc-body font-serif text-slate-900 leading-relaxed text-xs">
        <div class="text-center border-b-2 border-slate-800 pb-3 mb-4">
          <h1 class="text-base font-black tracking-wide uppercase text-slate-900">Affiliating University / State Directorate of Technical Education</h1>
          <p class="text-xs text-slate-600 italic">Academic & Statutory Clearance Bureau</p>
        </div>

        <div class="flex justify-between items-baseline mb-4 text-xs font-mono">
          <div><strong>Clearance Ref:</strong> UNIV/AICTE-ND/2026/842</div>
          <div><strong>Date:</strong> 10-Jan-2026</div>
        </div>

        <h2 class="text-center font-bold uppercase tracking-wide underline text-sm mb-4">
          Statutory No-Dues & Clean Record Certificate
        </h2>

        <p class="text-justify mb-3">
          This is to certify that <strong>${instName}</strong> (AICTE Permanent Institute ID: <code>${aicteCode}</code>), affiliated with this University / Directorate, has maintained clean operational compliance during the affiliation period.
        </p>

        <div class="p-3 bg-slate-50 border border-slate-300 rounded my-3 text-xs">
          <p><strong>1. Examination & University Dues:</strong> NIL / All fees cleared.</p>
          <p><strong>2. Faculty / Staff Salary Complaints:</strong> NIL pending matters.</p>
          <p><strong>3. Student Refund Grievances:</strong> Zero unresolved claims before the Ombudsman.</p>
        </div>

        <p class="text-justify mb-4">
          The University has <strong>No Objection</strong> to the release or return of the Security Deposit FDR No. <strong>${fdrNo}</strong> (${formattedAmt}) pledged by the institution with AICTE.
        </p>

        <div class="mt-8 flex justify-between items-end pt-4 border-t border-slate-300">
          <div>
            <div class="w-20 h-20 border border-slate-400 rounded-full flex items-center justify-center text-[10px] text-slate-400 mx-auto mb-1">
              [ University Seal ]
            </div>
          </div>
          <div class="text-right">
            <div class="font-serif italic font-bold text-sm mb-1">Prof. (Dr.) K. P. Singh</div>
            <p class="font-bold text-xs text-slate-900">Registrar / Director (CDC)</p>
            <p class="text-[10px] text-slate-600 font-sans">State Technical University</p>
          </div>
        </div>
      </div>
    `;
  }

  // 9. Cancelled Cheque and Bank Mandate Details
  if (ctx.docType === 'CANCELLED_CHEQUE_MANDATE') {
    return `
      <div class="doc-body font-sans text-slate-900 text-xs">
        <h2 class="text-center font-bold uppercase tracking-wide underline text-sm mb-4">
          Bank Mandate Form & Cancelled Cheque Leaf for Electronic Refund (RTGS / NEFT)
        </h2>

        <!-- Cheque Mockup -->
        <div class="border-2 border-slate-400 rounded-lg p-4 bg-emerald-50/40 relative overflow-hidden mb-6 shadow-sm">
          <!-- Cancelled watermark lines -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="text-4xl font-black text-red-600/30 tracking-widest uppercase border-y-4 border-red-600/30 px-12 py-2 rotate-[-15deg]">
              CANCELLED
            </div>
          </div>

          <div class="flex justify-between items-start border-b border-slate-300 pb-2 mb-3">
            <div>
              <p class="font-black text-sm text-slate-900 uppercase">${bank}</p>
              <p class="text-[10px] text-slate-600">${branch} | IFSC: ${ifsc}</p>
            </div>
            <div class="text-right text-[10px] font-mono">
              <span class="border border-slate-400 px-2 py-0.5 bg-white">VALID FOR 3 MONTHS ONLY</span>
            </div>
          </div>

          <div class="my-4 text-xs font-mono space-y-2">
            <p>PAY: <span class="border-b border-dotted border-slate-800 inline-block w-4/5 font-bold">${instName}</span></p>
            <p>RUPEES: <span class="border-b border-dotted border-slate-800 inline-block w-4/5">FOR RTGS / SECURITY DEPOSIT DISBURSEMENT</span></p>
          </div>

          <div class="flex justify-between items-end pt-2 text-[11px] font-mono">
            <div>A/C NO: <strong>5010048192019</strong></div>
            <div class="text-right">
              <p class="text-[10px] text-slate-500 font-sans">For ${instName}</p>
              <div class="h-6"></div>
              <p class="font-bold text-slate-900">Authorized Signatory</p>
            </div>
          </div>

          <div class="mt-3 pt-2 border-t border-slate-300 text-center font-mono text-[10px] text-slate-500">
            ⑈ 004821 ⑈ 110002108 ⑆ 001928 ⑈ 29
          </div>
        </div>

        <!-- Mandate Table -->
        <table class="w-full border-collapse border border-slate-300 text-xs">
          <tbody>
            <tr class="bg-slate-100">
              <td class="border border-slate-300 p-2 font-bold w-1/3">Beneficiary Account Name</td>
              <td class="border border-slate-300 p-2 font-bold">${instName}</td>
            </tr>
            <tr>
              <td class="border border-slate-300 p-2 font-bold">Account Number</td>
              <td class="border border-slate-300 p-2 font-mono font-bold">5010048192019 (Current Account)</td>
            </tr>
            <tr class="bg-slate-100">
              <td class="border border-slate-300 p-2 font-bold">Bank Name & Branch</td>
              <td class="border border-slate-300 p-2">${bank}, ${branch}</td>
            </tr>
            <tr>
              <td class="border border-slate-300 p-2 font-bold">RTGS / NEFT IFSC Code</td>
              <td class="border border-slate-300 p-2 font-mono font-bold">${ifsc}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  // 10. Audited Financial Statement Summary
  return `
    <div class="doc-body font-sans text-slate-900 text-xs">
      <div class="border-b-2 border-slate-800 pb-3 mb-4 flex justify-between items-center">
        <div>
          <h1 class="text-sm font-black text-slate-900 uppercase">K. G. Singhania & Co.</h1>
          <p class="text-[10px] text-slate-600">Chartered Accountants | FRN: 014892N</p>
        </div>
        <div class="text-right font-mono text-[10px]">
          <p><strong>UDIN:</strong> 24098481BKAR${Math.floor(Math.random() * 8999 + 1000)}</p>
          <p><strong>Date:</strong> 24-Jul-2024</p>
        </div>
      </div>

      <h2 class="text-center font-bold uppercase tracking-wide underline text-xs mb-3">
        Statutory Auditor's Certificate on Security Deposit / Fixed Assets
      </h2>

      <p class="text-justify mb-3 text-[11px]">
        We have examined the audited Balance Sheet and books of accounts of <strong>${instName}</strong> as on 31st March 2024. Based on the verification of bank statements and lien endorsements:
      </p>

      <table class="w-full border-collapse border border-slate-300 text-[11px] mb-4">
        <thead>
          <tr class="bg-slate-100 font-bold">
            <th class="border border-slate-300 p-2 text-left">FDR Number</th>
            <th class="border border-slate-300 p-2 text-left">Bank Name</th>
            <th class="border border-slate-300 p-2 text-left">Principal (INR)</th>
            <th class="border border-slate-300 p-2 text-left">Lien Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="border border-slate-300 p-2 font-mono font-bold">${fdrNo}</td>
            <td class="border border-slate-300 p-2">${bank}</td>
            <td class="border border-slate-300 p-2 font-bold">${formattedAmt}</td>
            <td class="border border-slate-300 p-2 text-emerald-800 font-semibold">Joint Lien to AICTE (Recorded)</td>
          </tr>
        </tbody>
      </table>

      <p class="text-justify text-[11px] mb-6">
        This certificate is issued at the specific request of the management for submission to the All India Council for Technical Education (AICTE) towards regulatory compliance.
      </p>

      <div class="flex justify-between items-end pt-4 border-t border-slate-300">
        <div>
          <div class="w-20 h-10 border border-slate-400 rounded flex items-center justify-center text-[9px] text-slate-400 italic mb-1">
            [CA Firm Seal]
          </div>
        </div>
        <div class="text-right">
          <p class="font-serif italic font-bold text-sm">CA. K. G. Singhania</p>
          <p class="font-bold text-slate-900">Partner (M.No. 089124)</p>
          <p class="text-[10px] text-slate-600">Chartered Accountants</p>
        </div>
      </div>
    </div>
  `;
}
