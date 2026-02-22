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
      flight_cache: {
        Row: {
          cached_at: string
          currency: string | null
          departure_date: string
          destination_airport: string
          id: string
          origin_airport: string
          price: number | null
          return_date: string
        }
        Insert: {
          cached_at?: string
          currency?: string | null
          departure_date: string
          destination_airport: string
          id?: string
          origin_airport: string
          price?: number | null
          return_date: string
        }
        Update: {
          cached_at?: string
          currency?: string | null
          departure_date?: string
          destination_airport?: string
          id?: string
          origin_airport?: string
          price?: number | null
          return_date?: string
        }
        Relationships: []
      }
      guests: {
        Row: {
          airport_code: string | null
          budget_max: number | null
          budget_min: number | null
          created_at: string
          id: string
          name: string
          notes: string | null
          origin_city: string | null
          skill_level: string | null
          status: string | null
          trip_id: string
        }
        Insert: {
          airport_code?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          origin_city?: string | null
          skill_level?: string | null
          status?: string | null
          trip_id: string
        }
        Update: {
          airport_code?: string | null
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          origin_city?: string | null
          skill_level?: string | null
          status?: string | null
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string
          id: string
          results: Json
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          results: Json
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          results?: Json
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          budget_amount: number | null
          budget_type: string | null
          created_at: string
          date_end: string | null
          date_start: string | null
          geography: string[] | null
          group_size: number
          has_non_skiers: boolean | null
          id: string
          lodging_preference: string | null
          non_skier_importance: number | null
          organizer_name: string | null
          pass_types: string[] | null
          skill_max: string | null
          skill_min: string | null
          trip_name: string
          user_id: string | null
          vibe: string | null
        }
        Insert: {
          budget_amount?: number | null
          budget_type?: string | null
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          geography?: string[] | null
          group_size?: number
          has_non_skiers?: boolean | null
          id?: string
          lodging_preference?: string | null
          non_skier_importance?: number | null
          organizer_name?: string | null
          pass_types?: string[] | null
          skill_max?: string | null
          skill_min?: string | null
          trip_name: string
          user_id?: string | null
          vibe?: string | null
        }
        Update: {
          budget_amount?: number | null
          budget_type?: string | null
          created_at?: string
          date_end?: string | null
          date_start?: string | null
          geography?: string[] | null
          group_size?: number
          has_non_skiers?: boolean | null
          id?: string
          lodging_preference?: string | null
          non_skier_importance?: number | null
          organizer_name?: string | null
          pass_types?: string[] | null
          skill_max?: string | null
          skill_min?: string | null
          trip_name?: string
          user_id?: string | null
          vibe?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
