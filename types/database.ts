export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'driver'
          full_name: string
          created_at: string
        }
        Insert: {
          id: string
          role: 'admin' | 'driver'
          full_name: string
          created_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'driver'
          full_name?: string
          created_at?: string
        }
        Relationships: []
      }
      vehicles: {
        Row: {
          id: string
          plate_number: string
          vehicle_type: string
          registration_number: string
          registration_expiry: string
          created_at: string
        }
        Insert: {
          id?: string
          plate_number: string
          vehicle_type: string
          registration_number: string
          registration_expiry: string
          created_at?: string
        }
        Update: {
          id?: string
          plate_number?: string
          vehicle_type?: string
          registration_number?: string
          registration_expiry?: string
          created_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          name: string
          contact_phone: string | null
          contact_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          contact_phone?: string | null
          contact_email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact_phone?: string | null
          contact_email?: string | null
          created_at?: string
        }
        Relationships: []
      }
      passengers: {
        Row: {
          id: string
          full_name: string
          nationality: string
          passport_number: string | null
          visa_number: string | null
          document_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          full_name: string
          nationality: string
          passport_number?: string | null
          visa_number?: string | null
          document_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          nationality?: string
          passport_number?: string | null
          visa_number?: string | null
          document_image_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      drivers: {
        Row: {
          id: string
          auth_user_id: string
          full_name: string
          login_email: string
          nationality: string
          mobile_number: string
          residence_number: string
          card_number: string
          photo_url: string | null
          vehicle_id: string | null
          status: 'active' | 'suspended'
          created_at: string
        }
        Insert: {
          id?: string
          auth_user_id: string
          full_name: string
          login_email: string
          nationality: string
          mobile_number: string
          residence_number: string
          card_number: string
          photo_url?: string | null
          vehicle_id?: string | null
          status?: 'active' | 'suspended'
          created_at?: string
        }
        Update: {
          id?: string
          auth_user_id?: string
          full_name?: string
          login_email?: string
          nationality?: string
          mobile_number?: string
          residence_number?: string
          card_number?: string
          photo_url?: string | null
          vehicle_id?: string | null
          status?: 'active' | 'suspended'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          }
        ]
      }
      bookings: {
        Row: {
          id: string
          booking_number: number
          client_id: string
          created_at: string
        }
        Insert: {
          id?: string
          booking_number?: number
          client_id: string
          created_at?: string
        }
        Update: {
          id?: string
          booking_number?: number
          client_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          }
        ]
      }
      contracts: {
        Row: {
          id: string
          booking_id: string
          party_two_name: string
          route_from: string
          route_to: string
          price: number
          price_type: 'cash' | 'deferred'
          trip_duration: string | null
          contract_date: string
          cancellation_policy_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          party_two_name: string
          route_from: string
          route_to: string
          price: number
          price_type: 'cash' | 'deferred'
          trip_duration?: string | null
          contract_date: string
          cancellation_policy_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          booking_id?: string
          party_two_name?: string
          route_from?: string
          route_to?: string
          price?: number
          price_type?: 'cash' | 'deferred'
          trip_duration?: string | null
          contract_date?: string
          cancellation_policy_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      trips: {
        Row: {
          id: string
          trip_number: number
          booking_id: string | null
          driver_id: string
          vehicle_id: string
          pickup_location: string
          dropoff_location: string
          trip_date: string
          trip_time: string
          price: number
          price_type: 'cash' | 'deferred'
          status: 'scheduled' | 'completed' | 'cancelled'
          created_at: string
        }
        Insert: {
          id?: string
          trip_number?: number
          booking_id?: string | null
          driver_id: string
          vehicle_id: string
          pickup_location: string
          dropoff_location: string
          trip_date: string
          trip_time: string
          price: number
          price_type: 'cash' | 'deferred'
          status?: 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
        }
        Update: {
          id?: string
          trip_number?: number
          booking_id?: string | null
          driver_id?: string
          vehicle_id?: string
          pickup_location?: string
          dropoff_location?: string
          trip_date?: string
          trip_time?: string
          price?: number
          price_type?: 'cash' | 'deferred'
          status?: 'scheduled' | 'completed' | 'cancelled'
          created_at?: string
        }
        Relationships: []
      }
      trip_passengers: {
        Row: {
          id: string
          trip_id: string
          passenger_id: string
          seq_number: number
        }
        Insert: {
          id?: string
          trip_id: string
          passenger_id: string
          seq_number: number
        }
        Update: {
          id?: string
          trip_id?: string
          passenger_id?: string
          seq_number?: number
        }
        Relationships: []
      }
      quotes: {
        Row: {
          id: string
          client_id: string | null
          route_from: string
          route_to: string
          estimated_price: number
          status: 'pending' | 'converted' | 'rejected'
          created_at: string
        }
        Insert: {
          id?: string
          client_id?: string | null
          route_from: string
          route_to: string
          estimated_price: number
          status?: 'pending' | 'converted' | 'rejected'
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string | null
          route_from?: string
          route_to?: string
          estimated_price?: number
          status?: 'pending' | 'converted' | 'rejected'
          created_at?: string
        }
        Relationships: []
      }
      vehicle_inspections: {
        Row: {
          id: string
          vehicle_id: string
          driver_id: string
          inspection_date: string
          fuel_indicator_ok: boolean
          temp_indicator_ok: boolean
          oil_pressure_ok: boolean
          check_engine_light_ok: boolean
          abs_light_ok: boolean
          warning_lights_ok: boolean
          tires_pressure_ok: boolean
          lights_front_rear_ok: boolean
          warning_signals_ok: boolean
          glass_mirrors_ok: boolean
          no_leaks_ok: boolean
          fire_extinguisher_ok: boolean
          warning_triangle_ok: boolean
          first_aid_kit_ok: boolean
          glass_hammer_ok: boolean
          seatbelts_ok: boolean
          notes: string | null
          driver_declaration_confirmed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          vehicle_id: string
          driver_id: string
          inspection_date?: string
          fuel_indicator_ok: boolean
          temp_indicator_ok: boolean
          oil_pressure_ok: boolean
          check_engine_light_ok: boolean
          abs_light_ok: boolean
          warning_lights_ok: boolean
          tires_pressure_ok: boolean
          lights_front_rear_ok: boolean
          warning_signals_ok: boolean
          glass_mirrors_ok: boolean
          no_leaks_ok: boolean
          fire_extinguisher_ok: boolean
          warning_triangle_ok: boolean
          first_aid_kit_ok: boolean
          glass_hammer_ok: boolean
          seatbelts_ok: boolean
          notes?: string | null
          driver_declaration_confirmed: boolean
          created_at?: string
        }
        Update: {
          id?: string
          vehicle_id?: string
          driver_id?: string
          inspection_date?: string
          fuel_indicator_ok?: boolean
          temp_indicator_ok?: boolean
          oil_pressure_ok?: boolean
          check_engine_light_ok?: boolean
          abs_light_ok?: boolean
          warning_lights_ok?: boolean
          tires_pressure_ok?: boolean
          lights_front_rear_ok?: boolean
          warning_signals_ok?: boolean
          glass_mirrors_ok?: boolean
          no_leaks_ok?: boolean
          fire_extinguisher_ok?: boolean
          warning_triangle_ok?: boolean
          first_aid_kit_ok?: boolean
          glass_hammer_ok?: boolean
          seatbelts_ok?: boolean
          notes?: string | null
          driver_declaration_confirmed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          sender_admin_id: string
          recipient_driver_id: string | null
          body: string
          sent_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          sender_admin_id: string
          recipient_driver_id?: string | null
          body: string
          sent_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          sender_admin_id?: string
          recipient_driver_id?: string | null
          body?: string
          sent_at?: string
          read_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          document_type: 'contract' | 'manifest' | 'inspection'
          document_number: number
          related_booking_id: string | null
          related_trip_id: string | null
          related_inspection_id: string | null
          pdf_url: string
          issued_at: string
        }
        Insert: {
          id?: string
          document_type: 'contract' | 'manifest' | 'inspection'
          document_number?: number
          related_booking_id?: string | null
          related_trip_id?: string | null
          related_inspection_id?: string | null
          pdf_url: string
          issued_at?: string
        }
        Update: {
          id?: string
          document_type?: 'contract' | 'manifest' | 'inspection'
          document_number?: number
          related_booking_id?: string | null
          related_trip_id?: string | null
          related_inspection_id?: string | null
          pdf_url?: string
          issued_at?: string
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          id: string
          name_ar: string
          name_en: string
          license_number: string
          cr_number: string
          contact_phone: string
          logo_url: string | null
          stamp_url: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          name_ar?: string
          name_en?: string
          license_number?: string
          cr_number?: string
          contact_phone?: string
          logo_url?: string | null
          stamp_url?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          name_en?: string
          license_number?: string
          cr_number?: string
          contact_phone?: string
          logo_url?: string | null
          stamp_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          id: string
          body: string
          due_date: string | null
          is_done: boolean
          related_booking_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          body: string
          due_date?: string | null
          is_done?: boolean
          related_booking_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          body?: string
          due_date?: string | null
          is_done?: boolean
          related_booking_id?: string | null
          created_at?: string
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
