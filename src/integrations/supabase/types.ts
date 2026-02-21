export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      community_videos: {
        Row: {
          bookmarks_count: number
          created_at: string
          description: string | null
          id: string
          likes_count: number
          shares_count: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          video_url: string
          visibility: string
        }
        Insert: {
          bookmarks_count?: number
          created_at?: string
          description?: string | null
          id?: string
          likes_count?: number
          shares_count?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id: string
          video_url: string
          visibility?: string
        }
        Update: {
          bookmarks_count?: number
          created_at?: string
          description?: string | null
          id?: string
          likes_count?: number
          shares_count?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          video_url?: string
          visibility?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          title: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      script_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          resolved: boolean
          scene_id: string | null
          script_id: string
          shot_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          resolved?: boolean
          scene_id?: string | null
          script_id: string
          shot_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          resolved?: boolean
          scene_id?: string | null
          script_id?: string
          shot_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "script_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      script_fingerprints: {
        Row: {
          content_hash: string
          created_at: string
          fingerprint_data: Json
          id: string
          script_id: string
          user_id: string | null
        }
        Insert: {
          content_hash: string
          created_at?: string
          fingerprint_data?: Json
          id?: string
          script_id: string
          user_id?: string | null
        }
        Update: {
          content_hash?: string
          created_at?: string
          fingerprint_data?: Json
          id?: string
          script_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      script_presence: {
        Row: {
          cursor_position: Json | null
          id: string
          last_seen: string
          script_id: string
          user_id: string
        }
        Insert: {
          cursor_position?: Json | null
          id?: string
          last_seen?: string
          script_id: string
          user_id: string
        }
        Update: {
          cursor_position?: Json | null
          id?: string
          last_seen?: string
          script_id?: string
          user_id?: string
        }
        Relationships: []
      }
      script_shares: {
        Row: {
          created_at: string
          id: string
          permission: string
          script_id: string
          shared_by: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission?: string
          script_id: string
          shared_by: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          script_id?: string
          shared_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_shares_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      script_templates: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          duration_type: string
          emoji: string
          id: string
          is_official: boolean
          mood: string
          shots: Json
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration_type?: string
          emoji?: string
          id?: string
          is_official?: boolean
          mood?: string
          shots?: Json
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration_type?: string
          emoji?: string
          id?: string
          is_official?: boolean
          mood?: string
          shots?: Json
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          created_at: string
          duration_type: string
          id: string
          inspiration: string | null
          mood: string | null
          scene_shots_map: Json | null
          script_tree: Json | null
          shots: Json
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duration_type?: string
          id?: string
          inspiration?: string | null
          mood?: string | null
          scene_shots_map?: Json | null
          script_tree?: Json | null
          shots?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duration_type?: string
          id?: string
          inspiration?: string | null
          mood?: string | null
          scene_shots_map?: Json | null
          script_tree?: Json | null
          shots?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          invitee_email: string
          inviter_id: string
          role: Database["public"]["Enums"]["team_role"]
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email: string
          inviter_id: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          invitee_email?: string
          inviter_id?: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_bookmarks: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_bookmarks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "community_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_jobs: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          prompt: string
          status: string
          task_id: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          prompt: string
          status?: string
          task_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          prompt?: string
          status?: string
          task_id?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "community_videos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_team_role: {
        Args: { _team_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      match_knowledge: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding_text: string
        }
        Returns: {
          category: string
          content: string
          id: string
          similarity: number
          title: string
        }[]
      }
    }
    Enums: {
      team_role: "owner" | "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      team_role: ["owner", "admin", "editor", "viewer"],
    },
  },
} as const
