/*
  # Create tier lists table

  1. New Tables
    - `tier_lists`
      - `id` (uuid, primary key) - Unique identifier for each tier list
      - `name` (text) - Name of the tier list
      - `items` (jsonb) - Stores the tier assignments and image URLs
      - `created_at` (timestamptz) - Timestamp when tier list was created
      - `updated_at` (timestamptz) - Timestamp when tier list was last updated
  
  2. Security
    - Enable RLS on `tier_lists` table
    - Add policy for anyone to read tier lists (public)
    - Add policy for anyone to create tier lists (public)
    - Add policy for anyone to update tier lists (public)
    
  Note: Using public access for this demo app. In production, you'd want authenticated users only.
*/

CREATE TABLE IF NOT EXISTS tier_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Tier List',
  items jsonb DEFAULT '{"S": [], "A": [], "B": [], "C": [], "D": [], "F": [], "unranked": []}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tier_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read tier lists"
  ON tier_lists
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create tier lists"
  ON tier_lists
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update tier lists"
  ON tier_lists
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tier lists"
  ON tier_lists
  FOR DELETE
  TO anon, authenticated
  USING (true);