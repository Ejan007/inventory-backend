# StockIT Backend Multi-Tenant Organization Implementation

This document outlines the changes made to implement a multi-tenant organization feature in the StockIT Backend application.

## Database Schema Changes

1. **Created Organization Model**:
   - Added fields for name, industry, timezone, contact details, etc.
   - Added relationships with Users, Stores, and Items
   - Created an Industry enum for categorizing organizations

2. **Updated User Model**:
   - Added organization reference
   - Added `isNewOrganization` flag for onboarding flow
   - Updated JWT token to include organization details

3. **Updated Store Model**:
   - Added organization reference to ensure data isolation
   - Modified queries to filter by organization

4. **Updated Item Model**:
   - Added organization reference
   - Ensured items are always associated with stores within the same organization

## API Endpoints

### Organization Endpoints

1. **Create Organization**
   - **Endpoint**: `POST /api/organizations`
   - **Description**: Creates a new organization
   - **Required Authentication**: Yes
   - **Request Body**:
     ```json
     {
       "name": "Organization Name",
       "industry": "BAKERY",
       "address": "123 Main St",
       "phone": "123-456-7890",
       "timezone": "Australia/Canberra"
     }
     ```
   - **Response**: Organization object

2. **Get Organization**
   - **Endpoint**: `GET /api/organizations/:id`
   - **Description**: Retrieves an organization by ID
   - **Required Authentication**: Yes
   - **Authorization**: User must belong to the organization
   - **Response**: Organization object

3. **Complete Organization Setup**
   - **Endpoint**: `POST /api/organizations/setup`
   - **Description**: Completes the organization onboarding process
   - **Required Authentication**: Yes
   - **Request Body**:
     ```json
     {
       "orgSettings": {
         "industry": "BAKERY",
         "timezone": "Australia/Canberra",
         "address": "123 Main St",
         "phone": "123-456-7890"
       },
       "store": {
         "name": "Main Store"
       },
       "items": [
         {
           "name": "Item 1",
           "quantity": 10,
           "mondayRequired": 5,
           "tuesdayRequired": 5,
           "wednesdayRequired": 5,
           "thursdayRequired": 5,
           "fridayRequired": 5,
           "saturdayRequired": 5,
           "sundayRequired": 5
         }
       ]
     }
     ```
   - **Response**: Success message

4. **List Organizations (Admin Only)**
   - **Endpoint**: `GET /api/organizations`
   - **Description**: Lists all organizations
   - **Required Authentication**: Yes
   - **Authorization**: Admin role required
   - **Response**: Array of organization objects

### Updated Authentication Endpoints

1. **Registration with Organization Support**
   - **Endpoint**: `POST /auth/register`
   - **Description**: Registers a new user with organization assignment
   - **Request Body**:
     ```json
     {
       "email": "user@example.com",
       "password": "password123",
       "role": "ADMIN",
       "organizationName": "New Organization",
       "isNewOrganization": true
     }
     ```
     or
     ```json
     {
       "email": "user@example.com",
       "password": "password123",
       "role": "STORE",
       "existingOrganizationId": 123
     }
     ```
   - **Response**: User object, token, and success message

2. **Login with Organization Details**
   - **Endpoint**: `POST /auth/login`
   - **Description**: Authenticates a user and provides organization details
   - **Request Body**:
     ```json
     {
       "email": "user@example.com",
       "password": "password123"
     }
     ```
   - **Response**: User object with organization details and JWT token

### Updated Resource Endpoints

All resource endpoints now include organization filtering to ensure users can only access data from their own organization:

1. **Items**
   - `GET /items` - Lists items for the user's organization
   - `POST /items` - Creates an item in the user's organization
   - `GET /items/:id` - Gets a specific item (with organization check)
   - `PUT /items/:id` - Updates an item (with organization check)
   - `DELETE /items/:id` - Deletes an item (with organization check)

2. **Stores**
   - `GET /stores` - Lists stores for the user's organization
   - `POST /stores` - Creates a store in the user's organization

3. **History**
   - `GET /history-full` - Gets item history for the user's organization

## Middleware

1. **Authentication Middleware**
   - Verifies the JWT token
   - Attaches user details to the request object

2. **Organization Filtering Middleware**
   - Automatically filters data based on the user's organization
   - For GET requests: Adds organizationId to query parameters
   - For POST/PUT/DELETE requests: Adds organizationId to request body

## Security Measures

1. **Data Isolation**
   - All data is filtered by organization
   - Users can only access resources from their own organization

2. **JWT Token Security**
   - Tokens include organization details
   - Expiration set to 1 day

3. **Authorization Checks**
   - Organization-specific endpoints check that the user belongs to the requested organization
   - Admin-only endpoints verify the admin role

## Installation and Migration

1. **Database Migration**
   - The migration file has been created at `prisma/migrations/20250506055356_add_organization_model/migration.sql`
   - This migration adds the Organization model and updates the User, Store, and Item models

2. **Running the Migration**
   - Run the migration with: `npx prisma migrate deploy`
   - Generate the updated Prisma client with: `npx prisma generate`

## Testing

To test the multi-tenant organization feature:

1. **Register a New User with a New Organization**
   - POST to `/auth/register` with `isNewOrganization: true`
   - Verify the organization is created and the user is associated with it

2. **Complete Organization Setup**
   - POST to `/api/organizations/setup` with organization settings, store, and items
   - Verify the store and items are created under the organization

3. **Add Another User to an Existing Organization**
   - POST to `/auth/register` with `existingOrganizationId`
   - Verify the user is associated with the existing organization

4. **Test Data Isolation**
   - Create items in different organizations
   - Verify users can only see items from their own organization

## Future Enhancements

1. **Organization Invitation System**
   - Allow organization admins to invite users via email
   - Implement invitation acceptance and user role assignment

2. **Organization Settings Management**
   - Add endpoints to update organization settings
   - Allow customization of organization appearance and preferences

3. **User Management**
   - Add endpoints to manage users within an organization
   - Allow organization admins to assign roles and permissions