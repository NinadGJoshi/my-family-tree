import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, tap } from 'rxjs';
import { firebaseProdConfig } from './config/firebase-prod.config';

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private baseUrl = firebaseProdConfig.databaseURL + '/locale';
  private cachedTranslations: Record<string, any> = {};
  public selectedLangCode: string = 'en';

  constructor(private http: HttpClient) {}

  /**
   * Fetch translations dynamically from Firebase
   * @param langCode 'en' or 'hn'
   */
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

  /**
   * Optionally store the fetched translations
   */
  async loadAndCache(langCode: string): Promise<Record<string, string>> {
    const data = await this.getTranslations().toPromise();
    if (data) {
      this.cachedTranslations[langCode] = data;
      localStorage.setItem(`translations_${langCode}`, JSON.stringify(data));
    }
    return data || {};
  }

  /**
   * Try to load from localStorage (offline)
   */
  getFromLocalStorage(langCode: string): Record<string, string> | null {
    const saved = localStorage.getItem(`translations_${langCode}`);
    return saved ? JSON.parse(saved) : null;
  }
}
