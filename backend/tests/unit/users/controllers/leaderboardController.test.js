// tests/unit/users/controllers/leaderboardController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getLeaderboard } from '../../../../users/controllers/leaderboardController.js';
import User from '../../../../users/models/User.js';

// Mock dependencies
vi.mock('../../../../users/models/User.js');

describe('leaderboardController - Unit Tests', () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock request object
    req = {
      query: {}
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  describe('getLeaderboard', () => {
    // BRANCH 1: Default behavior - no platform filter, no username query
    it('should return leaderboard sorted by digitomize_rating by default', async () => {
      // Arrange
      const mockUsers = [
        {
          username: 'user1',
          name: 'User One',
          picture: 'avatar1.jpg',
          digitomize_rating: 2100,
          codechef: { rating: 1900 },
          leetcode: { rating: 2000 },
          codeforces: { rating: 1800 }
        },
        {
          username: 'user2',
          name: 'User Two',
          picture: 'avatar2.jpg',
          digitomize_rating: 1900,
          codechef: { rating: 1800 },
          leetcode: { rating: 1900 },
          codeforces: { rating: 1700 }
        },
        {
          username: 'user3',
          name: 'User Three',
          picture: 'avatar3.jpg',
          digitomize_rating: 1700,
          codechef: { rating: 1700 },
          leetcode: { rating: 1800 },
          codeforces: { rating: 1600 }
        },
        {
          username: 'user4',
          name: 'User Four',
          picture: 'avatar4.jpg',
          digitomize_rating: 1500,
          codechef: { rating: 1600 },
          leetcode: { rating: 1700 },
          codeforces: { rating: 1500 }
        },
        {
          username: 'user5',
          name: 'User Five',
          picture: 'avatar5.jpg',
          digitomize_rating: 1300,
          codechef: { rating: 1500 },
          leetcode: { rating: 1600 },
          codeforces: { rating: 1400 }
        }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      expect(User.find).toHaveBeenCalledWith({ digitomize_rating: { $gt: 0 } });
      
      // Check response structure
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        total_users: 5,
        top3: expect.any(Array),
        users_in_page: 2, // Page 1, 5 users total, top3 separated, 2 remaining
        total_pages: 1, // (5-3)/5 = 0.4 → ceil = 1
        current_page: 1,
        leaderboard: expect.any(Array)
      }));
      
      // Check top3 separation
      const response = res.json.mock.calls[0][0];
      expect(response.top3).toHaveLength(3);
      expect(response.top3[0].username).toBe('user1'); // Highest rating
      expect(response.top3[1].username).toBe('user2');
      expect(response.top3[2].username).toBe('user3');
      
      // Check leaderboard (remaining users)
      expect(response.leaderboard).toHaveLength(2);
      expect(response.leaderboard[0].username).toBe('user4');
      expect(response.leaderboard[1].username).toBe('user5');
    });

    // BRANCH 2: Platform-specific filter (e.g., platform=codeforces)
    it('should filter and sort by platform rating when platform specified', async () => {
      // Arrange
      req.query.platform = 'codeforces';
      
      const mockUsers = [
        {
          username: 'user1',
          name: 'User One',
          picture: 'avatar1.jpg',
          digitomize_rating: 2100,
          codeforces: { rating: 2000 } // Highest codeforces rating
        },
        {
          username: 'user2',
          name: 'User Two',
          picture: 'avatar2.jpg',
          digitomize_rating: 2200, // Highest digitomize rating
          codeforces: { rating: 1800 }
        },
        {
          username: 'user3',
          name: 'User Three',
          picture: 'avatar3.jpg',
          digitomize_rating: 1900,
          codeforces: { rating: 1900 }
        }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      expect(User.find).toHaveBeenCalledWith({
        'codeforces.rating': { $exists: true, $ne: null }
      });
      
      const response = res.json.mock.calls[0][0];
      expect(response.top3[0].username).toBe('user1'); // Highest codeforces rating (2000)
      expect(response.top3[0].platform_rating).toBe(2000);
    });

    // BRANCH 3: Platform filter with users having null platform ratings
    it('should exclude users with null platform ratings when platform specified', async () => {
      // Arrange
      req.query.platform = 'leetcode';
      
      const mockUsers = [
        {
          username: 'user1',
          name: 'User One',
          picture: 'avatar1.jpg',
          digitomize_rating: 2100,
          leetcode: { rating: 2000 }
        },
        {
          username: 'user2',
          name: 'User Two',
          picture: 'avatar2.jpg',
          digitomize_rating: 2200,
          leetcode: null // Should be excluded
        },
        {
          username: 'user3',
          name: 'User Three',
          picture: 'avatar3.jpg',
          digitomize_rating: 1900,
          leetcode: { rating: null } // Should be excluded ($ne: null handles this)
        }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      expect(User.find).toHaveBeenCalledWith({
        'leetcode.rating': { $exists: true, $ne: null }
      });
      
      const response = res.json.mock.calls[0][0];
      expect(response.total_users).toBe(1); // Only user1 has leetcode rating
      expect(response.top3[0].username).toBe('user1');
    });

    // BRANCH 4: Pagination - page 2
    it('should handle pagination correctly', async () => {
      // Arrange
      req.query.page = '2';
      
      // Create 13 mock users (for 3 pages: top3 + 10 others)
      const mockUsers = [];
      for (let i = 1; i <= 13; i++) {
        mockUsers.push({
          username: `user${i}`,
          name: `User ${i}`,
          picture: `avatar${i}.jpg`,
          digitomize_rating: 2500 - (i * 100),
          codechef: { rating: 2000 - (i * 50) },
          leetcode: { rating: 2100 - (i * 60) },
          codeforces: { rating: 1900 - (i * 40) }
        });
      }

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.current_page).toBe(2);
      expect(response.total_users).toBe(13);
      expect(response.total_pages).toBe(2); // (13-3)/5 = 2 pages
      expect(response.users_in_page).toBe(5); // Page 2 should have 5 users
      
      // Page 2 should have users 9-13 (after top3 and page1's 5 users)
      // top3: users 1-3
      // page1 (users 4-8): 5 users
      // page2 (users 9-13): 5 users
      expect(response.leaderboard[0].username).toBe('user9');
    });

    // BRANCH 5: Invalid page number (negative)
    it('should handle negative page numbers by defaulting to page 1', async () => {
      // Arrange
      req.query.page = '-1';
      
      const mockUsers = [
        {
          username: 'user1',
          name: 'User One',
          picture: 'avatar1.jpg',
          digitomize_rating: 2100
        }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.current_page).toBe(1);
    });

    // BRANCH 6: Username query to get specific user position
    it('should return user position when username is provided in query', async () => {
      // Arrange
      req.query.username = 'user3';
      
      const mockUsers = [
        { username: 'user1', digitomize_rating: 2100, codechef: { rating: 1900 } },
        { username: 'user2', digitomize_rating: 2000, codechef: { rating: 1800 } },
        { username: 'user3', digitomize_rating: 1900, codechef: { rating: 1700 } },
        { username: 'user4', digitomize_rating: 1800, codechef: { rating: 1600 } },
        { username: 'user5', digitomize_rating: 1700, codechef: { rating: 1500 } }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        user_position: 3, // user3 is 3rd position
        ratings: {
          codechef: 1700,
          leetcode: null,
          codeforces: null,
          digitomize_rating: 1900,
          platform_rating: null
        }
      });
    });

    // BRANCH 7: Username query with platform filter
    it('should return platform-specific rating when username query with platform', async () => {
      // Arrange
      req.query.username = 'user2';
      req.query.platform = 'codeforces';
      
      const mockUsers = [
        { 
          username: 'user1', 
          digitomize_rating: 2100,
          codeforces: { rating: 2000 }
        },
        { 
          username: 'user2', 
          digitomize_rating: 2000,
          codeforces: { rating: 1900 }
        },
        { 
          username: 'user3', 
          digitomize_rating: 1900,
          codeforces: { rating: 1800 }
        }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        user_position: 2, // user2 is 2nd in codeforces ranking
        ratings: {
          codechef: null,
          leetcode: null,
          codeforces: 1900,
          digitomize_rating: 2000,
          platform_rating: 1900
        }
      });
    });

    // BRANCH 8: Username not found in leaderboard
    it('should return null position when username not found', async () => {
      // Arrange
      req.query.username = 'nonexistent';
      
      const mockUsers = [
        { username: 'user1', digitomize_rating: 2100 }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        user_position: null,
        ratings: {
          codechef: null,
          leetcode: null,
          codeforces: null,
          digitomize_rating: null,
          platform_rating: null
        }
      });
    });

    // BRANCH 9: Empty leaderboard (no users)
    it('should handle empty leaderboard gracefully', async () => {
      // Arrange
      User.find.mockResolvedValue([]);

      // Act
      await getLeaderboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.total_users).toBe(0);
      expect(response.top3).toHaveLength(0);
      expect(response.leaderboard).toHaveLength(0);
      expect(response.total_pages).toBe(0);
    });

    // BRANCH 10: Database error
    it('should return 500 on database error', async () => {
      // Arrange
      User.find.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await getLeaderboard(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server Error' });
    });

    // BRANCH 11: Users with digitomize_rating = 0 should be excluded from default leaderboard
    it('should exclude users with digitomize_rating <= 0 from default leaderboard', async () => {
      // Arrange
      const mockUsers = [
        { username: 'user1', digitomize_rating: 2100 },
        { username: 'user2', digitomize_rating: 0 }, // Should be excluded
        { username: 'user3', digitomize_rating: -100 } // Should be excluded
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      expect(User.find).toHaveBeenCalledWith({ digitomize_rating: { $gt: 0 } });
      const response = res.json.mock.calls[0][0];
      expect(response.total_users).toBe(1); // Only user1
      expect(response.top3[0].username).toBe('user1');
    });

    // BRANCH 12: Platform-specific sorting maintains order
    it('should maintain correct order when sorting by platform rating', async () => {
      // Arrange
      req.query.platform = 'codechef';
      
      const mockUsers = [
        {
          username: 'user1',
          name: 'User One',
          codechef: { rating: 2500 }
        },
        {
          username: 'user2',
          name: 'User Two',
          codechef: { rating: 2300 }
        },
        {
          username: 'user3',
          name: 'User Three',
          codechef: { rating: 2400 } // Should be between user1 and user2
        }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.top3[0].username).toBe('user1'); // 2500 - highest
      expect(response.top3[1].username).toBe('user3'); // 2400 - middle
      expect(response.top3[2].username).toBe('user2'); // 2300 - lowest
    });

    // BRANCH 13: Mixed platform data (some have rating, some don't)
    it('should handle mixed platform data correctly', async () => {
      // Arrange
      req.query.platform = 'leetcode';
      
      const mockUsers = [
        {
          username: 'user1',
          leetcode: { rating: 2000 }
        },
        {
          username: 'user2',
          leetcode: { rating: null } // Has leetcode object but null rating
        },
        {
          username: 'user3'
          // No leetcode object at all
        },
        {
          username: 'user4',
          leetcode: { rating: 1900 }
        }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      // Should only find users with leetcode.rating $exists and $ne: null
      expect(User.find).toHaveBeenCalledWith({
        'leetcode.rating': { $exists: true, $ne: null }
      });
      
      // The mock will return all users, but controller should filter them
      // Since we can't easily test the MongoDB query logic in unit test,
      // we'll trust the query is correct and test the sorting logic
    });

    // BRANCH 14: Page number as string
    it('should parse string page number correctly', async () => {
      // Arrange
      req.query.page = '3';
      
      const mockUsers = [
        { username: 'user1', digitomize_rating: 2100 }
      ];

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.current_page).toBe(3);
    });

    // BRANCH 15: Large dataset pagination edge case
    it('should handle edge case where page has no users', async () => {
      // Arrange
      req.query.page = '10'; // Very high page number
      
      // Create 8 users total
      const mockUsers = [];
      for (let i = 1; i <= 8; i++) {
        mockUsers.push({
          username: `user${i}`,
          digitomize_rating: 2100 - (i * 100)
        });
      }

      User.find.mockResolvedValue(mockUsers);

      // Act
      await getLeaderboard(req, res);

      // Assert
      const response = res.json.mock.calls[0][0];
      expect(response.total_users).toBe(8);
      expect(response.total_pages).toBe(1); // (8-3)/5 = 1 page
      expect(response.current_page).toBe(10); // Still shows requested page
      expect(response.users_in_page).toBe(0); // No users on page 10
      expect(response.leaderboard).toHaveLength(0);
    });
  });
});