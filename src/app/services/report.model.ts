// Definiáljuk a Report típusát
export interface Report {
  id: string;
  orderNumber: string;
  client: string;
  brand: string;
  part: string;
  reason: string;
  status: string;
  comment: string;
  timestamp: string;
}

// Egy segéd DTO (Data Transfer Object) a generáláshoz, ahol az ID még nem kötelező
export type ReportDto = Omit<Report, 'id' | 'timestamp'> & { id?: string, timestamp?: string };