import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { TravelService } from '../services/travel.service';
import { RecommendedRoute } from '../interfaces/travel.interface';
import { GeoService, Suggestion } from './services/geo.service';
import { MapComponent } from './map/map.component';

const CITIES = [
  'Koramangala', 'Whitefield', 'Indiranagar', 'Electronic City',
  'HSR Layout', 'MG Road', 'Jayanagar', 'JP Nagar',
  'Banashankari', 'Majestic',
];

const TRANSPORT_ICONS: Record<string, string> = {
  Metro: 'subway', Bus: 'directions_bus', Cab: 'local_taxi',
  Auto: 'pedal_bike', Bike: 'two_wheeler',
};

const TRANSPORT_COLORS: Record<string, string> = {
  Metro: '#4fc3f7', Bus: '#ffb74d', Cab: '#81c784',
  Auto: '#ce93d8', Bike: '#ef5350',
};

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MapComponent],
  templateUrl: './travel.component.html',
  styleUrls: ['./travel.component.css'],
})
export class TravelComponent implements OnInit, OnDestroy {
  form: FormGroup;
  routes: RecommendedRoute[] = [];
  loading = false;
  error = '';
  selectedMessage = '';
  selectedRoute: RecommendedRoute | null = null;
  filteredCities: string[] = CITIES;
  showCities = false;

  pickupCoords: { lat: number; lng: number } | null = null;
  destCoords: { lat: number; lng: number } | null = null;
  selectionMode: 'pickup' | 'destination' | null = null;
  suggestions: Suggestion[] = [];
  showSuggestions = false;
  suggestionIndex = -1;
  geoLoading = false;
  geoError = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private travelService: TravelService,
    private geoService: GeoService,
  ) {
    this.form = this.fb.group({
      city: ['Bangalore', Validators.required],
      source: ['', Validators.required],
      destination: ['', Validators.required],
      preference: ['comfortable', Validators.required],
      commute_type: ['multi', Validators.required],
    });
  }

  ngOnInit() {
    this.detectLocation();

    this.form.get('destination')?.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(val => this.onDestInput(val));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private detectLocation() {
    this.geoLoading = true;
    this.geoService.getCurrentPosition().pipe(takeUntil(this.destroy$)).subscribe({
      next: pos => {
        this.pickupCoords = pos;
        this.geoService.reverseGeocode(pos.lat, pos.lng).pipe(takeUntil(this.destroy$)).subscribe({
          next: addr => {
            this.form.patchValue({ source: addr }, { emitEvent: false });
            this.geoLoading = false;
          },
          error: () => {
            this.form.patchValue({ source: 'Bangalore' }, { emitEvent: false });
            this.geoLoading = false;
          },
        });
      },
      error: err => {
        this.geoError = err + ' — set pickup manually';
        const fallback = this.geoService.getDefaultLocation();
        this.pickupCoords = { lat: fallback.lat, lng: fallback.lng };
        this.form.patchValue({ source: fallback.address }, { emitEvent: false });
        this.geoLoading = false;
      },
    });
  }

  filterCities(val: string) {
    this.form.patchValue({ city: val });
    this.filteredCities = CITIES.filter(c =>
      c.toLowerCase().includes((val || '').toLowerCase()),
    );
  }

  getIcon(type: string): string {
    return TRANSPORT_ICONS[type] || 'directions_car';
  }

  getColor(type: string): string {
    return TRANSPORT_COLORS[type] || '#4fc3f7';
  }

  trackById(_: number, route: RecommendedRoute): number {
    return route.route_id;
  }

  selectCity(city: string) {
    this.form.patchValue({ city });
    this.showCities = false;
  }

  resetSearch() {
    this.routes = [];
    this.selectedRoute = null;
    this.selectedMessage = '';
    this.error = '';
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.routes = [];
    this.selectedMessage = '';
    this.selectedRoute = null;

    const { source, destination, preference, commute_type } = this.form.value;
    this.travelService.search(source, destination, preference, commute_type).subscribe({
      next: res => {
        this.routes = res.recommended_routes;
        this.loading = false;
      },
      error: () => {
        this.error = 'Failed to fetch routes. Please try again.';
        this.loading = false;
      },
    });
  }

  selectRoute(route: RecommendedRoute) {
    this.selectedRoute = route;
    this.selectedMessage = '';
  }

  confirmRoute() {
    if (this.selectedRoute) {
      this.selectedMessage = `${this.selectedRoute.segments.join(' → ')} selected!`;
    }
  }

  /* ─── Map / Location helpers ─── */

  onSelectOnMap(type: 'pickup' | 'destination') {
    this.selectionMode = type;
    this.showSuggestions = false;
  }

  onMapLocationSelected(point: { lat: number; lng: number }) {
    this.geoService.reverseGeocode(point.lat, point.lng).pipe(takeUntil(this.destroy$)).subscribe({
      next: addr => {
        if (this.selectionMode === 'pickup') {
          this.pickupCoords = point;
          this.form.patchValue({ source: addr });
        } else {
          this.destCoords = point;
          this.form.patchValue({ destination: addr });
          this.showSuggestions = false;
        }
        this.selectionMode = null;
      },
      error: () => {
        const fallback = `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
        if (this.selectionMode === 'pickup') {
          this.pickupCoords = point;
          this.form.patchValue({ source: fallback });
        } else {
          this.destCoords = point;
          this.form.patchValue({ destination: fallback });
        }
        this.selectionMode = null;
      },
    });
  }

  cancelSelectionMode() {
    this.selectionMode = null;
  }

  private onDestInput(val: string) {
    if (this.selectionMode) return;
    if (!val || val.trim().length < 2) {
      this.suggestions = [];
      this.showSuggestions = false;
      return;
    }
    this.geoService.autocomplete(val).pipe(takeUntil(this.destroy$)).subscribe(s => {
      this.suggestions = s;
      this.showSuggestions = s.length > 0;
      this.suggestionIndex = -1;
    });
  }

  selectSuggestion(s: Suggestion) {
    this.destCoords = { lat: s.lat, lng: s.lng };
    this.form.patchValue({ destination: s.display });
    this.showSuggestions = false;
    this.suggestions = [];
  }

  onSuggestionKeydown(event: KeyboardEvent) {
    if (!this.showSuggestions || this.suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.suggestionIndex = Math.min(this.suggestionIndex + 1, this.suggestions.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.suggestionIndex = Math.max(this.suggestionIndex - 1, 0);
    } else if (event.key === 'Enter' && this.suggestionIndex >= 0) {
      event.preventDefault();
      this.selectSuggestion(this.suggestions[this.suggestionIndex]);
    } else if (event.key === 'Escape') {
      this.showSuggestions = false;
    }
  }

  onSourceInput() {
    this.showSuggestions = false;
  }
}
