import * as React from 'react';
import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { Athlete } from './types';
import { Link } from 'react-router-dom';
import { auth, signInWithGoogle } from './lib/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getAthletes, seedDatabase, addAthlete, deleteAthlete, fetchAllAthletes as fetchAthletesFromFirestore } from './services/athleteService';
import { enrichAthletesWithCoordinates, getLocationCoverage } from './services/geocodeService';
import { loadAthletesFromJSON } from './services/dataLoader';
import { AddAthleteDialog } from './components/AddAthleteDialog';
import { CSVBulkUpload } from './components/CSVBulkUpload';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapPin, Search, Home, Award, Plus, Minus, Hand, Archive, Filter, Calendar, Users, ChevronRight, Check, PlusCircle, ChevronLeft, Settings, BarChart2, Calculator, RotateCcw, Cloud, Thermometer, Mountain } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { fetchClimateMetrics, getElevationMetrics, fetchGeoStats, type GeoStats } from './services/geoService';

const US_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json';

const STATE_CODE_TO_NAME: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

const STATE_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_CODE_TO_NAME).map(([code, name]) => [name.toLowerCase(), code])
);

const SPORTS_STRUCTURE = {
  Summer: {
    'Swimming': ['Backstroke', 'Breaststroke', 'Butterfly', 'Freestyle', 'Individual Medley', 'Relay'],
    'Athletics': ['Sprints', 'Middle Distance', 'Long Distance', 'Hurdles', 'Relays', 'Jumps', 'Throws'],
    'Gymnastics': ['Artistic', 'Rhythmic', 'Trampoline'],
    'Basketball': ['5x5', '3x3'],
    'Soccer': ['Team'],
    'Volleyball': ['Indoor', 'Beach'],
    'Fencing': ['Epee', 'Foil', 'Saber'],
    'Wrestling': ['Freestyle', 'Greco-Roman'],
  },
  Winter: {
    'Figure Skating': ['Singles', 'Pairs', 'Ice Dance'],
    'Ice Hockey': ['Team'],
    'Snowboarding': ['Halfpipe', 'Slopestyle', 'Big Air', 'Cross'],
    'Alpine Skiing': ['Downhill', 'Slalom', 'Super-G', 'Giant Slalom'],
    'Speed Skating': ['Short Track', 'Long Track'],
    'Bobsleigh': ['Two-man', 'Four-man', 'Monobob'],
  }
};

const ALL_YEARS = {
  Summer: [2024, 2020, 2016, 2012, 2008, 2004],
  Winter: [2022, 2018, 2014, 2010, 2006, 2002]
};

const DEFAULT_GENDERS = ['Men', 'Women'];
const DEFAULT_AGE_RANGE: [number, number] = [18, 60];

