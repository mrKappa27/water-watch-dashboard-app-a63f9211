export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      leak_detection_thresholds: {
        Row: {
          created_at: string
          good_threshold: number
          high_threshold: number
          id: string
          location: string
          updated_at: string
          user_id: string
          warning_threshold: number
        }
        Insert: {
          created_at?: string
          good_threshold?: number
          high_threshold?: number
          id?: string
          location: string
          updated_at?: string
          user_id: string
          warning_threshold?: number
        }
        Update: {
          created_at?: string
          good_threshold?: number
          high_threshold?: number
          id?: string
          location?: string
          updated_at?: string
          user_id?: string
          warning_threshold?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_chart_preferences: {
        Row: {
          column_aliases: Json
          created_at: string
          id: string
          location: string
          updated_at: string
          user_id: string
          visible_params: Json
        }
        Insert: {
          column_aliases?: Json
          created_at?: string
          id?: string
          location: string
          updated_at?: string
          user_id: string
          visible_params?: Json
        }
        Update: {
          column_aliases?: Json
          created_at?: string
          id?: string
          location?: string
          updated_at?: string
          user_id?: string
          visible_params?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      water_consumption_metrics: {
        Row: {
          cnt1: number | null
          cnt2: number | null
          cnt3: number | null
          cnt4: number | null
          delta1: number | null
          delta2: number | null
          delta3: number | null
          delta4: number | null
          din1: number | null
          din2: number | null
          din3: number | null
          din4: number | null
          dout1: number | null
          dout2: number | null
          filename: string | null
          gsm: number | null
          id: number
          location: string | null
          pow: number | null
          tavg: number | null
          temp: number | null
          time: string | null
          tmax: number | null
          tmin: number | null
          tot1: number | null
          tot2: number | null
          tot3: number | null
          tot4: number | null
          type: string | null
          user_id: string | null
          vbat: number | null
        }
        Insert: {
          cnt1?: number | null
          cnt2?: number | null
          cnt3?: number | null
          cnt4?: number | null
          delta1?: number | null
          delta2?: number | null
          delta3?: number | null
          delta4?: number | null
          din1?: number | null
          din2?: number | null
          din3?: number | null
          din4?: number | null
          dout1?: number | null
          dout2?: number | null
          filename?: string | null
          gsm?: number | null
          id?: never
          location?: string | null
          pow?: number | null
          tavg?: number | null
          temp?: number | null
          time?: string | null
          tmax?: number | null
          tmin?: number | null
          tot1?: number | null
          tot2?: number | null
          tot3?: number | null
          tot4?: number | null
          type?: string | null
          user_id?: string | null
          vbat?: number | null
        }
        Update: {
          cnt1?: number | null
          cnt2?: number | null
          cnt3?: number | null
          cnt4?: number | null
          delta1?: number | null
          delta2?: number | null
          delta3?: number | null
          delta4?: number | null
          din1?: number | null
          din2?: number | null
          din3?: number | null
          din4?: number | null
          dout1?: number | null
          dout2?: number | null
          filename?: string | null
          gsm?: number | null
          id?: never
          location?: string | null
          pow?: number | null
          tavg?: number | null
          temp?: number | null
          time?: string | null
          tmax?: number | null
          tmin?: number | null
          tot1?: number | null
          tot2?: number | null
          tot3?: number | null
          tot4?: number | null
          type?: string | null
          user_id?: string | null
          vbat?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
