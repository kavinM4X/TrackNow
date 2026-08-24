require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { connectDB } = require('../db');
const User = require('../models/User');

async function checkDrivers() {
  console.log('Using MONGODB_URI:', process.env.MONGODB_URI);
  try {
    await connectDB();
    console.log('✓ Connected to database\n');

    // Check all users
    const allUsers = await User.find({}).select('name email phone role isActive createdAt');
    console.log(`Total users in database: ${allUsers.length}\n`);

    // Group by role
    const byRole = {};
    allUsers.forEach(u => {
      const role = u.role || 'undefined';
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(u);
    });

    console.log('Users by role:');
    Object.keys(byRole).sort().forEach(role => {
      console.log(`  ${role}: ${byRole[role].length}`);
    });
    console.log('');

    // Show driver details
    const drivers = await User.find({ role: { $in: ['driver', 'staff'] } })
      .select('name email phone role isActive createdAt')
      .sort({ createdAt: -1 });
    
    console.log(`\nDriver/Staff accounts (${drivers.length}):`);
    if (drivers.length === 0) {
      console.log('  ⚠ No driver or staff accounts found in database');
    } else {
      drivers.forEach((d, i) => {
        console.log(`  ${i + 1}. ${d.name} (${d.role})`);
        console.log(`     Phone: ${d.phone}`);
        console.log(`     Email: ${d.email || 'N/A'}`);
        console.log(`     Active: ${d.isActive}`);
        console.log(`     Created: ${d.createdAt}`);
        console.log('');
      });
    }

    // Show regular users
    const regularUsers = await User.find({ role: 'user' })
      .select('name phone role isActive')
      .sort({ createdAt: -1 })
      .limit(5);
    
    console.log(`\nRegular users (showing first 5 of ${byRole.user?.length || 0}):`);
    regularUsers.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.name} (${u.role}) - Active: ${u.isActive}`);
    });

    // Test the query used in admin route
    console.log('\n--- Testing Admin Users API Query ---');
    const apiQuery = { role: { $in: ['user', 'driver', 'staff'] } };
    const apiResults = await User.find(apiQuery)
      .sort({ createdAt: -1 })
      .select('-password');
    
    console.log(`Query: User.find({ role: { $in: ['user', 'driver', 'staff'] } })`);
    console.log(`Results: ${apiResults.length} accounts`);
    
    const apiByRole = {};
    apiResults.forEach(u => {
      const role = u.role || 'undefined';
      apiByRole[role] = (apiByRole[role] || 0) + 1;
    });
    
    console.log('Breakdown:');
    Object.keys(apiByRole).sort().forEach(role => {
      console.log(`  ${role}: ${apiByRole[role]}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDrivers();
