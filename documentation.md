# StockIT Backend Documentation

## Overview

This document provides comprehensive documentation for the StockIT backend application, including API references, implementation details, and development guides.

## Table of Contents

1. [API Documentation](#api-documentation)
2. [Category Implementation](#category-implementation)
3. [Organization Implementation](#organization-implementation)
4. [Development Guide](#development-guide)
5. [Deployment Guide](#deployment-guide)

---

# API Documentation

This section provides a comprehensive reference for all API endpoints available in the StockIT backend. It includes details about request formats, response structures, and authentication requirements.

## Base URL

All endpoints are relative to the base URL of your server. By default, this is:
- `http://localhost:4000` (development)
- Or the network URL shown when the server starts

## Authentication

Most endpoints require authentication using a JWT token. Include this token in the `Authorization` header as follows:

```
Authorization: Bearer <your-token>
```

Tokens are obtained via the login endpoint and are valid for 1 day.

## Response Format

All responses follow a consistent JSON format:

### Success Responses

```json
{
  "message": "Success message (optional)",
  "data-specific-field": "...",
  "success": true
}
```

### Error Responses

```json
{
  "error": "Error message",
  "details": "Detailed error description (optional)",
  "stack": "Stack trace (development only)"
}
```

---

## API Endpoints

### Authentication

#### Login

**Endpoints:**
- `POST /login`
- `POST /auth/login`
- `POST /api/auth/login`

All of these endpoints provide the same functionality - use whichever is most convenient.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "ADMIN",
    "organizationId": 1,
    "organizationName": "Example Organization",
    "isNewOrganization": false
  },
  "success": true
}
```

#### Register

**Endpoint:** `POST /auth/register`

**Request Body (New Organization):**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "ADMIN",
  "organizationName": "New Organization",
  "isNewOrganization": true
}
```

**Request Body (Existing Organization):**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "STORE",
  "existingOrganizationId": 1
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "token": "jwt-token-string",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "ADMIN",
    "organizationId": 1,
    "isNewOrganization": true
  },
  "success": true
}
```

---

### Organization Management

#### Create Organization

**Endpoint:** `POST /api/organizations`

**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "Organization Name",
  "industry": "BAKERY",
  "address": "123 Main St",
  "phone": "123-456-7890",
  "timezone": "Australia/Canberra"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Organization Name",
  "industry": "BAKERY",
  "address": "123 Main St",
  "phone": "123-456-7890",
  "timezone": "Australia/Canberra",
  "adminEmail": "admin@example.com",
  "createdAt": "2025-05-10T12:00:00.000Z",
  "defaultCategories": ["Meat", "Vegetables", "Fruits", "Dairy", "Bakery", "Dry Goods", "Frozen", "Beverages", "Other"],
  "contactEmail": null,
  "contactPhone": null,
  "logoUrl": null
}
```

#### Get Organization by ID

**Endpoint:** `GET /api/organizations/:id`

**Auth Required:** Yes

**Path Parameters:**
- `id` - The organization ID

**Notes:**
- Users can only access their own organization unless they have the ADMIN role

**Response:**
```json
{
  "id": 1,
  "name": "Organization Name",
  "industry": "BAKERY",
  "address": "123 Main St",
  "phone": "123-456-7890",
  "timezone": "Australia/Canberra",
  "adminEmail": "admin@example.com",
  "createdAt": "2025-05-10T12:00:00.000Z",
  "defaultCategories": ["Meat", "Vegetables", "Fruits", "Dairy", "Bakery", "Dry Goods", "Frozen", "Beverages", "Other"],
  "contactEmail": null,
  "contactPhone": null,
  "logoUrl": null
}
```

#### List All Organizations (Admin Only)

**Endpoint:** `GET /api/organizations`

**Auth Required:** Yes (Admin role)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Organization Name",
    "industry": "BAKERY",
    "address": "123 Main St",
    "phone": "123-456-7890",
    "timezone": "Australia/Canberra",
    "adminEmail": "admin@example.com",
    "createdAt": "2025-05-10T12:00:00.000Z",
    "defaultCategories": ["Meat", "Vegetables", "Fruits", "Dairy", "Bakery", "Dry Goods", "Frozen", "Beverages", "Other"],
    "contactEmail": null,
    "contactPhone": null,
    "logoUrl": null
  },
  {
    "id": 2,
    "name": "Another Organization",
    // ...
  }
]
```

#### Complete Organization Setup

**Endpoints:**
- `POST /api/organizations/setup`
- `POST /api/organization/setup`
- `POST /organization/setup`

All of these endpoints provide the same functionality - use whichever is most convenient.

**Auth Required:** Yes

**Request Body:**
```json
{
  "orgSettings": {
    "industry": "BAKERY",
    "timezone": "Australia/Canberra",
    "address": "123 Main St",
    "phone": "123-456-7890",
    "contactEmail": "contact@example.com",
    "contactPhone": "123-456-7890",
    "logoUrl": "https://example.com/logo.png"
  },
  "store": {
    "name": "Main Store",
    "address": "456 Store St"
  },
  "items": [
    {
      "name": "Item 1",
      "category": "Bakery",
      "quantity": 10,
      "mondayRequired": 5,
      "tuesdayRequired": 5,
      "wednesdayRequired": 5,
      "thursdayRequired": 5,
      "fridayRequired": 5,
      "saturdayRequired": 5,
      "sundayRequired": 5
    }
  ],
  "defaultCategories": ["Meat", "Vegetables", "Fruits", "Dairy", "Bakery", "Dry Goods", "Frozen", "Beverages", "Other"]
}
```

**Notes:**
- All fields in `orgSettings` are optional except for `industry`
- Industry value is automatically converted to uppercase to match enum values
- If `store.name` is not provided, it defaults to "Main Store"
- If `items` is not provided or empty, no items will be created
- If `category` is not specified for an item, it defaults to "Other"
- When this endpoint completes, the user's `isNewOrganization` flag is set to false

**Response:**
```json
{
  "message": "Organization setup completed successfully",
  "organization": {
    "id": 1,
    "name": "Organization Name",
    "industry": "BAKERY",
    // ...rest of organization fields
  },
  "stores": [
    {
      "id": 1,
      "name": "Main Store",
      "address": "456 Store St",
      "organizationId": 1
    }
  ],
  "organizationId": 1,
  "storeId": 1
}
```

---

### Category Management

#### Get All Categories

**Endpoints:**
- `GET /api/categories` 
- `GET /categories`

**Auth Required:** Yes

**Notes:**
- Categories are stored as an array in the organization object
- Each organization has its own set of categories

**Response:**
```json
{
  "categories": ["Meat", "Vegetables", "Fruits", "Dairy", "Bakery", "Dry Goods", "Frozen", "Beverages", "Other"]
}
```

#### Add New Category

**Endpoints:**
- `POST /api/categories`
- `POST /categories`

**Auth Required:** Yes

**Request Body:**
```json
{
  "category": "Speciality Foods"
}
```

**Response:**
```json
{
  "message": "Category added successfully",
  "categories": ["Meat", "Vegetables", "Fruits", "Dairy", "Bakery", "Dry Goods", "Frozen", "Beverages", "Other", "Speciality Foods"]
}
```

#### Delete Category

**Endpoints:**
- `DELETE /api/categories/:categoryName`
- `DELETE /categories/:categoryName`

**Auth Required:** Yes

**Path Parameters:**
- `categoryName` - The name of the category to delete

**Response:**
```json
{
  "message": "Category deleted successfully",
  "categories": ["Meat", "Vegetables", "Fruits", "Dairy", "Bakery", "Dry Goods", "Frozen", "Beverages", "Other"]
}
```

---

### Item Management

#### Create Item

**Endpoint:** `POST /items`

**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "French Baguette",
  "category": "Bakery",
  "quantity": 20,
  "mondayRequired": 5,
  "tuesdayRequired": 5,
  "wednesdayRequired": 5,
  "thursdayRequired": 5,
  "fridayRequired": 5,
  "saturdayRequired": 8,
  "sundayRequired": 3,
  "storeId": 1
}
```

