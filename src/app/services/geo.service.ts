import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { GoogleMapsLoaderService } from './google-maps-loader.service';
import { Suggestion } from '../interfaces/geo.interface';

const FALLBACK_AREAS: Suggestion[] = [
  { display: 'Koramangala',     address: 'Koramangala, Bangalore', locality: 'Koramangala', lat: 12.9352, lng: 77.6245, type: 'suburb' },
  { display: 'Whitefield',      address: 'Whitefield, Bangalore', locality: 'Whitefield', lat: 12.9698, lng: 77.7500, type: 'suburb' },
  { display: 'Indiranagar',     address: 'Indiranagar, Bangalore', locality: 'Indiranagar', lat: 12.9719, lng: 77.6412, type: 'suburb' },
  { display: 'Electronic City', address: 'Electronic City, Bangalore', locality: 'Electronic City', lat: 12.8399, lng: 77.6770, type: 'suburb' },
  { display: 'HSR Layout',      address: 'HSR Layout, Bangalore', locality: 'HSR Layout', lat: 12.9116, lng: 77.6389, type: 'suburb' },
  { display: 'MG Road',         address: 'MG Road, Bangalore', locality: 'MG Road', lat: 12.9716, lng: 77.5946, type: 'road' },
  { display: 'Marathahalli',    address: 'Marathahalli, Bangalore', locality: 'Marathahalli', lat: 12.9591, lng: 77.6974, type: 'suburb' },
  { display: 'Jayanagar',       address: 'Jayanagar, Bangalore', locality: 'Jayanagar', lat: 12.9308, lng: 77.5838, type: 'suburb' },
  { display: 'JP Nagar',        address: 'JP Nagar, Bangalore', locality: 'JP Nagar', lat: 12.9063, lng: 77.5857, type: 'suburb' },
  { display: 'Majestic',        address: 'Majestic, Bangalore', locality: 'Majestic', lat: 12.9763, lng: 77.5710, type: 'suburb' },
  { display: 'Prestige Tech Park',       address: 'Prestige Tech Park, Kadubeesanahalli, Bangalore', locality: 'Kadubeesanahalli', lat: 12.9344, lng: 77.6979, type: 'establishment' },
  { display: 'Kempegowda International Airport', address: 'KIA, Devanahalli, Bangalore', locality: 'Devanahalli', lat: 13.1986, lng: 77.7066, type: 'airport' },
  { display: 'MG Road Metro Station',     address: 'MG Road, Ashok Nagar, Bangalore', locality: 'Ashok Nagar', lat: 12.9756, lng: 77.6066, type: 'transit_station' },
  { display: 'Forum Mall',                address: 'Forum Mall, Hosur Road, Koramangala, Bangalore', locality: 'Koramangala', lat: 12.9386, lng: 77.6110, type: 'shopping_mall' },
  { display: 'RMZ Ecospace',              address: 'RMZ Ecospace, Bellandur, Bangalore', locality: 'Bellandur', lat: 12.9267, lng: 77.6763, type: 'establishment' },
  { display: 'Manyata Tech Park',         address: 'Manyata Tech Park, Nagawara, Bangalore', locality: 'Nagawara', lat: 13.0457, lng: 77.6195, type: 'establishment' },
  { display: 'Bagmane Tech Park',         address: 'Bagmane Tech Park, C V Raman Nagar, Bangalore', locality: 'C V Raman Nagar', lat: 12.9845, lng: 77.6620, type: 'establishment' },
  { display: 'MG Road (Commercial Street)', address: 'Commercial Street, Shivaji Nagar, Bangalore', locality: 'Shivaji Nagar', lat: 12.9833, lng: 77.6075, type: 'road' },
  { display: 'Yeshwanthpur Railway Station', address: 'Yeshwanthpur, Bangalore', locality: 'Yeshwanthpur', lat: 12.9900, lng: 77.5450, type: 'train_station' },
  { display: 'KBS (Majestic) Bus Stand',  address: 'Majestic, Bangalore', locality: 'Majestic', lat: 12.9770, lng: 77.5710, type: 'bus_station' },
  { display: 'Commercial Street',         address: 'Commercial Street, Shivaji Nagar, Bangalore', locality: 'Shivaji Nagar', lat: 12.9822, lng: 77.6078, type: 'route' },
  { display: 'Cubbon Park',               address: 'Cubbon Park, Kasturba Road, Bangalore', locality: 'Bangalore', lat: 12.9763, lng: 77.5920, type: 'park' },
  { display: 'Lalbagh Botanical Garden',  address: 'Lalbagh, Mavalli, Bangalore', locality: 'Mavalli', lat: 12.9507, lng: 77.5848, type: 'park' },
  { display: 'Vidhana Soudha',            address: 'Vidhana Soudha, Ambedkar Veedhi, Bangalore', locality: 'Bangalore', lat: 12.9791, lng: 77.5913, type: 'point_of_interest' },
  { display: 'Wonderla Amusement Park',   address: 'Wonderla, Mysore Road, Bangalore', locality: 'Bangalore', lat: 12.8382, lng: 77.4016, type: 'amusement_park' },
  { display: 'Bannerghatta National Park', address: 'Bannerghatta, Bangalore', locality: 'Bannerghatta', lat: 12.8006, lng: 77.5772, type: 'park' },
  { display: 'ISRO Headquarters',         address: 'ISRO HQ, Antariksh Bhavan, New BEL Road, Bangalore', locality: 'Bangalore', lat: 13.0358, lng: 77.5970, type: 'establishment' },
  { display: 'Indian Institute of Science', address: 'IISc, Sir C V Raman Road, Bangalore', locality: 'Bangalore', lat: 13.0218, lng: 77.5673, type: 'university' },
];

