import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
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
import { RecommendedRoute, RouteSegment } from '../interfaces/travel.interface';
import { Suggestion } from '../interfaces/geo.interface';
import { GeoService } from '../services/geo.service';
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

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  'Cheapest':     { icon: 'payments',             color: '#34d399' },
  'Fastest':      { icon: 'bolt',                 color: '#f87171' },
  'Balanced':     { icon: 'balance',              color: '#60a5fa' },
  'Premium':      { icon: 'workspace_premium',    color: '#fbbf24' },
  'Eco-Friendly': { icon: 'eco',                  color: '#a78bfa' },
  'Budget Comfort': { icon: 'local_offer',        color: '#f472b6' },
};

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MapComponent],
  templateUrl: './travel.component.html',
  styleUrls: ['./travel.component.css'],
})
export class TravelComponent implements OnInit, OnDestroy {
  @ViewChild('srcInput') srcInput!: ElementRef<HTMLInputElement>;
  @ViewChild('dstInput') dstInput!: ElementRef<HTMLInputElement>;

  form: FormGroup;
  viewState: 'home' | 'search' | 'results' = 'home';
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
  sugTarget: 'source' | 'destination' = 'destination';

  geoLoading = false;
  geoError = '';
  srcSearching = false;
  dstSearching = false;
  srcNoResults = false;
  dstNoResults = false;

  bookingSegment: RouteSegment | null = null;
  bookingRoute: RecommendedRoute | null = null;

  private lastSrcQuery = '';
  private lastDstQuery = '';
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

    this.form.get('source')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(val => this.onFieldInput('source', val));

    this.form.get('destination')?.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(val => this.onFieldInput('destination', val));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get pickupDisplay(): string {
    const v = this.form.value.source;
    if (v) return v;
    if (this.geoLoading) return 'Detecting location...';
    return 'Add pickup';
  }

  get destDisplay(): string {
    return this.form.value.destination || 'Where to?';
  }

  getIcon(type: string): string {
    return TRANSPORT_ICONS[type] || 'directions_car';
  }

  getColor(type: string): string {
    return TRANSPORT_COLORS[type] || '#4fc3f7';
  }

  getCategoryMeta(cat: string): { icon: string; color: string } {
    return CATEGORY_META[cat] || { icon: 'local_offer', color: '#818cf8' };
  }

  trackById(_: number, route: RecommendedRoute): number {
    return route.route_id;
  }

  formatDuration(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  /* ─── View state ─── */

  openSearch(field: 'source' | 'destination') {
    this.viewState = 'search';
    this.sugTarget = field;
    setTimeout(() => {
      if (field === 'source') this.srcInput?.nativeElement?.focus();
      else this.dstInput?.nativeElement?.focus();
    }, 200);
  }

  goHome() {
    this.viewState = 'home';
    this.closeSuggestions();
    this.cancelSelectionMode();
  }

  closeSearchOverlay(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('search-overlay')) {
      this.goHome();
    }
  }

  focusField(field: 'source' | 'destination') {
    this.sugTarget = field;
    setTimeout(() => {
      if (field === 'source') this.srcInput?.nativeElement?.focus();
      else this.dstInput?.nativeElement?.focus();
    }, 50);
  }

  /* ─── Geolocation ─── */

  private detectLocation(attempt = 1) {
    this.geoLoading = true;
    const timeout = attempt === 1 ? 10000 : attempt === 2 ? 20000 : 30000;
    this.geoService.getCurrentPosition(timeout).pipe(takeUntil(this.destroy$)).subscribe({
      next: pos => {
        if (pos.accuracy > 300 && attempt < 3) {
          this.detectLocation(attempt + 1);
          return;
        }
        this.pickupCoords = { lat: pos.lat, lng: pos.lng };
        this.geoService.reverseGeocode(pos.lat, pos.lng).pipe(takeUntil(this.destroy$)).subscribe({
          next: addr => {
            this.form.patchValue({ source: addr.address }, { emitEvent: false });
            this.geoLoading = false;
          },
          error: () => {
            this.form.patchValue({ source: 'Bangalore' }, { emitEvent: false });
            this.geoLoading = false;
          },
        });
      },
      error: err => {
        if (attempt < 3) {
          this.detectLocation(attempt + 1);
          return;
        }
        this.geoError = err;
        const fallback = this.geoService.getDefaultLocation();
        this.pickupCoords = { lat: fallback.lat, lng: fallback.lng };
        this.form.patchValue({ source: fallback.address }, { emitEvent: false });
        this.geoLoading = false;
      },
    });
  }

  selectCity(city: string) {
    this.form.patchValue({ city });
    this.showCities = false;
  }

  filterCities(val: string) {
    this.form.patchValue({ city: val });
    this.filteredCities = CITIES.filter(c =>
      c.toLowerCase().includes((val || '').toLowerCase()),
    );
  }

  resetSearch() {
    this.routes = [];
    this.selectedRoute = null;
    this.selectedMessage = '';
    this.error = '';
    this.viewState = 'home';
    this.bookingSegment = null;
    this.bookingRoute = null;
  }

  /* ─── Route Search ─── */

