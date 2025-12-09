import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { AccordionModule } from 'primeng/accordion';
import { ContentService } from '../content.service';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-instructions',
  imports: [DialogModule, AccordionModule, CardModule, CommonModule],
  templateUrl: './instructions.component.html',
  styleUrls: ['./instructions.component.scss']
})
export class InstructionsComponent implements OnInit {

  @Input() isInstructionVisible!: boolean;

  @Output() dialogCloseEvent = new EventEmitter();

  translations$!: Observable<Record<string, string>>;

  constructor(private contentService: ContentService) {}

  ngOnInit() {
    this.translations$ = this.contentService.getTranslations();
  }

  onDialogClosed() {
    this.dialogCloseEvent.emit();
    this.isInstructionVisible = false;
  }
}
