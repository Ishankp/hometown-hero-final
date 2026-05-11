import { Athlete } from '../types';

/**
 * Load athletes from the generated JSON data files
 * This is a fallback for when Firestore is not available
 */
export async function loadAthletesFromJSON(): Promise<Athlete[]> {
  try {
    // Try to load from the data directory
    const response = await fetch('/data/athletes.json');
    if (!response.ok) {
      console.warn(`Failed to load athletes.json: ${response.statusText}`);
      return [];
    }
    
    const athletes = await response.json();
    console.log(`Loaded ${athletes.length} athletes from JSON file`);
    return athletes as Athlete[];
  } catch (error) {
    console.error('Error loading athletes from JSON:', error);
    return [];
  }
}
