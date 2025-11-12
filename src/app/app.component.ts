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
    
  }

  toggleLog(state: boolean): void {
    this.isLogOpen = state;
  }

  onClearLog(): void {
    this.logService.clearLog();
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