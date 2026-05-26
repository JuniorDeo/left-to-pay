import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type NotificationType = 'success' | 'error' | 'info';
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable();
  // Confirmation request (single at a time)
  private confirmSubject = new BehaviorSubject<{ message: string; resolve?: (v: boolean) => void } | null>(null);
  public confirmCurrent$ = this.confirmSubject.asObservable();

  show(message: string, type: NotificationType = 'info', duration = 3500) {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    const current = this.notificationsSubject.getValue();
    const next = [...current, { id, type, message }];
    this.notificationsSubject.next(next);

    // Auto remove
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, duration = 3000) {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 6000) {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 3500) {
    this.show(message, 'info', duration);
  }

  /**
   * Ask the user for confirmation using the app's modal UI.
   * Returns a promise that resolves to true/false.
   */
  async confirm(message: string): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      this.confirmSubject.next({ message, resolve });
    });
  }

  /** Answer current confirmation request (used by UI) */
  answerConfirm(value: boolean) {
    const cur = this.confirmSubject.getValue();
    if (cur && cur.resolve) cur.resolve(value);
    this.confirmSubject.next(null);
  }

  dismiss(id: string) {
    const current = this.notificationsSubject.getValue();
    const next = current.filter(n => n.id !== id);
    this.notificationsSubject.next(next);
  }
}
