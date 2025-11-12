import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-log-panel',
  templateUrl: './log-panel.component.html',
  styleUrls: ['./log-panel.component.css']
})
export class LogPanelComponent {
  @Input() isOpen: boolean = false;
  @Input() logs: string[] | null = []; // A | null az 'async' pipe miatt kell

  @Output() close = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();


  onClose(): void {
    this.close.emit();
  }

  onClear(): void {
    this.clear.emit();
  }
}