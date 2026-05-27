import { Injectable } from '@angular/core';
import { Payment } from './money-manager.service';

export interface ParseResult {
  payments: Array<{ label: string; amount: number; date: number }>;
  errors: string[];
}

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private HEADER_LABEL = 'Libellé';
  private HEADER_AMOUNT = 'Montant';
  private HEADER_DAY = 'Jour';

  constructor() {}
  /**
   * Export payments to an .xlsx file. Returns an object describing the method/result.
   */
  async exportPaymentsAsync(payments: Payment[], fileName = 'prelevements'): Promise<{ saved: boolean; method: string }> {
    const XLSX = await import('xlsx');

    // Build rows: header + payment rows
    const rows: any[][] = [];
    rows.push([this.HEADER_LABEL, this.HEADER_AMOUNT, this.HEADER_DAY]);
    for (const p of payments) {
      rows.push([p.label, p.amount, p.date]);
    }

    const ws = (XLSX as any).utils.aoa_to_sheet(rows);
    const wb = (XLSX as any).utils.book_new();
    (XLSX as any).utils.book_append_sheet(wb, ws, 'Prelevements');

    const wbout = (XLSX as any).write(wb, { bookType: 'xlsx', type: 'array' });
    const mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const blob = new Blob([wbout], { type: mime });
    const filenameFinal = `${fileName}.xlsx`;

    // 1) Try Web Share API with files (mobile iOS/Android)
    try {
      const nav: any = navigator as any;
      if (nav && nav.canShare) {
        try {
          const file = new File([blob], filenameFinal, { type: mime });
          if (nav.canShare({ files: [file] })) {
            await nav.share({ files: [file], title: filenameFinal });
            return { saved: true, method: 'share' };
          }
        } catch (e) {
          // sharing failed, we'll fallback
        }
      }
    } catch (e) {
      // ignore
    }

    // 2) msSaveOrOpenBlob (IE/old Edge)
    try {
      const nav: any = navigator as any;
      if (nav && nav.msSaveOrOpenBlob) {
        nav.msSaveOrOpenBlob(blob, filenameFinal);
        return { saved: true, method: 'ms' };
      }
    } catch (e) {
      // ignore
    }

    // 3) Try file-saver (desktop browsers)
    try {
      const fileSaver = await import('file-saver');
      (fileSaver as any).saveAs(blob, filenameFinal);
      return { saved: true, method: 'filesaver' };
    } catch (e) {
      // fallback to anchor below
    }

    // 4) Anchor fallback (may open in new tab on iOS — user must save manually from there)
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameFinal;
      // Some browsers require append to body
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
          a.remove();
        } catch (e) {}
      }, 2000);
      return { saved: true, method: 'anchor' };
    } catch (e) {
      return { saved: false, method: 'failed' };
    }
  }

  async parsePaymentsFile(file: File): Promise<ParseResult> {
    const errors: string[] = [];
    const payments: Array<{ label: string; amount: number; date: number }> = [];

    // Lazy-load xlsx to avoid increasing initial bundle size
    const XLSX = await import('xlsx');

    const data = await file.arrayBuffer();
    const workbook = (XLSX as any).read(data, { type: 'array' });
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      errors.push('Fichier vide ou feuille introuvable.');
      return { payments, errors };
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<any>(sheet, { header: 1, defval: '' });
    if (!raw || raw.length === 0) {
      errors.push('Feuille vide.');
      return { payments, errors };
    }

    // Header detection (first row)
    const headerRow: string[] = (raw[0] || []).map((h: any) => String(h).trim());
    const hasLabel = headerRow.includes(this.HEADER_LABEL);
    const hasAmount = headerRow.includes(this.HEADER_AMOUNT);
    const hasDay = headerRow.includes(this.HEADER_DAY);
    if (!hasLabel || !hasAmount || !hasDay) {
      errors.push('Fichier invalide — colonnes requises manquantes (Libellé, Montant, Jour).');
      return { payments, errors };
    }

    const idxLabel = headerRow.indexOf(this.HEADER_LABEL);
    const idxAmount = headerRow.indexOf(this.HEADER_AMOUNT);
    const idxDay = headerRow.indexOf(this.HEADER_DAY);

    // Iterate rows starting from 2nd row
    for (let r = 1; r < raw.length; r++) {
      const row = raw[r] as any[];
      // skip completely empty rows
      const isEmpty = !row || row.every((c: any) => c === null || String(c).trim() === '');
      if (isEmpty) continue;

      const labelCell = String(row[idxLabel] ?? '').trim();
      const amountCell = row[idxAmount];
      const dayCell = row[idxDay];

      // Detect potential total row
      if (String(labelCell).toLowerCase() === 'total') {
        // If total present, we will validate later; ignore as a payment row
        continue;
      }

      // Validate label
      if (!labelCell) {
        errors.push(`ligne ${r + 1}: Libellé vide`);
        continue;
      }

      // Validate amount
      const amount = Number(amountCell);
      if (!isFinite(amount) || amount <= 0) {
        errors.push(`ligne ${r + 1}: Montant non numérique ou <= 0`);
        continue;
      }

      // Validate day
      const day = Number(dayCell);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        errors.push(`ligne ${r + 1}: Jour invalide (doit être entier entre 1 et 31)`);
        continue;
      }

      payments.push({ label: labelCell, amount, date: day });
    }

    if (payments.length === 0 && errors.length === 0) {
      errors.push('Import annulé — aucun prélèvement valide trouvé dans le fichier.');
    }

    return { payments, errors };
  }
}
