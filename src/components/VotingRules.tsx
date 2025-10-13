import React from 'react';

interface VotingRulesProps {
  className?: string;
}

export const VotingRules: React.FC<VotingRulesProps> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🗳️ Voting Rules & Process</h2>
        <p className="text-gray-600">Understanding how our secure voting system works</p>
      </div>

      <div className="space-y-6">
        {/* Voting Rules */}
        <div className="border-l-4 border-blue-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 Voting Rules</h3>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>One Vote Per Election:</strong> Each voter can cast only one vote per election</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Eligible Voters Only:</strong> Only registered voters can participate in elections</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Time-Limited:</strong> Voting is only allowed during the active election period</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>Anonymous Voting:</strong> Your vote is private and cannot be traced back to you</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span><strong>No Vote Changes:</strong> Once submitted, votes cannot be modified or withdrawn</span>
            </li>
          </ul>
        </div>

        {/* Election Process */}
        <div className="border-l-4 border-green-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🔄 Election Process</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full mr-3 mt-1">1</div>
              <div>
                <h4 className="font-medium text-gray-900">Election Announcement</h4>
                <p className="text-sm text-gray-600">Admins create elections with specific dates and positions</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full mr-3 mt-1">2</div>
              <div>
                <h4 className="font-medium text-gray-900">Candidate Registration</h4>
                <p className="text-sm text-gray-600">Candidates apply and submit required documents for approval</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full mr-3 mt-1">3</div>
              <div>
                <h4 className="font-medium text-gray-900">Admin Approval</h4>
                <p className="text-sm text-gray-600">Admins review and approve eligible candidates</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full mr-3 mt-1">4</div>
              <div>
                <h4 className="font-medium text-gray-900">Voting Period</h4>
                <p className="text-sm text-gray-600">Registered voters cast their votes during the active period</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full mr-3 mt-1">5</div>
              <div>
                <h4 className="font-medium text-gray-900">Results & Announcement</h4>
                <p className="text-sm text-gray-600">Results are calculated and announced after voting closes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Promise */}
        <div className="border-l-4 border-red-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🔒 Security Promise</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🛡️ Data Protection</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• End-to-end encryption for all data</li>
                  <li>• Secure Firebase infrastructure</li>
                  <li>• Regular security audits</li>
                  <li>• GDPR compliant data handling</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">🔐 Vote Integrity</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Immutable vote records</li>
                  <li>• Duplicate vote prevention</li>
                  <li>• Real-time fraud detection</li>
                  <li>• Transparent audit trails</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Our Commitment:</strong> We guarantee that your vote is secure, private, and counted accurately. 
                Our system uses industry-standard security measures to protect the integrity of every election.
              </p>
            </div>
          </div>
        </div>

        {/* Vote Limit System */}
        <div className="border-l-4 border-purple-500 pl-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">🚫 Vote Limit System</h3>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">
              Our system automatically prevents duplicate voting through multiple security layers:
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">🔒</span>
                <span><strong>Database Level:</strong> Firestore rules block duplicate writes from the same user</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">🔒</span>
                <span><strong>Application Level:</strong> Frontend checks prevent multiple submissions</span>
              </li>
              <li className="flex items-start">
                <span className="text-purple-500 mr-2">🔒</span>
                <span><strong>UI Feedback:</strong> Clear indicators show voting status and prevent confusion</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Need Help?</h4>
        <p className="text-sm text-blue-800">
          If you have any questions about the voting process or encounter any issues, 
          please contact your election administrator or support team.
        </p>
      </div>
    </div>
  );
};

export default VotingRules;
