// Storage abstraction – supports S3 (production) or local filesystem (development)
// The interface (storagePut / storageGet) is unchanged so callers don't need updates.

import { ENV } from "./_core/env";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs";
import path from "path";

// ─── S3 BACKEND ──────────────────────────────────────────────────────────────

let _s3: S3Client | null = null;

function getS3Client(): S3Client {
  if (!_s3) {
    _s3 = new S3Client({
      region: ENV.s3Region || "eu-west-3",
      ...(ENV.s3Endpoint ? { endpoint: ENV.s3Endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId: ENV.s3AccessKeyId,
        secretAccessKey: ENV.s3SecretAccessKey,
      },
    });
  }
  return _s3;
}

async function s3Put(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string
): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const bucket = ENV.s3Bucket;
  const body = typeof data === "string" ? Buffer.from(data) : data;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // Generate a presigned URL valid for 7 days
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 7 * 24 * 3600 }
  );

  return { key, url };
}

async function s3Get(key: string): Promise<{ key: string; url: string }> {
  const client = getS3Client();
  const url = await getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
    { expiresIn: 7 * 24 * 3600 }
  );
  return { key, url };
}

// ─── LOCAL FILESYSTEM BACKEND (development) ──────────────────────────────────

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), ".storage");

function ensureLocalDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function localPut(
  key: string,
  data: Buffer | Uint8Array | string,
  _contentType: string
): Promise<{ key: string; url: string }> {
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  ensureLocalDir(filePath);
  const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  fs.writeFileSync(filePath, body);
  // Serve via Express static route /storage/*
  const url = `/storage/${key}`;
  return { key, url };
}

async function localGet(key: string): Promise<{ key: string; url: string }> {
  return { key, url: `/storage/${key}` };
}

// ─── PUBLIC API (unchanged interface) ────────────────────────────────────────

function useS3(): boolean {
  return Boolean(ENV.s3Bucket && ENV.s3AccessKeyId && ENV.s3SecretAccessKey);
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  if (useS3()) {
    return s3Put(key, data, contentType);
  }
  return localPut(key, data, contentType);
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  if (useS3()) {
    return s3Get(key);
  }
  return localGet(key);
}
