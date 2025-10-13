import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Users, UserCheck, Search } from 'lucide-react';
import { electionListService } from '../lib/firebaseServices';
import { User, Election } from '../lib/firebase';

interface VoterCandidateListManagerProps {
  election: Election;
  onClose: () => void;
}

export const VoterCandidateListManager = ({ election, onClose }: VoterCandidateListManagerProps) => {
  const [activeTab, setActiveTab] = useState<'voters' | 'candidates'>('voters');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [electionVoters, setElectionVoters] = useState<User[]>([]);
  const [electionCandidates, setElectionCandidates] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all users, election voters, and election candidates
        const [allUsersData, votersData, candidatesData] = await Promise.all([
          electionListService.getAllUsers(),
          electionListService.getElectionVoterList(election.id),
          electionListService.getElectionCandidateList(election.id)
        ]);

        setAllUsers(allUsersData);
        setElectionVoters(votersData);
        setElectionCandidates(candidatesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [election.id]);

  const handleAddVoter = async (userId: string) => {
    try {
      setError(null);
      console.log('Adding voter:', userId, 'to election:', election.id);
      await electionListService.addVoterToElection(election.id, userId);
      // Refresh voter list
      const updatedVoters = await electionListService.getElectionVoterList(election.id);
      setElectionVoters(updatedVoters);
      console.log('Voter added successfully, updated list:', updatedVoters.length);
    } catch (error) {
      console.error('Error adding voter:', error);
      setError('Failed to add voter: ' + (error as Error).message);
    }
  };

  const handleRemoveVoter = async (userId: string) => {
    try {
      await electionListService.removeVoterFromElection(election.id, userId);
      // Refresh voter list
      const updatedVoters = await electionListService.getElectionVoterList(election.id);
      setElectionVoters(updatedVoters);
    } catch (error) {
      console.error('Error removing voter:', error);
      setError('Failed to remove voter');
    }
  };

  const handleAddCandidate = async (userId: string) => {
    try {
      setError(null);
      console.log('Adding candidate:', userId, 'to election:', election.id);
      await electionListService.addCandidateToElection(election.id, userId);
      // Refresh candidate list
      const updatedCandidates = await electionListService.getElectionCandidateList(election.id);
      setElectionCandidates(updatedCandidates);
      console.log('Candidate added successfully, updated list:', updatedCandidates.length);
    } catch (error) {
      console.error('Error adding candidate:', error);
      setError('Failed to add candidate: ' + (error as Error).message);
    }
  };

  const handleRemoveCandidate = async (userId: string) => {
    try {
      await electionListService.removeCandidateFromElection(election.id, userId);
      // Refresh candidate list
      const updatedCandidates = await electionListService.getElectionCandidateList(election.id);
      setElectionCandidates(updatedCandidates);
    } catch (error) {
      console.error('Error removing candidate:', error);
      setError('Failed to remove candidate');
    }
  };

  const getFilteredUsers = () => {
    const currentList = activeTab === 'voters' ? electionVoters : electionCandidates;
    const currentUserIds = currentList.map(user => user.id);
    
    return allUsers.filter(user => {
      const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      const notInCurrentList = !currentUserIds.includes(user.id);
      return matchesSearch && notInCurrentList;
    });
  };

  const getCurrentList = () => {
    return activeTab === 'voters' ? electionVoters : electionCandidates;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Manage Election Lists</h2>
            <p className="text-slate-600 mt-1">{election.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-slate-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('voters')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'voters'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            Voters ({electionVoters.length})
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'candidates'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Candidates ({electionCandidates.length})
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[60vh]">
          {/* Current List */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Current {activeTab === 'voters' ? 'Voters' : 'Candidates'}
            </h3>
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
              {getCurrentList().length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>No {activeTab} added yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {getCurrentList().map((user) => (
                    <div key={user.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => 
                          activeTab === 'voters' 
                            ? handleRemoveVoter(user.id) 
                            : handleRemoveCandidate(user.id)
                        }
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Users */}
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Available Users
            </h3>
            
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
              {getFilteredUsers().length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <UserCheck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>No available users found</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {getFilteredUsers().map((user) => (
                    <div key={user.id} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => 
                          activeTab === 'voters' 
                            ? handleAddVoter(user.id) 
                            : handleAddCandidate(user.id)
                        }
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
