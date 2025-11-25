import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { electionsService, usersService } from '../lib/firebaseServices';
import { Shield, Users, Vote, Settings, LogOut, CheckCircle } from 'lucide-react';

export const AdminPanel = () => {
  const { user, signOut } = useAuth();
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalElections: 0,
    activeElections: 0
  });

  const loadStats = async () => {
    try {
      const [users, elections] = await Promise.all([
        usersService.getAllUsers(),
        electionsService.getAllElections()
      ]);
      
      setStats({
        totalUsers: users.length,
        totalElections: elections.length,
        activeElections: elections.filter(e => e.status === 'active').length
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">BallotBridge</h1>
                <p className="text-xs text-slate-500">Admin Setup</p>
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
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Admin Setup Complete</h2>
          <p className="text-slate-600">Your BallotBridge system is ready for use</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.totalUsers}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Users</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Vote className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.totalElections}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Total Elections</h3>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-amber-600" />
              </div>
              <span className="text-2xl font-bold text-slate-900">{stats.activeElections}</span>
            </div>
            <h3 className="text-sm font-medium text-slate-600">Active Elections</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-slate-700">Firebase Authentication</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-slate-700">Firestore Database</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-slate-700">Firebase Storage</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-slate-700">Security Rules</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Next Steps</h3>
            <div className="space-y-3 text-sm text-slate-600">
              <p>1. Create your first election using the admin dashboard</p>
              <p>2. Add voters to the election</p>
              <p>3. Review and approve candidate applications</p>
              <p>4. Monitor voting progress in real-time</p>
            </div>
            <div className="mt-4">
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Go to Admin Dashboard
              </a>
            </div>
          </div>
        </div>

        {message && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-blue-800">{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};
