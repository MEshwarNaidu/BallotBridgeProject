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
  Timestamp,
  writeBatch,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, Election, Candidate, Vote, User, VoterRecord, ElectionStats, withRetry, checkNetworkStatus } from './firebase';

// Elections Service
export const electionsService = {
  // Get all elections
  async getAllElections(): Promise<Election[]> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      return await withRetry(async () => {
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
      });
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
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      return await withRetry(async () => {
        const electionsRef = collection(db, 'elections');
        const docRef = await addDoc(electionsRef, {
          ...electionData,
          start_date: Timestamp.fromDate(new Date(electionData.start_date)),
          end_date: Timestamp.fromDate(new Date(electionData.end_date)),
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
        console.log('Election created successfully:', docRef.id);
        return docRef.id;
      });
    } catch (error) {
      console.error('Error creating election:', error);
      throw error;
    }
  },

  // Delete election
  async deleteElection(electionId: string): Promise<void> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      await withRetry(async () => {
        const electionRef = doc(db, 'elections', electionId);
        await deleteDoc(electionRef);
        console.log('Election deleted successfully:', electionId);
      });
    } catch (error) {
      console.error('Error deleting election:', error);
      throw error;
    }
  },

  // Get upcoming elections
  async getUpcomingElections(): Promise<Election[]> {
    try {
      const now = new Date();
      const electionsRef = collection(db, 'elections');
      const q = query(
        electionsRef, 
        where('start_date', '>', Timestamp.fromDate(now)),
        orderBy('start_date', 'asc')
      );
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
      console.error('Error fetching upcoming elections:', error);
      throw error;
    }
  },

  // Get elections by status
  async getElectionsByStatus(status: 'upcoming' | 'active' | 'completed' | 'cancelled'): Promise<Election[]> {
    try {
      const electionsRef = collection(db, 'elections');
      const q = query(electionsRef, where('status', '==', status), orderBy('created_at', 'desc'));
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
      console.error('Error fetching elections by status:', error);
      throw error;
    }
  },

  // Update election status based on dates
  async updateElectionStatus(electionId: string): Promise<void> {
    try {
      const election = await this.getElectionById(electionId);
      if (!election) return;

      const now = new Date();
      const startDate = new Date(election.start_date);
      const endDate = new Date(election.end_date);

      let newStatus: 'upcoming' | 'active' | 'completed' | 'cancelled';
      
      if (now < startDate) {
        newStatus = 'upcoming';
      } else if (now >= startDate && now <= endDate) {
        newStatus = 'active';
      } else {
        newStatus = 'completed';
      }

      if (newStatus !== election.status) {
        await this.updateElection(electionId, { status: newStatus });
      }
    } catch (error) {
      console.error('Error updating election status:', error);
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
  async updateCandidateStatus(id: string, status: 'pending' | 'approved' | 'rejected', rejectionReason?: string): Promise<void> {
    try {
      const candidateRef = doc(db, 'candidates', id);
      const updateData: any = {
        status,
        updated_at: serverTimestamp(),
      };
      
      if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }
      
      await updateDoc(candidateRef, updateData);
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
  // Cast a vote with vote limit system
  async castVote(voteData: Omit<Vote, 'id' | 'created_at'>): Promise<string> {
    try {
      // Check if user has already voted in this election
      const hasVoted = await this.hasUserVoted(voteData.election_id, voteData.voter_id);
      if (hasVoted) {
        throw new Error('You have already voted in this election');
      }

      // Use batch write to ensure atomicity
      const batch = writeBatch(db);
      
      // Add the vote
      const votesRef = collection(db, 'votes');
      const voteDocRef = doc(votesRef);
      batch.set(voteDocRef, {
        ...voteData,
        created_at: serverTimestamp(),
      });

      // Mark user as voted in voter records
      const voterRecordRef = doc(db, 'elections', voteData.election_id, 'voters', voteData.voter_id);
      batch.set(voterRecordRef, {
        election_id: voteData.election_id,
        user_id: voteData.voter_id,
        hasVoted: true,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      await batch.commit();
      return voteDocRef.id;
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  },

  // Check if user has voted in an election
  async hasUserVoted(electionId: string, voterId: string): Promise<boolean> {
    try {
      // First check voter records
      const voterRecordRef = doc(db, 'elections', electionId, 'voters', voterId);
      const voterRecordSnap = await getDoc(voterRecordRef);
      
      if (voterRecordSnap.exists()) {
        const data = voterRecordSnap.data();
        return data.hasVoted === true;
      }

      // Fallback to checking votes collection
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
  },

  subscribeToUsers(callback: (users: User[]) => void): Unsubscribe {
    const usersRef = collection(db, 'users');
    return onSnapshot(usersRef, (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as User[];
      callback(users);
    });
  }
};

// File Upload Service
export const fileUploadService = {
  // Upload candidate image
  async uploadCandidateImage(file: File, candidateId: string): Promise<string> {
    try {
      const fileRef = ref(storage, `candidates/${candidateId}/image/${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Error uploading candidate image:', error);
      throw error;
    }
  },

  // Upload candidate documents
  async uploadCandidateDocuments(files: File[], candidateId: string): Promise<string[]> {
    try {
      const uploadPromises = files.map(async (file) => {
        const fileRef = ref(storage, `candidates/${candidateId}/documents/${file.name}`);
        const snapshot = await uploadBytes(fileRef, file);
        return await getDownloadURL(snapshot.ref);
      });
      
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error uploading candidate documents:', error);
      throw error;
    }
  },

  // Delete file from storage
  async deleteFile(fileURL: string): Promise<void> {
    try {
      const fileRef = ref(storage, fileURL);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
};

// Voter Management Service
export const voterManagementService = {
  // Add voter to election
  async addVoterToElection(electionId: string, userId: string): Promise<void> {
    try {
      const voterRecordRef = doc(db, 'elections', electionId, 'voters', userId);
      await updateDoc(voterRecordRef, {
        election_id: electionId,
        user_id: userId,
        hasVoted: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    } catch (error) {
      // If document doesn't exist, create it
      if (error.code === 'not-found') {
        const voterRecordRef = doc(db, 'elections', electionId, 'voters', userId);
        await updateDoc(voterRecordRef, {
          election_id: electionId,
          user_id: userId,
          hasVoted: false,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      } else {
        console.error('Error adding voter to election:', error);
        throw error;
      }
    }
  },

  // Remove voter from election
  async removeVoterFromElection(electionId: string, userId: string): Promise<void> {
    try {
      const voterRecordRef = doc(db, 'elections', electionId, 'voters', userId);
      await deleteDoc(voterRecordRef);
    } catch (error) {
      console.error('Error removing voter from election:', error);
      throw error;
    }
  },

  // Get voters for an election
  async getElectionVoters(electionId: string): Promise<VoterRecord[]> {
    try {
      const votersRef = collection(db, 'elections', electionId, 'voters');
      const querySnapshot = await getDocs(votersRef);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
        updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
      })) as VoterRecord[];
    } catch (error) {
      console.error('Error fetching election voters:', error);
      throw error;
    }
  },

  // Bulk add voters from CSV
  async bulkAddVoters(electionId: string, userIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      userIds.forEach(userId => {
        const voterRecordRef = doc(db, 'elections', electionId, 'voters', userId);
        batch.set(voterRecordRef, {
          election_id: electionId,
          user_id: userId,
          hasVoted: false,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error bulk adding voters:', error);
      throw error;
    }
  }
};

// Election Statistics Service
export const electionStatsService = {
  // Get real-time election statistics
  async getElectionStats(electionId: string): Promise<ElectionStats> {
    try {
      // Get total voters
      const voters = await voterManagementService.getElectionVoters(electionId);
      const totalVoters = voters.length;

      // Get total votes
      const votes = await votesService.getVotesByElection(electionId);
      const totalVotes = votes.length;

      // Get pending votes
      const pendingVotes = totalVoters - totalVotes;

      // Get candidate results
      const candidates = await candidatesService.getCandidatesByElection(electionId);
      const candidateResults = await Promise.all(
        candidates.map(async (candidate) => {
          const votes = await votesService.getVoteCountForCandidate(candidate.id);
          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
          
          return {
            candidateId: candidate.id,
            candidateName: candidate.name,
            votes,
            percentage: Math.round(percentage * 100) / 100,
          };
        })
      );

      return {
        totalVoters,
        totalVotes,
        pendingVotes,
        candidateResults: candidateResults.sort((a, b) => b.votes - a.votes),
      };
    } catch (error) {
      console.error('Error fetching election stats:', error);
      throw error;
    }
  },

  // Subscribe to real-time election statistics
  subscribeToElectionStats(electionId: string, callback: (stats: ElectionStats) => void): Unsubscribe {
    const votersRef = collection(db, 'elections', electionId, 'voters');
    const votesRef = collection(db, 'votes');
    
    return onSnapshot(votersRef, async () => {
      try {
        const stats = await this.getElectionStats(electionId);
        callback(stats);
      } catch (error) {
        console.error('Error in real-time stats subscription:', error);
      }
    });
  }
};

// Email Validation Service
export const emailValidationService = {
  // Validate email format using keyword matching
  validateEmailFormat(email: string, keyword?: string): boolean {
    if (!keyword) return true;
    
    // Check if the keyword is present in the email (case-insensitive)
    // This allows partial matches - if keyword is "school", it matches "school@university.edu"
    return email.toLowerCase().includes(keyword.toLowerCase());
  },

  // Extract domain from email
  extractDomain(email: string): string {
    return email.split('@')[1] || '';
  }
};

// Real-time subscription services
export const realtimeService = {
  subscribeToElections(callback: (elections: Election[]) => void): Unsubscribe {
    try {
      const electionsRef = collection(db, 'elections');
      return onSnapshot(electionsRef, 
        (snapshot) => {
          try {
            const elections = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
              updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            })) as Election[];
            console.log('Elections updated:', elections.length);
            callback(elections);
          } catch (error) {
            console.error('Error processing elections snapshot:', error);
          }
        },
        (error) => {
          console.error('Elections subscription error:', error);
          // Fallback to regular fetch
          electionsService.getAllElections().then(callback).catch(console.error);
        }
      );
    } catch (error) {
      console.error('Error setting up elections subscription:', error);
      // Fallback to regular fetch
      electionsService.getAllElections().then(callback).catch(console.error);
      return () => {}; // Return empty unsubscribe function
    }
  },

  subscribeToCandidates(callback: (candidates: Candidate[]) => void): Unsubscribe {
    try {
      const candidatesRef = collection(db, 'candidates');
      return onSnapshot(candidatesRef, 
        (snapshot) => {
          try {
            const candidates = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
              updated_at: doc.data().updated_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            })) as Candidate[];
            console.log('Candidates updated:', candidates.length);
            callback(candidates);
          } catch (error) {
            console.error('Error processing candidates snapshot:', error);
          }
        },
        (error) => {
          console.error('Candidates subscription error:', error);
          // Fallback to regular fetch
          candidatesService.getCandidatesByElection('').then(callback).catch(console.error);
        }
      );
    } catch (error) {
      console.error('Error setting up candidates subscription:', error);
      // Fallback to regular fetch
      candidatesService.getCandidatesByElection('').then(callback).catch(console.error);
      return () => {}; // Return empty unsubscribe function
    }
  },

  subscribeToVotes(callback: (votes: Vote[]) => void): Unsubscribe {
    try {
      const votesRef = collection(db, 'votes');
      return onSnapshot(votesRef, 
        (snapshot) => {
          try {
            const votes = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              created_at: doc.data().created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            })) as Vote[];
            console.log('Votes updated:', votes.length);
            callback(votes);
          } catch (error) {
            console.error('Error processing votes snapshot:', error);
          }
        },
        (error) => {
          console.error('Votes subscription error:', error);
        }
      );
    } catch (error) {
      console.error('Error setting up votes subscription:', error);
      return () => {}; // Return empty unsubscribe function
    }
  }
};

// Voter and Candidate List Management Service
export const electionListService = {
  async addVoterToElection(electionId: string, userId: string): Promise<void> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      await withRetry(async () => {
        const electionRef = doc(db, 'elections', electionId);
        const electionDoc = await getDoc(electionRef);
        
        if (!electionDoc.exists()) {
          throw new Error('Election not found');
        }
        
        const electionData = electionDoc.data();
        const currentVoterList = electionData.voterList || [];
        
        if (!currentVoterList.includes(userId)) {
          await updateDoc(electionRef, {
            voterList: [...currentVoterList, userId],
            updated_at: serverTimestamp()
          });
        }
      });
    } catch (error) {
      console.error('Error adding voter to election:', error);
      throw error;
    }
  },

  async removeVoterFromElection(electionId: string, userId: string): Promise<void> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      await withRetry(async () => {
        const electionRef = doc(db, 'elections', electionId);
        const electionDoc = await getDoc(electionRef);
        
        if (!electionDoc.exists()) {
          throw new Error('Election not found');
        }
        
        const electionData = electionDoc.data();
        const currentVoterList = electionData.voterList || [];
        
        await updateDoc(electionRef, {
          voterList: currentVoterList.filter((id: string) => id !== userId),
          updated_at: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('Error removing voter from election:', error);
      throw error;
    }
  },

  async addCandidateToElection(electionId: string, userId: string): Promise<void> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      await withRetry(async () => {
        const electionRef = doc(db, 'elections', electionId);
        const electionDoc = await getDoc(electionRef);
        
        if (!electionDoc.exists()) {
          throw new Error('Election not found');
        }
        
        const electionData = electionDoc.data();
        const currentCandidateList = electionData.candidateList || [];
        
        if (!currentCandidateList.includes(userId)) {
          await updateDoc(electionRef, {
            candidateList: [...currentCandidateList, userId],
            updated_at: serverTimestamp()
          });
        }
      });
    } catch (error) {
      console.error('Error adding candidate to election:', error);
      throw error;
    }
  },

  async removeCandidateFromElection(electionId: string, userId: string): Promise<void> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      await withRetry(async () => {
        const electionRef = doc(db, 'elections', electionId);
        const electionDoc = await getDoc(electionRef);
        
        if (!electionDoc.exists()) {
          throw new Error('Election not found');
        }
        
        const electionData = electionDoc.data();
        const currentCandidateList = electionData.candidateList || [];
        
        await updateDoc(electionRef, {
          candidateList: currentCandidateList.filter((id: string) => id !== userId),
          updated_at: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('Error removing candidate from election:', error);
      throw error;
    }
  },

  async getElectionVoterList(electionId: string): Promise<User[]> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      return await withRetry(async () => {
        const electionRef = doc(db, 'elections', electionId);
        const electionDoc = await getDoc(electionRef);
        
        if (!electionDoc.exists()) {
          throw new Error('Election not found');
        }
        
        const electionData = electionDoc.data();
        const voterIds = electionData.voterList || [];
        
        if (voterIds.length === 0) return [];
        
        // Get user details for each voter ID
        const userPromises = voterIds.map(async (userId: string) => {
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() } as User;
          }
          return null;
        });
        
        const users = await Promise.all(userPromises);
        return users.filter(user => user !== null) as User[];
      });
    } catch (error) {
      console.error('Error getting election voter list:', error);
      throw error;
    }
  },

  async getElectionCandidateList(electionId: string): Promise<User[]> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      return await withRetry(async () => {
        const electionRef = doc(db, 'elections', electionId);
        const electionDoc = await getDoc(electionRef);
        
        if (!electionDoc.exists()) {
          throw new Error('Election not found');
        }
        
        const electionData = electionDoc.data();
        const candidateIds = electionData.candidateList || [];
        
        if (candidateIds.length === 0) return [];
        
        // Get user details for each candidate ID
        const userPromises = candidateIds.map(async (userId: string) => {
          const userRef = doc(db, 'users', userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            return { id: userDoc.id, ...userDoc.data() } as User;
          }
          return null;
        });
        
        const users = await Promise.all(userPromises);
        return users.filter(user => user !== null) as User[];
      });
    } catch (error) {
      console.error('Error getting election candidate list:', error);
      throw error;
    }
  },

  async getAllUsers(): Promise<User[]> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      return await withRetry(async () => {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
      });
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }
};

// Election Status Update Service
export const electionStatusService = {
  async updateElectionStatus(electionId: string): Promise<void> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      await withRetry(async () => {
        const electionRef = doc(db, 'elections', electionId);
        const electionDoc = await getDoc(electionRef);
        
        if (!electionDoc.exists()) {
          throw new Error('Election not found');
        }
        
        const electionData = electionDoc.data();
        const now = new Date();
        const startDate = new Date(electionData.start_date);
        const endDate = new Date(electionData.end_date);
        
        let newStatus = 'upcoming';
        if (startDate <= now && endDate >= now) {
          newStatus = 'active';
        } else if (endDate < now) {
          newStatus = 'completed';
        }
        
        // Only update if status has changed
        if (electionData.status !== newStatus) {
          await updateDoc(electionRef, {
            status: newStatus,
            updated_at: serverTimestamp()
          });
        }
      });
    } catch (error) {
      console.error('Error updating election status:', error);
      throw error;
    }
  },

  async updateAllElectionStatuses(): Promise<void> {
    try {
      if (!checkNetworkStatus()) {
        throw new Error('No internet connection');
      }
      
      await withRetry(async () => {
        const electionsRef = collection(db, 'elections');
        const snapshot = await getDocs(electionsRef);
        
        const updatePromises = snapshot.docs.map(async (doc) => {
          const electionData = doc.data();
          const now = new Date();
          const startDate = new Date(electionData.start_date);
          const endDate = new Date(electionData.end_date);
          
          let newStatus = 'upcoming';
          if (startDate <= now && endDate >= now) {
            newStatus = 'active';
          } else if (endDate < now) {
            newStatus = 'completed';
          }
          
          // Only update if status has changed
          if (electionData.status !== newStatus) {
            await updateDoc(doc.ref, {
              status: newStatus,
              updated_at: serverTimestamp()
            });
          }
        });
        
        await Promise.all(updatePromises);
      });
    } catch (error) {
      console.error('Error updating all election statuses:', error);
      throw error;
    }
  }
};
