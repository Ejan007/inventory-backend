# StockIT Email Templates

This directory contains HTML email templates used by the StockIT email service. These templates are compiled using Handlebars to inject dynamic content before sending.

## Available Templates

| Template File | Description | Used By |
|---------------|-------------|---------|
| low-stock-alert.html | Alerts for inventory items below required thresholds | `/api/email/low-stock-alert` |
| password-reset.html | Password reset links for users | `/api/email/password-reset` |
| welcome.html | Welcome emails for new users | `/api/email/welcome` |
| inventory-report.html | Inventory status reports | `/api/email/inventory-report` |

## Template Variables

### Low Stock Alert Template
- `storeName` - Name of the store with low stock
- `items` - Array of items with low stock
  - `name` - Item name
  - `quantity` - Current quantity
  - `required` - Required quantity
  - `shortage` - Amount below required (required - quantity)
- `urgent` - Boolean flag for urgent alerts

### Password Reset Template
- `username` - User's name
- `resetUrl` - URL for password reset page with token
- `resetToken` - Reset token (not displayed in the email but available for custom implementations)

### Welcome Template
- `name` - New user's name
- `organizationName` - Organization the user belongs to

### Inventory Report Template
- `reportType` - Type of report (e.g., "Daily", "Weekly")
- `storeName` - Name of the store
- `categories` - Object of categories with items
  - `name` - Category name
  - `items` - Array of items in the category
    - `name` - Item name
    - `quantity` - Current quantity
    - `required` - Required quantity
    - `isLow` - Boolean indicating if stock is low
    - `status` - Text status (e.g., "Low Stock", "In Stock")
- `recommendations` - Array of recommended actions
- `timestamp` - Report generation timestamp

## Styling

All templates include responsive styling for proper display on both desktop and mobile devices. Key features:

- Responsive design with media queries
- Consistent branding elements
- Accessible color schemes
- Proper formatting for email clients

## Development

When modifying templates:

1. Test with various email clients (Gmail, Outlook, etc.)
2. Use inline CSS for compatibility
3. Keep images to a minimum
4. Test responsive behavior

## Testing

You can test these templates using the test utilities:

```bash
# Generate HTML previews of all templates
npm run email:test

# Test end-to-end email delivery using Ethereal (fake SMTP service)
npm run email:integration
```

The first command renders sample templates with test data and saves them to the `/email-test-output/` directory so you can preview how they'll appear.

The second command performs an integration test by sending actual emails to a test account on Ethereal.email, which captures emails instead of delivering them. This is useful for verifying that the entire email pipeline works correctly, including SMTP sending.

## Utility Module

For programmatic access to the email service from other parts of the application, use the `emailNotifier` utility:

```javascript
const emailNotifier = require('../utils/emailNotifier');

// Send a low stock alert
await emailNotifier.sendLowStockAlert({
  recipient: ['manager@example.com'],
  storeName: 'Downtown Store',
  items: [/* item data */],
  urgent: true
});

// Send a welcome email to a new user
await emailNotifier.sendWelcomeEmail({
  recipient: 'newuser@example.com',
  name: 'John Doe',
  organizationName: 'Bakery Inc.'
});
```

This provides a more convenient interface than directly calling the API endpoints.
