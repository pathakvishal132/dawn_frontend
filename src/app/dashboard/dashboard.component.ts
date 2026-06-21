import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <h1>Dashboard</h1>
      <p *ngIf="loading">Loading...</p>
      <p *ngIf="error" class="error">{{ error }}</p>
      <p *ngIf="message" class="message">{{ message }}</p>
    </div>
  `,
  styles: [`
    .dashboard { padding: 2rem; text-align: center; }
    .message { color: #22c55e; font-size: 1.5rem; font-weight: 600; }
    .error { color: #ef4444; }
  `]
})
export class DashboardComponent implements OnInit {
  message: string | null = null;
  error: string | null = null;
  loading = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getHello().subscribe({
      next: (res) => {
        this.message = res;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to connect to backend';
        this.loading = false;
      }
    });
  }
}
