import { Athlete } from '../types';
import { fetchGeoStats, type GeoStats } from './geoService';

interface GeocodeResult {
  lat: number | null;
  lng: number | null;
  source: 'cache' | 'nominatim' | 'fallback';
}

// Simple in-memory cache for geocoding results
const geocodeCache = new Map<string, GeocodeResult>();

// Track if aggregator is available
let aggregatorAvailable = true;

/**
 * Geocode a location string (city, state) to lat/lng coordinates
 * Returns quickly with fallback if aggregator is unavailable
 */
async function geocodeLocation(city: string, state: string): Promise<GeocodeResult> {
  if (!city) {
    return { lat: null, lng: null, source: 'fallback' };
  }

  // If aggregator is unavailable, don't waste time trying
  if (!aggregatorAvailable) {
    return { lat: null, lng: null, source: 'fallback' };
  }

  const cacheKey = `${city},${state}`.toLowerCase();
  
  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    // Use the existing geoService to fetch coordinates
    const query = state ? `${city}, ${state}` : city;
    const geoStats = await fetchGeoStats(query);
    
    if (geoStats && geoStats.place) {
      const result: GeocodeResult = {
        lat: geoStats.place.lat,
        lng: geoStats.place.lng,
        source: 'nominatim',
      };
      geocodeCache.set(cacheKey, result);
      return result;
    }
  } catch (error) {
    // Mark aggregator as unavailable if we get errors
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      aggregatorAvailable = false;
    }
    console.warn(`Geocoding failed for ${cacheKey}:`, error);
  }

  // Fallback if geocoding fails
  const fallback: GeocodeResult = {
    lat: null,
    lng: null,
    source: 'fallback',
  };
  geocodeCache.set(cacheKey, fallback);
  return fallback;
}

/**
 * Enrich athletes with missing coordinates by geocoding their hometowns
 * Non-blocking - returns immediately if aggregator unavailable
 */
export async function enrichAthletesWithCoordinates(athletes: Athlete[]): Promise<Athlete[]> {
  // If aggregator is known to be unavailable, skip geocoding immediately
  if (!aggregatorAvailable) {
    console.log('Aggregator unavailable, skipping geocoding');
    return athletes;
  }

  const enriched: Athlete[] = [];
  let geocodedCount = 0;

  for (const athlete of athletes) {
    // Skip if already has coordinates
    if (athlete.lat != null && athlete.lng != null) {
      enriched.push(athlete);
      continue;
    }

    // Try to geocode if has hometown info
    if (athlete.hometownCity) {
      try {
        const result = await geocodeLocation(athlete.hometownCity, athlete.hometownState);
        if (result.lat != null && result.lng != null) {
          enriched.push({
            ...athlete,
            lat: result.lat,
            lng: result.lng,
          });
          geocodedCount++;
        } else {
          enriched.push(athlete);
        }
      } catch (error) {
        console.warn(`Failed to geocode athlete ${athlete.name}:`, error);
        enriched.push(athlete);
      }
    } else {
      enriched.push(athlete);
    }
  }

  console.log(`Geocoded ${geocodedCount} athletes with missing coordinates`);
  return enriched;
}

/**
 * Get statistics about athlete location coverage
 */
export function getLocationCoverage(athletes: Athlete[]): {
  withCoordinates: number;
  withoutCoordinates: number;
  withCity: number;
  coverage: number;
} {
  const withCoordinates = athletes.filter((a) => a.lat != null && a.lng != null).length;
  const withoutCoordinates = athletes.length - withCoordinates;
  const withCity = athletes.filter((a) => a.hometownCity).length;
  const coverage = athletes.length > 0 ? (withCoordinates / athletes.length) * 100 : 0;

  return {
    withCoordinates,
    withoutCoordinates,
    withCity,
    coverage: Math.round(coverage),
  };
}
