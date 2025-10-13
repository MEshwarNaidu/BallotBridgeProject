import { useAuth } from '../contexts/AuthContext';
import { LayoutGrid, Users, Vote, BarChart3, Settings, LogOut, Plus, CheckCircle, XCircle, AlertCircle, Upload, FileText, UserPlus, UserCheck, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { electionsService, candidatesService, votesService, usersService, voterManagementService, electionStatsService, realtimeService, electionStatusService } from '../lib/firebaseServices';
import { Election, Candidate, User, ElectionStats } from '../lib/firebase';
import { ElectionDetailsDashboard } from './ElectionDetailsDashboard';
import { VoterCandidateListManager } from './VoterCandidateListManager';

export const AdminDashboard = () => {
  const { user, signOut } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<Candidate[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showCreateElectionModal, setShowCreateElectionModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showElectionDetailsModal, setShowElectionDetailsModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'active' | 'completed'>('all');
  const [countdowns, setCountdowns] = useState<{[key: string]: string}>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [electionToDelete, setElectionToDelete] = useState<Election | null>(null);
  const [showElectionDetailsDashboard, setShowElectionDetailsDashboard] = useState(false);
  const [showListManager, setShowListManager] = useState(false);
  const [selectedElectionForList, setSelectedElectionForList] = useState<Election | null>(null);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [electionData, setElectionData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    emailKeyword: '',
    positions: [''],
    maxCandidates: '',
    maxVoters: ''
  });
  const [stats, setStats] = useState({
    activeElections: 0,
    totalCandidates: 0,
    totalVotes: 0,
    voterTurnout: 0
  });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Update election statuses first
    const updateStatuses = async () => {
      try {
        await electionStatusService.updateAllElectionStatuses();
      } catch (error) {
        console.warn('Failed to update election statuses:', error);
      }
    };
    
    updateStatuses();

    // Set up real-time listeners
    const unsubscribeElections = realtimeService.subscribeToElections((electionsData) => {
      setElections(electionsData);
      
      // Calculate stats based on current date
      const now = new Date();
      const activeElections = electionsData.filter(e => {
        const startDate = new Date(e.start_date);
        const endDate = new Date(e.end_date);
        return startDate <= now && endDate >= now;
      }).length;

      setStats(prev => ({
        ...prev,
        activeElections
      }));
    });

    const unsubscribeCandidates = realtimeService.subscribeToCandidates((candidatesData) => {
      const pendingCandidatesData = candidatesData.filter(c => c.status === 'pending');
      setPendingCandidates(pendingCandidatesData);
      
      const totalCandidates = candidatesData.length;
      setStats(prev => ({
        ...prev,
        totalCandidates
      }));
    });

    const unsubscribeUsers = usersService.subscribeToUsers((usersData) => {
      setAllUsers(usersData);
      
      const totalVoters = usersData.filter(u => u.role === 'voter').length;
      setStats(prev => ({
        ...prev,
        voterTurnout: totalVoters > 0 ? Math.round((prev.totalVotes / totalVoters) * 100) : 0
      }));
    });

    // Calculate total votes
    const calculateTotalVotes = async () => {
      try {
        let totalVotes = 0;
        for (const election of elections) {
          const votes = await votesService.getVotesByElection(election.id);
          totalVotes += votes.length;
        }
        setStats(prev => ({
          ...prev,
          totalVotes
        }));
      } catch (error) {
        console.error('Error calculating total votes:', error);
      }
    };

    calculateTotalVotes();
    setLoading(false);

    // Cleanup listeners on unmount
    return () => {
      unsubscribeElections();
      unsubscribeCandidates();
      unsubscribeUsers();
    };
  }, [elections]);

  // Countdown timer effect for upcoming elections
  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();
      const newCountdowns: {[key: string]: string} = {};

      elections.forEach(election => {
        const startDate = new Date(election.start_date);
        const endDate = new Date(election.end_date);
        const timeDiff = startDate.getTime() - now.getTime();

        if (timeDiff > 0) {
          // Election is upcoming
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

          if (days > 0) {
            newCountdowns[election.id] = `${days}d ${hours}h ${minutes}m`;
          } else if (hours > 0) {
            newCountdowns[election.id] = `${hours}h ${minutes}m ${seconds}s`;
          } else {
            newCountdowns[election.id] = `${minutes}m ${seconds}s`;
          }
        } else if (startDate <= now && endDate >= now) {
          // Election is active
          const endTimeDiff = endDate.getTime() - now.getTime();
          const endDays = Math.floor(endTimeDiff / (1000 * 60 * 60 * 24));
          const endHours = Math.floor((endTimeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const endMinutes = Math.floor((endTimeDiff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (endDays > 0) {
            newCountdowns[election.id] = `Active - ${endDays}d ${endHours}h left`;
          } else if (endHours > 0) {
            newCountdowns[election.id] = `Active - ${endHours}h ${endMinutes}m left`;
          } else {
            newCountdowns[election.id] = `Active - ${endMinutes}m left`;
          }
        } else {
          // Election is completed
          newCountdowns[election.id] = 'Completed';
        }
      });

      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [elections]);

  const handleApproveCandidate = async (candidateId: string) => {
    try {
      await candidatesService.updateCandidateStatus(candidateId, 'approved');
      setPendingCandidates(prev => prev.filter(c => c.id !== candidateId));
    } catch (error) {
      console.error('Error approving candidate:', error);
    }
  };

  const handleRejectCandidate = async (candidateId: string, reason?: string) => {
    try {
      await candidatesService.updateCandidateStatus(candidateId, 'rejected', reason);
      setPendingCandidates(prev => prev.filter(c => c.id !== candidateId));
      setShowCandidateModal(false);
      setSelectedCandidate(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting candidate:', error);
    }
  };

  const handleCreateElection = async () => {
    if (!user) return;
    
    setCreating(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!electionData.title || !electionData.description || !electionData.start_date || !electionData.end_date) {
        throw new Error('Please fill in all required fields');
      }

      if (electionData.positions.length === 0 || electionData.positions[0] === '') {
        throw new Error('Please add at least one position');
      }

      // Create election
      const electionId = await electionsService.createElection({
        title: electionData.title,
        description: electionData.description,
        start_date: electionData.start_date,
        end_date: electionData.end_date,
        allowedEmailFormat: electionData.emailKeyword || undefined,
        positions: electionData.positions.filter(p => p.trim() !== ''),
        maxCandidates: electionData.maxCandidates ? parseInt(electionData.maxCandidates) : undefined,
        maxVoters: electionData.maxVoters ? parseInt(electionData.maxVoters) : undefined,
        status: 'upcoming',
        created_by: user.id
      });

      console.log('Election created successfully with ID:', electionId);
      console.log('Election will now appear in candidate dashboard via real-time updates');

      // Reset form
      setElectionData({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        emailKeyword: '',
        positions: [''],
        maxCandidates: '',
        maxVoters: ''
      });

      setShowCreateElectionModal(false);
    } catch (error) {
      console.error('Error creating election:', error);
      setError(error instanceof Error ? error.message : 'Failed to create election');
    } finally {
      setCreating(false);
    }
  };

  const addPosition = () => {
    setElectionData(prev => ({ ...prev, positions: [...prev.positions, ''] }));
  };

  const removePosition = (index: number) => {
    setElectionData(prev => ({ 
      ...prev, 
      positions: prev.positions.filter((_, i) => i !== index) 
    }));
  };

  const updatePosition = (index: number, value: string) => {
    setElectionData(prev => ({
      ...prev,
      positions: prev.positions.map((pos, i) => i === index ? value : pos)
    }));
  };

  const openCandidateModal = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setShowCandidateModal(true);
  };

  const openElectionDetails = (election: Election) => {
    setSelectedElection(election);
    setShowElectionDetailsDashboard(true);
  };

  const openListManager = (election: Election) => {
    setSelectedElectionForList(election);
    setShowListManager(true);
  };

  const handleDeleteElection = (election: Election) => {
    setElectionToDelete(election);
    setShowDeleteModal(true);
  };

  const confirmDeleteElection = async () => {
    if (!electionToDelete) return;
    
    try {
      await electionsService.deleteElection(electionToDelete.id);
      setElections(prev => prev.filter(e => e.id !== electionToDelete.id));
      setShowDeleteModal(false);
      setElectionToDelete(null);
    } catch (error) {
      console.error('Error deleting election:', error);
      setError('Failed to delete election');
    }
  };

  const getElectionStatus = (election: Election) => {
    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);
    
    if (startDate > now) return 'upcoming';
    if (startDate <= now && endDate >= now) return 'active';
    return 'completed';
  };

  const getFilteredElections = () => {
    const now = new Date();
    switch (activeTab) {
      case 'upcoming':
        return elections.filter(e => getElectionStatus(e) === 'upcoming');
      case 'active':
        return elections.filter(e => getElectionStatus(e) === 'active');
      case 'completed':
        return elections.filter(e => getElectionStatus(e) === 'completed');
      default:
        return elections;
    }
  };

  // Show Election Details Dashboard if selected
  if (showElectionDetailsDashboard && selectedElection) {
    return (
      <ElectionDetailsDashboard 
        election={selectedElection} 
        onBack={() => setShowElectionDetailsDashboard(false)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Vote className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">BallotBridge</h1>
                <p className="text-xs text-slate-500">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAboutModal(true)}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Info className="h-4 w-4" />
                About
              </button>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{user?.full_name || 'Admin'}</p>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <button
                onClick={signOut}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back, Admin</h2>
          <p className="text-slate-600">Manage elections, candidates, and voters from your control center</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.activeElections}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Active Elections</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.totalCandidates}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Candidates</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Vote className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.totalVotes}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Votes Cast</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.voterTurnout}%</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Voter Turnout</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Elections Management</h3>
              <button 
                onClick={() => setShowCreateElectionModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New
              </button>
            </div>

            {/* Election Tabs */}
            <div className="flex gap-2 mb-6 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({elections.length})
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeTab === 'upcoming'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Upcoming ({elections.filter(e => new Date(e.start_date) > new Date()).length})
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeTab === 'active'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({elections.filter(e => {
                  const startDate = new Date(e.start_date);
                  const endDate = new Date(e.end_date);
                  const now = new Date();
                  return startDate <= now && endDate >= now;
                }).length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  activeTab === 'completed'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Completed ({elections.filter(e => new Date(e.end_date) < new Date()).length})
              </button>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading elections...</p>
                </div>
              ) : getFilteredElections().length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">No {activeTab} elections found</p>
                </div>
              ) : (
                getFilteredElections().map((election) => {
                  const endDate = new Date(election.end_date);
                  const now = new Date();
                  const timeLeft = endDate.getTime() - now.getTime();
                  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div
                      key={election.id}
                      className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900 mb-1">{election.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-slate-600">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                getElectionStatus(election) === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : getElectionStatus(election) === 'upcoming'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {getElectionStatus(election)}
                            </span>
                            <span className="text-blue-600 font-medium">
                              {countdowns[election.id] || 'Loading...'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openElectionDetails(election)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => openListManager(election)}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                          >
                            <UserPlus className="h-3 w-3" />
                            Manage Lists
                          </button>
                          <button
                            onClick={() => handleDeleteElection(election)}
                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Pending Approvals</h3>
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-4">
                  <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-slate-600 text-sm">Loading...</p>
                </div>
              ) : pendingCandidates.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-slate-600 text-sm">No pending approvals</p>
                </div>
              ) : (
                pendingCandidates.map((candidate) => {
                  const election = elections.find(e => e.id === candidate.election_id);
                  return (
                  <div key={candidate.id} className="p-4 border border-slate-200 rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                    <p className="font-medium text-slate-900 mb-1">{candidate.name}</p>
                          <p className="text-xs text-slate-600 mb-1">Position: {candidate.position}</p>
                          <p className="text-xs text-slate-500">Election: {election?.title || candidate.election_id}</p>
                        </div>
                        <button
                          onClick={() => openCandidateModal(candidate)}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          View Details
                        </button>
                      </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveCandidate(candidate.id)}
                          className="flex-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                      >
                          <CheckCircle className="w-3 h-3" />
                        Approve
                      </button>
                      <button 
                          onClick={() => openCandidateModal(candidate)}
                          className="flex-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Create Election Modal */}
      {showCreateElectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Create New Election</h3>
                <button
                  onClick={() => setShowCreateElectionModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Election Title *</label>
                  <input
                    type="text"
                    value={electionData.title}
                    onChange={(e) => setElectionData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter election title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
                  <textarea
                    value={electionData.description}
                    onChange={(e) => setElectionData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Describe the election purpose and scope"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Date *</label>
                    <input
                      type="datetime-local"
                      value={electionData.start_date}
                      onChange={(e) => setElectionData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">End Date *</label>
                    <input
                      type="datetime-local"
                      value={electionData.end_date}
                      onChange={(e) => setElectionData(prev => ({ ...prev, end_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Keyword (Optional)</label>
                  <input
                    type="text"
                    value={electionData.emailKeyword}
                    onChange={(e) => setElectionData(prev => ({ ...prev, emailKeyword: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., school, company, student"
                  />
                  <p className="text-xs text-slate-500 mt-1">Only users whose email contains this keyword can participate</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Max Candidates (Optional)</label>
                    <input
                      type="number"
                      value={electionData.maxCandidates}
                      onChange={(e) => setElectionData(prev => ({ ...prev, maxCandidates: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 10"
                      min="1"
                    />
                    <p className="text-xs text-slate-500 mt-1">Maximum number of candidates allowed</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Max Voters (Optional)</label>
                    <input
                      type="number"
                      value={electionData.maxVoters}
                      onChange={(e) => setElectionData(prev => ({ ...prev, maxVoters: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 100"
                      min="1"
                    />
                    <p className="text-xs text-slate-500 mt-1">Maximum number of voters allowed</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Positions *</label>
                  <div className="space-y-2">
                    {electionData.positions.map((position, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={position}
                          onChange={(e) => updatePosition(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter position name"
                        />
                        {electionData.positions.length > 1 && (
                          <button
                            onClick={() => removePosition(index)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={addPosition}
                      className="px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Position
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowCreateElectionModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateElection}
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Election'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Details Modal */}
      {showCandidateModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Candidate Application</h3>
                <button
                  onClick={() => setShowCandidateModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {selectedCandidate.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-slate-900">{selectedCandidate.name}</h4>
                    <p className="text-slate-600">Age: {selectedCandidate.age}</p>
                    <p className="text-slate-600">Position: {selectedCandidate.position}</p>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium text-slate-900 mb-2">Bio</h5>
                  <p className="text-slate-600">{selectedCandidate.bio}</p>
                </div>

                <div>
                  <h5 className="font-medium text-slate-900 mb-2">Manifesto</h5>
                  <p className="text-slate-600">{selectedCandidate.manifesto}</p>
                </div>

                {selectedCandidate.imageURL && (
                  <div>
                    <h5 className="font-medium text-slate-900 mb-2">Profile Image</h5>
                    <img 
                      src={selectedCandidate.imageURL} 
                      alt={selectedCandidate.name}
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}

                {selectedCandidate.documentsURL && selectedCandidate.documentsURL.length > 0 && (
                  <div>
                    <h5 className="font-medium text-slate-900 mb-2">Supporting Documents</h5>
                    <div className="space-y-2">
                      {selectedCandidate.documentsURL.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                        >
                          <FileText className="w-4 h-4" />
                          Document {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Rejection Reason (if rejecting)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Provide a reason for rejection (optional)"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowCandidateModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => handleApproveCandidate(selectedCandidate.id)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleRejectCandidate(selectedCandidate.id, rejectionReason)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Election Details Modal */}
      {showElectionDetailsModal && selectedElection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Election Details & Results</h3>
                <button
                  onClick={() => setShowElectionDetailsModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-slate-900 mb-2">{selectedElection.title}</h4>
                <p className="text-slate-600 mb-4">{selectedElection.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-600 font-medium">Total Voters</p>
                    <p className="text-2xl font-bold text-blue-900">{electionStats?.totalVoters || 0}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-600 font-medium">Votes Cast</p>
                    <p className="text-2xl font-bold text-green-900">{electionStats?.totalVotes || 0}</p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-amber-600 font-medium">Pending Votes</p>
                    <p className="text-2xl font-bold text-amber-900">{electionStats?.pendingVotes || 0}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-600 font-medium">Turnout</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {electionStats?.totalVoters > 0 ? Math.round((electionStats.totalVotes / electionStats.totalVoters) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>

              {electionStats?.candidateResults && electionStats.candidateResults.length > 0 && (
                <div>
                  <h5 className="text-lg font-semibold text-slate-900 mb-4">Candidate Results</h5>
                  <div className="space-y-4">
                    {electionStats.candidateResults.map((result, index) => (
                      <div key={result.candidateId} className="bg-slate-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </span>
                            <span className="font-medium text-slate-900">{result.candidateName}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-slate-900">{result.votes} votes</p>
                            <p className="text-sm text-slate-500">{result.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${result.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && electionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Delete Election</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 mb-2" />
                <p className="text-red-800 font-medium">Warning: This action cannot be undone!</p>
              </div>
              
              <p className="text-slate-600 mb-4">
                Are you sure you want to delete the election <strong>"{electionToDelete.title}"</strong>? 
                This will permanently remove the election and all associated data.
              </p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteElection}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Election
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voter and Candidate List Manager */}
      {showListManager && selectedElectionForList && (
        <VoterCandidateListManager
          election={selectedElectionForList}
          onClose={() => {
            setShowListManager(false);
            setSelectedElectionForList(null);
          }}
        />
      )}

      {/* About Modal */}
      {showAboutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">About BallotBridge</h3>
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4">
                  BB
                </div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">BallotBridge</h2>
                <p className="text-lg text-slate-600">Digital Democracy Platform</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-blue-900 mb-3">🎯 Our Mission</h3>
                  <p className="text-blue-800">
                    To revolutionize democratic participation by providing a secure, transparent, and accessible digital voting platform that empowers institutions to conduct fair and efficient elections.
                  </p>
                </div>

                <div className="bg-green-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-green-900 mb-3">🌟 Our Vision</h3>
                  <p className="text-green-800">
                    To create a world where every voice matters, every vote counts, and democratic participation is seamless, secure, and accessible to all.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">🚀 What We Do</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <Vote className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Digital Voting</h4>
                        <p className="text-sm text-slate-600">Secure, encrypted voting system with real-time results</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <Users className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Candidate Management</h4>
                        <p className="text-sm text-slate-600">Streamlined application and approval process</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <BarChart3 className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Election Analytics</h4>
                        <p className="text-sm text-slate-600">Real-time statistics and monitoring</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <Settings className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Admin Control</h4>
                        <p className="text-sm text-slate-600">Complete election management and oversight</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">🔒 Security & Trust</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold">🔐</span>
                    </div>
                    <h4 className="font-medium text-slate-900">End-to-End Encryption</h4>
                    <p className="text-sm text-slate-600">All votes are encrypted and secure</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-600 font-bold">✅</span>
                    </div>
                    <h4 className="font-medium text-slate-900">Transparent Process</h4>
                    <p className="text-sm text-slate-600">Open and verifiable election results</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-purple-600 font-bold">🛡️</span>
                    </div>
                    <h4 className="font-medium text-slate-900">Fraud Prevention</h4>
                    <p className="text-sm text-slate-600">Advanced security measures</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-600 mb-4">
                  BallotBridge is designed to make democratic participation accessible, secure, and transparent for educational institutions, organizations, and communities worldwide.
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                  <span>Built with ❤️ for democracy</span>
                  <span>•</span>
                  <span>Powered by modern technology</span>
                  <span>•</span>
                  <span>Trusted by institutions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
