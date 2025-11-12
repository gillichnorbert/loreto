import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import { Report } from '../../services/report.model';
import { ReportService } from '../../services/report.service';
import { LogService } from '../../services/log.service';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-report-form',
  templateUrl: './report-form.component.html',
  styleUrls: ['./report-form.component.css']
})
export class ReportFormComponent implements OnInit {
  reportForm: FormGroup;
  reports$: Observable<Report[]>;
  selectedReportId: string | null = null;

  // Esemény, amit a szülő (AppComponent) elkaphat a mentés-villanás megjelenítéséhez
  @Output() reportSaved = new EventEmitter<void>();

  // Referencia a rejtett file input-ra
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private reportService: ReportService,
    private logService: LogService,
    private exportService: ExportService
  ) {
    this.reports$ = this.reportService.reports$;
    
    this.reportForm = this.fb.group({
      id: [{ value: '', disabled: true }],
      client: [''],
      clientEmail: [''],
      orderNumber: [''],
      brand: [''],
      part: [''],
      reason: [''],
      status: [''],
      comment: ['']
    });
  }

  ngOnInit(): void {
    this.resetForm();
  }

  resetForm(): void {
    this.reportForm.reset({
      id: { value: this.reportService.generateID(), disabled: true },
      client: '',
      clientEmail: '', // ⭐️ HOZZÁADVA
      orderNumber: '',
      brand: '',
      part: '',
      reason: '',
      status: '',
      comment: ''
    });
    this.selectedReportId = null;
  }

  onReportSelected(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (!id) {
      this.resetForm();
      return;
    }
    
    const report = this.reportService.getReportsSnapshot().find(r => r.id === id);
    if (report) {
      this.reportForm.patchValue(report);
      this.selectedReportId = report.id;
    }
  }

  onSave(): void {
    const reportData = this.reportForm.getRawValue() as Report;
    this.reportService.saveReport(reportData);
    this.reportSaved.emit(); // Jelez a szülőnek
    this.resetForm();
  }

  onDelete(): void {
    if (!this.selectedReportId) return;
    this.reportService.deleteReport(this.selectedReportId);
    this.resetForm();
  }

  onClearAll(): void {
    this.reportService.clearAll();
    this.resetForm(); // Az űrlap is törlődik
  }
  
  onArchive(): void {
    this.reportService.autoArchive(0); // 0 = manuális indítás
  }

  // --- Import/Export gombok ---

  onExportCSV(): void {
    this.exportService.exportToCSV();
  }
  
  onImportClick(): void {
    // A rejtett input triggerelése
    this.fileInput.nativeElement.click();
  }
  
  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      await this.exportService.importFromFile(file);
      // Importálás után frissítjük az űrlapot (opcionális)
      this.resetForm();
      // Fontos: ürítsük ki a file inputot, hogy ugyanazt a fájlt újra kiválaszthassa
      input.value = ''; 
    }
  }
  
  onExportSelectedPDF(): void {
    if (!this.selectedReportId) {
        alert('Seleccione un reporte primero.');
        return;
    }
    const report = this.reportService.getReportsSnapshot().find(r => r.id === this.selectedReportId);
    if (report) {
      this.exportService.generateClientPDF([report]);
    }
  }
  
  onExportAllPDF(): void {
    const allReports = this.reportService.getReportsSnapshot();
    // Dátum szerint rendezve, ahogy az eredeti kódban
    const sorted = [...allReports].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    this.exportService.generateClientPDF(sorted);
  }

  onEmailReport(): void {
    // 1. Ellenőrizzük, van-e kiválasztott riport
    if (!this.selectedReportId) {
      alert('Seleccione un reporte para enviar por email.');
      return;
    }

    const report = this.reportForm.getRawValue() as Report;
    if (!report) {
      alert('Reporte no encontrado.');
      return;
    }

    const subject = `Detalles de la Devolución: ${report.orderNumber || report.id}`;
    

    const body = `
Hola,

Adjunto los detalles de la devolución para el pedido: ${report.orderNumber || ''}

- Cliente: ${report.client || ''}
- Pieza: ${report.part || ''}
- Motivo: ${report.reason || ''}
- Estado: ${report.status || ''}

Comentario:
${report.comment || 'N/A'}



Saludos,
Eticalidad
`;

    
    const emailTo = this.reportForm.get('clientEmail')?.value || '';
    const mailtoLink = `mailto:${encodeURIComponent(emailTo)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    
    this.exportService.generateClientPDF([report]);

    
    setTimeout(() => {
      window.location.href = mailtoLink;
    }, 500);
  }
}