**Notes:**
- `name` and `storeId` are required fields
- If `category` is not provided, it defaults to "Other"
- The item is automatically associated with the user's organization

**Response:**
```json
{
  "id": 1,
  "name": "French Baguette",
  "category": "Bakery",
  "quantity": 20,
  "mondayRequired": 5,
  "tuesdayRequired": 5,
  "wednesdayRequired": 5,
  "thursdayRequired": 5,
  "fridayRequired": 5,
  "saturdayRequired": 8,
  "sundayRequired": 3,
  "createdAt": "2025-05-10T12:00:00.000Z",
  "updatedAt": "2025-05-10T12:00:00.000Z",
  "storeId": 1,
  "organizationId": 1
}
```

#### Get Item by ID

**Endpoint:** `GET /items/:id`

**Auth Required:** Yes

**Path Parameters:**
- `id` - The item ID

**Notes:**
- Only returns items from the user's organization
- Returns 404 if the item doesn't exist or belongs to a different organization

**Response:**
```json
{
  "id": 1,
  "name": "French Baguette",
  "category": "Bakery",
  "quantity": 20,
  "mondayRequired": 5,
  "tuesdayRequired": 5,
  "wednesdayRequired": 5,
  "thursdayRequired": 5,
  "fridayRequired": 5,
  "saturdayRequired": 8,
  "sundayRequired": 3,
  "createdAt": "2025-05-10T12:00:00.000Z",
  "updatedAt": "2025-05-10T12:00:00.000Z",
  "storeId": 1,
  "organizationId": 1
}
```

