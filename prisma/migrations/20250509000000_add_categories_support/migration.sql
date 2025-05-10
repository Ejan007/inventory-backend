-- AddCategoriesFieldsMigration
-- Add categories field to Item model
ALTER TABLE "Item" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'Other';

-- Add default categories, contact fields to Organization model
ALTER TABLE "Organization" ADD COLUMN "defaultCategories" TEXT[] DEFAULT ARRAY['Meat', 'Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Dry Goods', 'Frozen', 'Beverages', 'Other']::TEXT[];
ALTER TABLE "Organization" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Organization" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Organization" ADD COLUMN "logoUrl" TEXT;

-- Add address field to Store model
ALTER TABLE "Store" ADD COLUMN "address" TEXT;