const TYPE_ICONS: Record<string, string> = {
  establishment:    'business',
  point_of_interest:'tour',
  airport:          'flight',
  amusement_park:   'toys',
  aquarium:         'water',
  art_gallery:      'palette',
  bank:             'account_balance',
  bar:              'local_bar',
  bus_station:      'directions_bus',
  cafe:             'local_cafe',
  campground:       'camping',
  car_rental:       'directions_car',
  casino:           'casino',
  church:           'church',
  city_hall:        'account_balance',
  clothing_store:   'checkroom',
  convenience_store:'store',
  courthouse:       'gavel',
  dentist:          'medical_services',
  department_store: 'store',
  doctor:           'medical_services',
  drugstore:        'local_pharmacy',
  electronics_store:'devices',
  fire_station:     'local_fire_department',
  florist:          'local_florist',
  furniture_store:  'chair',
  gas_station:      'local_gas_station',
  gym:              'fitness_center',
  hair_care:        'content_cut',
  hardware_store:   'hardware',
  hindu_temple:     'temple_hindu',
  hospital:         'local_hospital',
  jewelry_store:    'diamond',
  laundry:          'local_laundry_service',
  library:          'local_library',
  light_rail_station:'tram',
  liquor_store:     'liquor',
  lodging:          'hotel',
  meal_delivery:    'delivery_dining',
  meal_takeaway:    'takeout_dining',
  mosque:           'mosque',
  movie_theater:    'theaters',
  museum:           'museum',
  night_club:       'nightlife',
  park:             'park',
  parking:          'local_parking',
  pet_store:        'pets',
  pharmacy:         'local_pharmacy',
  police:           'local_police',
  post_office:      'mail',
  restaurant:       'restaurant',
  school:           'school',
  secondary_school: 'school',
  shoe_store:       'shoe',
  shopping_mall:    'shopping_bag',
  spa:              'spa',
  stadium:          'stadium',
  store:            'store',
  subway_station:   'subway',
  supermarket:      'local_grocery_store',
  synagogue:        'location_city',
  taxi_stand:       'local_taxi',
  tourist_attraction:'attractions',
  train_station:    'train',
  transit_station:  'directions_transit',
  travel_agency:    'card_travel',
  university:       'school',
  veterinary_care:  'pets',
  zoo:              'cruelty_free',
  street_address:   'signpost',
  route:            'signpost',
  neighborhood:     'location_city',
  sublocality:      'location_city',
  locality:         'location_city',
  administrative_area_level_1: 'location_city',
  administrative_area_level_2: 'location_city',
  administrative_area_level_3: 'location_city',
  country:          'public',
  postal_code:      'pin_drop',
  plus_code:        'pin_drop',
  colloquial_area:  'location_city',
  natural_feature:  'landscape',
  place:            'location_city',
  suburb:           'location_city',
  road:             'signpost',
  amenity:          'local_offer',
  building:         'business',
  shop:             'shopping_cart',
  tourism:          'tour',
  leisure:          'park',
  highway:          'signpost',
  railway:          'train',
  aeroway:          'flight',
  waterway:         'water',
  natural:          'landscape',
  historic:         'museum',
};

interface CityBounds {
  viewbox: string;
  center: { lat: number; lng: number };
}

