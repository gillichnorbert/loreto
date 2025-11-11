import { Injectable } from '@angular/core';
import { Report, ReportDto } from './report.model';
import { ReportService } from './report.service';
import { LogService } from './log.service';

// Importáljuk a könyvtárakat
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Ez automatikusan kiterjeszti a jsPDF prototípust

// Az autotable típusának kiterjesztése (typescript trükk)
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(
    private reportService: ReportService,
    private logService: LogService
  ) { }

  // --- 1. CSV EXPORT ---
  public exportToCSV(): void {
    const reports = this.reportService.getReportsSnapshot();
    if (reports.length === 0) {
      this.logService.addLog('Export: no hay reportes (salida omitida)');
      return;
    }
    const headers = ["ID Interno", "Número de pedido", "Cliente / Comprador", "Marca", "Pieza", "Motivo de devolución", "Estado", "Comentario interno", "Fecha"];
    let csv = '\uFEFF' + headers.join(',') + '\n';
    
    reports.forEach(r => {
      const row = [r.id || '', r.orderNumber || '', r.client || '', r.brand || '', r.part || '', r.reason || '', r.status || '', r.comment || '', r.timestamp || ''];
      csv += row.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-IS-8859-1;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'reportes_devolucion.csv';
    a.click();
    this.logService.addLog('Datos exportados a CSV');
  }

  // --- 2. PDF EXPORT ---
  public async generateClientPDF(reportsArray: Report[]) {
    if (!reportsArray || reportsArray.length === 0) {
      alert('No hay reportes para exportar.');
      return;
    }
    
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });

      for (let i = 0; i < reportsArray.length; i++) {
        const r = reportsArray[i];
        if (i > 0) doc.addPage();
        
        // ... (A teljes PDF generáló logika a vanilla JS-ből másolva) ...
        const marginLeft = 40;
        let y = 40;

        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('DEVOLUCIONES GRUPO ETICALIDAD', marginLeft, y);
        // ... (többi doc.text, doc.line, doc.autoTable hívás) ...
        const tableBody = [
            ['ID del reporte', r.id || ''],
            ['Número de pedido', r.orderNumber || ''],
            ['Cliente', r.client || ''],
            ['Marca', r.brand || ''],
            ['Pieza', r.part || ''],
            ['Motivo de devolución', r.reason || ''],
            ['Estado', r.status || ''],
            ['Comentario interno', r.comment || '']
        ];
        doc.autoTable({
            startY: y + 20, // Csak egy példa, igazítsd a vanilla kódhoz
            theme: 'grid',
            head: [['Campo', 'Valor']],
            body: tableBody,
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
            headStyles: { fillColor: [40, 40, 40], textColor: 255, fontStyle: 'bold' },
            columnStyles: { 0: { cellWidth: 160 }, 1: { cellWidth: 330 } }
        });
      }

      const fileName = reportsArray.length === 1 ? `Reporte_${reportsArray[0].id || 'sinID'}.pdf` : `Reportes_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(fileName);
      this.logService.addLog(`Export cliente PDF (${reportsArray.length}): ${fileName}`);
    } catch (err) {
      console.error('PDF generálási hiba', err);
      this.logService.addLog('❌ Error al generar PDF cliente.');
      alert('Error al generar el PDF. Revisa la consola.');
    }
  }

  // --- 3. XLSX/CSV IMPORT ---
  public async importFromFile(file: File): Promise<void> {
    if (!file) return;
    
    try {
      this.logService.addLog(`Inicio importación: ${file.name}`);
      const name = file.name.toLowerCase();
      
      if (name.endsWith('.csv') || name.endsWith('.txt')) {
        const text = await file.text();
        this.parseCSV(text);
      } else {
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
        
        let imported = 0;
        json.forEach(row => {
          const mapped = this.mapRowToReport(row);
          // A saveReport már kezeli az update-et és a create-et is
          this.reportService.saveReport(mapped); 
          imported++;
        });
        this.logService.addLog(`Importación XLSX completada: ${imported} reportes.`);
      }
    } catch (err) {
      console.error('Import error', err);
      this.logService.addLog('❌ Error al importar archivo: revisa formato/datos.');
    }
  }
  
  private parseCSV(text: string): void {
      try {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length <= 0) { this.logService.addLog('CSV vacío (import omitido)'); return; }
        
        const sep = (lines[0].indexOf(';') > -1 && lines[0].indexOf(',') === -1) ? ';' : ',';
        const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
        
        let imported = 0;
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(sep).map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length < 1) continue;
          
          const rowObj: { [key: string]: string } = {};
          headers.forEach((h, idx) => rowObj[h] = cols[idx] || '');
          
          const mapped = this.mapRowToReport(rowObj);
          this.reportService.saveReport(mapped);
          imported++;
        }
        this.logService.addLog(`Importación CSV completada: ${imported} reportes.`);
      } catch (err) {
        console.error('CSV parse error', err);
        this.logService.addLog('❌ Error parseando CSV.');
      }
  }

  // A vanilla JS-ből átemelt segédfüggvény
  private mapRowToReport(row: any): Report {
    const out: ReportDto = {
        id: '', orderNumber: '', client: '', brand: '', part: '', 
        reason: '', status: '', comment: '', timestamp: ''
    };
    function pick(...keys: string[]): string { 
      for (const k of keys) { 
        if (row[k] !== undefined && row[k] !== '') return String(row[k]);
        for (const rk in row) { 
          if (rk.toLowerCase() === String(k).toLowerCase()) return String(row[rk]); 
        } 
      } return ''; 
    }
    
    out.id = String(pick('ID', 'Id', 'id', 'ID Interno', 'id interno', 'internal id') || '').trim();
    out.orderNumber = String(pick('Número de pedido', 'numero de pedido', 'order', 'order number', 'pedido') || '').trim();
    out.client = String(pick('Cliente', 'client', 'Comprador', 'buyer') || '').trim();
    out.brand = String(pick('Marca', 'brand') || '').trim();
    out.part = String(pick('Pieza', 'part', 'Referencia', 'reference') || '').trim();
    out.reason = String(pick('Motivo de devolución', 'motivo', 'reason') || '').trim();
    out.status = String(pick('Estado', 'status') || '').trim();
    out.comment = String(pick('Comentario interno', 'comment', 'notes') || '').trim();
    out.timestamp = String(pick('Fecha', 'fecha', 'timestamp', 'date') || '').trim();
    
    // Ha nincs ID, generálunk egyet
    if (!out.id) {
        out.id = this.reportService.generateID(out.brand);
    }
    if (!out.timestamp) {
        out.timestamp = new Date().toISOString(); // Vagy a nowExcel() formátum
    }

    return out as Report;
  }
}