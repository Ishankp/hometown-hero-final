import { collection, query, getDocs, where, limit, startAfter, orderBy, QueryConstraint, QueryDocumentSnapshot, doc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Athlete } from '../types';

// ============================================================================
// ATHLETE FETCHING FUNCTIONS
// ============================================================================

/**
 * Fetch all athletes from Firestore
 */
export async function fetchAllAthletes(): Promise<Athlete[]> {
  try {
    const athletesCollection = collection(db, 'athletes');
    const querySnapshot = await getDocs(athletesCollection);
    
    const athletes: Athlete[] = [];
    querySnapshot.forEach((doc) => {
      athletes.push(doc.data() as Athlete);
    });
    
    console.log(`Loaded ${athletes.length} athletes from Firestore`);
    return athletes;
  } catch (error) {
    console.error('Error fetching athletes from Firestore:', error);
    return [];
  }
}

/**
 * Fetch athletes by sport
 */
export async function fetchAthletesBySport(sport: string): Promise<Athlete[]> {
  try {
    const athletesCollection = collection(db, 'athletes');
    const q = query(athletesCollection, where('sport', '==', sport));
    const querySnapshot = await getDocs(q);
    
    const athletes: Athlete[] = [];
    querySnapshot.forEach((doc) => {
      athletes.push(doc.data() as Athlete);
    });
    
    return athletes;
  } catch (error) {
    console.error(`Error fetching athletes by sport (${sport}):`, error);
    return [];
  }
}

/**
 * Fetch athletes by hometown state
 */
export async function fetchAthletesByState(state: string): Promise<Athlete[]> {
  try {
    const athletesCollection = collection(db, 'athletes');
    const q = query(athletesCollection, where('hometownState', '==', state));
    const querySnapshot = await getDocs(q);
    
    const athletes: Athlete[] = [];
    querySnapshot.forEach((doc) => {
      athletes.push(doc.data() as Athlete);
    });
    
    return athletes;
  } catch (error) {
    console.error(`Error fetching athletes by state (${state}):`, error);
    return [];
  }
}

/**
 * Search athletes by name (client-side filtering)
 */
export async function searchAthletesByName(query: string): Promise<Athlete[]> {
  try {
    const allAthletes = await fetchAllAthletes();
    const lowerQuery = query.toLowerCase();
    return allAthletes.filter((athlete) =>
      athlete.name.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Error searching athletes by name:', error);
    return [];
  }
}

// ============================================================================
// EXISTING ERROR HANDLING AND CRUD FUNCTIONS
// ============================================================================

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  SEED = 'seed'
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const ATHLETES_COLLECTION = 'athletes';

export async function getAthletes(filters: { 
  state?: string | null; 
  sport?: string | null;
  isParalympian?: boolean | null;
} = {}, pageLimit: number = 1000, lastDoc?: QueryDocumentSnapshot) {
  const constraints: QueryConstraint[] = [];

  if (filters.state) constraints.push(where('hometownState', '==', filters.state));
  if (filters.sport && filters.sport !== 'All Sports') {
    const baseSport = filters.sport.replace(/^Para\s+/, '');
    constraints.push(where('sport', '==', filters.sport));
  }
  if (filters.isParalympian !== undefined && filters.isParalympian !== null) {
    constraints.push(where('isParalympian', '==', filters.isParalympian));
  }

  constraints.push(orderBy('name'));
  constraints.push(limit(pageLimit));
  
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, ATHLETES_COLLECTION), ...constraints);

  try {
    const snapshot = await getDocs(q);
    const athletes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Athlete));
    return {
      athletes,
      lastVisible: snapshot.docs[snapshot.docs.length - 1] || null
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, ATHLETES_COLLECTION);
    return { athletes: [], lastVisible: null };
  }
}

export async function addAthlete(athlete: Omit<Athlete, 'id'>) {
  const athleteId = crypto.randomUUID();
  const docRef = doc(db, ATHLETES_COLLECTION, athleteId);
  const data = { ...athlete, id: athleteId };
  
  try {
    await setDoc(docRef, data);
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${ATHLETES_COLLECTION}/${athleteId}`);
  }
}

export async function updateAthlete(id: string, updates: Partial<Athlete>) {
  const docRef = doc(db, ATHLETES_COLLECTION, id);
  try {
    await updateDoc(docRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${ATHLETES_COLLECTION}/${id}`);
  }
}

export async function deleteAthlete(id: string) {
  const docRef = doc(db, ATHLETES_COLLECTION, id);
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ATHLETES_COLLECTION}/${id}`);
  }
}

export async function seedDatabase(athletes: Athlete[]) {
  try {
    // Firestore batch limits are 500 operations
    const chunks = [];
    for (let i = 0; i < athletes.length; i += 500) {
      chunks.push(athletes.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(athlete => {
        const docRef = doc(db, ATHLETES_COLLECTION, athlete.id);
        batch.set(docRef, athlete);
      });
      await batch.commit();
    }
    console.log('Database seeded successfully');
  } catch (error) {
    handleFirestoreError(error, OperationType.SEED, ATHLETES_COLLECTION);
  }
}
