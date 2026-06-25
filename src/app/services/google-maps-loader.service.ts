import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loaded: Promise<typeof google.maps> | null = null;

  constructor(private http: HttpClient) {}

  load(): Promise<typeof google.maps> {
    if (!this.loaded) {
      this.loaded = (async () => {
        try {
          const config = await firstValueFrom(
            this.http.get<{ googleMapsApiKey: string }>(`${environment.apiUrl}/api/travel/config/`)
          );
          setOptions({
            key: config.googleMapsApiKey,
            v: 'weekly',
            libraries: ['places'],
          });
        } catch (err) {
          console.error('Failed to load Google Maps API key from backend config', err);
          // Set options with empty key to let the loader proceed in developer/fallback mode
          setOptions({
            key: '',
            v: 'weekly',
            libraries: ['places'],
          });
        }
        await importLibrary('maps');
        return google.maps;
      })() as Promise<typeof google.maps>;
    }
    return this.loaded!;
  }
}
