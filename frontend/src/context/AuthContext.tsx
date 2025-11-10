import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/api';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'responsable' | 'technico_commercial';
  first_name: string | null;
  last_name: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Permission helpers
  isAdmin: () => boolean;
  canManageClients: () => boolean;
  canDeleteClients: () => boolean;
  canManageGroups: () => boolean;
  canManageClassifications: () => boolean;
  canManageImports: () => boolean;
  canManageMappings: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Helper function to fetch user profile with timeout
    const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
      try {
        // Add timeout to prevent infinite waiting (React Strict Mode race condition)
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
        });

        const queryPromise = supabase
          .from('profiles')
          .select('id, email, role, first_name, last_name')
          .eq('id', userId)
          .single();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

        if (error) {
          console.warn('Failed to fetch user profile:', error);
          return null;
        }

        return data as UserProfile;
      } catch (error) {
        console.warn('Error fetching profile:', error);
        return null;
      }
    };

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
         console.warn('Session error:', error);
         setUser(null);
         setProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          const userProfile = await fetchUserProfile(session.user.id);
          if (isMounted) {
            setProfile(userProfile);
          }
       } else {
         setUser(null);
         setProfile(null);
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
       console.warn('Failed to get initial session:', error);
       if (isMounted) {
         setUser(null);
         setProfile(null);
          setLoading(false);
        }
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        const userProfile = await fetchUserProfile(session.user.id);
        if (isMounted) {
          setProfile(userProfile);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
        const userProfile = await fetchUserProfile(session.user.id);
        if (isMounted) {
          setProfile(userProfile);
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        if (data.session) {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: data.user.id,
            email: data.user.email,
            first_name: firstName,
            last_name: lastName,
          });

          if (insertError) {
            throw insertError;
          }
        } else {
          const { error: fnError } = await supabase.functions.invoke(
            'create-profile',
            {
              body: {
                id: data.user.id,
                email: data.user.email,
                first_name: firstName,
                last_name: lastName,
              },
            }
          );

          if (fnError) {
            throw fnError;
          }
        }
      }

      // For sign up, we don't automatically set the user as they might need email confirmation
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Permission helper functions
  const isAdmin = (): boolean => {
    return profile?.role === 'admin';
  };

  const canManageClients = (): boolean => {
    // Admin or responsable can manage clients (create/update)
    return profile?.role === 'admin' || profile?.role === 'responsable';
  };

  const canDeleteClients = (): boolean => {
    // Only admin can delete clients
    return profile?.role === 'admin';
  };

  const canManageGroups = (): boolean => {
    // Only admin can manage groups
    return profile?.role === 'admin';
  };

  const canManageClassifications = (): boolean => {
    // Only admin can manage classifications
    return profile?.role === 'admin';
  };

  const canManageImports = (): boolean => {
    // Admin and responsable can manage imports
    return profile?.role === 'admin' || profile?.role === 'responsable';
  };

  const canManageMappings = (): boolean => {
    // Admin and responsable can create mappings and access settings/history
    return profile?.role === 'admin' || profile?.role === 'responsable';
  };

  const value = {
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    canManageClients,
    canDeleteClients,
    canManageGroups,
    canManageClassifications,
    canManageImports,
    canManageMappings
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};