#### Get All Items

**Endpoint:** `GET /items`

**Auth Required:** Yes

**Query Parameters:**
- `organizationId` (optional) - Filter by organization ID
  
**Notes:**
- Items are automatically filtered to the user's organization
- The `organizationId` parameter is generally not needed as the endpoint automatically filters by the user's organization
- Results are not paginated, so consider implementing pagination on the frontend for large datasets

**Response:**
```json
[
  {
    "id": 1,
    "name": "French Baguette",
    "category": "Bakery",
    "quantity": 20,
    // ...other item fields
  },
  {
    "id": 2,
    "name": "Croissant",
    "category": "Bakery",
    "quantity": 15,
    // ...other item fields
  }
]
```

#### Get Items by Store

**Endpoint:** `GET /items/store/:storeId`

**Auth Required:** Yes

**Path Parameters:**
- `storeId` - The store ID

**Query Parameters:**
- `organizationId` (optional) - Filter by organization ID

**Response:**
```json
[
  {
    "id": 1,
    "name": "French Baguette",
    "category": "Bakery",
    "quantity": 20,
    // ...other item fields
  },
  {
    "id": 2,
    "name": "Croissant",
    "category": "Bakery",
    "quantity": 15,
    // ...other item fields
  }
]
```

#### Update Item

**Endpoint:** `PUT /items/:id`

**Auth Required:** Yes

**Path Parameters:**
- `id` - The item ID

**Request Body:**
```json
{
  "name": "French Baguette - Large",
  "category": "Bakery",
  "quantity": 25,
  "mondayRequired": 6,
  "tuesdayRequired": 6,
  "wednesdayRequired": 6,
  "thursdayRequired": 6,
  "fridayRequired": 6,
  "saturdayRequired": 10,
  "sundayRequired": 4,
  "updatedBy": "John Doe"
}
```

**Notes:**
- Only updates items from the user's organization
- The `updatedBy` field is used to track who made the change in the history

**Response:**
```json
{
  "id": 1,
  "name": "French Baguette - Large",
  "category": "Bakery",
  "quantity": 25,
  "mondayRequired": 6,
  "tuesdayRequired": 6,
  "wednesdayRequired": 6,
  "thursdayRequired": 6,
  "fridayRequired": 6,
  "saturdayRequired": 10,
  "sundayRequired": 4,
  "createdAt": "2025-05-10T12:00:00.000Z",
  "updatedAt": "2025-05-10T13:00:00.000Z",
  "storeId": 1,
  "organizationId": 1
}
```

