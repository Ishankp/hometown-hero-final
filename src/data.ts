import { Athlete, GameParticipation } from './types';

const SUMMER_SPORTS = ['Swimming', 'Athletics', 'Gymnastics', 'Basketball', 'Soccer', 'Volleyball', 'Fencing', 'Wrestling'];
const WINTER_SPORTS = ['Figure Skating', 'Ice Hockey', 'Snowboarding', 'Alpine Skiing', 'Speed Skating', 'Bobsleigh'];

const SUMMER_YEARS = [2024, 2020, 2016, 2012, 2008, 2004];
const WINTER_YEARS = [2022, 2018, 2014, 2010, 2006, 2002];

export const MOCK_ATHLETES: Athlete[] = [
  {
    id: '1',
    name: 'Simone Biles',
    gender: 'Women',
    sport: 'Gymnastics',
    subcategories: ['All-Around', 'Floor', 'Vault'],
    hometownCity: 'Spring',
    hometownState: 'TX',
    lat: 30.0102,
    lng: -95.4172,
    isParalympian: false,
    participations: [{ year: 2024, season: 'Summer' }, { year: 2020, season: 'Summer' }, { year: 2016, season: 'Summer' }],
    medals: { gold: 7, silver: 2, bronze: 2 },
    biography: 'Considered one of the greatest gymnasts of all time, Biles has won a total of 30 Olympic and World Championship medals.',
    college: 'University of the People',
    age: 27,
    imageUrl: 'https://i.pravatar.cc/150?u=1'
  },
  {
    id: '2',
    name: 'Katie Ledecky',
    gender: 'Women',
    sport: 'Swimming',
    subcategories: ['800m Free', '1500m Free', '400m Free'],
    hometownCity: 'Bethesda',
    hometownState: 'MD',
    lat: 38.9847,
    lng: -77.0947,
    isParalympian: false,
    participations: [{ year: 2024, season: 'Summer' }, { year: 2020, season: 'Summer' }, { year: 2016, season: 'Summer' }, { year: 2012, season: 'Summer' }],
    medals: { gold: 9, silver: 4, bronze: 1 },
    biography: 'Ledecky is the most decorated female swimmer in history, specializing in freestyle events.',
    college: 'Stanford University',
    age: 27,
    imageUrl: 'https://i.pravatar.cc/150?u=2'
  },
  {
    id: '3',
    name: 'Nathan Chen',
    gender: 'Men',
    sport: 'Figure Skating',
    subcategories: ['Men\'s Singles'],
    hometownCity: 'Salt Lake City',
    hometownState: 'UT',
    lat: 40.7608,
    lng: -111.8910,
    isParalympian: false,
    participations: [{ year: 2022, season: 'Winter' }, { year: 2018, season: 'Winter' }],
    medals: { gold: 1, silver: 1, bronze: 1 },
    biography: 'The "Quad King" of figure skating, won individual gold in Beijing 2022.',
    college: 'Yale University',
    age: 24,
    imageUrl: 'https://i.pravatar.cc/150?u=3'
  },
  {
    id: '4',
    name: 'Tatyana McFadden',
    gender: 'Women',
    sport: 'Para Athletics',
    subcategories: ['100m', '400m', '800m', 'Marathon'],
    hometownCity: 'Clarksville',
    hometownState: 'MD',
    lat: 39.2008,
    lng: -76.9366,
    isParalympian: true,
    participations: [{ year: 2024, season: 'Summer' }, { year: 2020, season: 'Summer' }, { year: 2016, season: 'Summer' }, { year: 2014, season: 'Winter' }],
    medals: { gold: 8, silver: 8, bronze: 4 },
    biography: 'McFadden is a 20-time Paralympic medalist and a multiple-time winner of the Grand Slam of marathon racing.',
    college: 'University of Illinois',
    age: 35,
    imageUrl: 'https://i.pravatar.cc/150?u=4'
  }
];

