import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Users, Vote, Calendar, CheckCircle, XCircle, AlertCircle, User as UserIcon, Phone, FileText, TrendingUp, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { candidatesService, votesService, electionStatsService, electionListService } from '../lib/firebaseServices';
import { Election, Candidate, ElectionStats, User } from '../lib/firebase';

interface ElectionDetailsDashboardProps {
  election: Election;
  onBack: () => void;
}

export const ElectionDetailsDashboard = ({ election, onBack }: ElectionDetailsDashboardProps) => {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<ElectionStats | null>(null);
  const [voterList, setVoterList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchElectionData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching election data for:', election.id);
        
        // Fetch candidates for this election
        const electionCandidates = await candidatesService.getCandidatesByElection(election.id);
        console.log('Candidates loaded:', electionCandidates.length);
        setCandidates(electionCandidates);

        // Fetch voter list for this election
        let voters: User[] = [];
        try {
          voters = await electionListService.getElectionVoterList(election.id);
          console.log('Voter list loaded:', voters.length);
          setVoterList(voters);
        } catch (voterError) {
          console.warn('Failed to load voter list:', voterError);
          setVoterList([]);
        }

        // Fetch election statistics
        try {
          const electionStats = await electionStatsService.getElectionStats(election.id);
          console.log('Election stats loaded:', electionStats);
          
          // Calculate pending votes based on voter list
          const totalEligibleVoters = voters.length > 0 ? voters.length : (election.maxVoters || 0);
          const pendingVotes = Math.max(0, totalEligibleVoters - electionStats.totalVotes);
          
          setStats({
            ...electionStats,
            totalVoters: totalEligibleVoters,
            pendingVotes
          });
        } catch (statsError) {
          console.warn('Failed to load election stats, using default:', statsError);
          // Set default stats if service fails
          const totalEligibleVoters = voters.length > 0 ? voters.length : (election.maxVoters || 0);
          setStats({
            totalVoters: totalEligibleVoters,
            totalVotes: 0,
            pendingVotes: totalEligibleVoters,
            candidateResults: []
          });
        }
        
      } catch (error) {
        console.error('Error fetching election data:', error);
        setError('Failed to load election data');
      } finally {
        setLoading(false);
      }
    };

    fetchElectionData();
  }, [election.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getElectionStatus = () => {
    const now = new Date();
    const startDate = new Date(election.start_date);
    const endDate = new Date(election.end_date);
    
    if (startDate > now) return 'upcoming';
    if (startDate <= now && endDate >= now) return 'active';
    return 'completed';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading election details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Back to Admin Dashboard"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Election Details</h1>
                <p className="text-xs text-slate-500">{election.title}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-900">{user?.full_name || 'Admin'}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Election Header */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{election.title}</h2>
              <p className="text-slate-600 mb-4">{election.description}</p>
              <div className="flex items-center gap-4 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Start: {new Date(election.start_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>End: {new Date(election.end_date).toLocaleDateString()}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  getElectionStatus() === 'active' ? 'bg-green-100 text-green-700' :
                  getElectionStatus() === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {getElectionStatus()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{stats.totalVoters}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-600">Total Voters</h3>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Vote className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{stats.totalVotes}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-600">Votes Cast</h3>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{stats.pendingVotes}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-600">Pending Votes</h3>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <span className="text-2xl font-bold text-slate-900">{stats.pendingVotes}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-600">Pending Votes</h3>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-2xl font-bold text-slate-900">
                  {stats.totalVoters > 0 ? Math.round((stats.totalVotes / stats.totalVoters) * 100) : 0}%
                </span>
              </div>
              <h3 className="text-sm font-medium text-slate-600">Turnout Rate</h3>
            </div>
          </div>
        )}

        {/* Candidates List */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Participating Candidates</h3>
            <span className="text-sm text-slate-500">{candidates.length} candidates</span>
          </div>

          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No candidates have applied for this election yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => {
                const candidateVotes = stats?.candidateResults.find(r => r.candidateId === candidate.id)?.votes || 0;
                const candidatePercentage = stats?.candidateResults.find(r => r.candidateId === candidate.id)?.percentage || 0;
                
                return (
                  <div key={candidate.id} className="p-4 border border-slate-200 rounded-xl hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {candidate.imageURL ? (
                          <img 
                            src={candidate.imageURL} 
                            alt={candidate.name} 
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 text-xl font-bold">
                            {candidate.name.charAt(0)}
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-medium text-slate-900">{candidate.name}</h4>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                              {candidate.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600 mb-3">
                            <div className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4" />
                              <span>Position: {candidate.position}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              <span>Age: {candidate.age}</span>
                            </div>
                          </div>
                          
                          {candidate.bio && (
                            <p className="text-sm text-slate-600 mb-2">{candidate.bio}</p>
                          )}
                          
                          {candidate.manifesto && (
                            <p className="text-sm text-slate-500 italic">"{candidate.manifesto}"</p>
                          )}
                          
                          {candidate.status === 'rejected' && candidate.rejection_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                              <p className="text-xs text-red-700">
                                <strong>Rejection Reason:</strong> {candidate.rejection_reason}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900">{candidateVotes}</div>
                        <div className="text-sm text-slate-500">votes ({candidatePercentage.toFixed(1)}%)</div>
                        {candidate.documentsURL && candidate.documentsURL.length > 0 && (
                          <div className="mt-2">
                            <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                              <FileText className="w-3 h-3" />
                              Documents
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
