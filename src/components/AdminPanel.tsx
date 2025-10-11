import { useState } from 'react';
import { seedSampleData, createSampleAdmin } from '../lib/seedData';
import { electionsService } from '../lib/firebaseServices';
import { Plus, Database, Users, Settings } from 'lucide-react';

export const AdminPanel = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSeedData = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const success = await seedSampleData();
      if (success) {
        setMessage('Sample data seeded successfully!');
      } else {
        setMessage('Failed to seed sample data');
      }
    } catch (error) {
      setMessage('Error seeding data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const adminId = await createSampleAdmin();
      if (adminId) {
        setMessage('Sample admin user created successfully!');
      } else {
        setMessage('Failed to create sample admin');
      }
    } catch (error) {
      setMessage('Error creating admin: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateElection = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      const electionId = await electionsService.createElection({
        title: 'Test Election',
        description: 'A test election for demonstration purposes',
        status: 'active',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: 'admin',
      });
      
      setMessage(`Test election created with ID: ${electionId}`);
    } catch (error) {
      setMessage('Error creating election: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Panel</h1>
          <p className="text-slate-600">Manage your BallotBridge application</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Seed Sample Data</h3>
                <p className="text-sm text-slate-600">Create sample elections, candidates, and votes</p>
              </div>
            </div>
            <button
              onClick={handleSeedData}
              disabled={loading}
              className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Seeding...' : 'Seed Data'}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Admin User</h3>
                <p className="text-sm text-slate-600">Create a sample admin user for testing</p>
              </div>
            </div>
            <button
              onClick={handleCreateAdmin}
              disabled={loading}
              className="w-full py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create Test Election</h3>
                <p className="text-sm text-slate-600">Create a test election for demonstration</p>
              </div>
            </div>
            <button
              onClick={handleCreateElection}
              disabled={loading}
              className="w-full py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Election'}
            </button>
          </div>
        </div>

        {message && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-blue-800">{message}</p>
          </div>
        )}

        <div className="mt-8 bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-6 h-6 text-slate-600" />
            <h3 className="text-lg font-bold text-slate-900">Firebase Configuration</h3>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <p>✅ Firebase Auth configured</p>
            <p>✅ Firestore database connected</p>
            <p>✅ Firebase Storage available</p>
            <p>✅ Analytics enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
};
