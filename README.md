# BallotBridge

A modern, secure voting application built with React, TypeScript, and Firebase. BallotBridge provides a transparent and trustworthy platform for conducting elections with real-time results and comprehensive admin controls.

## Features

- **Multi-role Authentication**: Support for Admin, Candidate, and Voter roles
- **Real-time Dashboard**: Live updates for election status, vote counts, and results
- **Secure Voting**: Firebase-powered authentication and data storage
- **Admin Controls**: Complete election management, candidate approval, and analytics
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Type Safety**: Full TypeScript implementation

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage, Analytics)
- **Build Tool**: Vite
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Firebase project with the following services enabled:
  - Authentication
  - Firestore Database
  - Storage
  - Analytics

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd BallotBridge
```

2. Install dependencies:
```bash
npm install
```

3. Firebase Configuration:
   - The Firebase configuration is already set up in `src/lib/firebase.ts`
   - Make sure your Firebase project has the following collections in Firestore:
     - `users` - User profiles and roles
     - `elections` - Election data
     - `candidates` - Candidate applications and information
     - `votes` - Vote records

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

### Admin Panel

Access the admin panel at `http://localhost:5173/admin-panel` to:
- Seed sample data for testing
- Create test elections
- Manage the application

## Project Structure

```
src/
├── components/          # React components
│   ├── AdminDashboard.tsx
│   ├── CandidateDashboard.tsx
│   ├── VoterDashboard.tsx
│   ├── Auth.tsx
│   └── AdminPanel.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── lib/               # Firebase configuration and services
│   ├── firebase.ts
│   ├── firebaseServices.ts
│   └── seedData.ts
└── main.tsx           # Application entry point
```

## Firebase Collections

### Users Collection
```typescript
{
  id: string;
  email: string;
  role: 'admin' | 'candidate' | 'voter';
  full_name: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### Elections Collection
```typescript
{
  id: string;
  title: string;
  description: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  start_date: Timestamp;
  end_date: Timestamp;
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### Candidates Collection
```typescript
{
  id: string;
  election_id: string;
  user_id: string;
  name: string;
  bio: string;
  manifesto: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: Timestamp;
  updated_at: Timestamp;
}
```

### Votes Collection
```typescript
{
  id: string;
  election_id: string;
  candidate_id: string;
  voter_id: string;
  created_at: Timestamp;
}
```

## Usage

### For Admins
- Create and manage elections
- Approve/reject candidate applications
- View real-time analytics and vote counts
- Monitor election progress

### For Candidates
- Apply for elections
- Track campaign performance
- View vote counts and rankings
- Manage profile information

### For Voters
- View available elections
- Cast votes securely
- Track voting history
- View election results

## Security Features

- Firebase Authentication for secure user management
- Role-based access control
- Secure vote casting with duplicate prevention
- Real-time data validation
- Protected admin functions

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the repository.
