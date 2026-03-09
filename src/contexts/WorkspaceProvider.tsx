import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  created_at: string;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  userWorkspaces: Workspace[];
  workspaceMembership: WorkspaceMember | null;
  loading: boolean;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

interface WorkspaceProviderProps {
  children: ReactNode;
}

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [userWorkspaces, setUserWorkspaces] = useState<Workspace[]>([]);
  const [workspaceMembership, setWorkspaceMembership] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, session } = useAuth();

  const fetchUserWorkspaces = async () => {
    if (!user) {
      setUserWorkspaces([]);
      setCurrentWorkspace(null);
      setWorkspaceMembership(null);
      setLoading(false);
      return;
    }

    try {
      // Get user's workspace memberships with workspace data
      const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select(`
          *,
          workspaces (*)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error fetching workspaces:", error);
        setUserWorkspaces([]);
        setCurrentWorkspace(null);
        setWorkspaceMembership(null);
      } else if (memberships && memberships.length > 0) {
        const workspaces = memberships.map(m => m.workspaces).filter(Boolean);
        setUserWorkspaces(workspaces);
        
        // Set first workspace as current if none is set
        if (!currentWorkspace && workspaces.length > 0) {
          setCurrentWorkspace(workspaces[0]);
          setWorkspaceMembership(memberships[0]);
          
          // Store current workspace in localStorage
          localStorage.setItem('kivo_current_workspace', workspaces[0].id);
        }
      } else {
        setUserWorkspaces([]);
        setCurrentWorkspace(null);
        setWorkspaceMembership(null);
      }
    } catch (error) {
      console.error("Error fetching workspaces:", error);
      setUserWorkspaces([]);
      setCurrentWorkspace(null);
      setWorkspaceMembership(null);
    } finally {
      setLoading(false);
    }
  };

  const switchWorkspace = async (workspaceId: string) => {
    const workspace = userWorkspaces.find(w => w.id === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      
      // Update membership info
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('user_id', user?.id)
        .eq('workspace_id', workspaceId)
        .single();
      
      setWorkspaceMembership(membership);
      localStorage.setItem('kivo_current_workspace', workspaceId);
    }
  };

  const refreshWorkspaces = async () => {
    await fetchUserWorkspaces();
  };

  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    if (!user) return null;

    try {
      // Generate unique slug
      const { data: slugData, error: slugError } = await supabase
        .rpc('generate_unique_slug', { base_name: name });

      if (slugError) {
        console.error("Error generating slug:", slugError);
        return null;
      }

      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name,
          slug: slugData,
        })
        .select()
        .single();

      if (workspaceError) {
        console.error("Error creating workspace:", workspaceError);
        return null;
      }

      // Create workspace membership
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          user_id: user.id,
          workspace_id: workspace.id,
          role: 'OWNER',
        });

      if (memberError) {
        console.error("Error creating workspace membership:", memberError);
        return null;
      }

      // Refresh workspaces to update the lists
      await refreshWorkspaces();
      
      return workspace;
    } catch (error) {
      console.error("Error creating workspace:", error);
      return null;
    }
  };

  useEffect(() => {
    if (session) {
      // Check for stored workspace preference
      const storedWorkspaceId = localStorage.getItem('kivo_current_workspace');
      fetchUserWorkspaces().then(() => {
        if (storedWorkspaceId) {
          switchWorkspace(storedWorkspaceId);
        }
      });
    } else {
      setUserWorkspaces([]);
      setCurrentWorkspace(null);
      setWorkspaceMembership(null);
      setLoading(false);
    }
  }, [session, user]);

  return (
    <WorkspaceContext.Provider value={{
      currentWorkspace,
      userWorkspaces,
      workspaceMembership,
      loading,
      switchWorkspace,
      refreshWorkspaces,
      createWorkspace,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}