import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  getRedirectResult,
  linkWithCredential,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.ts';
import { User, UserRole, UserType } from '../types/index.ts';
import {
  getUserProfile,
  createUserProfile,
  createUserInitialProfile,
  logAuditEvent,
  lookupEmailByInstituteId,
  checkInstituteDesignationConflict,
  saveCompleteUserProfile,
} from '../services/firestoreService.ts';

export interface AuthErrorInfo {
  code: string;
  message: string;
  help?: string;
}

export function parseAuthError(err: any): AuthErrorInfo {
  console.error('[Firebase Auth Error Details]:', err);
  const code = err?.code || (typeof err === 'string' && err.includes('auth/') ? err : '');
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';

  switch (code) {
    case 'auth/unauthorized-domain':
      return {
        code,
        message: `Unauthorized Domain (${code})`,
        help: `Add this domain in Firebase Console → Authentication → Settings → Authorized domains: ${hostname}`,
      };
    case 'auth/operation-not-allowed':
      return {
        code,
        message: `Sign-in Provider Disabled (${code})`,
        help: 'Enable Google in Firebase Console → Authentication → Sign-in method.',
      };
    case 'auth/invalid-api-key':
    case 'auth/configuration-not-found':
      return {
        code,
        message: `Project Configuration Error (${code})`,
        help: 'The app is using the wrong Firebase project config.',
      };
    case 'auth/popup-blocked':
      return {
        code,
        message: `Popup Blocked (${code})`,
        help: 'Your browser blocked the sign-in popup. Please allow popups for this site or refresh to try redirect sign-in.',
      };
    case 'auth/popup-closed-by-user':
      return {
        code,
        message: `Sign-in Cancelled (${code})`,
        help: 'The Google sign-in window was closed before completing authentication.',
      };
    case 'auth/cancelled-popup-request':
      return {
        code,
        message: `Request Cancelled (${code})`,
        help: 'Another sign-in request is already in progress.',
      };
    case 'auth/operation-not-supported-in-this-environment':
      return {
        code,
        message: `Environment Not Supported (${code})`,
        help: 'Popup authentication is not supported in this frame. Falling back to redirect authentication.',
      };
    case 'auth/account-exists-with-different-credential':
      return {
        code,
        message: `Account Conflict (${code})`,
        help: 'An account with this email address already exists under another sign-in method. Please sign in with email/password first.',
      };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return {
        code: code || 'auth/invalid-credential',
        message: `Invalid Credentials (${code || 'auth/invalid-credential'})`,
        help: 'The email or password entered is incorrect. Please verify your details or reset your password.',
      };
    case 'auth/email-already-in-use':
      return {
        code,
        message: `Email Already Registered (${code})`,
        help: 'An account with this email address already exists. Please sign in or reset your password.',
      };
    case 'auth/weak-password':
      return {
        code,
        message: `Weak Password (${code})`,
        help: 'Password must be at least 6 characters long.',
      };
    case 'auth/too-many-requests':
      return {
        code,
        message: `Too Many Requests (${code})`,
        help: 'Access has been temporarily disabled due to multiple failed login attempts. Please try again later.',
      };
    case 'auth/user-disabled':
      return {
        code,
        message: `Account Disabled (${code})`,
        help: 'This account has been disabled by an administrator.',
      };
    case 'auth/network-request-failed':
      return {
        code,
        message: `Network Error (${code})`,
        help: 'Unable to connect to Firebase Authentication. Please check your internet connection.',
      };
    default: {
      const msg = err?.message || (typeof err === 'string' ? err : 'Authentication error occurred.');
      return {
        code: code || 'auth/unknown',
        message: code ? `${msg} (${code})` : msg,
        help: undefined,
      };
    }
  }
}

export function formatFirebaseAuthError(err: any): string {
  const parsed = parseAuthError(err);
  return parsed.help ? `${parsed.message} — ${parsed.help}` : parsed.message;
}

interface SignUpProfileData {
  name: string;
  institutionId?: string;
  institutionName?: string;
  designation?: string;
  phone?: string;
  userType?: UserType;
  role?: UserRole;
  region?: string;
}