#### Delete Item

**Endpoint:** `DELETE /items/:id`

**Auth Required:** Yes

**Path Parameters:**
- `id` - The item ID

**Notes:**
- Only deletes items from the user's organization

**Response:**
```json
{
  "id": 1,
  "name": "French Baguette - Large",
  "category": "Bakery",
  // ...other item fields
}
```

---

### Store Management

#### Get All Stores

**Endpoint:** `GET /stores`

**Auth Required:** Yes

**Query Parameters:**
- `organizationId` (optional) - Filter by organization ID

**Notes:**
- Stores are automatically filtered to the user's organization
- The `organizationId` parameter is generally not needed

**Response:**
```json
[
  {
    "id": 1,
    "name": "Main Store",
    "address": "123 Main St",
    "organizationId": 1
  },
  {
    "id": 2,
    "name": "Downtown Branch",
    "address": "456 Market St",
    "organizationId": 1
  }
]
```

#### Create Store

**Endpoint:** `POST /stores`

**Auth Required:** Yes

**Request Body:**
```json
{
  "name": "New Store",
  "address": "789 New St",
  "organizationId": 1
}
```

**Response:**
```json
{
  "id": 3,
  "name": "New Store",
  "address": "789 New St",
  "organizationId": 1
}
```

---

### History Management

#### Get Full History

**Endpoint:** `GET /history/full`

**Auth Required:** Yes

**Notes:**
- History is automatically filtered to the user's organization
- Includes the associated item details with each history entry

**Response:**
```json
[
  {
    "id": 1,
    "itemId": 1,
    "quantity": 25,
    "updatedBy": "John Doe",
    "updatedAt": "2025-05-10T13:00:00.000Z",
    "item": {
      "id": 1,
      "name": "French Baguette - Large",
      "category": "Bakery",
      // ...other item fields
    }
  },
  {
    "id": 2,
    "itemId": 2,
    "quantity": 15,
    "updatedBy": "Jane Smith",
    "updatedAt": "2025-05-10T14:00:00.000Z",
    "item": {
      "id": 2,
      "name": "Croissant",
      "category": "Bakery",
      // ...other item fields
    }
  }
]
```

---

### Utility Endpoints

#### Test Connectivity

**Endpoint:** `GET /api/test`

**Auth Required:** No

**Response:**
```json
{
  "message": "Server is running and accessible!",
  "timestamp": "2025-05-10T12:00:00.000Z",
  "clientIp": "127.0.0.1",
  "headers": {
    // Request headers
  }
}
```

---

## Common HTTP Status Codes

- **200**: OK - The request was successful
- **201**: Created - A new resource was created successfully
- **400**: Bad Request - The request was invalid or contains incorrect parameters
- **401**: Unauthorized - Authentication is required or has failed
- **403**: Forbidden - The authenticated user doesn't have permission
- **404**: Not Found - The requested resource doesn't exist
- **500**: Internal Server Error - An unexpected error occurred on the server

## Notes for Frontend Integration

