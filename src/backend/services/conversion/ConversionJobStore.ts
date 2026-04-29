import { randomUUID } from 'crypto';

import {
  ConversionError,
  ConversionJob,
  ConversionJobStatus,
  ConversionMode,
  ConversionResult,
  ConversionSource,
} from '../../../services/conversion/types';

class ConversionJobStore {
  private jobs: Map<string, ConversionJob> = new Map();
  private ttlMs = 30 * 60 * 1000; // 30 minutes

  create(
    mode: ConversionMode,
    source: ConversionSource,
    fileName: string,
    mimeType: string,
  ): ConversionJob {
    this.cleanup();

    const now = new Date().toISOString();
    const job: ConversionJob = {
      id: randomUUID(),
      mode,
      source,
      status: 'queued',
      inputFileName: fileName,
      inputMimeType: mimeType,
      warnings: [],
      createdAt: now,
      updatedAt: now,
    };

    this.jobs.set(job.id, job);
    return job;
  }

  get(jobId: string): ConversionJob | undefined {
    this.cleanup();
    return this.jobs.get(jobId);
  }

  updateStatus(
    jobId: string,
    status: ConversionJobStatus,
    result?: ConversionResult,
    error?: ConversionError,
  ): void {
    const job = this.jobs.get(jobId);

    if (!job) {
      return;
    }

    job.status = status;
    job.updatedAt = new Date().toISOString();

    if (result) {
      job.result = result;
      delete job.error;
    }

    if (error) {
      job.error = error;
    }
  }

  addWarning(jobId: string, warning: string): void {
    const job = this.jobs.get(jobId);

    if (!job) {
      return;
    }

    if (!job.warnings.includes(warning)) {
      job.warnings.push(warning);
    }

    job.updatedAt = new Date().toISOString();
  }

  cleanup(): void {
    const now = Date.now();

    for (const [jobId, job] of this.jobs.entries()) {
      if (now - Date.parse(job.updatedAt) > this.ttlMs) {
        this.jobs.delete(jobId);
      }
    }
  }
}

export { ConversionJobStore };
export const conversionJobStore = new ConversionJobStore();
