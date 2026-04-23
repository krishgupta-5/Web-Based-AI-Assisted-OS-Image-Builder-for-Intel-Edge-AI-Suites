import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export async function getUserFromRequest() {
  try {
    const { userId } = await auth();
    return userId;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/login');
  }
  return userId;
}

export async function isAuthenticated() {
  const { userId } = await auth();
  return !!userId;
}

// Enhanced function to get full user data from Clerk
export async function getFullUserData() {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return null;
    }

    // Fetch real user data from Clerk API
    let user = null;
    try {
      const client = await clerkClient();
      user = await client.users.getUser(userId);
    } catch (userError) {
      console.warn('Failed to fetch user from Clerk API, falling back to session claims:', userError);
    }

    return {
      userId,
      email: user?.emailAddresses?.[0]?.emailAddress || sessionClaims?.email || null,
      firstName: user?.firstName || sessionClaims?.firstName || null,
      lastName: user?.lastName || sessionClaims?.lastName || null,
      fullName: user?.fullName || sessionClaims?.fullName || sessionClaims?.name || null,
      username: user?.username || sessionClaims?.username || null,
      imageUrl: user?.imageUrl || sessionClaims?.picture || sessionClaims?.image || null,
      sessionId: sessionClaims?.sid || null,
      // Session and auth context data
      sessionClaims: sessionClaims || {},
      // Additional claims that might be available
      emailVerified: user?.emailAddresses?.[0]?.verification?.status === 'verified' || sessionClaims?.email_verified || false,
      iss: sessionClaims?.iss || null,
      aud: sessionClaims?.aud || null,
      exp: sessionClaims?.exp || null,
      iat: sessionClaims?.iat || null,
      nbf: sessionClaims?.nbf || null,
      sub: sessionClaims?.sub || null,
      // Authentication method and provider info
      azp: sessionClaims?.azp || null, // Authorized party
      nonce: sessionClaims?.nonce || null,
      authTime: sessionClaims?.auth_time || null,
      // Store the raw claims for future use
      rawClaims: sessionClaims,
    };
  } catch (error) {
    console.error('Error getting full user data:', error);
    return null;
  }
}
