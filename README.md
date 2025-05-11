# StockIT Backend

StockIT is an inventory management system that helps businesses track and manage their stock levels. This repository contains the backend API for the StockIT application.

## Project Structure

The codebase has been organized into a modular structure:

```
├── config.js                  # Configuration for the server (CORS, JWT, etc.)
├── index.js                   # Main entry point for the application
├── middleware.js              # Authentication and organization middleware
├── scripts/                   # Utility and database scripts
│   ├── migrateCategoriesData.js # Script for migrating category data
│   ├── testCategories.js      # Test the category functionality
│   ├── seedCategoryTestData.js # Seed data for testing categories
│   └── ...                    # Other utility scripts
├── prisma/                    # Prisma ORM files
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── routes/                    # API routes organized by resource
│   ├── auth.js                # Authentication routes (login, register)
│   ├── categories.js          # Category management
│   ├── history.js             # Item history tracking
│   ├── items.js               # Inventory item CRUD operations
│   ├── organizations.js       # Organization management
│   ├── stores.js              # Store management
│   └── utility.js             # Utility endpoints
└── documentation.md           # Comprehensive documentation
```

## Features

- **Multi-tenant Architecture**: Organizations are isolated from each other
- **User Authentication**: JWT-based authentication system
- **Role-based Access Control**: Admin and store user roles
- **Inventory Management**: Track items, quantities, and required amounts
- **Store Management**: Support for multiple stores per organization  
- **Category System**: Organize items by customizable categories
- **History Tracking**: Track inventory changes over time

## API Endpoints

### Authentication

- `POST /login` or `POST /auth/login` - User login
- `POST /auth/register` - User registration with organization assignment

### Organizations

- `POST /api/organizations` - Create a new organization
- `GET /api/organizations/:id` - Get organization by ID
- `POST /api/organization/setup` - Complete organization setup
- `GET /api/organizations` - List all organizations (admin only)

### Categories

- `GET /api/categories` - Get all categories for an organization
- `POST /api/categories` - Add a new category
- `DELETE /api/categories/:categoryName` - Delete a category

### Items

- `POST /items` - Create a new item
- `GET /items/:id` - Get an item by ID
- `GET /items` - Get all items for the current organization
- `GET /items/store/:storeId` - Get items for a specific store
- `PUT /items/:id` - Update an item
- `DELETE /items/:id` - Delete an item

### Stores

- `GET /stores` - Get all stores for the current organization
- `POST /stores` - Create a new store

### History

- `GET /history-full` - Get full item history

## Getting Started

1. **Install dependencies**:
   ```
   npm install
   ```

2. **Set up environment variables**:
   Create a `.env` file with:
   ```
   DATABASE_URL="your-database-connection-string"
   JWT_SECRET="your-jwt-secret"
   PORT=4000
   ```

3. **Apply database migrations**:
   ```
   npx prisma migrate deploy
   ```

4. **Run the data migration script** (for category support):
   ```
   node migrateCategoriesData.js
   ```

5. **Start the server**:
   ```
   node index.js
   ```

## Testing

You can use the included test scripts to verify functionality:

- `node testCategories.js` - Test category implementation
- `node seedCategoryTestData.js` - Seed sample data with categories
