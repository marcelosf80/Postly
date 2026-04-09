const { users } = require('./data/store');

const userId = '766f685f-0043-41bb-98bc-b2cf976fa8fb';
const updates = {
    mp_public_key: 'APP_USR-6c9e0254-2fee-4b9b-aa8d-fe4b283e9eac',
    mp_access_token: 'APP_USR-7251013667787967-040721-1f9353a9ca75052c5f8f5bdb33ea3918-93263438'
};

console.log('Updating user:', userId);
const updated = users.update(userId, updates);
console.log('Result:', updated);
