// tests/unit/controllers/userProfileController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  handleUserProfilePreview,
  handleUserDataUpdate,
  calculateDigitomizeRating
} from '../../../../users/controllers/userProfileController.js';
import User from '../../../../users/models/User.js';
import { codeforces_u } from '../../../../users/controllers/platforms/codeforcesUpdater.js';
import { codechef_u } from '../../../../users/controllers/platforms/codechefUpdater.js';
import { leetcode_u } from '../../../../users/controllers/platforms/leetcodeUpdater.js';
import { updateUser } from '../../../../users/services/updateUser.js';

// Mock all dependencies
vi.mock('../../../../users/models/User.js');
vi.mock('../../../../users/controllers/platforms/codeforcesUpdater.js');
vi.mock('../../../../users/controllers/platforms/codechefUpdater.js');
vi.mock('../../../../users/controllers/platforms/leetcodeUpdater.js');
vi.mock('../../../../users/services/updateUser.js');

describe('userProfileController - Unit Tests', () => {
  let req, res, mockUser;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock request object
    req = {
      params: { username: 'testuser' }
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    // Create a mock user
    mockUser = {
      uid: 'test-uid-123',
      username: 'testuser',
      name: 'Test User',
      picture: 'avatar.jpg',
      resume: null,
      email_verified: true,
      email: 'test@example.com',
      email_show: true,
      bio: {
        data: 'Software Developer',
        showOnWebsite: true
      },
      dateOfBirth: {
        data: '1990-01-01',
        showOnWebsite: false
      },
      phoneNumber: {
        data: '1234567890',
        showOnWebsite: false
      },
      github: {
        data: 'https://github.com/testuser',
        showOnWebsite: true
      },
      social: {
        linkedin: null,
        instagram: null,
        twitter: null
      },
      codeforces: {
        username: 'cf_test',
        rating: 1500,
        attendedContestsCount: 10,
        badge: 'specialist',
        fetchTime: Date.now() - (13 * 60 * 60 * 1000), // 13 hours old (stale)
        showOnWebsite: true
      },
      codechef: {
        username: 'cc_test',
        rating: 1800,
        attendedContestsCount: 15,
        badge: '4 star',
        fetchTime: Date.now() - (10 * 60 * 60 * 1000), // 10 hours old (fresh)
        showOnWebsite: true
      },
      leetcode: {
        username: 'lc_test',
        rating: 2000,
        attendedContestsCount: 20,
        badge: 'Knight',
        fetchTime: Date.now() - (14 * 60 * 60 * 1000), // 14 hours old (stale)
        showOnWebsite: false  // Not shown on website
      },
      digitomize_rating: 1700,
      skills: ['JavaScript', 'React', 'Node.js'],
      education: [],
      role: 'user',
      save: vi.fn()
    };
    
    // Default User mock
    User.findOne.mockResolvedValue(mockUser);
  });

  describe('handleUserProfilePreview', () => {
    // BRANCH 1: User found - returns public profile data
    it('should return public user profile when user exists', async () => {
      // Arrange
      const expectedResponse = {
        personal_data: {
          username: 'testuser',
          name: 'Test User',
          picture: 'avatar.jpg',
          resume: null,
          email_verified: true,
          email: 'test@example.com', // email_show is true
          bio: 'Software Developer', // showOnWebsite is true
          dateOfBirth: null, // showOnWebsite is false
          phoneNumber: null, // showOnWebsite is false
          role: 'user',
          skills: ['JavaScript', 'React', 'Node.js']
        },
        github: {
          data: 'https://github.com/testuser' // showOnWebsite is true
        },
        social: {
          linkedin: null,
          instagram: null,
          twitter: null
        },
        ratings: {
          digitomize_rating: 1700,
          codechef: {
            username: 'cc_test',
            rating: 1800,
            attendedContestsCount: 15,
            badge: '4 star',
            fetchTime: mockUser.codechef.fetchTime,
            totalQuestions: null,
            easyQuestions: null,
            mediumQuestions: null,
            hardQuestions: null
          },
          leetcode: {
            username: null, // showOnWebsite is false
            rating: null,
            attendedContestsCount: null,
            badge: null,
            fetchTime: null,
            totalQuestions: null,
            easyQuestions: null,
            mediumQuestions: null,
            hardQuestions: null
          },
          codeforces: {
            username: 'cf_test',
            rating: 1500,
            attendedContestsCount: 10,
            badge: 'specialist',
            fetchTime: mockUser.codeforces.fetchTime,
            totalQuestions: null,
            easyQuestions: null,
            mediumQuestions: null,
            hardQuestions: null
          }
        }
      };
      
      // Mock handleUserDataUpdate to do nothing
      // We'll test it separately
      
      // Act
      await handleUserProfilePreview(req, res);
      
      // Assert
      expect(User.findOne).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expectedResponse);
    });
    
    // BRANCH 2: User not found
    it('should return 404 when user does not exist', async () => {
      // Arrange
      User.findOne.mockResolvedValue(null);
      
      // Act
      await handleUserProfilePreview(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User not found',
        error: 'User not found'
      });
    });
    
    // BRANCH 3: Database error
    it('should return 500 on database error', async () => {
      // Arrange
      User.findOne.mockRejectedValue(new Error('Database connection failed'));
      
      // Act
      await handleUserProfilePreview(req, res);
      
      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Error fetching user profile',
        error: 'Error fetching user profile'
      });
    });
    
    // BRANCH 4: Privacy filtering - email not shown
    it('should hide email when email_show is false', async () => {
      // Arrange
      mockUser.email_show = false;
      
      // Act
      await handleUserProfilePreview(req, res);
      
      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          personal_data: expect.objectContaining({
            email: null
          })
        })
      );
    });
    
    // BRANCH 5: Privacy filtering - bio not shown
    it('should hide bio when showOnWebsite is false', async () => {
      // Arrange
      mockUser.bio.showOnWebsite = false;
      
      // Act
      await handleUserProfilePreview(req, res);
      
      // Assert
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          personal_data: expect.objectContaining({
            bio: null
          })
        })
      );
    });
  });

  describe('handleUserDataUpdate', () => {
    // Mock current time for testing
    const mockCurrentTime = new Date('2024-01-01T12:00:00Z').getTime();
    
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(mockCurrentTime);
    });
    
    afterEach(() => {
      vi.useRealTimers();
    });
    
    // BRANCH 1: Platform data is fresh (<12 hours) - should not update
    it('should not update platform if fetchTime is less than 12 hours old', async () => {
      // Arrange
      mockUser.codeforces.fetchTime = mockCurrentTime - (11 * 60 * 60 * 1000); // 11 hours old
      mockUser.codeforces.showOnWebsite = true;
      
      // Act
      await handleUserDataUpdate(mockUser);
      
      // Assert
      expect(codeforces_u).not.toHaveBeenCalled();
      expect(updateUser).not.toHaveBeenCalled();
    });
    
    // BRANCH 2: Platform data is stale (>12 hours) - should update
    it('should update platform if fetchTime is more than 12 hours old', async () => {
      // Arrange
      mockUser.codeforces.fetchTime = mockCurrentTime - (13 * 60 * 60 * 1000); // 13 hours old
      mockUser.codeforces.showOnWebsite = true;
      
      const newData = {
        handle: 'cf_test',
        rating: 1600,
        rank: 'expert',
        attendedContestsCount: 12
      };
      codeforces_u.mockResolvedValue(newData);
      
      // Act
      await handleUserDataUpdate(mockUser);
      
      // Assert
      expect(codeforces_u).toHaveBeenCalledWith('cf_test');
      expect(mockUser.codeforces.rating).toBe(1600);
      expect(mockUser.codeforces.badge).toBe('expert');
      expect(mockUser.codeforces.attendedContestsCount).toBe(12);
      expect(mockUser.codeforces.fetchTime).toBe(mockCurrentTime);
      expect(updateUser).toHaveBeenCalledWith(mockUser);
    });
    
    // BRANCH 3: Platform not shown on website - should skip update
    it('should skip update if showOnWebsite is false', async () => {
      // Arrange
      mockUser.codeforces.fetchTime = mockCurrentTime - (13 * 60 * 60 * 1000); // Stale
      mockUser.codeforces.showOnWebsite = false; // Not shown
      
      // Act
      await handleUserDataUpdate(mockUser);
      
      // Assert
      expect(codeforces_u).not.toHaveBeenCalled();
      expect(updateUser).not.toHaveBeenCalled();
    });
    
    // BRANCH 4: External API failure - should handle gracefully
    it('should handle Codeforces API failure gracefully', async () => {
      // Arrange
      mockUser.codeforces.fetchTime = mockCurrentTime - (13 * 60 * 60 * 1000);
      mockUser.codeforces.showOnWebsite = true;
      
      codeforces_u.mockRejectedValue(new Error('API failure'));
      
      // Act
      await handleUserDataUpdate(mockUser);
      
      // Assert
      expect(codeforces_u).toHaveBeenCalled();
      // Should not update user data on API failure
      expect(updateUser).not.toHaveBeenCalled();
    });
    
    // BRANCH 5: Multiple platforms update in one call
    it('should update multiple stale platforms in one call', async () => {
      // Arrange
      // Both platforms are stale
      mockUser.codeforces.fetchTime = mockCurrentTime - (13 * 60 * 60 * 1000);
      mockUser.codeforces.showOnWebsite = true;
      
      mockUser.codechef.fetchTime = mockCurrentTime - (14 * 60 * 60 * 1000);
      mockUser.codechef.showOnWebsite = true;
      
      // LeetCode is fresh, shouldn't update
      mockUser.leetcode.fetchTime = mockCurrentTime - (11 * 60 * 60 * 1000);
      mockUser.leetcode.showOnWebsite = true;
      
      const cfData = {
        handle: 'cf_test',
        rating: 1600,
        rank: 'expert',
        attendedContestsCount: 12
      };
      
      const ccData = {
        handle: 'cc_test',
        rating: 1900,
        rank: '5 star',
        attendedContestsCount: 16
      };
      
      codeforces_u.mockResolvedValue(cfData);
      codechef_u.mockResolvedValue(ccData);
      leetcode_u.mockResolvedValue(null); // Shouldn't be called
      
      // Act
      await handleUserDataUpdate(mockUser);
      
      // Assert
      expect(codeforces_u).toHaveBeenCalled();
      expect(codechef_u).toHaveBeenCalled();
      expect(leetcode_u).not.toHaveBeenCalled(); // Fresh data
      
      expect(mockUser.codeforces.rating).toBe(1600);
      expect(mockUser.codechef.rating).toBe(1900);
      expect(updateUser).toHaveBeenCalledWith(mockUser);
    });
    
    // BRANCH 6: LeetCode specific fields update
    it('should update LeetCode specific fields (totalQuestions, etc.)', async () => {
      // Arrange
      mockUser.leetcode.fetchTime = mockCurrentTime - (13 * 60 * 60 * 1000);
      mockUser.leetcode.showOnWebsite = true;
      
      const lcData = {
        handle: 'lc_test',
        rating: 2100,
        rank: 'Guardian',
        attendedContestsCount: 22,
        totalQuestions: 550,
        easyQuestions: 220,
        mediumQuestions: 270,
        hardQuestions: 60
      };
      
      leetcode_u.mockResolvedValue(lcData);
      
      // Act
      await handleUserDataUpdate(mockUser);
      
      // Assert
      expect(leetcode_u).toHaveBeenCalled();
      expect(mockUser.leetcode.rating).toBe(2100);
      expect(mockUser.leetcode.totalQuestions).toBe(550);
      expect(mockUser.leetcode.easyQuestions).toBe(220);
      expect(mockUser.leetcode.mediumQuestions).toBe(270);
      expect(mockUser.leetcode.hardQuestions).toBe(60);
    });
    
    // BRANCH 7: No changes when all platforms are fresh
    it('should not call updateUser when no platforms were updated', async () => {
      // Arrange - All platforms are fresh
      mockUser.codeforces.fetchTime = mockCurrentTime - (11 * 60 * 60 * 1000);
      mockUser.codechef.fetchTime = mockCurrentTime - (10 * 60 * 60 * 1000);
      mockUser.leetcode.fetchTime = mockCurrentTime - (9 * 60 * 60 * 1000);
      
      // Act
      await handleUserDataUpdate(mockUser);
      
      // Assert
      expect(codeforces_u).not.toHaveBeenCalled();
      expect(codechef_u).not.toHaveBeenCalled();
      expect(leetcode_u).not.toHaveBeenCalled();
      expect(updateUser).not.toHaveBeenCalled();
    });
  });

  describe('calculateDigitomizeRating', () => {
    // BRANCH 1: All platforms have ratings
    it('should return highest weighted rating from all platforms', () => {
      // Arrange
      const user = {
        codeforces: { rating: 1500 },  // Weighted: 1500 * 1 = 1500
        codechef: { rating: 1800 },    // Weighted: 1800 * 0.76 = 1368
        leetcode: { rating: 2000 }     // Weighted: 2000 * 0.695 = 1390
      };
      
      // Act
      const result = calculateDigitomizeRating(user);
      
      // Assert
      expect(result).toBe(1500); // Codeforces has highest weighted rating
    });
    
    // BRANCH 2: Some platforms have no rating
    it('should ignore platforms with no rating', () => {
      // Arrange
      const user = {
        codeforces: { rating: null },
        codechef: { rating: 1800 },    // Weighted: 1368
        leetcode: { rating: 2000 }     // Weighted: 1390
      };
      
      // Act
      const result = calculateDigitomizeRating(user);
      
      // Assert
      expect(result).toBe(1390); // LeetCode has highest
    });
    
    // BRANCH 3: No platforms have ratings
    it('should return 0 when no platforms have ratings', () => {
      // Arrange
      const user = {
        codeforces: { rating: null },
        codechef: { rating: null },
        leetcode: { rating: null }
      };
      
      // Act
      const result = calculateDigitomizeRating(user);
      
      // Assert
      expect(result).toBe(0);
    });
    
    // BRANCH 4: Platform data is undefined
    it('should handle undefined platform data', () => {
      // Arrange
      const user = {
        codeforces: undefined,
        codechef: { rating: 1800 }
      };
      
      // Act
      const result = calculateDigitomizeRating(user);
      
      // Assert
      expect(result).toBe(1368); // 1800 * 0.76
    });
    
    // BRANCH 5: Platform exists but no rating property
    it('should handle platform with no rating property', () => {
      // Arrange
      const user = {
        codeforces: { username: 'test' }, // No rating property
        codechef: { rating: 1800 }
      };
      
      // Act
      const result = calculateDigitomizeRating(user);
      
      // Assert
      expect(result).toBe(1368);
    });
  });
});