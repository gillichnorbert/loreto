import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { LogService } from './services/log.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  logs$: Observable<string[]>;
  isLogOpen: boolean = false;
  
  modeLabel: string = '🌙 Modo';
  showSaveFlash: boolean = false;
  private saveFlashTimer: any;

  constructor(private logService: LogService) {
    this.logs$ = this.logService.logs$;
  }
  
  ngOnInit(): void {
    // (Opcionális) Alkalmazzuk a mentett témát induláskor
    if (localStorage.getItem('theme') === 'dark') {
        this.toggleMode(true);
    }
  }

  toggleLog(state: boolean): void {
    this.isLogOpen = state;
  }

  onClearLog(): void {
    this.logService.clearLog();
  }

  toggleMode(forceLight?: boolean): void {
      const doc = document.documentElement;
      let isLight: boolean;

      if (forceLight === true) {
          isLight = true;
      } else {
          isLight = doc.classList.toggle('light-mode');
      }
      
      doc.classList.toggle('light-mode', isLight);
      this.modeLabel = isLight ? '☀️ Claro' : '🌙 Modo';
      localStorage.setItem('theme', isLight ? 'light' : 'dark');
  }
  
  onReportSaved(): void {
    // Ha már fut egy timer, töröljük, hogy újrainduljon
    if (this.saveFlashTimer) {
      clearTimeout(this.saveFlashTimer);
    }
    
    this.showSaveFlash = true;
    
    this.saveFlashTimer = setTimeout(() => {
      this.showSaveFlash = false;
      this.saveFlashTimer = null;
    }, 1000); // Az eredeti 1000ms-es időzítés
  }
}