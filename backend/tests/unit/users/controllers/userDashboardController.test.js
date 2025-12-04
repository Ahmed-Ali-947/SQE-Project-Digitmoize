// tests/unit/users/controllers/userDashboardController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleUserDashboard } from '../../../../users/controllers/userDashboardController.js';
import User from '../../../../users/models/User.js';

// Mock dependencies
vi.mock('../../../../users/models/User.js');

describe('userDashboardController - Unit Tests', () => {
  let req, res, mockUser;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock request object
    req = {
      decodedToken: {
        uid: 'firebase-uid-123'
      }
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      redirect: vi.fn()
    };
    
    // Create a comprehensive mock user
    mockUser = {
      uid: 'firebase-uid-123',
      username: 'testuser',
      role: 'user',
      name: 'Test User',
      picture: 'avatar.jpg',
      resume: 'resume.pdf',
      email_verified: true,
      email: 'test@example.com',
      email_show: true,
      skills: ['JavaScript', 'React', 'Node.js'],
      education: [
        {
          degree: 'B.Tech',
          institution: 'Test University',
          year: '2020-2024'
        }
      ],
      preferences: {
        theme: 'dark',
        notifications: true
      },
      bio: {
        data: 'Software Developer passionate about open source',
        showOnWebsite: true
      },
      phoneNumber: {
        data: '+1234567890',
        showOnWebsite: false
      },
      dateOfBirth: {
        data: '2000-01-01',
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
      codeforces: {
        username: 'cf_test',
        rating: 1500,
        attendedContestsCount: 10,
        badge: 'specialist',
        showOnWebsite: true
      },
      codechef: {
        username: 'cc_test',
        rating: 1800,
        attendedContestsCount: 15,
        badge: '4 star',
        showOnWebsite: true
      },
      leetcode: {
        username: 'lc_test',
        rating: 2000,
        attendedContestsCount: 20,
        badge: 'Knight',
        showOnWebsite: true
      },
      digitomize_rating: 1700,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      __v: 1
    };
    
    // Default User mock
    User.findOne.mockResolvedValue(mockUser);
  });

  describe('handleUserDashboard', () => {
    // BRANCH 1: User found successfully - returns complete dashboard data
    it('should return complete user dashboard data when user exists', async () => {
      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith(
        { uid: 'firebase-uid-123' },
        '-_id -password -createdAt -updatedAt -__v'
      );
      
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        personal_data: {
          uid: 'firebase-uid-123',
          username: 'testuser',
          role: 'user',
          name: 'Test User',
          picture: 'avatar.jpg',
          resume: 'resume.pdf',
          email_verified: true,
          email: 'test@example.com',
          email_show: true,
          skills: ['JavaScript', 'React', 'Node.js'],
          education: [
            {
              degree: 'B.Tech',
              institution: 'Test University',
              year: '2020-2024'
            }
          ],
          preferences: {
            theme: 'dark',
            notifications: true
          },
          bio: {
            data: 'Software Developer passionate about open source',
            showOnWebsite: true
          },
          phoneNumber: {
            data: '+1234567890',
            showOnWebsite: false
          },
          dateOfBirth: {
            data: '2000-01-01',
            showOnWebsite: false
          }
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
        ratings: {
          codeforces: {
            data: 'cf_test',
            showOnWebsite: true
          },
          codechef: {
            data: 'cc_test',
            showOnWebsite: true
          },
          leetcode: {
            data: 'lc_test',
            showOnWebsite: true
          },
          digitomize_rating: 1700
        }
      });
    });

    // BRANCH 2: User not found - returns 404
    it('should return 404 when user does not exist', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found',
        error: 'User not found'
      });
    });

    // BRANCH 3: Database error - returns 500
    it('should return 500 on database error', async () => {
      // Arrange
      User.findOne.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    // BRANCH 4: User with null/undefined optional fields
    it('should handle null/undefined optional fields gracefully', async () => {
      // Arrange
      const userWithNullFields = {
        ...mockUser,
        skills: null,
        education: null,
        preferences: null,
        bio: {
          data: null,
          showOnWebsite: false
        },
        phoneNumber: {
          data: null,
          showOnWebsite: false
        },
        dateOfBirth: {
          data: null,
          showOnWebsite: false
        },
        github: {
          data: null,
          showOnWebsite: false
        },
        social: {
          linkedin: null,
          instagram: null,
          twitter: null
        },
        codeforces: {
          username: null,
          showOnWebsite: false
        },
        codechef: {
          username: null,
          showOnWebsite: false
        },
        leetcode: {
          username: null,
          showOnWebsite: false
        },
        digitomize_rating: 0
      };
      
      User.findOne.mockResolvedValue(userWithNullFields);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      
      // Check that null values are preserved in response
      expect(response.personal_data.skills).toBeNull();
      expect(response.personal_data.education).toBeNull();
      expect(response.personal_data.preferences).toBeNull();
      expect(response.personal_data.bio.data).toBeNull();
      expect(response.personal_data.phoneNumber.data).toBeNull();
      expect(response.personal_data.dateOfBirth.data).toBeNull();
      
      expect(response.github.data).toBeNull();
      
      expect(response.social.linkedin).toBeNull();
      expect(response.social.instagram).toBeNull();
      expect(response.social.twitter).toBeNull();
      
      expect(response.ratings.codeforces.data).toBeNull();
      expect(response.ratings.codechef.data).toBeNull();
      expect(response.ratings.leetcode.data).toBeNull();
      expect(response.ratings.digitomize_rating).toBe(0);
    });

    // BRANCH 5: User with empty arrays
    it('should handle empty arrays correctly', async () => {
      // Arrange
      const userWithEmptyArrays = {
        ...mockUser,
        skills: [],
        education: []
      };
      
      User.findOne.mockResolvedValue(userWithEmptyArrays);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.personal_data.skills).toEqual([]);
      expect(response.personal_data.education).toEqual([]);
    });

    // BRANCH 6: User with missing nested objects
    it('should handle missing nested objects gracefully', async () => {
      // Arrange
      const userWithMissingObjects = {
        uid: 'firebase-uid-123',
        username: 'testuser',
        email: 'test@example.com'
        // Missing bio, phoneNumber, dateOfBirth, social, ratings objects
      };
      
      User.findOne.mockResolvedValue(userWithMissingObjects);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      // Should not crash, should handle missing properties
      expect(res.status).toHaveBeenCalledWith(200);
      
      const response = res.json.mock.calls[0][0];
      // Missing objects should result in null/empty values
      expect(response.personal_data.bio.data).toBeNull();
      expect(response.personal_data.phoneNumber.data).toBeNull();
      expect(response.personal_data.dateOfBirth.data).toBeNull();
      expect(response.social.linkedin).toBeNull();
      expect(response.ratings.codeforces.data).toBeNull();
    });

    // BRANCH 7: User with showOnWebsite false for sensitive data
    it('should include data even when showOnWebsite is false (dashboard shows all)', async () => {
      // Arrange
      const userWithHiddenData = {
        ...mockUser,
        bio: {
          data: 'Hidden bio',
          showOnWebsite: false // Hidden on public profile but shown in dashboard
        },
        phoneNumber: {
          data: '+1234567890',
          showOnWebsite: false
        },
        dateOfBirth: {
          data: '2000-01-01',
          showOnWebsite: false
        },
        email_show: false // Email hidden on website
      };
      
      User.findOne.mockResolvedValue(userWithHiddenData);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      
      // Dashboard should show all data regardless of showOnWebsite
      expect(response.personal_data.bio.data).toBe('Hidden bio');
      expect(response.personal_data.bio.showOnWebsite).toBe(false);
      expect(response.personal_data.phoneNumber.data).toBe('+1234567890');
      expect(response.personal_data.dateOfBirth.data).toBe('2000-01-01');
      expect(response.personal_data.email).toBe('test@example.com'); // Email still shown
      expect(response.personal_data.email_show).toBe(false); // But flag indicates it's hidden
    });

    // BRANCH 8: Field selection in database query
    it('should exclude sensitive fields from database query', async () => {
      // Arrange
      const expectedProjection = '-_id -password -createdAt -updatedAt -__v';

      // Act
      await handleUserDashboard(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith(
        { uid: 'firebase-uid-123' },
        expectedProjection
      );
    });

    // BRANCH 9: Error in JSON response construction
    it('should handle errors during response construction gracefully', async () => {
      // Arrange
      // Create a user object that might cause issues
      const problematicUser = {
        ...mockUser,
        // Add a circular reference or non-serializable property
        circularRef: null
      };
      problematicUser.circularRef = problematicUser; // Circular reference
      
      User.findOne.mockResolvedValue(problematicUser);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      // The function has try-catch, so it should handle this
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    // BRANCH 10: Missing uid in decodedToken (commented out in code)
    it('should not check for missing uid since middleware handles it', async () => {
      // Note: The code has commented out authentication check:
      // if (!req.userId) { return res.redirect('/login'); }
      // So this test is to verify the current behavior
      
      // Arrange
      req.decodedToken = {}; // No uid
      User.findOne.mockResolvedValue(null); // Will return null since no uid

      // Act
      await handleUserDashboard(req, res);

      // Assert
      // Should still try to find user with undefined uid
      expect(User.findOne).toHaveBeenCalledWith(
        { uid: undefined },
        '-_id -password -createdAt -updatedAt -__v'
      );
      // Will return 404 since user not found
      expect(res.status).toHaveBeenCalledWith(404);
    });

    // BRANCH 11: Platform data with null username but showOnWebsite true
    it('should handle platform data with null username but showOnWebsite true', async () => {
      // Arrange
      const userWithNullPlatformUsername = {
        ...mockUser,
        codeforces: {
          username: null, // Null username
          showOnWebsite: true // But marked to show
        }
      };
      
      User.findOne.mockResolvedValue(userWithNullPlatformUsername);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.ratings.codeforces.data).toBeNull();
      expect(response.ratings.codeforces.showOnWebsite).toBe(true);
    });

    // BRANCH 12: Large/complex education array
    it('should handle complex education array structure', async () => {
      // Arrange
      const complexEducation = [
        {
          degree: 'Bachelor of Technology',
          institution: 'Indian Institute of Technology',
          year: '2020-2024',
          grade: '9.2/10',
          description: 'Computer Science and Engineering'
        },
        {
          degree: 'High School',
          institution: 'Delhi Public School',
          year: '2018-2020',
          grade: '95%'
        }
      ];
      
      const userWithComplexEducation = {
        ...mockUser,
        education: complexEducation
      };
      
      User.findOne.mockResolvedValue(userWithComplexEducation);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.personal_data.education).toEqual(complexEducation);
      expect(response.personal_data.education).toHaveLength(2);
    });

    // BRANCH 13: Skills with special characters and empty strings
    it('should handle skills array with various data types', async () => {
      // Arrange
      const variedSkills = [
        'JavaScript',
        'React.js',
        'Node.js',
        'TypeScript',
        '', // Empty string
        '   ', // Whitespace only
        null, // Null value
        'Python 3.11'
      ];
      
      const userWithVariedSkills = {
        ...mockUser,
        skills: variedSkills
      };
      
      User.findOne.mockResolvedValue(userWithVariedSkills);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.personal_data.skills).toEqual(variedSkills);
    });

    // BRANCH 14: Missing social media links
    it('should handle partial social media data', async () => {
      // Arrange
      const partialSocial = {
        linkedin: 'https://linkedin.com/in/testuser'
        // Missing instagram and twitter
      };
      
      const userWithPartialSocial = {
        ...mockUser,
        social: partialSocial
      };
      
      User.findOne.mockResolvedValue(userWithPartialSocial);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.social.linkedin).toBe('https://linkedin.com/in/testuser');
      expect(response.social.instagram).toBeUndefined(); // Not in original object
      expect(response.social.twitter).toBeUndefined(); // Not in original object
    });

    // BRANCH 15: Verify response structure consistency
    it('should maintain consistent response structure regardless of data', async () => {
      // Arrange
      const minimalUser = {
        uid: 'minimal-uid',
        username: 'minimaluser',
        role: 'user',
        name: 'Minimal User',
        picture: null,
        resume: null,
        email_verified: false,
        email: 'minimal@example.com',
        email_show: false
        // Missing many optional fields
      };
      
      User.findOne.mockResolvedValue(minimalUser);

      // Act
      await handleUserDashboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      
      // Should still have all top-level properties
      expect(response).toHaveProperty('personal_data');
      expect(response).toHaveProperty('github');
      expect(response).toHaveProperty('social');
      expect(response).toHaveProperty('ratings');
      
      // Nested structures should exist even with null data
      expect(response.personal_data).toHaveProperty('bio');
      expect(response.personal_data).toHaveProperty('phoneNumber');
      expect(response.personal_data).toHaveProperty('dateOfBirth');
      
      expect(response.ratings).toHaveProperty('codeforces');
      expect(response.ratings).toHaveProperty('codechef');
      expect(response.ratings).toHaveProperty('leetcode');
      expect(response.ratings).toHaveProperty('digitomize_rating');
    });
  });
});