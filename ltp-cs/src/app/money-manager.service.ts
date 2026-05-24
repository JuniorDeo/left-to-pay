import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Payment {
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
}

@Injectable({
  providedIn: 'root'
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
      payments: []
    };
  }

  getMonth(): Month {
    return this.monthSubject.getValue();
  }

  setSalary(amount: number): void {
    const current = this.monthSubject.getValue();
    const updated = { ...current, salary: amount };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  addPayment(label: string, amount: number, date: number): void {
    const current = this.monthSubject.getValue();
    const payment: Payment = {
      id: Date.now().toString(),
      label,
      amount,
      date
    };
    const updated = {
      ...current,
      payments: [...current.payments, payment]
    };
    this.monthSubject.next(updated);
    this.saveToLocalStorage();
  }

  removePayment(paymentId: string): void {
    const current = this.monthSubject.getValue();
    const updated = {
      ...current,
      payments: current.payments.filter(p => p.id !== paymentId)
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
   * Retourne le montant total des prélèvements restants à venir (après aujourd'hui)
   */
  getLeftToPay(): number {
    const month = this.monthSubject.getValue();
    const today = new Date();

    if (today.getFullYear() !== month.year || today.getMonth() !== month.month) {
      // Si pas le mois en cours, tous les paiements sont "à venir"
      return month.payments.reduce((sum, p) => sum + p.amount, 0);
    }

    const currentDay = today.getDate();
    const upcomingPayments = month.payments.filter(p => p.date > currentDay);
    return upcomingPayments.reduce((sum, p) => sum + p.amount, 0);
  }

  /**
   * Retourne les prélèvements à venir (après aujourd'hui), triés par date
   */
  getUpcomingPayments(): Payment[] {
    const month = this.monthSubject.getValue();
    const today = new Date();
    const currentDay = (today.getFullYear() === month.year && today.getMonth() === month.month)
      ? today.getDate()
      : 0;

    return month.payments
      .filter(p => p.date > currentDay)
      .sort((a, b) => a.date - b.date);
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
      year: 'numeric'
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
      year: 'numeric'
    });
  }
}


