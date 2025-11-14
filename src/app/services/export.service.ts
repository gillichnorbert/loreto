import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { Report, ReportDto } from './report.model';
import { ReportService } from './report.service';
import { LogService } from './log.service';

import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = (pdfFonts as any).vfs || (pdfFonts as any).pdfMake?.vfs;

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(
    private reportService: ReportService,
    private logService: LogService
  ) { }

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

public async generateClientPDF(reportsArray: Report[]) {
  if (!reportsArray || reportsArray.length === 0) {
    alert('Nincs elérhető riport az exportáláshoz.');
    return;
  }

  try {
    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [],
      styles: {
        header: {
          fontSize: 20,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        subheader: {
          fontSize: 11,
          color: '#555',
          alignment: 'center',
          margin: [0, 0, 0, 20]
        },
        tableHeader: {
          bold: true,
          fillColor: '#000000',
          color: '#ffffff'
        },
        reportTable: {
          margin: [0, 15, 0, 15]
        },
        footer: {
          fontSize: 9,
          italics: true,
          color: '#666',
          alignment: 'center',
          margin: [0, 30, 0, 0]
        },
        signature: {
          margin: [0, 40, 0, 0],
          alignment: 'left'
        }
      }
    };

    for (let i = 0; i < reportsArray.length; i++) {
      const r = reportsArray[i];

      // Fejléc + dátum
      docDefinition.content.push(
        { text: 'DEVOLUCIONES GRUPO ETICALIDAD', style: 'header' },
        { text: `Fecha: ${new Date().toLocaleString()}`, style: 'subheader' }
      );

      // Táblázat adatok
      const tableBody = [
        [
          { text: 'Campo', style: 'tableHeader' },
          { text: 'Valor', style: 'tableHeader' }
        ],
        ['ID del reporte', r.id || ''],
        ['Número de pedido', r.orderNumber || ''],
        ['Cliente', r.client || ''],
        ['Marca', r.brand || ''],
        ['Pieza', r.part || ''],
        ['Motivo de devolución', r.reason || ''],
        ['Estado', r.status || ''],
        ['Comentario interno', r.comment || '']
      ];

      // Táblázat megjelenés
      docDefinition.content.push({
        style: 'reportTable',
        table: {
          headerRows: 1,
          widths: ['30%', '70%'],
          body: tableBody
        },
        layout: {
          fillColor: function (rowIndex: number) {
            return rowIndex % 2 === 0 ? null : '#f9f9f9';
          },
          hLineColor: '#ccc',
          vLineColor: '#ccc',
          hLineWidth: function (i: number, node: any) {
            return (i === 0 || i === node.table.body.length) ? 1 : 0.5;
          },
          vLineWidth: function () { return 0.5; }
        }
      });

      // Aláírás + vonal
      docDefinition.content.push({
        columns: [
          {
            width: '50%',
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1 }] },
              { text: 'Firma del cliente / representante', margin: [0, 5, 0, 0] }
            ],
            margin: [0, 40, 0, 0]
          },
          { width: '50%', text: '' }
        ]
      });

      // Lábléc
      docDefinition.content.push({
        text:
          'Documento generado automáticamente por el sistema interno de Grupo Eticalidad.\nProhibida su modificación o distribución sin autorización.',
        style: 'footer'
      });

      if (i < reportsArray.length - 1) {
        docDefinition.content.push({ text: '', pageBreak: 'after' });
      }
    }

    const fileName =
      reportsArray.length === 1
        ? `Reporte_${reportsArray[0].id || 'sinID'}.pdf`
        : `Reportes_${new Date().toISOString().slice(0, 10)}.pdf`;

    (pdfMake as any).createPdf(docDefinition).download(fileName);

    this.logService.addLog(`Export cliente PDF (${reportsArray.length}): ${fileName}`);
  } catch (err) {
    console.error('PDF generálási hiba (pdfmake)', err);
    this.logService.addLog('❌ Error al generar PDF cliente (pdfmake).');
    alert('Error al generar el PDF. Revisa la consola.');
  }
}



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
    
    if (!out.id) {
        out.id = this.reportService.generateID(out.brand);
    }
    if (!out.timestamp) {
        out.timestamp = new Date().toISOString();
    }

    return out as Report;
  }
}