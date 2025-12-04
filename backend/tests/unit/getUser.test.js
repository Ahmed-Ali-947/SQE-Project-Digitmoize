// backend/tests/unit/getUser.test.js
import mongoose from "mongoose";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getUser } from "../../users/services/getUser.js";
import User from "../../users/models/User.js";

describe("getUser unit tests", () => {
  beforeEach(async () => {
    if (global.clearTestDatabase) {
      await global.clearTestDatabase();
    } else {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        // eslint-disable-next-line no-await-in-loop
        await collections[key].deleteMany({});
      }
    }
  });

  afterAll(async () => {
    try {
      await mongoose.disconnect();
    } catch (e) {}
    if (global.__MONGO_SERVER__) {
      await global.__MONGO_SERVER__.stop();
    }
  });

  it("returns user by username", async () => {
    await User.create({
      uid: "g1",
      username: "userone",
      name: "User One",
      email: "u1@example.com",
      password: "x",
    });

    const found = await getUser("userone");
    expect(found).toBeDefined();
    expect(found.username).toBe("userone");
    expect(found.email).toBe("u1@example.com");
  });

  it("returns user by email", async () => {
    await User.create({
      uid: "g2",
      username: "usertwo",
      name: "User Two",
      email: "u2@example.com",
      password: "x",
    });

    const found = await getUser("u2@example.com");
    expect(found).toBeDefined();
    expect(found.username).toBe("usertwo");
  });

  it("returns null when user not found", async () => {
    const found = await getUser("doesnotexist");
    expect(found).toBeNull();
  });
});
