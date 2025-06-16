import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth.guard';
import { HomeComponent } from './home/home.component';
import { HomeRouteExitGuard } from './home-route-exit.guard';
import { FamilyTreeResolver } from './family-tree.resolver';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'home', loadComponent: () => import('./home/home.component').then(m => m.HomeComponent) , canActivate: [AuthGuard], canDeactivate: [HomeRouteExitGuard], resolve: { treeData: FamilyTreeResolver }, pathMatch: 'full' },
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: '**', component: PageNotFoundComponent },
];