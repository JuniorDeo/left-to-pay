import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Payment {
  id: string;
  label: string;
  amount: number;
  date: number; // day of month (1-31)
}

export interface DailyExpense {
  id: string;
  label: string;
  amount: number;
  date: number; // day of month (1-31)
}

export interface Month {
  year: number;
  month: number; // 0-11 (January = 0)
  salary: number;
  payments: Payment[];
  // User allocations / configuration
  chargesAllocation?: number; // planned amount for scheduled charges / transfers
  flexibleAllocation?: number; // amount allocated for daily expenses
  savableAllocation?: number; // amount designated for savings
  dailyExpenses?: DailyExpense[]; // recorded daily expenses
}

@Injectable({
  providedIn: 'root',
})
export class MoneyManagerService {
  private monthSubject = new BehaviorSubject<Month>(this.getCurrentMonth());
  public month$ = this.monthSubject.asObservable();

  constructor() {
    this.loadFromLocalStorage();
    // start the watcher that detects day rollovers / month changes
    this.startDayWatcher();
  }

  private getCurrentMonth(): Month {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      salary: 0,
      payments: [],
      chargesAllocation: 0,
      flexibleAllocation: 0,
      savableAllocation: 0,
      dailyExpenses: [],
    };
  }

  getMonth(): Month {
    return this.monthSubject.getValue();
  }

  /**
   * Replace current month in the app. If stored data exists for that month, load it.
   * Otherwise, create a default Month object (copying allocations/salary from previous month for convenience).
   */
  setMonthByYearMonth(year: number, monthIndex: number): void {
    const key = `ltp-${year}-${monthIndex}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Month;
        this.monthSubject.next(parsed);
        return;
      } catch (e) {
        // fallthrough to create default
      }
    }

    // create default month, reusing allocations/salary from current month
    const current = this.monthSubject.getValue();
    const newMonth: Month = {
      year,
      month: monthIndex,
      salary: current.salary || 0,
      // copy scheduled payments from current month so recurring payments remain
      payments: (current.payments || []).map(p => ({ ...p })),
      chargesAllocation: current.chargesAllocation || 0,
      flexibleAllocation: current.flexibleAllocation || 0,
      savableAllocation: current.savableAllocation || 0,
      // start of month: clear daily expenses
      dailyExpenses: [],
    };
    this.monthSubject.next(newMonth);
    // do not immediately persist an empty month (will be saved when user updates)
  }

  nextMonth(): void {
    const m = this.monthSubject.getValue();
    let year = m.year;
    let month = m.month + 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    this.setMonthByYearMonth(year, month);
  }

  prevMonth(): void {
    const m = this.monthSubject.getValue();
    let year = m.year;
    let month = m.month - 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
    this.setMonthByYearMonth(year, month);
  }

  setSalary(amount: number): void {
    const current = this.monthSubject.getValue();
    const updated = { ...current, salary: amount };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  /**
   * Set budget allocations (charges, flexible, savable)
   */
  setAllocations(chargesAllocation: number, flexibleAllocation: number, savableAllocation: number): void {
    const current = this.monthSubject.getValue();
    const updated = { ...current, chargesAllocation, flexibleAllocation, savableAllocation };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  /** Add / remove daily expenses (Daily) */
  addDailyExpense(label: string, amount: number, date: number): void {
    const current = this.monthSubject.getValue();
    const expense: DailyExpense = { id: Date.now().toString(), label, amount, date };
    const updated = { ...current, dailyExpenses: [...(current.dailyExpenses || []), expense] };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  removeDailyExpense(expenseId: string): void {
    const current = this.monthSubject.getValue();
    const updated = {
      ...current,
      dailyExpenses: (current.dailyExpenses || []).filter(e => e.id !== expenseId),
    };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  /** Total sum of scheduled payments */
  getTotalScheduledCharges(): number {
    const month = this.monthSubject.getValue();
    return month.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  /** Return remaining flexible (allocation - daily expenses) */
  getFlexibleRemaining(): number {
    const month = this.monthSubject.getValue();
    const flexible = month.flexibleAllocation || 0;
    const spent = (month.dailyExpenses || []).reduce((s, e) => s + e.amount, 0);
    return flexible - spent;
  }

  /**
   * Amount of charge overage (if scheduled payments > allocated charges)
   */
  getChargeOverage(): number {
    const month = this.monthSubject.getValue();
    const totalScheduled = this.getTotalScheduledCharges();
    const allocated = month.chargesAllocation || 0;
    return Math.max(0, totalScheduled - allocated);
  }

  /**
   * Negative amount of flexible (if flexibleRemaining < 0 returns positive overage value)
   */
  getFlexibleNegativeAmount(): number {
    const remaining = this.getFlexibleRemaining();
    return remaining < 0 ? Math.abs(remaining) : 0;
  }

  /**
   * Actual savable amount after absorbing charge overages and negative flexible
   * Minimum returned value = 0
   */
  getRealSavableRemaining(): number {
    const month = this.monthSubject.getValue();
    const savable = month.savableAllocation || 0;
    const chargeOver = this.getChargeOverage();
    const flexibleNeg = this.getFlexibleNegativeAmount();
    const real = savable - chargeOver - flexibleNeg;
    return Math.max(0, real);
  }

  /**
   * Total overage sum (charge overage + flexible negative)
   */
  getTotalOverage(): number {
    return this.getChargeOverage() + this.getFlexibleNegativeAmount();
  }

  addPayment(label: string, amount: number, date: number): void {
    const current = this.monthSubject.getValue();
    const payment: Payment = {
      id: Date.now().toString(),
      label,
      amount,
      date,
    };
    const updated = {
      ...current,
      payments: [...current.payments, payment],
    };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  removePayment(paymentId: string): void {
    const current = this.monthSubject.getValue();
    const updated = {
      ...current,
      payments: current.payments.filter(p => p.id !== paymentId),
    };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  /** Update an existing payment by id. Only provided fields are updated. */
  updatePayment(paymentId: string, changes: Partial<Payment>): void {
    const current = this.monthSubject.getValue();
    const payments = current.payments.map(p => (p.id === paymentId ? { ...p, ...changes } : p));
    const updated = { ...current, payments };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  /**
   * Replace the current list of scheduled payments with the provided list.
   * Each payment will be normalized (ensure id, numeric amount/date) and persisted.
   */
  replacePayments(payments: Payment[]): void {
    const current = this.monthSubject.getValue();
    const normalized: Payment[] = (payments || []).map(p => ({
      id: p.id || Date.now().toString() + Math.random().toString(36).slice(2, 8),
      label: String(p.label || '').trim(),
      amount: Number(p.amount) || 0,
      date: Number(p.date) || 1,
    }));

    const updated = {
      ...current,
      payments: normalized,
    };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }
  getTodayBalance(): number {
    const month = this.monthSubject.getValue();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    // If we are not in the stored month, return 0
    if (currentYear !== month.year || currentMonth !== month.month) {
      return 0;
    }

    // If salary is not recorded, return 0
    if (month.salary === 0) {
      return 0;
    }

    let balance = month.salary;

    // Deduct all payments up to today
    const paymentsUntilToday = month.payments.filter(p => p.date <= currentDay);
    for (const payment of paymentsUntilToday) {
      balance -= payment.amount;
    }

    return balance;
  }

  /**
   * Return the total amount of payments left to pay (including today and after)
   */
  getLeftToPay(): number {
    const month = this.monthSubject.getValue();
    const today = new Date();

    if (today.getFullYear() !== month.year || today.getMonth() !== month.month) {
      // Si pas le mois en cours, tous les paiements sont "à venir"
      return month.payments.reduce((sum, p) => sum + p.amount, 0);
    }

    const currentDay = today.getDate();
    const upcomingPayments = month.payments.filter(p => p.date >= currentDay);
    return upcomingPayments.reduce((sum, p) => sum + p.amount, 0);
  }

  /**
   * Return upcoming payments (including today), sorted by date
   */
  getUpcomingPayments(): Payment[] {
    const month = this.monthSubject.getValue();
    const today = new Date();
    const currentDay = today.getFullYear() === month.year && today.getMonth() === month.month ? today.getDate() : 0;

    return month.payments.filter(p => p.date >= currentDay).sort((a, b) => a.date - b.date);
  }

  /**
   * Return payments grouped by day for the calendar
   */
  getPaymentsByDay(): Map<number, Payment[]> {
    const month = this.monthSubject.getValue();
    const result = new Map<number, Payment[]>();

    for (const payment of month.payments) {
      const existing = result.get(payment.date) || [];
      existing.push(payment);
      result.set(payment.date, existing);
    }

    return result;
  }

  getDaysInMonth(): number {
    const month = this.monthSubject.getValue();
    return new Date(month.year, month.month + 1, 0).getDate();
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  private saveToLocalStorage(): void {
    const month = this.monthSubject.getValue();
    const key = `ltp-${month.year}-${month.month}`;
    localStorage.setItem(key, JSON.stringify(month));
  }

  private loadFromLocalStorage(): void {
    const month = this.getMonth();
    const key = `ltp-${month.year}-${month.month}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      this.monthSubject.next(JSON.parse(stored));
    }
  }

  /**
   * Force reload from localStorage for the current month
   * (useful to refresh the UI or after visibilitychange)
   */
  forceRefresh(): void {
    this.loadFromLocalStorage();
    // forcer une émission même si les données n'ont pas changé
    this.monthSubject.next({ ...this.getMonth() });
  }

  /**
   * Return the current environment timezone (e.g., 'Europe/Paris')
   */
  getCurrentTimeZone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'local';
    } catch (e) {
      return 'local';
    }
  }

  /**
   * If the current month does not exist in localStorage, try to copy
   * essential settings (salary, payments, allocations) from the previous month.
   */
  private ensureCurrentMonthData(): void {
    const now = new Date();
    const keyCurrent = `ltp-${now.getFullYear()}-${now.getMonth()}`;
    if (localStorage.getItem(keyCurrent)) {
      return; // déjà présent
    }

    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const keyPrev = `ltp-${prev.getFullYear()}-${prev.getMonth()}`;
    const storedPrev = localStorage.getItem(keyPrev);
    if (!storedPrev) return;

    try {
      const data = JSON.parse(storedPrev) as Month;
      const newMonth: Month = {
        year: now.getFullYear(),
        month: now.getMonth(),
        salary: data.salary || 0,
        // shallow copy of payments (keep the same list of scheduled payments)
        payments: (data.payments || []).map(p => ({ ...p })),
        chargesAllocation: data.chargesAllocation || 0,
        flexibleAllocation: data.flexibleAllocation || 0,
        savableAllocation: data.savableAllocation || 0,
        // by default reset daily expenses for the new month
        dailyExpenses: [],
      };
      localStorage.setItem(keyCurrent, JSON.stringify(newMonth));
      this.monthSubject.next(newMonth);
    } catch (e) {
      // ignore and exit
      console.error('ensureCurrentMonthData: error while copying previous month data', e);
    }
  }

  /**
   * Start a watcher that detects day rollovers (midnight) and returning to foreground
   * to force a re-evaluation of views (useful for PWA / iOS bookmark).
   */
  private startDayWatcher(): void {
    let lastCheckDay = new Date().getDate();
    let lastTimeZone = this.getCurrentTimeZone();

    // Check every 30 seconds (sufficient to detect midnight or timezone change)
    window.setInterval(() => {
      const now = new Date();

      // Detect day change
      if (now.getDate() !== lastCheckDay) {
        lastCheckDay = now.getDate();
        // If the month changed, ensure the current month is initialized
        const month = this.getMonth();
        if (month.year !== now.getFullYear() || month.month !== now.getMonth()) {
          this.ensureCurrentMonthData();
        }
        // force emission so components refresh their display
        this.monthSubject.next({ ...this.getMonth() });
      }

      // Detect timezone change (useful if the user changes TZ without reloading)
      try {
        const tz = this.getCurrentTimeZone();
        if (tz !== lastTimeZone) {
          lastTimeZone = tz;
          // forcer rechargement / réévaluation
          this.ensureCurrentMonthData();
          this.monthSubject.next({ ...this.getMonth() });
        }
      } catch (e) {
        // ignore
      }
    }, 30_000);

    // When the app returns to the foreground, reload data (very useful for iOS PWA)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // on return to foreground, ensure current month data
        this.ensureCurrentMonthData();
        this.forceRefresh();
      }
    });
  }

  getMonthName(): string {
    const month = this.monthSubject.getValue();
    return new Date(month.year, month.month, 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  }
}
