process.env.NODE_ENV = "test";
process.env.PORT = "8080";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/leanient_test";
process.env.JWT_SECRET = "test_secret_that_is_at_least_32_characters";
process.env.JWT_EXPIRES_IN = "30d";
process.env.GOOGLE_CLIENT_ID = "google-test-client-id.apps.googleusercontent.com";
process.env.APPLE_CLIENT_ID = "com.boltzman.leanient.test";
process.env.APPLE_TEAM_ID = "TEAMID1234";
process.env.APPLE_KEY_ID = "APPLEKEY123";
process.env.APPLE_PRIVATE_KEY = [
  "-----BEGIN PRIVATE KEY-----",
  "MHcCAQEEIE8yNzU1ZDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw",
  "-----END PRIVATE KEY-----",
].join("\\n");
process.env.FRONTEND_ORIGIN = "http://localhost:8081";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_S3_BUCKET_NAME = "leanient-test-photos";
process.env.AWS_ACCESS_KEY_ID = "test-access-key";
process.env.AWS_SECRET_ACCESS_KEY = "test-secret-key";
process.env.OPENAI_API_KEY = "test-openai-api-key";
process.env.REVENUECAT_WEBHOOK_SECRET = "test-revenuecat-secret";
process.env.SCHEDULER_TIMEZONE = "America/New_York";
process.env.WEEKLY_VERDICT_CRON = "0 8 * * 1";