export default function InteractiveMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const [topology, setTopology] = useState<any>(null);
  const [isLoadingTopology, setIsLoadingTopology] = useState(true);
  const [topologyError, setTopologyError] = useState<string | null>(null);
  const [showDensity, setShowDensity] = useState(false);
  const [selectedState, setSelectedState] = useState<any>(null);
  const [selectedCity, setSelectedCity] = useState<{name: string, state: string, lat: number, lng: number} | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<{ name: string; count: number; type: 'state' | 'city' } | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number, y: number } | null>(null);
  
    // Geo stats state
    const [geoStats, setGeoStats] = useState<GeoStats | null>(null);
    const [isLoadingGeoStats, setIsLoadingGeoStats] = useState(false);

  // ROBUST FILTERS STATE
  const [selectedSeason, setSelectedSeason] = useState<'Summer' | 'Winter'>('Summer');
  const [yearRange, setYearRange] = useState<[number, number]>([2004, 2024]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedEventSelections, setSelectedEventSelections] = useState<Record<string, string[]>>({});
  const [genders, setGenders] = useState<string[]>(DEFAULT_GENDERS);
  const [classification, setClassification] = useState<'all' | 'olympian' | 'paralympian'>('all');
  const [ageRange, setAgeRange] = useState<[number, number]>(DEFAULT_AGE_RANGE);
  const [isFilterBarHidden, setIsFilterBarHidden] = useState(false);
  const INITIAL_RENDER_COUNT = 20;
  const LOAD_MORE_COUNT = 20;
  const [visibleCount, setVisibleCount] = useState(INITIAL_RENDER_COUNT);
  const [registrySearchQuery, setRegistrySearchQuery] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [dwellRegionId, setDwellRegionId] = useState<string | null>(null);
  const dwellTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const zoomKRef = useRef(1);
  // METRICS STATE
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['total', 'avg_age', 'gender_dist']);
  const [calculatedMetrics, setCalculatedMetrics] = useState<Record<string, any> | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationScope, setCalculationScope] = useState<{ state: string | null; city: string | null } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isFetchingAthletes, setIsFetchingAthletes] = useState(false);
  const [isGeocodingAthletes, setIsGeocodingAthletes] = useState(false);
  const [locationCoverage, setLocationCoverage] = useState({ withCoordinates: 0, coverage: 0 });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  });

  const isAdmin = user?.email === 'ishan03kp@gmail.com';

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const loadAthletes = async () => {
    setIsFetchingAthletes(true);
    try {
      let athletes: Athlete[] = [];
      
      // Try JSON file first (fastest, already downloaded)
      try {
        athletes = await loadAthletesFromJSON();
        if (athletes.length > 0) {
          console.log(`✅ Loaded ${athletes.length} athletes from JSON file`);
        }
      } catch (err) {
        console.warn('JSON load failed, trying Firestore:', err);
      }
      
      // Try Firestore as fallback
      if (athletes.length === 0) {
        try {
          athletes = await fetchAthletesFromFirestore();
          if (athletes.length > 0) {
            console.log(`✅ Loaded ${athletes.length} athletes from Firestore`);
          }
        } catch (err) {
          console.warn('Firestore load failed, trying mock data:', err);
        }
      }
      
      // Try mock data as last resort
      if (athletes.length === 0) {
        console.warn('No athletes loaded, using fallback mock data');
        const { MOCK_ATHLETES } = await import('./data');
        athletes = MOCK_ATHLETES;
      }
      
      // Calculate location coverage
      const coverage = getLocationCoverage(athletes);
      setLocationCoverage(coverage);
      
      console.log(
        `✅ Location coverage: ${coverage.withCoordinates}/${athletes.length} athletes have coordinates (${coverage.coverage}%)`
      );
      
      // Set athletes immediately - don't block on anything
      setAthletes(athletes);
      
    } catch (err) {
      console.error("Failed to load athletes:", err);
      // Final fallback
      try {
        const { MOCK_ATHLETES } = await import('./data');
        setAthletes(MOCK_ATHLETES);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
      }
    } finally {
      setIsFetchingAthletes(false);
      setIsGeocodingAthletes(false);
    }
  };

  useEffect(() => {
    loadAthletes();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  const METRIC_CATEGORIES = [
    { id: 'core', label: 'Core Representation' },
    { id: 'agg', label: 'Aggregation & Sums' },
    { id: 'avg', label: 'Averages & Ratios' },
    { id: 'sport', label: 'Participation & Sport' },
    { id: 'time', label: 'Time-Based Analytics' },
    { id: 'geo', label: 'Geographic Context' },
    { id: 'outcome', label: 'Athlete Outcomes' },
  ];

  const AVAILABLE_METRICS = [
    // CORE
    { id: 'total', category: 'core', label: 'Total Athletes', description: 'Total count of Olympic/Paralympic athletes' },
    { id: 'split_type', category: 'core', label: 'Olympians vs Paralympians', description: 'Breakdown of different athlete categories' },
    { id: 'per_100k', category: 'core', label: 'Athletes / 100k', description: 'Representation per 100,000 residents' },
    { id: 'per_mil', category: 'core', label: 'Athletes / Million', description: 'Representation per 1,000,000 residents' },
    
    // AGG
    { id: 'total_sports', category: 'agg', label: 'Unique Sports', description: 'Number of distinct disciplines represented' },
    { id: 'total_medals', category: 'agg', label: 'Total Medals', description: 'Sum of all gold, silver, and bronze earned' },
    { id: 'total_apps', category: 'agg', label: 'Total Appearances', description: 'Accumulated Games attended across all athletes' },
    
    // AVG
    { id: 'avg_age', category: 'avg', label: 'Average Age', description: 'Mean age of the current athlete pool' },
    { id: 'avg_apps', category: 'avg', label: 'Apps Per Athlete', description: 'Mean number of Games per individual' },
    { id: 'avg_career', category: 'avg', label: 'Career Span', description: 'Average years between first and last Games' },
    
    // SPORT
    { id: 'sport_diversity', category: 'sport', label: 'Sport Diversity Index', description: 'Measure of discipline variety (0-1.0)' },
    { id: 'summer_winter', category: 'sport', label: 'Summer vs Winter', description: 'Participation split by seasonal Games' },
    { id: 'top_disciplines', category: 'sport', label: 'Dominant Disciplines', description: 'The most frequent sports in this region' },
    
    // TIME
    { id: 'first_last', category: 'time', label: 'Historical Range', description: 'Earliest and most recent Game appearances' },
    { id: 'trend', category: 'time', label: 'Representation Trend', description: 'Longitudinal change in athlete volume' },
    
    // GEO
    { id: 'population', category: 'geo', label: 'Regional Population', description: 'Estimated resident count for current scope' },
    { id: 'elevation', category: 'geo', label: 'Topography', description: 'Min, max, and average altitude (ft)' },
    { id: 'climate', category: 'geo', label: 'Climate Context', description: 'Annual temperature and precipitation averages' },
    
    // OUTCOME
    { id: 'medal_rate', category: 'outcome', label: 'Medal Success Rate', description: 'Percentage of athletes earning hardware' },
    { id: 'medal_split', category: 'outcome', label: 'Medal Breakdown', description: 'Distribution of Gold, Silver, and Bronze' },
  ];

  const calculateMetrics = async () => {
    setIsCalculating(true);
    
    const metrics: Record<string, any> = {};
    const athletes = filteredAthletes;
    
    // Basic Estimators for Pop-based metrics
    const getPopulation = () => {
      if (selectedCity) return 150000 + (Math.random() * 500000);
      if (selectedState) return 7000000 + (Math.random() * 2000000);
      return 335000000;
    };
    
    const pop = getPopulation();

    // Preparation for async metrics
    const lat = selectedCity ? selectedCity.lat : (selectedState ? 39.8283 : 39.8283);
    const lng = selectedCity ? selectedCity.lng : (selectedState ? -98.5795 : -98.5795);
    const contextYear = yearRange[1];

    for (const id of selectedMetrics) {
      switch(id) {
        case 'total':
          metrics.total = athletes.length;
          break;
        case 'split_type':
          const para = athletes.filter(a => a.isParalympian).length;
          metrics.split_type = { para, olympic: athletes.length - para };
          break;
        case 'per_100k':
          metrics.per_100k = ((athletes.length / pop) * 100000).toFixed(2);
          break;
        case 'per_mil':
          metrics.per_mil = ((athletes.length / pop) * 1000000).toFixed(1);
          break;
        case 'total_sports':
          metrics.total_sports = new Set(athletes.map(a => a.sport)).size;
          break;
        case 'total_medals':
          metrics.total_medals = athletes.reduce((sum, a) => sum + (a.medals ? (a.medals.gold + a.medals.silver + a.medals.bronze) : 0), 0);
          break;
        case 'total_apps':
          metrics.total_apps = athletes.reduce((sum, a) => sum + a.participations.length, 0);
          break;
        case 'avg_age':
          const withAge = athletes.filter(a => a.age);
          metrics.avg_age = withAge.length > 0 
            ? (withAge.reduce((sum, a) => sum + (a.age || 0), 0) / withAge.length).toFixed(1)
            : 'N/A';
          break;
        case 'avg_apps':
          metrics.avg_apps = athletes.length > 0
            ? (athletes.reduce((sum, a) => sum + a.participations.length, 0) / athletes.length).toFixed(2)
            : '0.00';
          break;
        case 'avg_career':
          const careers = athletes.map(a => {
            const years = a.participations.map(p => p.year);
            return Math.max(...years) - Math.min(...years) + 1;
          });
          metrics.avg_career = careers.length > 0
            ? (careers.reduce((sum, v) => sum + v, 0) / careers.length).toFixed(1) + ' Yrs'
            : 'N/A';
          break;
        case 'sport_diversity':
          const sportsSet = new Set(athletes.map(a => a.sport));
          metrics.sport_diversity = (sportsSet.size / (athletes.length || 1)).toFixed(2);
          break;
        case 'summer_winter':
          let summer = 0; let winter = 0;
          athletes.forEach(a => {
            const seasons = new Set(a.participations.map(p => p.season));
            if (seasons.has('Summer')) summer++;
            if (seasons.has('Winter')) winter++;
          });
          metrics.summer_winter = { summer, winter };
          break;
        case 'top_disciplines':
          const sportCounts: Record<string, number> = {};
          athletes.forEach(a => {
            sportCounts[a.sport] = (sportCounts[a.sport] || 0) + 1;
          });
          metrics.top_disciplines = Object.entries(sportCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
          break;
        case 'first_last':
          const allYears = athletes.flatMap(a => a.participations.map(p => p.year));
          metrics.first_last = allYears.length > 0 
            ? { start: Math.min(...allYears), end: Math.max(...allYears) }
            : 'N/A';
          break;
        case 'trend':
          const recent = athletes.filter(a => a.participations.some(p => p.year >= 2020)).length;
          const historic = athletes.filter(a => a.participations.every(p => p.year < 2010)).length;
          metrics.trend = recent > historic ? 'Rising' : (recent < historic ? 'Declining' : 'Stable');
          break;
        case 'population':
          metrics.population = (pop / 1000).toFixed(0) + 'K';
          break;
        case 'elevation':
          metrics.elevation = await getElevationMetrics(
            selectedState?.properties?.name || 'USA',
            selectedCity?.name
          );
          break;
        case 'climate':
          metrics.climate = await fetchClimateMetrics(lat, lng, contextYear);
          break;
        case 'medal_rate':
          const counts = athletes.filter(a => a.medals && (a.medals.gold + a.medals.silver + a.medals.bronze > 0)).length;
          metrics.medal_rate = athletes.length > 0 ? ((counts / athletes.length) * 100).toFixed(1) + '%' : '0%';
          break;
        case 'medal_split':
          const goldCount = athletes.reduce((s, a) => s + (a.medals?.gold || 0), 0);
          const silverCount = athletes.reduce((s, a) => s + (a.medals?.silver || 0), 0);
          const bronzeCount = athletes.reduce((s, a) => s + (a.medals?.bronze || 0), 0);
          metrics.medal_split = { g: goldCount, s: silverCount, b: bronzeCount };
          break;
      }
    }
    
    // Engine delay simulation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setCalculatedMetrics(metrics);
    setCalculationScope({
      state: selectedState ? selectedState.properties.name : 'The United States',
      city: selectedCity ? selectedCity.name : null
    });
    setIsCalculating(false);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedSports.length > 0) count++;
    if (Object.values(selectedEventSelections).some(events => events.length > 0)) count++;
    if (genders.length !== DEFAULT_GENDERS.length) count++;
    if (classification !== 'all') count++;
    if (ageRange[0] !== DEFAULT_AGE_RANGE[0] || ageRange[1] !== DEFAULT_AGE_RANGE[1]) count++;
    return count;
  }, [selectedSports.length, selectedEventSelections, genders.length, classification, ageRange]);

  const sportSummary = useMemo(() => {
    if (selectedSports.length === 0) return 'All';
    if (selectedSports.length === 1) return selectedSports[0];
    return `${selectedSports.length} Sports`;
  }, [selectedSports]);

  const resetFilterBar = () => {
    setSelectedSeason('Summer');
    setYearRange([Math.min(...ALL_YEARS.Summer), Math.max(...ALL_YEARS.Summer)]);
    setSelectedSports([]);
    setSelectedEventSelections({});
    setGenders(DEFAULT_GENDERS);
    setClassification('all');
    setAgeRange(DEFAULT_AGE_RANGE);
  };

  const toggleSportSelection = (sport: string) => {
    setSelectedSports(prev => {
      const isSelected = prev.includes(sport);
      if (isSelected) {
        setSelectedEventSelections(current => {
          const next = { ...current };
          delete next[sport];
          return next;
        });
        return prev.filter(item => item !== sport);
      }
      return [...prev, sport];
    });
  };

  const toggleSportEvent = (sport: string, eventName: string) => {
    setSelectedSports(prev => (prev.includes(sport) ? prev : [...prev, sport]));
    setSelectedEventSelections(prev => {
      const current = prev[sport] || [];
      const isSelected = current.includes(eventName);
      const nextEvents = isSelected ? current.filter(item => item !== eventName) : [...current, eventName];
      const next = { ...prev };
      if (nextEvents.length > 0) next[sport] = nextEvents;
      else delete next[sport];
      return next;
    });
  };

  const selectAllSportEvents = (sport: string, events: string[]) => {
    setSelectedSports(prev => (prev.includes(sport) ? prev : [...prev, sport]));
    setSelectedEventSelections(prev => ({
      ...prev,
      [sport]: [...events],
    }));
  };

  const clearSportEvents = (sport: string) => {
    setSelectedEventSelections(prev => {
      const next = { ...prev };
      delete next[sport];
      return next;
    });
  };

  const clearSportFilter = () => {
    setSelectedSports([]);
    setSelectedEventSelections({});
  };

  // Sync year range when season changes
  useEffect(() => {
    const years = ALL_YEARS[selectedSeason];
    setYearRange([Math.min(...years), Math.max(...years)]);
    setVisibleCount(INITIAL_RENDER_COUNT); // Reset lazy list on filter change
  }, [selectedSeason]);

  // Reset lazy list on filter change and scroll to top
  useEffect(() => {
    setVisibleCount(INITIAL_RENDER_COUNT);
    const viewport = scrollAreaRef.current?.querySelector('[data-slot="scroll-area-viewport"]') as HTMLDivElement | null;
    if (viewport) {
      viewport.scrollTop = 0;
    }
  }, [selectedState, selectedCity, selectedSports, selectedEventSelections, genders, classification, ageRange, yearRange, registrySearchQuery]);

  const geoQuery = selectedCity
    ? `${selectedCity.name}, ${selectedCity.state}`
    : selectedState
      ? selectedState.properties.name
      : null;

  // Fetch geo stats when a city or state is selected
  useEffect(() => {
    if (!geoQuery) {
      setGeoStats(null);
      return;
    }

    const fetchStats = async () => {
      setIsLoadingGeoStats(true);
      const stats = await fetchGeoStats(geoQuery);
      setGeoStats(stats);
      setIsLoadingGeoStats(false);
    };

    fetchStats();
  }, [geoQuery]);

  const width = 960;
  const height = 600;

  // CHOROPLETH DATA: Calculate counts based on filters but NOT regional selection (now city-focused)
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Apply all filters EXCEPT state/city selection
    let filtered = athletes.filter(a => {
      // Season & Year Filter
      const hasGames = a.participations.some(p => 
        p.season === selectedSeason && 
        p.year >= yearRange[0] && 
        p.year <= yearRange[1]
      );
      if (!hasGames) return false;

      // Sport Filter
      if (selectedSports.length > 0) {
        const baseSport = a.sport.replace(/^Para\s+/, '');
        if (!selectedSports.includes(baseSport)) return false;
        const selectedEventsForSport = selectedEventSelections[baseSport] || [];
        if (selectedEventsForSport.length > 0) {
          if (!a.subcategories?.some(s => selectedEventsForSport.includes(s))) return false;
        }
      }

      // Demographic Filters
      if (!genders.includes(a.gender)) return false;
      if (classification === 'olympian' && a.isParalympian) return false;
      if (classification === 'paralympian' && !a.isParalympian) return false;
      if (a.age && (a.age < ageRange[0] || a.age > ageRange[1])) return false;

      return true;
    });

    filtered.forEach(a => {
      const stateName = STATE_CODE_TO_NAME[a.hometownState] || a.hometownState;
      counts[stateName] = (counts[stateName] || 0) + 1;
    });
    return counts;
  }, [selectedSeason, yearRange, selectedSports, selectedEventSelections, genders, classification, ageRange]);

  // REFINED COLOR SCALES: Shifting from 'Heat' to 'Connection' (Blue/Teal)
  const stateColorScale = d3.scaleSequential(d3.interpolatePuBuGn)
    .domain([0, Math.max(1, ...(Object.values(stateCounts) as number[])) * 0.9]);


  useEffect(() => {
    setIsLoadingTopology(true);
    setTopologyError(null);
    
    fetch(US_ATLAS_URL)
      .then(res => {
        if (!res.ok) throw new Error(`Atlas connection failed: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setTopology(data);
        setIsLoadingTopology(false);
      })
      .catch(err => {
        console.error("Error loading map data:", err);
        setTopologyError(err.message || 'Unknown network error');
        setIsLoadingTopology(false);
      });
  }, []);

  const projection = useMemo(() => d3.geoAlbersUsa()
    .scale(1380)
    .translate([width / 2 + 24, height / 2]), []);

  const path = useMemo(() => d3.geoPath().projection(projection), [projection]);

  const states = useMemo(() => {
    if (!topology) return [];
    return (topojson.feature(topology, topology.objects.states) as any).features;
  }, [topology]);

  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Handle D3 Zoom integration
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 40])
      .on('start', () => {
        setHoveredRegion(null);
        setHoverPosition(null);
        setDwellRegionId(null);
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        if (dwellTimeoutRef.current) clearTimeout(dwellTimeoutRef.current);
      })
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        zoomKRef.current = event.transform.k;
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity);
  }, [topology]);

  const manualZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(500).ease(d3.easeCubicInOut).call(
      zoomBehaviorRef.current.scaleBy as any,
      factor
    );
  };

  const resetMap = () => {
    setSelectedState(null);
    setSelectedCity(null);
    if (svgRef.current && zoomBehaviorRef.current) {
      const svg = d3.select(svgRef.current);
      svg.transition()
        .duration(1000)
        .ease(d3.easeCubicInOut)
        .call(
          zoomBehaviorRef.current.transform as any,
          d3.zoomIdentity
        );
    }
  };

  const zoomToFeature = (feature: any) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    const bounds = path.bounds(feature);
    const dx = bounds[1][0] - bounds[0][0];
    const dy = bounds[1][1] - bounds[0][1];
    const x = (bounds[0][0] + bounds[1][0]) / 2;
    const y = (bounds[0][1] + bounds[1][1]) / 2;
    const scale = Math.max(1, Math.min(20, 0.9 / Math.max(dx / width, dy / height)));
    const translate = [width / 2 - scale * x, height / 2 - scale * y];

    const svg = d3.select(svgRef.current);
    svg.transition()
      .duration(1000)
      .ease(d3.easeCubicInOut)
      .call(
        zoomBehaviorRef.current.transform as any,
        d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
      );
  };

  const handleStateClick = (d: any) => {
    if (selectedState?.id === d.id) {
      resetMap();
    } else {
      setSelectedState(d);
      setSelectedCity(null);
      zoomToFeature(d);
    }
  };

  const handleCityClick = (city: any) => {
    if (selectedCity?.name === city.name && selectedCity?.state === city.state) {
      setSelectedCity(null);
    } else {
      setSelectedCity(city);
      // Zoom to city cluster? 
      // For now we stay at state zoom if selected
    }
  };

  

  // Filtered for map layer (all cities visible)
  const filteredAthletesForMap = useMemo(() => {
    let filtered = athletes;
    
    if (selectedState) {
      const code = STATE_NAME_TO_CODE[selectedState.properties.name.toLowerCase()];
      filtered = filtered.filter(a => a.hometownState === code);
    }

    // Season & Year Filter
    filtered = filtered.filter(a => 
      a.participations.some(p => 
        p.season === selectedSeason && 
        p.year >= yearRange[0] && 
        p.year <= yearRange[1]
      )
    );

    // Sport Filter
    if (selectedSports.length > 0) {
      filtered = filtered.filter(a => {
        const baseSport = a.sport.replace(/^Para\s+/, '');
        if (!selectedSports.includes(baseSport)) return false;
        const selectedEventsForSport = selectedEventSelections[baseSport] || [];
        if (selectedEventsForSport.length > 0) {
          return a.subcategories?.some(s => selectedEventsForSport.includes(s));
        }
        return true;
      });
    }

    // Demographic Filters
    filtered = filtered.filter(a => genders.includes(a.gender));

    if (classification === 'olympian') {
      filtered = filtered.filter(a => !a.isParalympian);
    } else if (classification === 'paralympian') {
      filtered = filtered.filter(a => a.isParalympian);
    }

    if (ageRange) {
      filtered = filtered.filter(a => a.age && a.age >= ageRange[0] && a.age <= ageRange[1]);
    }

    return filtered;
  }, [athletes, selectedState, selectedSeason, yearRange, selectedSports, selectedEventSelections, genders, classification, ageRange]);

  // Filtered for sidebar (respects city selection)
  const filteredAthletes = useMemo(() => {
    let filtered = filteredAthletesForMap;

    if (selectedCity) {
      filtered = filtered.filter(a => a.hometownCity === selectedCity.name && a.hometownState === selectedCity.state);
    }

    if (registrySearchQuery) {
      const q = registrySearchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.name.toLowerCase().includes(q) || 
        a.sport.toLowerCase().includes(q) || 
        a.hometownCity.toLowerCase().includes(q) ||
        a.hometownState.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [filteredAthletesForMap, selectedCity, registrySearchQuery]);

  // CITY CLUSTERS: Group athletes by city to render as dots
  const cityClusters = useMemo(() => {
    const clusters: Record<string, { name: string; state: string; lat: number; lng: number; count: number; athletes: Athlete[] }> = {};
    
    filteredAthletesForMap.forEach(a => {
      const key = `${a.hometownCity}-${a.hometownState}`;
      if (!clusters[key]) {
        clusters[key] = {
          name: a.hometownCity,
          state: a.hometownState,
          lat: a.lat != null ? Number(a.lat) : null,
          lng: a.lng != null ? Number(a.lng) : null,
          count: 0,
          athletes: []
        };
      }
      clusters[key].count++;
      clusters[key].athletes.push(a);
    });
    
    return Object.values(clusters);
  }, [filteredAthletesForMap]);

  const bubbleScale = d3.scaleSqrt()
    .domain([0, Math.max(1, ...cityClusters.map(c => c.count))])
    .range([4, 22]);

  // Precompute projected positions for city clusters and apply small collision offsets
  const cityPositions = useMemo(() => {
    const pos: Array<{ coords: [number, number]; dx: number; dy: number }> = [];
    const buckets: Record<string, number[]> = {};

    cityClusters.forEach((city, i) => {
      let coords: any = null;
      if (city.lat != null && city.lng != null) {
        coords = projection([city.lng, city.lat]);
      }
      if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) {
        pos.push({ coords: [NaN, NaN], dx: 0, dy: 0 });
        return;
      }
      const key = `${Math.round(coords[0])}:${Math.round(coords[1])}`;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(i);
      pos.push({ coords, dx: 0, dy: 0 });
    });

    // For buckets with collisions, assign offsets around a circle
    Object.values(buckets).forEach(group => {
      if (group.length <= 1) return;
      const total = group.length;
      group.forEach((idx, j) => {
        const c = pos[idx];
        if (!c || !Number.isFinite(c.coords[0])) return;
        const angle = (2 * Math.PI * j) / total;
        // offset distance proportional to bubble size (use median-ish)
        const count = cityClusters[idx].count || 1;
        const base = bubbleScale(count) + 2;
        c.dx = Math.cos(angle) * base;
        c.dy = Math.sin(angle) * base;
      });
    });

    return pos;
  }, [cityClusters, projection, states, path, bubbleScale]);

  const visibleAthletes = useMemo(
    () => filteredAthletes.slice(0, visibleCount),
    [filteredAthletes, visibleCount]
  );

  const hasMoreAthletes = visibleCount < filteredAthletes.length;

  // Header title formatting: show `State > City` when selected
  const headerTitle = useMemo(() => {
    if (selectedState && selectedCity) {
      const stateName = selectedState.properties?.name || (STATE_CODE_TO_NAME[selectedCity.state] || selectedCity.state);
      return `${stateName} > ${selectedCity.name}`;
    }
    if (selectedState) return selectedState.properties?.name || 'Selected State';
    return 'The United States';
  }, [selectedState, selectedCity]);

  const getParticipationYears = (athlete: Athlete) => {
    const years = Array.from(new Set(athlete.participations.map(p => p.year))).sort((a, b) => b - a);
    return years.join(', ');
  };

  const getCareerSpan = (athlete: Athlete) => {
    const years = athlete.participations.map(p => p.year);
    if (years.length === 0) return 'N/A';
    const sortedYears = [...years].sort((a, b) => a - b);
    const firstYear = sortedYears[0];
    const lastYear = sortedYears[sortedYears.length - 1];
    return firstYear === lastYear ? `${firstYear}` : `${firstYear}–${lastYear}`;
  };

  const getMedalTotal = (athlete: Athlete) => {
    if (!athlete.medals) return 0;
    return athlete.medals.gold + athlete.medals.silver + athlete.medals.bronze;
  };

  // Infinite-style lazy loading: detect when last card is near viewport using IntersectionObserver
  useEffect(() => {
    if (!hasMoreAthletes) {
      return;
    }

    const viewport = document.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement | null;
    if (!viewport) return;

    const sentinel = document.querySelector('[data-athlete-list-sentinel]') as HTMLElement | null;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + LOAD_MORE_COUNT, filteredAthletes.length));
        }
      },
      { root: viewport, rootMargin: '200px', threshold: 0.1 } // Start loading before reaching the bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreAthletes, filteredAthletes.length]);

  return (
    <TooltipProvider delay={200}>
      <div className="min-h-screen flex flex-col p-6 lg:p-12 bg-paper text-ink selection:bg-gold/30">
        <header className="flex flex-col md:flex-row justify-between items-baseline border-b border-ink pb-6 mb-12">
          <div className="max-w-2xl">
            <h1 className="serif text-5xl md:text-7xl font-bold tracking-tighter leading-none uppercase">
              Geography of <br />Excellence
            </h1>
            <p className="mt-6 text-[10px] font-mono uppercase tracking-[0.3em] opacity-60 flex items-center gap-3">
              <Award className="w-4 h-4 text-gold" />
              Mapping the U.S. Olympic and Paralympic provenance
            </p>
          </div>
          <div className="text-right mt-8 md:mt-0 space-y-4">
            <div className="flex flex-col items-end">
              <div className="text-4xl serif italic text-gold leading-tight tracking-tight">
                {headerTitle}
              </div>
              <div className="mono text-[11px] mt-1 uppercase tracking-widest opacity-60">
                {selectedState ? `${filteredAthletes.length} Records Found` : `Archive Size: ${athletes.length}`}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-none border border-ink/20 bg-paper/90 px-3 py-2 mono text-[8px] uppercase tracking-widest shadow-sm backdrop-blur-md hover:border-gold hover:bg-paper transition-all"
              >
                <Home className="h-3.5 w-3.5" />
                Home
              </Link>
              {isAdmin && (
                <>
                  <CSVBulkUpload isAdmin={isAdmin} onComplete={fetchAllAthletes} />
                  <AddAthleteDialog isAdmin={isAdmin} onAdd={fetchAllAthletes} />
                </>
              )}
              {user ? (
                <div className="flex items-center gap-3 bg-ink/5 p-1.5 pr-3 border border-ink/10 transition-all hover:border-gold/30 group">
                  <div className="w-6 h-6 bg-gold flex items-center justify-center mono text-[10px] font-bold text-black">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="mono text-[9px] font-bold uppercase leading-none">{user.displayName || 'Contributor'}</span>
                    <button onClick={handleLogout} className="mono text-[7px] uppercase opacity-40 hover:opacity-100 text-left transition-opacity">Sign Out</button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={handleLogin} className="rounded-none border-ink/20 mono text-[8px] h-8 uppercase tracking-widest hover:bg-gold hover:text-black hover:border-gold transition-all">
                  Sign In to Contribute
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="grid grid-cols-12 gap-8 lg:gap-10">
          <section className="col-span-12 lg:col-span-8 xl:col-span-9 relative border border-ink bg-paper overflow-hidden flex flex-col min-h-[640px] lg:min-h-[820px]">
            {/* Filter Bar */}
            <div className="border-b border-ink bg-paper/95 backdrop-blur-md z-30">
              <div className="flex items-center justify-between border-b border-ink/20 px-4 py-1.5 bg-paper">
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3 text-gold" />
                  <span className="mono text-[8px] uppercase tracking-[0.2em] font-bold opacity-60">Filters</span>
                </div>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <span className="mono text-[8px] uppercase tracking-widest opacity-40">
                      {activeFilterCount} Active
                    </span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFilterBarHidden(prev => !prev)}
                    className="h-6 rounded-none border-ink/20 mono text-[7px] uppercase tracking-widest px-2 hover:bg-gold/10"
                  >
                    {isFilterBarHidden ? 'Show' : 'Hide'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilterBar}
                    className="h-6 rounded-none border-ink/20 mono text-[7px] uppercase tracking-widest px-2 hover:bg-gold/10"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {!isFilterBarHidden && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-ink">
                {/* Time Filter Section */}
                <div className="bg-paper p-3 lg:col-span-2 border-b border-ink">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="mono text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                      <Calendar className="w-2.5 h-2.5 opacity-40" /> Time
                    </span>
                    <div className="flex bg-ink/5 p-px rounded-sm">
                      {(['Summer', 'Winter'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setSelectedSeason(s)}
                          className={`px-1.5 py-0.5 mono text-[7px] uppercase transition-all
                            ${selectedSeason === s ? 'bg-ink text-paper' : 'text-ink/40 hover:text-ink'}
                          `}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="px-0 mt-2">
                    <Slider 
                      defaultValue={yearRange}
                      max={Math.max(...ALL_YEARS[selectedSeason])}
                      min={Math.min(...ALL_YEARS[selectedSeason])}
                      step={2}
                      value={yearRange}
                      onValueChange={(val) => setYearRange(val as [number, number])}
                      className="my-1.5"
                    />
                    <div className="flex justify-between items-center mono text-[8px] opacity-40 mt-1.5">
                      <span className="text-[7px]">{yearRange[0]}</span>
                      <span className="text-gold font-bold text-[8px]">{yearRange[0] === yearRange[1] ? yearRange[0] : `${yearRange[0]}–${yearRange[1]}`}</span>
                      <span className="text-[7px]">{yearRange[1]}</span>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const years = ALL_YEARS[selectedSeason];
                          setYearRange([Math.min(...years), Math.max(...years)]);
                        }}
                        className="mono text-[7px] uppercase tracking-widest px-1.5 py-0.5 border border-ink/20 hover:bg-ink/5 rounded-sm"
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const years = ALL_YEARS[selectedSeason];
                          const sorted = [...years].sort((a, b) => b - a);
                          const maxYear = sorted[0];
                          const minYear = sorted[Math.min(2, sorted.length - 1)];
                          setYearRange([minYear, maxYear]);
                        }}
                        className="mono text-[7px] uppercase tracking-widest px-1.5 py-0.5 border border-ink/20 hover:bg-ink/5 rounded-sm"
                      >
                        Recent
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sport Filter Section */}
                <div className="bg-paper p-3 border-b border-ink border-r border-ink lg:border-r">
                  <div className="flex items-center justify-between mb-2">
                    <span className="mono text-[9px] font-bold uppercase tracking-widest opacity-60">Sport</span>
                    {selectedSports.length > 0 && (
                      <button
                        type="button"
                        onClick={clearSportFilter}
                        className="mono text-[7px] uppercase tracking-widest text-gold hover:opacity-80"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <Popover>
                    <PopoverTrigger className={cn(
                      buttonVariants({ variant: "outline" }),
                      "w-full justify-between h-8 rounded-none border-ink/20 mono text-[8px] uppercase tracking-widest px-2"
                    )}>
                      <span className="truncate text-[8px]">{sportSummary}</span>
                      <ChevronRight className="w-2.5 h-2.5 opacity-30 flex-shrink-0" />
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-0 rounded-none border-ink bg-paper shadow-2xl" align="start">
                      <div className="p-3 bg-ink text-paper flex items-center justify-between">
                        <span className="mono text-[9px] uppercase tracking-widest">Disciplines</span>
                        {selectedSports.length > 0 && (
                          <Button variant="ghost" size="sm" onClick={clearSportFilter} className="h-auto p-0 text-[8px] mono uppercase text-gold hover:text-gold/80 hover:bg-transparent">
                            Reset
                          </Button>
                        )}
                      </div>
                      <div className="max-h-[350px] overflow-y-auto">
                        {Object.entries(SPORTS_STRUCTURE).map(([season, sports]) => (
                          <div key={season} className="border-b border-ink/10">
                            <div className="bg-ink/5 px-3 py-1.5 mono text-[8px] uppercase tracking-[0.1em] opacity-40">{season} Games</div>
                            <div className="py-1.5">
                              {Object.entries(sports).map(([sport, subs]) => (
                                <div key={sport}>
                                  <button
                                    onClick={() => {
                                      toggleSportSelection(sport);
                                    }}
                                    className={cn(
                                      "w-full text-left px-3 py-1.5 mono text-[9px] uppercase flex items-center justify-between hover:bg-gold/5",
                                      selectedSports.includes(sport) ? "text-gold font-bold bg-gold/5" : "text-ink"
                                    )}
                                  >
                                    {sport}
                                    {selectedSports.includes(sport) && <Check className="w-2.5 h-2.5" />}
                                  </button>
                                  {selectedSports.includes(sport) && (
                                    <div className="bg-ink/5 border-y border-ink/10 p-2.5 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="mono text-[7px] uppercase tracking-widest opacity-40">Events</span>
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => selectAllSportEvents(sport, subs)}
                                            className="mono text-[7px] uppercase tracking-widest px-1.5 py-0.5 border border-ink/20 rounded-sm hover:bg-paper"
                                          >
                                            Select all
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => clearSportEvents(sport)}
                                            className="mono text-[7px] uppercase tracking-widest px-1.5 py-0.5 border border-ink/20 rounded-sm hover:bg-paper"
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {subs.map(sub => (
                                          <div key={sub} className="flex items-center space-x-1.5">
                                            <Checkbox 
                                              id={sub} 
                                              checked={(selectedEventSelections[sport] || []).includes(sub)}
                                              onCheckedChange={() => toggleSportEvent(sport, sub)}
                                              className="rounded-none border-ink/40 w-3 h-3"
                                            />
                                            <Label htmlFor={sub} className="mono text-[8px] uppercase cursor-pointer truncate">{sub}</Label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Demographics Filter Section */}
                <div className="bg-paper p-3 border-b border-ink">
                  <div className="flex items-center justify-between mb-2">
                    <span className="mono text-[9px] font-bold uppercase tracking-widest opacity-60">Demographics</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 items-start">
                    <div>
                      <Label className="mono text-[7px] uppercase opacity-40 block mb-1">Gender</Label>
                      <div className="flex flex-wrap gap-2.5">
                        {['Men', 'Women'].map(g => (
                          <label key={g} htmlFor={`gender-${g}`} className="flex items-center space-x-1 cursor-pointer">
                            <Checkbox 
                              id={`gender-${g}`} 
                              checked={genders.includes(g)}
                              onCheckedChange={(checked) => {
                                if (checked) setGenders(prev => [...prev, g]);
                                else if (genders.length > 1) setGenders(prev => prev.filter(x => x !== g));
                              }}
                              className="rounded-none border-ink w-3 h-3"
                            />
                            <span className="mono text-[8px] uppercase font-bold">{g}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mono text-[7px] uppercase opacity-40 block mb-1">Classification</Label>
                      <RadioGroup value={classification} onValueChange={(val) => setClassification(val as any)} className="flex flex-wrap gap-2.5">
                        <label htmlFor="class-all" className="flex items-center space-x-1 cursor-pointer">
                          <RadioGroupItem value="all" id="class-all" className="border-ink w-3 h-3" />
                          <span className="mono text-[8px] uppercase font-bold">All</span>
                        </label>
                        <label htmlFor="class-oly" className="flex items-center space-x-1 cursor-pointer">
                          <RadioGroupItem value="olympian" id="class-oly" className="border-ink w-3 h-3" />
                          <span className="mono text-[8px] uppercase text-gold font-bold">Oly</span>
                        </label>
                        <label htmlFor="class-para" className="flex items-center space-x-1 cursor-pointer">
                          <RadioGroupItem value="paralympian" id="class-para" className="border-ink text-blue-600 w-3 h-3" />
                          <span className="mono text-[8px] uppercase text-blue-600 font-bold">Para</span>
                        </label>
                      </RadioGroup>
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex justify-between items-center mb-1">
                        <Label className="mono text-[7px] uppercase opacity-40">Age</Label>
                        <span className="mono text-[8px] font-bold text-gold">{ageRange[0]}–{ageRange[1]}</span>
                      </div>
                      <Slider 
                        value={ageRange}
                        max={60}
                        min={18}
                        step={1}
                        onValueChange={(val) => setAgeRange(val as [number, number])}
                        className="py-1"
                      />
                    </div>
                  </div>
                </div>
                </div>
              )}
            </div>

            <div className="flex-1 relative group bg-[#f0f0f0]">
              <div className="absolute top-6 left-6 z-10 pointer-events-none">
              <span className="text-[10px] mono uppercase bg-ink text-paper px-2 py-1 tracking-widest leading-none">
                {selectedCity ? `City Hub` : (selectedState ? 'Regional Focus' : 'National Grid')}
              </span>
              <h2 className="serif text-3xl mt-2 tracking-tight">
                {selectedCity 
                  ? `${selectedCity.name}, ${selectedCity.state}`
                  : (selectedState ? selectedState.properties.name : 'Atlas Overview')}
              </h2>
            </div>

            {(isLoadingTopology || isFetchingAthletes) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper/80 z-20 transition-opacity duration-500">
                <RotateCcw className="w-8 h-8 animate-spin text-gold mb-4" />
                <span className="mono text-[10px] uppercase tracking-widest opacity-40">
                  {isLoadingTopology ? 'Synchronizing Atlas Data...' : 'Calibrating Athlete Records...'}
                </span>
              </div>
            )}

              {geoQuery && (
                <div className="absolute top-40 left-6 z-10 bg-paper border border-ink/20 rounded-none p-4 shadow-sm max-w-xs">
                  {isLoadingGeoStats ? (
                    <div className="flex items-center gap-2">
                      <RotateCcw className="w-4 h-4 animate-spin text-gold" />
                      <span className="mono text-[8px] uppercase tracking-widest opacity-60">Loading geo data...</span>
                    </div>
                  ) : geoStats ? (
                    <div className="space-y-2.5">
                      <div className="border-b border-ink/10 pb-2.5">
                        <div className="mono text-[7px] uppercase opacity-50 tracking-widest mb-1">Geographic Data</div>
                        <div className="serif text-sm leading-tight">{geoStats.place.display_name}</div>
                      </div>
                    
                      {geoStats.population.country != null && (
                        <div className="py-1.5">
                          <div className="flex justify-between items-center mb-1">
                            <div className="mono text-[7px] uppercase opacity-50 tracking-widest">Country Population</div>
                            <span className="mono text-[10px] font-bold text-gold">
                              {(geoStats.population.country / 1000000).toFixed(1)}M
                            </span>
                          </div>
                        </div>
                      )}

                      {geoStats.population.state && (
                        <div className="py-1.5 border-t border-ink/10">
                          <div className="flex justify-between items-center mb-1">
                            <div className="mono text-[7px] uppercase opacity-50 tracking-widest">State Population</div>
                            <span className="mono text-[10px] font-bold text-gold">
                              {(geoStats.population.state.population / 1000000).toFixed(2)}M
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="text-[7px] mono opacity-30 mt-2 pt-2 border-t border-ink/10">
                        {Object.entries(geoStats.sources)
                          .filter(([, available]) => available)
                          .map(([source]) => source)
                          .join(' • ')}
                      </div>
                    </div>
                  ) : (
                    <div className="mono text-[8px] opacity-50">Unable to fetch geo data</div>
                  )}
                </div>
              )}

            {topologyError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-paper z-20 p-8 text-center">
                <Archive className="w-12 h-12 text-ink/10 mb-6" />
                <h3 className="serif text-2xl mb-2">The atlas could not be initialized.</h3>
                <p className="mono text-[10px] uppercase opacity-40 max-w-xs mb-8 leading-relaxed">
                  The remote geospatial archive is currently unresponsive or blocked by local nodes.
                </p>
                <div className="flex flex-col gap-3">
                  <Button onClick={() => window.location.reload()} variant="outline" className="rounded-none border-ink/40 mono text-[10px] uppercase h-10 px-8">
                    Force Reconnect
                  </Button>
                  <span className="mono text-[8px] opacity-20 italic">Error Code: {topologyError}</span>
                </div>
              </div>
            )}
            
            <div className="w-full h-full relative cursor-grab active:cursor-grabbing flex items-center justify-center">
              <svg 
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`} 
                className="w-full h-full max-h-[840px]"
                preserveAspectRatio="xMidYMid meet"
              >
                <g ref={gRef}>
                  {/* States */}
                  {states.map((d: any) => {
                    const isSelected = selectedState?.id === d.id;
                    const isDwelling = dwellRegionId === d.id;
                    const count = stateCounts[d.properties.name] || 0;
                    const borderStroke = isSelected || isDwelling ? '#D4AF37' : (isDarkMode ? '#F5F5F2' : '#1A1A1A');
                    const borderWidth = isDwelling ? 3 : (isSelected ? 2 : 1);
                    
                    return (
                      <path
                        key={d.id}
                        d={path(d) || ''}
                        fill={showDensity ? stateColorScale(count) : (isDarkMode ? '#1a1a1a' : '#fbfbfb')}
                        stroke={borderStroke}
                        strokeWidth={borderWidth}
                        className={`transition-all duration-300 cursor-pointer hover:brightness-95
                          ${isDwelling ? 'filter drop-shadow-lg scale-[1.002]' : ''}
                          ${selectedState && !isSelected ? 'opacity-30' : ''}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStateClick(d);
                        }}
                        onMouseEnter={(e) => {
                          const [x, y] = d3.pointer(e, svgRef.current);
                          
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = setTimeout(() => {
                            setHoveredRegion({ name: d.properties.name, count, type: 'state' });
                            setHoverPosition({ x, y });
                          }, 500);
                          
                          if (dwellTimeoutRef.current) clearTimeout(dwellTimeoutRef.current);
                          dwellTimeoutRef.current = setTimeout(() => {
                            setDwellRegionId(d.id);
                          }, 3000);
                        }}
                        onMouseLeave={() => {
                          setHoveredRegion(null);
                          setHoverPosition(null);
                          setDwellRegionId(null);
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          if (dwellTimeoutRef.current) clearTimeout(dwellTimeoutRef.current);
                        }}
                      />
                    );
                  })}

                  {/* County layer removed — cities are primary */}

                  {/* RAW ATHLETE POINTS (debug) */}
                  <g className="athlete-points pointer-events-none" shapeRendering="geometricPrecision">
                    {filteredAthletesForMap.slice(0, 2000).map((athlete, i) => {
                      if (athlete.lat == null || athlete.lng == null) return null;
                      const latNum = Number(athlete.lat);
                      const lngNum = Number(athlete.lng);
                      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
                      const coords = projection([lngNum, latNum]);
                      if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return null;
                      return (
                        <circle
                          key={`raw-${i}-${athlete.name}`}
                          cx={coords[0]}
                          cy={coords[1]}
                          r={1.25}
                          fill="#ff6b6b"
                          opacity={0.9}
                        />
                      );
                    })}
                  </g>

                  {/* CITY BUBBLE LAYER */}
                  <g className="city-bubbles pointer-events-auto" shapeRendering="geometricPrecision">
                    {cityClusters.map((city, i) => {
                      const p = cityPositions[i];
                      if (!p || !p.coords || !Number.isFinite(p.coords[0])) return null;
                      const coordsX = p.coords[0] + (p.dx || 0);
                      const coordsY = p.coords[1] + (p.dy || 0);

                      const isSelected = selectedCity?.name === city.name && selectedCity?.state === city.state;
                      const bubbleFill = isSelected ? '#c6a831' : (isDarkMode ? '#F5F5F2' : '#1a1a1a');
                      const bubbleStroke = isDarkMode ? '#1a1a1a' : '#fff';

                      return (
                        <circle
                          key={`${city.name}-${city.state}-${i}`}
                          cx={coordsX}
                          cy={coordsY}
                          r={Math.max(2, bubbleScale(city.count) / 2)}
                          fill={bubbleFill}
                          stroke={bubbleStroke}
                          strokeWidth={0.6}
                          vectorEffect="non-scaling-stroke"
                          className="transition-colors duration-200 cursor-pointer hover:fill-gold group"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCityClick(city);
                          }}
                          onMouseEnter={(e) => {
                            const [x, y] = d3.pointer(e, svgRef.current);
                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                            setHoveredRegion({ name: city.name, count: city.count, type: 'city' });
                            setHoverPosition({ x, y });
                          }}
                          onMouseLeave={() => {
                            setHoveredRegion(null);
                            setHoverPosition(null);
                          }}
                        />
                      );
                    })}
                  </g>
                </g>
              </svg>

              {/* Global Tooltip Overlay */}
              {hoveredRegion && hoverPosition && svgRef.current && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute pointer-events-none z-50 border-ink border bg-paper text-ink shadow-sm rounded-none p-3 w-40"
                  style={(() => {
                    const svg = svgRef.current!;
                    const scaleX = svg.clientWidth / width;
                    const scaleY = svg.clientHeight / height;
                    const left = Math.max(8, Math.min(svg.clientWidth - 8 - 160, hoverPosition.x * scaleX - 80));
                    const top = Math.max(8, Math.min(svg.clientHeight - 8 - 80, hoverPosition.y * scaleY - 100));
                    return { left: `${left}px`, top: `${top}px` };
                  })()}
                >
                  <div className="mono text-[8px] uppercase tracking-widest opacity-50 mb-1">
                    {hoveredRegion.type === 'city' ? 'City Hub' : 'Region Census'}
                  </div>
                  <div className="serif text-xl leading-tight mb-1">{hoveredRegion.name}</div>
                  <div className="flex items-center gap-2 mono text-[10px] font-bold text-gold">
                    <Award className="w-3 h-3" />
                    {hoveredRegion.count} Candidates
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="absolute top-6 right-6 flex flex-col gap-px border border-ink bg-ink shadow-sm overflow-hidden">
              <Tooltip>
                <TooltipTrigger 
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "rounded-none w-8 h-8 transition-colors border-0",
                    showDensity ? 'bg-ink text-paper hover:bg-ink/90' : 'bg-paper text-ink hover:bg-gold/10'
                  )}
                  onClick={() => setShowDensity(!showDensity)}
                >
                  <Archive className={`w-4 h-4 ${showDensity ? 'animate-pulse' : ''}`} />
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-ink text-paper border-0 rounded-none text-[10px] mono uppercase tracking-widest px-3 py-1.5">
                  {showDensity ? 'Disable Density Overlay' : 'Enable Regional Density Insight'}
                </TooltipContent>
              </Tooltip>

              <div className="h-px bg-ink/20" />

              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-paper rounded-none w-8 h-8 hover:bg-gold/10 text-ink border-0"
                onClick={() => manualZoom(2)}
                title="Zoom In"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-paper rounded-none w-8 h-8 hover:bg-gold/10 text-ink border-0"
                onClick={() => manualZoom(0.5)}
                title="Zoom Out"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-paper rounded-none w-8 h-8 hover:bg-gold/10 text-ink border-0"
                onClick={resetMap}
                title="Standard View (Reset Map)"
              >
                <Home className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="bg-stone-50 rounded-none w-8 h-8 text-ink/40 border-0 cursor-default"
                title="Pan Mode Active"
              >
                <Hand className="w-4 h-4" />
              </Button>
            </div>

            <div className="absolute bottom-6 left-6 flex items-center gap-6 mono text-[10px] uppercase opacity-40 pointer-events-none">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gold"></div>
                <span>Olympic Origin</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <span>Paralympic Origin</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="col-span-12 lg:col-span-4 xl:col-span-3 border-l border-ink bg-paper overflow-hidden flex flex-col h-[640px] lg:h-[820px]">
            <div className="p-6 border-b border-ink bg-paper shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h4 className="mono text-[10px] uppercase tracking-[0.2em] font-bold">
                  {selectedCity ? 'City Listing' : (selectedState ? 'Provincial Listing' : 'Historical Sample')}
                </h4>
                <div className="mono text-[9px] opacity-40 uppercase tracking-widest">
                  {filteredAthletes.length} Records
                </div>
              </div>
              
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-30" />
                <input
                  type="text"
                  placeholder="Search athletes..."
                  value={registrySearchQuery}
                  onChange={(e) => setRegistrySearchQuery(e.target.value)}
                  className="w-full bg-paper border border-ink/10 py-2 pl-9 pr-3 mono text-[10px] uppercase focus:border-gold outline-none transition-all placeholder:italic"
                />
              </div>
            </div>

            <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 bg-ink/5">
              <div className="p-4 space-y-3 h-full min-h-0">
                {filteredAthletes.length === 0 && (
                  <div className="serif italic text-ink/40 py-12 text-center text-sm">No records matched the current selection.</div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
                  {visibleAthletes.map((athlete) => (
                    <div
                      key={athlete.id}
                      data-athlete-card
                      className="group border border-ink/10 p-3 bg-paper hover:border-gold transition-all duration-300 flex flex-col"
                    >
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h5 className="serif text-sm font-bold leading-tight truncate group-hover:text-gold transition-colors">{athlete.name}</h5>
                            <Dialog>
                              <DialogTrigger className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 border border-ink/10 bg-ink/5 text-ink/50 hover:text-gold hover:bg-gold/10 hover:border-gold/30 transition-all duration-200 shadow-sm">
                                <PlusCircle className="w-4 h-4" />
                              </DialogTrigger>
                              <DialogContent className="rounded-none border-ink bg-paper sm:max-w-lg">
                                <DialogHeader>
                                  <DialogTitle className="serif text-2xl uppercase tracking-tight">{athlete.name}</DialogTitle>
                                  <DialogDescription className="mono text-[10px] uppercase tracking-widest opacity-60">
                                    Candidate ID: {athlete.id}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-3 py-5 border-y border-ink/10">
                                  <div className="border border-ink/10 bg-ink/5 p-3">
                                    <div className="mono text-[8px] uppercase tracking-widest opacity-40 mb-1">Sport</div>
                                    <div className="serif text-base leading-tight">{athlete.sport}</div>
                                  </div>
                                  <div className="border border-ink/10 bg-ink/5 p-3">
                                    <div className="mono text-[8px] uppercase tracking-widest opacity-40 mb-1">Home</div>
                                    <div className="serif text-base leading-tight">{athlete.hometownCity}, {athlete.hometownState}</div>
                                  </div>
                                  <div className="border border-ink/10 bg-ink/5 p-3">
                                    <div className="mono text-[8px] uppercase tracking-widest opacity-40 mb-1">Participations</div>
                                    <div className="serif text-base leading-tight">{athlete.participations.length} Games</div>
                                  </div>
                                  <div className="border border-ink/10 bg-ink/5 p-3">
                                    <div className="mono text-[8px] uppercase tracking-widest opacity-40 mb-1">Career Span</div>
                                    <div className="serif text-base leading-tight">{getCareerSpan(athlete)}</div>
                                  </div>
                                  <div className="border border-ink/10 bg-ink/5 p-3">
                                    <div className="mono text-[8px] uppercase tracking-widest opacity-40 mb-1">Medals</div>
                                    <div className="serif text-base leading-tight">{getMedalTotal(athlete)} Total</div>
                                  </div>
                                  <div className="border border-ink/10 bg-ink/5 p-3">
                                    <div className="mono text-[8px] uppercase tracking-widest opacity-40 mb-1">Age</div>
                                    <div className="serif text-base leading-tight">{athlete.age ?? 'N/A'}</div>
                                  </div>
                                </div>
                                <div className="space-y-3 pt-2">
                                  <div className="flex flex-wrap gap-2">
                                    <span className={cn(
                                      "px-2 py-1 mono text-[8px] uppercase tracking-widest border",
                                      athlete.isParalympian ? "border-blue-600 text-blue-600" : "border-gold text-gold"
                                    )}>
                                      {athlete.isParalympian ? 'Paralympian' : 'Olympian'}
                                    </span>
                                    <span className="px-2 py-1 mono text-[8px] uppercase tracking-widest border border-ink/20 text-ink/60">
                                      {athlete.gender}
                                    </span>
                                    {athlete.medals && (
                                      <span className="px-2 py-1 mono text-[8px] uppercase tracking-widest border border-ink/20 text-ink/60">
                                        G{athlete.medals.gold} / S{athlete.medals.silver} / B{athlete.medals.bronze}
                                      </span>
                                    )}
                                  </div>

                                  <div>
                                    <div className="mono text-[8px] uppercase tracking-widest opacity-40 mb-2">Participation Years</div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {athlete.participations
                                        .map(p => p.year)
                                        .sort((a, b) => b - a)
                                        .map((year) => (
                                          <span key={year} className="px-2 py-1 border border-ink/10 bg-ink/5 mono text-[9px] uppercase tracking-widest">
                                            {year}
                                          </span>
                                        ))}
                                    </div>
                                  </div>

                                  {athlete.subcategories && athlete.subcategories.length > 0 && (
                                    <div>
                                      <div className="mono text-[8px] uppercase tracking-widest opacity-40 mb-2">Events</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {athlete.subcategories.map((event) => (
                                          <span key={event} className="px-2 py-1 border border-ink/10 bg-paper mono text-[9px] uppercase tracking-widest text-ink/70">
                                            {event}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>

                          <div className="mono text-[8px] uppercase tracking-tighter font-bold flex items-center gap-1 mb-1">
                            <span className={cn(
                              "px-1 py-0",
                              athlete.isParalympian ? "bg-blue-600 text-paper" : "bg-gold text-paper"
                            )}>
                              {athlete.isParalympian ? "P" : "O"}
                            </span>
                            <span className="truncate opacity-60 leading-none">{athlete.sport}</span>
                          </div>

                          <div className="mono text-[8px] uppercase tracking-widest opacity-40 truncate mb-1">
                            {athlete.hometownCity} · {athlete.hometownState}
                          </div>

                          <div className="mono text-[7px] uppercase tracking-widest opacity-50 leading-relaxed">
                            <span className="opacity-30">Years:</span> {getParticipationYears(athlete)}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-auto pt-2 border-t border-ink/5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="mono text-[7px] uppercase tracking-[0.2em] hover:text-gold transition-colors font-bold"
                          onClick={() => {
                            const coords = projection([athlete.lng, athlete.lat]);
                            if (coords && svgRef.current) {
                              const svg = d3.select(svgRef.current); 
                              svg.transition()
                                .duration(1000)
                                .ease(d3.easeCubicInOut)
                                .call(
                                  d3.zoom<SVGSVGElement, unknown>().transform as any,
                                  d3.zoomIdentity.translate(width/2 - 25 * coords[0], height/2 - 25 * coords[1]).scale(25)
                                );
                            }
                          }}
                        >
                          LOCATE
                        </button>
                        <div className="flex gap-0.5">
                           {athlete.participations.slice(0, 2).map((p, idx) => (
                             <span key={idx} className="mono text-[7px] opacity-30">{p.year}</span>
                           ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {hasMoreAthletes && <div data-athlete-list-sentinel className="h-8 w-full" />}
              </div>
            </ScrollArea>

            {filteredAthletes.length > 0 && (
              <div className="p-4 border-t border-ink bg-paper flex items-center justify-between shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-10">
                <div className="mono text-[8px] opacity-40 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="opacity-50">Showing</span>
                  <span className="text-ink font-bold">{Math.min(visibleAthletes.length, filteredAthletes.length)}</span>
                  <span className="opacity-20">/</span>
                  <span className="text-ink font-bold">{filteredAthletes.length}</span>
                  <span className="opacity-50">Candidates</span>
                </div>
                {hasMoreAthletes && (
                  <span className="mono text-[8px] uppercase tracking-[0.2em] text-gold">Scroll Down To Load More</span>
                )}
              </div>
            )}

          </aside>
        </main>

        {/* METRICS SECTION */}
        <section className="mt-12 border border-ink bg-paper overflow-hidden flex flex-col">
          <header className="p-4 border-b border-ink bg-paper flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart2 className="w-5 h-5 text-gold" />
              <h3 className="serif text-xl uppercase tracking-tight">Regional Metrics Analytics</h3>
            </div>
            
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger className="rounded-none h-8 mono text-[9px] uppercase tracking-widest border-ink/20 hover:bg-gold/5 transition-all inline-flex items-center justify-center px-2.5 border bg-background text-foreground">
                  <Settings className="w-3 h-3 mr-2 opacity-50" />
                  Configure Display
                </PopoverTrigger>
                <PopoverContent className="w-80 rounded-none border-ink bg-paper p-0 shadow-2xl" align="end">
                  <div className="p-4 bg-ink text-paper flex items-center justify-between mb-2">
                    <span className="mono text-[10px] uppercase tracking-widest">Metric Selection</span>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedMetrics([])} className="h-auto p-0 text-[10px] mono uppercase text-gold hover:text-gold/80 hover:bg-transparent">
                      Clear All
                    </Button>
                  </div>
                  <div className="p-4 space-y-6 max-h-[400px] overflow-y-auto">
                    {METRIC_CATEGORIES.map(cat => (
                      <div key={cat.id} className="space-y-2">
                        <h4 className="mono text-[8px] uppercase tracking-widest opacity-30 border-b border-ink/10 pb-1">{cat.label}</h4>
                        <div className="space-y-1">
                          {AVAILABLE_METRICS.filter(m => m.category === cat.id).map(metric => (
                            <div key={metric.id} className="flex items-start space-x-3 p-2 hover:bg-gold/5 transition-colors group cursor-pointer" onClick={() => {
                              setSelectedMetrics(prev => 
                                prev.includes(metric.id) 
                                  ? prev.filter(id => id !== metric.id)
                                  : [...prev, metric.id]
                              );
                            }}>
                              <Checkbox 
                                id={`metric-${metric.id}`}
                                checked={selectedMetrics.includes(metric.id)}
                                className="rounded-none border-ink/40 w-4 h-4 mt-0.5"
                              />
                              <div className="space-y-1">
                                <Label htmlFor={`metric-${metric.id}`} className="mono text-[10px] uppercase font-bold cursor-pointer transition-colors group-hover:text-gold">{metric.label}</Label>
                                <p className="mono text-[8px] opacity-40 leading-normal">{metric.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-ink/5 border-t border-ink/10 flex justify-end">
                    <span className="mono text-[8px] opacity-40 uppercase">{selectedMetrics.length} Active Selectors</span>
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                onClick={calculateMetrics}
                disabled={isCalculating || selectedMetrics.length === 0}
                className={cn(
                  "rounded-none h-8 mono text-[9px] uppercase tracking-widest transition-all",
                  isCalculating ? "bg-ink/50" : "bg-ink hover:bg-gold text-paper hover:text-black"
                )}
              >
                {isCalculating ? (
                  <RotateCcw className="w-3 h-3 mr-2 animate-spin" />
                ) : (
                  <Calculator className="w-3 h-3 mr-2" />
                )}
                {calculatedMetrics ? 'Recalculate Output' : 'Find Now'}
              </Button>
            </div>
          </header>

          <div className="min-h-[160px] relative">
            {!calculatedMetrics && !isCalculating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center">
                <div className="serif italic text-ink/20 text-3xl mb-4">Historical analysis engine idle...</div>
                <p className="mono text-[9px] uppercase tracking-[0.3em] opacity-40 max-w-md">
                  Select your desired metrics and initiate calculation to view data for <span className="text-ink font-bold">{selectedCity ? selectedCity.name : (selectedState ? selectedState.properties.name : 'The United States')}</span>
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="bg-paper px-6 py-4 border-b border-ink/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="mono text-[10px] uppercase opacity-40 font-bold">Snapshot Context:</span>
                    <div className="flex items-center gap-2">
                      <span className="serif italic text-lg">{calculationScope?.state}</span>
                      {calculationScope?.city && (
                          <>
                            <ChevronRight className="w-3 h-3 opacity-20" />
                            <span className="serif italic text-lg">{calculationScope.city}</span>
                          </>
                        )}
                    </div>
                  </div>
                  <div className="mono text-[8px] uppercase tracking-tighter opacity-30">
                    Calculated at {new Date().toLocaleTimeString()}
                  </div>
                </div>

                <div className={cn(
                  "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-px bg-ink border-b border-ink transition-opacity duration-300",
                  isCalculating ? "opacity-30" : "opacity-100"
                )}>
                {selectedMetrics.map(id => {
                  const label = AVAILABLE_METRICS.find(m => m.id === id)?.label;
                  const value = calculatedMetrics?.[id];
                  
                  return (
                    <div key={id} className="bg-paper p-6 flex flex-col group/metric">
                      <span className="mono text-[9px] uppercase tracking-[0.2em] opacity-40 mb-4 h-8 flex items-start group-hover/metric:opacity-100 transition-opacity">
                        {label}
                      </span>
                      
                      <div className="flex-1 flex flex-col justify-end">
                        {id === 'split_type' && value ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-end">
                              <div className="flex flex-col">
                                <span className="serif text-2xl font-bold">{value.olympic}</span>
                                <span className="mono text-[8px] uppercase opacity-40 mt-1">Olympic</span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="serif text-2xl font-bold">{value.para}</span>
                                <span className="mono text-[8px] uppercase opacity-40 mt-1">Paralympic</span>
                              </div>
                            </div>
                            <div className="h-1 w-full flex bg-ink/5">
                              <div 
                                className="h-full bg-ink transition-all duration-1000" 
                                style={{ width: `${(value.olympic / (value.olympic + value.para || 1)) * 100}%` }} 
                              />
                              <div 
                                className="h-full bg-gold transition-all duration-1000" 
                                style={{ width: `${(value.para / (value.olympic + value.para || 1)) * 100}%` }} 
                              />
                            </div>
                          </div>
                        ) : id === 'summer_winter' && value ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-end">
                              <div className="flex flex-col">
                                <span className="serif text-2xl font-bold">{value.summer}</span>
                                <span className="mono text-[8px] uppercase opacity-40 mt-1">Summer</span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="serif text-2xl font-bold">{value.winter}</span>
                                <span className="mono text-[8px] uppercase opacity-40 mt-1">Winter</span>
                              </div>
                            </div>
                            <div className="h-1 w-full flex bg-ink/5">
                              <div 
                                className="h-full bg-orange-500 transition-all duration-1000" 
                                style={{ width: `${(value.summer / (value.summer + value.winter || 1)) * 100}%` }} 
                              />
                              <div 
                                className="h-full bg-blue-400 transition-all duration-1000" 
                                style={{ width: `${(value.winter / (value.summer + value.winter || 1)) * 100}%` }} 
                              />
                            </div>
                          </div>
                        ) : id === 'medal_split' && value ? (
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                               <span className="serif text-2xl font-bold text-[#FFD700]">{value.g}</span>
                               <span className="mono text-[7px] uppercase opacity-40">Gold</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="serif text-2xl font-bold text-[#C0C0C0]">{value.s}</span>
                               <span className="mono text-[7px] uppercase opacity-40">Silver</span>
                            </div>
                            <div className="flex flex-col">
                               <span className="serif text-2xl font-bold text-[#CD7F32]">{value.b}</span>
                               <span className="mono text-[7px] uppercase opacity-40">Bronze</span>
                            </div>
                          </div>
                        ) : id === 'top_disciplines' && value ? (
                          <div className="space-y-2">
                            {value.map(([sport, count]: [string, number], idx: number) => (
                              <div key={sport} className="flex items-center justify-between">
                                <span className="mono text-[9px] uppercase truncate flex items-center gap-2">
                                  <span className="opacity-20">{idx + 1}</span>
                                  {sport}
                                </span>
                                <span className="mono text-[9px] font-bold text-gold">{count}</span>
                              </div>
                            ))}
                          </div>
                        ) : id === 'elevation' && value ? (
                          <div className="space-y-4">
                             <div className="flex items-center gap-2 mb-2">
                               <Mountain className="w-4 h-4 text-ink/20" />
                               <span className="serif italic text-xl">{value.avg} ft <span className="mono text-[8px] uppercase not-italic opacity-40 ml-1">avg</span></span>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                               <div className="flex flex-col border-l border-ink/10 pl-3">
                                 <span className="mono text-[10px] font-bold">{value.min}</span>
                                 <span className="mono text-[7px] uppercase opacity-40">Lowest Point</span>
                               </div>
                               <div className="flex flex-col border-l border-ink/10 pl-3">
                                 <span className="mono text-[10px] font-bold">{value.max}</span>
                                 <span className="mono text-[7px] uppercase opacity-40">Highest Peak</span>
                               </div>
                             </div>
                          </div>
                        ) : id === 'climate' && value ? (
                          <div className="space-y-4">
                             <div className="flex items-center justify-between mb-2">
                               <div className="flex items-center gap-2">
                                 <Thermometer className="w-3 h-3 text-gold" />
                                 <span className="serif italic text-xl">{value.avgTemp}°F</span>
                               </div>
                               <div className="flex items-center gap-2">
                                 <Cloud className="w-3 h-3 text-ink/20" />
                                 <span className="mono text-[10px] font-bold">{value.precipitation}" <span className="text-[7px] font-normal opacity-40">ANNUAL</span></span>
                               </div>
                             </div>
                             <div className="h-12 w-full flex items-end gap-1">
                                {[...Array(12)].map((_, i) => {
                                  // Simplified monthly viz
                                  const h = 20 + Math.abs(Math.sin((i / 11) * Math.PI)) * 80;
                                  return (
                                    <div key={i} className="flex-1 bg-gold/20 relative group/bar">
                                      <div className="absolute bottom-0 left-0 right-0 bg-gold transition-all" style={{ height: `${h}%` }}></div>
                                    </div>
                                  );
                                })}
                             </div>
                             <div className="flex justify-between mono text-[7px] opacity-30 mt-1 uppercase tracking-tighter">
                               <span>Jan</span>
                               <span>Dec</span>
                             </div>
                          </div>
                        ) : id === 'first_last' && value !== 'N/A' ? (
                           <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                <span className="serif text-2xl font-bold">{value.start}</span>
                                <span className="mono text-[8px] uppercase opacity-40">Debut</span>
                              </div>
                              <ChevronRight className="w-4 h-4 opacity-10" />
                              <div className="flex flex-col">
                                <span className="serif text-2xl font-bold">{value.end}</span>
                                <span className="mono text-[8px] uppercase opacity-40">Recent</span>
                              </div>
                           </div>
                        ) : (
                          <div className={cn(
                            "serif text-4xl font-bold tracking-tighter",
                            id === 'trend' && value === 'Rising' ? "text-green-600" : 
                            id === 'trend' && value === 'Declining' ? "text-red-600" : ""
                          )}>
                            {value ?? '—'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
          
          <div className="bg-ink/5 px-6 py-3 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="mono text-[8px] uppercase tracking-widest opacity-40">Static Engine Status — Ready</span>
              </div>
              <Separator orientation="vertical" className="h-3 bg-ink/10" />
              <div className="mono text-[8px] uppercase tracking-widest opacity-40">
                Scope: {selectedCity ? 'City Precision' : (selectedState ? 'Statewide Aggregate' : 'National Overview')}
              </div>
            </div>
            
            <div className="mono text-[8px] uppercase tracking-widest opacity-40 italic">
              Computational calculations are derived from active Filter Workspace.
            </div>
          </div>
        </section>

        <footer className="mt-12 border-t border-ink/20 py-16 px-12 bg-paper/60 backdrop-blur-sm">
          <div className="max-w-screen-2xl mx-auto grid grid-cols-12 gap-12">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-gold" />
                <h4 className="serif text-xl tracking-tight">The Heritage Index</h4>
              </div>
              <p className="mono text-[10px] uppercase tracking-wide opacity-50 leading-relaxed">
                A digital registry dedicated to preserving the geographical and biographical legacy of American Olympic and Paralympic candidates. This platform serves as a primary visualization tool for regional recruitment and historical distribution.
              </p>
              <div className="flex gap-4">
                <div className="p-2 border border-ink/10 bg-paper">
                  <div className="mono text-[8px] opacity-40 mb-1">Status</div>
                  <div className="mono text-[10px] font-bold text-green-600">Online</div>
                </div>
                <div className="p-2 border border-ink/10 bg-paper">
                  <div className="mono text-[8px] opacity-40 mb-1">Uptime</div>
                  <div className="mono text-[10px] font-bold">99.9%</div>
                </div>
              </div>
            </div>

            <div className="col-span-6 lg:col-span-2 space-y-4">
              <h5 className="mono text-[9px] uppercase tracking-[0.2em] font-bold opacity-40">Resources</h5>
              <ul className="space-y-2 mono text-[10px] uppercase tracking-widest">
                <li><a href="#" className="hover:text-gold transition-colors">Data API</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Methodology</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Archival API</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Case Studies</a></li>
              </ul>
            </div>

            <div className="col-span-6 lg:col-span-2 space-y-4">
              <h5 className="mono text-[9px] uppercase tracking-[0.2em] font-bold opacity-40">Governance</h5>
              <ul className="space-y-2 mono text-[10px] uppercase tracking-widest">
                <li><a href="#" className="hover:text-gold transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Ethics</a></li>
                <li><a href="#" className="hover:text-gold transition-colors">Contact</a></li>
              </ul>
            </div>

            <div className="col-span-12 lg:col-span-4 space-y-6">
              <h5 className="mono text-[9px] uppercase tracking-[0.2em] font-bold opacity-40">System Metadata</h5>
              <div className="space-y-3 bg-ink p-4 text-paper/50 mono text-[9px] uppercase tracking-widest leading-none">
                <div className="flex justify-between">
                  <span>Last Rebuild</span>
                  <span className="text-paper">25-APR-2026</span>
                </div>
                <div className="flex justify-between border-t border-paper/10 pt-3">
                  <span>Record Count</span>
                  <span className="text-paper">
                    {isFetchingAthletes ? 'Loading Athletes...' : 
                     isGeocodingAthletes ? 'Geocoding Locations...' :
                     athletes.length > 0 ? athletes.length : '0'} Verified
                  </span>
                </div>
                {locationCoverage.withCoordinates > 0 && (
                  <div className="flex justify-between border-t border-paper/10 pt-3">
                    <span>Location Coverage</span>
                    <span className="text-paper">{locationCoverage.coverage}% ({locationCoverage.withCoordinates} mapped)</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-paper/10 pt-3">
                  <span>Region Mapping</span>
                  <span className="text-paper">City-Level</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="max-w-screen-2xl mx-auto mt-16 pt-8 border-t border-ink/10 flex flex-wrap justify-between items-center gap-4">
            <div className="mono text-[8px] uppercase tracking-[0.3em] opacity-30">
              © 2026 Heritage Administration Council. Digital Fingerprint: USOPC-H3-X92.
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-gold rounded-full" />
              <div className="mono text-[8px] uppercase tracking-widest opacity-40">Secure Archival Access Node #7</div>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
