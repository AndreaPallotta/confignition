import { S3Client, GetObjectCommand, type S3ClientConfig } from '@aws-sdk/client-s3';
import { BlobServiceClient } from '@azure/storage-blob';

// ─── AWS S3 ───────────────────────────────────────────────────────────────────

const _getConfigFromS3 = async (
  bucket: string,
  fileName: string,
  awsConfig: S3ClientConfig
): Promise<string> => {
  const client = new S3Client(awsConfig);
  const command = new GetObjectCommand({ Bucket: bucket, Key: fileName });
  const res = await client.send(command);
  return (await res.Body?.transformToString()) ?? '';
};

// ─── Azure Blob ───────────────────────────────────────────────────────────────

const _getConfigFromAzure = async (
  connection: string,
  containerName: string,
  fileName: string
): Promise<string> => {
  const serviceClient = BlobServiceClient.fromConnectionString(connection);
  const containerClient = serviceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(fileName);
  const res = await blobClient.download();

  if (!res.readableStreamBody) return '';

  // Consume the stream using Node's async iterator (no manual buffer concat)
  const chunks: Buffer[] = [];
  for await (const chunk of res.readableStreamBody as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as ArrayBuffer));
  }
  return Buffer.concat(chunks).toString('utf8');
};

// ─── Exports ──────────────────────────────────────────────────────────────────

const cloud = {
  getConfigFromS3: _getConfigFromS3,
  getConfigFromAzure: _getConfigFromAzure,
};

export default cloud;
