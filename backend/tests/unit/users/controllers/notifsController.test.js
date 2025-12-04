// tests/unit/users/controllers/notifsController.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  addSubscriber,
  deleteSubscriber,
  createTopic,
  addSubscriberToTopic,
  removeSubscriberFromTopic,
  TriggerContestNotifToTopic,
  updateDeviceID,
  getAllTopics
} from '../../../../users/controllers/notifsController.js';
import { Novu, ChatProviderIdEnum } from '@novu/node';
import User from '../../../../users/models/User.js';
import { AllContest } from '../../../../contest/models/Contest.js';
import fetch from 'node-fetch';

// Mock all dependencies
vi.mock('@novu/node');
vi.mock('../../../../users/models/User.js');
vi.mock('../../../../contest/models/Contest.js');
vi.mock('node-fetch', () => ({
  default: vi.fn()
}));

describe('notifsController - Unit Tests', () => {
  let req, res, mockNovuInstance, mockUser;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock request object
    req = {
      decodedToken: {
        uid: 'firebase-uid-123',
        name: 'Test User',
        email: 'test@example.com'
      },
      body: {}
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    
    // Mock Novu instance
    mockNovuInstance = {
      subscribers: {
        identify: vi.fn().mockResolvedValue({}),
        delete: vi.fn().mockResolvedValue({}),
        setCredentials: vi.fn().mockResolvedValue({})
      },
      topics: {
        create: vi.fn().mockResolvedValue({}),
        get: vi.fn().mockResolvedValue({ data: { key: 'test-topic' } }),
        addSubscribers: vi.fn().mockResolvedValue({}),
        removeSubscribers: vi.fn().mockResolvedValue({})
      },
      trigger: vi.fn().mockResolvedValue({})
    };
    
    Novu.mockImplementation(() => mockNovuInstance);
    
    // Mock user
    mockUser = {
      uid: 'firebase-uid-123',
      name: 'Test User',
      email: 'test@example.com'
    };
    
    User.findOne.mockResolvedValue(mockUser);
    
    // Set environment variable
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test';
    process.env.NOVU_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('addSubscriber', () => {
    // BRANCH 1: Successful subscriber addition
    it('should add subscriber successfully', async () => {
      // Act
      await addSubscriber(req, res);

      // Assert
      expect(mockNovuInstance.subscribers.identify).toHaveBeenCalledWith(
        'firebase-uid-123',
        {
          email: 'test@example.com',
          firstName: 'Test User'
        }
      );
      
      expect(mockNovuInstance.subscribers.setCredentials).toHaveBeenCalledWith(
        'firebase-uid-123',
        ChatProviderIdEnum.Discord,
        {
          webhookUrl: 'https://discord.com/api/webhooks/test'
        }
      );
      
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber added successfully'
      });
    });

    // BRANCH 2: Novu API error
    it('should handle Novu API error', async () => {
      // Arrange
      mockNovuInstance.subscribers.identify.mockRejectedValue(
        new Error('Novu API error')
      );

      // Act
      await addSubscriber(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Novu API error'
      });
    });

    // BRANCH 3: Missing environment variable
    it('should handle missing DISCORD_WEBHOOK_URL', async () => {
      // Arrange
      delete process.env.DISCORD_WEBHOOK_URL;

      // Act
      await addSubscriber(req, res);

      // Assert
      expect(mockNovuInstance.subscribers.setCredentials).toHaveBeenCalledWith(
        'firebase-uid-123',
        ChatProviderIdEnum.Discord,
        {
          webhookUrl: undefined
        }
      );
    });
  });

  describe('deleteSubscriber', () => {
    // BRANCH 1: Successful subscriber deletion
    it('should delete subscriber successfully', async () => {
      // Act
      await deleteSubscriber(req, res);

      // Assert
      expect(mockNovuInstance.subscribers.delete).toHaveBeenCalledWith(
        'firebase-uid-123'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber deleted successfully'
      });
    });

    // BRANCH 2: Novu API error on deletion
    it('should handle Novu deletion error', async () => {
      // Arrange
      mockNovuInstance.subscribers.delete.mockRejectedValue(
        new Error('Delete failed')
      );

      // Act
      await deleteSubscriber(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Delete failed'
      });
    });
  });

  describe('createTopic', () => {
    // BRANCH 1: Successful topic creation
    it('should create topic successfully', async () => {
      // Arrange
      req.body = {
        key: 'codeforces-notifs',
        name: 'Codeforces Notifications'
      };

      // Act
      await createTopic(req, res);

      // Assert
      expect(mockNovuInstance.topics.create).toHaveBeenCalledWith({
        key: 'codeforces-notifs',
        name: 'Codeforces Notifications'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic created successfully'
      });
    });

    // BRANCH 2: Missing key or name in request body
    it('should handle missing required fields', async () => {
      // Arrange
      req.body = {
        key: 'codeforces-notifs'
        // Missing name
      };

      // Act
      await createTopic(req, res);

      // Assert
      // Novu will handle validation, we just pass what we get
      expect(mockNovuInstance.topics.create).toHaveBeenCalledWith({
        key: 'codeforces-notifs',
        name: undefined
      });
    });

    // BRANCH 3: Novu API error on topic creation
    it('should handle topic creation error', async () => {
      // Arrange
      req.body = { key: 'test', name: 'Test' };
      mockNovuInstance.topics.create.mockRejectedValue(
        new Error('Topic creation failed')
      );

      // Act
      await createTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Topic creation failed'
      });
    });
  });

  describe('addSubscriberToTopic', () => {
    // BRANCH 1: Successful subscriber addition to topic
    it('should add subscriber to topic successfully', async () => {
      // Arrange
      req.body = {
        topicKey: 'codeforces-notifs'
      };

      // Act
      await addSubscriberToTopic(req, res);

      // Assert
      expect(mockNovuInstance.topics.get).toHaveBeenCalledWith('codeforces-notifs');
      expect(mockNovuInstance.topics.addSubscribers).toHaveBeenCalledWith(
        'codeforces-notifs',
        {
          subscribers: ['firebase-uid-123']
        }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber added to topic successfully'
      });
    });

    // BRANCH 2: Topic not found
    it('should return 404 when topic does not exist', async () => {
      // Arrange
      req.body = { topicKey: 'nonexistent-topic' };
      mockNovuInstance.topics.get.mockResolvedValue(null);

      // Act
      await addSubscriberToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic not found'
      });
      expect(mockNovuInstance.topics.addSubscribers).not.toHaveBeenCalled();
    });

    // BRANCH 3: Missing topicKey in request body
    it('should handle missing topicKey', async () => {
      // Arrange
      req.body = {};

      // Act
      await addSubscriberToTopic(req, res);

      // Assert
      // Will try to get undefined topic key
      expect(mockNovuInstance.topics.get).toHaveBeenCalledWith(undefined);
    });

    // BRANCH 4: Novu API error
    it('should handle Novu API error', async () => {
      // Arrange
      req.body = { topicKey: 'test-topic' };
      mockNovuInstance.topics.addSubscribers.mockRejectedValue(
        new Error('API error')
      );

      // Act
      await addSubscriberToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'API error'
      });
    });
  });

  describe('removeSubscriberFromTopic', () => {
    // BRANCH 1: Successful removal from topic
    it('should remove subscriber from topic successfully', async () => {
      // Arrange
      req.body = {
        topicKey: 'codeforces-notifs'
      };

      // Act
      await removeSubscriberFromTopic(req, res);

      // Assert
      expect(mockNovuInstance.topics.get).toHaveBeenCalledWith('codeforces-notifs');
      expect(mockNovuInstance.topics.removeSubscribers).toHaveBeenCalledWith(
        'codeforces-notifs',
        {
          subscribers: ['firebase-uid-123']
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Subscriber removed from topic successfully'
      });
    });

    // BRANCH 2: Topic not found
    it('should return 404 when topic does not exist', async () => {
      // Arrange
      req.body = { topicKey: 'nonexistent-topic' };
      mockNovuInstance.topics.get.mockResolvedValue(null);

      // Act
      await removeSubscriberFromTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic not found'
      });
    });

    // BRANCH 3: Novu API error
    it('should handle Novu API error', async () => {
      // Arrange
      req.body = { topicKey: 'test-topic' };
      mockNovuInstance.topics.removeSubscribers.mockRejectedValue(
        new Error('Removal failed')
      );

      // Act
      await removeSubscriberFromTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Removal failed'
      });
    });
  });

  describe('TriggerContestNotifToTopic', () => {
    // BRANCH 1: Successful notification trigger
    it('should trigger contest notification successfully', async () => {
      // Arrange
      req.body = {
        topicKey: 'codeforces-notifs',
        contestVanity: 'codeforces-round-100'
      };

      const mockContest = {
        name: 'Codeforces Round 100',
        host: 'codeforces.com',
        vanity: 'codeforces-round-100',
        duration: 120, // 2 hours
        startTimeUnix: 1672531200, // Jan 1, 2023
        url: 'https://codeforces.com/contest/100'
      };

      AllContest.findOne.mockResolvedValue(mockContest);

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(AllContest.findOne).toHaveBeenCalledWith({
        vanity: 'codeforces-round-100'
      });
      expect(mockNovuInstance.topics.get).toHaveBeenCalledWith('codeforces-notifs');
      expect(mockNovuInstance.trigger).toHaveBeenCalledWith('contest-alert', {
        to: [{ type: 'Topic', topicKey: 'codeforces-notifs' }],
        payload: {
          contest: {
            name: 'Codeforces Round 100',
            host: 'codeforces.com',
            vanity: 'codeforces-round-100',
            time: expect.any(String), // Formatted IST time
            duration: '2 hours 0 minutes',
            url: 'https://codeforces.com/contest/100'
          }
        }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Notification triggered successfully'
      });
    });

    // BRANCH 2: Topic not found
    it('should return 404 when topic does not exist', async () => {
      // Arrange
      req.body = {
        topicKey: 'nonexistent-topic',
        contestVanity: 'test-contest'
      };
      mockNovuInstance.topics.get.mockResolvedValue(null);

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic not found'
      });
      expect(mockNovuInstance.trigger).not.toHaveBeenCalled();
    });

    // BRANCH 3: Contest not found
    it('should return 404 when contest does not exist', async () => {
      // Arrange
      req.body = {
        topicKey: 'codeforces-notifs',
        contestVanity: 'nonexistent-contest'
      };
      AllContest.findOne.mockResolvedValue(null);

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Contest not found'
      });
      expect(mockNovuInstance.trigger).not.toHaveBeenCalled();
    });

    // BRANCH 4: Duration conversion edge cases
    it('should handle different duration formats correctly', async () => {
      // Arrange
      req.body = {
        topicKey: 'test-topic',
        contestVanity: 'test-contest'
      };

      const mockContest = {
        name: 'Test Contest',
        host: 'test.com',
        vanity: 'test-contest',
        duration: 61, // 1 hour 1 minute
        startTimeUnix: 1672531200,
        url: 'https://test.com/contest/1'
      };

      AllContest.findOne.mockResolvedValue(mockContest);

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(mockNovuInstance.trigger).toHaveBeenCalledWith(
        'contest-alert',
        expect.objectContaining({
          payload: expect.objectContaining({
            contest: expect.objectContaining({
              duration: '1 hours 1 minutes'
            })
          })
        })
      );
    });

    // BRANCH 5: Novu API error
    it('should handle Novu trigger error', async () => {
      // Arrange
      req.body = {
        topicKey: 'test-topic',
        contestVanity: 'test-contest'
      };

      const mockContest = {
        name: 'Test Contest',
        host: 'test.com',
        vanity: 'test-contest',
        duration: 120,
        startTimeUnix: 1672531200,
        url: 'https://test.com/contest/1'
      };

      AllContest.findOne.mockResolvedValue(mockContest);
      mockNovuInstance.trigger.mockRejectedValue(new Error('Trigger failed'));

      // Act
      await TriggerContestNotifToTopic(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Trigger failed'
      });
    });
  });

  describe('updateDeviceID', () => {
    // BRANCH 1: Successful device ID update
    it('should update device ID successfully', async () => {
      // Arrange
      req.body = {
        deviceID: 'fcm-device-token-123'
      };

      // Act
      await updateDeviceID(req, res);

      // Assert
      expect(User.findOne).toHaveBeenCalledWith({ uid: 'firebase-uid-123' });
      expect(mockNovuInstance.subscribers.identify).toHaveBeenCalledWith(
        'firebase-uid-123',
        {
          email: 'test@example.com',
          firstName: 'Test User'
        }
      );
      expect(mockNovuInstance.subscribers.setCredentials).toHaveBeenCalledWith(
        'firebase-uid-123',
        ChatProviderIdEnum.Discord,
        {
          webhookUrl: 'https://discord.com/api/webhooks/test'
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(req.body);
    });

    // BRANCH 2: User not found
    it('should handle user not found', async () => {
      // Arrange
      req.body = { deviceID: 'test-token' };
      User.findOne.mockResolvedValue(null);

      // Act
      await updateDeviceID(req, res);

      // Assert
      // The function will try to access user.email which will throw
      // Let's see what happens
      expect(res.status).toHaveBeenCalledWith(500);
    });

    // BRANCH 3: Novu API error
    it('should handle Novu API error', async () => {
      // Arrange
      req.body = { deviceID: 'test-token' };
      mockNovuInstance.subscribers.identify.mockRejectedValue(
        new Error('Novu error')
      );

      // Act
      await updateDeviceID(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Novu error'
      });
    });

    // BRANCH 4: Missing deviceID in request body
    it('should handle missing deviceID', async () => {
      // Arrange
      req.body = {};

      // Act
      await updateDeviceID(req, res);

      // Assert
      // Still tries to set credentials with undefined deviceID
      expect(mockNovuInstance.subscribers.setCredentials).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({});
    });
  });

  describe('getAllTopics', () => {
    // BRANCH 1: Successful fetch of topics
    it('should fetch all topics successfully', async () => {
      // Arrange
      const mockTopics = {
        data: [
          { key: 'codeforces-notifs', name: 'Codeforces Notifications' },
          { key: 'leetcode-notifs', name: 'LeetCode Notifications' }
        ]
      };

      fetch.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockTopics)
      });

      // Act
      await getAllTopics(req, res);

      // Assert
      expect(fetch).toHaveBeenCalledWith('https://api.novu.co/v1/topics', {
        headers: {
          Authorization: 'ApiKey test-api-key'
        }
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockTopics);
    });

    // BRANCH 2: Fetch API error
    it('should handle fetch API error', async () => {
      // Arrange
      fetch.mockRejectedValue(new Error('Network error'));

      // Act
      await getAllTopics(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Internal server error',
        error: 'Network error'
      });
    });

    // BRANCH 3: Missing NOVU_API_KEY
    it('should handle missing API key', async () => {
      // Arrange
      delete process.env.NOVU_API_KEY;

      // Act
      await getAllTopics(req, res);

      // Assert
      expect(fetch).toHaveBeenCalledWith('https://api.novu.co/v1/topics', {
        headers: {
          Authorization: 'ApiKey undefined'
        }
      });
    });
  });
});