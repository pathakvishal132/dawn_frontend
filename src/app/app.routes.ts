import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { TravelComponent } from './travel/travel.component';

export const routes: Routes = [
  { path: '', redirectTo: '/travel', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'travel', component: TravelComponent },
];