const FLORIDA_PSEUDO_ATHLETES: Athlete[] = [
  {
    id: '5',
    name: 'Caeleb Dressel',
    gender: 'Men',
    sport: 'Swimming',
    subcategories: ['Freestyle', 'Butterfly', 'Relay'],
    hometownCity: 'Green Cove Springs',
    hometownState: 'FL',
    lat: 29.9919,
    lng: -81.6781,
    isParalympian: false,
    participations: [{ year: 2024, season: 'Summer' }, { year: 2020, season: 'Summer' }, { year: 2016, season: 'Summer' }],
    medals: { gold: 8, silver: 0, bronze: 1 },
    biography: 'Florida-based sprint swimmer and multiple Olympic gold medalist.',
    college: 'University of Florida',
    age: 27,
    imageUrl: 'https://i.pravatar.cc/150?u=5'
  },
  {
    id: '6',
    name: 'Ariana Donde',
    gender: 'Women',
    sport: 'Gymnastics',
    subcategories: ['All-Around', 'Floor'],
    hometownCity: 'Miami',
    hometownState: 'FL',
    lat: 25.7617,
    lng: -80.1918,
    isParalympian: false,
    participations: [{ year: 2024, season: 'Summer' }, { year: 2020, season: 'Summer' }],
    medals: { gold: 2, silver: 1, bronze: 0 },
    biography: 'Miami gymnast used as a temporary Florida example athlete.',
    college: 'University of Florida',
    age: 24,
    imageUrl: 'https://i.pravatar.cc/150?u=6'
  },
  {
    id: '7',
    name: 'Jordan Ellis',
    gender: 'Men',
    sport: 'Athletics',
    subcategories: ['Sprints', 'Relays'],
    hometownCity: 'Orlando',
    hometownState: 'FL',
    lat: 28.5383,
    lng: -81.3792,
    isParalympian: false,
    participations: [{ year: 2024, season: 'Summer' }, { year: 2020, season: 'Summer' }],
    medals: { gold: 1, silver: 2, bronze: 0 },
    biography: 'Orlando sprinter included in the Florida pseudo database.',
    college: 'UCF',
    age: 26,
    imageUrl: 'https://i.pravatar.cc/150?u=7'
  },
  {
    id: '8',
    name: 'Maya Torres',
    gender: 'Women',
    sport: 'Volleyball',
    subcategories: ['Indoor'],
    hometownCity: 'Tampa',
    hometownState: 'FL',
    lat: 27.9506,
    lng: -82.4572,
    isParalympian: false,
    participations: [{ year: 2024, season: 'Summer' }, { year: 2016, season: 'Summer' }],
    medals: { gold: 1, silver: 1, bronze: 1 },
    biography: 'Tampa volleyball player for the Florida example set.',
    college: 'Florida State University',
    age: 25,
    imageUrl: 'https://i.pravatar.cc/150?u=8'
  },
  {
    id: '9',
    name: 'Luis Navarro',
    gender: 'Men',
    sport: 'Fencing',
    subcategories: ['Foil'],
    hometownCity: 'Fort Lauderdale',
    hometownState: 'FL',
    lat: 26.1224,
    lng: -80.1373,
    isParalympian: false,
    participations: [{ year: 2024, season: 'Summer' }, { year: 2012, season: 'Summer' }],
    medals: { gold: 1, silver: 0, bronze: 1 },
    biography: 'Temporary Fort Lauderdale fencer used to seed Florida city dots.',
    college: 'Florida International University',
    age: 29,
    imageUrl: 'https://i.pravatar.cc/150?u=9'
  },
  {
    id: '10',
    name: 'Sofia Grant',
    gender: 'Women',
    sport: 'Swimming',
    subcategories: ['Breaststroke'],
    hometownCity: 'Gainesville',
    hometownState: 'FL',
    lat: 29.6516,
    lng: -82.3248,
    isParalympian: true,
    participations: [{ year: 2024, season: 'Summer' }, { year: 2020, season: 'Summer' }],
    medals: { gold: 0, silver: 2, bronze: 1 },
    biography: 'Gainesville Paralympian added for visible Florida clustering.',
    college: 'University of Florida',
    age: 23,
    imageUrl: 'https://i.pravatar.cc/150?u=10'
  }
];

MOCK_ATHLETES.push(...FLORIDA_PSEUDO_ATHLETES);

const STATES_POOL = ['CA', 'FL', 'NY', 'TX', 'IL', 'OH', 'PA', 'GA', 'NC', 'MI', 'MD', 'VA', 'NJ', 'MN', 'WA', 'OR', 'CO', 'AZ', 'MA', 'WI', 'UT'];
const GENDERS: ('Men' | 'Women')[] = ['Men', 'Women'];

const STATE_FIPS: Record<string, string> = {
  'CA': '06', 'FL': '12', 'NY': '36', 'TX': '48', 'IL': '17', 
  'OH': '39', 'PA': '42', 'GA': '13', 'NC': '37', 'MI': '26',
  'MD': '24', 'VA': '51', 'NJ': '34', 'MN': '27', 'WA': '53',
  'OR': '41', 'CO': '08', 'AZ': '04', 'MA': '25', 'WI': '55',
  'UT': '49'
};



