import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db, Election, Candidate, Vote, User } from './firebase';

// Elections Service
export const electionsService = {
  // Get all elections
  async getAllElections(): Promise<Election[]> {
    try {
      const electionsRef = collection(db, 'elections');
      const q = query(electionsRef, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        start_date: doc.data().start_date?.toDate?.()?.toISOString() || new Date().toISOString(),
        end_date: doc.data().end_date?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Election[];
    } catch (error) {
      console.error('Error fetching elections:', error);
      throw error;
    }
  },

  // Get active elections
  async getActiveElections(): Promise<Election[]> {
    try {
      const electionsRef = collection(db, 'elections');
      const q = query(electionsRef, where('status', '==', 'active'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        start_date: doc.data().start_date?.toDate?.()?.toISOString() || new Date().toISOString(),
        end_date: doc.data().end_date?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Election[];
    } catch (error) {
      console.error('Error fetching active elections:', error);
      throw error;
    }
  },

  // Get election by ID
  async getElectionById(id: string): Promise<Election | null> {
    try {
      const electionRef = doc(db, 'elections', id);
      const electionSnap = await getDoc(electionRef);
      
      if (electionSnap.exists()) {
        const data = electionSnap.data();
        return {
          id: electionSnap.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          start_date: data.start_date?.toDate?.()?.toISOString() || new Date().toISOString(),
          end_date: data.end_date?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as Election;
      }
      return null;
    } catch (error) {
      console.error('Error fetching election:', error);
      throw error;
    }
  },

  // Create new election
  async createElection(electionData: Omit<Election, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const electionsRef = collection(db, 'elections');
      const docRef = await addDoc(electionsRef, {
        ...electionData,
        start_date: Timestamp.fromDate(new Date(electionData.start_date)),
        end_date: Timestamp.fromDate(new Date(electionData.end_date)),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating election:', error);
      throw error;
    }
  },

  // Update election
  async updateElection(id: string, updates: Partial<Election>): Promise<void> {
    try {
      const electionRef = doc(db, 'elections', id);
      const updateData: any = {
        ...updates,
        updated_at: serverTimestamp(),
      };
      
      if (updates.start_date) {
        updateData.start_date = Timestamp.fromDate(new Date(updates.start_date));
      }
      if (updates.end_date) {
        updateData.end_date = Timestamp.fromDate(new Date(updates.end_date));
      }
      
      await updateDoc(electionRef, updateData);
    } catch (error) {
      console.error('Error updating election:', error);
      throw error;
    }
  },

  // Delete election
  async deleteElection(id: string): Promise<void> {
    try {
      const electionRef = doc(db, 'elections', id);
      await deleteDoc(electionRef);
    } catch (error) {
      console.error('Error deleting election:', error);
      throw error;
    }
  }
};

// Candidates Service
export const candidatesService = {
  // Get candidates for an election
  async getCandidatesByElection(electionId: string): Promise<Candidate[]> {
    try {
      const candidatesRef = collection(db, 'candidates');
      const q = query(candidatesRef, where('election_id', '==', electionId), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Candidate[];
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw error;
    }
  },

  // Get candidate by ID
  async getCandidateById(id: string): Promise<Candidate | null> {
    try {
      const candidateRef = doc(db, 'candidates', id);
      const candidateSnap = await getDoc(candidateRef);
      
      if (candidateSnap.exists()) {
        const data = candidateSnap.data();
        return {
          id: candidateSnap.id,
          ...data,
          created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          updated_at: data.updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as Candidate;
      }
      return null;
    } catch (error) {
      console.error('Error fetching candidate:', error);
      throw error;
    }
  },

  // Apply as candidate
  async applyAsCandidate(candidateData: Omit<Candidate, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    try {
      const candidatesRef = collection(db, 'candidates');
      const docRef = await addDoc(candidatesRef, {
        ...candidateData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error applying as candidate:', error);
      throw error;
    }
  },

  // Update candidate status
  async updateCandidateStatus(id: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
    try {
      const candidateRef = doc(db, 'candidates', id);
      await updateDoc(candidateRef, {
        status,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating candidate status:', error);
      throw error;
    }
  },

  // Get pending candidates
  async getPendingCandidates(): Promise<Candidate[]> {
    try {
      const candidatesRef = collection(db, 'candidates');
      const q = query(candidatesRef, where('status', '==', 'pending'), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Candidate[];
    } catch (error) {
      console.error('Error fetching pending candidates:', error);
      throw error;
    }
  }
};

// Votes Service
export const votesService = {
  // Cast a vote
  async castVote(voteData: Omit<Vote, 'id' | 'created_at'>): Promise<string> {
    try {
      // Check if user has already voted in this election
      const hasVoted = await this.hasUserVoted(voteData.election_id, voteData.voter_id);
      if (hasVoted) {
        throw new Error('You have already voted in this election');
      }

      const votesRef = collection(db, 'votes');
      const docRef = await addDoc(votesRef, {
        ...voteData,
        created_at: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  },

  // Check if user has voted in an election
  async hasUserVoted(electionId: string, voterId: string): Promise<boolean> {
    try {
      const votesRef = collection(db, 'votes');
      const q = query(votesRef, where('election_id', '==', electionId), where('voter_id', '==', voterId));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking vote status:', error);
      throw error;
    }
  },

  // Get votes for an election
  async getVotesByElection(electionId: string): Promise<Vote[]> {
    try {
      const votesRef = collection(db, 'votes');
      const q = query(votesRef, where('election_id', '==', electionId), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as Vote[];
    } catch (error) {
      console.error('Error fetching votes:', error);
      throw error;
    }
  },

  // Get vote count for a candidate
  async getVoteCountForCandidate(candidateId: string): Promise<number> {
    try {
      const votesRef = collection(db, 'votes');
      const q = query(votesRef, where('candidate_id', '==', candidateId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error fetching vote count:', error);
      throw error;
    }
  },

  // Get election results
  async getElectionResults(electionId: string): Promise<{ candidateId: string; votes: number; candidateName: string }[]> {
    try {
      const candidates = await candidatesService.getCandidatesByElection(electionId);
      const results = await Promise.all(
        candidates.map(async (candidate) => {
          const votes = await this.getVoteCountForCandidate(candidate.id);
          return {
            candidateId: candidate.id,
            votes,
            candidateName: candidate.name,
          };
        })
      );
      
      return results.sort((a, b) => b.votes - a.votes);
    } catch (error) {
      console.error('Error fetching election results:', error);
      throw error;
    }
  }
};

// Users Service
export const usersService = {
  // Get all users
  async getAllUsers(): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as User[];
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Get users by role
  async getUsersByRole(role: 'admin' | 'candidate' | 'voter'): Promise<User[]> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', role), orderBy('created_at', 'desc'));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as User[];
    } catch (error) {
      console.error('Error fetching users by role:', error);
      throw error;
    }
  },

  // Update user profile
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
};
