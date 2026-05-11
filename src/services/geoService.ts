
/**
 * Service for fetching geographic and climate data.
 * Uses Open-Meteo for historical weather data.
 */

export interface ClimateData {
  avgTemp: number;
  maxTemp: number;
  minTemp: number;
  precipitation: number;
}

export interface ElevationData {
  min: number;
  max: number;
  avg: number;
}

export async function fetchClimateMetrics(lat: number, lng: number, year: number): Promise<ClimateData> {
  try {
    // Open-Meteo Historical API (No key required for small/medium usage)
    // We fetch a range to get "averages" or specific year data
    const response = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${year}-01-01&end_date=${year}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`
    );

    if (!response.ok) throw new Error('Weather API unresponsive');
    
    const data = await response.json();
    
    // Simple averaging logic for the demo
    const temps = data.daily.temperature_2m_max;
    const avgTemp = temps.reduce((a: number, b: number) => a + b, 0) / temps.length;
    
    return {
      avgTemp: Math.round(avgTemp),
      maxTemp: Math.round(Math.max(...data.daily.temperature_2m_max)),
      minTemp: Math.round(Math.min(...data.daily.temperature_2m_min)),
      precipitation: Math.round(data.daily.precipitation_sum.reduce((a: number, b: number) => a + b, 0)),
    };
  } catch (error) {
    console.warn("Climate fetch failed, using fallback defaults", error);
    return { avgTemp: 72, maxTemp: 90, minTemp: 45, precipitation: 35 };
  }
}

/**
 * In a real app, this would query a Geospatial DB or a 3D Mesh API.
 * For this implementation, we simulate static elevation data for a location.
 */
export async function getElevationMetrics(state: string, location?: string): Promise<ElevationData> {
  // Simulating a lookup - in production this would query a geospatial DB
  // or call an elevation API with lat/lng or a region identifier.
  const seed = (state.length + (location?.length || 0)) % 10;
  return {
    min: 200 + seed * 50,
    max: 1200 + seed * 200,
    avg: 600 + seed * 100
  };
}

export interface GeoStats {
  query: string;
  place: {
    display_name: string;
    lat: number;
    lon: number;
    type: string | null;
    osm_id: string | null;
    country_code: string;
  };
  population: {
    country: number | null;
    state: { population: number; name: string } | null;
  };
  sources: {
    nominatim: boolean;
    worldbank?: boolean;
    census?: boolean;
  };
}

export async function fetchGeoStats(placeName: string, aggregatorUrl?: string): Promise<GeoStats | null> {
  try {
    const url = aggregatorUrl || import.meta.env.VITE_AGGREGATOR_URL || 'http://localhost:8080';
    const response = await fetch(`${url}/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: placeName }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Rate limit exceeded on aggregator');
      } else {
        console.warn('Aggregator lookup failed', response.status);
      }
      return null;
    }

    const data: GeoStats = await response.json();
    return data;
  } catch (error) {
    console.warn('Geo stats fetch failed', error);
    return null;
  }
}
