/**
 * StockIT Backend API Configuration
 */
const corsConfig = {
  // List of allowed origins
  allowedOrigins: [
    'https://inventory-client-o8x7911id-ejan007s-projects.vercel.app',
    'https://inventory-client-gamma.vercel.app',
    'http://localhost:3000',
    'https://inventory-client-hndje53bd-ejan007s-projects.vercel.app',
    'http://192.168.1.104:3000',
    'http://192.168.1.104:4000',
    'capacitor://localhost',
    'ionic://localhost',
    '*'  // Add wildcard for testing only - remove in production
  ]
};

// CORS options function
const getCorsOptions = () => {
  return {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // For testing, allow any origin
      if (corsConfig.allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      
      if (corsConfig.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('CORS blocked origin:', origin);
        callback(null, false);  // Don't throw error, just refuse
      }
    },
    credentials: true,             // Allow credentials
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Allow all these methods
    optionsSuccessStatus: 200      // For legacy browser support
  };
};

/**
 * JWT Configuration
 */
const jwtConfig = {
  secret: process.env.JWT_SECRET || 'supersecret',
  expiresIn: '1d'
};

module.exports = {
  corsConfig,
  getCorsOptions,
  jwtConfig,
  port: process.env.PORT || 4000
};
