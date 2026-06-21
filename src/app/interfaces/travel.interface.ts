export interface RecommendedRoute {
  route_id: number;
  segments: string[];
  total_price: number;
  total_duration: number;
  comfort_score: number;
  recommended: boolean;
  ai_reason: string;
}

export interface TravelSearchResponse {
  recommended_routes: RecommendedRoute[];
}
