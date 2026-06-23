import { Injectable } from '@angular/core';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleMapsLoaderService {
  private loaded: Promise<typeof google.maps> | null = null;

  constructor() {
    setOptions({
      key: environment.googleMapsApiKey,
      v: 'weekly',
      libraries: ['places'],
    });
  }

  load(): Promise<typeof google.maps> {
    if (!this.loaded) {
      this.loaded = importLibrary('maps').then(() => google.maps);
    }
    return this.loaded!;
  }
}
