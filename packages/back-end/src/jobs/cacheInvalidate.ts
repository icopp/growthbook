import Agenda, { Job } from "agenda";
import { AWS_CLOUDFRONT_DISTRIBUTION_ID } from "../util/secrets";
import AWS from "aws-sdk";
import { CreateInvalidationRequest } from "aws-sdk/clients/cloudfront";
import { getAllApiKeysByOrganization } from "../services/apiKey";

const INVALIDATE_JOB_NAME = "fireInvalidate";
type InvalidateJob = Job<{
  url: string;
}>;

let agenda: Agenda;
export default function (ag: Agenda) {
  agenda = ag;

  // Fire webhooks
  agenda.define(INVALIDATE_JOB_NAME, async (job: InvalidateJob) => {
    // Skip if job is missing url in data
    if (!job.attrs.data) return;
    const { url } = job.attrs.data;
    if (!url) return;

    // Sanity check in case this env variable changed between being queued and running the job
    if (!AWS_CLOUDFRONT_DISTRIBUTION_ID) return;

    // we should eventually restructure this to a cron job that collects
    // a full list of all URLs to be cleared, and send one clear request
    // to AWS, which might help reduce the number of API calls
    const cloudfront = new AWS.CloudFront();
    const params: CreateInvalidationRequest = {
      DistributionId: AWS_CLOUDFRONT_DISTRIBUTION_ID,
      InvalidationBatch: {
        CallerReference: "" + Date.now(),
        Paths: {
          Quantity: 1,
          Items: [url],
        },
      },
    };

    await new Promise<void>((resolve, reject) => {
      cloudfront.createInvalidation(params, function (err) {
        if (err) {
          console.error("Error invalidating CDN", url, err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}

export async function queueCDNInvalidate(
  organization: string,
  getUrl: (key: string) => string
) {
  if (!AWS_CLOUDFRONT_DISTRIBUTION_ID) return;

  const apiKeys = await getAllApiKeysByOrganization(organization);

  // Skip if there are no API keys defined
  if (!apiKeys || !apiKeys.length) return;

  // Queue up jobs to invalidate each API key in the CDN
  for (const k of apiKeys) {
    const url = getUrl(k.key);
    const job = agenda.create(INVALIDATE_JOB_NAME, {
      url,
    }) as InvalidateJob;
    job.unique({ url });
    job.schedule(new Date());
    await job.save();
  }
}