1. **Authentication Flow**:
   - After successful login, store the token from the response
   - Include this token in all subsequent requests
   - Handle 401 responses by redirecting to the login page
   - See [Frontend Integration Best Practices](#frontend-integration-best-practices) for details

2. **URL Prefixes**:
   - Multiple URL patterns are supported for compatibility:
     - Some endpoints use `/api/resource-name`
     - Some endpoints use just `/resource-name`
     - For newer implementations, prefer the `/api/resource-name` pattern

3. **Error Handling**:
   - Always check the HTTP status code
   - Parse the error message from the response
   - Display user-friendly error messages

4. **Organization Context**:
   - All data is filtered by the user's organization
   - There's no need to manually include organization IDs in most requests
   - The backend automatically applies organization filtering

5. **Category Management**:
   - Categories are stored in the organization object
   - Use exact category names when creating or updating items
   - See the [Handling Categories](#handling-categories) section for more details

## Frontend Integration Best Practices

### Organization Context
- All data is automatically filtered by the user's organization
- There's rarely a need to manually include organization IDs in requests
- The backend applies organization filtering based on the JWT token
- Store the organization ID from the login response for display purposes

### Authentication
- After successful login, store the token from the response in localStorage or a secure cookie
- Include this token in all subsequent requests in the Authorization header
- Handle 401 responses by redirecting to the login page
- The token includes user role and organization information
- Consider implementing a token refresh mechanism for long sessions

### Handling Categories
- Categories are stored as an array in the organization object
- When creating items, use the category name exactly as it appears in the categories list
- Default categories are created during organization setup
- Add a validation check to ensure users select from the available categories
- Display categories in a dropdown menu for item creation/editing

### URL Patterns
- Multiple URL patterns are supported for compatibility:
  - Some endpoints use `/api/resource-name`
  - Some endpoints use just `/resource-name`
  - When in doubt, use the `/api/resource-name` pattern
- For the organization setup endpoint, any of the following will work:
  - `/api/organizations/setup`
  - `/api/organization/setup` 
  - `/organization/setup`

### Common Error Handling
- Always check the HTTP status code
- Parse the error message from the response
- In development mode, detailed error stacks are provided
- Display user-friendly error messages based on the error response
- Implement global error handling for network issues

### Example Error Handling Code
```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        ...options.headers
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 401) {
        // Redirect to login
        window.location.href = '/login';
        return;
      }
      
      // Show error message to user
      showErrorToast(data.error || 'An error occurred');
      throw new Error(data.error || `Error ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API Request failed:', error);
    showErrorToast('Network error or server unavailable');
    throw error;
  }
}
```

---

# Category Implementation

Categories in StockIT are implemented as an array of strings stored within each organization record. This approach provides flexibility while maintaining simplicity in the database schema.

## Database Structure

Categories are stored in the `Organization` model as a string array field called `defaultCategories`:

```prisma
model Organization {
  id                Int      @id @default(autoincrement())
  name              String
  industry          Industry @default(OTHER)
  address           String?
  phone             String?
  timezone          String   @default("Australia/Canberra")
  adminEmail        String?
  defaultCategories String[]
  // ... other fields
}
```

## Default Categories

When a new organization is created, it is automatically populated with these default categories:

- Meat
- Vegetables
- Fruits
- Dairy
- Bakery
- Dry Goods
- Frozen
- Beverages
- Other

## Category Operations

### Adding Categories

New categories can be added via the `/api/categories` endpoint. This will append the new category to the organization's `defaultCategories` array.

### Removing Categories

Categories can be removed via the `/api/categories/:categoryName` endpoint. This will remove the specified category from the organization's `defaultCategories` array.

### Using Categories with Items

When creating or updating items, specify the category name in the `category` field. If the specified category doesn't exist in the organization's categories, the item will still be created, but you should validate on the frontend to prevent typos or inconsistencies.

## Migration Notes

The initial migration for categories support is implemented in the `20250509000000_add_categories_support` migration file. This adds the `defaultCategories` field to the `Organization` model.

If you have existing data without categories, you can run the `migrateCategoriesData.js` script to populate the default categories for all organizations and set item categories to "Other" where they are null.

---

# Organization Implementation

The organization system in StockIT allows for multi-tenant functionality where each user belongs to an organization and can only access data within their organization.

## Database Structure

The main models involved in the organization system are:

```prisma
model Organization {
  id                Int      @id @default(autoincrement())
  name              String
  industry          Industry @default(OTHER)
  address           String?
  phone             String?
  timezone          String   @default("Australia/Canberra")
  adminEmail        String?
  defaultCategories String[]
  contactEmail      String?
  contactPhone      String?
  logoUrl           String?
  createdAt         DateTime @default(now())
  
  users  User[]
  stores Store[]
  items  Item[]
}

