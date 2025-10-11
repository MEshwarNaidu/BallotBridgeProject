import { useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { AdminDashboard } from './components/AdminDashboard';
import { CandidateDashboard } from './components/CandidateDashboard';
import { VoterDashboard } from './components/VoterDashboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'candidate':
      return <CandidateDashboard />;
    case 'voter':
      return <VoterDashboard />;
    default:
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <p className="text-slate-600">Invalid user role</p>
        </div>
      );
  }
}

export default App;
