import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';

import type { ConversionResult } from '../../../services/conversion/types';
import type { OCREngine, OCROptions } from './OCREngine';

interface GeneratedFile {
  path: string;
  extension: string;
}

export class AudiverisEngine implements OCREngine {
  readonly name = 'Audiveris';

  private warnedUnavailable = false;

  async isAvailable(): Promise<boolean> {
    const executable = this.resolveExecutable();
    if (!executable) {
      this.warnUnavailable(
        'Audiveris is disabled by default. Set AUDIVERIS_BIN or AUDIVERIS_HOME only for local AGPL-3.0 experiments.',
      );
      return false;
    }

    if (!this.shouldCheckPath(executable)) return true;

    try {
      await access(executable, constants.F_OK);
      return true;
    } catch {
      this.warnUnavailable(`Audiveris executable was configured but not found at '${executable}'.`);
      return false;
    }
  }

  async processImage(input: Buffer, mimeType: string, options?: OCROptions): Promise<ConversionResult> {
    if (!(await this.isAvailable())) {
      throw new Error(
        'Audiveris OCR is unavailable. Configure AUDIVERIS_BIN or AUDIVERIS_HOME for local-only AGPL-3.0 experimentation.',
      );
    }

    const executable = this.resolveExecutable();
    if (!executable) {
      throw new Error('Audiveris executable could not be resolved after availability check.');
    }

    if (options?.language) {
      console.warn('AudiverisEngine: language option is not mapped to the Audiveris CLI and will be ignored.');
    }
    if (options?.maxPages) {
      console.warn('AudiverisEngine: maxPages option is not mapped to the Audiveris CLI and will be ignored.');
    }

    const workDir = await mkdtemp(path.join(tmpdir(), 'audiveris-ocr-'));
    const outputDir = path.join(workDir, 'output');
    const inputPath = path.join(workDir, `input.${extensionForMimeType(mimeType)}`);

    try {
      await writeFile(inputPath, input);

      await this.runAudiveris(executable, [
        '-batch',
        '-transcribe',
        '-export',
        '-output',
        outputDir,
        inputPath,
      ]);

      const generatedFile = await findGeneratedMusicXml(outputDir);
      if (!generatedFile) {
        throw new Error('Audiveris completed but did not produce a MusicXML (.xml, .musicxml, or .mxl) file.');
      }

      const generatedXml = generatedFile.extension === '.mxl'
        ? await readCompressedMusicXml(generatedFile.path)
        : await readFile(generatedFile.path, 'utf8');

      return {
        generatedXml,
        confidence: 0.8,
        engineName: this.name,
      };
    } catch (error) {
      throw new Error(`Audiveris OCR failed: ${(error as Error).message}`);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }

  private resolveExecutable(): string | undefined {
    if (process.env.AUDIVERIS_BIN) return process.env.AUDIVERIS_BIN;

    const home = process.env.AUDIVERIS_HOME;
    if (!home) return undefined;

    const binaryName = process.platform === 'win32' ? 'audiveris.bat' : 'audiveris';
    return path.join(home, 'bin', binaryName);
  }

  private shouldCheckPath(executable: string): boolean {
    return executable.includes(path.sep) || executable.includes('/') || executable.includes('\\');
  }

  private warnUnavailable(message: string): void {
    if (this.warnedUnavailable) return;
    console.warn(`AudiverisEngine: ${message}`);
    this.warnedUnavailable = true;
  }

  private runAudiveris(executable: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(executable, args, {
        shell: process.platform === 'win32' && executable.toLowerCase().endsWith('.bat'),
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });
      child.on('error', (error) => {
        reject(new Error(`failed to launch Audiveris: ${error.message}`));
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        const detail = stderr.trim() || stdout.trim() || `exit code ${code}`;
        reject(new Error(`Audiveris CLI exited unsuccessfully: ${detail}`));
      });
    });
  }
}

function extensionForMimeType(mimeType: string): string {
  switch (mimeType.toLowerCase()) {
    case 'application/pdf':
      return 'pdf';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/tiff':
      return 'tiff';
    case 'image/bmp':
      return 'bmp';
    default:
      return 'bin';
  }
}

async function findGeneratedMusicXml(directory: string): Promise<GeneratedFile | undefined> {
  const files = await listFiles(directory);
  const candidates = files
    .map((filePath) => ({ path: filePath, extension: path.extname(filePath).toLowerCase() }))
    .filter((file) => ['.xml', '.musicxml', '.mxl'].includes(file.extension));

  return candidates.sort((left, right) => priority(left.extension) - priority(right.extension))[0];
}

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }));
  return files.flat();
}

function priority(extension: string): number {
  if (extension === '.xml') return 0;
  if (extension === '.musicxml') return 1;
  return 2;
}

async function readCompressedMusicXml(filePath: string): Promise<string> {
  const archive = await readFile(filePath);
  const xml = extractFirstXmlFromZip(archive);
  if (!xml) {
    throw new Error(`compressed MusicXML archive '${filePath}' did not contain an XML score file`);
  }
  return xml.toString('utf8');
}

function extractFirstXmlFromZip(archive: Buffer): Buffer | undefined {
  const eocdOffset = findEndOfCentralDirectory(archive);
  if (eocdOffset < 0) return undefined;

  const entryCount = archive.readUInt16LE(eocdOffset + 10);
  let centralOffset = archive.readUInt32LE(eocdOffset + 16);

  for (let index = 0; index < entryCount; index += 1) {
    if (archive.readUInt32LE(centralOffset) !== 0x02014b50) return undefined;

    const compressionMethod = archive.readUInt16LE(centralOffset + 10);
    const compressedSize = archive.readUInt32LE(centralOffset + 20);
    const fileNameLength = archive.readUInt16LE(centralOffset + 28);
    const extraLength = archive.readUInt16LE(centralOffset + 30);
    const commentLength = archive.readUInt16LE(centralOffset + 32);
    const localHeaderOffset = archive.readUInt32LE(centralOffset + 42);
    const fileName = archive.toString('utf8', centralOffset + 46, centralOffset + 46 + fileNameLength);

    if (fileName.toLowerCase().endsWith('.xml') && !fileName.startsWith('META-INF/')) {
      return extractZipEntry(archive, localHeaderOffset, compressedSize, compressionMethod);
    }

    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }

  return undefined;
}

function extractZipEntry(
  archive: Buffer,
  localHeaderOffset: number,
  compressedSize: number,
  compressionMethod: number,
): Buffer | undefined {
  if (archive.readUInt32LE(localHeaderOffset) !== 0x04034b50) return undefined;

  const fileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
  const extraLength = archive.readUInt16LE(localHeaderOffset + 28);
  const dataStart = localHeaderOffset + 30 + fileNameLength + extraLength;
  const compressed = archive.subarray(dataStart, dataStart + compressedSize);

  if (compressionMethod === 0) return compressed;
  if (compressionMethod === 8) return inflateRawSync(compressed);
  throw new Error(`unsupported compression method ${compressionMethod} in compressed MusicXML archive`);
}

function findEndOfCentralDirectory(archive: Buffer): number {
  const minimumOffset = Math.max(0, archive.length - 65_557);
  for (let offset = archive.length - 22; offset >= minimumOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}
