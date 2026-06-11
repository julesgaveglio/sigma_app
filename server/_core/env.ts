export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // Resend (emails)
  resendApiKey: process.env.RESEND_API_KEY ?? "",

  // S3 Storage
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3Region: process.env.S3_REGION ?? "eu-west-3",
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  s3Endpoint: process.env.S3_ENDPOINT ?? "",

  // Google Maps (direct)
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",

  // LLM (OpenAI-compatible or Anthropic)
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "https://api.openai.com/v1",
};
