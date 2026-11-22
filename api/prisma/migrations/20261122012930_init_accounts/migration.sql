-- CreateTable
CREATE TABLE "Account" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nature" TEXT NOT NULL,
    "parentCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "Account" ("code") ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- CreateIndex
CREATE INDEX "Account_parentCode_idx" ON "Account"("parentCode");
