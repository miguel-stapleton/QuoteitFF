import React, { useState, useEffect } from 'react';
import { CalculationResult, GrandSummary, Payment, CalculationLine, MakeupForm, HairForm, PriorityWarning, CommissionEntry } from '../types';
import jsPDF from 'jspdf';
import { QuotesAPI } from '../api/quotes';

interface QuoteResultFormProps {
  calculations: CalculationResult[];
  grandSummary: GrandSummary;
  brideName: string;
  onPaymentUpdate: (calculations: CalculationResult[]) => void;
  onStartOver: () => void;
  onEditForm?: () => void;
  // Cross-fill (optional)
  trialSyncEnabled?: boolean;
  makeupForm?: MakeupForm;
  hairForm?: HairForm;
  // Save/Load hooks
  getAppState?: () => any;
  applyLoadedAppState?: (state: any) => void;
  appVersion?: string;
  // Commissions (UI-only, excluded from PDF)
  commissions?: CommissionEntry[];
  onCommissionsChange?: (commissions: CommissionEntry[]) => void;
}

export const QuoteResultForm: React.FC<QuoteResultFormProps> = ({
  calculations,
  grandSummary,
  brideName,
  onPaymentUpdate,
  onStartOver,
  onEditForm,
  trialSyncEnabled,
  makeupForm,
  hairForm,
  getAppState,
  appVersion,
  commissions,
  onCommissionsChange
}) => {
  const [localCalculations, setLocalCalculations] = useState<CalculationResult[]>(calculations);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<null | { type: 'success' | 'error' | 'info'; text: string }>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);
  const [pendingOverwrite, setPendingOverwrite] = useState<{title: string, payload: any, existingId?: string} | null>(null);
  const [localCommissions, setLocalCommissions] = useState<CommissionEntry[]>(commissions || []);
  const showNotice = (n: { type: 'success' | 'error' | 'info'; text: string }, timeoutMs = 3500) => {
    setNotice(n);
    if (timeoutMs > 0) {
      window.setTimeout(() => setNotice(null), timeoutMs);
    }
  };

  // Keep local commissions aligned with props
  useEffect(() => {
    setLocalCommissions(commissions || []);
  }, [commissions]);

  // Ensure we have one commission entry per artist/service shown on screen
  // Auto-calculate 20% commission on eligible services (excluding travel fees)
  useEffect(() => {
    if (!localCalculations || localCalculations.length === 0) return;
    
    const exemptSet = new Set(['teresa', 'lola', 'miguel']);
    const fromCalcs: CommissionEntry[] = localCalculations.map(c => {
      const isExempt = exemptSet.has((c.artistName || '').toLowerCase());
      const existing = (localCommissions || []).find(e => e.artistName === c.artistName && e.serviceType === c.serviceType);
      
      // Calculate 20% commission on eligible services (exclude travel fees)
      let eligibleTotal = 0;
      (c.dayBreakdowns || []).forEach(day => {
        day.lines.forEach(line => {
          const label = (line.label || '').toLowerCase();
          // Exclude travel fees and assistant travel fees
          if (!label.includes('travel') && !label.includes('assistant')) {
            eligibleTotal += line.total;
          }
        });
      });
      // Add global lines (trials, etc.) but exclude travel fees
      (c.lines || []).forEach(line => {
        const label = (line.label || '').toLowerCase();
        if (!label.includes('travel') && !label.includes('assistant')) {
          // Only count if it's not already in dayBreakdowns (avoid double-counting)
          const isInDayBreakdowns = (c.dayBreakdowns || []).some(d => 
            d.lines.some(dl => dl.label === line.label && dl.total === line.total)
          );
          if (!isInDayBreakdowns) {
            eligibleTotal += line.total;
          }
        }
      });
      
      const calculatedCommission = eligibleTotal * 0.2; // 20% commission
      
      return {
        artistName: c.artistName,
        serviceType: c.serviceType,
        amount: isExempt ? 0 : (existing?.amount !== undefined ? existing.amount : calculatedCommission),
        notes: existing?.notes || ''
      };
    });
    // Only update if different length or different keys
    const changed = fromCalcs.length !== localCommissions.length || fromCalcs.some((e, i) => {
      const m = localCommissions[i];
      if (!m) return true;
      return e.artistName !== m.artistName || e.serviceType !== m.serviceType;
    });
    if (changed) {
      setLocalCommissions(fromCalcs);
      onCommissionsChange && onCommissionsChange(fromCalcs);
    }
  }, [localCalculations.length]);

  const updateCommission = (index: number, field: keyof CommissionEntry, value: string | number) => {
    setLocalCommissions(prev => {
      const next = [...prev];
      const exemptSet = new Set(['teresa', 'lola', 'miguel']);
      const isExempt = exemptSet.has((next[index]?.artistName || '').toLowerCase());
      if (field === 'amount') {
        const num = Math.max(0, typeof value === 'number' ? value : parseFloat(String(value)) || 0);
        next[index] = { ...next[index], amount: isExempt ? 0 : num };
      } else if (field === 'notes') {
        next[index] = { ...next[index], notes: String(value) };
      }
      onCommissionsChange && onCommissionsChange(next);
      return next;
    });
  };

  const generatePaymentId = () => {
    return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const generatePriorityWarningId = () => {
    return `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSaveClick = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const defaultTitle = (brideName && brideName.trim()) ? `${brideName} — ${dateStr}` : `Quote — ${dateStr}`;
    setCustomTitle(defaultTitle);
    setShowSaveModal(true);
  };

  const handleConfirmSave = async () => {
    if (!getAppState) {
      showNotice({ type: 'error', text: 'Saving is unavailable in this context.' });
      return;
    }
    const title = customTitle.trim() || 'Untitled Quote';
    const payload = { title, appState: getAppState(), version: appVersion };
    setShowSaveModal(false);
    setSaving(true);
    try {
      await QuotesAPI.create(payload);
      showNotice({ type: 'success', text: 'Quote saved successfully.' });
    } catch (e: any) {
      // If duplicate, auto-overwrite existing
      if (e?.status === 409) {
        try {
          const existingId = e?.body?.id;
          if (existingId) {
            // Use the ID from the error response
            setPendingOverwrite({ title, payload, existingId });
            setShowOverwriteModal(true);
          } else {
            // Fallback: search for the quote by title
            try {
              const list = await QuotesAPI.list();
              const match = list.find(q => q.title === title);
              if (match?._id) {
                setPendingOverwrite({ title, payload, existingId: match._id });
                setShowOverwriteModal(true);
              } else {
                showNotice({ type: 'error', text: 'A quote with this title already exists, but it could not be found for overwrite. Please try a different title.' });
              }
            } catch (listErr) {
              console.error('Failed to list quotes for overwrite fallback', listErr);
              showNotice({ type: 'error', text: 'Failed to overwrite existing quote. Please try a different title.' });
            }
          }
        } catch (updateErr) {
          console.error('Failed to update existing quote:', updateErr);
          showNotice({ type: 'error', text: 'Failed to overwrite existing quote. Please try a different title.' });
        }
      } else {
        console.error('Save error:', e);
        showNotice({ type: 'error', text: 'Failed to save quote. Ensure the backend is running and your IP is allowed in MongoDB Atlas.' });
      }
    } finally {
      setSaving(false);
    }
  };

  const addPayment = (calculationIndex: number) => {
    const updatedCalculations = localCalculations.map((calc, index) => {
      if (index === calculationIndex) {
        const newPayment: Payment = {
          id: generatePaymentId(),
          date: new Date().toISOString().split('T')[0],
          occasion: '',
          amount: 0
        };
        const updatedPayments = [...calc.payments, newPayment];
        const totalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const updatedCalc = {
          ...calc,
          payments: updatedPayments,
          totalPaid,
          due: Math.max(0, calc.subtotal - totalPaid)
        };
        return {
          ...updatedCalc,
          priorityWarnings: updatePriorityWarningsForCalculation(updatedCalc)
        };
      }
      return calc;
    });
    setLocalCalculations(updatedCalculations);
    onPaymentUpdate(updatedCalculations);
  };

  const updatePayment = (calculationIndex: number, paymentId: string, field: keyof Payment, value: string | number) => {
    const updatedCalculations = localCalculations.map((calc, index) => {
      if (index === calculationIndex) {
        const updatedPayments = calc.payments.map(payment => {
          if (payment.id === paymentId) {
            return { ...payment, [field]: value };
          }
          return payment;
        });
        const totalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const updatedCalc = {
          ...calc,
          payments: updatedPayments,
          totalPaid,
          due: Math.max(0, calc.subtotal - totalPaid)
        };
        return {
          ...updatedCalc,
          priorityWarnings: updatePriorityWarningsForCalculation(updatedCalc)
        };
      }
      return calc;
    });
    setLocalCalculations(updatedCalculations);
    onPaymentUpdate(updatedCalculations);
  };

  const removePayment = (calculationIndex: number, paymentId: string) => {
    const updatedCalculations = localCalculations.map((calc, index) => {
      if (index === calculationIndex) {
        const updatedPayments = calc.payments.filter(payment => payment.id !== paymentId);
        const totalPaid = updatedPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const updatedCalc = {
          ...calc,
          payments: updatedPayments,
          totalPaid,
          due: Math.max(0, calc.subtotal - totalPaid)
        };
        return {
          ...updatedCalc,
          priorityWarnings: updatePriorityWarningsForCalculation(updatedCalc)
        };
      }
      return calc;
    });
    setLocalCalculations(updatedCalculations);
    onPaymentUpdate(updatedCalculations);
  };

  const addPriorityWarning = (calculationIndex: number) => {
    const updatedCalculations = localCalculations.map((calc, index) => {
      if (index === calculationIndex) {
        const newWarning: PriorityWarning = {
          id: generatePriorityWarningId(),
          text: '',
          autoGenerated: false
        };
        return {
          ...calc,
          priorityWarnings: [...calc.priorityWarnings, newWarning]
        };
      }
      return calc;
    });
    setLocalCalculations(updatedCalculations);
    onPaymentUpdate(updatedCalculations);
  };

  const updatePriorityWarning = (calculationIndex: number, warningId: string, text: string) => {
    const updatedCalculations = localCalculations.map((calc, index) => {
      if (index === calculationIndex) {
        return {
          ...calc,
          priorityWarnings: calc.priorityWarnings.map(warning => 
            warning.id === warningId ? { ...warning, text } : warning
          )
        };
      }
      return calc;
    });
    setLocalCalculations(updatedCalculations);
    onPaymentUpdate(updatedCalculations);
  };

  const removePriorityWarning = (calculationIndex: number, warningId: string) => {
    const updatedCalculations = localCalculations.map((calc, index) => {
      if (index === calculationIndex) {
        return {
          ...calc,
          priorityWarnings: calc.priorityWarnings.filter(warning => warning.id !== warningId)
        };
      }
      return calc;
    });
    setLocalCalculations(updatedCalculations);
    onPaymentUpdate(updatedCalculations);
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  const formatWeddingDates = (dates: string[]) => {
    if (dates.length === 0) return '';
    return dates.join(', ');
  };

  const formatDateForDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Build a quick lookup of venues per date across services
  const computeVenueByDate = (calcs: CalculationResult[]) => {
    const map: Record<string, Set<string>> = {};
    calcs.forEach(c => (c.dayBreakdowns || []).forEach(d => {
      if (!map[d.date]) map[d.date] = new Set();
      if (d.venue && d.venue.trim()) map[d.date].add(d.venue.trim());
    }));
    // Convert to single string if unique, else empty for ambiguity
    const out: Record<string, string> = {};
    Object.entries(map).forEach(([date, venues]) => {
      out[date] = venues.size === 1 ? Array.from(venues)[0] : '';
    });
    return out;
  };

  const venueByDate = computeVenueByDate(localCalculations);
  const formatDateWithVenue = (dateStr: string, venue?: string) => {
    const d = formatDateForDisplay(dateStr);
    const v = venue && venue.trim() ? venue.trim() : (venueByDate[dateStr] || '').trim();
    return v ? `${d} — ${v}` : d;
  };

  const extractGlobalLines = (calc: CalculationResult): CalculationLine[] => {
    return (calc.lines || []).filter(l => !l.meta || /^\d{2}\/\d{2}\/\d{4}\s•/.test(l.meta) === false)
      .filter(l => l.label.toLowerCase().includes('trial'));
  };

  const copyTableAsHTML = () => {
    const htmlContent = localCalculations.map(calc => {
      const globalLines = extractGlobalLines(calc);

      const globalHTML = globalLines.length > 0 ? `
        <div style="padding: 12px 24px;">
          <h4 style="margin: 0 0 8px 0; font-weight: 600; color: #374151;">Pre-wedding</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
            <thead>
              <tr style="background: #f3f4f6;">
                <th style="padding: 8px; text-align: left;">Service</th>
                <th style="padding: 8px; text-align: center;">Calculation</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${globalLines.map(line => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 12px; text-align: left;">${line.meta ? `${line.label} (${line.meta})` : line.label}</td>
                  <td style="padding: 8px 12px; text-align: center; font-family: monospace;">${line.qty && line.unit ? `${line.qty} × €${line.unit.toFixed(2)}` : ''}</td>
                  <td style="padding: 8px 12px; text-align: right; font-weight: 600; font-family: monospace;">€${line.total.toFixed(2)}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : '';

      const perDayHTML = (calc.dayBreakdowns || []).map(day => {
        const linesHTML = day.lines.map(line => `
          <tr style=\"border-bottom: 1px solid #e5e7eb;\">
            <td style=\"padding: 8px 12px; text-align: left;\">${line.meta ? `${line.label} (${line.meta})` : line.label}</td>
            <td style=\"padding: 8px 12px; text-align: center; font-family: monospace;\">${line.qty && line.unit ? `${line.qty} × €${line.unit.toFixed(2)}` : ''}</td>
            <td style=\"padding: 8px 12px; text-align: right; font-weight: 600; font-family: monospace;\">€${line.total.toFixed(2)}</td>
          </tr>`).join('');
        return `
          <div style=\"padding: 12px 24px;\">
            <h4 style=\"margin: 0 0 8px 0; font-weight: 600; color: #374151;\">${formatDateWithVenue(day.date, day.venue)}</h4>
            <table style=\"width: 100%; border-collapse: collapse;\">
              <thead>
                <tr style=\"background: #f3f4f6;\">
                  <th style=\"padding: 12px; text-align: left;\">Service</th>
                  <th style=\"padding: 12px; text-align: center;\">Calculation</th>
                  <th style=\"padding: 12px; text-align: right;\">Total</th>
                </tr>
              </thead>
              <tbody>
                ${linesHTML}
                <tr style=\"background: #fffbeb; border-top: 2px solid #f59e0b;\">
                  <td style=\"padding: 12px; font-weight: 700; color: #92400e;\">Subtotal</td>
                  <td style=\"padding: 12px;\"></td>
                  <td style=\"padding: 12px; text-align: right; font-weight: 700; font-family: monospace; color: #92400e; font-size: 16px;\">€${day.subtotal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>`;
      }).join('');

      const paymentsHTML = calc.payments.length > 0 ? calc.payments.map(payment => 
        `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 500; color: #374151;">${formatDateForDisplay(payment.date)}: ${payment.occasion || 'Payment'}</span>
          <span style="font-family: monospace; font-weight: 600; color: #059669;">€${payment.amount.toFixed(2)}</span>
        </div>`
      ).join('') : `<div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; color: #374151;">No payments recorded</span>
          <span style="font-family: monospace; font-weight: 600; color: #6b7280;">€0.00</span>
        </div>`;

      const priorityWarningsHTML = calc.priorityWarnings.length > 0 ? calc.priorityWarnings.map(warning => 
        `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-weight: 500; color: #374151;">DUE: Priority</span>
          <span style="font-family: monospace; font-weight: 600; color: #059669;">${warning.text}</span>
        </div>`
      ).join('') : '';

      return `
        <div style="margin-bottom: 32px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; overflow: hidden;">
          <div style="padding: 16px 24px; background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
            <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: #1f2937;">${calc.artistName}</h3>
            <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">Wedding Date(s): ${formatWeddingDates(calc.weddingDates)}</p>
          </div>
          ${globalHTML}
          ${perDayHTML}
          <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e5e7eb;">
            <h4 style="margin: 0 0 12px 0; font-weight: 600; color: #374151;">${calc.serviceType === 'makeup' ? 'PAYMENTS- Make-up' : 'PAYMENTS- Hairstyling'}</h4>
            ${paymentsHTML}
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb;">
              <span style="font-weight: 700; color: #111827;">TOTAL OF ${calc.artistName}'s ${calc.serviceType === 'makeup' ? 'MAKE-UP SERVICES' : 'HAIR SERVICES'}:</span>
              <span style="font-family: monospace; font-weight: 700; color: #111827; font-size: 16px;">€${calc.subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 2px solid #e5e7eb;">
              <span style="font-weight: 700; color: #059669;">${calc.serviceType === 'makeup' ? 'DUE (Make-up)' : 'DUE (Hairstylist)'}:</span>
              <span style="font-family: monospace; font-weight: 700; color: #059669; font-size: 16px;">€${calc.due.toFixed(2)}</span>
            </div>
          </div>
          <div style="padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e5e7eb;">
            <h4 style="margin: 0 0 12px 0; font-weight: 600; color: #374151;">DUE: Priority</h4>
            ${priorityWarningsHTML}
          </div>
        </div>`;
    }).join('');

    const perDayTotals = computePerDayTotals(localCalculations);
    const perDayTotalsHTML = perDayTotals.length > 0 ? `
      <div style="margin-top: 16px; background: #fff; border-radius: 12px; box-shadow: 0 6px 16px rgba(0,0,0,0.08); border: 1px solid #e5e7eb; overflow: hidden;">
        <div style="background: #111827; color: white; padding: 12px 20px; text-align: center;">
          <h3 style="margin: 0; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Final Financial Summary per Day</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            ${perDayTotals.map(d => {
              const displayLabel = d.date === 'Pre-wedding' ? 'Pre-wedding' : formatDateWithVenue(d.date);
              return `
              <tr>
                <td style="padding: 12px 20px; font-weight: 600; color: #1f2937;">${displayLabel}</td>
                <td style="padding: 12px 20px; text-align: right; font-family: monospace; font-weight: 700; color: #1f2937;">€${d.total.toFixed(2)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>` : '';

    const grandSummaryHTML = localCalculations.length > 1 ? `
      <div style="margin-top: 16px; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-radius: 12px; box-shadow: 0 6px 16px rgba(0,0,0,0.1); border: 2px solid #3b82f6; overflow: hidden;">
        <div style="background: #3b82f6; color: white; padding: 16px 24px; text-align: center;">
          <h3 style="margin: 0; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Grand Summary</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
          <tbody>
            <tr>
              <td style="padding: 16px 24px; font-weight: 700; color: #1f2937; font-size: 16px;">GRAND TOTAL</td>
              <td style="padding: 16px 24px; text-align: right; font-family: monospace; font-weight: 700; color: #1f2937; font-size: 18px;">€${grandSummary.grandTotal.toFixed(2)}</td>
            </tr>
            <tr style="border-top: 1px solid #d1d5db;">
              <td style="padding: 12px 24px; font-weight: 600; color: #059669;">TOTAL PAID</td>
              <td style="padding: 12px 24px; text-align: right; font-family: monospace; font-weight: 600; color: #059669;">€${grandSummary.totalPaid.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 12px 24px; font-weight: 700; color: #059669;">TOTAL DUE</td>
              <td style="padding: 12px 24px; text-align: right; font-family: monospace; font-weight: 700; color: #059669; font-size: 16px;">€${grandSummary.totalDue.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>` : '';

    return `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 1200px; margin: 0 auto; padding: 16px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1f2937;">${brideName ? `${brideName}'s Wedding` : 'FRESH FACED'}</h1>
          <p style="margin: 4px 0 0 0; color: #6b7280;">${brideName ? 'Financial Summary' : 'Professional Makeup & Hair Services Quote'}</p>
        </div>
        ${htmlContent}
        ${perDayTotalsHTML}
        ${grandSummaryHTML}
      </div>`;
  };

  const computePerDayTotals = (calcs: CalculationResult[]) => {
    const totals: Record<string, number> = {};
    
    // Add pre-wedding totals from global lines
    let preWeddingTotal = 0;
    calcs.forEach(c => {
      const globalLines = extractGlobalLines(c);
      const globalTotal = globalLines.reduce((sum, line) => sum + line.total, 0);
      preWeddingTotal += globalTotal;
    });
    
    // Add day breakdowns
    calcs.forEach(c => {
      (c.dayBreakdowns || []).forEach(d => {
        totals[d.date] = (totals[d.date] || 0) + d.subtotal;
      });
    });
    
    // Build result array with Pre-wedding first, then days
    const result = [];
    if (preWeddingTotal > 0) {
      result.push({ date: 'Pre-wedding', total: preWeddingTotal });
    }
    result.push(...Object.entries(totals).map(([date, total]) => ({ date, total })));
    return result;
  };

  const generatePlainTextTable = () => {
    const formatLine = (label: string, calculation: string, total: string) => {
      const labelPadded = label.padEnd(35);
      const calcPadded = calculation.padEnd(20);
      return `${labelPadded} ${calcPadded} ${total.padStart(12)}`;
    };

    const separator = '='.repeat(70);
    const lineSeparator = '-'.repeat(70);

    let content = `${brideName ? `${brideName.toUpperCase()}'S WEDDING - FINANCIAL SUMMARY` : 'FRESH FACED - Professional Makeup & Hair Services'}\n`;
    content += `Quote Generated: ${new Date().toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })} at ${new Date().toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit'
    })}\n\n`;
    content += separator + '\n\n';

    localCalculations.forEach((calc, index) => {
      content += `${calc.artistName.toUpperCase()}\n`;
      content += `Wedding Date(s): ${formatWeddingDates(calc.weddingDates)}\n`;
      content += lineSeparator + '\n';

      // Global lines
      const globalLines = extractGlobalLines(calc);
      if (globalLines.length > 0) {
        content += 'PRE-WEDDING\n';
        content += formatLine('SERVICE', 'CALCULATION', 'TOTAL') + '\n';
        content += lineSeparator + '\n';
        globalLines.forEach(line => {
          // If trial sync is enabled, force Trial venue meta into the Trial travel fee label for both services
          let effectiveMeta = line.meta || '';
          if (trialSyncEnabled && line.label.toLowerCase().startsWith('trial travel fee')) {
            const thisVenue = (calc.serviceType === 'makeup') ? (makeupForm?.trialVenue || '') : (hairForm?.trialVenue || '');
            const otherVenue = (calc.serviceType === 'makeup') ? (hairForm?.trialVenue || '') : (makeupForm?.trialVenue || '');
            const venue = (thisVenue || otherVenue || '').trim();
            if (venue) effectiveMeta = venue;
          }
          const label = effectiveMeta ? `${line.label} (${effectiveMeta})` : line.label;
          const calculation = line.qty && line.unit ? `${line.qty} x €${line.unit.toFixed(2)}` : '';
          content += formatLine(label, calculation, `€${line.total.toFixed(2)}`) + '\n';
        });
        content += lineSeparator + '\n\n';
      }

      // Per-day breakdowns
      (calc.dayBreakdowns || []).forEach(day => {
        content += `${formatDateWithVenue(day.date)}\n`;
        content += formatLine('SERVICE', 'CALCULATION', 'TOTAL') + '\n';
        content += lineSeparator + '\n';
        day.lines.forEach(line => {
          const label = line.meta ? `${line.label} (${line.meta})` : line.label;
          const calculation = line.qty && line.unit ? `${line.qty} × €${line.unit.toFixed(2)}` : '';
          content += formatLine(label, calculation, `€${line.total.toFixed(2)}`) + '\n';
        });
        content += lineSeparator + '\n';
        content += formatLine('SUBTOTAL', '', `€${day.subtotal.toFixed(2)}`) + '\n\n';
      });

      content += `${calc.serviceType === 'makeup' ? 'PAYMENTS- Make-up' : 'PAYMENTS- Hairstyling'}\n`;
      if (calc.payments.length > 0) {
        calc.payments.forEach(payment => {
          const paymentLabel = `${formatDateForDisplay(payment.date)}: ${payment.occasion || 'Payment'}`;
          content += formatLine(paymentLabel, '', `€${payment.amount.toFixed(2)}`) + '\n';
        });
      } else {
        content += formatLine('No payments recorded', '', '€0.00') + '\n';
      }
      content += lineSeparator + '\n';
      content += formatLine('TOTAL OF ' + calc.artistName + "'s " + (calc.serviceType === 'makeup' ? 'MAKE-UP SERVICES' : 'HAIR SERVICES'), '', `€${calc.subtotal.toFixed(2)}`) + '\n';
      content += formatLine('DUE', '', `€${calc.due.toFixed(2)}`) + '\n\n';

      if (index < localCalculations.length - 1) {
        content += separator + '\n\n';
      }
    });

    // Per-day totals across services
    const perDayTotals = computePerDayTotals(localCalculations);
    if (perDayTotals.length > 0) {
      content += separator + '\n';
      content += 'FINAL FINANCIAL SUMMARY PER DAY\n';
      content += lineSeparator + '\n';
      perDayTotals.forEach(d => {
        const displayLabel = d.date === 'Pre-wedding' ? 'Pre-wedding' : formatDateWithVenue(d.date);
        content += formatLine(displayLabel, '', `€${d.total.toFixed(2)}`) + '\n';
      });
    }

    if (localCalculations.length > 1) {
      content += separator + '\n';
      content += 'GRAND SUMMARY\n';
      content += lineSeparator + '\n';
      content += formatLine('GRAND TOTAL', '', `€${grandSummary.grandTotal.toFixed(2)}`) + '\n';
      content += formatLine('TOTAL PAID', '', `€${grandSummary.totalPaid.toFixed(2)}`) + '\n';
      content += formatLine('TOTAL DUE', '', `€${grandSummary.totalDue.toFixed(2)}`) + '\n';
    }

    return content;
  };

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let currentY = margin;
      const lineHeight = 6;
      const sectionSpacing = 10;

      // Column layout (mm)
      const colLabelX = margin;         // label column start
      const colCalcX = margin + 80;     // calculation column start
      const colTotalX = margin + 140;   // total column start
      const colLabelWidth = colCalcX - colLabelX - 2; // small padding
      const colCalcWidth = colTotalX - colCalcX - 2;

      // Sanitize any Unicode characters that jsPDF core fonts don't fully support
      const sanitizeText = (s: string) => (s || '')
        .replace(/[×✕✖]/g, 'x')
        .replace(/[−–—]/g, '-')
        .replace(/[’‘]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/•/g, '-')
        .replace(/\s+/g, ' ')
        .trim();

      // Helper to draw a single row with wrapped label and optional wrapped calc
      const drawRow = (label: string, calc: string, total: string) => {
        const safeLabel = sanitizeText(label);
        const safeCalc = sanitizeText(calc);
        const safeTotal = sanitizeText(total);
        // Split long texts to fit their columns
        const labelLines = pdf.splitTextToSize(safeLabel, colLabelWidth);
        const calcLines = safeCalc ? pdf.splitTextToSize(safeCalc, colCalcWidth) : [''];
        const rowLines = Math.max(labelLines.length, calcLines.length);
        const rowHeight = rowLines * lineHeight;

        // Page break guard
        if (currentY + rowHeight > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }

        // Draw label and calculation as multi-line blocks
        pdf.text(labelLines, colLabelX, currentY);
        if (safeCalc) pdf.text(calcLines, colCalcX, currentY);
        // Total is right-aligned on a single line aligned to the first line of the row
        if (safeTotal) pdf.text(safeTotal, colTotalX, currentY);
        currentY += rowHeight;
      };

      // Header
      try {
        // Load and embed the actual logo
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          logoImg.onload = resolve;
          logoImg.onerror = reject;
          logoImg.src = '/logo.jpg';
        });
        
        // Calculate logo dimensions (maintain aspect ratio, max width 60mm)
        const maxLogoWidth = 60;
        const aspectRatio = logoImg.height / logoImg.width;
        const logoWidth = Math.min(maxLogoWidth, logoImg.width * 0.264583); // px to mm
        const logoHeight = logoWidth * aspectRatio;
        
        // Center the logo
        const logoX = (pageWidth - logoWidth) / 2;
        pdf.addImage(logoImg, 'JPEG', logoX, currentY, logoWidth, logoHeight);
        currentY += logoHeight + 5;
      } catch (error) {
        console.warn('Failed to load logo, using text fallback:', error);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('FRESH FACED', pageWidth / 2, currentY, { align: 'center' });
        currentY += 10;
      }

       pdf.setFontSize(24);
       pdf.setFont('helvetica', 'bold');
       pdf.text(brideName ? `${brideName}'s Wedding` : 'FRESH FACED', pageWidth / 2, currentY, { align: 'center' });
       currentY += 8;
       pdf.setFontSize(12);
       pdf.setFont('helvetica', 'normal');
       pdf.text(brideName ? 'Financial Summary' : 'Professional Makeup & Hair Services', pageWidth / 2, currentY, { align: 'center' });
       currentY += 15;

      localCalculations.forEach((calc, calcIndex) => {
        if (currentY > pageHeight - 60) {
          pdf.addPage();
          currentY = margin;
        }

        // Artist header
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        const serviceHeader = `${calc.artistName}'s ${calc.serviceType === 'makeup' ? 'Make-up Services' : 'Hairstyling Services'}`;
        pdf.text(serviceHeader, margin, currentY);
        currentY += 6;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Wedding Date(s): ${formatWeddingDates(calc.weddingDates)}`, margin, currentY);
        currentY += sectionSpacing;

        // Global lines section
        const globalLines = extractGlobalLines(calc);
        if (globalLines.length > 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.text('PRE-WEDDING', margin, currentY);
          currentY += 6;
          pdf.setFontSize(9);
          pdf.text('SERVICE', colLabelX, currentY);
          pdf.text('CALCULATION', colCalcX, currentY);
          pdf.text('TOTAL', colTotalX, currentY);
          currentY += 2; pdf.line(margin, currentY, pageWidth - margin, currentY); currentY += 4;
          pdf.setFont('helvetica', 'normal');
          globalLines.forEach(line => {
            // If trial sync is enabled, force Trial venue meta into the Trial travel fee label for both services
            let effectiveMeta = line.meta || '';
            if (trialSyncEnabled && line.label.toLowerCase().startsWith('trial travel fee')) {
              const thisVenue = (calc.serviceType === 'makeup') ? (makeupForm?.trialVenue || '') : (hairForm?.trialVenue || '');
              const otherVenue = (calc.serviceType === 'makeup') ? (hairForm?.trialVenue || '') : (makeupForm?.trialVenue || '');
              const venue = (thisVenue || otherVenue || '').trim();
              if (venue) effectiveMeta = venue;
            }
            const label = effectiveMeta ? `${line.label} (${effectiveMeta})` : line.label;
            const calculation = line.qty && line.unit ? `${line.qty} x €${line.unit.toFixed(2)}` : '';
            drawRow(label, calculation, `€${line.total.toFixed(2)}`);
          });
          currentY += 2; pdf.line(margin, currentY, pageWidth - margin, currentY); currentY += 4;
          pdf.setFont('helvetica', 'bold');
          const preWeddingSubtotal = globalLines.reduce((sum, line) => sum + line.total, 0);
          pdf.text('SUBTOTAL PRE-WEDDING', margin, currentY);
          pdf.text(`€${preWeddingSubtotal.toFixed(2)}`, margin + 140, currentY);
          currentY += sectionSpacing;
        }

        // Per-day sections
        (calc.dayBreakdowns || []).forEach((day, dayIndex) => {
          if (currentY > pageHeight - 60) { pdf.addPage(); currentY = margin; }
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.text(formatDateWithVenue(day.date), margin, currentY);
          currentY += 6;
          pdf.setFontSize(9);
          pdf.text('SERVICE', colLabelX, currentY);
          pdf.text('CALCULATION', colCalcX, currentY);
          pdf.text('TOTAL', colTotalX, currentY);
          currentY += 2; pdf.line(margin, currentY, pageWidth - margin, currentY); currentY += 4;
          pdf.setFont('helvetica', 'normal');
          day.lines.forEach(line => {
            const label = line.meta ? `${line.label} (${line.meta})` : line.label;
            const calculation = line.qty && line.unit ? `${line.qty} × €${line.unit.toFixed(2)}` : '';
            drawRow(label, calculation, `€${line.total.toFixed(2)}`);
          });
          currentY += 2; pdf.line(margin, currentY, pageWidth - margin, currentY); currentY += 4;
          pdf.setFont('helvetica', 'bold');
          pdf.text(`SUBTOTAL DAY ${dayIndex + 1}`, margin, currentY);
          pdf.text(`€${day.subtotal.toFixed(2)}`, margin + 140, currentY);
          currentY += sectionSpacing;
        });

        // Payments section
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text(calc.serviceType === 'makeup' ? 'PAYMENTS- Make-up' : 'PAYMENTS- Hairstyling', margin, currentY);
        currentY += 6;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        if (calc.payments.length > 0) {
          calc.payments.forEach(payment => {
            const paymentText = `${formatDateForDisplay(payment.date)}: ${payment.occasion || 'Payment'}`;
            pdf.text(paymentText, margin + 10, currentY);
            pdf.text(`€${payment.amount.toFixed(2)}`, margin + 140, currentY);
            currentY += lineHeight;
          });
        } else {
          pdf.text('No payments recorded', margin + 10, currentY);
          pdf.text('€0.00', margin + 140, currentY);
          currentY += lineHeight;
        }
        currentY += 2; pdf.line(margin, currentY, pageWidth - margin, currentY); currentY += 4;
        pdf.setFont('helvetica', 'bold');
        const serviceTypeLabel = calc.serviceType === 'makeup' ? 'MAKE-UP SERVICES' : 'HAIR SERVICES';
        pdf.text(`TOTAL OF ${calc.artistName}'s ${serviceTypeLabel}`, margin + 10, currentY);
        pdf.text(`€${calc.subtotal.toFixed(2)}`, margin + 140, currentY);
        currentY += 4; pdf.line(margin, currentY, pageWidth - margin, currentY); currentY += 4;
        pdf.setTextColor(5, 150, 105); // Dark green color
        const dueLabel = calc.serviceType === 'makeup' ? 'DUE (Make-up)' : 'DUE (Hairstylist)';
        pdf.text(dueLabel, margin + 10, currentY);
        pdf.text(`€${calc.due.toFixed(2)}`, margin + 140, currentY);
        pdf.setTextColor(0, 0, 0); // Reset to black
        currentY += sectionSpacing;

        // Priority Warnings section
        if (calc.priorityWarnings.length > 0) {
          if (currentY > pageHeight - 60) { pdf.addPage(); currentY = margin; }
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(185, 28, 28); // Dark red color
          pdf.text('DUE: Priority', margin, currentY);
          currentY += 6;
          pdf.setFontSize(9);
          calc.priorityWarnings.forEach(warning => {
            if (warning.text && warning.text.trim()) {
              // Split text by euro amounts to render them in bold
              const euroRegex = /(€\d+\.?\d*)/g;
              const parts = warning.text.split(euroRegex);
              
              // Check if we need a new page
              if (currentY > pageHeight - margin) {
                pdf.addPage();
                currentY = margin;
                pdf.setTextColor(185, 28, 28);
                pdf.setFontSize(9);
              }
              
              // Render bullet point
              pdf.setFont('helvetica', 'normal');
              let xOffset = margin + 10;
              pdf.text('•', xOffset, currentY);
              xOffset += 5;
              
              // Render each part, with euro amounts in bold
              parts.forEach((part: string) => {
                if (part.match(euroRegex)) {
                  // This is a euro amount - render in bold
                  pdf.setFont('helvetica', 'bold');
                  pdf.text(part, xOffset, currentY);
                  xOffset += pdf.getTextWidth(part);
                } else if (part) {
                  // Regular text
                  pdf.setFont('helvetica', 'normal');
                  // Handle line wrapping for long text
                  const maxWidth = pageWidth - xOffset - margin;
                  const wrappedLines = pdf.splitTextToSize(part, maxWidth);
                  wrappedLines.forEach((line: string) => {
                    if (wrappedLines.indexOf(line) > 0) {
                      currentY += lineHeight;
                      xOffset = margin + 15; // Indent continuation lines
                      if (currentY > pageHeight - margin) {
                        pdf.addPage();
                        currentY = margin;
                        pdf.setTextColor(185, 28, 28);
                        pdf.setFontSize(9);
                      }
                    }
                    pdf.text(line, xOffset, currentY);
                    xOffset += pdf.getTextWidth(line);
                  });
                }
              });
              currentY += lineHeight;
            }
          });
          pdf.setTextColor(0, 0, 0); // Reset to black
          currentY += sectionSpacing;
        }

        if (calcIndex < localCalculations.length - 1) {
          currentY += sectionSpacing;
        }
      });

      // Per-day totals across services
      const perDayTotals = computePerDayTotals(localCalculations);
      if (perDayTotals.length > 0) {
        if (currentY > pageHeight - 60) { pdf.addPage(); currentY = margin; }
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('FINAL FINANCIAL SUMMARY PER DAY', margin, currentY);
        currentY += sectionSpacing;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        perDayTotals.forEach(d => {
          const displayLabel = d.date === 'Pre-wedding' ? 'Pre-wedding' : formatDateWithVenue(d.date);
          pdf.text(displayLabel, margin, currentY);
          pdf.text(`€${d.total.toFixed(2)}`, margin + 140, currentY);
          currentY += lineHeight;
        });
        currentY += sectionSpacing;
      }

      // Grand Summary for multiple services
      if (localCalculations.length > 1) {
        if (currentY > pageHeight - 40) {
          pdf.addPage();
          currentY = margin;
        }
        currentY += sectionSpacing;
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('GRAND SUMMARY', margin, currentY);
        currentY += sectionSpacing;
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text('GRAND TOTAL', margin, currentY);
        pdf.text(`€${grandSummary.grandTotal.toFixed(2)}`, margin + 140, currentY);
        currentY += lineHeight;
        pdf.text('TOTAL PAID', margin, currentY);
        pdf.text(`€${grandSummary.totalPaid.toFixed(2)}`, margin + 140, currentY);
        currentY += lineHeight;
        pdf.text('TOTAL DUE', margin, currentY);
        pdf.text(`€${grandSummary.totalDue.toFixed(2)}`, margin + 140, currentY);
      }

      // Footer with timestamp
      const footerY = pageHeight - 10;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      const timestamp = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB');
      pdf.text(`Generated: ${timestamp}`, pageWidth / 2, footerY, { align: 'center' });

      // Filename: <Bride>_financial_summary_<YYYY-MM-DD>.pdf
      const dateStr = new Date().toISOString().split('T')[0];
      const safeBride = (brideName || 'Bride')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^A-Za-z0-9_\-]/g, '');
      const filename = `${safeBride}_financial_summary_${dateStr}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      showNotice({ type: 'error', text: 'Error generating PDF. Please try again.' });
    }
  };

  const copyRichText = async () => {
    try {
      const htmlContent = copyTableAsHTML();
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
        'text/plain': new Blob([generatePlainTextTable()], { type: 'text/plain' })
      });
      await navigator.clipboard.write([clipboardItem]);
      showNotice({ type: 'success', text: 'Quote copied to clipboard with rich formatting!' });
    } catch (error) {
      console.error('Error copying rich text:', error);
      showNotice({ type: 'error', text: 'Error copying to clipboard. Please try again.' });
    }
  };

  const copyPlainText = async () => {
    try {
      const plainText = generatePlainTextTable();
      await navigator.clipboard.writeText(plainText);
      showNotice({ type: 'success', text: 'Quote copied to clipboard as plain text!' });
    } catch (error) {
      console.error('Error copying plain text:', error);
      showNotice({ type: 'error', text: 'Error copying to clipboard. Please try again.' });
    }
  };

  useEffect(() => {
    // Preserve existing payments when calculations are updated from navigation
    const updatedCalculations = calculations.map((newCalc, index) => {
      const existingCalc = localCalculations[index];
      if (existingCalc && existingCalc.artistName === newCalc.artistName && existingCalc.serviceType === newCalc.serviceType) {
        // Preserve payments and recalculate totals
        const totalPaid = existingCalc.payments.reduce((sum, payment) => sum + payment.amount, 0);
        return {
          ...newCalc,
          payments: existingCalc.payments,
          totalPaid,
          due: Math.max(0, newCalc.subtotal - totalPaid)
        };
      }
      return newCalc;
    });
    setLocalCalculations(updatedCalculations);
  }, [calculations]);

  const renderPerDayTotalsCard = () => {
    const perDayTotals = computePerDayTotals(localCalculations);
    if (perDayTotals.length === 0) return null;
    return (
      <div className="grand-summary-card" style={{ marginTop: '1rem' }}>
        <div className="grand-summary-header">
          <h3>Final Financial Summary per Day</h3>
        </div>
        <div className="grand-summary-content">
          {perDayTotals.map(d => (
            <div key={d.date} className="summary-row">
              <span className="summary-label">{d.date === 'Pre-wedding' ? 'Pre-wedding' : formatDateWithVenue(d.date)}</span>
              <span className="summary-amount grand-total">{formatCurrency(d.total)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Commissions section (excluded from PDF)
  const renderCommissionsSection = () => {
    if (!localCalculations || localCalculations.length === 0) return null;
    const exemptSet = new Set(['teresa', 'lola', 'miguel']);
    const totalCommission = localCommissions.reduce((s, c) => s + (c?.amount || 0), 0);
    return (
      <div className="grand-summary-card" style={{ marginTop: '1rem' }}>
        <div className="grand-summary-header">
          <h3>Commissions (20% of services, not included in PDF)</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>Excludes travel fees. Exempt artists: Teresa, Lola, Miguel</p>
        </div>
        <div className="grand-summary-content">
          {(localCommissions || []).map((entry, idx) => {
            const isExempt = exemptSet.has((entry.artistName || '').toLowerCase());
            return (
              <div key={`${entry.artistName}-${entry.serviceType}`} className="summary-row" style={{ alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span className="summary-label" style={{ minWidth: 180 }}>{entry.artistName} — {entry.serviceType === 'makeup' ? 'Make-up' : 'Hair'}</span>
                {isExempt ? (
                  <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Exempt</span>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="currency" aria-hidden="true">€</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={entry.amount}
                      onChange={(e) => updateCommission(idx, 'amount', e.target.value)}
                      style={{ width: 120 }}
                      aria-label={`Commission amount for ${entry.artistName}`}
                      title="Auto-calculated as 20% of services (excluding travel). Edit to override."
                    />
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={entry.notes || ''}
                  onChange={(e) => updateCommission(idx, 'notes', e.target.value)}
                  style={{ flex: 1, minWidth: 220 }}
                  aria-label={`Commission notes for ${entry.artistName}`}
                />
              </div>
            );
          })}
          <div className="summary-row" style={{ borderTop: '1px solid #e5e7eb', paddingTop: 8, marginTop: 4 }}>
            <span className="summary-label">TOTAL COMMISSIONS</span>
            <span className="summary-amount grand-total">{formatCurrency(totalCommission)}</span>
          </div>
        </div>
      </div>
    );
  };

  const autoGeneratePriorityWarnings = (calc: CalculationResult): PriorityWarning[] => {
    const warnings: PriorityWarning[] = [];
    const serviceLabel = calc.serviceType === 'makeup' ? 'Make-up' : 'Hairstyling';
    
    // Check for main deposit
    const hasMainDeposit = calc.payments.some(p => 
      p.occasion?.toLowerCase().includes('main') && 
      p.occasion?.toLowerCase().includes('deposit') &&
      p.amount > 0
    );
    
    if (!hasMainDeposit) {
      warnings.push({
        id: `auto_main_deposit_${calc.serviceType}`,
        text: `Missing Main ${serviceLabel} Deposit`,
        autoGenerated: true
      });
    }
    
    // Check for assistant deposit if there are multiple people (assistants)
    const hasAssistants = calc.lines.some(line => 
      line.label?.toLowerCase().includes('assistant') ||
      line.label?.toLowerCase().includes('team')
    );
    
    if (hasAssistants) {
      const hasAssistantDeposit = calc.payments.some(p => 
        p.occasion?.toLowerCase().includes('assistant') && 
        p.occasion?.toLowerCase().includes('deposit') &&
        p.amount > 0
      );
      
      if (!hasAssistantDeposit) {
        warnings.push({
          id: `auto_assistant_deposit_${calc.serviceType}`,
          text: `Missing Assistant ${serviceLabel} Deposit`,
          autoGenerated: true
        });
      }
    }
    
    // Check for trial payment if trial exists
    const hasTrial = calc.lines.some(line => 
      line.label?.toLowerCase().includes('trial')
    );
    
    if (hasTrial) {
      const hasTrialPayment = calc.payments.some(p => 
        p.occasion?.toLowerCase().includes('trial') &&
        p.amount > 0
      );
      
      if (!hasTrialPayment) {
        warnings.push({
          id: `auto_trial_payment_${calc.serviceType}`,
          text: `Missing ${serviceLabel} Trial Payment`,
          autoGenerated: true
        });
      }
    }
    
    // Check if balance is due but no deposits recorded
    if (calc.due > 0 && calc.payments.length === 0) {
      warnings.push({
        id: `auto_no_payments_${calc.serviceType}`,
        text: `No payments recorded - Total due: €${calc.due.toFixed(2)}`,
        autoGenerated: true
      });
    }
    
    return warnings;
  };

  const updatePriorityWarningsForCalculation = (calc: CalculationResult): PriorityWarning[] => {
    // Keep manually added warnings
    const manualWarnings = calc.priorityWarnings.filter(w => !w.autoGenerated);
    
    // Generate new auto warnings
    const autoWarnings = autoGeneratePriorityWarnings(calc);
    
    // Combine them
    return [...autoWarnings, ...manualWarnings];
  };

  // Local browser storage helpers (backend-free)
  type SavedItem = { id: string; title: string; updatedAt: string; appState: any };
  const STORAGE_KEY = 'ffq_saved_quotes_v1';
  const readLocalSaves = (): SavedItem[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  };
  const writeLocalSaves = (items: SavedItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  };

  const handleSaveToBrowser = () => {
    if (!getAppState) {
      showNotice({ type: 'error', text: 'Saving is unavailable in this context.' });
      return;
    }
    const dateStr = new Date().toISOString().split('T')[0];
    const title = (brideName && brideName.trim()) ? `${brideName} — ${dateStr}` : `Quote — ${dateStr}`;
    const state = getAppState();
    const items = readLocalSaves();
    const existingIdx = items.findIndex(i => i.title === title);
    const now = new Date().toISOString();
    const payload: SavedItem = {
      id: existingIdx >= 0 ? items[existingIdx].id : `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title,
      updatedAt: now,
      appState: state,
    };
    if (existingIdx >= 0) {
      items[existingIdx] = payload;
      writeLocalSaves(items);
      showNotice({ type: 'success', text: 'Saved to this browser (overwritten existing).' });
    } else {
      writeLocalSaves([payload, ...items]);
      showNotice({ type: 'success', text: 'Saved to this browser.' });
    }
  };

  return (
    <div className="quote-result-form">
      <div className="form-header">
        <h2>{brideName ? `${brideName}'s Wedding` : 'Quote Results'}</h2>
        <p className="subtitle">{brideName ? 'Financial Summary' : 'Review your quote and adjust payments as needed'}</p>
        <div className="actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={handleSaveClick} disabled={saving} aria-label="Save quote">Save</button>
          <button type="button" className="btn btn-secondary" onClick={handleSaveToBrowser} aria-label="Save to this browser">Save to this browser</button>
        </div>
        {showSaveModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={(e) => e.target === e.currentTarget && setShowSaveModal(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                minWidth: '400px',
                maxWidth: '90vw'
              }}
            >
              <h3 style={{ margin: '0 0 16px 0' }}>Save Quote</h3>
              <label htmlFor="quote-title" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                Title:
              </label>
              <input
                id="quote-title"
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  fontSize: '16px',
                  marginBottom: '16px'
                }}
                placeholder="Enter a title for your quote"
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="btn btn-primary"
                  disabled={saving || !customTitle.trim()}
                  style={{ padding: '8px 16px' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
        {showOverwriteModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
            onClick={(e) => e.target === e.currentTarget && setShowOverwriteModal(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                minWidth: '400px',
                maxWidth: '90vw'
              }}
            >
              <h3 style={{ margin: '0 0 16px 0' }}>Overwrite Existing Quote</h3>
              <p style={{ marginBottom: '16px' }}>
                A quote with the title "{pendingOverwrite?.title}" already exists. Are you sure you want to overwrite it?
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowOverwriteModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (pendingOverwrite) {
                      try {
                        console.log('Attempting to overwrite quote with ID:', pendingOverwrite.existingId);
                        console.log('Payload:', pendingOverwrite.payload);
                        
                        await QuotesAPI.update(pendingOverwrite.existingId!, {
                          title: pendingOverwrite.payload.title,
                          appState: pendingOverwrite.payload.appState,
                          version: pendingOverwrite.payload.version
                        });
                        showNotice({ type: 'success', text: 'Quote overwritten successfully.' });
                      } catch (error) {
                        console.error('Error overwriting quote:', error);
                        console.error('Error details:', {
                          status: (error as any)?.status,
                          message: (error as any)?.message,
                          body: (error as any)?.body
                        });
                        showNotice({ type: 'error', text: `Failed to overwrite quote: ${(error as any)?.message || 'Unknown error'}. Please try again.` });
                      }
                    }
                    setShowOverwriteModal(false);
                  }}
                  className="btn btn-primary"
                  style={{ padding: '8px 16px' }}
                >
                  Overwrite
                </button>
              </div>
            </div>
          </div>
        )}
        {notice && (
          <div
            role="status"
            aria-live="polite"
            className="notice-banner"
            style={{
              marginTop: '8px',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: notice.type === 'success' ? '#bbf7d0' : notice.type === 'error' ? '#fecaca' : '#bfdbfe',
              background: notice.type === 'success' ? '#ecfdf5' : notice.type === 'error' ? '#fee2e2' : '#dbeafe',
              color: notice.type === 'success' ? '#065f46' : notice.type === 'error' ? '#7f1d1d' : '#1e3a8a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12
            }}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="btn btn-secondary btn-small"
              aria-label="Dismiss notification"
              style={{ padding: '2px 8px' }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      <div className="quote-results">
        {localCalculations.map((calc, index) => (
          <div key={index} className="artist-quote-card">
            <div className="artist-header">
              <div className="artist-info">
                <h3>{calc.artistName}</h3>
                <p className="wedding-dates">
                  Wedding Date{calc.weddingDates.length > 1 ? 's' : ''}: {formatWeddingDates(calc.weddingDates)}
                </p>
              </div>
              {onEditForm && (
                <button type="button"
                  onClick={() => {
                    // Ensure current payment data is saved to app state before navigating
                    onPaymentUpdate(localCalculations);
                    onEditForm();
                  }}
                  className="btn btn-secondary edit-btn"
                  aria-label="Edit form details"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Global lines (pre-wedding) */}
            {extractGlobalLines(calc).length > 0 && (
              <div className="quote-table-container">
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th>Pre-wedding</th>
                      <th className="calculation-col">Calculation</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extractGlobalLines(calc).map((line, i) => (
                      <tr key={i}>
                        <td className="service-label">
                          {line.meta ? `${line.label} (${line.meta})` : line.label}
                        </td>
                        <td className="calculation-col">
                          {line.qty && line.unit ? `${line.qty} × ${formatCurrency(line.unit)}` : ''}
                        </td>
                        <td className="total-amount">{formatCurrency(line.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Per-day sections */}
            {(calc.dayBreakdowns || []).map((day, dIdx) => (
              <div key={dIdx} className="quote-table-container" style={{ marginTop: '0.5rem' }}>
                <div className="artist-header" style={{ padding: '0.5rem 0' }}>
                  <div className="artist-info">
                    <h4 style={{ margin: 0 }}>{day.date === 'Pre-wedding' ? 'Pre-wedding' : formatDateWithVenue(day.date, day.venue)}</h4>
                  </div>
                </div>
                <table className="quote-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th className="calculation-col">Calculation</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.lines.map((line, lineIndex) => (
                      <tr key={lineIndex}>
                        <td className="service-label">
                          {line.meta ? `${line.label} (${line.meta})` : line.label}
                        </td>
                        <td className="calculation-col">
                          {line.qty && line.unit ? `${line.qty} × ${formatCurrency(line.unit)}` : ''}
                        </td>
                        <td className="total-amount">{formatCurrency(line.total)}</td>
                      </tr>
                    ))}
                    <tr className="subtotal-row">
                      <td className="subtotal-label">Subtotal</td>
                      <td className="calculation-col"></td>
                      <td className="subtotal-amount">{formatCurrency(day.subtotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            <div className="payments-section">
              <div className="payments-header">
                <h4>{calc.serviceType === 'makeup' ? 'PAYMENTS- Make-up' : 'PAYMENTS- Hairstyling'}</h4>
                <button type="button"
                  onClick={() => addPayment(index)}
                  className="btn btn-secondary btn-small"
                  aria-label="Add new payment"
                >
                  + Add Payment
                </button>
              </div>
              {calc.payments.length === 0 ? (
                <div className="no-payments">
                  <p>No payments recorded yet</p>
                </div>
              ) : (
                <div className="payments-list">
                  {calc.payments.map((payment) => (
                    <div key={payment.id} className="payment-item">
                      <div className="payment-fields">
                        <div className="payment-field">
                          <label htmlFor={`date-${payment.id}`} className="payment-field-label">Date</label>
                          <input
                            id={`date-${payment.id}`}
                            type="date"
                            value={payment.date}
                            onChange={(e) => updatePayment(index, payment.id, 'date', e.target.value)}
                            className="payment-date-input"
                          />
                        </div>
                        <div className="payment-field">
                          <label htmlFor={`occasion-${payment.id}`} className="payment-field-label">Occasion</label>
                          {(() => {
                            const predefinedOptions = calc.serviceType === 'makeup'
                              ? ['Main MUA Deposit(s)', 'Assistant MUA Deposit(s)', 'Make-up Trial', 'Other']
                              : ['Main HS Deposit(s)', 'Assistant HS Deposit(s)', 'Hairstyling Trial', 'Other'];
                            const isPredefined = predefinedOptions.includes(payment.occasion);
                            const selectValue = isPredefined ? payment.occasion : 'Other';
                            return (
                              <>
                                <select
                                  id={`occasion-${payment.id}`}
                                  className="input-field select-field"
                                  value={selectValue}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'Other') {
                                      // Keep current custom text in payment.occasion; if empty, set to ''
                                      updatePayment(index, payment.id, 'occasion', isPredefined ? '' : payment.occasion || '');
                                    } else {
                                      updatePayment(index, payment.id, 'occasion', val);
                                    }
                                  }}
                                  aria-describedby={`occasion-help-${payment.id}`}
                                >
                                  {predefinedOptions.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                                <small id={`occasion-help-${payment.id}`} className="form-help">
                                  Choose a standard occasion or select Other to type a custom one.
                                </small>
                                {selectValue === 'Other' && (
                                  <input
                                    type="text"
                                    className="payment-occasion-input"
                                    placeholder={calc.serviceType === 'makeup' ? 'e.g., Make-up trial' : 'e.g., Hairstyling trial'}
                                    value={isPredefined ? '' : (payment.occasion || '')}
                                    onChange={(e) => updatePayment(index, payment.id, 'occasion', e.target.value)}
                                    style={{ marginTop: '0.25rem' }}
                                    aria-label="Custom occasion"
                                  />
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="payment-field">
                          <label htmlFor={`amount-${payment.id}`} className="payment-field-label">Amount</label>
                          <div className="payment-amount-wrapper">
                            <span className="currency" aria-hidden="true">€</span>
                            <input
                              id={`amount-${payment.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={payment.amount}
                              onChange={(e) => updatePayment(index, payment.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="payment-amount-input"
                            />
                          </div>
                        </div>
                        <button type="button"
                          onClick={() => removePayment(index, payment.id)}
                          className="btn btn-danger btn-small payment-remove-btn"
                          aria-label="Remove payment"
                          title="Remove payment"
                        >
                          ×
                        </button>
                      </div>
                      <div className="payment-display">
                        <span className="payment-display-text">
                          {formatDateForDisplay(payment.date)}: {payment.occasion || 'Payment'} 
                          <span className="payment-dots">......</span>
                          <span className="payment-amount-display">{formatCurrency(payment.amount)}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="payment-summary">
                <div className="payment-summary-row">
                  <span className="payment-summary-label">TOTAL PAID:</span>
                  <span className="payment-summary-amount paid-total">{formatCurrency(calc.totalPaid)}</span>
                </div>
                <div className="payment-summary-row">
                  <span className="payment-summary-label" style={{ color: '#059669' }}>DUE:</span>
                  <span className="payment-summary-amount due-total">{formatCurrency(calc.due)}</span>
                </div>
              </div>
            </div>

            <div className="priority-warnings-section">
              <div className="priority-warnings-header">
                <h4>DUE: Priority</h4>
                <button type="button"
                  onClick={() => addPriorityWarning(index)}
                  className="btn btn-secondary btn-small"
                  aria-label="Add new priority warning"
                >
                  + Add Priority Warning
                </button>
              </div>
              {calc.priorityWarnings.length === 0 ? (
                <div className="no-priority-warnings">
                  <p>No priority warnings recorded yet</p>
                </div>
              ) : (
                <div className="priority-warnings-list">
                  {calc.priorityWarnings.map((warning) => (
                    <div key={warning.id} className="priority-warning-item">
                      <div className="priority-warning-fields">
                        <div className="priority-warning-field">
                          <label htmlFor={`text-${warning.id}`} className="priority-warning-field-label">Text</label>
                          <input
                            id={`text-${warning.id}`}
                            type="text"
                            value={warning.text}
                            onChange={(e) => updatePriorityWarning(index, warning.id, e.target.value)}
                            className="priority-warning-text-input"

                          />
                        </div>
                        <button type="button"
                          onClick={() => removePriorityWarning(index, warning.id)}
                          className="btn btn-danger btn-small priority-warning-remove-btn"
                          aria-label="Remove priority warning"
                          title="Remove priority warning"
                        >
                          ×
                        </button>
                      </div>
                      <div className="priority-warning-display">
                        <span className="priority-warning-display-text">{warning.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {renderPerDayTotalsCard()}

        {localCalculations.length > 1 && (
          <div className="grand-summary-card">
            <div className="grand-summary-header">
              <h3>Grand Summary</h3>
            </div>
            <div className="grand-summary-content">
              <div className="summary-row">
                <span className="summary-label">GRAND TOTAL</span>
                <span className="summary-amount grand-total">{formatCurrency(grandSummary.grandTotal)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">TOTAL PAID</span>
                <span className="summary-amount paid-total">{formatCurrency(grandSummary.totalPaid)}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label" style={{ color: '#059669' }}>TOTAL DUE</span>
                <span className="summary-amount due-total">{formatCurrency(grandSummary.totalDue)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {renderCommissionsSection()}

      <div className="export-actions">
        <button type="button" onClick={copyRichText} className="btn btn-secondary">
          Copy Table (Rich Text)
        </button>
        <button type="button" onClick={copyPlainText} className="btn btn-secondary">
          Copy Plain Text
        </button>
        <button type="button" onClick={exportToPDF} className="btn btn-secondary">
          Export PDF
        </button>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onStartOver} className="btn btn-secondary">
          Start Over
        </button>
      </div>
    </div>
  );
};
