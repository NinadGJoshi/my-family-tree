import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, tap, lastValueFrom } from 'rxjs';
import { firebaseConfig } from './firebase-init';

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private baseUrl = firebaseConfig.databaseURL + '/locale';
  private cachedTranslations: Record<string, any> = {};

  public selectedLangCode!: string;

  constructor(private http: HttpClient) {
    const defaultLocale: string | null = localStorage.getItem('defaultLocale');
    if (defaultLocale && defaultLocale.length) {
      this.selectedLangCode = defaultLocale;
    } else {
      this.selectedLangCode = 'en';
    }
  }

  getTranslations(): Observable<Record<string, string>> {
    const langCode = this.selectedLangCode;
    // Use cached if available
    if (this.cachedTranslations[langCode]) {
      return of(this.cachedTranslations[langCode]);
    }

    const url = `${this.baseUrl}/${langCode}.json`;

    return this.http.get<Record<string, string>>(url).pipe(
      tap(translations => (this.cachedTranslations[langCode] = translations)),
      catchError(err => {
        console.error(`Failed to load translations for ${langCode}:`, err);
        return of({});
      })
    );
  }

async loadAndCache(langCode: string): Promise<Record<string, string>> {
    const translationsObservable = this.getTranslations();
    const data = await lastValueFrom(translationsObservable); 
    
    if (data && Object.keys(data).length > 0) { 
      this.cachedTranslations[langCode] = data;
      localStorage.setItem(`translations_${langCode}`, JSON.stringify(data));
      return data;
    }
  
    return {}; 
  }

  getFromLocalStorage(langCode: string): Record<string, string> | null {
    const saved = localStorage.getItem(`translations_${langCode}`);
    return saved ? JSON.parse(saved) : null;
  }
}