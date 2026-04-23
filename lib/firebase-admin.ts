import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}
export const db = getFirestore();

// User management functions
export async function createOrUpdateUser(userId: string, userData?: any) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    
    const baseUserData = {
      userId,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!userDoc.exists) {
      // Create new user document with comprehensive data
      await userRef.set({
        ...baseUserData,
        createdAt: FieldValue.serverTimestamp(),
        ...userData,
        // Track authentication and usage metrics
        authCount: 1,
        firstAuthAt: FieldValue.serverTimestamp(),
        lastAuthAt: FieldValue.serverTimestamp(),
        // Store user status
        isActive: true,
        isVerified: userData?.emailVerified || false,
        // Store preferences and metadata
        preferences: userData?.preferences || {},
        metadata: userData?.metadata || {},
        // Store authentication context
        authProvider: userData?.azp || 'clerk',
        authMethod: 'session_token',
        // Store session info
        currentSessionId: userData?.sessionId || null,
        previousSessionIds: [],
        // Store profile data
        profile: {
          email: userData?.email || null,
          firstName: userData?.firstName || null,
          lastName: userData?.lastName || null,
          fullName: userData?.fullName || null,
          username: userData?.username || null,
          imageUrl: userData?.imageUrl || null,
        },
        // Store raw claims for future use
        rawClaims: userData?.rawClaims || {},
        // Store security and verification info
        security: {
          emailVerified: userData?.emailVerified || false,
          twoFactorEnabled: userData?.twoFactorEnabled || false,
          lastLoginAt: FieldValue.serverTimestamp(),
          loginCount: 1,
        },
        // Store usage analytics
        analytics: {
          totalSessions: 0,
          totalMessages: 0,
          totalTokensUsed: 0,
          lastActivityAt: FieldValue.serverTimestamp(),
        },
      });
      console.log(`Created new user with comprehensive data: ${userId}`);
    } else {
      // Update existing user document
      const existingData = userDoc.data();
      await userRef.update({
        ...baseUserData,
        ...userData,
        // Update authentication metrics
        authCount: (existingData?.authCount || 0) + 1,
        lastAuthAt: FieldValue.serverTimestamp(),
        // Update session tracking
        currentSessionId: userData?.sessionId || existingData?.currentSessionId,
        previousSessionIds: [
          ...(Array.isArray(existingData?.previousSessionIds) ? existingData.previousSessionIds : []),
          existingData?.currentSessionId
        ].filter(Boolean).slice(-10), // Keep last 10 sessions
        // Update profile if new data provided
        ...(userData?.email && { 'profile.email': userData.email }),
        ...(userData?.firstName && { 'profile.firstName': userData.firstName }),
        ...(userData?.lastName && { 'profile.lastName': userData.lastName }),
        ...(userData?.fullName && { 'profile.fullName': userData.fullName }),
        ...(userData?.username && { 'profile.username': userData.username }),
        ...(userData?.imageUrl && { 'profile.imageUrl': userData.imageUrl }),
        // Update security info
        ...(userData?.emailVerified !== undefined && { 'security.emailVerified': userData.emailVerified }),
        'security.lastLoginAt': FieldValue.serverTimestamp(),
        'security.loginCount': (existingData?.security?.loginCount || 0) + 1,
        // Update activity timestamp
        'analytics.lastActivityAt': FieldValue.serverTimestamp(),
        // Update raw claims
        ...(userData?.rawClaims && { 'rawClaims': userData.rawClaims }),
      });
      console.log(`Updated user with comprehensive data: ${userId}`);
    }
    
    return userRef;
  } catch (error) {
    console.error("Error creating/updating user:", error);
    throw error;
  }
}

export async function getUser(userId: string) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    return userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
  } catch (error) {
    console.error("Error getting user:", error);
    throw error;
  }
}