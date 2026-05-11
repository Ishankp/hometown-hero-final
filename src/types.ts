export interface GameParticipation {
  year: number;
  season: 'Summer' | 'Winter';
}

export interface Athlete {
  id: string;
  name: string;
  gender: 'Men' | 'Women';
  sport: string;
  subcategories?: string[];
  hometownCity: string;
  hometownState: string;
  lat: number;
  lng: number;
  isParalympian: boolean;
  participations: GameParticipation[];
  medals?: {
    gold: number;
    silver: number;
    bronze: number;
  };
  biography?: string;
  college?: string;
  age?: number;
  imageUrl?: string;
}

export interface MapState {
  selectedState: string | null; // State FIPS or name
  selectedCity: string | null; // City name
  zoomLevel: number;
}
