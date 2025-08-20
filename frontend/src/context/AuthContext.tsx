// @ts-nocheck
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/api';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const isDevelopment = import.meta.env?.VITE_APP_MODE === 'development';

  useEffect(() => {
    // En mode développement, simuler un utilisateur connecté
    if (isDevelopment) {
      setUser({
        id: 'test-user-id',
        email: 'test@cir-pricing.com',
        user_metadata: {
          first_name: 'Test',
          last_name: 'User'
        }
      } as User);
      setLoading(false);
      return;
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
         console.warn('Session error:', error);
         setUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
       } else {
         setUser(null);
        }
        
        setLoading(false);
      } catch (error) {
       console.warn('Failed to get initial session:', error);
       setUser(null);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isDevelopment]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    
    if (isDevelopment) {
      // Mock sign in
      setUser({
        id: 'test-user-id',
        email: email,
        user_metadata: {
          first_name: 'Test',
          last_name: 'User'
        }
      } as User);
      setLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
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

    if (isDevelopment) {
      // Mock sign up
      setUser({
        id: 'test-user-id',
        email: email,
        user_metadata: {
          first_name: firstName || 'Test',
          last_name: lastName || 'User'
        }
      } as User);
      setLoading(false);
      return;
    }

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
    
    if (isDevelopment) {
      setUser(null);
      setLoading(false);
      return;
    }
    
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

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};