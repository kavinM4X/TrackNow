/**
 * Test Atlas login — run: node scripts/test-atlas.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('No MONGODB_URI in backend/.env');
  process.exit(1);
}

if (!uri.startsWith('mongodb+srv://') && !uri.startsWith('mongodb://')) {
  console.error('Invalid URI — must start with mongodb+srv:// or mongodb://');
  process.exit(1);
}

let username = '(unknown)';
try {
  const u = new URL(uri.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
  username = decodeURIComponent(u.username || '');
} catch {
  console.error('Could not parse MONGODB_URI — check for spaces or broken line in .env');
  process.exit(1);
}

console.log('Username from .env:', username || '(empty — fix URI)');
console.log('Host:', uri.includes('@') ? uri.split('@')[1]?.split('/')[0] : '?');
console.log('Database:', uri.match(/\.net\/([^?]+)/)?.[1] || '(default)');

mongoose
  .connect(uri, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log('SUCCESS — connected to', mongoose.connection.host);
    console.log('Database:', mongoose.connection.name);
    return mongoose.disconnect();
  })
  .catch((err) => {
    console.error('FAILED:', err.message);
    if (err.message.includes('authentication failed') || err.code === 8000) {
      console.error('\n=== Fix bad auth (do in Atlas website) ===');
      console.error('1. Database Access → ADD NEW DATABASE USER (easiest)');
      console.error('   Username: tracknowapp');
      console.error('   Password: click Autogenerate → COPY it');
      console.error('   Role: "Atlas admin" or "Read and write to any database"');
      console.error('2. Database → Connect → Drivers → copy FULL connection string');
      console.error('3. Change database in URL to: tracknow');
      console.error('4. Paste ONE line into backend/.env as MONGODB_URI=...');
      console.error('5. Run: node scripts/test-atlas.js');
      console.error('\nUsername in .env must EXACTLY match Atlas (case-sensitive).');
    }
    process.exit(1);
  });
