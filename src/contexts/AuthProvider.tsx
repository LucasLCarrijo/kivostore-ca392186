import { createContext, useContext, useEffect, useState, ReactNode, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 1. Set up auth state listener FIRST (before getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'SIGNED_IN') {
          // Don't redirect if already on onboarding or a public page
          const currentPath = window.location.pathname;
          const publicPaths = ['/onboarding', '/checkout', '/order', '/upsell', '/member', '/affiliate'];
          const isPublicPath = publicPaths.some(p => currentPath.startsWith(p));

          if (!isPublicPath && session?.user) {
            // Use setTimeout to avoid Supabase deadlock with RLS
            setTimeout(async () => {
              try {
                const { data: workspaceMember } = await supabase
                  .from('workspace_members')
                  .select('workspace_id')
                  .eq('user_id', session.user.id)
                  .maybeSingle();

                if (workspaceMember) {
                  navigate('/dashboard');
                } else {
                  navigate('/onboarding');
                }
              } catch (error) {
                console.error("Error checking workspace:", error);
                navigate('/onboarding');
              }
            }, 0);
          }
        } else if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    // 2. Then get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error);
      }
      // Only set if listener hasn't already fired
      setSession(prev => prev ?? session);
      setUser(prev => prev ?? session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}