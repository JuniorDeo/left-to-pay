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
  // Allocations/configuration utilisateur
  chargesAllocation?: number; // montant prévu pour charges/virements programmés
  flexibleAllocation?: number; // montant alloué aux dépenses quotidiennes
  savableAllocation?: number; // montant destiné à l'épargne
  dailyExpenses?: DailyExpense[]; // dépenses quotidiennes pointées
}

@Injectable({
  providedIn: 'root',
})
export class MoneyManagerService {
  private monthSubject = new BehaviorSubject<Month>(this.getCurrentMonth());
  public month$ = this.monthSubject.asObservable();

  constructor() {
    this.loadFromLocalStorage();
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
      // copy scheduled payments from current month so prélèvements restent récurrents
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
   * Définit les allocations de budget (charges, flexible, économisable)
   */
  setAllocations(chargesAllocation: number, flexibleAllocation: number, savableAllocation: number): void {
    const current = this.monthSubject.getValue();
    const updated = { ...current, chargesAllocation, flexibleAllocation, savableAllocation };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  /** Ajout / suppression de dépenses quotidiennes (Quotidien) */
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

  /** Somme totale des prélèvements programmés */
  getTotalScheduledCharges(): number {
    const month = this.monthSubject.getValue();
    return month.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  /** Retourne le reste du flexible (allocation - dépenses quotidiennes) */
  getFlexibleRemaining(): number {
    const month = this.monthSubject.getValue();
    const flexible = month.flexibleAllocation || 0;
    const spent = (month.dailyExpenses || []).reduce((s, e) => s + e.amount, 0);
    return flexible - spent;
  }

  /**
   * Montant de dépassement des charges (si les prélèvements programmés > allocation de charges)
   */
  getChargeOverage(): number {
    const month = this.monthSubject.getValue();
    const totalScheduled = this.getTotalScheduledCharges();
    const allocated = month.chargesAllocation || 0;
    return Math.max(0, totalScheduled - allocated);
  }

  /**
   * Montant négatif du flexible (si flexibleRemaining < 0 retourne valeur positive du dépassement)
   */
  getFlexibleNegativeAmount(): number {
    const remaining = this.getFlexibleRemaining();
    return remaining < 0 ? Math.abs(remaining) : 0;
  }

  /**
   * Montant réellement économisable après avoir absorbé les dépassements de charges et le flexible négatif
   * Valeur minimale renvoyée = 0
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
   * Somme totale des dépassements (charges over + flexible negative)
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

  getDailyBalance(): Map<number, number> {
    const month = this.monthSubject.getValue();
    const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();
    const balances = new Map<number, number>();

    let currentBalance = month.salary;
    balances.set(0, month.salary); // First day salary

    for (let day = 1; day <= daysInMonth; day++) {
      const paymentsOnDay = month.payments.filter(p => p.date === day);
      for (const payment of paymentsOnDay) {
        currentBalance -= payment.amount;
      }
      balances.set(day, currentBalance);
    }

    return balances;
  }

  getTodayBalance(): number {
    const month = this.monthSubject.getValue();
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const currentDay = today.getDate();

    // Si nous ne sommes pas dans le mois enregistré, initialiser à 0
    if (currentYear !== month.year || currentMonth !== month.month) {
      return 0;
    }

    // Si le salaire n'est pas enregistré, retourner 0
    if (month.salary === 0) {
      return 0;
    }

    let balance = month.salary;

    // Déduire tous les paiements jusqu'à aujourd'hui
    const paymentsUntilToday = month.payments.filter(p => p.date <= currentDay);
    for (const payment of paymentsUntilToday) {
      balance -= payment.amount;
    }

    return balance;
  }

  /**
   * Retourne le montant total des prélèvements restants à venir (après aujourd'hui et aujourd'hui)
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
   * Retourne les prélèvements à venir (après aujourd'hui et aujourd'hui), triés par date
   */
  getUpcomingPayments(): Payment[] {
    const month = this.monthSubject.getValue();
    const today = new Date();
    const currentDay = today.getFullYear() === month.year && today.getMonth() === month.month ? today.getDate() : 0;

    return month.payments.filter(p => p.date >= currentDay).sort((a, b) => a.date - b.date);
  }

  /**
   * Retourne les prélèvements regroupés par jour pour le calendrier
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

  getMonthName(): string {
    const month = this.monthSubject.getValue();
    return new Date(month.year, month.month, 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  }
}
