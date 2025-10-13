import { useAuth } from '../contexts/AuthContext';
import { Vote, CheckCircle, Clock, TrendingUp, LogOut, Users, FileText, AlertCircle, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { electionsService, votesService, candidatesService, voterManagementService, emailValidationService } from '../lib/firebaseServices';
import { Election, Vote as VoteType, Candidate } from '../lib/firebase';
import VotingRules from './VotingRules';

export const VoterDashboard = () => {
  const { user, signOut } = useAuth();
  const [activeElections, setActiveElections] = useState<Election[]>([]);
  const [upcomingElections, setUpcomingElections] = useState<Election[]>([]);
  const [completedElections, setCompletedElections] = useState<Election[]>([]);
  const [myVotes, setMyVotes] = useState<VoteType[]>([]);
  const [selectedElection, setSelectedElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [showVotingRules, setShowVotingRules] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showEmailValidationModal, setShowEmailValidationModal] = useState(false);
  const [votingError, setVotingError] = useState<string | null>(null);
  const [emailValidationError, setEmailValidationError] = useState<string | null>(null);
  const [countdowns, setCountdowns] = useState<{[key: string]: string}>({});
  const [stats, setStats] = useState({
    availableElections: 0,
    votesCast: 0,
    pendingVotes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const [allElections] = await Promise.all([
          electionsService.getAllElections()
        ]);

        // Get user's votes for each election
        const userVotes: VoteType[] = [];
        for (const election of allElections) {
          const hasVoted = await votesService.hasUserVoted(election.id, user.id);
          if (hasVoted) {
            // Get the actual vote record
            const votes = await votesService.getVotesByElection(election.id);
            const userVote = votes.find(v => v.voter_id === user.id);
            if (userVote) {
              userVotes.push(userVote);
            }
          }
        }
        setMyVotes(userVotes);

            // Separate elections by status based on current date
            const active = allElections.filter(e => getElectionStatus(e) === 'active');
            const upcoming = allElections.filter(e => getElectionStatus(e) === 'upcoming');
            const completed = allElections.filter(e => getElectionStatus(e) === 'completed');
        
        setActiveElections(active);
        setUpcomingElections(upcoming);
        setCompletedElections(completed);

        // Calculate stats
        const availableElections = active.length;
        const votesCast = userVotes.length;
        const pendingVotes = availableElections - votesCast;

        setStats({
          availableElections,
          votesCast,
          pendingVotes
        });
      } catch (error) {
        console.error('Error fetching voter data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Countdown timer effect
  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();
      const newCountdowns: {[key: string]: string} = {};

      upcomingElections.forEach(election => {
        const startDate = new Date(election.start_date);
        const timeDiff = startDate.getTime() - now.getTime();

        if (timeDiff > 0) {
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
        } else {
          newCountdowns[election.id] = 'Starting now...';
        }
      });

      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [upcomingElections]);

  const handleVoteClick = async (election: Election) => {
    if (!user) return;
    
    try {
      // Check if user has already voted
      const hasVoted = await votesService.hasUserVoted(election.id, user.id);
      if (hasVoted) {
        setVotingError('You have already voted in this election');
        return;
      }

      // Check if user is eligible to vote (in voter list or if no voter list exists)
      const voters = await voterManagementService.getElectionVoters(election.id);
      const isEligible = voters.length === 0 || voters.some(v => v.user_id === user.id);
      if (!isEligible) {
        setVotingError('You are not eligible to vote in this election');
        return;
      }

      // Check if election has email format restriction
      if (election.allowedEmailFormat) {
        setSelectedElection(election);
        setShowEmailValidationModal(true);
        setVotingError(null);
        return;
      }

      // Proceed directly to voting if no email restriction
      await proceedToVoting(election);
    } catch (error) {
      console.error('Error preparing vote:', error);
      setVotingError('Error loading election data');
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

  const proceedToVoting = async (election: Election) => {
    try {
      // Check if user is in the voter list (if voter list exists)
      if (election.voterList && election.voterList.length > 0) {
        if (!election.voterList.includes(user?.id || '')) {
          setVotingError('You are not authorized to vote in this election. Only selected voters can participate.');
          return;
        }
      }

      // Check if election is currently active
      const now = new Date();
      const startDate = new Date(election.start_date);
      const endDate = new Date(election.end_date);
      
      if (startDate > now) {
        setVotingError('This election has not started yet');
        return;
      }
      
      if (endDate < now) {
        setVotingError('This election has already ended');
        return;
      }

      // Get candidates for this election
      try {
        const electionCandidates = await candidatesService.getCandidatesByElection(election.id);
        console.log('Candidates loaded for voting:', electionCandidates.length);
        
        const approvedCandidates = electionCandidates.filter(c => c.status === 'approved');
        console.log('Approved candidates:', approvedCandidates.length);
        
        if (approvedCandidates.length === 0) {
          setVotingError('No approved candidates available for this election');
          return;
        }
        
        setSelectedElection(election);
        setCandidates(approvedCandidates);
        setShowVotingModal(true);
        setVotingError(null);
      } catch (candidateError) {
        console.error('Error loading candidates:', candidateError);
        setVotingError('Failed to load voting options. Please try again.');
        return;
      }
    } catch (error) {
      console.error('Error in proceedToVoting:', error);
      setVotingError('Failed to load voting options');
    }
  };

  const handleEmailValidation = async (email: string) => {
    if (!selectedElection || !selectedElection.allowedEmailFormat) return;

    try {
      // Check if the user's email contains the required keyword
      const userEmail = user?.email || '';
      const isValid = emailValidationService.validateEmailFormat(userEmail, selectedElection.allowedEmailFormat);
      
      if (isValid) {
        setShowEmailValidationModal(false);
        await proceedToVoting(selectedElection);
      } else {
        setEmailValidationError(`Your email (${userEmail}) does not contain the required keyword: "${selectedElection.allowedEmailFormat}"`);
      }
    } catch (error) {
      setEmailValidationError('Invalid email format');
    }
  };

  const handleCastVote = async (candidateId: string) => {
    if (!user || !selectedElection) return;
    
    try {
      await votesService.castVote({
        election_id: selectedElection.id,
        candidate_id: candidateId,
        voter_id: user.id
      });

      // Refresh data
      const hasVoted = await votesService.hasUserVoted(selectedElection.id, user.id);
      if (hasVoted) {
        const votes = await votesService.getVotesByElection(selectedElection.id);
        const userVote = votes.find(v => v.voter_id === user.id);
        if (userVote) {
          setMyVotes(prev => [...prev, userVote]);
        }
      }

      setShowVotingModal(false);
      setSelectedElection(null);
      setCandidates([]);
      
      // Refresh elections data
      const allElections = await electionsService.getAllElections();
      const active = allElections.filter(e => e.status === 'active');
      setActiveElections(active);
      
    } catch (error) {
      console.error('Error casting vote:', error);
      setVotingError('Failed to cast vote. Please try again.');
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
            <button
              onClick={() => setShowVotingRules(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Voting Rules
            </button>
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
                  {upcomingElections && upcomingElections.length > 0 ? upcomingElections.map((election) => {
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
                              {countdowns[election.id] || 'Starting soon...'}
                            </span>
                          </span>
                          <span className="text-slate-400">Ends {endDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  }) : null}
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
                  activeElections && activeElections.length > 0 ? activeElections.map((election) => {
                    const hasVoted = myVotes.some(v => v.election_id === election.id);
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
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 mb-2">{election.title}</h4>
                            <p className="text-sm text-slate-600 mb-3">{election.description}</p>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                {election.status}
                              </span>
                              <span>Ends in {daysLeft} days</span>
                              {election.positions && election.positions.length > 0 && (
                                <span className="text-slate-500">
                                  {election.positions.length} position{election.positions.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            {hasVoted ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                                <CheckCircle className="w-4 h-4" />
                                Voted
                              </div>
                            ) : (
                              <button 
                                onClick={() => handleVoteClick(election)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                              >
                                Vote Now
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {hasVoted ? 'You have voted' : 'Voting open'}
                          </span>
                          <span className="text-slate-400">Ends {endDate.toLocaleDateString()}</span>
                        </div>
                      </div>
                    );
                  }) : null
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Completed Elections</h3>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-slate-600 text-sm">Loading...</p>
                  </div>
                ) : completedElections.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-slate-600 text-sm">No completed elections</p>
                  </div>
                ) : (
                  completedElections.map((election) => {
                    const userVote = myVotes.find(v => v.election_id === election.id);
                    return (
                      <div key={election.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">{election.title}</h4>
                            <div className="space-y-1 text-sm">
                              <p className="text-slate-600">
                                Status: <span className="font-medium text-slate-900">Completed</span>
                              </p>
                              {userVote && (
                                <p className="text-slate-600">
                                  You voted: <span className="font-medium text-slate-900">Yes</span>
                                </p>
                              )}
                              <p className="text-slate-500">Election ended</p>
                            </div>
                          </div>
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <button className="mt-3 text-xs text-blue-600 hover:text-blue-700 font-medium">
                          View Full Results
                        </button>
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

          {/* Completed Elections */}
          {completedElections.length > 0 && (
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
                {completedElections.map((election) => {
                  const endDate = new Date(election.end_date);
                  const hasVoted = myVotes.some(vote => vote.election_id === election.id);
                  
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
                          <span>Your Vote:</span>
                          <span className={hasVoted ? 'text-green-600 font-medium' : 'text-slate-400'}>
                            {hasVoted ? 'Voted' : 'Not voted'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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

              <div className="space-y-4">
                <h4 className="font-medium text-slate-900">Select your candidate:</h4>
                {candidates.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-600">No approved candidates available for this election</p>
                  </div>
                ) : (
                  candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors cursor-pointer"
                    onClick={() => handleCastVote(candidate.id)}
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
                      <div className="w-6 h-6 border-2 border-slate-300 rounded-full"></div>
                    </div>
                  </div>
                  ))
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

