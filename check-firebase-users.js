const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin with environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();

async function checkUsers() {
  try {
    console.log('Checking for users in Firebase Firestore...');
    
    // Get all users from the users collection
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found in Firebase Firestore');
    } else {
      console.log(`✅ Found ${usersSnapshot.size} users in Firebase Firestore:`);
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        console.log(`\n👤 User ID: ${doc.id}`);
        console.log(`   Email: ${userData.profile?.email || 'N/A'}`);
        console.log(`   Name: ${userData.profile?.fullName || 'N/A'}`);
        console.log(`   Created: ${userData.createdAt?.toDate() || 'N/A'}`);
        console.log(`   Auth Provider: ${userData.authProvider || 'N/A'}`);
        console.log(`   Is Active: ${userData.isActive || 'N/A'}`);
      });
    }
    
    // Check sessions collection
    const sessionsSnapshot = await db.collection('sessions').get();
    console.log(`\n📊 Found ${sessionsSnapshot.size} sessions in Firebase Firestore`);
    
  } catch (error) {
    console.error('❌ Error checking Firebase:', error);
  } finally {
    process.exit(0);
  }
}

checkUsers();
