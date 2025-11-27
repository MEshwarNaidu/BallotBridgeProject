import { useAuth } from '../contexts/AuthContext';
import { Vote, TrendingUp, Users, Calendar, LogOut, Upload, FileText, Plus, AlertCircle, CheckCircle, RefreshCw, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { electionsService, candidatesService, votesService, fileUploadService, usersService, realtimeService } from '../lib/firebaseServices';
import { Election, Candidate } from '../lib/firebase';

export const CandidateDashboard = () => {
  const { user, signOut } = useAuth();
  const [myCandidates, setMyCandidates] = useState<Candidate[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [availableElections, setAvailableElections] = useState<Election[]>([]);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showCandidateRulesModal, setShowCandidateRulesModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'upcoming' | 'active' | 'completed'>('available');
  const [applicationData, setApplicationData] = useState({
    name: '',
    age: '',
    phone: '',
    position: '',
    bio: '',
    manifesto: '',
    image: null as File | null,
    documents: [] as File[]
  });
  const [editProfileData, setEditProfileData] = useState({
    full_name: '',
    email: '',
    bio: '',
    manifesto: ''
  });
  const [uploading, setUploading] = useState(false);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalVotes: 0,
    currentPosition: 0,
    voterEngagement: 0
  });
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [showScoreboardModal, setShowScoreboardModal] = useState(false);
  const [scoreboardElection, setScoreboardElection] = useState<Election | null>(null);
  const [scoreboardCandidates, setScoreboardCandidates] = useState<Candidate[]>([]);
  const [scoreboardLoading, setScoreboardLoading] = useState(false);
  const [scoreboardUnsubscribe, setScoreboardUnsubscribe] = useState<(() => void) | null>(null);

  const updateAvailableElections = (electionsData: Election[], candidatesData: Candidate[]) => {
    const now = new Date();
    const available = electionsData.filter(e => {
      const startDate = new Date(e.start_date);
      // Show only upcoming elections that user hasn't applied to
      const isUpcoming = startDate > now;
      const hasNotApplied = !candidatesData.some(c => c.election_id === e.id);
      return isUpcoming && hasNotApplied;
    });
    console.log('Available elections updated:', available.length, 'elections');
    setAvailableElections(available);
  };

  useEffect(() => {
    if (!user) return;

    let unsubscribeElections: (() => void) | undefined;
    let unsubscribeCandidates: (() => void) | undefined;

    const fetchData = async () => {
      try {
        console.log('Fetching candidate data...');
        
        // Try real-time subscriptions first
        try {
          unsubscribeElections = realtimeService.subscribeToElections((elections) => {
            console.log('Real-time elections update:', elections.length);
            console.log('Elections data:', elections.map(e => ({ id: e.id, title: e.title, status: e.status })));
            setElections(elections);
            setLastUpdate(new Date());
            updateAvailableElections(elections, myCandidates);
          });

          unsubscribeCandidates = realtimeService.subscribeToCandidates((candidates) => {
            console.log('Real-time candidates update:', candidates.length);
            const myCandidatesData = candidates.filter(c => c.user_id === user?.id);
            setMyCandidates(myCandidatesData);
            updateAvailableElections(elections, myCandidatesData);
          });
        } catch (realtimeError) {
          console.warn('Real-time subscriptions failed, falling back to regular fetch:', realtimeError);
          setNetworkError('Real-time updates unavailable, using regular data fetching');
          
          // Fallback to regular fetching
          try {
            const [allElections, allCandidates] = await Promise.all([
              electionsService.getAllElections(),
              candidatesService.getCandidatesByElection('')
            ]);
            
            console.log('Fallback elections loaded:', allElections.length);
            setElections(allElections);
            const myCandidatesData = allCandidates.filter(c => c.user_id === user?.id);
            setMyCandidates(myCandidatesData);
            updateAvailableElections(allElections, myCandidatesData);
            setNetworkError(null);
          } catch (fetchError) {
            console.error('Fallback fetch also failed:', fetchError);
            setNetworkError('Unable to load elections. Please check your internet connection.');
          }
        }

        // Calculate stats
        await calculateStats();
        
      } catch (error) {
        console.error('Error fetching candidate data:', error);
      } finally {
        setLoading(false);
      }
    };

    const calculateStats = async () => {
      try {
        let totalVotes = 0;
        let currentPosition = 0;
        
        for (const candidate of myCandidates) {
          if (candidate.status === 'approved') {
            // Use vote_count from candidate object instead of fetching separately
            totalVotes += candidate.vote_count || 0;
          }
        }

        setStats({
          totalVotes,
          currentPosition: currentPosition > 0 ? currentPosition : 0,
          voterEngagement: totalVotes > 0 ? Math.min(100, Math.round((totalVotes / 200) * 100)) : 0
        });
      } catch (error) {
        console.error('Error calculating stats:', error);
      }
    };

    fetchData();

    // Cleanup listeners on unmount
    return () => {
      if (unsubscribeElections) unsubscribeElections();
      if (unsubscribeCandidates) unsubscribeCandidates();
    };
  }, [user]);

  // Recalculate stats whenever myCandidates change
  useEffect(() => {
    const calculateStats = () => {
      try {
        let totalVotes = 0;
        
        for (const candidate of myCandidates) {
          if (candidate.status === 'approved') {
            // Use vote_count from candidate object
            totalVotes += candidate.vote_count || 0;
          }
        }

        setStats({
          totalVotes,
          currentPosition: 0, // TODO: Calculate actual position based on ranking
          voterEngagement: totalVotes > 0 ? Math.min(100, Math.round((totalVotes / 200) * 100)) : 0
        });
      } catch (error) {
        console.error('Error calculating stats:', error);
      }
    };

    calculateStats();
  }, [myCandidates]);

  const handleApplyForElection = (election: Election) => {
    // Check if user is in the candidate list (if candidate list exists)
    const candidates = election.candidates || [];
    if (candidates.length > 0) {
      // Note: election.candidates contains candidate IDs, not user IDs
      // We need to check if the user has already applied
      const existingApplication = myCandidates.find(c => c.election_id === election.id);
      if (existingApplication) {
        setError('You have already applied for this election.');
        return;
      }
    }

    // Check if election is still accepting applications
    const now = new Date();
    const startDate = new Date(election.start_date);
    
    if (startDate <= now) {
      setError('This election has already started. Applications are no longer accepted.');
      return;
    }

    setSelectedElection(election);
    setApplicationData({
      name: user?.full_name || '',
      age: '',
      phone: '',
      position: '',
      bio: '',
      manifesto: '',
      image: null,
      documents: []
    });
    setShowApplicationModal(true);
    setApplicationError(null);
  };

  const handleRefresh = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setNetworkError(null);
      
      console.log('Manually refreshing candidate data...');
      
      // Force refresh elections and candidates with better error handling
      try {
        const allElections = await electionsService.getAllElections();
        console.log('Manual refresh - Elections loaded:', allElections.length);
        setElections(allElections);
        
        try {
          const allCandidates = await candidatesService.getCandidatesByElection('');
          const myCandidatesData = allCandidates.filter(c => c.user_id === user.id);
          setMyCandidates(myCandidatesData);
          updateAvailableElections(allElections, myCandidatesData);
        } catch (candidateError) {
          console.warn('Failed to load candidates, using existing data:', candidateError);
          // Use existing candidates data if refresh fails
          updateAvailableElections(allElections, myCandidates);
        }
        
        setLastUpdate(new Date());
        console.log('Manual refresh completed successfully');
      } catch (electionError) {
        console.error('Failed to load elections:', electionError);
        setNetworkError('Failed to load elections. Please check your internet connection and try again.');
      }
    } catch (error) {
      console.error('Error during manual refresh:', error);
      setNetworkError('Failed to refresh data. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (type: 'image' | 'documents', files: FileList | null) => {
    if (!files) return;
    
    if (type === 'image') {
      setApplicationData(prev => ({ ...prev, image: files[0] }));
    } else {
      setApplicationData(prev => ({ ...prev, documents: Array.from(files) }));
    }
  };

  const handleSubmitApplication = async () => {
    if (!user || !selectedElection) return;
    
    setUploading(true);
    setApplicationError(null);
    
    try {
      // Validate required fields
      if (!applicationData.name || !applicationData.age || !applicationData.phone || !applicationData.position || !applicationData.bio || !applicationData.manifesto) {
        throw new Error('Please fill in all required fields');
      }

      if (!applicationData.image) {
        throw new Error('Please upload a profile image');
      }

      if (applicationData.documents.length === 0) {
        throw new Error('Please upload ID proof documents');
      }

      // Create candidate record first
      const candidateId = await candidatesService.applyAsCandidate({
        election_id: selectedElection.id,
        user_id: user.id,
        name: applicationData.name,
        age: parseInt(applicationData.age),
        phone: applicationData.phone,
        position: applicationData.position,
        bio: applicationData.bio,
        manifesto: applicationData.manifesto,
        status: 'pending'
      });

      // Upload image
      const imageURL = await fileUploadService.uploadCandidateImage(applicationData.image, candidateId);

      // Upload documents if any
      let documentsURL: string[] = [];
      if (applicationData.documents.length > 0) {
        documentsURL = await fileUploadService.uploadCandidateDocuments(applicationData.documents, candidateId);
      }

      // Update candidate with file URLs (this is already set to pending during creation)

      // Refresh data
      const allCandidates = await candidatesService.getCandidatesByElection('');
      const myCandidatesData = allCandidates.filter(c => c.user_id === user.id);
      setMyCandidates(myCandidatesData);

      // Remove from available elections
      setAvailableElections(prev => prev.filter(e => e.id !== selectedElection.id));

      setShowApplicationModal(false);
      setSelectedElection(null);
      setApplicationData({
        name: '',
        age: '',
        phone: '',
        position: '',
        bio: '',
        manifesto: '',
        image: null,
        documents: []
      });

    } catch (error) {
      console.error('Error submitting application:', error);
      setApplicationError(error instanceof Error ? error.message : 'Failed to submit application');
    } finally {
      setUploading(false);
    }
  };

  const handleEditProfile = () => {
    setEditProfileData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      bio: '',
      manifesto: ''
    });
    setShowEditProfileModal(true);
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    
    setUploading(true);
    setApplicationError(null);
    
    try {
      await usersService.updateUserProfile(user.id, {
        full_name: editProfileData.full_name,
        email: editProfileData.email
      });
      
      setShowEditProfileModal(false);
      // Refresh user data
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      setApplicationError('Failed to update profile');
    } finally {
      setUploading(false);
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
      case 'available':
        return availableElections;
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

  const handleViewScoreboard = async (election: Election) => {
    setScoreboardElection(election);
    setShowScoreboardModal(true);
    setScoreboardLoading(true);
    
    try {
      // Clean up previous subscription if exists
      if (scoreboardUnsubscribe) {
        scoreboardUnsubscribe();
      }

      // Set up real-time subscription for candidates
      const unsubscribe = realtimeService.subscribeToCandidates((allCandidates) => {
        // Filter to this election only
        const electionCandidates = allCandidates.filter(c => c.election_id === election.id && c.status === 'approved');
        // Sort by vote_count descending
        electionCandidates.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
        setScoreboardCandidates(electionCandidates);
        setScoreboardLoading(false);
      });

      setScoreboardUnsubscribe(() => unsubscribe);
    } catch (error) {
      console.error('Error loading scoreboard:', error);
      setScoreboardLoading(false);
    }
  };

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
                <p className="text-xs text-slate-500">Candidate Portal</p>
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
                <p className="text-sm font-medium text-slate-900">{user?.full_name || 'Candidate'}</p>
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
          <div className="flex items-center justify-between">
            <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {user?.full_name || 'Candidate'}</h2>
          <p className="text-slate-600">Track your campaign performance and manage your profile</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm text-slate-500">
                <p>Last updated: {lastUpdate.toLocaleTimeString()}</p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
          
          {networkError && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800">{networkError}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Vote className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.totalVotes}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Votes Received</h3>
            <p className="text-xs text-slate-500 mt-2">Real-time updates</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.currentPosition > 0 ? `${stats.currentPosition}${stats.currentPosition === 1 ? 'st' : stats.currentPosition === 2 ? 'nd' : stats.currentPosition === 3 ? 'rd' : 'th'}` : 'N/A'}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Current Position</h3>
            <p className="text-xs text-slate-500 mt-2">Based on vote count</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.voterEngagement}%</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Voter Engagement</h3>
            <p className="text-xs text-slate-500 mt-2">Real-time metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Elections Management */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Elections</h3>
              
              {/* Election Tabs */}
              <div className="flex gap-2 mb-6 bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('available')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    activeTab === 'available'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Available ({availableElections.length})
                </button>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    activeTab === 'upcoming'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Upcoming ({elections.filter(e => getElectionStatus(e) === 'upcoming').length})
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    activeTab === 'active'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Active ({elections.filter(e => getElectionStatus(e) === 'active').length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                    activeTab === 'completed'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Completed ({elections.filter(e => getElectionStatus(e) === 'completed').length})
                </button>
              </div>

              <div className="space-y-4">
                {getFilteredElections().length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No {activeTab} elections found</p>
                  </div>
                ) : (
                  getFilteredElections().map((election) => {
                    const myCandidate = myCandidates.find(c => c.election_id === election.id);
                    const startDate = new Date(election.start_date);
                    const endDate = new Date(election.end_date);
                    const now = new Date();
                    const isUpcoming = startDate > now;
                    const isActive = startDate <= now && endDate >= now;
                    const isCompleted = endDate < now;
                    
                    return (
                      <div
                        key={election.id}
                        className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 mb-2">{election.title}</h4>
                            <p className="text-sm text-slate-600 mb-3">{election.description}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                              <span>Start: {startDate.toLocaleDateString()}</span>
                              <span>•</span>
                              <span>End: {endDate.toLocaleDateString()}</span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                getElectionStatus(election) === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : getElectionStatus(election) === 'upcoming'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {getElectionStatus(election)}
                              </span>
                            </div>
                            {myCandidate && (
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  myCandidate.status === 'approved' ? 'bg-green-100 text-green-700' :
                                  myCandidate.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {myCandidate.status}
                                </span>
                                {myCandidate.rejection_reason && (
                                  <span className="text-xs text-red-600">({myCandidate.rejection_reason})</span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            {activeTab === 'available' && !myCandidate && (
                              <button
                                onClick={() => handleApplyForElection(election)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Apply
                              </button>
                            )}
                            {myCandidate && myCandidate.status === 'approved' && election.status === 'active' && (
                              <button
                                onClick={() => handleViewScoreboard(election)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                <TrendingUp className="w-4 h-4" />
                                View Scoreboard
                              </button>
                            )}
                            {myCandidate && !(myCandidate.status === 'approved' && election.status === 'active') && (
                              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium">
                                Applied
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Your Elections */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Your Applications</h3>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading your elections...</p>
                  </div>
                ) : myCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">You haven't applied for any elections yet</p>
                    <p className="text-sm text-slate-500 mt-2">Browse available elections above to get started</p>
                  </div>
                ) : (
                  myCandidates.map((candidate) => {
                    const election = elections.find(e => e.id === candidate.election_id);
                    return (
                      <div
                        key={candidate.id}
                        className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 mb-2">{election?.title || 'Unknown Election'}</h4>
                            <div className="flex items-center gap-3 text-sm mb-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  candidate.status === 'approved'
                                    ? 'bg-green-100 text-green-700'
                                    : candidate.status === 'pending'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {candidate.status}
                              </span>
                              <span className="text-slate-600">Position: {candidate.position}</span>
                            </div>
                            {candidate.status === 'rejected' && candidate.rejection_reason && (
                              <p className="text-sm text-red-600 mt-2">
                                <strong>Reason:</strong> {candidate.rejection_reason}
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            {candidate.status === 'approved' && election && election.status === 'active' && (
                              <button
                                onClick={() => handleViewScoreboard(election)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                              >
                                <TrendingUp className="w-4 h-4" />
                                View Scoreboard
                              </button>
                            )}
                            {candidate.status === 'approved' && election && election.status !== 'active' && (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Approved</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Your Profile</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {user?.full_name?.charAt(0) || 'C'}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{user?.full_name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
              <button 
                onClick={handleEditProfile}
                className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                Edit Profile
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-900">Upcoming Events</h3>
                </div>
                <button
                  onClick={() => setShowCandidateRulesModal(true)}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Rules
                </button>
              </div>
              <div className="space-y-3">
                {myCandidates.map((candidate) => {
                  const election = elections.find(e => e.id === candidate.election_id);
                  return (
                    <div key={candidate.id} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">{election?.title || 'Unknown Election'}</p>
                      <p className="text-xs text-slate-600">
                        Status: {candidate.status} | Position: {candidate.position}
                      </p>
                      {candidate.status === 'approved' && (
                        <p className="text-xs text-green-600 mt-1">
                          Votes: {stats.totalVotes} | Ranking: {stats.currentPosition > 0 ? `${stats.currentPosition}${stats.currentPosition === 1 ? 'st' : stats.currentPosition === 2 ? 'nd' : stats.currentPosition === 3 ? 'rd' : 'th'}` : 'N/A'}
                        </p>
                      )}
                    </div>
                  );
                })}
                {myCandidates.length === 0 && (
                <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-900">No Applications Yet</p>
                    <p className="text-xs text-slate-600">Apply for elections to see your progress</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Completed Elections */}
          {elections.filter(e => {
            const endDate = new Date(e.end_date);
            return endDate < new Date();
          }).length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Completed Elections</h3>
                  <p className="text-sm text-slate-500">Elections that have ended</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {elections.filter(e => {
                  const endDate = new Date(e.end_date);
                  return endDate < new Date();
                }).map((election) => {
                  const endDate = new Date(election.end_date);
                  const myCandidate = myCandidates.find(c => c.election_id === election.id);
                  
                  return (
                    <div key={election.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900 mb-1">{election.title}</h4>
                          <p className="text-sm text-slate-500">{election.description}</p>
                        </div>
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
                          Completed
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-xs text-slate-500">
                        <div className="flex justify-between">
                          <span>Ended:</span>
                          <span>{endDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Your Status:</span>
                          <span className={myCandidate ? 'text-green-600 font-medium' : 'text-slate-400'}>
                            {myCandidate ? myCandidate.status : 'Not participated'}
                          </span>
                        </div>
                        {myCandidate && myCandidate.status === 'approved' && (
                          <div className="flex justify-between">
                            <span>Final Result:</span>
                            <span className="text-blue-600 font-medium">Results Available</span>
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
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedElection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Apply for Election</h3>
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
              <p className="text-slate-600 mt-2">{selectedElection.title}</p>
            </div>
            
            <div className="p-6">
              {applicationError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800">{applicationError}</p>
                </div>
              )}

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={applicationData.name}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Age *</label>
                    <input
                      type="number"
                      value={applicationData.age}
                      onChange={(e) => setApplicationData(prev => ({ ...prev, age: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your age"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={applicationData.phone}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Position *</label>
                  <select
                    value={applicationData.position}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, position: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a position</option>
                    {selectedElection.positions?.map((position, index) => (
                      <option key={index} value={position}>{position}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Bio *</label>
                  <textarea
                    value={applicationData.bio}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, bio: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Manifesto *</label>
                  <textarea
                    value={applicationData.manifesto}
                    onChange={(e) => setApplicationData(prev => ({ ...prev, manifesto: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="What are your goals and plans if elected?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Profile Image *</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-2">Upload your profile image</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload('image', e.target.files)}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Choose Image
                    </label>
                    {applicationData.image && (
                      <p className="text-sm text-green-600 mt-2">{applicationData.image.name}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">ID Proof & Supporting Documents *</label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600 mb-2">Upload ID proof and supporting documents (PDF, JPEG)</p>
                    <p className="text-xs text-slate-500 mb-2">Required: Government ID, Academic certificates, etc.</p>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg"
                      multiple
                      onChange={(e) => handleFileUpload('documents', e.target.files)}
                      className="hidden"
                      id="documents-upload"
                    />
                    <label
                      htmlFor="documents-upload"
                      className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      Choose Documents
                    </label>
                    {applicationData.documents.length > 0 && (
                      <div className="mt-2">
                        {applicationData.documents.map((doc, index) => (
                          <p key={index} className="text-sm text-green-600">{doc.name}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowApplicationModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitApplication}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Edit Profile</h3>
                <button
                  onClick={() => setShowEditProfileModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {applicationError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800">{applicationError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={editProfileData.full_name}
                    onChange={(e) => setEditProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={editProfileData.email}
                    onChange={(e) => setEditProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowEditProfileModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateProfile}
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Updating...
                    </>
                  ) : (
                    'Update Profile'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Rules Modal */}
      {showCandidateRulesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Candidate Rules & Guidelines</h3>
                <button
                  onClick={() => setShowCandidateRulesModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Application Rules</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Submit complete application with all required documents</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Provide accurate personal information and qualifications</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Upload clear profile image and supporting documents</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Write a compelling manifesto outlining your goals</span>
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🎯 Campaign Guidelines</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Maintain professional conduct throughout the campaign</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Respect other candidates and their supporters</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Follow all election rules and regulations</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">✓</span>
                      <span>Provide accurate information in all communications</span>
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🚫 Prohibited Activities</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">✗</span>
                      <span>No bribery, coercion, or vote buying</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">✗</span>
                      <span>No spreading false information about opponents</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">✗</span>
                      <span>No use of inappropriate or offensive language</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">✗</span>
                      <span>No violation of election integrity measures</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Important Notes</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Applications are reviewed by administrators before approval</li>
                    <li>• Approved candidates can monitor their vote progress in real-time</li>
                    <li>• All campaign activities must comply with institutional policies</li>
                    <li>• Violations may result in disqualification from the election</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                        <Calendar className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Election Scheduling</h4>
                        <p className="text-sm text-slate-600">Flexible election creation and management</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Real-time Analytics</h4>
                        <p className="text-sm text-slate-600">Live statistics and voting progress tracking</p>
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

      {/* Scoreboard Modal */}
      {showScoreboardModal && scoreboardElection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Live Scoreboard</h3>
                  <p className="text-slate-600 mt-1">{scoreboardElection.title}</p>
                </div>
                <button
                  onClick={() => {
                    // Clean up subscription when closing
                    if (scoreboardUnsubscribe) {
                      scoreboardUnsubscribe();
                      setScoreboardUnsubscribe(null);
                    }
                    setShowScoreboardModal(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {scoreboardLoading ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading vote counts...</p>
                </div>
              ) : scoreboardCandidates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-600">No candidates available yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900 mb-2">Real-time Vote Tracking</h4>
                        <p className="text-sm text-blue-800">
                          Vote counts update automatically as voters cast their ballots. Rankings are based on total votes received.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-green-600">
                        <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium">LIVE</span>
                      </div>
                    </div>
                  </div>

                  {scoreboardCandidates.map((candidate, index) => {
                    const isCurrentUser = candidate.user_id === user?.id;
                    const totalVotes = scoreboardCandidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);
                    const votePercentage = totalVotes > 0 ? Math.round(((candidate.vote_count || 0) / totalVotes) * 100) : 0;
                    
                    return (
                      <div
                        key={candidate.id}
                        className={`p-4 border rounded-xl transition-all ${
                          isCurrentUser
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-200 text-gray-700' :
                            index === 2 ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            #{index + 1}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-slate-900">{candidate.name}</h5>
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">YOU</span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600">{candidate.position}</p>
                            
                            {/* Vote progress bar */}
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                <span>{candidate.vote_count || 0} votes</span>
                                <span>{votePercentage}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    index === 0 ? 'bg-yellow-500' :
                                    index === 1 ? 'bg-gray-400' :
                                    index === 2 ? 'bg-orange-500' :
                                    'bg-blue-500'
                                  }`}
                                  style={{ width: `${votePercentage}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Total Votes Cast:</span>
                      <span className="font-bold text-slate-900">
                        {scoreboardCandidates.reduce((sum, c) => sum + (c.vote_count || 0), 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
