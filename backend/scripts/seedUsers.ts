import mongoose from 'mongoose';
import User from '../src/models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env');
  process.exit(1);
}

const seedUsers = async () => {
  try {
    console.log('🌱 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const usersToSeed = [
      {
        email: 'amit@example.com',
        displayName: 'Amit Pandey',
        firebaseUid: 'seed_amit_pandey_uid',
        isPremium: true,
        // verifiedBadge: true, // Assuming we add this field or reuse isPremium
      },
      {
        email: 'the_shyam@example.com',
        displayName: 'THESHYAMKPANDEY',
        firebaseUid: 'seed_shyam_pandey_uid',
        isPremium: true,
      },
    ];

    for (const userData of usersToSeed) {
      // Check if user exists by email
      let user = await User.findOne({ email: userData.email });

      if (user) {
        console.log(`🔄 User ${userData.displayName} exists. Updating premium status...`);
        user.isPremium = true;
        // user.verifiedBadge = true;
        await user.save();
        console.log(`✅ Updated ${userData.displayName}`);
      } else {
        console.log(`🆕 Creating user ${userData.displayName}...`);
        user = await User.create({
          ...userData,
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=random`,
          isOnline: false,
          lastSeen: new Date(),
        });
        console.log(`✅ Created ${userData.displayName}`);
      }
    }

    console.log('🎉 Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedUsers();
