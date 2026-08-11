-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDef" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFieldDef_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "condition" TEXT,
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customValues" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPhoto" (
    "id" TEXT NOT NULL,
    "data" TEXT,
    "contentType" TEXT NOT NULL DEFAULT 'image/jpeg',
    "order" INTEGER NOT NULL DEFAULT 0,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ItemPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "folderType" TEXT NOT NULL DEFAULT 'CUSTOM',
    "categoryId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FolderItem" (
    "id" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "FolderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Category_userId_idx" ON "Category"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_key" ON "Category"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDef_categoryId_name_key" ON "CustomFieldDef"("categoryId", "name");

-- CreateIndex
CREATE INDEX "Item_userId_idx" ON "Item"("userId");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE INDEX "Item_userId_categoryId_idx" ON "Item"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "ItemPhoto_itemId_idx" ON "ItemPhoto"("itemId");

-- CreateIndex
CREATE INDEX "Folder_userId_idx" ON "Folder"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_userId_categoryId_key" ON "Folder"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "FolderItem_folderId_idx" ON "FolderItem"("folderId");

-- CreateIndex
CREATE INDEX "FolderItem_itemId_idx" ON "FolderItem"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "FolderItem_folderId_itemId_key" ON "FolderItem"("folderId", "itemId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDef" ADD CONSTRAINT "CustomFieldDef_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPhoto" ADD CONSTRAINT "ItemPhoto_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderItem" ADD CONSTRAINT "FolderItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderItem" ADD CONSTRAINT "FolderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

