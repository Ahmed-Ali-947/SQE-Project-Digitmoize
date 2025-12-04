// backend/tests/integration/setUser.test.js
import mongoose from "mongoose";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// Mock external side-effects used by setUser
vi.mock("../../services/email/createAccount.js", () => {
  return {
    sendEmail: vi.fn().mockResolvedValue(true),
  };
});
vi.mock("../../services/discord-webhook/createAccount.js", () => {
  return {
    sendWebhook_createAccount: vi.fn().mockResolvedValue(true),
  };
});

import { setUser } from "../../users/services/setUser.js";
import User from "../../users/models/User.js";

describe("setUser integration tests", () => {
  beforeEach(async () => {
    // clear db between tests
    if (global.clearTestDatabase) {
      await global.clearTestDatabase();
    } else {
      // fallback: clear collections
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        // eslint-disable-next-line no-await-in-loop
        await collections[key].deleteMany({});
      }
    }
  });

  afterAll(async () => {
    // close mongoose connection and stop memory server
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
    if (global.__MONGO_SERVER__) {
      await global.__MONGO_SERVER__.stop();
    }
  });

  it("creates a new user and returns correct structure", async () => {
    const userPayload = {
      uid: "uid-123",
      username: "testuser",
      name: "Test User",
      email: "test@example.com",
      password: "Password123!", // setUser will hash if model or service does hashing
      // include other minimal required fields if setUser enforces them
    };

    const created = await setUser(userPayload);

    // assert created is an object (setUser returns the saved doc or something)
    // In your setUser implementation, on success it returns the saved user doc (we check common fields).
    // If your setUser returns something else, adapt these assertions.
    expect(created).toBeDefined();
    expect(created).toHaveProperty("uid", userPayload.uid);
    expect(created).toHaveProperty("username", userPayload.username);
    expect(created).toHaveProperty("email", userPayload.email);

    // verify user exists in DB via model
    const dbUser = await User.findOne({ uid: userPayload.uid }).lean();
    expect(dbUser).not.toBeNull();
    expect(dbUser.username).toBe(userPayload.username);
    expect(dbUser.email).toBe(userPayload.email);

    // password should NOT be stored as plain text (if your service hashes)
    if (dbUser.password) {
      expect(dbUser.password).not.toBe(userPayload.password);
    }
  });

  it("throws custom error or status when duplicate user exists", async () => {
    const userPayload = {
      uid: "dupe-uid",
      username: "dupeuser",
      name: "Dupe User",
      email: "dupe@example.com",
      password: "Password123!",
    };

    // Create first user
    await setUser(userPayload);

    // Attempt to create duplicate (same email or username depending on unique indexes)
    let thrown;
    try {
      await setUser(userPayload);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeDefined();
    // In your setUser implementation, duplicate error sets err.status = 200 and throws an Error with message.
    // We can assert that behavior if present:
    if (thrown && thrown.status) {
      expect(thrown.status === 200 || thrown.status === 400).toBeTruthy();
    } else {
      // generic fallback: at least an Error was thrown
      expect(thrown).toBeInstanceOf(Error);
    }
  });
});
