export interface RouteSegment {
  source: string;
  destination: string;
  source_coords: { lat: number; lon: number };
  dest_coords: { lat: number; lon: number };
  transport_mode: string;
  provider: string;
  duration: number;
  fare: number;
  distance: number;
  comfort_score: number;
}

export interface RecommendedRoute {
  route_id: number;
  category: string;
  segments: RouteSegment[];
  total_fare: number;
  total_price: number;
  total_duration: number;
  total_distance: number;
  comfort_score: number;
  recommended: boolean;
  ai_reason: string;
}

export interface TravelSearchResponse {
  recommended_routes: RecommendedRoute[];
  source_coords: { lat: number; lon: number };
  destination_coords: { lat: number; lon: number };
}
