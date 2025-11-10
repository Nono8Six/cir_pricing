import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/api';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

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
  const activeProfileUserId = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUserProfile = async (userId: string): Promise<void> => {
      activeProfileUserId.current = userId;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, role, first_name, last_name')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Failed to fetch user profile:', error);
          if (isMounted && activeProfileUserId.current === userId) {
            setProfile(null);
          }
          return;
        }

        if (isMounted && activeProfileUserId.current === userId) {
          setProfile(data as UserProfile);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (isMounted && activeProfileUserId.current === userId) {
          setProfile(null);
        }
      }
    };

    const applySessionState = (session: Session | null): void => {
      if (!isMounted) return;

      if (session?.user) {
        setUser(session.user);
        void loadUserProfile(session.user.id);
      } else {
        activeProfileUserId.current = null;
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    };

    const bootstrapSession = async (): Promise<void> => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          throw error;
        }
        applySessionState(data.session);
      } catch (error) {
        console.error('Error checking initial session:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        applySessionState(session);
      }
    );

    void bootstrapSession();

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