const CITY_BOUNDARIES: Record<string, CityBounds> = {
  'Bangalore': {
    viewbox: '77.344,12.834,77.876,13.144',
    center: { lat: 12.9716, lng: 77.5946 },
  },
  'Mumbai': {
    viewbox: '72.775,18.890,72.995,19.280',
    center: { lat: 19.0760, lng: 72.8777 },
  },
  'Delhi': {
    viewbox: '76.830,28.400,77.350,28.880',
    center: { lat: 28.7041, lng: 77.1025 },
  },
  'Hyderabad': {
    viewbox: '78.200,17.240,78.650,17.560',
    center: { lat: 17.3850, lng: 78.4867 },
  },
  'Chennai': {
    viewbox: '80.150,12.850,80.320,13.200',
    center: { lat: 13.0827, lng: 80.2707 },
  },
  'Kolkata': {
    viewbox: '88.260,22.440,88.460,22.660',
    center: { lat: 22.5726, lng: 88.3639 },
  },
  'Pune': {
    viewbox: '73.720,18.430,73.980,18.620',
    center: { lat: 18.5204, lng: 73.8567 },
  },
  'Ahmedabad': {
    viewbox: '72.480,22.940,72.700,23.120',
    center: { lat: 23.0225, lng: 72.5714 },
  },
  'Jaipur': {
    viewbox: '75.720,26.830,75.920,26.980',
    center: { lat: 26.9124, lng: 75.7873 },
  },
  'Lucknow': {
    viewbox: '80.840,26.790,81.040,26.940',
    center: { lat: 26.8467, lng: 80.9462 },
  },
};

@Injectable({ providedIn: 'root' })
export class GeoService {
  private placesDiv: HTMLDivElement | null = null;

  constructor(private mapsLoader: GoogleMapsLoaderService) {}

  private ensurePlacesDiv(): HTMLDivElement {
    if (!this.placesDiv) {
      this.placesDiv = document.createElement('div');
      this.placesDiv.style.display = 'none';
      document.body.appendChild(this.placesDiv);
    }
    return this.placesDiv;
  }

