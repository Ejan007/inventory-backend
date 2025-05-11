/**
 * Email Template Test Utility
 * This script renders email templates with sample data for testing purposes.
 */
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

// Template directory path
const TEMPLATE_DIR = path.join(__dirname, '../email-templates');

// Output directory for rendered templates
const OUTPUT_DIR = path.join(__dirname, '../email-test-output');

// Sample data for templates
const sampleData = {
  'low-stock-alert.html': {
    storeName: 'Downtown Store',
    items: [
      { name: 'French Baguette', quantity: 5, required: 20, shortage: 15 },
      { name: 'Croissant', quantity: 3, required: 15, shortage: 12 },
      { name: 'Sourdough Loaf', quantity: 1, required: 10, shortage: 9 }
    ],
    urgent: true
  },
  'password-reset.html': {
    username: 'John Smith',
    resetUrl: 'https://stockit.app/reset-password?token=sample-jwt-token',
    resetToken: 'sample-jwt-token'
  },
  'welcome.html': {
    name: 'Jane Doe',
    organizationName: 'Bakery Plus Inc.'
  },
  'inventory-report.html': {
    reportType: 'Daily',
    storeName: 'Main Bakery',
    categories: [
      {
        name: 'Bakery',
        items: [
          { name: 'Bread', quantity: 20, required: 25, isLow: true, status: 'Low Stock' },
          { name: 'Pastries', quantity: 30, required: 20, isLow: false, status: 'In Stock' }
        ]
      },
      {
        name: 'Dairy',
        items: [
          { name: 'Milk', quantity: 5, required: 10, isLow: true, status: 'Low Stock' },
          { name: 'Butter', quantity: 15, required: 10, isLow: false, status: 'In Stock' }
        ]
      }
    ],
    recommendations: [
      'Order 5 more loaves of bread',
      'Order 5 more gallons of milk',
      'Consider reducing pastry production tomorrow'
    ],
    timestamp: new Date().toLocaleString()
  }
};

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Process each template
async function renderTemplates() {
  try {
    // Get all template files
    const templateFiles = fs.readdirSync(TEMPLATE_DIR)
      .filter(file => file.endsWith('.html'));
    
    console.log(`Found ${templateFiles.length} template files to render`);
    
    for (const templateFile of templateFiles) {
      // Skip if we don't have sample data for this template
      if (!sampleData[templateFile]) {
        console.log(`Skipping ${templateFile} - no sample data available`);
        continue;
      }
      
      console.log(`Rendering ${templateFile}...`);
      
      // Read template file
      const templatePath = path.join(TEMPLATE_DIR, templateFile);
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      
      // Compile template
      const template = handlebars.compile(templateSource);
      
      // Render with sample data
      const rendered = template(sampleData[templateFile]);
      
      // Write rendered output
      const outputPath = path.join(OUTPUT_DIR, templateFile);
      fs.writeFileSync(outputPath, rendered);
      
      console.log(`✅ Rendered ${templateFile} to ${outputPath}`);
    }
    
    console.log('\nEmail template rendering complete!');
    console.log(`You can view the rendered templates in: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Error rendering templates:', error);
  }
}

// Run the template rendering
renderTemplates();
