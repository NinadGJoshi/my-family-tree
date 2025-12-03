import { trigger, transition, style, animate } from "@angular/animations";
import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";
import { ContentService } from "../content.service";

@Component({
  selector: 'page-not-found',
  imports: [CommonModule],
  templateUrl: './page-not-found.component.html',
  styleUrl: './page-not-found.component.scss',
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('1s ease-in', style({ opacity: 1 }))
      ]),
    ]),
  ],
})

export class PageNotFoundComponent implements OnInit {
  translations$: Observable<any> = new Observable();

  constructor(
    private router: Router,
    private contentService: ContentService
  ) { }

  ngOnInit(): void {
    // Fetch translations from the service. The service uses the currently selected language.
    this.translations$ = this.contentService.getTranslations();
  }

  gotoHomePage() {
    this.router.navigate(['./home']);
  }
}
