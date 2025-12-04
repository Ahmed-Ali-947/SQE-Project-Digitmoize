// tests/unit/users/__helpers__/controllerTestHelpers.js
import { vi } from 'vitest';

/**
 * Creates a mock Express request object for Users module
 */
export const createMockRequest = (overrides = {}) => {
  const defaults = {
    decodedToken: {
      uid: 'test-uid-123',
      email: 'test@example.com',
      name: 'Test User'
    },
    params: {},
    query: {},
    body: {},
    headers: {},
    user: null
  };
  
  return { ...defaults, ...overrides };
};

/**
 * Creates a mock Express response object
 */
export const createMockResponse = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  res.redirect = vi.fn().mockReturnValue(res);
  res.set = vi.fn().mockReturnValue(res);
  res.end = vi.fn().mockReturnValue(res);
  return res;
};

/**
 * Creates a mock User object for testing
 */
export const createMockUser = (overrides = {}) => {
  const defaults = {
    uid: 'test-uid-123',
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    picture: 'avatar.jpg',
    resume: null,
    email_verified: true,
    email_show: true,
    bio: {
      data: 'Software Developer',
      showOnWebsite: true
    },
    phoneNumber: {
      data: '1234567890',
      showOnWebsite: false
    },
    dateOfBirth: {
      data: '1990-01-01',
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
      fetchTime: Date.now() - (13 * 60 * 60 * 1000), // 13 hours old
      showOnWebsite: true
    },
    codechef: {
      username: 'cc_test',
      rating: 1800,
      attendedContestsCount: 15,
      badge: '4 star',
      fetchTime: Date.now() - (10 * 60 * 60 * 1000), // 10 hours old
      showOnWebsite: true
    },
    leetcode: {
      username: 'lc_test',
      rating: 2000,
      attendedContestsCount: 20,
      badge: 'Knight',
      fetchTime: Date.now() - (14 * 60 * 60 * 1000), // 14 hours old
      showOnWebsite: false
    },
    digitomize_rating: 1700,
    skills: ['JavaScript', 'React', 'Node.js'],
    education: [],
    preferences: {
      contest_notifs: {
        codeforces: false,
        codechef: false,
        leetcode: false
      }
    },
    updatesToday: [],
    role: 'user',
    save: vi.fn().mockResolvedValue(true),
    updateCount: vi.fn()
  };
  
  return { ...defaults, ...overrides };
};

/**
 * Creates a mock user for leaderboard testing
 */
export const createMockLeaderboardUser = (index = 0, overrides = {}) => {
  const baseUser = createMockUser({
    username: `user${index}`,
    name: `User ${index}`,
    digitomize_rating: 2000 - (index * 100),
    codeforces: {
      username: `cf_user${index}`,
      rating: 1500 + (index * 50),
      showOnWebsite: true
    },
    codechef: {
      username: `cc_user${index}`,
      rating: 1800 + (index * 30),
      showOnWebsite: true
    },
    leetcode: {
      username: `lc_user${index}`,
      rating: 1900 + (index * 40),
      showOnWebsite: true
    },
    ...overrides
  });
  
  return baseUser;
};