import { useAuth } from '../contexts/AuthContext';
import { Vote, CheckCircle, Clock, TrendingUp, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { electionsService, votesService } from '../lib/firebaseServices';
import { Election, Vote as VoteType } from '../lib/firebase';

export const VoterDashboard = () => {
  const { user, signOut } = useAuth();
  const [activeElections, setActiveElections] = useState<Election[]>([]);
  const [completedElections, setCompletedElections] = useState<Election[]>([]);
  const [myVotes, setMyVotes] = useState<VoteType[]>([]);
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
        const [allElections, allVotes] = await Promise.all([
          electionsService.getAllElections(),
          votesService.getVotesByElection('') // Get all votes for this user
        ]);

        // Filter votes for current user
        const userVotes = allVotes.filter(v => v.voter_id === user.id);
        setMyVotes(userVotes);

        // Separate active and completed elections
        const active = allElections.filter(e => e.status === 'active');
        const completed = allElections.filter(e => e.status === 'completed');
        
        setActiveElections(active);
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
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {user?.full_name || 'Voter'}</h2>
          <p className="text-slate-600">Your voice matters. Cast your vote and make a difference.</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
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
                          <div>
                            <h4 className="font-medium text-slate-900 mb-2">{election.title}</h4>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                {election.status}
                              </span>
                              <span>Ends in {daysLeft} days</span>
                            </div>
                          </div>
                          {!hasVoted && (
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
                              Vote Now
                            </button>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {hasVoted ? 'You have voted' : 'Voting open'}
                          </span>
                          <button className="text-blue-600 hover:text-blue-700 font-medium">
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
                  <span className="font-medium text-slate-900">1</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Participation Rate</span>
                  <span className="font-medium text-slate-900">33%</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Member Since</span>
                  <span className="font-medium text-slate-900">Jan 2025</span>
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
                <p className="text-xs text-blue-100 mb-1">Average turnout increase</p>
                <p className="text-2xl font-bold">+15%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