interface InstituteRegistrationData {
  instituteId: string;
  instituteCode: string;
  instituteName: string;
  designation: string;
  name: string;
  email: string;
  password: string;
  phone?: string;
  region?: string;
}

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  isDemoMode: boolean;
  emailVerified: boolean;
  availableUsers: User[];

  // Real Firebase Authentication Actions
  signUpWithEmail: (email: string, password: string, profile: SignUpProfileData) => Promise<{ needsVerification: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithInstituteId: (instituteId: string, password: string) => Promise<void>;
  signUpWithInstituteId: (data: InstituteRegistrationData) => Promise<{ needsVerification: boolean }>;
  sendInstitutePasswordReset: (instituteId: string) => Promise<string>;
  signInWithGoogle: () => Promise<User>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  completeUserProfile: (profileData: Partial<User>) => Promise<User>;

  // Demo Mode Sandbox for Hackathon Judges
  enterDemoMode: (role?: UserRole, userId?: string) => Promise<void>;
  exitDemoMode: () => void;
  switchPersona: (role: UserRole, userId?: string) => Promise<boolean>;

  // Authorization checks
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canVerifyFDR: () => boolean;
  canApproveRelease: () => boolean;
  canRaiseDeficiency: () => boolean;
  canGrantClearance: (tier: 'regionalOfficer' | 'pgrc' | 'vigilance') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    return sessionStorage.getItem('aicte_demo_mode') === 'true';
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  // Fetch demo available personas for judges
  useEffect(() => {
    fetch('/api/auth/current')
      .then(res => res.json())
      .then(data => {
        setAvailableUsers(data.availableUsers || []);
      })
      .catch(() => {});
  }, []);

// Helper to synchronize Firebase User profile with Firestore document (uid, name, email, photoURL)
export async function syncGoogleUserProfile(fbUser: FirebaseUser): Promise<User> {
  const uid = fbUser.uid;
  const isBootstrapAdmin = Boolean(
    fbUser.email &&
      ['harshpratapsingh925@gmail.com', 'admin@aicte.gov.in', 'workhack1111@gmail.com'].includes(
        fbUser.email.toLowerCase()
      )
  );

  try {
    const existing = await getUserProfile(uid);
    if (existing) {
      const updates: Record<string, any> = {
        uid,
        email: fbUser.email || existing.email || '',
      };
      if (fbUser.displayName && (!existing.name || existing.name === 'Authorized Representative')) {
        updates.name = fbUser.displayName;
      }
      if (fbUser.photoURL) {
        updates.photoURL = fbUser.photoURL;
        updates.avatarUrl = fbUser.photoURL;
      }
      if (isBootstrapAdmin && existing.role !== 'ADMINISTRATOR') {
        updates.role = 'ADMINISTRATOR';
        updates.accountStatus = 'APPROVED';
        updates.onboardingComplete = true;
      }
      await setDoc(doc(db, 'users', uid), updates, { merge: true });
      return { ...existing, ...updates } as User;
    } else {
      const newProfile: User = {
        id: uid,
        uid,
        name: fbUser.displayName || (isBootstrapAdmin ? 'AICTE System Administrator' : 'Authorized Representative'),
        email: fbUser.email || '',
        photoURL: fbUser.photoURL || undefined,
        avatarUrl: fbUser.photoURL || undefined,
        role: isBootstrapAdmin ? 'ADMINISTRATOR' : 'INSTITUTION',
        designation: isBootstrapAdmin ? 'AICTE System Administrator' : '',
        institutionId: '',
        institutionName: '',
        region: 'Northern',
        onboardingComplete: isBootstrapAdmin ? true : false,
        accountStatus: isBootstrapAdmin ? 'APPROVED' : 'PENDING',
        accountType: isBootstrapAdmin ? 'AICTE' : 'INSTITUTION',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', uid), newProfile, { merge: true });
      return newProfile;
    }
  } catch (err) {
    console.error('Error synchronizing Google user profile in Firestore:', err);
    return {
      id: uid,
      uid,
      name: fbUser.displayName || 'Authorized Representative',
      email: fbUser.email || '',
      photoURL: fbUser.photoURL || undefined,
      avatarUrl: fbUser.photoURL || undefined,
      role: isBootstrapAdmin ? 'ADMINISTRATOR' : 'INSTITUTION',
      designation: '',
      onboardingComplete: isBootstrapAdmin ? true : false,
      accountStatus: isBootstrapAdmin ? 'APPROVED' : 'PENDING',
      accountType: isBootstrapAdmin ? 'AICTE' : 'INSTITUTION',
      region: 'Northern',
    };
  }
}

  // Listen to real Firebase Auth state changes and redirect results
  useEffect(() => {
    // Process redirect sign-in result if returning from a mobile/iframe redirect
    getRedirectResult(auth)
      .then(async result => {
        if (result?.user) {
          setIsDemoMode(false);
          sessionStorage.removeItem('aicte_demo_mode');
          try {
            const profile = await syncGoogleUserProfile(result.user);
            setUser(profile);
            await logAuditEvent({
              userId: result.user.uid,
              userName: profile.name || result.user.displayName || 'Google User',
              role: profile.role,
              action: 'USER_LOGIN',
              entityType: 'USER',
              entityId: result.user.uid,
              details: 'Signed in via Google Authentication redirect.',
            });
          } catch (profileErr) {
            console.error('Error syncing profile after redirect result:', profileErr);
          }
        }
      })
      .catch(err => {
        console.error('Redirect authentication error:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, async fbUser => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        setIsDemoMode(false);
        sessionStorage.removeItem('aicte_demo_mode');
        try {
          const profile = await syncGoogleUserProfile(fbUser);
          setUser(profile);
        } catch (err) {
          console.error('Error loading Firestore profile:', err);
        }
      } else if (!isDemoMode) {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isDemoMode]);

  const refreshProfile = async () => {
    if (auth.currentUser) {
      try {
        const profile = await getUserProfile(auth.currentUser.uid);
        if (profile) {
          const isBootstrapAdmin =
            auth.currentUser.email &&
            ['harshpratapsingh925@gmail.com', 'admin@aicte.gov.in', 'workhack1111@gmail.com'].includes(
              auth.currentUser.email.toLowerCase()
            );
          if (isBootstrapAdmin) {
            profile.role = 'ADMINISTRATOR';
            profile.accountStatus = 'APPROVED';
            profile.onboardingComplete = true;
          }
          setUser(profile);
        }
      } catch (err) {
        console.error('Error refreshing profile:', err);
      }
    }
  };

  // Synchronize backend session user so all /api endpoints recognize the active user
  useEffect(() => {
    if (user && !isDemoMode) {
      fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user }),
      }).catch(() => {});
    }
  }, [user, isDemoMode]);

  // Real Email + Password Sign Up
  const signUpWithEmail = async (
    email: string,
    password: string,
    profile: SignUpProfileData
  ): Promise<{ needsVerification: boolean }> => {
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      // Create strictly-typed user document in Firestore with role = 'INSTITUTION'
      const createdUser = await createUserProfile(uid, {
        name: profile.name.trim(),
        email: email.trim(),
        institutionId: profile.institutionId || '',
        institutionName: profile.institutionName || '',
        designation: (profile.designation || '').trim() || 'Authorized Representative',
        phone: (profile.phone || '').trim(),
      });

      setUser(createdUser);
      setIsDemoMode(false);
      sessionStorage.removeItem('aicte_demo_mode');

      // Send email verification
      try {
        await sendEmailVerification(cred.user);
      } catch (err) {
        console.warn('Verification email notice:', err);
      }

      await logAuditEvent({
        userId: uid,
        userName: profile.name,
        role: 'INSTITUTION',
        action: 'USER_REGISTERED',
        entityType: 'USER',
        entityId: uid,
        details: `Self-registered new institution account for ${profile.institutionName}.`,
      });

      return { needsVerification: !cred.user.emailVerified };
    } finally {
      setLoading(false);
    }
  };

  // Real Email + Password Sign In
  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await getUserProfile(cred.user.uid);
      if (profile) {
        setUser(profile);
      }
      setIsDemoMode(false);
      sessionStorage.removeItem('aicte_demo_mode');

      await logAuditEvent({
        userId: cred.user.uid,
        userName: profile?.name || cred.user.email || 'User',
        role: profile?.role || 'INSTITUTION',
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: cred.user.uid,
        details: 'Signed in via Firebase Email/Password.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Sign In with Institute ID
  const signInWithInstituteId = async (instituteId: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const linkedEmail = await lookupEmailByInstituteId(instituteId);
      if (!linkedEmail) {
        throw new Error('Invalid Institute ID or password');
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, linkedEmail.trim(), password);
        const profile = await getUserProfile(cred.user.uid);
        if (profile) {
          setUser(profile);
        }
        setIsDemoMode(false);
        sessionStorage.removeItem('aicte_demo_mode');

        await logAuditEvent({
          userId: cred.user.uid,
          userName: profile?.name || cred.user.email || 'Institute User',
          role: profile?.role || 'INSTITUTION_HEAD',
          action: 'INSTITUTE_LOGIN',
          entityType: 'USER',
          entityId: cred.user.uid,
          details: `Signed in via Institute ID ${instituteId}.`,
        });
      } catch (authErr) {
        // Must show only generic error message per specification
        throw new Error('Invalid Institute ID or password');
      }
    } finally {
      setLoading(false);
    }
  };

  // Sign Up with Institute ID
  const signUpWithInstituteId = async (
    data: InstituteRegistrationData
  ): Promise<{ needsVerification: boolean }> => {
    setLoading(true);
    try {
      const conflict = await checkInstituteDesignationConflict(
        data.instituteCode || data.instituteId,
        data.designation
      );
      if (conflict.exists) {
        throw new Error(conflict.message || 'Duplicate registration detected for this Institute ID.');
      }

      const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      const uid = cred.user.uid;

      let role: UserRole = 'INSTITUTION_HEAD';
      const dLower = data.designation.toLowerCase();
      if (dLower.includes('registrar')) role = 'INSTITUTION_REGISTRAR';
      else if (dLower.includes('account')) role = 'INSTITUTION_ACCOUNTS';
      else if (dLower.includes('nodal')) role = 'INSTITUTION_NODAL';
      else if (dLower.includes('head') || dLower.includes('principal') || dLower.includes('director')) role = 'INSTITUTION_HEAD';

      const created = await saveCompleteUserProfile(uid, {
        uid,
        id: uid,
        name: data.name.trim(),
        email: data.email.trim(),
        userType: 'INSTITUTION',
        accountType: 'INSTITUTION',
        role,
        designation: data.designation.trim(),
        institutionId: data.instituteId,
        institutionName: data.instituteName,
        instituteCode: data.instituteCode,
        phone: data.phone || '',
        region: data.region || 'Northern',
        status: 'ACTIVE',
        accountStatus: 'APPROVED',
        onboardingComplete: true,
      });

      setUser(created);
      setIsDemoMode(false);
      sessionStorage.removeItem('aicte_demo_mode');

      try {
        await sendEmailVerification(cred.user);
      } catch {}

      return { needsVerification: !cred.user.emailVerified };
    } finally {
      setLoading(false);
    }
  };

  // Forgot Password for Institute ID
  const sendInstitutePasswordReset = async (instituteId: string): Promise<string> => {
    const linkedEmail = await lookupEmailByInstituteId(instituteId);
    if (!linkedEmail) {
      throw new Error('No registered account found for this Institute ID.');
    }
    await sendPasswordResetEmail(auth, linkedEmail.trim());
    const parts = linkedEmail.split('@');
    const u = parts[0];
    const masked = u.length > 2 ? `${u[0]}***${u[u.length - 1]}` : `${u[0]}***`;
    return `${masked}@${parts[1]}`;
  };

  // Complete User Profile (first-login flow)
  const completeUserProfile = async (profileData: Partial<User>): Promise<User> => {
    if (!auth.currentUser) throw new Error('No active authenticated session.');
    const uid = auth.currentUser.uid;
    const completed = await saveCompleteUserProfile(uid, {
      ...profileData,
      uid,
      id: uid,
      email: auth.currentUser.email || profileData.email || '',
      name: profileData.name || auth.currentUser.displayName || 'Authorized Representative',
      onboardingComplete: true,
    });
    setUser(completed);
    return completed;
  };

  // Real Google Sign In (popup with automatic redirect fallback)
  const signInWithGoogle = async (): Promise<User> => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const cred = await signInWithPopup(auth, provider);
      setIsDemoMode(false);
      sessionStorage.removeItem('aicte_demo_mode');
      const profile = await syncGoogleUserProfile(cred.user);
      setUser(profile);

      await logAuditEvent({
        userId: cred.user.uid,
        userName: profile.name || cred.user.displayName || 'Google Sign-in User',
        role: profile.role,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: cred.user.uid,
        details: 'Signed in via Google Authentication popup.',
      });

      return profile;
    } catch (popupErr: any) {
      console.error('[Google Sign-in Error Details]:', popupErr);
      const fallbackCodes = [
        'auth/popup-blocked',
        'auth/cancelled-popup-request',
        'auth/operation-not-supported-in-this-environment',
      ];
      if (fallbackCodes.includes(popupErr?.code)) {
        console.warn('Google popup blocked or unsupported in current environment, falling back to signInWithRedirect...', popupErr?.code);
        try {
          await signInWithRedirect(auth, provider);
          return new Promise<User>(() => {});
        } catch (redirectErr: any) {
          console.error('[Google Redirect Error Details]:', redirectErr);
          throw redirectErr;
        }
      }

      // Handle account exists with different credential by attempting to link credentials
      if (popupErr?.code === 'auth/account-exists-with-different-credential') {
        const credential = GoogleAuthProvider.credentialFromError(popupErr);
        if (credential && auth.currentUser) {
          try {
            const linkResult = await linkWithCredential(auth.currentUser, credential);
            const profile = await syncGoogleUserProfile(linkResult.user);
            setUser(profile);
            return profile;
          } catch (linkErr) {
            console.error('Account linking attempt failed:', linkErr);
          }
        }
      }

      throw popupErr;
    } finally {
      setLoading(false);
    }
  };

  // Password reset email
  const sendPasswordReset = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  // Resend email verification
  const resendVerificationEmail = async (): Promise<void> => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  // Real Sign Out: call Firebase signOut(), clear all session state
  const signOut = async (): Promise<void> => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      setUser(null);
      setFirebaseUser(null);
      setIsDemoMode(false);
      sessionStorage.removeItem('aicte_demo_mode');
      fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: null }),
      }).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  // --- SIH Demo Mode for Evaluators ---
  const enterDemoMode = async (role: UserRole = 'INSTITUTION', userId?: string): Promise<void> => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
      setIsDemoMode(true);
      sessionStorage.setItem('aicte_demo_mode', 'true');

      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } finally {
      setLoading(false);
    }
  };

  const exitDemoMode = () => {
    setIsDemoMode(false);
    sessionStorage.removeItem('aicte_demo_mode');
    setUser(null);
    setFirebaseUser(null);
  };

  const switchPersona = async (role: UserRole, userId?: string): Promise<boolean> => {
    if (!isDemoMode) {
      setIsDemoMode(true);
      sessionStorage.setItem('aicte_demo_mode', 'true');
    }
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, userId }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return true;
      }
    } catch (e) {
      console.error('Demo persona switch error:', e);
    }
    return false;
  };

  // Role permissions
  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(roles)) {
      return roles.includes(user.role);
    }
    return user.role === roles;
  };

  const canVerifyFDR = (): boolean => {
    return hasRole([
      'SECTION_OFFICER',
      'REGIONAL_OFFICER',
      'DIRECTOR_ADVISOR',
      'CHAIRMAN_MEMBER_SECRETARY',
      'ADMINISTRATOR',
      'PORTAL_ADMIN',
    ]);
  };

  const canApproveRelease = (): boolean => {
    return hasRole(['CHAIRMAN_MEMBER_SECRETARY', 'ADMINISTRATOR']);
  };

  const canRaiseDeficiency = (): boolean => {
    return hasRole([
      'SECTION_OFFICER',
      'REGIONAL_OFFICER',
      'DIRECTOR_ADVISOR',
      'CHAIRMAN_MEMBER_SECRETARY',
      'ADMINISTRATOR',
    ]);
  };

  const canGrantClearance = (tier: 'regionalOfficer' | 'pgrc' | 'vigilance'): boolean => {
    if (!user) return false;
    if (user.role === 'ADMINISTRATOR' || user.role === 'CHAIRMAN_MEMBER_SECRETARY') return true;
    if (tier === 'regionalOfficer') return user.role === 'REGIONAL_OFFICER';
    if (tier === 'pgrc') return user.role === 'DIRECTOR_ADVISOR' || user.role === 'PGRC_OFFICER';
    if (tier === 'vigilance') return user.role === 'AUDIT_OFFICER' || user.role === 'VIGILANCE_OFFICER';
    return false;
  };

  const emailVerified = isDemoMode ? true : !!firebaseUser?.emailVerified;

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        isDemoMode,
        emailVerified,
        availableUsers,
        signUpWithEmail,
        signInWithEmail,
        signInWithInstituteId,
        signUpWithInstituteId,
        sendInstitutePasswordReset,
        completeUserProfile,
        signInWithGoogle,
        sendPasswordReset,
        resendVerificationEmail,
        signOut,
        refreshProfile,
        enterDemoMode,
        exitDemoMode,
        switchPersona,
        hasRole,
        canVerifyFDR,
        canApproveRelease,
        canRaiseDeficiency,
        canGrantClearance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
