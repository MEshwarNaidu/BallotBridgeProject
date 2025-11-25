# Quick Start Guide - E-Voting Platform

## 🚀 What's New

Your e-voting platform has been completely upgraded with:
- ✅ Smart election filtering (voters only see elections they're allowed to vote in)
- ✅ Automatic status updates (upcoming → active → completed)
- ✅ Real Firebase data (no mock data)
- ✅ Secure voting restrictions (one vote per election)
- ✅ Vote counting on candidates
- ✅ Admin voter/candidate management

---

## 📋 Database Setup Required

### 1. Update Firestore Rules

Add these security rules to allow the new fields:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Elections collection
    match /elections/{electionId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Candidates collection
    match /candidates/{candidateId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Votes collection
    match /votes/{voteId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false; // Votes cannot be modified
    }
  }
}
```

### 2. Initialize Existing Data (Optional)

If you have existing elections/users/candidates, you may need to migrate data:

#### For existing Elections:
Add these fields to each election document:
```javascript
{
  allowed_voters: [],  // Empty array - admin will populate
  candidates: [],      // Empty array - will be populated when candidates apply
  status: "upcoming"   // or "active" or "completed" based on dates
}
```

#### For existing Users:
Add these fields to each user document:
```javascript
{
  has_voted_for: {},         // Empty object
  voted_candidate_for: {}    // Empty object
}
```

#### For existing Candidates:
Add this field to each candidate document:
```javascript
{
  vote_count: 0  // Initialize to 0
}
```

---

## 🎯 Admin Workflow

### Creating an Election:

1. **Login as Admin**
2. **Create Election:**
   - Fill in title, description, dates
   - Set positions
   - Click "Create Election"
   
3. **Add Voters:**
   - Click "Manage Lists" on the election
   - Add user IDs to `allowed_voters` list
   - **Important:** Only users in this list can see and vote in this election

4. **Manage Candidates:**
   - When candidates apply, approve them from "Pending Approvals"
   - Approved candidates are automatically added to the election's `candidates` array

### Election Status:
- Status updates automatically based on dates
- No manual intervention needed
- Voters only see "active" elections they're allowed to vote in

---

## 👥 Voter Workflow

### Voting Process:

1. **Login as Voter**
2. **See Available Elections:**
   - Only elections where you're in `allowed_voters`
   - Only elections with status = `active`
   
3. **Vote:**
   - Click election card
   - View approved candidates
   - Click candidate to vote
   - **One vote only** - can't change or vote again

4. **After Voting:**
   - Election shows "You have voted"
   - Vote button disabled
   - Can view results when election ends

---

## 🔧 How to Run

### Development:
```bash
npm run dev
```

### Build for Production:
```bash
npm run build
npm run preview
```

---

## 📊 Monitoring Elections

### Auto-Status Updates:
- Elections automatically transition: upcoming → active → completed
- Based on `start_date` and `end_date`
- Updates happen:
  - On page load
  - Every 60 seconds (voter dashboard)
  - When admin refreshes

### Checking Vote Counts:
- Each candidate has `vote_count` field
- Incremented atomically when voted
- Admin can view in election details

---

## 🐛 Troubleshooting

### "You have already voted" Error:
- Check user's `has_voted_for` object
- Each election ID should only be `true` once

### Voters Can't See Election:
- Verify voter's user ID is in election's `allowed_voters` array
- Check election status is "active"
- Check election dates are correct

### Candidates Not Showing:
- Verify candidates are approved (status = "approved")
- Check candidate IDs are in election's `candidates` array
- Ensure candidates have the correct `election_id`

### Status Not Updating:
- Check Firebase connection
- Verify `start_date` and `end_date` are Timestamps
- Refresh the page manually

---

## 📁 Key Files

### Database Types:
- `src/lib/firebase.ts` - Type definitions

### Services:
- `src/lib/firebaseServices.ts` - All database operations

### Components:
- `src/components/VoterDashboard.tsx` - Voter interface
- `src/components/AdminDashboard.tsx` - Admin interface
- `src/components/CandidateDashboard.tsx` - Candidate interface

---

## 🎓 Example: Complete Election Flow

### 1. Admin Creates Election
```
Title: "Student Council 2024"
Start: 2024-12-01 00:00
End: 2024-12-15 23:59
Positions: ["President", "Vice President"]
```

### 2. Admin Adds Voters
```
allowed_voters: ["voter_user_id_1", "voter_user_id_2", "voter_user_id_3"]
```

### 3. Candidates Apply
- Alice applies for President → creates candidate document
- Bob applies for President → creates candidate document

### 4. Admin Approves Candidates
- Alice approved → her candidate ID added to election.candidates
- Bob approved → his candidate ID added to election.candidates

### 5. Election Goes Active (Dec 1)
- Status automatically changes from "upcoming" to "active"
- Voters see election in their dashboard

### 6. Voters Vote
- Voter 1 votes for Alice:
  - Alice's `vote_count` incremented: 0 → 1
  - Voter 1's `has_voted_for["election_id"]` = true
  - Voter 1's `voted_candidate_for["election_id"]` = alice_candidate_id
  - Vote record created

### 7. Election Ends (Dec 15)
- Status automatically changes to "completed"
- Results visible to admin
- Voters can see their vote in completed elections

---

## ✅ Testing Checklist

Before deploying:

- [ ] Create test election with future dates
- [ ] Add yourself as allowed voter
- [ ] Verify election appears only if you're in allowed_voters
- [ ] Verify election status updates correctly
- [ ] Test voting (should work once)
- [ ] Test voting again (should show error)
- [ ] Check candidate vote_count increments
- [ ] Verify has_voted_for updates
- [ ] Test election completion (change end_date to past)

---

## 🎉 You're All Set!

Your e-voting platform now has:
- **Smart filtering** - voters only see their elections
- **Auto-status** - elections transition automatically
- **Secure voting** - one vote per election enforced
- **Real data** - all Firebase collections
- **Admin control** - manage voters and candidates

For detailed technical information, see `IMPLEMENTATION_SUMMARY.md`

Happy voting! 🗳️
