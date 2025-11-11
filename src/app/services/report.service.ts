import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Report } from './report.model';
import { LogService } from './log.service'; // Szükségünk van rá a logoláshoz

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private reportsSubject = new BehaviorSubject<Report[]>([]);
  public reports$ = this.reportsSubject.asObservable();

  private archiveReports: Report[] = [];

  constructor(private logService: LogService) {
    this.loadReportsFromStorage();
  }

  private loadReportsFromStorage(): void {
    const storedReports = JSON.parse(localStorage.getItem('reports') || '[]');
    this.reportsSubject.next(storedReports);
    this.archiveReports = JSON.parse(localStorage.getItem('archiveReports') || '[]');
  }

  private persistReports(reports: Report[]): void {
    localStorage.setItem('reports', JSON.stringify(reports));
    this.reportsSubject.next(reports); // Értesítjük a feliratkozókat
  }

  private persistArchive(): void {
    localStorage.setItem('archiveReports', JSON.stringify(this.archiveReports));
  }
  
  public getReportsSnapshot(): Report[] {
    return this.reportsSubject.value; // Az aktuális érték lekéréséhez
  }

  public generateID(brand: string = ''): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const b = brand ? `-${brand.replace(/\s+|\/|&/g, '_').slice(0, 12)}` : '';
    let id = `R-${date}-${time}${b}`;
    let tries = 0;
    
    while (this.getReportsSnapshot().some(r => r.id === id) && tries < 10) {
      id = `R-${date}-${time}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      tries++;
    }
    return id;
  }
  
  private nowExcel(d: Date = new Date()): string {
     const pad = (n: number) => String(n).padStart(2, '0');
     return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  public saveReport(reportData: Report): void {
    const reports = [...this.getReportsSnapshot()];
    const idx = reports.findIndex(r => r.id === reportData.id);

    // Biztosítjuk, hogy a timestamp frissüljön
    const reportToSave: Report = {
      ...reportData,
      timestamp: this.nowExcel(new Date())
    };

    if (idx !== -1) {
      // Frissítés
      reports[idx] = reportToSave;
      this.logService.addLog(`Reporte actualizado: ${reportToSave.id}`);
    } else {
      // Új létrehozása
      reports.push(reportToSave);
      this.logService.addLog(`Reporte guardado: ${reportToSave.id}`);
    }

    this.persistReports(reports);
  }

  public deleteReport(id: string): void {
    let reports = [...this.getReportsSnapshot()];
    reports = reports.filter(r => r.id !== id);
    this.persistReports(reports);
    this.logService.addLog(`Reporte eliminado: ${id}`);
  }

  public clearAll(): void {
    if (!confirm('¿Seguro que desea borrar todos los reportes guardados?')) return;
    this.persistReports([]);
    this.logService.addLog('Todos los reportes han sido eliminados');
  }

  public autoArchive(threshold: number = 0): void {
    if (threshold > 0 && this.getReportsSnapshot().length <= threshold) return;
    if (threshold === 0 && !confirm('¿Desea ejecutar archivado automático ahora? Moverá los más antiguos a archivo.')) return;

    const reports = this.getReportsSnapshot();
    const over = (threshold > 0) ? (reports.length - threshold) : reports.length;
    if (over <= 0) return;

    const sorted = [...reports].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    const toMove = sorted.slice(0, over);
    const remaining = reports.filter(r => !toMove.some(m => m.id === r.id));
    
    this.archiveReports = this.archiveReports.concat(toMove);
    
    this.persistReports(remaining);
    this.persistArchive();
    this.logService.addLog(`Archivado automático: ${toMove.length} reportes movidos a archivo.`);
  }
}