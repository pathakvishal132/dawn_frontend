import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TravelService } from '../services/travel.service';
import { TransportOption } from '../interfaces/travel.interface';

const CITIES = [
  'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

const TRANSPORT_ICONS: Record<string, string> = {
  'Metro': 'subway',
  'Bus': 'directions_bus',
  'Cab': 'local_taxi',
  'Auto Rickshaw': 'pedal_bike',
  'Bike Taxi': 'two_wheeler',
  'Walking': 'directions_walk',
};

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
  ],
  template: `
    <div class="uber">
      <div class="map-section">
        <div class="map-grid"></div>
        <div class="top-bar">
          <span class="logo">CityRide</span>
          <div class="city-picker" (click)="showCities = !showCities">
            <mat-icon>location_on</mat-icon>
            <span>{{ form.value.city || 'City' }}</span>
            <mat-icon>expand_more</mat-icon>
          </div>
        </div>
        <div class="city-dropdown" *ngIf="showCities">
          <div class="city-option" *ngFor="let c of filteredCities" (click)="selectCity(c)">
            <mat-icon>location_city</mat-icon>
            <span>{{ c }}</span>
          </div>
        </div>
      </div>

      <div class="bottom-panel" [class.has-results]="results.length > 0">
        <ng-container *ngIf="results.length === 0">
          <div class="where-title" *ngIf="!form.value.source && !form.value.destination">Where to?</div>

          <form class="search-form" [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="loc-group">
              <div class="loc-row">
                <div class="dot-bar">
                  <span class="dot pickup"></span>
                  <span class="connector"></span>
                  <span class="dot drop"></span>
                </div>
                <div class="loc-inputs">
                  <input class="loc-input pickup-input" formControlName="source" placeholder="Pickup location" />
                  <input class="loc-input drop-input" formControlName="destination" placeholder="Where to?" />
                </div>
              </div>
            </div>

            <div class="pref-row">
              <button type="button" class="pref-btn" [class.active]="form.value.preference === 'cheapest'" (click)="form.patchValue({preference: 'cheapest'})">Cheapest</button>
              <button type="button" class="pref-btn" [class.active]="form.value.preference === 'comfortable'" (click)="form.patchValue({preference: 'comfortable'})">Comfortable</button>
            </div>

            <button class="go-btn" type="submit" [disabled]="form.invalid || loading">
              <mat-icon *ngIf="!loading">search</mat-icon>
              <span *ngIf="!loading">Search</span>
              <span *ngIf="loading">Searching...</span>
            </button>
          </form>
        </ng-container>

        <ng-container *ngIf="results.length > 0">
          <div class="results-header">
            <button class="back-btn" (click)="resetSearch()"><mat-icon>arrow_back</mat-icon></button>
            <span>{{ results.length }} route{{ results.length > 1 ? 's' : '' }} found</span>
          </div>

          <div class="results-list">
            <div *ngFor="let opt of results; trackBy: trackById" class="ride-card" [class.recommended]="opt.recommended" [class.selected]="selectedRoute?.id === opt.id" (click)="selectRoute(opt)">
              <div class="ride-left">
                <div class="ride-icon" [style.background]="getColor(opt.transport_type) + '20'" [style.color]="getColor(opt.transport_type)">
                  <mat-icon>{{ getIcon(opt.transport_type) }}</mat-icon>
                </div>
              </div>
              <div class="ride-mid">
                <div class="ride-name">{{ opt.transport_type }}</div>
                <div class="ride-detail">{{ opt.provider }} &bull; {{ opt.estimated_duration }}</div>
                <div class="ride-stats">
                  <span>{{ opt.distance }}</span>
                  <span *ngIf="opt.comfort_score">&star; {{ opt.comfort_score }}/10</span>
                </div>
              </div>
              <div class="ride-right">
                <div class="ride-price">&#8377;{{ opt.estimated_price }}</div>
              </div>
              <div class="ride-badge" *ngIf="opt.recommended">
                <mat-icon>auto_awesome</mat-icon> AI pick
              </div>
            </div>
          </div>

          <div class="confirm-bar" *ngIf="selectedRoute && !selectedMessage">
            <div class="confirm-info">
              <mat-icon [style.color]="getColor(selectedRoute.transport_type)">{{ getIcon(selectedRoute.transport_type) }}</mat-icon>
              <span>{{ selectedRoute.transport_type }} &bull; &#8377;{{ selectedRoute.estimated_price }}</span>
            </div>
            <button class="confirm-btn" (click)="confirmRoute()">Select</button>
          </div>

          <div class="confirmed" *ngIf="selectedMessage">
            <mat-icon>check_circle</mat-icon> {{ selectedMessage }}
          </div>
        </ng-container>

        <div class="error" *ngIf="error">{{ error }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }
    .uber { height: 100%; display: flex; flex-direction: column; background: #000; position: relative; }

    .map-section { flex: 1; background: #0a0a0a; position: relative; overflow: hidden; min-height: 0; }
    .map-grid { position: absolute; inset: 0; background-image: radial-gradient(circle, #1a1a1a 1px, transparent 1px); background-size: 24px 24px; }

    .top-bar { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; }
    .logo { font-size: 1.1rem; font-weight: 500; color: #fff; letter-spacing: 0.5px; }
    .city-picker { display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.08); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); padding: 8px 14px; border-radius: 24px; cursor: pointer; font-size: 0.85rem; color: #fff; border: 1px solid rgba(255,255,255,0.08); transition: 0.2s; }
    .city-picker:hover { background: rgba(255,255,255,0.12); }
    .city-picker mat-icon { font-size: 18px; width: 18px; height: 18px; color: #4fc3f7; }

    .city-dropdown { position: absolute; top: 70px; right: 20px; z-index: 20; background: #1a1a1a; border: 1px solid #333; border-radius: 14px; overflow: hidden; min-width: 200px; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
    .city-option { display: flex; align-items: center; gap: 10px; padding: 13px 18px; cursor: pointer; color: #ccc; font-size: 0.9rem; transition: 0.15s; }
    .city-option:hover { background: #2a2a2a; color: #fff; }
    .city-option mat-icon { font-size: 18px; width: 18px; height: 18px; color: #555; }

    .bottom-panel { background: #111; border-radius: 20px 20px 0 0; padding: 20px 20px 32px; max-height: 55%; overflow-y: auto; border-top: 1px solid #222; }
    .bottom-panel.has-results { max-height: 78%; }

    .where-title { font-size: 1.6rem; font-weight: 500; color: #fff; margin-bottom: 16px; }

    .search-form { display: flex; flex-direction: column; gap: 16px; }

    .loc-group { background: #1a1a1a; border-radius: 16px; padding: 4px 16px; border: 1px solid #2a2a2a; }
    .loc-row { display: flex; gap: 14px; align-items: stretch; }
    .dot-bar { display: flex; flex-direction: column; align-items: center; padding: 16px 0; gap: 2px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .dot.pickup { background: #4fc3f7; }
    .dot.drop { background: #ef5350; }
    .connector { width: 2px; flex: 1; min-height: 28px; background: rgba(255,255,255,0.12); }
    .loc-inputs { flex: 1; display: flex; flex-direction: column; }
    .loc-input { background: none; border: none; color: #fff; font-size: 0.95rem; padding: 16px 0; outline: none; width: 100%; font-family: inherit; }
    .loc-input::placeholder { color: rgba(255,255,255,0.3); }
    .pickup-input { border-bottom: 1px solid rgba(255,255,255,0.06); }
    .drop-input { border-bottom: none; }

    .pref-row { display: flex; gap: 10px; }
    .pref-btn { flex: 1; padding: 13px; border-radius: 12px; border: 1px solid #333; background: transparent; color: rgba(255,255,255,0.5); font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: 0.2s; font-family: inherit; }
    .pref-btn.active { background: rgba(79, 195, 247, 0.1); border-color: rgba(79, 195, 247, 0.4); color: #4fc3f7; }
    .pref-btn:hover { border-color: #555; }

    .go-btn { padding: 16px; border-radius: 14px; border: none; background: #4fc3f7; color: #000; font-size: 1rem; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .go-btn:disabled { opacity: 0.25; cursor: default; }
    .go-btn:hover:not(:disabled) { background: #3aa8e0; }

    .results-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; font-size: 0.95rem; color: rgba(255,255,255,0.6); }
    .back-btn { background: none; border: none; color: #fff; cursor: pointer; padding: 4px; display: flex; align-items: center; }
    .results-list { display: flex; flex-direction: column; gap: 10px; }

    .ride-card { display: flex; align-items: center; gap: 14px; background: #1a1a1a; border-radius: 16px; padding: 14px 16px; border: 1px solid #2a2a2a; cursor: pointer; transition: 0.15s; position: relative; }
    .ride-card:hover { border-color: #444; }
    .ride-card.recommended { border-color: rgba(79, 195, 247, 0.25); background: linear-gradient(135deg, #1a2332, #0d2137); }
    .ride-card.selected { border-color: #4fc3f7; background: rgba(79, 195, 247, 0.06); }

    .ride-left { flex-shrink: 0; }
    .ride-icon { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .ride-icon mat-icon { font-size: 24px; width: 24px; height: 24px; }

    .ride-mid { flex: 1; min-width: 0; }
    .ride-name { font-size: 1rem; font-weight: 500; color: #fff; }
    .ride-detail { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-top: 2px; }
    .ride-stats { display: flex; gap: 12px; font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-top: 3px; }

    .ride-right { text-align: right; flex-shrink: 0; }
    .ride-price { font-size: 1.2rem; font-weight: 700; color: #fff; }

    .ride-badge { position: absolute; top: -6px; right: -6px; background: rgba(79, 195, 247, 0.15); color: #4fc3f7; font-size: 0.65rem; padding: 2px 8px; border-radius: 12px; display: flex; align-items: center; gap: 3px; font-weight: 500; backdrop-filter: blur(4px); }
    .ride-badge mat-icon { font-size: 12px; width: 12px; height: 12px; }

    .confirm-bar { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding: 14px 18px; background: #1a1a1a; border-radius: 14px; border: 1px solid #333; }
    .confirm-info { display: flex; align-items: center; gap: 10px; color: #fff; font-size: 0.9rem; font-weight: 500; }
    .confirm-info mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .confirm-btn { padding: 10px 24px; border-radius: 12px; border: none; background: #4fc3f7; color: #000; font-weight: 600; font-size: 0.85rem; cursor: pointer; font-family: inherit; transition: 0.2s; }
    .confirm-btn:hover { background: #3aa8e0; }

    .confirmed { display: flex; align-items: center; gap: 8px; margin-top: 14px; padding: 14px 18px; background: rgba(76, 175, 80, 0.1); border-radius: 14px; color: #81c784; font-size: 0.9rem; border: 1px solid rgba(76, 175, 80, 0.2); }
    .confirmed mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .error { margin-top: 12px; padding: 12px 16px; background: rgba(198, 40, 40, 0.12); border-radius: 12px; color: #ef5350; font-size: 0.85rem; text-align: center; border: 1px solid rgba(198, 40, 40, 0.15); }

    @media (max-width: 600px) {
      .bottom-panel { padding: 16px 16px 24px; max-height: 50%; }
      .bottom-panel.has-results { max-height: 75%; }
      .where-title { font-size: 1.3rem; }
      .ride-card { padding: 12px 14px; }
      .ride-icon { width: 44px; height: 44px; }
      .ride-icon mat-icon { font-size: 20px; width: 20px; height: 20px; }
    }
  `]
})
export class TravelComponent implements OnInit {
  form: FormGroup;
  results: TransportOption[] = [];
  loading = false;
  error = '';
  selectedMessage = '';
  selectedRoute: TransportOption | null = null;
  filteredCities: string[] = CITIES;
  showCities = false;

