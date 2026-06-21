import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, timeout } from 'rxjs/operators';

export interface Suggestion {
  display: string;
  lat: number;
  lng: number;
}

const AREA_COORDS: Record<string, { lat: number; lng: number }> = {
  'Koramangala':     { lat: 12.9352, lng: 77.6245 },
  'Whitefield':      { lat: 12.9698, lng: 77.7500 },
  'Indiranagar':     { lat: 12.9719, lng: 77.6412 },
  'Electronic City': { lat: 12.8399, lng: 77.6770 },
  'HSR Layout':      { lat: 12.9116, lng: 77.6389 },
  'MG Road':         { lat: 12.9716, lng: 77.5946 },
  'Jayanagar':       { lat: 12.9308, lng: 77.5838 },
  'JP Nagar':        { lat: 12.9063, lng: 77.5857 },
  'Banashankari':    { lat: 12.9228, lng: 77.5468 },
  'Majestic':        { lat: 12.9763, lng: 77.5710 },
  'Marathahalli':    { lat: 12.9591, lng: 77.6974 },
  'Hebbal':          { lat: 13.0358, lng: 77.5970 },
  'Yelahanka':       { lat: 13.1007, lng: 77.5963 },
  'BTM Layout':      { lat: 12.9166, lng: 77.6101 },
  'Basavanagudi':    { lat: 12.9418, lng: 77.5712 },
  'Malleshwaram':    { lat: 12.9932, lng: 77.5712 },
  'Sadashivanagar':  { lat: 12.9975, lng: 77.5802 },
  'Rajajinagar':     { lat: 12.9900, lng: 77.5527 },
  'Vijayanagar':     { lat: 12.9700, lng: 77.5330 },
  'Peenya':          { lat: 13.0296, lng: 77.5266 },
};

const AREAS = Object.keys(AREA_COORDS);

@Injectable({ providedIn: 'root' })
export class GeoService {
  constructor(private http: HttpClient) {}

  getCurrentPosition(): Observable<{ lat: number; lng: number }> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error('Geolocation not supported');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        pos => {
          observer.next({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    });
  }

  reverseGeocode(lat: number, lng: number): Observable<string> {
    return this.http
      .get<any>(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, {
        headers: { 'Accept-Language': 'en' },
      })
      .pipe(
        timeout(5000),
        map(res => {
          const addr = res.address;
          const parts: string[] = [];
          if (addr.road) parts.push(addr.road);
          if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
          if (!parts.length && (addr.city || addr.town || addr.village)) parts.push(addr.city || addr.town || addr.village);
          return parts.join(', ') || 'Bangalore';
        }),
      );
  }

  autocomplete(query: string): Observable<Suggestion[]> {
    const q = query.toLowerCase().trim();
    if (q.length < 2) return of([]);
    const results: Suggestion[] = [];
    for (const area of AREAS) {
      if (area.toLowerCase().includes(q)) {
        const c = AREA_COORDS[area];
        results.push({ display: `${area}, Bangalore`, lat: c.lat, lng: c.lng });
      }
    }
    return of(results.slice(0, 6));
  }

  getDefaultLocation(): { lat: number; lng: number; address: string } {
    return { lat: 12.9716, lng: 77.5946, address: 'MG Road, Bangalore' };
  }
}
