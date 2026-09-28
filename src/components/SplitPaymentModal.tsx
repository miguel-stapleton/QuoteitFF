import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import type { CalculationResult, MakeupForm, HairForm } from '../types';

interface Props {
  calculations: CalculationResult[];
  makeupForm?: MakeupForm | null;
  hairForm?: HairForm | null;
  onClose: () => void;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function parseNames(raw: string): string[] {
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function fmtEur(n: number) {
  return `€${n.toFixed(2)}`;
}

function guestUnitPrice(calc: CalculationResult): number {
  for (const db of calc.dayBreakdowns) {
    for (const l of db.lines) {
      if (l.label.toLowerCase().startsWith('guest') && l.unit != null) return l.unit;
    }
  }
  for (const l of calc.lines) {
    if (l.label.toLowerCase().startsWith('guest') && l.unit != null) return l.unit;
  }
  return 0;
}

function brideServiceTotal(calc: CalculationResult): number {
  let total = 0;
  for (const l of calc.lines) {
    const lbl = l.label.toLowerCase();
    if (lbl.startsWith('guest')) continue;
    if (lbl.includes('travel')) continue;
    total += l.total;
  }
  return total;
}

function dayTravelLines(calc: CalculationResult, dayIndex: number) {
  const db = calc.dayBreakdowns[dayIndex];
  if (!db) return { bride: 0, assistantTotal: 0, assistantQty: 0, assistantUnit: 0 };
  let bride = 0, assistantTotal = 0, assistantQty = 0, assistantUnit = 0;
  for (const l of db.lines) {
    const lbl = l.label.toLowerCase();
    if (lbl.includes('travelling fee') || lbl.includes('traveling fee')) {
      bride += l.total;
    } else if (lbl.includes('assistant travel')) {
      assistantTotal += l.total;
      assistantQty += (l.qty ?? 1);
      if (l.unit != null) assistantUnit = l.unit;
    }
  }
  return { bride, assistantTotal, assistantQty, assistantUnit };
}

// ── types ─────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;
type DayGuests = string[][];
type Assignments = Record<number, Record<string, { makeup: boolean; hair: boolean }>>;
// artistAssignments[dayIndex][guestName] = { makeup: 'Teresa', hair: 'Ana' }
type ArtistAssignments = Record<number, Record<string, { makeup: string; hair: string }>>;
type BridePayingFor = Record<string, boolean>;
type TravelPayers = Record<'makeup' | 'hair', Record<number, Record<string, string>>>;

// ── component ─────────────────────────────────────────────────────────────────

export function SplitPaymentModal({ calculations, makeupForm, hairForm, onClose }: Props) {
  const makeupCalc = calculations.find(c => c.serviceType === 'makeup') ?? null;
  const hairCalc   = calculations.find(c => c.serviceType === 'hair')   ?? null;
  const days       = (makeupCalc ?? hairCalc)?.dayBreakdowns ?? [];
  const numDays    = Math.max(days.length, 1);

  const mainMUAName   = makeupCalc?.artistName ?? 'Main MUA';
  const mainHairName  = hairCalc?.artistName   ?? 'Main Hair';

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState('');

  // Step 1
  const [dayGuestInputs, setDayGuestInputs] = useState<string[]>(Array(numDays).fill(''));

  // Step 2
  const [assignments, setAssignments] = useState<Assignments>({});

  // Step 3
  const [numMUAAssistants, setNumMUAAssistants]     = useState<number | null>(null); // null = not yet set
  const [numHairAssistants, setNumHairAssistants]   = useState<number | null>(null);
  const [assistantMUANames, setAssistantMUANames]   = useState<string[]>([]);
  const [assistantHairNames, setAssistantHairNames] = useState<string[]>([]);
  const [artistAssignments, setArtistAssignments]   = useState<ArtistAssignments>({});

  // Step 4
  const [bridePayingFor, setBridePayingFor] = useState<BridePayingFor>({});

  // Step 5
  const [travelPayers, setTravelPayers] = useState<TravelPayers>({ makeup: {}, hair: {} });

  // ── derived ───────────────────────────────────────────────────────────────

  const dayGuests: DayGuests = useMemo(
    () => dayGuestInputs.map(parseNames),
    [dayGuestInputs]
  );

  const allGuests = useMemo(
    () => Array.from(new Set(dayGuests.flat())),
    [dayGuests]
  );

  const allPayers = useMemo(() => ['Bride', ...allGuests], [allGuests]);

  const expectedCounts = useMemo(() => days.map((_, di) => {
    let makeup = 0, hair = 0;
    if (makeupCalc) {
      const db = makeupCalc.dayBreakdowns[di];
      if (db) for (const l of db.lines) if (l.label.toLowerCase().startsWith('guest')) makeup += (l.qty ?? 0);
    }
    if (hairCalc) {
      const db = hairCalc.dayBreakdowns[di];
      if (db) for (const l of db.lines) if (l.label.toLowerCase().startsWith('guest')) hair += (l.qty ?? 0);
    }
    return { makeup, hair };
  }), [days, makeupCalc, hairCalc]);

  const assistantCounts = useMemo(() => days.map((_, di) => ({
    makeup: makeupCalc ? dayTravelLines(makeupCalc, di).assistantQty : 0,
    hair:   hairCalc   ? dayTravelLines(hairCalc,   di).assistantQty : 0,
  })), [days, makeupCalc, hairCalc]);

  // Derive from numPeople - 1 across all days (user-entered "how many people incl. main artist")
  const defaultMUAAssistants = makeupForm
    ? Math.max(...(makeupForm.perDay.map(d => Math.max(0, (d.numPeople ?? 1) - 1))), 0)
    : Math.max(...assistantCounts.map(d => d.makeup), 0);
  const defaultHairAssistants = hairForm
    ? Math.max(...(hairForm.perDay.map(d => Math.max(0, (d.numPeople ?? 1) - 1))), 0)
    : Math.max(...assistantCounts.map(d => d.hair), 0);
  const maxMUAAssistants  = numMUAAssistants  ?? defaultMUAAssistants;
  const maxHairAssistants = numHairAssistants ?? defaultHairAssistants;

  // Available artists per service (filled with real names from step 3 inputs)
  const makeupArtists = useMemo(() =>
    [mainMUAName, ...assistantMUANames.map((n, i) => n.trim() || `Assistant MUA ${i + 1}`)].slice(0, 1 + maxMUAAssistants),
    [mainMUAName, assistantMUANames, maxMUAAssistants]
  );
  const hairArtists = useMemo(() =>
    [mainHairName, ...assistantHairNames.map((n, i) => n.trim() || `Assistant Hair ${i + 1}`)].slice(0, 1 + maxHairAssistants),
    [mainHairName, assistantHairNames, maxHairAssistants]
  );

  // ── navigation ────────────────────────────────────────────────────────────

  function goNext() {
    setError('');

    // ── Step 1 → 2 ──
    if (step === 1) {
      for (let i = 0; i < numDays; i++) {
        if (dayGuests[i].length === 0) {
          setError(`Please enter at least one guest name for Day ${i + 1}.`);
          return;
        }
      }
      const init: Assignments = {};
      for (let di = 0; di < numDays; di++) {
        init[di] = {};
        for (const g of dayGuests[di]) init[di][g] = { makeup: false, hair: false };
      }
      setAssignments(init);
      setStep(2);
      return;
    }

    // ── Step 2 → 3 ──
    if (step === 2) {
      for (let di = 0; di < numDays; di++) {
        const exp  = expectedCounts[di];
        const dayA = assignments[di] ?? {};
        const muCount = Object.values(dayA).filter(v => v.makeup).length;
        const haCount = Object.values(dayA).filter(v => v.hair).length;
        const dayLabel = numDays > 1 ? ` for Day ${di + 1}` : '';
        if (makeupCalc && exp.makeup > 0 && muCount !== exp.makeup) {
          setError(`Makeup guest count${dayLabel} should be ${exp.makeup} but ${muCount} selected.`);
          return;
        }
        if (hairCalc && exp.hair > 0 && haCount !== exp.hair) {
          setError(`Hair guest count${dayLabel} should be ${exp.hair} but ${haCount} selected.`);
          return;
        }
      }
      // Init assistant counts and name arrays
      setNumMUAAssistants(n => n ?? defaultMUAAssistants);
      setNumHairAssistants(n => n ?? defaultHairAssistants);
      setAssistantMUANames(prev => {
        const a = Array(maxMUAAssistants).fill('');
        return a.map((_, i) => prev[i] ?? '');
      });
      setAssistantHairNames(prev => {
        const a = Array(maxHairAssistants).fill('');
        return a.map((_, i) => prev[i] ?? '');
      });
      // Init artist assignments with main artist as default
      const initAA: ArtistAssignments = {};
      for (let di = 0; di < numDays; di++) {
        initAA[di] = {};
        for (const g of (dayGuests[di] ?? [])) {
          initAA[di][g] = { makeup: mainMUAName, hair: mainHairName };
        }
      }
      setArtistAssignments(initAA);
      setStep(3);
      return;
    }

    // ── Step 3 → 4 ──
    if (step === 3) {
      const initBride: BridePayingFor = {};
      allGuests.forEach(g => { initBride[g] = false; });
      setBridePayingFor(initBride);
      setStep(4);
      return;
    }

    // ── Step 4 → 5 ──
    if (step === 4) {
      const init: TravelPayers = { makeup: {}, hair: {} };
      for (let di = 0; di < numDays; di++) {
        const { bride: muaBride, assistantQty: muaAQty } = makeupCalc ? dayTravelLines(makeupCalc, di) : { bride: 0, assistantQty: 0 };
        const { bride: hBride,   assistantQty: hAQty   } = hairCalc   ? dayTravelLines(hairCalc,   di) : { bride: 0, assistantQty: 0 };
        init.makeup[di] = {};
        init.hair[di]   = {};
        if (muaBride > 0) init.makeup[di]['bride_travel'] = 'Bride';
        for (let ai = 0; ai < muaAQty; ai++) init.makeup[di][`assistant_${ai}`] = 'Bride';
        if (hBride > 0)  init.hair[di]['bride_travel'] = 'Bride';
        for (let ai = 0; ai < hAQty;   ai++) init.hair[di][`assistant_${ai}`]   = 'Bride';
      }
      setTravelPayers(init);
      setStep(5);
      return;
    }

    // ── Step 5 → PDF ──
    if (step === 5) {
      generatePDF();
    }
  }

  function goBack() {
    setError('');
    setStep(s => (s - 1) as Step);
  }

  function setTravelPayer(service: 'makeup' | 'hair', di: number, key: string, payer: string) {
    setTravelPayers(prev => ({
      ...prev,
      [service]: { ...prev[service], [di]: { ...prev[service][di], [key]: payer } }
    }));
  }

  // ── PDF ───────────────────────────────────────────────────────────────────

  function generatePDF() {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210, margin = 15, textW = pageW - margin * 2;
    let y = margin;

    const makeupGuestUnit = makeupCalc ? guestUnitPrice(makeupCalc) : 0;
    const hairGuestUnit   = hairCalc   ? guestUnitPrice(hairCalc)   : 0;
    const totalPaid = calculations.reduce((s, c) => s + c.totalPaid, 0);

    // Build per-payer per-service breakdown
    // { payer -> { makeup: [{label, amount}], hair: [{label, amount}] } }
    type ServiceItems = { makeup: { label: string; amount: number }[]; hair: { label: string; amount: number }[] };
    const breakdown: Record<string, ServiceItems> = {};
    const ensurePayer = (p: string) => {
      if (!breakdown[p]) breakdown[p] = { makeup: [], hair: [] };
    };
    allPayers.forEach(ensurePayer);

    // Bride's own services (non-guest, non-travel lines)
    if (makeupCalc) {
      const amt = brideServiceTotal(makeupCalc);
      if (amt > 0) breakdown['Bride'].makeup.push({ label: `Bride's makeup services`, amount: amt });
    }
    if (hairCalc) {
      const amt = brideServiceTotal(hairCalc);
      if (amt > 0) breakdown['Bride'].hair.push({ label: `Bride's hair services`, amount: amt });
    }

    // Guest services per day
    for (let di = 0; di < numDays; di++) {
      const dayLabel   = numDays > 1 ? ` (Day ${di + 1})` : '';
      const dayA       = assignments[di] ?? {};
      const dayArtists = artistAssignments[di] ?? {};
      for (const guest of (dayGuests[di] ?? [])) {
        const svc    = dayA[guest] ?? { makeup: false, hair: false };
        const payer  = bridePayingFor[guest] ? 'Bride' : guest;
        ensurePayer(payer);
        if (svc.makeup && makeupGuestUnit > 0) {
          const artist = dayArtists[guest]?.makeup ?? mainMUAName;
          breakdown[payer].makeup.push({
            label: `${guest}${dayLabel} — by ${artist}`,
            amount: makeupGuestUnit
          });
        }
        if (svc.hair && hairGuestUnit > 0) {
          const artist = dayArtists[guest]?.hair ?? mainHairName;
          breakdown[payer].hair.push({
            label: `${guest}${dayLabel} — by ${artist}`,
            amount: hairGuestUnit
          });
        }
      }
    }

    // Travel fees
    for (let di = 0; di < numDays; di++) {
      const dayLabel = numDays > 1 ? ` (Day ${di + 1})` : '';
      if (makeupCalc) {
        const { bride: muaBride, assistantQty: muaAQty, assistantUnit: muaAUnit } = dayTravelLines(makeupCalc, di);
        const tp = travelPayers.makeup[di] ?? {};
        if (muaBride > 0) {
          const p = tp['bride_travel'] ?? 'Bride';
          ensurePayer(p);
          breakdown[p].makeup.push({ label: `Makeup travel fee${dayLabel}`, amount: muaBride });
        }
        for (let ai = 0; ai < muaAQty; ai++) {
          const p    = tp[`assistant_${ai}`] ?? 'Bride';
          const name = assistantMUANames[ai]?.trim() || `Assistant MUA ${ai + 1}`;
          ensurePayer(p);
          breakdown[p].makeup.push({ label: `${name}'s travel fee${dayLabel}`, amount: muaAUnit });
        }
      }
      if (hairCalc) {
        const { bride: hBride, assistantQty: hAQty, assistantUnit: hAUnit } = dayTravelLines(hairCalc, di);
        const tp = travelPayers.hair[di] ?? {};
        if (hBride > 0) {
          const p = tp['bride_travel'] ?? 'Bride';
          ensurePayer(p);
          breakdown[p].hair.push({ label: `Hair travel fee${dayLabel}`, amount: hBride });
        }
        for (let ai = 0; ai < hAQty; ai++) {
          const p    = tp[`assistant_${ai}`] ?? 'Bride';
          const name = assistantHairNames[ai]?.trim() || `Assistant Hair ${ai + 1}`;
          ensurePayer(p);
          breakdown[p].hair.push({ label: `${name}'s travel fee${dayLabel}`, amount: hAUnit });
        }
      }
    }

    // ── render ──

    const needPage = (needed = 12) => {
      if (y + needed > 280) { pdf.addPage(); y = margin; }
    };

    const hRule = (color = 180) => {
      pdf.setDrawColor(color);
      pdf.line(margin, y, pageW - margin, y);
      y += 4;
    };

    const textRow = (left: string, right: string, bold = false, color = 0) => {
      needPage(7);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setTextColor(color);
      const wrapped = pdf.splitTextToSize(left, textW - 35);
      pdf.text(wrapped, margin + 4, y);
      pdf.text(right, pageW - margin, y, { align: 'right' });
      pdf.setTextColor(0);
      y += wrapped.length * 5 + 1;
    };

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Split Payment Summary', margin, y);
    y += 10;

    for (const payer of allPayers) {
      needPage(20);
      const bd = breakdown[payer] ?? { makeup: [], hair: [] };
      const muTotal   = bd.makeup.reduce((s, i) => s + i.amount, 0);
      const haTotal   = bd.hair.reduce((s, i)   => s + i.amount, 0);
      const grossTotal = muTotal + haTotal;
      const deduction  = payer === 'Bride' ? totalPaid : 0;
      const netTotal   = Math.max(0, grossTotal - deduction);

      // Section header
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, y - 4, textW, 8, 'F');
      pdf.text(payer === 'Bride' ? 'BRIDE' : payer.toUpperCase(), margin + 2, y + 0.5);
      y += 7;

      // Makeup subsection
      if (bd.makeup.length > 0) {
        needPage(8);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Due for Makeup', margin + 2, y);
        y += 5;
        pdf.setTextColor(0);
        for (const item of bd.makeup) textRow(item.label, fmtEur(item.amount));
        textRow('Subtotal', fmtEur(muTotal), true);
        y += 2;
      }

      // Hair subsection
      if (bd.hair.length > 0) {
        needPage(8);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(80, 80, 80);
        pdf.text('Due for Hair', margin + 2, y);
        y += 5;
        pdf.setTextColor(0);
        for (const item of bd.hair) textRow(item.label, fmtEur(item.amount));
        textRow('Subtotal', fmtEur(haTotal), true);
        y += 2;
      }

      if (bd.makeup.length === 0 && bd.hair.length === 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(120, 120, 120);
        pdf.text('No charges', margin + 4, y);
        pdf.setTextColor(0);
        y += 6;
      }

      // Deduction + total
      if (deduction > 0) {
        textRow('Payments already made', `− ${fmtEur(deduction)}`, false, 100);
      }
      hRule(160);
      textRow('TOTAL DUE', fmtEur(netTotal), true);
      y += 8;
    }

    pdf.save('Split_Payment_Summary.pdf');
    onClose();
  }

  // ── styles ────────────────────────────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  };
  const boxStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 12, padding: '2rem',
    width: '90%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)', color: '#111'
  };
  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box', marginBottom: 8
  };
  const subHead: React.CSSProperties = { fontWeight: 700, fontSize: 13, marginBottom: 8, marginTop: 16, display: 'block' };
  const selectSty: React.CSSProperties = {
    padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db',
    fontSize: 13, background: '#fff', minWidth: 130
  };

  const dayDateLabel = (di: number) => {
    const d = days[di]?.date;
    return d
      ? `Day ${di + 1} — ${new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : `Day ${di + 1}`;
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Split Payment — Step {step} of 5</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        {/* ── STEP 1: Guest names ── */}
        {step === 1 && (
          <div>
            <p style={{ marginTop: 0, color: '#374151' }}>Enter the names of guests, separated by commas.</p>
            {Array.from({ length: numDays }, (_, di) => (
              <div key={di}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
                  {numDays > 1 ? dayDateLabel(di) : 'Guest names'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Peter, Paul, Mary"
                  value={dayGuestInputs[di]}
                  onChange={e => setDayGuestInputs(prev => prev.map((v, i) => i === di ? e.target.value : v))}
                  style={inp}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 2: Services per guest ── */}
        {step === 2 && (
          <div>
            <p style={{ marginTop: 0, color: '#374151' }}>Assign services to each guest.</p>
            {Array.from({ length: numDays }, (_, di) => (
              <div key={di} style={{ marginBottom: 20 }}>
                {numDays > 1 && <strong style={{ display: 'block', marginBottom: 8 }}>{dayDateLabel(di)}</strong>}
                <div style={{ display: 'grid', gridTemplateColumns: `1fr${makeupCalc ? ' 72px' : ''}${hairCalc ? ' 60px' : ''}`, gap: '6px 8px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: '#6b7280' }}>GUEST</span>
                  {makeupCalc && <span style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>MAKEUP</span>}
                  {hairCalc   && <span style={{ fontWeight: 600, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>HAIR</span>}
                  {(dayGuests[di] ?? []).map(guest => (
                    <>
                      <span key={guest + '_n'} style={{ fontSize: 14 }}>{guest}</span>
                      {makeupCalc && (
                        <input key={guest + '_mu'} type="checkbox"
                          checked={assignments[di]?.[guest]?.makeup ?? false}
                          onChange={e => setAssignments(prev => ({
                            ...prev,
                            [di]: { ...prev[di], [guest]: { ...prev[di]?.[guest], makeup: e.target.checked } }
                          }))}
                          style={{ width: 18, height: 18, cursor: 'pointer', justifySelf: 'center' }}
                        />
                      )}
                      {hairCalc && (
                        <input key={guest + '_ha'} type="checkbox"
                          checked={assignments[di]?.[guest]?.hair ?? false}
                          onChange={e => setAssignments(prev => ({
                            ...prev,
                            [di]: { ...prev[di], [guest]: { ...prev[di]?.[guest], hair: e.target.checked } }
                          }))}
                          style={{ width: 18, height: 18, cursor: 'pointer', justifySelf: 'center' }}
                        />
                      )}
                    </>
                  ))}
                </div>
                {/* Live count */}
                {(() => {
                  const dayA = assignments[di] ?? {};
                  const mu = Object.values(dayA).filter(v => v.makeup).length;
                  const ha = Object.values(dayA).filter(v => v.hair).length;
                  const exp = expectedCounts[di];
                  return (
                    <div style={{ fontSize: 12, marginTop: 6 }}>
                      {makeupCalc && <span style={{ color: mu === exp.makeup ? '#059669' : '#b91c1c', marginRight: 12 }}>Makeup: {mu}/{exp.makeup}</span>}
                      {hairCalc   && <span style={{ color: ha === exp.hair   ? '#059669' : '#b91c1c' }}>Hair: {ha}/{exp.hair}</span>}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 3: Artists ── */}
        {step === 3 && (
          <div>
            <p style={{ marginTop: 0, color: '#374151' }}>Name your assistants, then assign an artist to each guest.</p>

            {/* Assistant counts */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 16, flexWrap: 'wrap' }}>
              {makeupCalc && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 14 }}>
                  Makeup assistants:
                  <input type="number" min={0} max={10}
                    value={numMUAAssistants ?? defaultMUAAssistants}
                    onChange={e => {
                      const n = Math.max(0, parseInt(e.target.value) || 0);
                      setNumMUAAssistants(n);
                      setAssistantMUANames(prev => Array(n).fill('').map((_, i) => prev[i] ?? ''));
                    }}
                    style={{ width: 56, padding: '4px 6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                  />
                </label>
              )}
              {hairCalc && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 14 }}>
                  Hair assistants:
                  <input type="number" min={0} max={10}
                    value={numHairAssistants ?? defaultHairAssistants}
                    onChange={e => {
                      const n = Math.max(0, parseInt(e.target.value) || 0);
                      setNumHairAssistants(n);
                      setAssistantHairNames(prev => Array(n).fill('').map((_, i) => prev[i] ?? ''));
                    }}
                    style={{ width: 56, padding: '4px 6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                  />
                </label>
              )}
            </div>

            {/* Assistant names */}
            {maxMUAAssistants > 0 && (
              <>
                <span style={subHead}>Makeup assistants</span>
                {Array.from({ length: maxMUAAssistants }, (_, ai) => (
                  <input key={ai} type="text"
                    placeholder={`${ai === 0 ? '1st' : ai === 1 ? '2nd' : `${ai + 1}th`} Assistant MUA name`}
                    value={assistantMUANames[ai] ?? ''}
                    onChange={e => setAssistantMUANames(prev => prev.map((v, i) => i === ai ? e.target.value : v))}
                    style={inp}
                  />
                ))}
              </>
            )}
            {maxHairAssistants > 0 && (
              <>
                <span style={subHead}>Hair assistants</span>
                {Array.from({ length: maxHairAssistants }, (_, ai) => (
                  <input key={ai} type="text"
                    placeholder={`${ai === 0 ? '1st' : ai === 1 ? '2nd' : `${ai + 1}th`} Assistant Hair name`}
                    value={assistantHairNames[ai] ?? ''}
                    onChange={e => setAssistantHairNames(prev => prev.map((v, i) => i === ai ? e.target.value : v))}
                    style={inp}
                  />
                ))}
              </>
            )}

            {/* Artist assignment grid */}
            <span style={subHead}>Artist assignment</span>
            {Array.from({ length: numDays }, (_, di) => (
              <div key={di} style={{ marginBottom: 16 }}>
                {numDays > 1 && <strong style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>{dayDateLabel(di)}</strong>}
                {(dayGuests[di] ?? []).map(guest => {
                  const svc = assignments[di]?.[guest] ?? { makeup: false, hair: false };
                  if (!svc.makeup && !svc.hair) return null;
                  return (
                    <div key={guest} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                      <span style={{ minWidth: 80, fontSize: 14, fontWeight: 500 }}>{guest}</span>
                      {svc.makeup && makeupCalc && (
                        <select style={selectSty}
                          value={artistAssignments[di]?.[guest]?.makeup ?? mainMUAName}
                          onChange={e => setArtistAssignments(prev => ({
                            ...prev,
                            [di]: { ...prev[di], [guest]: { ...prev[di]?.[guest], makeup: e.target.value } }
                          }))}>
                          {makeupArtists.map(a => <option key={a}>{a}</option>)}
                        </select>
                      )}
                      {svc.hair && hairCalc && (
                        <select style={selectSty}
                          value={artistAssignments[di]?.[guest]?.hair ?? mainHairName}
                          onChange={e => setArtistAssignments(prev => ({
                            ...prev,
                            [di]: { ...prev[di], [guest]: { ...prev[di]?.[guest], hair: e.target.value } }
                          }))}>
                          {hairArtists.map(a => <option key={a}>{a}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 4: Bride paying for whom ── */}
        {step === 4 && (
          <div>
            <p style={{ marginTop: 0, color: '#374151' }}>Which guests' services is the bride paying for?</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <input type="checkbox" checked disabled style={{ width: 16, height: 16 }} />
              <span>Her own services (always)</span>
            </label>
            {allGuests.map(g => (
              <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                <input type="checkbox"
                  checked={bridePayingFor[g] ?? false}
                  onChange={e => setBridePayingFor(prev => ({ ...prev, [g]: e.target.checked }))}
                  style={{ width: 16, height: 16 }}
                />
                <span>{g}</span>
              </label>
            ))}
          </div>
        )}

        {/* ── STEP 5: Travel fee payers ── */}
        {step === 5 && (
          <div>
            <p style={{ marginTop: 0, color: '#374151' }}>Who pays for each travel fee?</p>
            {Array.from({ length: numDays }, (_, di) => {
              const mu = makeupCalc ? dayTravelLines(makeupCalc, di) : null;
              const ha = hairCalc   ? dayTravelLines(hairCalc,   di) : null;
              const hasAny = (mu && (mu.bride > 0 || mu.assistantQty > 0)) || (ha && (ha.bride > 0 || ha.assistantQty > 0));
              if (!hasAny) return null;
              return (
                <div key={di} style={{ marginBottom: 16 }}>
                  {numDays > 1 && <strong style={{ display: 'block', marginBottom: 8 }}>{dayDateLabel(di)}</strong>}
                  {mu && mu.bride > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                      <span style={{ fontSize: 13 }}>Makeup travel fee ({fmtEur(mu.bride)})</span>
                      <select style={selectSty}
                        value={travelPayers.makeup[di]?.['bride_travel'] ?? 'Bride'}
                        onChange={e => setTravelPayer('makeup', di, 'bride_travel', e.target.value)}>
                        {allPayers.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                  {mu && Array.from({ length: mu.assistantQty }, (_, ai) => (
                    <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                      <span style={{ fontSize: 13 }}>{assistantMUANames[ai]?.trim() || `Assistant MUA ${ai + 1}`} travel fee ({fmtEur(mu.assistantUnit)})</span>
                      <select style={selectSty}
                        value={travelPayers.makeup[di]?.[`assistant_${ai}`] ?? 'Bride'}
                        onChange={e => setTravelPayer('makeup', di, `assistant_${ai}`, e.target.value)}>
                        {allPayers.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  ))}
                  {ha && ha.bride > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                      <span style={{ fontSize: 13 }}>Hair travel fee ({fmtEur(ha.bride)})</span>
                      <select style={selectSty}
                        value={travelPayers.hair[di]?.['bride_travel'] ?? 'Bride'}
                        onChange={e => setTravelPayer('hair', di, 'bride_travel', e.target.value)}>
                        {allPayers.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                  {ha && Array.from({ length: ha.assistantQty }, (_, ai) => (
                    <div key={ai} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                      <span style={{ fontSize: 13 }}>{assistantHairNames[ai]?.trim() || `Assistant Hair ${ai + 1}`} travel fee ({fmtEur(ha.assistantUnit)})</span>
                      <select style={selectSty}
                        value={travelPayers.hair[di]?.[`assistant_${ai}`] ?? 'Bride'}
                        onChange={e => setTravelPayer('hair', di, `assistant_${ai}`, e.target.value)}>
                        {allPayers.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {error && <p style={{ color: '#b91c1c', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: 10 }}>
          {step > 1
            ? <button className="btn btn-secondary" onClick={goBack}>Back</button>
            : <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          }
          <button className="btn btn-primary" onClick={goNext}>
            {step === 5 ? 'Generate PDF' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
