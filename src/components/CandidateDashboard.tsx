import { useAuth } from '../contexts/AuthContext';
import { Vote, TrendingUp, Users, Calendar, LogOut } from 'lucide-react';

export const CandidateDashboard = () => {
  const { user, signOut } = useAuth();

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
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome, {user?.full_name || 'Candidate'}</h2>
          <p className="text-slate-600">Track your campaign performance and manage your profile</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Vote className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">142</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Votes Received</h3>
            <p className="text-xs text-green-600 mt-2">+12% from yesterday</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">2nd</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Current Position</h3>
            <p className="text-xs text-slate-500 mt-2">Out of 8 candidates</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">67%</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Voter Engagement</h3>
            <p className="text-xs text-green-600 mt-2">Above average</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Your Elections</h3>
            <div className="space-y-4">
              {[
                { title: 'Student Council President 2025', status: 'Active', position: 2, votes: 142 },
                { title: 'Club Committee Elections', status: 'Pending Approval', position: null, votes: 0 },
              ].map((election, i) => (
                <div
                  key={i}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 mb-2">{election.title}</h4>
                      <div className="flex items-center gap-3 text-sm">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            election.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {election.status}
                        </span>
                        {election.position && (
                          <>
                            <span className="text-slate-600">{election.votes} votes</span>
                            <span className="text-slate-600">Position #{election.position}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                      View Details
                    </button>
                  </div>
                  {election.status === 'Active' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-600 mb-2">
                        <span>Vote Progress</span>
                        <span>142 / 456 total votes</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '31%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-medium hover:border-blue-400 hover:text-blue-600 transition-colors">
              Apply for New Election
            </button>
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
              <button className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                Edit Profile
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-slate-600" />
                <h3 className="font-bold text-slate-900">Upcoming Events</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-900">Campaign Rally</p>
                  <p className="text-xs text-slate-600">Tomorrow, 2:00 PM</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm font-medium text-slate-900">Candidate Debate</p>
                  <p className="text-xs text-slate-600">Friday, 4:00 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
