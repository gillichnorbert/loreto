import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LogService {
  private logsSubject = new BehaviorSubject<string[]>([]);
  public logs$ = this.logsSubject.asObservable();

  constructor() {
    this.loadLogs();
  }

  private nowExcel(d: Date = new Date()): string {
     const pad = (n: number) => String(n).padStart(2, '0');
     return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  private loadLogs(): void {
    const logs = JSON.parse(localStorage.getItem('logs') || '[]');
    this.logsSubject.next(logs);
  }

  private persistLogs(logs: string[]): void {
    localStorage.setItem('logs', JSON.stringify(logs));
    this.logsSubject.next(logs);
  }

  public addLog(msg: string): void {
    const entry = `${this.nowExcel(new Date())} - ${msg}`;
    const currentLogs = [entry, ...this.logsSubject.value]; // Új bejegyzés elölre
    this.persistLogs(currentLogs);
  }

  public clearLog(): void {
    if (!confirm('¿Seguro que desea borrar el registro de actividad?')) return;
    this.persistLogs([]);
    this.addLog('Registro limpiado manualmente');
  }
}