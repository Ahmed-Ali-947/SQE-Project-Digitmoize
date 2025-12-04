// tests/unit/users/controllers/authController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUserSignup } from '../../../../users/controllers/authController.js';
import { setUser } from '../../../../users/services/setUser.js';

// Mock dependencies
vi.mock('../../../../users/services/setUser.js');

describe('authController - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock request object with decodedToken from Firebase
    req = {
      decodedToken: {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'avatar.jpg',
        email_verified: true
      },
      body: {}
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('handleUserSignup', () => {
    // BRANCH 1: Successful user signup with complete Firebase data
    it('should create user successfully with complete Firebase token data', async () => {
      // Arrange
      const completeDecodedToken = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        name: 'Test User',
        picture: 'avatar.jpg',
        resume: 'resume.pdf',
        email_verified: true,
        email: 'test@example.com',
        email_show: true,
        bio: {
          data: 'Software Developer',
          showOnWebsite: true
        },
        dateOfBirth: {
          data: '2000-01-01',
          showOnWebsite: false
        },
        phoneNumber: {
          data: '+1234567890',
          showOnWebsite: false
        },
        github: {
          data: 'https://github.com/testuser',
          showOnWebsite: true
        },
        social: {
          linkedin: 'https://linkedin.com/in/testuser',
          instagram: 'https://instagram.com/testuser',
          twitter: 'https://twitter.com/testuser'
        },
        codechef: {
          username: 'cc_test',
          showOnWebsite: true
        },
        leetcode: {
          username: 'lc_test',
          showOnWebsite: true
        },
        codeforces: {
          username: 'cf_test',
          showOnWebsite: true
        }
      };
      
      req.decodedToken = completeDecodedToken;
      setUser.mockResolvedValue({ uid: 'firebase-uid-123' });

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalledWith(completeDecodedToken);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User created successfully'
      });
    });

    // BRANCH 2: Missing uid in Firebase token
    it('should return 400 when uid is missing', async () => {
      // Arrange
      req.decodedToken = {
        // Missing uid
        email: 'test@example.com',
        name: 'Test User'
      };

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
    });

    // BRANCH 3: Missing username and name in token, provided in body
    it('should use username and name from request body when missing in token', async () => {
      // Arrange
      req.decodedToken = {
        uid: 'firebase-uid-123',
        email: 'test@example.com'
        // Missing username and name
      };
      
      req.body = {
        username: 'customusername',
        name: 'Custom Name'
      };
      
      setUser.mockResolvedValue({ uid: 'firebase-uid-123' });

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'firebase-uid-123',
          username: 'customusername',
          name: 'Custom Name'
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // BRANCH 4: Invalid social URL validation
    it('should return 400 for invalid social media URLs', async () => {
      // Arrange
      req.decodedToken = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        social: {
          twitter: 'invalid-url', // Invalid URL
          linkedin: 'https://linkedin.com/in/validuser'
        }
      };

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid twitter URL',
        message: 'Invalid twitter URL'
      });
    });

    // BRANCH 5: Valid social URL validation
    it('should accept valid social media URLs', async () => {
      // Arrange
      req.decodedToken = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        social: {
          twitter: 'https://twitter.com/validuser',
          linkedin: 'https://linkedin.com/in/validuser',
          instagram: 'https://instagram.com/validuser'
        }
      };
      
      setUser.mockResolvedValue({ uid: 'firebase-uid-123' });

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // BRANCH 6: User already exists (setUser returns status 200)
    it('should return 200 when user already exists', async () => {
      // Arrange
      const existingUserError = {
        status: 200,
        message: 'User already exists'
      };
      setUser.mockRejectedValue(existingUserError);

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User already exists.'
      });
    });

    // BRANCH 7: Validation error from setUser (status 400)
    it('should return 400 when setUser returns validation error', async () => {
      // Arrange
      const validationError = {
        status: 400,
        message: 'Invalid email format'
      };
      setUser.mockRejectedValue(validationError);

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid email format'
      });
    });

    // BRANCH 8: Generic error from setUser
    it('should return 500 on generic setUser error', async () => {
      // Arrange
      setUser.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error creating user'
      });
    });

    // BRANCH 9: Minimal user data (only required fields)
    it('should handle signup with minimal required data', async () => {
      // Arrange
      req.decodedToken = {
        uid: 'minimal-uid',
        email: 'minimal@example.com'
        // No optional fields
      };
      
      setUser.mockResolvedValue({ uid: 'minimal-uid' });

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalledWith({
        uid: 'minimal-uid',
        email: 'minimal@example.com',
        username: undefined,
        name: undefined,
        picture: undefined,
        resume: undefined,
        email_verified: undefined,
        email_show: undefined,
        bio: undefined,
        dateOfBirth: undefined,
        phoneNumber: undefined,
        github: undefined,
        social: undefined,
        codechef: undefined,
        leetcode: undefined,
        codeforces: undefined
      });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // BRANCH 10: Social validation with some null/undefined URLs
    it('should handle social validation with null/undefined URLs', async () => {
      // Arrange
      req.decodedToken = {
        uid: 'test-uid',
        email: 'test@example.com',
        social: {
          twitter: null,
          linkedin: undefined,
          instagram: 'https://instagram.com/valid' // Only one valid URL
        }
      };
      
      setUser.mockResolvedValue({ uid: 'test-uid' });

      // Act
      await handleUserSignup(req, res);

      // Assert
      // Should accept null/undefined URLs
      expect(setUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // BRANCH 11: Empty social object
    it('should handle empty social object', async () => {
      // Arrange
      req.decodedToken = {
        uid: 'test-uid',
        email: 'test@example.com',
        social: {}
      };
      
      setUser.mockResolvedValue({ uid: 'test-uid' });

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // BRANCH 12: Missing social property
    it('should handle missing social property', async () => {
      // Arrange
      req.decodedToken = {
        uid: 'test-uid',
        email: 'test@example.com'
        // No social property
      };
      
      setUser.mockResolvedValue({ uid: 'test-uid' });

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'test-uid',
          email: 'test@example.com',
          social: undefined
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // BRANCH 13: Platform data provided in token
    it('should include platform data from token', async () => {
      // Arrange
      req.decodedToken = {
        uid: 'test-uid',
        email: 'test@example.com',
        codechef: {
          username: 'cc_user',
          showOnWebsite: true
        },
        leetcode: {
          username: 'lc_user',
          showOnWebsite: false
        }
      };
      
      setUser.mockResolvedValue({ uid: 'test-uid' });

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          codechef: {
            username: 'cc_user',
            showOnWebsite: true
          },
          leetcode: {
            username: 'lc_user',
            showOnWebsite: false
          }
        })
      );
    });

    // BRANCH 14: Error handling - console.error called
    it('should log error to console on failure', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      setUser.mockRejectedValue(new Error('Test error'));

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    // BRANCH 15: Mix of token and body data
    it('should merge data from token and body correctly', async () => {
      // Arrange
      req.decodedToken = {
        uid: 'test-uid',
        email: 'token-email@example.com', // From token
        name: 'Token Name' // From token
      };
      
      req.body = {
        username: 'body-username', // From body
        name: 'Body Name' // Should override token name
      };
      
      setUser.mockResolvedValue({ uid: 'test-uid' });

      // Act
      await handleUserSignup(req, res);

      // Assert
      expect(setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'test-uid',
          email: 'token-email@example.com', // From token
          username: 'body-username', // From body
          name: 'Body Name' // From body (overrides token)
        })
      );
    });
  });
});