import { useAuth } from '../contexts/AuthContext';
import { Vote, CheckCircle, Clock, TrendingUp, LogOut, FileText, Info, AlertCircle, Users, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { electionsService, votesService, candidatesService, electionStatusService, realtimeService } from '../lib/firebaseServices';
import { Election, Vote as VoteType, Candidate } from '../lib/firebase';
import VotingRules from './VotingRules';

export const VoterDashboard = () => {
  const { user, signOut, refreshUser } = useAuth();
  const [activeElections, setActiveElections] = useState<Election[]>([]);
  const [completedElections, setCompletedElections] = useState<Election[]>([]);
  const [upcomingElections, setUpcomingElections] = useState<Election[]>([]);
  const [myVotes, setMyVotes] = useState<VoteType[]>([]);
  const [stats, setStats] = useState({
    availableElections: 0,
    votesCast: 0,
    pendingVotes: 0
  });
  const [loading, setLoading] = useState(true);
  const [votingError, setVotingError] = useState<string | null>(null);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [showVotingRules, setShowVotingRules] = useState(false);
  const [showEmailValidationModal, setShowEmailValidationModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Function to open voting modal and load candidates
  const handleOpenVotingModal = async (election: Election) => {
    setSelectedElection(election);
    setSelectedCandidate(null);
    setVotingError(null);
    
    try {
      // Fetch all candidates for this election that are approved
      const allCandidates = await candidatesService.getCandidatesByElection(election.id);
      console.log(`Candidates for election ${election.title}:`, allCandidates.length);
      
      // Get candidate IDs from election.candidates array (if specified by admin)
      const assignedCandidateIds = election.candidates || [];
      
      // Filter to show only approved candidates
      // If admin has assigned specific candidates, show only those; otherwise show all approved
      const approvedCandidates = assignedCandidateIds.length > 0
        ? allCandidates.filter(c => c.status === 'approved' && assignedCandidateIds.includes(c.id))
        : allCandidates.filter(c => c.status === 'approved');
      
      console.log(`Approved candidates for voting:`, approvedCandidates.length);
      setCandidates(approvedCandidates);
      setShowVotingModal(true);
    } catch (error) {
      console.error('Error loading candidates:', error);
      setVotingError('Failed to load candidates');
    }
  };

  // Function to handle selecting a candidate
  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  // Function to confirm and cast the vote
  const handleConfirmVote = async () => {
    if (!selectedCandidate || !selectedElection) return;
    
    // Verify election is still active before voting
    if (selectedElection.status !== 'active') {
      setVotingError('This election is no longer active. Please refresh the page.');
      return;
    }
    
    await handleCastVote(selectedCandidate.id);
  };

  // Function to handle casting a vote
  const handleCastVote = async (candidateId: string) => {
    if (!user || !selectedElection) return;
    
    try {
      setVotingError(null);
      // Cast the vote through the service
      await votesService.castVote({
        election_id: selectedElection.id,
        candidate_id: candidateId,
        voter_id: user.id
      });
      
      // Close the modal
      setShowVotingModal(false);
      setSelectedElection(null);
      
      // Refresh user data to get updated has_voted_for
      await refreshUser();
      
      // Wait a bit for user state to update, then reload the page for a clean refresh
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error: any) {
      setVotingError(error.message || 'Failed to cast vote');
    }
  };

  // Function to handle email validation
  const handleEmailValidation = (email: string) => {
    if (!selectedElection || !selectedElection.allowedEmailFormat) {
      setShowEmailValidationModal(false);
      setShowVotingModal(true);
      return;
    }
    
    // Check if email contains the required keyword
    if (email.toLowerCase().includes(selectedElection.allowedEmailFormat.toLowerCase())) {
      setEmailValidationError(null);
      setShowEmailValidationModal(false);
      setShowVotingModal(true);
    } else {
      setEmailValidationError(`Your email must contain "${selectedElection.allowedEmailFormat}" to participate in this election.`);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    if (!user) return;
    
    setRefreshing(true);
    try {
      console.log('Manual refresh triggered - updating election statuses...');
      
      // Force update all election statuses
      await electionStatusService.updateAllElectionStatuses();
      
      // Re-fetch elections with updated statuses
      const allElections = await electionsService.getAllElections();
      console.log('Refreshed elections:', allElections.map(e => ({ 
        id: e.id, 
        title: e.title, 
        status: e.status,
        start_date: e.start_date,
        end_date: e.end_date
      })));
      
      // Filter elections for this voter
      const hasVotedFor = user.has_voted_for || {};
      
      // Show active elections where user is allowed to vote and hasn't voted yet
      const userActiveElections = allElections.filter(e => {
        const allowedVoters = e.allowed_voters || [];
        const hasVoted = hasVotedFor[e.id] === true;
        const shouldShow = allowedVoters.includes(user.id) && e.status === 'active' && !hasVoted;
        console.log(`Refresh filtering - Election ${e.title}:`, { 
          allowed: allowedVoters.includes(user.id), 
          status: e.status, 
          voted: hasVoted, 
          show: shouldShow 
        });
        return shouldShow;
      });

      const userCompletedElections = allElections.filter(e => {
        const allowedVoters = e.allowed_voters || [];
        return allowedVoters.includes(user.id) && e.status === 'completed';
      });

      const userUpcomingElections = allElections.filter(e => {
        const allowedVoters = e.allowed_voters || [];
        return allowedVoters.includes(user.id) && e.status === 'upcoming';
      });
      
      console.log('Refresh results:', { 
        active: userActiveElections.length, 
        completed: userCompletedElections.length, 
        upcoming: userUpcomingElections.length 
      });
      
      setActiveElections(userActiveElections);
      setCompletedElections(userCompletedElections);
      setUpcomingElections(userUpcomingElections);

      // Update stats
      const votedCount = Object.keys(hasVotedFor).filter(electionId => hasVotedFor[electionId]).length;
      setStats({
        availableElections: userActiveElections.length,
        votesCast: votedCount,
        pendingVotes: userActiveElections.length > 0 ? userActiveElections.length - votedCount : 0
      });
      
      setLastRefresh(new Date());
      console.log('Refresh completed successfully');
    } catch (error) {
      console.error('Error during refresh:', error);
      setVotingError('Failed to refresh elections. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Update election statuses on mount
    const updateStatuses = async () => {
      try {
        await electionStatusService.updateAllElectionStatuses();
      } catch (error) {
        console.warn('Failed to update election statuses:', error);
      }
    };
    
    updateStatuses();

    // Set up real-time listener for elections
    const unsubscribe = realtimeService.subscribeToElections(async (electionsData: Election[]) => {
      console.log('Voter Dashboard - Elections updated:', electionsData.length);
      
      // Update statuses for all elections
      await electionStatusService.updateAllElectionStatuses();
      
      // Re-fetch to get updated statuses
      const allElections = await electionsService.getAllElections();
      console.log('All elections with status:', allElections.map(e => ({ id: e.id, title: e.title, status: e.status, start: e.start_date, end: e.end_date })));
      
      // Filter elections where user is in allowed_voters list
      const hasVotedFor = user.has_voted_for || {};
      
      // Active elections: user in allowed_voters, status='active', hasn't voted
      const userActiveElections = allElections.filter(e => {
        const allowedVoters = e.allowed_voters || [];
        const hasVoted = hasVotedFor[e.id] === true;
        const isActive = e.status === 'active';
        const isAllowed = allowedVoters.includes(user.id);
        const shouldShow = isAllowed && isActive && !hasVoted;
        console.log(`Filtering election ${e.title} (ID: ${e.id}):`, {
          isAllowed,
          isActive,
          hasVoted,
          shouldShow,
          status: e.status,
          allowedVoters: allowedVoters.includes(user.id),
          userId: user.id
        });
        return shouldShow;
      });

      // Completed elections: user in allowed_voters, status='completed'
      const userCompletedElections = allElections.filter(e => {
        const allowedVoters = e.allowed_voters || [];
        return allowedVoters.includes(user.id) && e.status === 'completed';
      });

      // Upcoming elections: user in allowed_voters, status='upcoming'
      const userUpcomingElections = allElections.filter(e => {
        const allowedVoters = e.allowed_voters || [];
        return allowedVoters.includes(user.id) && e.status === 'upcoming';
      });
      
      console.log('Filtered elections - Active:', userActiveElections.length, 'Upcoming:', userUpcomingElections.length, 'Completed:', userCompletedElections.length);
      
      setActiveElections(userActiveElections);
      setCompletedElections(userCompletedElections);
      setUpcomingElections(userUpcomingElections);

      // Calculate stats
      const votedCount = Object.keys(hasVotedFor).filter(electionId => hasVotedFor[electionId]).length;
      const availableElections = userActiveElections.length;
      const votesCast = votedCount;
      const pendingVotes = availableElections - votesCast;

      setStats({
        availableElections,
        votesCast,
        pendingVotes
      });
      
      setLastRefresh(new Date());
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, [user]);

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
                <p className="text-xs text-slate-500">Voter Portal</p>
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
                <p className="text-sm font-medium text-slate-900">{user?.full_name || 'Voter'}</p>
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
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {user?.full_name || 'Voter'}</h2>
              <p className="text-slate-600">Your voice matters. Cast your vote and make a difference.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right text-sm text-slate-500">
                <p>Last updated: {lastRefresh.toLocaleTimeString()}</p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setShowVotingRules(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Voting Rules
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Vote className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.availableElections}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Available Elections</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.votesCast}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Votes Cast</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.pendingVotes}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Pending Votes</h3>
          </div>
        </div>

        {votingError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{votingError}</p>
            <button
              onClick={() => setVotingError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Upcoming Elections */}
            {upcomingElections.length > 0 && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-6">Upcoming Elections</h3>
                <div className="space-y-4">
                  {upcomingElections.map((election) => {
                    const startDate = new Date(election.start_date);
                    const endDate = new Date(election.end_date);
                    const now = new Date();
                    const daysUntilStart = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div
                        key={election.id}
                        className="p-5 border border-slate-200 rounded-xl bg-slate-50"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">{election.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {election.status}
                              </span>
                              <span>Starts in {daysUntilStart} days</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-2">{election.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-blue-600 font-medium">
                              {daysUntilStart > 0 ? `Starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''}` : 'Starting soon'}
                            </span>
                          </span>
                          <span className="text-slate-400">Ends {endDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Active Elections */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Active Elections</h3>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading elections...</p>
                  </div>
                ) : activeElections.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No active elections available</p>
                  </div>
                ) : (
                  activeElections.map((election) => {
                    const hasVotedFor = user?.has_voted_for || {};
                    const hasVoted = hasVotedFor[election.id] === true;
                    const endDate = new Date(election.end_date);
                    const now = new Date();
                    const timeLeft = endDate.getTime() - now.getTime();
                    const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                    
                    return (
                      <div
                        key={election.id}
                        className="p-5 border border-slate-200 rounded-xl hover:border-blue-300 transition-all hover:shadow-md"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">{election.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                {election.status}
                              </span>
                              <span>Ends in {daysLeft} days</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-2">{election.description}</p>
                          </div>
                          {!hasVoted && (
                            <button 
                              onClick={() => handleOpenVotingModal(election)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                            >
                              Vote Now
                            </button>
                          )}
                          {hasVoted && (
                            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                              Voted
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {hasVoted ? (
                              <span className="text-green-600 font-medium">You have voted</span>
                            ) : (
                              'Voting open'
                            )}
                          </span>
                          <button 
                            onClick={() => handleOpenVotingModal(election)}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            View Candidates
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Completed Elections</h3>
              <div className="space-y-4">
                {completedElections.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No completed elections</p>
                  </div>
                ) : (
                  completedElections.map((election) => {
                    const hasVotedFor = user?.has_voted_for || {};
                    const votedCandidateFor = user?.voted_candidate_for || {};
                    const hasVoted = hasVotedFor[election.id] === true;
                    const candidateId = votedCandidateFor[election.id];
                    
                    return (
                      <div key={election.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">{election.title}</h4>
                            <div className="space-y-1 text-sm">
                              <p className="text-slate-600">{election.description}</p>
                              <p className="text-slate-600">
                                Your Vote: <span className="font-medium text-slate-900">
                                  {hasVoted ? 'Voted' : 'Not voted'}
                                </span>
                              </p>
                            </div>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-600" />
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
                  {user?.full_name?.charAt(0) || 'V'}
                </div>
                <div>
                  <p className="font-medium text-slate-900">{user?.full_name}</p>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Elections Participated</span>
                  <span className="font-medium text-slate-900">{stats.votesCast}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Participation Rate</span>
                  <span className="font-medium text-slate-900">{stats.votesCast > 0 ? Math.round((stats.votesCast / (stats.votesCast + stats.pendingVotes)) * 100) : 0}%</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Member Since</span>
                  <span className="font-medium text-slate-900">{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
              <TrendingUp className="w-8 h-8 mb-3 opacity-90" />
              <h3 className="font-bold mb-2">Voter Impact</h3>
              <p className="text-sm text-blue-100 mb-4">
                Your participation helps shape our community's future
              </p>
              <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-xs text-blue-100 mb-1">Your participation</p>
                <p className="text-2xl font-bold">{stats.votesCast > 0 ? 'Active' : 'Ready'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Voting Modal */}
      {showVotingModal && selectedElection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Cast Your Vote</h3>
                <button
                  onClick={() => setShowVotingModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
              <p className="text-slate-600 mt-2">{selectedElection.title}</p>
            </div>
            
            <div className="p-6">
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Important</h4>
                <p className="text-sm text-blue-800">
                  You can only vote once in this election. Your vote is anonymous and cannot be changed after submission.
                </p>
              </div>

              {votingError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-800">{votingError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Select your candidate:</h4>
                {candidates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No approved candidates available for this election</p>
                  </div>
                ) : (
                  <>
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                          selectedCandidate?.id === candidate.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                        onClick={() => handleSelectCandidate(candidate)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white font-bold">
                            {candidate.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-slate-900">{candidate.name}</h5>
                            <p className="text-sm text-slate-600">{candidate.position}</p>
                            {candidate.bio && (
                              <p className="text-sm text-slate-500 mt-1">{candidate.bio}</p>
                            )}
                          </div>
                          <div className={`w-6 h-6 border-2 rounded-full flex items-center justify-center ${
                            selectedCandidate?.id === candidate.id
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-slate-300'
                          }`}>
                            {selectedCandidate?.id === candidate.id && (
                              <CheckCircle className="w-5 h-5 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {selectedCandidate && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                          <div>
                            <h5 className="font-medium text-green-900 mb-1">Ready to vote for:</h5>
                            <p className="text-green-800">
                              <strong>{selectedCandidate.name}</strong> - {selectedCandidate.position}
                            </p>
                            <p className="text-sm text-green-700 mt-2">
                              Click "Cast Vote" below to confirm your choice. This action cannot be undone.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => setShowVotingModal(false)}
                        className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmVote}
                        disabled={!selectedCandidate}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Cast Vote
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voting Rules Modal */}
      {showVotingRules && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Voting Rules & Process</h3>
                <button
                  onClick={() => setShowVotingRules(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <VotingRules />
            </div>
          </div>
        </div>
      )}

      {/* Email Validation Modal */}
      {showEmailValidationModal && selectedElection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Email Verification</h3>
                <button
                  onClick={() => setShowEmailValidationModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>
            </div>
            
                <div className="p-6">
                  <div className="mb-4">
                    <p className="text-slate-600 mb-2">
                      This election requires email verification. Your registered email will be validated.
                    </p>
                    <p className="text-sm text-slate-500">
                      Required keyword: <span className="font-medium">"{selectedElection.allowedEmailFormat}"</span>
                    </p>
                    <p className="text-sm text-slate-500">
                      Your email: <span className="font-medium">{user?.email}</span>
                    </p>
                  </div>

                  {emailValidationError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 text-sm">{emailValidationError}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Click "Verify & Continue" to validate your email address and proceed to voting.
                      </p>
                    </div>
                  </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowEmailValidationModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                    <button
                      onClick={() => handleEmailValidation(user?.email || '')}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Verify & Continue
                    </button>
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
                        <h4 className="font-medium text-slate-900">Fair Elections</h4>
                        <p className="text-sm text-slate-600">Transparent and verifiable election processes</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <CheckCircle className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Vote Security</h4>
                        <p className="text-sm text-slate-600">Your vote is encrypted and protected</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                        <TrendingUp className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900">Real-time Results</h4>
                        <p className="text-sm text-slate-600">Live election statistics and updates</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-4">🔒 Your Vote Matters</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold">🔐</span>
                    </div>
                    <h4 className="font-medium text-slate-900">Secure & Private</h4>
                    <p className="text-sm text-slate-600">Your vote is completely anonymous</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-600 font-bold">✅</span>
                    </div>
                    <h4 className="font-medium text-slate-900">Easy to Use</h4>
                    <p className="text-sm text-slate-600">Simple and intuitive voting process</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-purple-600 font-bold">🛡️</span>
                    </div>
                    <h4 className="font-medium text-slate-900">Trusted Platform</h4>
                    <p className="text-sm text-slate-600">Used by institutions worldwide</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-slate-600 mb-4">
                  BallotBridge makes democratic participation accessible, secure, and transparent. Your voice matters, and we ensure it's heard.
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
                  <span>Built with ❤️ for democracy</span>
                  <span>•</span>
                  <span>Your vote is secure</span>
                  <span>•</span>
                  <span>Every voice counts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

