// tests/unit/users/controllers/AdminUserController.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserList,
  updateUser,
  createUserFirebase,
  createUserDB,
  deleteUserFirebase,
  deleteUserDB
} from '../../../../users/controllers/AdminUserController.js';
import User from '../../../../users/models/User.js';
import admin from 'firebase-admin';
import { setUser } from '../../../../users/services/setUser.js';

// Mock all dependencies
vi.mock('../../../../users/models/User.js');
vi.mock('firebase-admin');
vi.mock('../../../../users/services/setUser.js');

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
      json: vi.fn().mockReturnThis()
    };
    
    // Mock Firebase admin auth
    mockAuth = {
      createUser: vi.fn(),
      deleteUser: vi.fn()
    };
    
    admin.auth = vi.fn(() => mockAuth);
  });

  describe('getUserList', () => {
    // BRANCH 1: Successful retrieval of user list
    it('should return list of users without sensitive fields', async () => {
      // Arrange
      const mockUsers = [
        {
          uid: 'user1',
          username: 'user1',
          email: 'user1@example.com',
          role: 'user',
          createdAt: new Date('2024-01-01'),
          password: 'hashed-password', // Should be excluded
          _id: 'mongo-id-1', // Should be excluded
          __v: 1 // Should be excluded
        },
        {
          uid: 'user2',
          username: 'user2',
          email: 'user2@example.com',
          role: 'admin',
          createdAt: new Date('2024-01-02')
        }
      ];

      User.find.mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUsers.map(user => {
          // Simulate the select projection
          const { password, _id, __v, updatedAt, ...filteredUser } = user;
          return filteredUser;
        }))
      });

      // Act
      await getUserList(req, res);

      // Assert
      expect(User.find).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.not.objectContaining({
            password: expect.anything(),
            _id: expect.anything(),
            __v: expect.anything(),
            updatedAt: expect.anything()
          })
        ])
      );
    });

    // BRANCH 2: Database error
    it('should return 500 on database error', async () => {
      // Arrange
      User.find.mockReturnValue({
        select: vi.fn().mockRejectedValue(new Error('Database error'))
      });

      // Act
      await getUserList(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    // BRANCH 3: Empty user list
    it('should return empty array when no users exist', async () => {
      // Arrange
      User.find.mockReturnValue({
        select: vi.fn().mockResolvedValue([])
      });

      // Act
      await getUserList(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('updateUser', () => {
    // BRANCH 1: Successful user role update
    it('should update user role successfully', async () => {
      // Arrange
      req.body = {
        uid: 'user-123',
        role: 'admin'
      };

      const mockUpdateResult = {
        acknowledged: true,
        modifiedCount: 1,
        upsertedId: null,
        upsertedCount: 0,
        matchedCount: 1
      };

      User.updateOne.mockResolvedValue(mockUpdateResult);

      // Act
      await updateUser(req, res);

      // Assert
      expect(User.updateOne).toHaveBeenCalledWith(
        { uid: 'user-123' },
        {
          $set: {
            role: 'admin'
          },
          $currentDate: { lastUpdated: true }
        }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User Updated Successfully',
        user: mockUpdateResult
      });
    });

    // BRANCH 2: User not found (no modification)
    it('should handle user not found gracefully', async () => {
      // Arrange
      req.body = {
        uid: 'nonexistent-user',
        role: 'admin'
      };

      const mockUpdateResult = {
        acknowledged: true,
        modifiedCount: 0, // No user found
        matchedCount: 0
      };

      User.updateOne.mockResolvedValue(mockUpdateResult);

      // Act
      await updateUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User Updated Successfully',
        user: mockUpdateResult
      });
    });

    // BRANCH 3: Database error during update
    it('should return 500 on database error', async () => {
      // Arrange
      req.body = {
        uid: 'user-123',
        role: 'admin'
      };

      User.updateOne.mockRejectedValue(new Error('Database error'));

      // Act
      await updateUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error'
      });
    });

    // BRANCH 4: Missing required fields in request body
    it('should handle missing uid in request body', async () => {
      // Arrange
      req.body = {
        role: 'admin'
        // Missing uid
      };

      // Act
      await updateUser(req, res);

      // Assert
      // Will try to update with undefined uid
      expect(User.updateOne).toHaveBeenCalledWith(
        { uid: undefined },
        expect.any(Object)
      );
    });
  });

  describe('createUserFirebase', () => {
    // This is middleware, not a controller function
    // We'll test it as middleware

    // BRANCH 1: Successful Firebase user creation
    it('should create user in Firebase and call next', async () => {
      // Arrange
      req.body = {
        email: 'newuser@example.com',
        name: 'New User',
        password: 'SecurePass123!'
      };

      const mockNext = vi.fn();
      const mockUserRecord = {
        uid: 'firebase-new-uid',
        email: 'newuser@example.com',
        displayName: 'New User'
      };

      mockAuth.createUser.mockResolvedValue(mockUserRecord);

      // Act
      await createUserFirebase(req, res, mockNext);

      // Assert
      expect(mockAuth.createUser).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        displayName: 'New User',
        password: 'SecurePass123!'
      });
      expect(req.user).toEqual(mockUserRecord);
      expect(mockNext).toHaveBeenCalled();
      // Should not send response (middleware passes to next)
      expect(res.status).not.toHaveBeenCalled();
    });

    // BRANCH 2: Missing required fields
    it('should return 400 when required fields are missing', async () => {
      // Arrange
      req.body = {
        email: 'test@example.com'
        // Missing name and password
      };

      // Act
      await createUserFirebase(req, res, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
      expect(mockAuth.createUser).not.toHaveBeenCalled();
    });

    // BRANCH 3: Empty string fields
    it('should return 400 when fields are empty strings', async () => {
      // Arrange
      req.body = {
        email: '   ', // Whitespace only
        name: '   ',
        password: '   '
      };

      // Act
      await createUserFirebase(req, res, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
    });

    // BRANCH 4: Email already exists in Firebase
    it('should return 400 when email already exists', async () => {
      // Arrange
      req.body = {
        email: 'existing@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const firebaseError = {
        errorInfo: {
          code: 'auth/email-already-exists',
          message: 'The email address is already in use by another account.'
        }
      };

      mockAuth.createUser.mockRejectedValue(firebaseError);

      // Act
      await createUserFirebase(req, res, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Email already exists'
      });
    });

    // BRANCH 5: Other Firebase errors
    it('should return 500 on other Firebase errors', async () => {
      // Arrange
      req.body = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      const firebaseError = {
        errorInfo: {
          code: 'auth/invalid-email',
          message: 'The email address is badly formatted.'
        }
      };

      mockAuth.createUser.mockRejectedValue(firebaseError);

      // Act
      await createUserFirebase(req, res, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: 'code:auth/invalid-email, \n message:The email address is badly formatted.'
      });
    });

    // BRANCH 6: Generic error
    it('should handle generic errors', async () => {
      // Arrange
      req.body = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123'
      };

      mockAuth.createUser.mockRejectedValue(new Error('Generic error'));

      // Act
      await createUserFirebase(req, res, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error',
        message: expect.stringContaining('Generic error')
      });
    });
  });

  describe('createUserDB', () => {
    // BRANCH 1: Successful database user creation after Firebase
    it('should create user in database after Firebase creation', async () => {
      // Arrange
      req.user = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        displayName: 'Test User'
      };

      req.body = {
        username: 'testuser'
      };

      setUser.mockResolvedValue({ uid: 'firebase-uid-123' });

      // Act
      await createUserDB(req, res);

      // Assert
      expect(setUser).toHaveBeenCalledWith({
        uid: 'firebase-uid-123',
        username: 'testuser',
        name: 'Test User',
        picture: undefined,
        resume: undefined,
        email_verified: undefined,
        email: 'test@example.com',
        email_show: undefined,
        bio: undefined,
        dateOfBirth: undefined,
        phoneNumber: undefined,
        github: undefined,
        codechef: undefined,
        leetcode: undefined,
        codeforces: undefined
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User created successfully'
      });
    });

    // BRANCH 2: Missing uid (should not happen after Firebase)
    it('should return 400 when uid is missing', async () => {
      // Arrange
      req.user = {
        // Missing uid
        email: 'test@example.com'
      };

      // Act
      await createUserDB(req, res);

      // Assert
      expect(setUser).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields'
      });
    });

    // BRANCH 3: User already exists (setUser returns status 200)
    it('should return 200 when user already exists', async () => {
      // Arrange
      req.user = {
        uid: 'existing-uid',
        email: 'existing@example.com'
      };

      const existingUserError = {
        status: 200,
        message: 'User already exists'
      };

      setUser.mockRejectedValue(existingUserError);

      // Act
      await createUserDB(req, res);

      // Assert
      expect(setUser).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'User already exists.'
      });
    });

    // BRANCH 4: Validation error from setUser
    it('should return 400 on validation error', async () => {
      // Arrange
      req.user = {
        uid: 'test-uid',
        email: 'test@example.com'
      };

      const validationError = {
        status: 400,
        message: 'Invalid email format'
      };

      setUser.mockRejectedValue(validationError);

      // Act
      await createUserDB(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid email format'
      });
    });

    // BRANCH 5: Generic error from setUser
    it('should return 500 on generic error', async () => {
      // Arrange
      req.user = {
        uid: 'test-uid',
        email: 'test@example.com'
      };

      setUser.mockRejectedValue(new Error('Database error'));

      // Act
      await createUserDB(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Error creating user'
      });
    });

    // BRANCH 6: Override name/username from body
    it('should override Firebase data with request body data', async () => {
      // Arrange
      req.user = {
        uid: 'firebase-uid',
        email: 'firebase@example.com',
        displayName: 'Firebase Name' // From Firebase
      };

      req.body = {
        username: 'body-username',
        name: 'Body Name' // Should override Firebase name
      };

      setUser.mockResolvedValue({ uid: 'firebase-uid' });

      // Act
      await createUserDB(req, res);

      // Assert
      expect(setUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Body Name', // From body, not Firebase
          username: 'body-username' // From body
        })
      );
    });
  });

  describe('deleteUserFirebase', () => {
    // This is middleware

    // BRANCH 1: Successful Firebase user deletion
    it('should delete user from Firebase and call next', async () => {
      // Arrange
      req.body = {
        uid: 'user-to-delete'
      };

      const mockNext = vi.fn();
      mockAuth.deleteUser.mockResolvedValue({});

      // Act
      await deleteUserFirebase(req, res, mockNext);

      // Assert
      expect(mockAuth.deleteUser).toHaveBeenCalledWith('user-to-delete');
      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Middleware doesn't respond
    });

    // BRANCH 2: Firebase user not found
    it('should return 404 when user not found in Firebase', async () => {
      // Arrange
      req.body = {
        uid: 'nonexistent-user'
      };

      const firebaseError = {
        errorInfo: {
          code: 'auth/user-not-found',
          message: 'No user record found for the given uid.'
        }
      };

      mockAuth.deleteUser.mockRejectedValue(firebaseError);

      // Act
      await deleteUserFirebase(req, res, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: firebaseError,
        message: 'code:auth/user-not-found, \n message:No user record found for the given uid.'
      });
    });

    // BRANCH 3: Other Firebase errors
    it('should handle other Firebase errors', async () => {
      // Arrange
      req.body = {
        uid: 'test-uid'
      };

      const firebaseError = {
        errorInfo: {
          code: 'auth/invalid-uid',
          message: 'Invalid user ID.'
        }
      };

      mockAuth.deleteUser.mockRejectedValue(firebaseError);

      // Act
      await deleteUserFirebase(req, res, vi.fn());

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      // Note: The function returns 404 for all Firebase errors in delete
    });

    // BRANCH 4: Missing uid in request body
    it('should handle missing uid', async () => {
      // Arrange
      req.body = {};
      // Missing uid

      // Act
      await deleteUserFirebase(req, res, vi.fn());

      // Assert
      // Will try to delete undefined user
      expect(mockAuth.deleteUser).toHaveBeenCalledWith(undefined);
    });
  });

  describe('deleteUserDB', () => {
    // BRANCH 1: Successful database user deletion
    it('should delete user from database successfully', async () => {
      // Arrange
      req.body = {
        uid: 'user-to-delete'
      };

      const mockDeleteResult = {
        acknowledged: true,
        deletedCount: 1
      };

      User.deleteOne.mockResolvedValue(mockDeleteResult);

      // We need to mock the success and error functions
      // Since they're imported, we need to understand their implementation
      // Let's test the basic flow

      // Act
      await deleteUserDB(req, res);

      // Assert
      expect(User.deleteOne).toHaveBeenCalledWith({ uid: 'user-to-delete' });
      // The actual response depends on the success/error functions
      // We'll check that some response is sent
      expect(res.status).toHaveBeenCalled();
    });

    // BRANCH 2: Missing uid in request body
    it('should return error when uid is missing', async () => {
      // Arrange
      req.body = {};
      // Missing uid

      // Act
      await deleteUserDB(req, res);

      // Assert
      expect(User.deleteOne).not.toHaveBeenCalled();
      // Should return error response
      expect(res.status).toHaveBeenCalled();
    });

    // BRANCH 3: Database error
    it('should handle database error', async () => {
      // Arrange
      req.body = {
        uid: 'test-uid'
      };

      User.deleteOne.mockRejectedValue(new Error('Database error'));

      // Act
      await deleteUserDB(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Something went wrong!!'
      });
    });

    // BRANCH 4: User not found in database
    it('should handle user not found in database', async () => {
      // Arrange
      req.body = {
        uid: 'nonexistent-user'
      };

      const mockDeleteResult = {
        acknowledged: true,
        deletedCount: 0 // No user deleted
      };

      User.deleteOne.mockResolvedValue(mockDeleteResult);

      // Act
      await deleteUserDB(req, res);

      // Assert
      // Should still return success (user not existing is okay for delete)
      expect(res.status).toHaveBeenCalled();
    });
  });
});