-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('patient', 'doctor');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE aphasia_type AS ENUM ('semantic', 'sensory', 'opticMnestic', 'acousticMnestic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Doctor-Patient relationship table
CREATE TABLE IF NOT EXISTS doctor_patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(doctor_id, patient_id)
);

-- Create Therapy Sessions table
CREATE TABLE IF NOT EXISTS therapy_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  aphasia_type aphasia_type NOT NULL,
  level difficulty_level NOT NULL,
  accuracy NUMERIC NOT NULL,
  skill_score NUMERIC NOT NULL,
  avg_latency_sec NUMERIC NOT NULL,
  hints_used INTEGER NOT NULL,
  exercises_count INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  answers JSONB
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapy_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Doctors can read assigned patient profiles" ON profiles;
DROP POLICY IF EXISTS "Doctors can read their assignments" ON doctor_patients;
DROP POLICY IF EXISTS "Patients can see own sessions" ON therapy_sessions;
DROP POLICY IF EXISTS "Doctors can see assigned patients sessions" ON therapy_sessions;

-- Policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Doctors can read assigned patient profiles" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = profiles.id
  )
);

CREATE POLICY "Doctors can read their assignments" ON doctor_patients FOR SELECT USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can see own sessions" ON therapy_sessions FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can see assigned patients sessions" ON therapy_sessions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM doctor_patients
    WHERE doctor_patients.doctor_id = auth.uid()
    AND doctor_patients.patient_id = therapy_sessions.patient_id
  )
);

-- Function to handle new user signups and auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'Unknown'), 
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'patient')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
