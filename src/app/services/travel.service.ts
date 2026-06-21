import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TravelSearchResponse } from '../interfaces/travel.interface';

@Injectable({ providedIn: 'root' })
export class TravelService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  search(
    source: string,
    destination: string,
    preference: string,
    commuteType: string
  ): Observable<TravelSearchResponse> {
    return this.http.post<TravelSearchResponse>(
      `${this.apiUrl}/api/travel/search/`,
      {
        source,
        destination,
        preference,
        commute_type: commuteType,
      }
    );
  }
}
