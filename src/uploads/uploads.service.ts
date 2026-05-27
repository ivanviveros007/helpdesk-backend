import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly endpoint: string;

  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.getOrThrow('R2_BUCKET');
    this.endpoint = config.getOrThrow('R2_ENDPOINT');
    this.publicUrl = config.get<string>('R2_PUBLIC_URL') ?? '';
    if (!this.publicUrl) {
      this.logger.warn('R2_PUBLIC_URL not set — uploaded files will not have public URLs');
    }

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: config.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<{ key: string; url: string }> {
    const ext = file.originalname.split('.').pop();
    const key = `${folder}/${uuidv4()}.${ext}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    const url = `${this.publicUrl}/${key}`;
    this.logger.log(`Uploaded ${key} (${file.size} bytes)`);
    return { key, url };
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    this.logger.log(`Deleted ${key}`);
  }
}
