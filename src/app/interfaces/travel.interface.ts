export interface TransportOption {
  id: number;
  transport_type: string;
  provider: string;
  estimated_duration: string;
  distance: string;
  estimated_price: number;
  comfort_score: number;
  recommended: boolean;
  ai_reason: string;
}

export interface TravelSearchResponse {
  results: TransportOption[];
}
