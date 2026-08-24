/**
 * Creates/updates the admin user in MongoDB.
 * Editing this file does NOT change the database until you run:
 *   cd backend && npm run seed:admin
 * Use the same MONGODB_URI as Render (Atlas).
 */
const mongoose = require('mongoose');
const User = require('./models/User');
const { normalizePhone } = require('./utils/phone');
require('dotenv').config();

const ADMIN_PHONE = process.env.ADMIN_PHONE || '7373144198';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Senthil@33';
const LEGACY_PHONES = (process.env.ADMIN_LEGACY_PHONES || '9999999999,7373144189')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tracknow', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB Connected');

    const phone = normalizePhone(ADMIN_PHONE);
    let admin = await User.findOne({ phone });

    if (!admin) {
      for (const legacy of LEGACY_PHONES) {
        const old = await User.findOne({ phone: normalizePhone(legacy) });
        if (old) {
          old.phone = phone;
          old.role = 'admin';
          old.isActive = true;
          old.password = ADMIN_PASSWORD;
          await old.save();
          admin = old;
          console.log(`Migrated legacy admin phone to ${phone}`);
          break;
        }
      }
    }

    if (admin) {
      admin.name = admin.name || 'Admin User';
      admin.email = admin.email || 'admin@tracknow.com';
      admin.role = 'admin';
      admin.isActive = true;
      admin.password = ADMIN_PASSWORD;
      await admin.save();
      console.log('Admin user updated:');
    } else {
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@tracknow.com',
        phone,
        password: ADMIN_PASSWORD,
        role: 'admin',
        isActive: true
      });
      console.log('Admin user created:');
    }

    console.log(`Phone: ${phone}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('Role: admin');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