model User {
  id                Int      @id @default(autoincrement())
  email             String   @unique
  password          String
  role              Role     @default(STORE)
  organizationId    Int?
  isNewOrganization Boolean  @default(false)
  createdAt         DateTime @default(now())
  
  organization Organization? @relation(fields: [organizationId], references: [id])
}
```

## Organization Setup Flow

1. User registers with `isNewOrganization` set to true
2. User is directed to complete organization setup
3. Organization details are updated and a store is created
4. Optional initial items are created
5. User's `isNewOrganization` flag is set to false

## Organization Access Control

Access control is implemented through middleware that automatically filters data based on the user's organization:

1. When a user logs in, their organization ID is included in the JWT token
2. The `authenticateToken` middleware extracts this information from the token
3. The `filterByOrganization` middleware applies organization-based filtering to database queries

This ensures that users can only access data belonging to their organization.

## Industry Types

The organization's industry is defined as an enum in the schema:

```prisma
enum Industry {
  BAKERY
  CAFE
  RESTAURANT
  FOODSERVICE
  RETAIL
  MANUFACTURING
  OTHER
}
```

The default is "OTHER" if not specified.

---

# Development Guide

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL database

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up your database connection in `.env` file:

```
DATABASE_URL="postgresql://username:password@localhost:5432/stockit"
JWT_SECRET="your-secret-key"
```

4. Run database migrations:

```bash
npx prisma migrate deploy
```

5. Start the development server:

```bash
npm run dev
```

### Available Scripts

- `npm start` - Start the production server with database migrations
- `npm run dev` - Start the development server with hot reload
- `npm run utils` - Open the utilities menu
- `npm run categories:test` - Run category tests
- `npm run categories:seed` - Seed category test data
- `npm run categories:migrate` - Migrate existing data to use categories
- `npm run db:studio` - Open Prisma Studio to inspect the database

## Project Structure

- `/routes` - API route handlers organized by resource
- `/prisma` - Database schema and migrations
- `/scripts` - Utility scripts for maintenance tasks
- `/documentation` - Project documentation

## Adding New Endpoints

1. Create or modify a route file in the `/routes` directory
2. Import and set up middleware for authentication and organization filtering
3. Add your new endpoint with proper request validation
4. Mount the route in `index.js`

Example:

```javascript
// routes/myNewResource.js
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, filterByOrganization } = require('../middleware');

const prisma = new PrismaClient();

router.get('/', authenticateToken, filterByOrganization, async (req, res) => {
  try {
    // Your endpoint logic here
    
    res.json({ data: 'Your response data' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

module.exports = router;

// In index.js
const myNewResourceRoutes = require('./routes/myNewResource');
app.use('/api/my-new-resource', myNewResourceRoutes);
```

---

# Deployment Guide

## Preparing for Production

1. Update the JWT secret in the production environment
2. Configure database connection for production
3. Set NODE_ENV to "production" to disable detailed error stacks

## Deployment Options

### Traditional Hosting

1. Clone the repository on your server
2. Install dependencies with `npm install --production`
3. Set up environment variables
4. Run database migrations with `npx prisma migrate deploy`
5. Start the server with `npm start`

### Docker Deployment

A Dockerfile is provided for containerized deployment:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "start"]
```

Build and run the Docker container:

```bash
docker build -t stockit-backend .
docker run -p 4000:4000 -e DATABASE_URL=your_db_url -e JWT_SECRET=your_secret stockit-backend
```

### Cloud Hosting (Heroku Example)

1. Create a new Heroku app
2. Add PostgreSQL add-on
3. Configure environment variables in Heroku dashboard
4. Deploy using Git:

```bash
heroku git:remote -a your-heroku-app-name
git push heroku main
```

## Monitoring and Maintenance

- Use logging services like Winston or Bunyan for production logging
- Set up health check endpoints for monitoring
- Regular database backups
- Implement rate limiting for API endpoints
