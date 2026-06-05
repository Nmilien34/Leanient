# Leanient API Key Checklist

Use this list when you are ready to create production credentials.

## Already Needed for Auth

- `GOOGLE_CLIENT_ID`: Google Cloud Console OAuth 2.0 web client ID.
- `APPLE_CLIENT_ID`: Apple Developer Service ID or bundle ID used as the Apple token audience.
- `APPLE_TEAM_ID`: Apple Developer team ID.
- `APPLE_KEY_ID`: Sign in with Apple private key ID.
- `APPLE_PRIVATE_KEY` or `APPLE_PRIVATE_KEY_BASE64`: Sign in with Apple private key.

## Needed for Progress Photos

- `AWS_REGION`: AWS region for the private S3 bucket.
- `AWS_S3_BUCKET_NAME`: Private bucket for Leanient progress photos.
- `AWS_ACCESS_KEY_ID`: IAM access key with least-privilege object permissions for that bucket.
- `AWS_SECRET_ACCESS_KEY`: Matching IAM secret.

The app stores only metadata in MongoDB. Raw photos live in S3 behind signed URLs.

## Needed for RevenueCat

- `REVENUECAT_WEBHOOK_SECRET`: Bearer token configured in the RevenueCat webhook dashboard.
- Frontend RevenueCat public SDK key: add when paywall work starts.

## Needed Later for AI

- `OPENAI_API_KEY`: Add only when the deterministic coach service gets an AI adapter.
