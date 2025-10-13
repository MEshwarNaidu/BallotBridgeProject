// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDucAk3y9t2OzDNdwSuZSSsnB_tqutGQkQ",
  authDomain: "ballotbridge-7f5b9.firebaseapp.com",
  projectId: "ballotbridge-7f5b9",
  storageBucket: "ballotbridge-7f5b9.firebasestorage.app",
  messagingSenderId: "494785593595",
  appId: "1:494785593595:web:a6d5d5c3cc733ea002305e",
  measurementId: "G-6RSMJQ708T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);

// Export the app instance
export default app;

// Network status checker
export const checkNetworkStatus = () => {
  return navigator.onLine;
};

// Firebase connection retry logic
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      if (error.code === 'auth/network-request-failed' || error.code === 'unavailable') {
        if (i === maxRetries - 1) throw error;
        console.warn(`Network error, retrying in ${delay}ms... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
};

// Types for our application
export type UserRole = 'admin' | 'candidate' | 'voter';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Election {
  id: string;
  title: string;
  description: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  start_date: string;
  end_date: string;
  allowedEmailFormat?: string;
  positions: string[];
  maxCandidates?: number;
  maxVoters?: number;
  voterList?: string[]; // Array of user IDs who can vote
  candidateList?: string[]; // Array of user IDs who can be candidates
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  election_id: string;
  user_id: string;
  name: string;
  age: number;
  phone: string;
  position: string;
  bio: string;
  manifesto: string;
  imageURL?: string;
  documentsURL?: string[];
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface Vote {
  id: string;
  election_id: string;
  candidate_id: string;
  voter_id: string;
  created_at: string;
}

export interface VoterRecord {
  id: string;
  election_id: string;
  user_id: string;
  hasVoted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ElectionStats {
  totalVoters: number;
  totalVotes: number;
  pendingVotes: number;
  candidateResults: {
    candidateId: string;
    candidateName: string;
    votes: number;
    percentage: number;
  }[];
}
