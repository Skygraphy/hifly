import { SendMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient } from '../config/s3';
import { env } from '../config/env';

export interface ProcessingJob {
  hash: string;
  s3KeyPrefix: string;
}

export async function enqueueProcessingJob(job: ProcessingJob): Promise<void> {
  await sqsClient.send(new SendMessageCommand({
    QueueUrl: env.SQS_QUEUE_URL,
    MessageBody: JSON.stringify(job),
  }));
}
