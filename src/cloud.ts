import { S3Client, GetObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3';
import { BlobServiceClient, BlobDownloadResponseParsed } from '@azure/storage-blob';
import { streamToString } from './utils';

const _createS3Client = (config: S3ClientConfig): S3Client => {
  const client = new S3Client(config);
  return client;
};

const _getConfigFromS3Bucket = async (bucket: string, fileName: string, awsConfig: S3ClientConfig): Promise<string> => {
  const client = _createS3Client(awsConfig);
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: fileName,
  });

  const res = await client.send(command);
  const config = await res.Body?.transformToString();
  return config || '';
};

const _getConfigFromAzureBlob = async (connection: string, containerName: string, fileName: string): Promise<string> => {
  const serviceClient = BlobServiceClient.fromConnectionString(connection);
  const containerClient = serviceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlobClient(fileName);

  const res: BlobDownloadResponseParsed = await blobClient.download();
  const content: string = (await streamToString(res.readableStreamBody)).toString();

  return content;
};

const cloud = {
  getConfigFromS3: _getConfigFromS3Bucket,
  getConfigFromAzure: _getConfigFromAzureBlob,
};

export default cloud;
