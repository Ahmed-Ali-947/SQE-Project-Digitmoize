// tests/unit/users/controllers/AdminUserController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
// FIXED IMPORT PATH
import {
  getUserList,
  updateUser,
  createUserFirebase,
  createUserDB,
  deleteUserFirebase,
  deleteUserDB
} from '../../../users/controllers/AdminUserController.js'; // CHANGED: ../../../ not ../../../../
import User from '../../../users/models/User.js'; // CHANGED
import admin from 'firebase-admin';
import { setUser } from '../../../users/services/setUser.js'; // CHANGED

// Mock all dependencies
vi.mock('../../../users/models/User.js'); // CHANGED
vi.mock('firebase-admin');
vi.mock('../../../users/services/setUser.js'); // CHANGED

describe('AdminUserController - Unit Tests', () => {
  let req, res, mockAuth;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock request object
    req = {
      body: {},
      user: null
    };
    
    // Mock response object
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      sendStatus: vi.fn() // Added for completeness
    };
    
    // Mock Firebase admin auth
    mockAuth = {
      createUser: vi.fn(),
      deleteUser: vi.fn()
    };
    
    // Mock the entire admin module properly
    admin.auth = vi.fn(() => mockAuth);
  });

  describe('getUserList', () => {
    it('should return list of users', async () => {
      const mockUsers = [
        { name: 'User1', email: 'user1@test.com', uid: 'uid1' },
        { name: 'User2', email: 'user2@test.com', uid: 'uid2' }
      ];
      
      const mockSelect = vi.fn().mockResolvedValue(mockUsers);
      const mockFind = vi.fn().mockReturnValue({ select: mockSelect });
      User.find = mockFind;

      await getUserList(req, res);

      expect(User.find).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalledWith('-_id -password -updatedAt -__v');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockUsers);
    });

    it('should handle errors', async () => {
      const mockSelect = vi.fn().mockRejectedValue(new Error('DB Error'));
      const mockFind = vi.fn().mockReturnValue({ select: mockSelect });
      User.find = mockFind;

      await getUserList(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('updateUser', () => {
    it('should update user role', async () => {
      const mockUpdateResult = { modifiedCount: 1, acknowledged: true };
      User.updateOne = vi.fn().mockResolvedValue(mockUpdateResult);

      req.body = {
        uid: 'user123',
        role: 'admin'
      };

      await updateUser(req, res);

      expect(User.updateOne).toHaveBeenCalledWith(
        { uid: 'user123' },
        {
          $set: { role: 'admin' },
          $currentDate: { lastUpdated: true }
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User Updated Successfully',
        user: mockUpdateResult
      });
    });

    it('should handle errors', async () => {
      User.updateOne = vi.fn().mockRejectedValue(new Error('Update error'));

      req.body = {
        uid: 'user123',
        role: 'admin'
      };

      await updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
    });
  });

  describe('createUserFirebase', () => {
    const mockNext = vi.fn();

    beforeEach(() => {
      mockNext.mockClear();
    });

    it('should return 400 when body is undefined', async () => {
      delete req.body;
      await createUserFirebase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      req.body = {};
      await createUserFirebase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when fields are empty strings', async () => {
      req.body = {
        email: '   ',
        name: '   ',
        password: '   '
      };

      await createUserFirebase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
    });

    it('should return 400 when email already exists', async () => {
      req.body = {
        email: 'existing@example.com',
        name: 'Test User',
        password: 'password123'
      };

      // FIXED: Based on your actual code, it expects error.errorInfo
      const firebaseError = {
        errorInfo: {
          code: 'auth/email-already-exists',
          message: 'Email already exists'
        }
      };

      mockAuth.createUser.mockRejectedValue(firebaseError);

      await createUserFirebase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email already exists'
      });
    });

    it('should return 500 on other Firebase errors', async () => {
      req.body = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const firebaseError = {
        errorInfo: {
          code: 'auth/invalid-email',
          message: 'Invalid email format'
        }
      };

      mockAuth.createUser.mockRejectedValue(firebaseError);

      await createUserFirebase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: expect.stringContaining('Invalid email')
      });
    });

    it('should proceed to next middleware on success', async () => {
      req.body = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const mockUserRecord = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        displayName: 'Test User'
      };

      mockAuth.createUser.mockResolvedValue(mockUserRecord);

      await createUserFirebase(req, res, mockNext);

      expect(mockAuth.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'password123'
      });
      expect(req.user).toEqual(mockUserRecord);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('createUserDB', () => {
    it('should create user with data from Firebase and body', async () => {
      req.user = {
        uid: 'firebase-uid-123',
        email: 'firebase@example.com',
        displayName: 'Firebase Name'
      };

      req.body = {
        username: 'bodyusername',
        name: 'Body Name'
      };

      setUser.mockResolvedValue({ uid: 'firebase-uid-123' });

      await createUserDB(req, res);

      // Check that setUser was called with the right data
      expect(setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          uid: 'firebase-uid-123',
          username: 'bodyusername',
          name: 'Body Name', // Body name should override Firebase name
          email: 'firebase@example.com'
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ 
        message: 'User created successfully' 
      });
    });

    it('should handle missing uid', async () => {
      req.user = {};
      req.body = {};

      await createUserDB(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
    });

    it('should handle existing user (status 200)', async () => {
      req.user = {
        uid: 'existing-uid',
        email: 'existing@example.com',
        displayName: 'Existing User'
      };

      const existingUserError = {
        status: 200,
        message: 'User already exists'
      };

      setUser.mockRejectedValue(existingUserError);

      await createUserDB(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User already exists.'
      });
    });
  });

  describe('deleteUserFirebase', () => {
    const mockNext = vi.fn();

    beforeEach(() => {
      mockNext.mockClear();
    });

    it('should delete user and call next', async () => {
      req.body = { uid: 'user-to-delete' };

      mockAuth.deleteUser.mockResolvedValue({});

      await deleteUserFirebase(req, res, mockNext);

      expect(mockAuth.deleteUser).toHaveBeenCalledWith('user-to-delete');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      req.body = { uid: 'nonexistent-user' };

      const firebaseError = {
        errorInfo: {
          code: 'auth/user-not-found',
          message: 'User not found'
        }
      };

      mockAuth.deleteUser.mockRejectedValue(firebaseError);

      await deleteUserFirebase(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: firebaseError,
          message: expect.stringContaining('User not found')
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('deleteUserDB', () => {
    it('should delete user from database', async () => {
      req.body = { uid: 'user-to-delete' };

      // Mock the import from response.api.js
      vi.mock('../../../core/api/response.api.js', () => ({
        error: vi.fn(),
        success: vi.fn()
      }));

      await deleteUserDB(req, res);

      expect(User.deleteOne).toHaveBeenCalledWith({ uid: 'user-to-delete' });
    });

    it('should handle missing uid', async () => {
      req.body = {};

      await deleteUserDB(req, res);

      // The function should handle missing uid
      expect(User.deleteOne).not.toHaveBeenCalled();
    });
  });
});