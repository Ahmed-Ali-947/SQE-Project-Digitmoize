// tests/unit/users/controllers/platforms/codechefUpdater.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { codechef_u } from '../../../../../controllers/platforms/codechefUpdater.js';
import https from 'https';

// Mock https module
vi.mock('https', () => ({
  get: vi.fn()
}));

describe('codechefUpdater - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // BRANCH 1: Username is null/undefined
  it('should return null when username is not provided', async () => {
    // Act & Assert
    expect(await codechef_u(null)).toBeNull();
    expect(await codechef_u(undefined)).toBeNull();
    expect(await codechef_u('')).toBeNull();
  });

  // BRANCH 2: Network error
  it('should return null on network error', async () => {
    // Arrange
    const username = 'testuser';
    https.get.mockImplementation((url, callback) => {
      const req = {
        on: vi.fn((event, handler) => {
          if (event === 'error') {
            handler(new Error('Network error'));
          }
        })
      };
      return req;
    });

    // Act
    const result = await codechef_u(username);

    // Assert
    expect(result).toBeNull();
    expect(https.get).toHaveBeenCalledWith(
      `https://www.codechef.com/users/${username}`,
      expect.any(Function)
    );
  });

  // BRANCH 3: HTML response without required regex match
  it('should throw error when user info not found in HTML', async () => {
    // Arrange
    const username = 'testuser';
    const htmlResponse = '<html><body>No user data here</body></html>';
    
    https.get.mockImplementation((url, callback) => {
      const res = {
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler(htmlResponse);
          }
          if (event === 'end') {
            handler();
          }
        })
      };
      callback(res);
      return { on: vi.fn() };
    });

    // Act & Assert
    await expect(codechef_u(username)).rejects.toThrow('User info not found on the page');
  });

  // BRANCH 4: User has no contest data
  it('should throw error when user has no contest data', async () => {
    // Arrange
    const username = 'inactiveuser';
    const jsonData = {
      date_versus_rating: {
        all: [] // Empty array
      }
    };
    const htmlResponse = `jQuery.extend(Drupal.settings, ${JSON.stringify(jsonData)});`;
    
    https.get.mockImplementation((url, callback) => {
      const res = {
        on: vi.fn((event, handler) => {
          if (event === 'data') {
            handler(htmlResponse);
          }
          if (event === 'end') {
            handler();
          }
        })
      };
      callback(res);
      return { on: vi.fn() };
    });

    // Act & Assert
    await expect(codechef_u(username)).rejects.toThrow('User has no contest data');
  });
});