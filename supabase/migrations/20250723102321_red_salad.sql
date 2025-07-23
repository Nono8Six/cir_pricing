/*
  # Add foreign key constraint for import_batches.user_id

  1. Foreign Key Constraint
    - Add foreign key constraint between `import_batches.user_id` and `auth.users.id`
    - This will allow Supabase to recognize the relationship for JOIN queries

  2. Security
    - Ensures referential integrity between import batches and users
    - Prevents orphaned import batch records
*/

-- Add foreign key constraint to link import_batches.user_id with auth.users.id
ALTER TABLE public.import_batches
ADD CONSTRAINT import_batches_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;