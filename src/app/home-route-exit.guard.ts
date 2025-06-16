import { Injectable } from '@angular/core';
import { CanDeactivate, Router } from '@angular/router';
import { HomeComponent } from './home/home.component';

@Injectable({ providedIn: 'root' })
export class HomeRouteExitGuard implements CanDeactivate<HomeComponent> {
  constructor() {}

  canDeactivate(_component: HomeComponent): boolean | Promise<boolean> {
    sessionStorage.clear();
    return true;
  }
}