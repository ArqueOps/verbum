import { test as teardown } from "@playwright/test";
import { cleanupTestData } from "./helpers";

teardown("cleanup test data", async () => {
  await cleanupTestData();
});
