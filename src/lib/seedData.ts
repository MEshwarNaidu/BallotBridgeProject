import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Sample data for testing
export const seedSampleData = async () => {
  try {
    console.log('Seeding sample data...');

    // Create sample elections
    const electionsRef = collection(db, 'elections');
    
    const election1 = await addDoc(electionsRef, {
      title: 'Student Council President 2025',
      description: 'Election for the Student Council President position for the academic year 2025',
      status: 'active',
      start_date: Timestamp.fromDate(new Date()),
      end_date: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)), // 7 days from now
      created_by: 'admin',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    const election2 = await addDoc(electionsRef, {
      title: 'Club Committee Elections',
      description: 'Election for various club committee positions',
      status: 'active',
      start_date: Timestamp.fromDate(new Date()),
      end_date: Timestamp.fromDate(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)), // 10 days from now
      created_by: 'admin',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    const election3 = await addDoc(electionsRef, {
      title: 'Sports Captain Selection',
      description: 'Selection of sports captains for different sports',
      status: 'upcoming',
      start_date: Timestamp.fromDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)), // 3 days from now
      end_date: Timestamp.fromDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)), // 14 days from now
      created_by: 'admin',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    console.log('Sample elections created:', { election1: election1.id, election2: election2.id, election3: election3.id });

    // Create sample candidates
    const candidatesRef = collection(db, 'candidates');
    
    const candidate1 = await addDoc(candidatesRef, {
      election_id: election1.id,
      user_id: 'sample-candidate-1',
      name: 'John Smith',
      bio: 'Experienced student leader with a passion for community service',
      manifesto: 'I will work to improve student life and create more opportunities for engagement',
      status: 'approved',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    const candidate2 = await addDoc(candidatesRef, {
      election_id: election1.id,
      user_id: 'sample-candidate-2',
      name: 'Emily Davis',
      bio: 'Dedicated to transparency and student welfare',
      manifesto: 'My focus will be on improving communication between students and administration',
      status: 'approved',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    const candidate3 = await addDoc(candidatesRef, {
      election_id: election2.id,
      user_id: 'sample-candidate-3',
      name: 'Michael Chen',
      bio: 'Creative and innovative approach to club management',
      manifesto: 'I will introduce new events and improve existing club activities',
      status: 'pending',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    console.log('Sample candidates created:', { candidate1: candidate1.id, candidate2: candidate2.id, candidate3: candidate3.id });

    // Create sample votes
    const votesRef = collection(db, 'votes');
    
    await addDoc(votesRef, {
      election_id: election1.id,
      candidate_id: candidate1.id,
      voter_id: 'sample-voter-1',
      created_at: serverTimestamp(),
    });

    await addDoc(votesRef, {
      election_id: election1.id,
      candidate_id: candidate1.id,
      voter_id: 'sample-voter-2',
      created_at: serverTimestamp(),
    });

    await addDoc(votesRef, {
      election_id: election1.id,
      candidate_id: candidate2.id,
      voter_id: 'sample-voter-3',
      created_at: serverTimestamp(),
    });

    console.log('Sample votes created');

    console.log('Sample data seeding completed successfully!');
    return true;
  } catch (error) {
    console.error('Error seeding sample data:', error);
    return false;
  }
};

// Function to create a sample admin user
export const createSampleAdmin = async () => {
  try {
    const usersRef = collection(db, 'users');
    
    const adminUser = await addDoc(usersRef, {
      id: 'sample-admin-1',
      email: 'admin@ballotbridge.com',
      role: 'admin',
      full_name: 'System Administrator',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    console.log('Sample admin user created:', adminUser.id);
    return adminUser.id;
  } catch (error) {
    console.error('Error creating sample admin:', error);
    return null;
  }
};
