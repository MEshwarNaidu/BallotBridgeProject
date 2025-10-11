import { useAuth } from '../contexts/AuthContext';
import { LayoutGrid, Users, Vote, BarChart3, Settings, LogOut } from 'lucide-react';

export const AdminDashboard = () => {
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
                <p className="text-xs text-slate-500">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
              <span className="text-2xl font-bold text-slate-900">3</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Active Elections</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">45</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Candidates</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Vote className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">1,234</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Votes Cast</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">89%</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Voter Turnout</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Active Elections</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                Create New
              </button>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Student Council President 2025', status: 'Live', votes: 456, ends: '2 days' },
                { title: 'Club Committee Elections', status: 'Live', votes: 234, ends: '5 days' },
                { title: 'Sports Captain Selection', status: 'Upcoming', votes: 0, ends: '7 days' },
              ].map((election, i) => (
                <div
                  key={i}
                  className="p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-1">{election.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            election.status === 'Live'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {election.status}
                        </span>
                        <span>{election.votes} votes</span>
                        <span>Ends in {election.ends}</span>
                      </div>
                    </div>
                    <Settings className="w-5 h-5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Pending Approvals</h3>
            <div className="space-y-4">
              {[
                { name: 'John Smith', role: 'Candidate', election: 'Student Council' },
                { name: 'Emily Davis', role: 'Candidate', election: 'Club Committee' },
                { name: 'Michael Chen', role: 'Candidate', election: 'Sports Captain' },
              ].map((approval, i) => (
                <div key={i} className="p-4 border border-slate-200 rounded-xl">
                  <p className="font-medium text-slate-900 mb-1">{approval.name}</p>
                  <p className="text-xs text-slate-600 mb-3">{approval.election}</p>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">
                      Approve
                    </button>
                    <button className="flex-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
