-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "reportsToRoleId" INTEGER;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_reportsToRoleId_fkey" FOREIGN KEY ("reportsToRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