  private readonly TRANSPORT_COLORS: Record<string, string> = {
    'Metro': '#4fc3f7',
    'Bus': '#ffb74d',
    'Cab': '#81c784',
    'Auto Rickshaw': '#ce93d8',
    'Bike Taxi': '#ef5350',
    'Walking': '#90a4ae',
  };

  constructor(private fb: FormBuilder, private travelService: TravelService) {
    this.form = this.fb.group({
      city: ['Bangalore', Validators.required],
      source: ['', Validators.required],
      destination: ['', Validators.required],
      preference: ['comfortable', Validators.required],
    });
  }

  ngOnInit() {
    this.form.get('city')?.valueChanges.subscribe(val => {
      this.filteredCities = CITIES.filter(c =>
        c.toLowerCase().includes((val || '').toLowerCase())
      );
    });
  }

  getIcon(type: string): string {
    return TRANSPORT_ICONS[type] || 'directions_car';
  }

  getColor(type: string): string {
    return this.TRANSPORT_COLORS[type] || '#4fc3f7';
  }

  trackById(_: number, opt: TransportOption): number {
    return opt.id;
  }

  selectCity(city: string) {
    this.form.patchValue({ city });
    this.showCities = false;
  }

  resetSearch() {
    this.results = [];
    this.selectedRoute = null;
    this.selectedMessage = '';
    this.error = '';
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.results = [];
    this.selectedMessage = '';
    this.selectedRoute = null;
    const { source, destination, preference } = this.form.value;
    this.travelService.search(source, destination, preference).subscribe({
      next: (res) => {
        this.results = res.results;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to fetch routes. Please try again.';
        this.loading = false;
      },
    });
  }

  selectRoute(opt: TransportOption) {
    this.selectedRoute = opt;
    this.selectedMessage = '';
  }

  confirmRoute() {
    if (this.selectedRoute) {
      this.selectedMessage = `${this.selectedRoute.transport_type} via ${this.selectedRoute.provider} selected!`;
    }
  }
}
