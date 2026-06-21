import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
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
