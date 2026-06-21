import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { TravelService } from '../services/travel.service';
import { RecommendedRoute } from '../interfaces/travel.interface';

const CITIES = [
  'Koramangala',
  'Whitefield',
  'Indiranagar',
  'Electronic City',
  'HSR Layout',
  'MG Road',
  'Jayanagar',
  'JP Nagar',
  'Banashankari',
  'Majestic',
];

const TRANSPORT_ICONS: Record<string, string> = {
  Metro: 'subway',
  Bus: 'directions_bus',
  Cab: 'local_taxi',
  Auto: 'pedal_bike',
  Bike: 'two_wheeler',
};

const TRANSPORT_COLORS: Record<string, string> = {
  Metro: '#4fc3f7',
  Bus: '#ffb74d',
  Cab: '#81c784',
  Auto: '#ce93d8',
  Bike: '#ef5350',
};

@Component({
  selector: 'app-travel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule],
  templateUrl: './travel.component.html',
  styleUrls: ['./travel.component.css'],
})
export class TravelComponent implements OnInit {
  form: FormGroup;
  routes: RecommendedRoute[] = [];
  loading = false;
  error = '';
  selectedMessage = '';
  selectedRoute: RecommendedRoute | null = null;
  filteredCities: string[] = CITIES;
  showCities = false;

  constructor(
    private fb: FormBuilder,
    private travelService: TravelService
  ) {
    this.form = this.fb.group({
      city: ['Bangalore', Validators.required],
      source: ['', Validators.required],
      destination: ['', Validators.required],
      preference: ['comfortable', Validators.required],
      commute_type: ['multi', Validators.required],
    });
  }

  ngOnInit() {}

  filterCities(val: string) {
    this.form.patchValue({ city: val });
    this.filteredCities = CITIES.filter((c) =>
      c.toLowerCase().includes((val || '').toLowerCase())
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

    const { source, destination, preference, commute_type } =
      this.form.value;
    this.travelService
      .search(source, destination, preference, commute_type)
      .subscribe({
        next: (res) => {
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
}
