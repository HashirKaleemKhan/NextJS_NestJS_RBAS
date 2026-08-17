-- Add hierarchy level temporarily as nullable
ALTER TABLE "Role"
ADD COLUMN "level" INTEGER;

-- Assign levels to existing roles
UPDATE "Role"
SET "level" = 4
WHERE LOWER("name") = 'admin';

UPDATE "Role"
SET "level" = 3
WHERE LOWER("name") = 'manager';

-- Rename existing "user" role to "Developer"
UPDATE "Role"
SET
    "name" = 'Developer',
    "level" = 1
WHERE LOWER("name") = 'user';

-- Create Supervisor role
INSERT INTO "Role" ("name", "level")
VALUES ('Supervisor', 2);

-- Make level required
ALTER TABLE "Role"
ALTER COLUMN "level" SET NOT NULL;

-- Add manager relationship
ALTER TABLE "User"
ADD COLUMN "managerId" INTEGER;

-- Add self-referencing foreign key
ALTER TABLE "User"
ADD CONSTRAINT "User_managerId_fkey"
FOREIGN KEY ("managerId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;