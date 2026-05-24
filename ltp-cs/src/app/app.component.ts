import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { MoneyManagerService, Month, Payment } from './money-manager.service';
import { SortPipe } from './sort.pipe';

@Component({
  selector: 'app-root',
  imports: [CommonModule, SortPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  @ViewChild('salaryInput') salaryInput!: ElementRef<HTMLInputElement>;
  @ViewChild('paymentLabel') paymentLabel!: ElementRef<HTMLInputElement>;
  @ViewChild('paymentAmount') paymentAmount!: ElementRef<HTMLInputElement>;
  @ViewChild('paymentDate') paymentDate!: ElementRef<HTMLInputElement>;

  month$: Observable<Month>;
  activeTab: 'home' | 'calendar' = 'home';
  darkMode = false;

  constructor(private moneyManager: MoneyManagerService) {
    this.month$ = this.moneyManager.month$;
    this.darkMode = localStorage.getItem('ltp-dark-mode') === 'true';
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem('ltp-dark-mode', String(this.darkMode));
  }

  switchTab(tab: 'home' | 'calendar'): void {
    this.activeTab = tab;
  }

  setSalary(): void {
    const salary = parseFloat(this.salaryInput.nativeElement.value);
    if (salary > 0) {
      this.moneyManager.setSalary(salary);
      this.salaryInput.nativeElement.value = '';
    }
  }

  onSalaryChange(): void {
    // Trigger setSalary on Enter key or change event
  }

  addPayment(): void {
    const label = this.paymentLabel.nativeElement.value.trim();
    const amount = parseFloat(this.paymentAmount.nativeElement.value);
    const date = parseInt(this.paymentDate.nativeElement.value, 10);

    if (label && amount > 0 && date >= 1 && date <= 31) {
      this.moneyManager.addPayment(label, amount, date);
      this.paymentLabel.nativeElement.value = '';
      this.paymentAmount.nativeElement.value = '';
      this.paymentDate.nativeElement.value = '';
    }
  }

  removePayment(paymentId: string): void {
    this.moneyManager.removePayment(paymentId);
  }

  getDailyBalanceArray(): Array<{ label: string; balance: number; isToday: boolean }> {
    const balances = this.moneyManager.getDailyBalance();
    const month = this.moneyManager.getMonth();
    const daysInMonth = new Date(month.year, month.month + 1, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === month.year && today.getMonth() === month.month;
    const currentDay = today.getDate();

    const result: Array<{ label: string; balance: number; isToday: boolean }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const balance = balances.get(day) || 0;
      const date = new Date(month.year, month.month, day);
      const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
      const isToday = isCurrentMonth && day === currentDay;
      result.push({ label, balance, isToday });
    }

    return result;
  }

  getMonthName(): string {
    return this.moneyManager.getMonthName();
  }

  getTodayBalance(): number {
    return this.moneyManager.getTodayBalance();
  }

  getTodayDate(): string {
    return this.moneyManager.getTodayDate();
  }

  getTimeStatus(): { message: string; icon: string; className: string } {
    const today = new Date();
    const month = this.moneyManager.getMonth();

    if (today.getFullYear() !== month.year || today.getMonth() !== month.month) {
      return { message: 'Mois non actif', icon: '📅', className: 'status-inactive' };
    }

    const balance = this.getTodayBalance();

    if (balance < 0) {
      return { message: 'Alerte: Budget dépassé!', icon: '⚠️', className: 'status-danger' };
    } else if (balance < 500) {
      return { message: 'Attention: Budget faible', icon: '⚡', className: 'status-warning' };
    } else {
      return { message: 'Budget rassurant', icon: '✅', className: 'status-ok' };
    }
  }

  getLeftToPay(): number {
    return this.moneyManager.getLeftToPay();
  }

  getUpcomingPayments(): Payment[] {
    return this.moneyManager.getUpcomingPayments();
  }

  getCalendarDays(): Array<{ day: number; payments: Payment[]; isToday: boolean; dayName: string }> {
    const month = this.moneyManager.getMonth();
    const daysInMonth = this.moneyManager.getDaysInMonth();
    const paymentsByDay = this.moneyManager.getPaymentsByDay();
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === month.year && today.getMonth() === month.month;
    const currentDay = today.getDate();

    const result: Array<{ day: number; payments: Payment[]; isToday: boolean; dayName: string }> = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(month.year, month.month, day);
      const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
      result.push({
        day,
        payments: paymentsByDay.get(day) || [],
        isToday: isCurrentMonth && day === currentDay,
        dayName
      });
    }

    return result;
  }
}