const STATE_COORDINATES: Record<string, [number, number]> = {
  'CA': [36.7783, -119.4179], 'FL': [27.6648, -81.5158], 'NY': [40.7128, -74.0060],
  'TX': [31.9686, -99.9018], 'IL': [40.6331, -89.3985], 'OH': [40.4173, -82.9071],
  'PA': [41.2033, -77.1945], 'GA': [32.1656, -82.9001], 'NC': [35.7596, -79.0193],
  'MI': [44.3148, -85.6024], 'MD': [39.0458, -76.6413], 'VA': [37.4316, -78.6569],
  'NJ': [40.0583, -74.4057], 'MN': [46.7296, -94.6859], 'WA': [47.7511, -120.7401],
  'CO': [39.5501, -105.7821], 'MA': [42.4072, -71.3824], 'AZ': [34.0489, -111.0937],
  'UT': [39.3200, -111.0937], 'NV': [38.8026, -116.4194], 'NM': [34.5199, -105.8701],
  'OR': [43.8041, -120.5542], 'ID': [44.0682, -114.7420]
};

const SPORT_SUBCATEGORIES: Record<string, string[]> = {
  'Swimming': ['Backstroke', 'Breaststroke', 'Butterfly', 'Freestyle', 'Individual Medley', 'Relay'],
  'Athletics': ['Sprints', 'Middle Distance', 'Long Distance', 'Hurdles', 'Relays', 'Jumps', 'Throws'],
  'Gymnastics': ['Artistic', 'Rhythmic', 'Trampoline'],
  'Basketball': ['5x5', '3x3'],
  'Soccer': ['Team'],
  'Volleyball': ['Indoor', 'Beach'],
  'Fencing': ['Epee', 'Foil', 'Saber'],
  'Wrestling': ['Freestyle', 'Greco-Roman'],
  'Figure Skating': ['Singles', 'Pairs', 'Ice Dance'],
  'Ice Hockey': ['Team'],
  'Snowboarding': ['Halfpipe', 'Slopestyle', 'Big Air', 'Cross'],
  'Alpine Skiing': ['Downhill', 'Slalom', 'Super-G', 'Giant Slalom'],
  'Speed Skating': ['Short Track', 'Long Track'],
  'Bobsleigh': ['Two-man', 'Four-man', 'Monobob'],
};

for (let i = 11; i <= 600; i++) {
  const state = STATES_POOL[Math.floor(Math.random() * STATES_POOL.length)];
  const center = STATE_COORDINATES[state] || [39.8283, -98.5795];
  const isWinter = Math.random() > 0.7;
  const sports = isWinter ? WINTER_SPORTS : SUMMER_SPORTS;
  const yearList = isWinter ? WINTER_YEARS : SUMMER_YEARS;
  const numParticipations = 1 + Math.floor(Math.random() * 3);
  
  const participations: GameParticipation[] = [];
  const validStartYearIdx = Math.max(0, yearList.length - numParticipations);
  const startYearIdx = Math.floor(Math.random() * (validStartYearIdx + 1));
  
  for (let j = 0; j < numParticipations; j++) {
    const yearIdx = Math.min(startYearIdx + j, yearList.length - 1);
    participations.push({ 
      year: yearList[yearIdx], 
      season: isWinter ? 'Winter' : 'Summer' 
    });
  }

  const sport = sports[Math.floor(Math.random() * sports.length)];
  const isPara = Math.random() > 0.85;
  const subs = SPORT_SUBCATEGORIES[sport] || ['Standard Event'];
  const numSubs = 1 + Math.floor(Math.random() * 2);
  const selectedSubs = [...subs].sort(() => 0.5 - Math.random()).slice(0, numSubs);

  MOCK_ATHLETES.push({
    id: String(i),
    name: `Athlete ${i}`,
    gender: GENDERS[Math.floor(Math.random() * GENDERS.length)],
    sport: isPara ? `Para ${sport}` : sport,
    subcategories: selectedSubs,
    hometownCity: 'Hometown',
    hometownState: state,
    lat: center[0] + (Math.random() - 0.5) * 4,
    lng: center[1] + (Math.random() - 0.5) * 4,
    isParalympian: isPara,
    participations,
    medals: Math.random() > 0.9 ? { gold: Math.floor(Math.random()*2), silver: 0, bronze: 0 } : undefined,
    age: 18 + Math.floor(Math.random() * 25),
    biography: `An aspiring athlete from ${state} with multiple games appearances.`,
    imageUrl: `https://i.pravatar.cc/150?u=${i}`
  });
}
