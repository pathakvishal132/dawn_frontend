export interface Suggestion {
  display: string;
  address: string;
  locality: string;
  lat: number;
  lng: number;
  type: string;
  placeId?: string;
}
