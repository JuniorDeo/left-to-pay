import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MoneyManagerService, Month, Payment } from './money-manager.service';
import { ExcelService } from './excel.service';
import { NotificationService } from './notification.service';
import { SortPipe } from './sort.pipe';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  imports: [CommonModule, SortPipe, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  @ViewChild('salaryInput') salaryInput!: ElementRef<HTMLInputElement>;
  @ViewChild('paymentLabel') paymentLabel!: ElementRef<HTMLInputElement>;
  @ViewChild('paymentAmount') paymentAmount!: ElementRef<HTMLInputElement>;
  @ViewChild('paymentDate') paymentDate!: ElementRef<HTMLInputElement>;
  // allocation inputs now managed by a reactive form
  allocationForm!: FormGroup;
  activeAllocControl: string | null = null;
  suggestions: { [key: string]: number | null } = { salary: null, charges: null, flexible: null, savable: null };
  @ViewChild('dailyLabel') dailyLabel!: ElementRef<HTMLInputElement>;
  @ViewChild('dailyAmount') dailyAmount!: ElementRef<HTMLInputElement>;
  @ViewChild('dailyDate') dailyDate!: ElementRef<HTMLInputElement>;
  @ViewChild('importFileInput') importFileInput!: ElementRef<HTMLInputElement>;

  month$: Observable<Month>;
  activeTab: 'home' | 'calendar' | 'daily' = 'home';
  darkMode = false;
  showSalaryConfig = false;
  timeZone = '';

  constructor(
    private moneyManager: MoneyManagerService,
    private fb: FormBuilder,
    private excelService: ExcelService,
    public notificationService: NotificationService,
  ) {
    this.month$ = this.moneyManager.month$;
    this.darkMode = localStorage.getItem('ltp-dark-mode') === 'true';
    this.initAllocationForm();
    this.timeZone = this.moneyManager.getCurrentTimeZone();
  }

  goToNextMonth(): void {
    this.moneyManager.nextMonth();
  }

  goToPrevMonth(): void {
    this.moneyManager.prevMonth();
  }

  ngOnInit(): void {
    // Update timezone and force refresh of the display
    this.month$.subscribe(() => {
      this.timeZone = this.moneyManager.getCurrentTimeZone();
    });
    // Initialize meta/theme color for the status bar (light/dark)
    this.setupThemeColor();
  }

  /**
   * Initialize and listen for changes to the prefers-color-scheme media query
   * to update <meta name="theme-color"> and the document background.
   */
  private setupThemeColor(): void {
    const meta = document.querySelector('meta[name="theme-color"]#meta-theme-color') as HTMLMetaElement | null;
    if (!meta) return;

    const darkColor = '#0b1220';
    const lightColor = '#667eea';

    // Apply initial theme based on user preference
    const applyTheme = () => {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const color = isDark ? darkColor : lightColor;
      try {
        meta.setAttribute('content', color);
      } catch (e) {
        // ignore
      }
      // also set document background to avoid white area under the notch in standalone mode
      (document.documentElement as HTMLElement).style.backgroundColor = color;
    };

    applyTheme();

    // Listen for changes in the prefers-color-scheme media query to update theme in real-time
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if ((mq as any).addEventListener) {
        (mq as any).addEventListener('change', applyTheme);
      } else if ((mq as any).addListener) {
        (mq as any).addListener(applyTheme);
      }
    }
  }

  private initAllocationForm(): void {
    // allow empty values so user can clear fields
    this.allocationForm = this.fb.group({
      salary: [null, [Validators.min(0)]],
      charges: [null, [Validators.min(0)]],
      flexible: [null, [Validators.min(0)]],
      savable: [null, [Validators.min(0)]],
    });

    // Compute suggestions on changes with a small debounce to avoid forcing while typing
    this.allocationForm.valueChanges.pipe(debounceTime(350)).subscribe(() => this.computeAllocationSuggestions());
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem('ltp-dark-mode', String(this.darkMode));
  }

  switchTab(tab: 'home' | 'calendar' | 'daily'): void {
    this.activeTab = tab;
  }

  openSalaryConfig(): void {
    this.showSalaryConfig = !this.showSalaryConfig;
    // when opening, populate the form with current month values
    if (this.showSalaryConfig) {
      const month = this.moneyManager.getMonth();
      if (this.allocationForm) {
        this.allocationForm.patchValue(
          {
            salary: month.salary || null,
            charges: month.chargesAllocation ?? null,
            flexible: month.flexibleAllocation ?? null,
            savable: month.savableAllocation ?? null,
          },
          { emitEvent: false },
        );
        // clear any previous form errors
        this.allocationForm.setErrors(null);
      }
    }
  }

  saveAllocations(): void {
    if (!this.allocationForm) return;
    const v = this.allocationForm.value;

    // validation: salary must equal sum of allocations
    const sumAlloc = (v.charges || 0) + (v.flexible || 0) + (v.savable || 0);
    const salary = v.salary || 0;
    if (Math.abs(sumAlloc - salary) > 0.01) {
      // mark controls as touched to show validation errors
      this.allocationForm.setErrors({ allocationMismatch: true });
      return;
    }

    this.moneyManager.setSalary(salary);
    this.moneyManager.setAllocations(v.charges || 0, v.flexible || 0, v.savable || 0);
    this.showSalaryConfig = false;
    this.allocationForm.setErrors(null);
  }

  /**
   * Compute non-intrusive suggestions for the other fields based on current inputs.
   * Suggestions are shown as hints; they do not overwrite user inputs.
   */
  private computeAllocationSuggestions(): void {
    if (!this.allocationForm) return;
    const v = this.allocationForm.value;
    const isNum = (n: any) => typeof n === 'number' && !isNaN(n);

    // reset suggestions
    this.suggestions = { salary: null, charges: null, flexible: null, savable: null };

    const salary = isNum(v.salary) ? v.salary : null;
    const charges = isNum(v.charges) ? v.charges : null;
    const flexible = isNum(v.flexible) ? v.flexible : null;
    const savable = isNum(v.savable) ? v.savable : null;

    // If salary known, suggest missing allocations based on salary
    if (salary !== null) {
      const sumOther = (a: number | null, b: number | null) => (a || 0) + (b || 0);

      if (this.activeAllocControl !== 'charges') {
        const suggestion = salary - sumOther(flexible, savable);
        this.suggestions['charges'] = suggestion >= 0 ? Number(suggestion.toFixed(2)) : 0;
      }
      if (this.activeAllocControl !== 'flexible') {
        const suggestion = salary - sumOther(charges, savable);
        this.suggestions['flexible'] = suggestion >= 0 ? Number(suggestion.toFixed(2)) : 0;
      }
      if (this.activeAllocControl !== 'savable') {
        const suggestion = salary - sumOther(charges, flexible);
        this.suggestions['savable'] = suggestion >= 0 ? Number(suggestion.toFixed(2)) : 0;
      }
    }

    // If salary unknown and at least two allocations known, suggest salary
    const allocKnownCount = [charges, flexible, savable].filter(isNum).length;
    if (salary === null && allocKnownCount >= 2) {
      const sum = (charges || 0) + (flexible || 0) + (savable || 0);
      if (this.activeAllocControl !== 'salary') {
        this.suggestions['salary'] = Number(sum.toFixed(2));
      }
    }
  }

  setActiveAlloc(control: string | null): void {
    this.activeAllocControl = control;
    // recompute suggestions immediately when focus changes
    this.computeAllocationSuggestions();
  }

  applySuggestion(control: string): void {
    const val = this.suggestions[control];
    if (val == null) return;
    const patch: any = {};
    patch[control] = val;
    this.allocationForm.patchValue(patch);
  }

  getTotalScheduledCharges(): number {
    return this.moneyManager.getTotalScheduledCharges();
  }

  getFlexibleRemaining(): number {
    return this.moneyManager.getFlexibleRemaining();
  }

  addDailyExpense(): void {
    const label = this.dailyLabel.nativeElement.value.trim();
    const amount = parseFloat(this.dailyAmount.nativeElement.value);
    const date = parseInt(this.dailyDate.nativeElement.value, 10);
    if (label && amount > 0 && date >= 1 && date <= 31) {
      this.moneyManager.addDailyExpense(label, amount, date);
      this.dailyLabel.nativeElement.value = '';
      this.dailyAmount.nativeElement.value = '';
      this.dailyDate.nativeElement.value = '';
    }
  }

  removeDailyExpense(expenseId: string): void {
    this.moneyManager.removeDailyExpense(expenseId);
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

  // Export payments to Excel (.xlsx)
  onExportPayments(): void {
    const month = this.moneyManager.getMonth();
    try {
      this.excelService.exportPayments(month.payments, `prelevements-${month.year}-${month.month + 1}`);
      this.notificationService.success(`Export téléchargé: prelevements-${month.year}-${month.month + 1}.xlsx`);
    } catch (e) {
      console.error(e);
      this.notificationService.error("Erreur lors de l'export.");
    }
  }

  // Trigger file picker
  openImportDialog(): void {
    if (this.importFileInput && this.importFileInput.nativeElement) {
      this.importFileInput.nativeElement.value = '';
      this.importFileInput.nativeElement.click();
    }
  }

  // Handle file selected by user
  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file) return;

    try {
      const result = await this.excelService.parsePaymentsFile(file);
      if (result.errors && result.errors.length > 0) {
        // show first errors to user
        this.notificationService.error('Import annulé — erreurs :\n' + result.errors.join('\n'));
        return;
      }

      // confirm replacement
      const msg = `Remplacer les ${this.moneyManager.getMonth().payments.length} prélèvements actuels par les ${result.payments.length} du fichier ?`;
      const ok = await (this.notificationService as any).confirm(msg);
      if (!ok) return;

      // Convert parsed payments to Payment[] (ids will be assigned by service)
      this.moneyManager.replacePayments(result.payments as Payment[]);
      this.notificationService.success(`Import réussi — ${result.payments.length} prélèvements importés.`);
    } catch (e) {
      console.error(e);
      this.notificationService.error("Erreur lors de l'import du fichier.");
    }
  }

  removePayment(paymentId: string): void {
    this.moneyManager.removePayment(paymentId);
  }

  getMonthName(): string {
    return this.moneyManager.getMonthName();
  }

  refreshData(): void {
    this.moneyManager.forceRefresh();
    this.timeZone = this.moneyManager.getCurrentTimeZone();
  }

  getTodayBalance(): number {
    return this.moneyManager.getTodayBalance();
  }

  getTodayDate(): string {
    return this.moneyManager.getTodayDate();
  }

  getRealSavableRemaining(): number {
    return this.moneyManager.getRealSavableRemaining();
  }

  getTotalOverage(): number {
    return this.moneyManager.getTotalOverage();
  }

  shouldShowDebtAlert(): boolean {
    const month = this.moneyManager.getMonth();
    if (!month || month.salary <= 0) return false;
    const totalScheduled = this.getTotalScheduledCharges();
    const dailySpent = (month.dailyExpenses || []).reduce((s, e) => s + e.amount, 0);
    // show alert only if total of scheduled charges + daily expenses exceeds salary
    return totalScheduled + dailySpent > month.salary;
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

  /**
   * Return the next N upcoming payments (default 3)
   */
  getNextUpcomingPayments(count = 3): Payment[] {
    return this.getUpcomingPayments().slice(0, count);
  }

  hasMoreUpcoming(count = 3): boolean {
    return this.getUpcomingPayments().length > count;
  }

  getCalendarDays(): Array<{
    day: number;
    payments: Payment[];
    isToday: boolean;
    dayName: string;
  }> {
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
        dayName,
      });
    }

    return result;
  }
}
