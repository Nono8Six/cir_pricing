/*
  # Add foreign key constraint between import_batches and profiles

  1. Foreign Key Constraint
    - Links `import_batches.user_id` to `profiles.id`
    - Enables Supabase to recognize the relationship for joins
    - Maintains referential integrity

  2. Cascade Options
    - ON UPDATE CASCADE: Updates propagate automatically
    - ON DELETE CASCADE: Deletes import batches when profile is deleted
*/

ALTER TABLE public.import_batches
ADD CONSTRAINT import_batches_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON UPDATE CASCADE
ON DELETE CASCADE;