  onSubmit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    this.routes = [];
    this.selectedMessage = '';
    this.selectedRoute = null;
    this.bookingSegment = null;
    this.bookingRoute = null;

    const { source, destination, preference, commute_type } = this.form.value;
    this.travelService.search(source, destination, preference, commute_type).subscribe({
      next: res => {
        this.routes = res.recommended_routes;
        this.loading = false;
        this.viewState = 'results';
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
      const segs = this.selectedRoute.segments;
      const from = segs[0].source;
      const to = segs[segs.length - 1].destination;
      this.selectedMessage = `${this.selectedRoute.category} route selected! ${from} → ${to}`;
    }
  }

  bookSegment(seg: RouteSegment) {
    this.bookingSegment = seg;
    this.bookingRoute = null;
    setTimeout(() => { this.bookingSegment = null; }, 3000);
  }

  bookRoute(route: RecommendedRoute) {
    this.bookingRoute = route;
    this.bookingSegment = null;
    setTimeout(() => { this.bookingRoute = null; }, 3000);
  }

  /* ─── Autocomplete ─── */

  private onFieldInput(field: 'source' | 'destination', value: string) {
    if (this.selectionMode) return;
    const q = (value || '').trim();
    if (q.length < 2) {
      this.closeSuggestions();
      if (field === 'source') { this.srcSearching = false; this.srcNoResults = false; }
      else { this.dstSearching = false; this.dstNoResults = false; }
      return;
    }

    if (field === 'source') {
      if (q === this.lastSrcQuery) return;
      this.lastSrcQuery = q;
      this.srcSearching = true;
      this.srcNoResults = false;
    } else {
      if (q === this.lastDstQuery) return;
      this.lastDstQuery = q;
      this.dstSearching = true;
      this.dstNoResults = false;
    }

    this.sugTarget = field;

    const bias = this.pickupCoords || undefined;
    const city = this.form.value.city;

    this.geoService.autocomplete(q, bias, city).pipe(takeUntil(this.destroy$)).subscribe(s => {
      this.suggestions = s;
      this.showSuggestions = s.length > 0;
      this.suggestionIndex = -1;

      if (field === 'source') {
        this.srcSearching = false;
        this.srcNoResults = s.length === 0;
      } else {
        this.dstSearching = false;
        this.dstNoResults = s.length === 0;
      }
    });
  }

  private resolveAndSelect(s: Suggestion) {
    if (s.placeId && !s.lat) {
      this.geoService.getPlaceDetails(s.placeId).pipe(takeUntil(this.destroy$)).subscribe({
        next: details => {
          const coords = { lat: details.lat, lng: details.lng };
          const display = details.formatted_address || details.name || s.display;
          this.applySelection(coords, display);
        },
        error: () => this.applySelection(null, s.display),
      });
    } else {
      const coords = s.lat ? { lat: s.lat, lng: s.lng } : null;
      this.applySelection(coords, s.address || s.display);
    }
  }

  selectSuggestion(s: Suggestion) {
    this.resolveAndSelect(s);
  }

  private applySelection(coords: { lat: number; lng: number } | null, display: string) {
    if (this.sugTarget === 'source') {
      if (coords) this.pickupCoords = coords;
      this.form.patchValue({ source: display });
      this.lastSrcQuery = '';
      this.srcNoResults = false;
    } else {
      if (coords) this.destCoords = coords;
      this.form.patchValue({ destination: display });
      this.lastDstQuery = '';
      this.dstNoResults = false;
    }
    this.closeSuggestions();
  }

  closeSuggestions() {
    this.showSuggestions = false;
    this.suggestions = [];
    this.suggestionIndex = -1;
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
      this.closeSuggestions();
    }
  }

  getPlaceIcon(s: Suggestion): string {
    return this.geoService.getTypeIcon(s.type);
  }

  /* ─── Map selection ─── */

  onSelectOnMap(type: 'pickup' | 'destination') {
    this.selectionMode = type;
    this.closeSuggestions();
  }

  onMapLocationSelected(point: { lat: number; lng: number; type?: 'pickup' | 'destination' }) {
    const mode = point.type || this.selectionMode || (!this.pickupCoords ? 'pickup' : 'destination');
    this.geoService.reverseGeocode(point.lat, point.lng).pipe(takeUntil(this.destroy$)).subscribe({
      next: addr => {
        if (mode === 'pickup') {
          this.pickupCoords = { lat: point.lat, lng: point.lng };
          this.form.patchValue({ source: addr.address });
        } else {
          this.destCoords = { lat: point.lat, lng: point.lng };
          this.form.patchValue({ destination: addr.address });
        }
        if (this.selectionMode) this.selectionMode = null;
      },
      error: () => {
        const fallback = `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
        if (mode === 'pickup') {
          this.pickupCoords = { lat: point.lat, lng: point.lng };
          this.form.patchValue({ source: fallback });
        } else {
          this.destCoords = { lat: point.lat, lng: point.lng };
          this.form.patchValue({ destination: fallback });
        }
        if (this.selectionMode) this.selectionMode = null;
      },
    });
  }

  cancelSelectionMode() {
    this.selectionMode = null;
  }
}
