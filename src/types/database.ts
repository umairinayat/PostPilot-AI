/**
 * Minimal Supabase Database type definitions.
 *
 * These types are hand-written to match the project's schema so that
 * `createClient<Database>()` can resolve table/column types instead of
 * falling back to `never`.
 *
 * If you add columns or tables, update the corresponding entry here.
 * For a fully auto-generated version run:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          plan: string;
          credits: number;
          stripe_customer_id: string | null;
          linkedin_member_id: string | null;
          linkedin_profile_name: string | null;
          linkedin_access_token: string | null;
          linkedin_refresh_token: string | null;
          linkedin_token_expires_at: string | null;
          linkedin_connected_at: string | null;
          linkedin_auto_publish_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          plan?: string;
          credits?: number;
          stripe_customer_id?: string | null;
          linkedin_member_id?: string | null;
          linkedin_profile_name?: string | null;
          linkedin_access_token?: string | null;
          linkedin_refresh_token?: string | null;
          linkedin_token_expires_at?: string | null;
          linkedin_connected_at?: string | null;
          linkedin_auto_publish_enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          plan?: string;
          credits?: number;
          stripe_customer_id?: string | null;
          linkedin_member_id?: string | null;
          linkedin_profile_name?: string | null;
          linkedin_access_token?: string | null;
          linkedin_refresh_token?: string | null;
          linkedin_token_expires_at?: string | null;
          linkedin_connected_at?: string | null;
          linkedin_auto_publish_enabled?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          user_id: string;
          linkedin_url: string;
          name: string;
          headline: string;
          summary: string;
          experience: Json;
          skills: Json;
          raw_posts: Json;
          scraped_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          linkedin_url: string;
          name?: string;
          headline?: string;
          summary?: string;
          experience?: Json;
          skills?: Json;
          raw_posts?: Json;
          scraped_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          linkedin_url?: string;
          name?: string;
          headline?: string;
          summary?: string;
          experience?: Json;
          skills?: Json;
          raw_posts?: Json;
          scraped_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      posts: {
        Row: {
          id: string;
          user_id: string;
          profile_id: string | null;
          topic: string;
          tone: string;
          model_used: string;
          content: string;
          status: string;
          scheduled_at: string | null;
          created_at: string;
          updated_at: string | null;
          linkedin_post_id: string | null;
          published_url: string | null;
          published_at: string | null;
          latest_reactions: number | null;
          latest_comments: number | null;
          latest_impressions: number | null;
          latest_engagement_rate: number | null;
          last_metrics_synced_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_id?: string | null;
          topic?: string;
          tone?: string;
          model_used?: string;
          content: string;
          status?: string;
          scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
          linkedin_post_id?: string | null;
          published_url?: string | null;
          published_at?: string | null;
          latest_reactions?: number | null;
          latest_comments?: number | null;
          latest_impressions?: number | null;
          latest_engagement_rate?: number | null;
          last_metrics_synced_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string | null;
          topic?: string;
          tone?: string;
          model_used?: string;
          content?: string;
          status?: string;
          scheduled_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
          linkedin_post_id?: string | null;
          published_url?: string | null;
          published_at?: string | null;
          latest_reactions?: number | null;
          latest_comments?: number | null;
          latest_impressions?: number | null;
          latest_engagement_rate?: number | null;
          last_metrics_synced_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posts_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };

      post_collaborators: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          permission: string;
          added_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          permission?: string;
          added_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          permission?: string;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_collaborators_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_collaborators_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      post_versions: {
        Row: {
          id: string;
          post_id: string;
          editor_user_id: string;
          snapshot_content: string;
          snapshot_topic: string | null;
          snapshot_tone: string | null;
          version_label: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          editor_user_id: string;
          snapshot_content: string;
          snapshot_topic?: string | null;
          snapshot_tone?: string | null;
          version_label?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          editor_user_id?: string;
          snapshot_content?: string;
          snapshot_topic?: string | null;
          snapshot_tone?: string | null;
          version_label?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_versions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_versions_editor_user_id_fkey";
            columns: ["editor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      post_presence_sessions: {
        Row: {
          session_id: string;
          post_id: string;
          user_id: string;
          current_field: string | null;
          cursor_position: number | null;
          last_seen_at: string;
        };
        Insert: {
          session_id: string;
          post_id: string;
          user_id: string;
          current_field?: string | null;
          cursor_position?: number | null;
          last_seen_at?: string;
        };
        Update: {
          session_id?: string;
          post_id?: string;
          user_id?: string;
          current_field?: string | null;
          cursor_position?: number | null;
          last_seen_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_presence_sessions_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_presence_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      post_metric_snapshots: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          linkedin_post_id: string | null;
          reactions: number;
          comments: number;
          impressions: number | null;
          engagement_rate: number | null;
          captured_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          linkedin_post_id?: string | null;
          reactions: number;
          comments: number;
          impressions?: number | null;
          engagement_rate?: number | null;
          captured_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          user_id?: string;
          linkedin_post_id?: string | null;
          reactions?: number;
          comments?: number;
          impressions?: number | null;
          engagement_rate?: number | null;
          captured_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_metric_snapshots_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_metric_snapshots_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };

      inspiration_posts: {
        Row: {
          id: string;
          external_id: string | null;
          author_name: string;
          author_role: string;
          niche: string;
          topic: string;
          tone: string;
          format: string;
          hook: string;
          excerpt: string;
          takeaways: Json;
          likes: number;
          comments: number;
          estimated_reach: string;
          source: string | null;
          source_url: string | null;
          collected_at: string | null;
          synced_at: string | null;
        };
        Insert: {
          id?: string;
          external_id?: string | null;
          author_name: string;
          author_role: string;
          niche: string;
          topic: string;
          tone: string;
          format: string;
          hook: string;
          excerpt: string;
          takeaways?: Json;
          likes?: number;
          comments?: number;
          estimated_reach?: string;
          source?: string | null;
          source_url?: string | null;
          collected_at?: string | null;
          synced_at?: string | null;
        };
        Update: {
          id?: string;
          external_id?: string | null;
          author_name?: string;
          author_role?: string;
          niche?: string;
          topic?: string;
          tone?: string;
          format?: string;
          hook?: string;
          excerpt?: string;
          takeaways?: Json;
          likes?: number;
          comments?: number;
          estimated_reach?: string;
          source?: string | null;
          source_url?: string | null;
          collected_at?: string | null;
          synced_at?: string | null;
        };
        Relationships: [];
      };

      api_rate_limit_events: {
        Row: {
          id: string;
          user_id: string;
          route_key: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          route_key: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          route_key?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "api_rate_limit_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
