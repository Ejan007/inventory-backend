/**
 * Auth Routes
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { jwtConfig } = require('../config');

const prisma = new PrismaClient();

/**
 * Login route - supports both /login and /auth/login paths
 */
const loginHandler = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get organization name separately if needed
    let organizationName = null;
    if (user.organizationId) {
      try {
        const organization = await prisma.organization.findUnique({
          where: { id: user.organizationId }
        });
        organizationName = organization?.name;
      } catch (orgError) {
        console.log('Warning: Could not fetch organization:', orgError);
      }
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        role: user.role,
        organizationId: user.organizationId,
        organizationName: organizationName,
        isNewOrganization: user.isNewOrganization
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );
    
    // Enhanced response with more user information
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: organizationName,
        isNewOrganization: user.isNewOrganization
      },
      success: true
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login routes - multiple paths to support different client implementations
router.post('/login', loginHandler);
router.post('/auth/login', loginHandler);
router.post('/api/auth/login', loginHandler);

/**
 * Registration endpoint with organization support
 */
router.post('/auth/register', async (req, res) => {
  const { email, password, role = 'STORE', organizationName, isNewOrganization, existingOrganizationId } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let organizationId;
    
    if (isNewOrganization) {
      // Create new organization
      const newOrganization = await prisma.organization.create({
        data: {
          name: organizationName,
          adminEmail: email
        }
      });
      organizationId = newOrganization.id;
    } else if (existingOrganizationId) {
      // Verify existing organization
      const existingOrganization = await prisma.organization.findUnique({
        where: { id: parseInt(existingOrganizationId) }
      });
      
      if (!existingOrganization) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      organizationId = existingOrganization.id;
    }

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role.toUpperCase(),
        organizationId,
        isNewOrganization: isNewOrganization || false
      },
    });

    // Generate JWT token for the new user
    const token = jwt.sign(
      { 
        userId: newUser.id, 
        role: newUser.role, 
        organizationId,
        isNewOrganization: newUser.isNewOrganization
      },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn }
    );

    // Return success with token and user information
    res.status(201).json({ 
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        organizationId,
        isNewOrganization: newUser.isNewOrganization
      },
      success: true
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

module.exports = router;