  getCurrentPosition(timeout = 15000): Observable<{ lat: number; lng: number; accuracy: number }> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error('Geolocation not supported');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          observer.next({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          observer.complete();
        },
        err => {
          const msgs: Record<number, string> = {
            1: 'Location permission denied',
            2: 'Location unavailable',
            3: 'Location request timed out',
          };
          observer.error(msgs[err.code] || 'Failed to get location');
        },
        { enableHighAccuracy: true, timeout, maximumAge: 0 },
      );
    });
  }

  reverseGeocode(lat: number, lng: number): Observable<{ display: string; address: string }> {
    return from(this.mapsLoader.load()).pipe(
      switchMap(gmaps => {
        const geocoder = new gmaps.Geocoder();
        return new Observable<{ display: string; address: string }>(observer => {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              const r = results[0];
              const display = this.extractShortName(r);
              const address = r.formatted_address || display;
              observer.next({ display, address });
            } else {
              observer.next({ display: 'Bangalore', address: 'Bangalore' });
            }
            observer.complete();
          });
        });
      }),
      catchError(() => of({ display: 'Bangalore', address: 'Bangalore' })),
    );
  }

  autocomplete(
    query: string,
    biasLocation?: { lat: number; lng: number } | null,
    city?: string | null,
  ): Observable<Suggestion[]> {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return of([]);

    const bias = biasLocation || CITY_BOUNDARIES[city || '']?.center || null;

    return from(this.mapsLoader.load()).pipe(
      switchMap(gmaps => {
        const service = new gmaps.places.AutocompleteService();
        const request: google.maps.places.AutocompletionRequest = {
          input: query,
          componentRestrictions: { country: 'IN' },
        };
        if (bias) {
          request.locationBias = {
            center: { lat: bias.lat, lng: bias.lng },
            radius: 50000,
          };
        }
        return new Observable<Suggestion[]>(observer => {
          service.getPlacePredictions(request, (results, status) => {
            if (status === 'OK' && results?.length) {
              observer.next(results.map(p => ({
                placeId: p.place_id,
                display: p.structured_formatting?.main_text || p.description.split(',')[0].trim(),
                address: p.description,
                locality: p.structured_formatting?.secondary_text || '',
                lat: 0,
                lng: 0,
                type: p.types?.[0] || 'establishment',
              })));
            } else {
              this.geocodeAutocomplete(query, bias).subscribe({
                next: observer.next.bind(observer),
                error: () => observer.next(this.getFallbackResults(q, bias)),
              });
            }
            observer.complete();
          });
        });
      }),
      catchError(() => of(this.getFallbackResults(q, bias))),
    );
  }

  private geocodeAutocomplete(
    query: string,
    bias: { lat: number; lng: number } | null,
  ): Observable<Suggestion[]> {
    return from(this.mapsLoader.load()).pipe(
      switchMap(gmaps => {
        const geocoder = new gmaps.Geocoder();
        const params: google.maps.GeocoderRequest = { address: query, region: 'IN' };
        if (bias) {
          params.location = new gmaps.LatLng(bias.lat, bias.lng);
          params.bounds = new gmaps.Circle({
            center: params.location,
            radius: 50000,
          }).getBounds()!;
        }
        return new Observable<Suggestion[]>(observer => {
          geocoder.geocode(params, (results, status) => {
            if (status === 'OK' && results?.length) {
              const suggestions = results.slice(0, 5).map(r => ({
                placeId: r.place_id || '',
                display: this.extractShortName(r),
                address: r.formatted_address || '',
                locality: this.extractLocality(r),
                lat: r.geometry.location.lat(),
                lng: r.geometry.location.lng(),
                type: this.resolveType(r.types),
              }));
              observer.next(suggestions);
            } else {
              observer.next([]);
            }
            observer.complete();
          });
        });
      }),
      catchError(() => of([])),
    );
  }

  private extractLocality(r: google.maps.GeocoderResult): string {
    const comps = r.address_components || [];
    const sub = comps.find(c => c.types.includes('sublocality_level_1') || c.types.includes('sublocality') || c.types.includes('neighborhood'));
    return sub?.long_name || comps.find(c => c.types.includes('locality'))?.long_name || '';
  }

  private resolveType(types: string[]): string {
    const priority = [
      'premise', 'street_address', 'route', 'establishment', 'point_of_interest',
      'sublocality', 'neighborhood', 'locality', 'administrative_area_level_1',
    ];
    for (const t of priority) {
      if (types.includes(t)) return t;
    }
    return types[0] || 'place';
  }

  getPlaceDetails(
    placeId: string,
  ): Observable<{ lat: number; lng: number; formatted_address: string; name: string }> {
    return from(this.mapsLoader.load()).pipe(
      switchMap(gmaps => {
        const service = new gmaps.places.PlacesService(this.ensurePlacesDiv());
        return new Observable<any>(observer => {
          service.getDetails(
            { placeId, fields: ['name', 'formatted_address', 'geometry', 'types'] },
            (result, status) => {
              if (status === 'OK' && result) {
                observer.next({
                  lat: result.geometry?.location?.lat() || 0,
                  lng: result.geometry?.location?.lng() || 0,
                  formatted_address: result.formatted_address || '',
                  name: result.name || '',
                  types: result.types || [],
                });
              } else {
                observer.error('Failed to get place details');
              }
              observer.complete();
            },
          );
        });
      }),
    );
  }

  private extractShortName(result: google.maps.GeocoderResult): string {
    const types = result.types;
    const comps = result.address_components || [];

    const byPriority = (priorities: string[]): string | null => {
      for (const t of priorities) {
        const c = comps.find(x => x.types.includes(t));
        if (c) return c.long_name;
      }
      return null;
    };

    const specific = byPriority(['premise', 'point_of_interest', 'establishment', 'subpremise']);
    if (specific) return specific;

    if (types.includes('street_address') || types.includes('route')) {
      const road = comps.find(c => c.types.includes('route'));
      const num = comps.find(c => c.types.includes('street_number'));
      if (road) return num ? `${num.long_name} ${road.long_name}` : road.long_name;
    }

    const area = byPriority(['sublocality_level_1', 'sublocality', 'neighborhood']);
    if (area) return area;

    const city = byPriority(['locality']);
    if (city) return city;

    const state = byPriority(['administrative_area_level_1']);
    if (state) return state;

    return comps[0]?.long_name || result.formatted_address?.split(',')[0]?.trim() || 'Bangalore';
  }

  private getFallbackResults(query: string, bias: { lat: number; lng: number } | null): Suggestion[] {
    const q = query.toLowerCase();
    let results = FALLBACK_AREAS.filter(a =>
      a.display.toLowerCase().includes(q) || a.address.toLowerCase().includes(q),
    );

    if (bias) {
      results.sort((a, b) => {
        const da = Math.pow(a.lat - bias.lat, 2) + Math.pow(a.lng - bias.lng, 2);
        const db = Math.pow(b.lat - bias.lat, 2) + Math.pow(b.lng - bias.lng, 2);
        return da - db;
      });
    }

    return results.slice(0, 6);
  }

  getTypeIcon(type: string): string {
    return TYPE_ICONS[type] || 'location_on';
  }

  getDefaultLocation(): { lat: number; lng: number; address: string } {
    return { lat: 12.9716, lng: 77.5946, address: 'MG Road, Bangalore' };
  }
}
