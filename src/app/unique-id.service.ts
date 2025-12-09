import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UniqueIdService {

  constructor() { }

  generateSixDigitId(): string {
    const min = 100000;
    const max = 999999;
    const randomSixDigitNumber = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomSixDigitNumber.toString();
  }
}