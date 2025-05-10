# Category Support Implementation

This document contains instructions for implementing the category support features as required.

## Implementation Steps

1. **Apply Database Migration**:
   ```bash
   npx prisma migrate deploy
   ```

2. **Run the Data Migration Script**:
   ```bash
   node migrateCategoriesData.js
   ```

3. **Restart Your Server**:
   ```bash
   node index.js
   ```

## API Endpoints Implemented

### Organization Setup
- `POST /api/organization/setup` - Complete organization setup with category support

### Category Management
- `GET /api/categories` - Get all categories for an organization
- `POST /api/categories` - Add a new category
- `DELETE /api/categories/:categoryName` - Delete a category

### Item Endpoints with Category Support
- `POST /items` - Create a new item with category
- `PUT /items/:id` - Update an item with category

## Database Schema Changes

The following changes have been made to the database schema:

1. Added `category` field to the `Item` model (default: "Other")
2. Added `defaultCategories` to the `Organization` model with preset values
3. Added contact fields to the `Organization` model:
   - `contactEmail`
   - `contactPhone`
   - `logoUrl`
4. Added `address` field to the `Store` model

## Testing

After implementing the changes, you can test the functionality:

1. Fetch categories for an organization:
   ```
   GET http://localhost:4000/api/categories
   ```

2. Add a new category:
   ```
   POST http://localhost:4000/api/categories
   Body: { "category": "New Category" }
   ```

3. Delete a category:
   ```
   DELETE http://localhost:4000/api/categories/Bakery
   ```

4. Create an item with a category:
   ```
   POST http://localhost:4000/items
   Body: { "name": "Item Name", "category": "Meat", "storeId": 1 }
   ```
