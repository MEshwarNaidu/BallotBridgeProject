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
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  election_id: string;
  user_id: string;
  name: string;
  bio: string;
  manifesto: string;
  status: 'pending' | 'approved' | 'rejected';
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
