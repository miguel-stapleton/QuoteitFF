import { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import type { CalculationResult } from '../types';

interface Props {
  calculations: CalculationResult[];
  onClose: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

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
  // All lines that are NOT "Guests", NOT travel, NOT assistant-travel
  let total = 0;
  for (const l of calc.lines) {
    const lbl = l.label.toLowerCase();
    if (lbl.startsWith('guest')) continue;
    if (lbl.includes('travel')) continue;
    total += l.total;
  }
  return total;
}

// Return per-day travel fee lines from dayBreakdowns
function dayTravelLines(calc: CalculationResult, dayIndex: number): { bride: number; assistantTotal: number; assistantQty: number; assistantUnit: number } {
  const db = calc.dayBreakdowns[dayIndex];
  if (!db) return { bride: 0, assistantTotal: 0, assistantQty: 0, assistantUnit: 0 };
  let bride = 0;
  let assistantTotal = 0;
  let assistantQty = 0;
  let assistantUnit = 0;
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

// ── types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

// dayGuests[dayIndex] = ['Peter', 'Paul', 'Mary']
type DayGuests = string[][];

// assignments[dayIndex][guestName] = { makeup: bool, hair: bool }
type Assignments = Record<number, Record<string, { makeup: boolean; hair: boolean }>>;

// bridePayingFor[guestName] = true means bride pays for that guest
type BridePayingFor = Record<string, boolean>;

// travelPayers[serviceType][dayIndex]['bride' | 'assistant_N'] = payerName
type TravelPayers = Record<'makeup' | 'hair', Record<number, Record<string, string>>>;

export function SplitPaymentModal({ calculations, onClose }: Props) {
  const makeupCalc = calculations.find(c => c.serviceType === 'makeup') ?? null;
  const hairCalc = calculations.find(c => c.serviceType === 'hair') ?? null;
  const days = (makeupCalc ?? hairCalc)?.dayBreakdowns ?? [];
  const numDays = Math.max(days.length, 1);

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [dayGuestInputs, setDayGuestInputs] = useState<string[]>(Array(numDays).fill(''));

  // Step 2
  const [assignments, setAssignments] = useState<Assignments>({});

  // Step 3
  const [bridePayingFor, setBridePayingFor] = useState<BridePayingFor>({});
  const [assistantMUANames, setAssistantMUANames] = useState<string[]>([]);
  const [assistantHairNames, setAssistantHairNames] = useState<string[]>([]);

  // Step 4
  const [travelPayers, setTravelPayers] = useState<TravelPayers>({ makeup: {}, hair: {} });

  const [error, setError] = useState('');

  // ── derived ────────────────────────────────────────────────────────────────

  const dayGuests: DayGuests = useMemo(
    () => dayGuestInputs.map(parseNames),
    [dayGuestInputs]
  );

  const allPayers = useMemo(() => {
    const names = new Set<string>();
    names.add('Bride');
    dayGuests.forEach(gs => gs.forEach(g => names.add(g)));
    return Array.from(names);
  }, [dayGuests]);

  // Per day: expected guest count per service from the quote
  const expectedCounts = useMemo(() => {
    return days.map((_, di) => {
      let makeup = 0;
      let hair = 0;
      if (makeupCalc) {
        const db = makeupCalc.dayBreakdowns[di];
        if (db) {
          for (const l of db.lines) {
            if (l.label.toLowerCase().startsWith('guest')) makeup += (l.qty ?? 0);
          }
        }
      }
      if (hairCalc) {
        const db = hairCalc.dayBreakdowns[di];
        if (db) {
          for (const l of db.lines) {
            if (l.label.toLowerCase().startsWith('guest')) hair += (l.qty ?? 0);
          }
        }
      }
      return { makeup, hair };
    });
  }, [days, makeupCalc, hairCalc]);

  // Assistant counts per day per service
  const assistantCounts = useMemo(() => {
    return days.map((_, di) => {
      const { assistantQty: muaQty } = makeupCalc ? dayTravelLines(makeupCalc, di) : { assistantQty: 0 };
      const { assistantQty: hairQty } = hairCalc ? dayTravelLines(hairCalc, di) : { assistantQty: 0 };
      return { makeup: muaQty, hair: hairQty };
    });
  }, [days, makeupCalc, hairCalc]);

  const maxMUAAssistants = Math.max(...assistantCounts.map(d => d.makeup), 0);
  const maxHairAssistants = Math.max(...assistantCounts.map(d => d.hair), 0);

  // ── step navigation ────────────────────────────────────────────────────────

  function goNext() {
    setError('');

    if (step === 1) {
      // Validate at least one name per day
      for (let i = 0; i < numDays; i++) {
        if (dayGuests[i].length === 0) {
          setError(`Please enter at least one guest name for Day ${i + 1}.`);
          return;
        }
      }
      // Pre-fill assignments
      const init: Assignments = {};
      for (let di = 0; di < numDays; di++) {
        init[di] = {};
        for (const g of dayGuests[di]) {
          init[di][g] = { makeup: false, hair: false };
        }
      }
      setAssignments(init);
      setStep(2);
      return;
    }

    if (step === 2) {
      // Validate counts per day
      for (let di = 0; di < numDays; di++) {
        const exp = expectedCounts[di];
        const dayA = assignments[di] ?? {};
        const makeupCount = Object.values(dayA).filter(v => v.makeup).length;
        const hairCount = Object.values(dayA).filter(v => v.hair).length;
        const dayLabel = numDays > 1 ? ` for Day ${di + 1}` : '';
        if (makeupCalc && exp.makeup > 0 && makeupCount !== exp.makeup) {
          setError(`Makeup guest count${dayLabel} should be ${exp.makeup} but you selected ${makeupCount}.`);
          return;
        }
        if (hairCalc && exp.hair > 0 && hairCount !== exp.hair) {
          setError(`Hair guest count${dayLabel} should be ${exp.hair} but you selected ${hairCount}.`);
          return;
        }
      }
      // Init step 3
      const initBride: BridePayingFor = {};
      const allGuests = Array.from(new Set(dayGuests.flat()));
      allGuests.forEach(g => { initBride[g] = false; });
      setBridePayingFor(initBride);
      setAssistantMUANames(Array(maxMUAAssistants).fill(''));
      setAssistantHairNames(Array(maxHairAssistants).fill(''));
      setStep(3);
      return;
    }

    if (step === 3) {
      // Init step 4 payers with 'Bride' as default
      const init: TravelPayers = { makeup: {}, hair: {} };
      for (let di = 0; di < numDays; di++) {
        const { bride: muaBride, assistantQty: muaAQty } = makeupCalc ? dayTravelLines(makeupCalc, di) : { bride: 0, assistantQty: 0 };
        const { bride: hairBride, assistantQty: hairAQty } = hairCalc ? dayTravelLines(hairCalc, di) : { bride: 0, assistantQty: 0 };
        init.makeup[di] = {};
        init.hair[di] = {};
        if (muaBride > 0) init.makeup[di]['bride_travel'] = 'Bride';
        for (let ai = 0; ai < muaAQty; ai++) {
          const name = assistantMUANames[ai] || `Assistant MUA ${ai + 1}`;
          init.makeup[di][`assistant_${ai}`] = 'Bride';
          init.makeup[di][`_asst_label_${ai}`] = name;
        }
        if (hairBride > 0) init.hair[di]['bride_travel'] = 'Bride';
        for (let ai = 0; ai < hairAQty; ai++) {
          const name = assistantHairNames[ai] || `Assistant Hair ${ai + 1}`;
          init.hair[di][`assistant_${ai}`] = 'Bride';
          init.hair[di][`_asst_label_${ai}`] = name;
        }
      }
      setTravelPayers(init);
      setStep(4);
      return;
    }

    if (step === 4) {
      generatePDF();
      return;
    }
  }

  function setTravelPayer(service: 'makeup' | 'hair', di: number, key: string, payer: string) {
    setTravelPayers(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        [di]: { ...prev[service][di], [key]: payer }
      }
    }));
  }

  // ── PDF generation ─────────────────────────────────────────────────────────

  function generatePDF() {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 15;
    const textW = pageW - margin * 2;
    let y = margin;

    const allGuests = Array.from(new Set(dayGuests.flat()));
    const payers = ['Bride', ...allGuests];

    // For each payer, compute what they owe
    // Payer totals: { items: {label, amount}[], subtotal }
    const payerBreakdowns: Record<string, { label: string; amount: number }[]> = {};
    payers.forEach(p => { payerBreakdowns[p] = []; });

    const makeupGuestUnit = makeupCalc ? guestUnitPrice(makeupCalc) : 0;
    const hairGuestUnit = hairCalc ? guestUnitPrice(hairCalc) : 0;

    // Bride's own service costs (non-guest, non-travel lines)
    if (makeupCalc) {
      const amt = brideServiceTotal(makeupCalc);
      if (amt > 0) payerBreakdowns['Bride'].push({ label: `Makeup — Bride's services`, amount: amt });
    }
    if (hairCalc) {
      const amt = brideServiceTotal(hairCalc);
      if (amt > 0) payerBreakdowns['Bride'].push({ label: `Hair — Bride's services`, amount: amt });
    }

    // Guest services per day
    for (let di = 0; di < numDays; di++) {
      const dayLabel = numDays > 1 ? ` (Day ${di + 1})` : '';
      const dayA = assignments[di] ?? {};
      for (const guest of (dayGuests[di] ?? [])) {
        const a = dayA[guest] ?? { makeup: false, hair: false };
        const payer = bridePayingFor[guest] ? 'Bride' : guest;
        if (a.makeup && makeupGuestUnit > 0) {
          payerBreakdowns[payer].push({
            label: `Makeup — ${guest}${dayLabel}`,
            amount: makeupGuestUnit
          });
        }
        if (a.hair && hairGuestUnit > 0) {
          payerBreakdowns[payer].push({
            label: `Hair — ${guest}${dayLabel}`,
            amount: hairGuestUnit
          });
        }
      }
    }

    // Travel fees per day
    for (let di = 0; di < numDays; di++) {
      const dayLabel = numDays > 1 ? ` (Day ${di + 1})` : '';
      if (makeupCalc) {
        const { bride: muaBride, assistantQty: muaAQty, assistantUnit: muaAUnit } = dayTravelLines(makeupCalc, di);
        const tp = travelPayers.makeup[di] ?? {};
        if (muaBride > 0) {
          const payer = tp['bride_travel'] ?? 'Bride';
          payerBreakdowns[payer]?.push({ label: `Makeup travel fee${dayLabel}`, amount: muaBride });
        }
        for (let ai = 0; ai < muaAQty; ai++) {
          const payer = tp[`assistant_${ai}`] ?? 'Bride';
          const name = assistantMUANames[ai] || `Assistant MUA ${ai + 1}`;
          payerBreakdowns[payer]?.push({ label: `Makeup — ${name}'s travel fee${dayLabel}`, amount: muaAUnit });
        }
      }
      if (hairCalc) {
        const { bride: hairBride, assistantQty: hairAQty, assistantUnit: hairAUnit } = dayTravelLines(hairCalc, di);
        const tp = travelPayers.hair[di] ?? {};
        if (hairBride > 0) {
          const payer = tp['bride_travel'] ?? 'Bride';
          payerBreakdowns[payer]?.push({ label: `Hair travel fee${dayLabel}`, amount: hairBride });
        }
        for (let ai = 0; ai < hairAQty; ai++) {
          const payer = tp[`assistant_${ai}`] ?? 'Bride';
          const name = assistantHairNames[ai] || `Assistant Hair ${ai + 1}`;
          payerBreakdowns[payer]?.push({ label: `Hair — ${name}'s travel fee${dayLabel}`, amount: hairAUnit });
        }
      }
    }

    // Payments already made → deducted from bride
    const totalPaid = calculations.reduce((s, c) => s + c.totalPaid, 0);

    // ── render PDF ──

    const addLine = () => {
      if (y > 270) { pdf.addPage(); y = margin; }
    };

    const section = (title: string) => {
      addLine();
      pdf.setFontSize(13);
      pdf.setFont('helvetica', 'bold');
      pdf.text(title, margin, y);
      y += 7;
      pdf.setDrawColor(200);
      pdf.line(margin, y - 1, pageW - margin, y - 1);
      y += 3;
    };

    const row = (label: string, amount: number, bold = false) => {
      if (y > 275) { pdf.addPage(); y = margin; }
      pdf.setFontSize(10);
      pdf.setFont('helvetica', bold ? 'bold' : 'normal');
      pdf.setTextColor(0);
      const wrapped = pdf.splitTextToSize(label, textW - 35);
      pdf.text(wrapped, margin, y);
      pdf.text(fmtEur(amount), pageW - margin, y, { align: 'right' });
      y += wrapped.length * 5 + 1;
    };

    // Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Split Payment Summary', margin, y);
    y += 10;

    for (const payer of payers) {
      const items = payerBreakdowns[payer] ?? [];
      const subtotal = items.reduce((s, i) => s + i.amount, 0);

      section(payer === 'Bride' ? 'BRIDE' : payer.toUpperCase());

      if (items.length === 0) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No charges', margin, y);
        y += 6;
      } else {
        for (const item of items) row(item.label, item.amount);
      }

      if (payer === 'Bride' && totalPaid > 0) {
        row('Payments already made', -totalPaid);
        const net = Math.max(0, subtotal - totalPaid);
        y += 1;
        row('TOTAL DUE', net, true);
      } else {
        y += 1;
        row('TOTAL DUE', subtotal, true);
      }
      y += 6;
    }

    const brideName = calculations[0]?.weddingDates ? '' : '';
    pdf.save(`Split_Payment${brideName}.pdf`);
    onClose();
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  };
  const boxStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 12, padding: '2rem',
    width: '90%', maxWidth: 520, maxHeight: '85vh', overflowY: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
  };
  const label: React.CSSProperties = { fontWeight: 600, marginBottom: 6, display: 'block' };
  const input: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db',
    fontSize: 14, boxSizing: 'border-box', marginBottom: 10
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Split Payment — Step {step} of 4</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div>
            <p style={{ marginTop: 0, color: '#374151' }}>Enter the names of guests, separated by commas.</p>
            {Array.from({ length: numDays }, (_, di) => (
              <div key={di}>
                {numDays > 1 && (
                  <span style={label}>
                    Day {di + 1}{days[di]?.date ? ` — ${new Date(days[di].date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                  </span>
                )}
                {numDays === 1 && <span style={label}>Guest names</span>}
                <input
                  type="text"
                  placeholder="e.g. Peter, Paul, Mary"
                  value={dayGuestInputs[di]}
                  onChange={e => setDayGuestInputs(prev => prev.map((v, i) => i === di ? e.target.value : v))}
                  style={input}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && (
          <div>
            <p style={{ marginTop: 0, color: '#374151' }}>Assign services to each guest per day.</p>
            {Array.from({ length: numDays }, (_, di) => (
              <div key={di} style={{ marginBottom: 16 }}>
                {numDays > 1 && (
                  <strong style={{ display: 'block', marginBottom: 8 }}>
                    Day {di + 1}{days[di]?.date ? ` — ${new Date(days[di].date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}` : ''}
                  </strong>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px 12px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: '#6b7280' }}>GUEST</span>
                  {makeupCalc && <span style={{ fontWeight: 600, fontSize: 12, color: '#6b7280' }}>MAKEUP</span>}
                  {hairCalc && <span style={{ fontWeight: 600, fontSize: 12, color: '#6b7280' }}>HAIR</span>}
                  {(dayGuests[di] ?? []).map(guest => (
                    <>
                      <span key={guest + '_name'} style={{ fontSize: 14 }}>{guest}</span>
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
                        <input key={guest + '_hair'} type="checkbox"
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
                {/* Live count feedback */}
                {(() => {
                  const dayA = assignments[di] ?? {};
                  const muCount = Object.values(dayA).filter(v => v.makeup).length;
                  const hCount = Object.values(dayA).filter(v => v.hair).length;
                  const exp = expectedCounts[di];
                  return (
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>
                      {makeupCalc && <span style={{ color: muCount === exp.makeup ? '#059669' : '#b91c1c', marginRight: 12 }}>Makeup: {muCount}/{exp.makeup}</span>}
                      {hairCalc && <span style={{ color: hCount === exp.hair ? '#059669' : '#b91c1c' }}>Hair: {hCount}/{exp.hair}</span>}
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && (() => {
          const allGuests = Array.from(new Set(dayGuests.flat()));
          return (
            <div>
              <p style={{ marginTop: 0, color: '#374151' }}>Which guests' services is the bride paying for?</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked disabled style={{ width: 16, height: 16 }} />
                <span>Her own services (always)</span>
              </label>
              {allGuests.map(g => (
                <label key={g} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, cursor: 'pointer' }}>
                  <input type="checkbox"
                    checked={bridePayingFor[g] ?? false}
                    onChange={e => setBridePayingFor(prev => ({ ...prev, [g]: e.target.checked }))}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>{g}</span>
                </label>
              ))}

              {maxMUAAssistants > 0 && (
                <div style={{ marginTop: 16 }}>
                  <strong>Makeup assistant name{maxMUAAssistants > 1 ? 's' : ''}:</strong>
                  {Array.from({ length: maxMUAAssistants }, (_, ai) => (
                    <div key={ai} style={{ marginTop: 6 }}>
                      <label style={{ fontSize: 13, color: '#374151' }}>{ai === 0 ? '1st' : ai === 1 ? '2nd' : `${ai + 1}th`} Assistant MUA</label>
                      <input
                        type="text"
                        placeholder={`Name of assistant MUA ${ai + 1}`}
                        value={assistantMUANames[ai] ?? ''}
                        onChange={e => setAssistantMUANames(prev => prev.map((v, i) => i === ai ? e.target.value : v))}
                        style={input}
                      />
                    </div>
                  ))}
                </div>
              )}

              {maxHairAssistants > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>Hair assistant name{maxHairAssistants > 1 ? 's' : ''}:</strong>
                  {Array.from({ length: maxHairAssistants }, (_, ai) => (
                    <div key={ai} style={{ marginTop: 6 }}>
                      <label style={{ fontSize: 13, color: '#374151' }}>{ai === 0 ? '1st' : ai === 1 ? '2nd' : `${ai + 1}th`} Assistant Hair</label>
                      <input
                        type="text"
                        placeholder={`Name of assistant hair ${ai + 1}`}
                        value={assistantHairNames[ai] ?? ''}
                        onChange={e => setAssistantHairNames(prev => prev.map((v, i) => i === ai ? e.target.value : v))}
                        style={input}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── STEP 4 ── */}
        {step === 4 && (
          <div>
            <p style={{ marginTop: 0, color: '#374151' }}>Who pays for each travel fee?</p>
            {Array.from({ length: numDays }, (_, di) => {
              const dayLabel = numDays > 1 ? ` — Day ${di + 1}` : '';
              const muLines = makeupCalc ? dayTravelLines(makeupCalc, di) : null;
              const hLines = hairCalc ? dayTravelLines(hairCalc, di) : null;
              const hasMUBride = muLines && muLines.bride > 0;
              const hasMUAssistants = muLines && muLines.assistantQty > 0;
              const hasHBride = hLines && hLines.bride > 0;
              const hasHAssistants = hLines && hLines.assistantQty > 0;
              if (!hasMUBride && !hasMUAssistants && !hasHBride && !hasHAssistants) return null;

              const selectStyle: React.CSSProperties = {
                padding: '6px 8px', borderRadius: 6, border: '1px solid #d1d5db',
                fontSize: 13, background: '#fff', minWidth: 120
              };

              return (
                <div key={di} style={{ marginBottom: 16 }}>
                  {numDays > 1 && <strong style={{ display: 'block', marginBottom: 8 }}>Day {di + 1}</strong>}
                  {[
                    hasMUBride && (
                      <div key='mu_bride' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                        <span style={{ fontSize: 13 }}>Makeup travel fee{dayLabel} ({fmtEur(muLines!.bride)})</span>
                        <select style={selectStyle}
                          value={travelPayers.makeup[di]?.['bride_travel'] ?? 'Bride'}
                          onChange={e => setTravelPayer('makeup', di, 'bride_travel', e.target.value)}>
                          {allPayers.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    ),
                    hasMUAssistants && Array.from({ length: muLines!.assistantQty }, (_, ai) => (
                      <div key={`mu_a_${ai}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                        <span style={{ fontSize: 13 }}>{assistantMUANames[ai] || `Assistant MUA ${ai + 1}`} travel fee{dayLabel} ({fmtEur(muLines!.assistantUnit)})</span>
                        <select style={selectStyle}
                          value={travelPayers.makeup[di]?.[`assistant_${ai}`] ?? 'Bride'}
                          onChange={e => setTravelPayer('makeup', di, `assistant_${ai}`, e.target.value)}>
                          {allPayers.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    )),
                    hasHBride && (
                      <div key='h_bride' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                        <span style={{ fontSize: 13 }}>Hair travel fee{dayLabel} ({fmtEur(hLines!.bride)})</span>
                        <select style={selectStyle}
                          value={travelPayers.hair[di]?.['bride_travel'] ?? 'Bride'}
                          onChange={e => setTravelPayer('hair', di, 'bride_travel', e.target.value)}>
                          {allPayers.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    ),
                    hasHAssistants && Array.from({ length: hLines!.assistantQty }, (_, ai) => (
                      <div key={`h_a_${ai}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                        <span style={{ fontSize: 13 }}>{assistantHairNames[ai] || `Assistant Hair ${ai + 1}`} travel fee{dayLabel} ({fmtEur(hLines!.assistantUnit)})</span>
                        <select style={selectStyle}
                          value={travelPayers.hair[di]?.[`assistant_${ai}`] ?? 'Bride'}
                          onChange={e => setTravelPayer('hair', di, `assistant_${ai}`, e.target.value)}>
                          {allPayers.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                    ))
                  ]}
                </div>
              );
            })}
          </div>
        )}

        {error && <p style={{ color: '#b91c1c', fontSize: 13, margin: '8px 0 0' }}>{error}</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: 10 }}>
          {step > 1
            ? <button className="btn btn-secondary" onClick={() => { setError(''); setStep(s => (s - 1) as Step); }}>Back</button>
            : <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          }
          <button className="btn btn-primary" onClick={goNext}>
            {step === 4 ? 'Generate PDF' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
