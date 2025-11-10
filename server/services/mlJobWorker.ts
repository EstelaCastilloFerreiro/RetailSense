/**
 * ML Job Worker
 * Executes Python forecasting engine via child_process with proper error handling,
 * timeouts, and security measures
 */

import { spawn } from 'child_process';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';

const logger = console;

// Job types
export type MLJobType = 'train' | 'predict';

// Job payload schemas with Zod validation
export const TrainJobPayloadSchema = z.object({
  fileId: z.string(),
  filePath: z.string(),
});

export const PredictJobPayloadSchema = z.object({
  fileId: z.string(),
  filePath: z.string(),
  targetSeason: z.enum(['next_PV', 'next_OI']),
  numTiendas: z.number().int().positive().default(10),
});

export type TrainJobPayload = z.infer<typeof TrainJobPayloadSchema>;
export type PredictJobPayload = z.infer<typeof PredictJobPayloadSchema>;

// Result types
export interface MLJobResult {
  status: 'success' | 'error';
  data?: any;
  error?: string;
  logs?: string[];
}

/**
 * Execute Python script safely with timeout and error handling
 */
async function executePythonScript(
  args: string[],
  timeoutMs: number = 600000 // 10 minutes default
): Promise<MLJobResult> {
  return new Promise((resolve) => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    
    logger.info(`Executing Python: python3 -m ${args.join(' ')}`);
    
    // Spawn Python process
    const python = spawn('python3', ['-m', ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1', // Disable Python buffering
      },
    });
    
    // Set timeout
    const timeout = setTimeout(() => {
      python.kill('SIGTERM');
      logger.error(`Python process killed due to timeout (${timeoutMs}ms)`);
    }, timeoutMs);
    
    // Capture stdout
    python.stdout?.on('data', (data) => {
      const line = data.toString();
      stdout.push(line);
      logger.info(`[Python stdout] ${line.trim()}`);
    });
    
    // Capture stderr
    python.stderr?.on('data', (data) => {
      const line = data.toString();
      stderr.push(line);
      logger.error(`[Python stderr] ${line.trim()}`);
    });
    
    // Handle process completion
    python.on('close', (code) => {
      clearTimeout(timeout);
      
      if (code === 0) {
        // Success - parse JSON output from stdout
        try {
          const output = stdout.join('');
          
          // Find the last complete JSON object in output using regex
          // This handles multi-line prettified JSON
          const jsonMatch = output.match(/\{[\s\S]*\}(?![\s\S]*\{)/);
          
          if (jsonMatch) {
            try {
              const jsonData = JSON.parse(jsonMatch[0]);
              logger.info('Python script executed successfully, JSON parsed');
              resolve({
                status: 'success',
                data: jsonData,
                logs: stdout,
              });
            } catch (parseErr) {
              logger.error('Found JSON-like text but failed to parse:', parseErr);
              resolve({
                status: 'error',
                error: 'Failed to parse Python JSON output',
                logs: stdout.concat(stderr),
              });
            }
          } else {
            // No JSON found, return raw stdout
            logger.warn('No JSON output found in Python stdout');
            resolve({
              status: 'success',
              data: { output },
              logs: stdout,
            });
          }
        } catch (err) {
          logger.error('Error processing Python output:', err);
          resolve({
            status: 'error',
            error: 'Failed to process Python output',
            logs: stdout.concat(stderr),
          });
        }
      } else {
        // Failure
        const errorMsg = stderr.join('\n') || `Process exited with code ${code}`;
        logger.error(`Python script failed: ${errorMsg}`);
        resolve({
          status: 'error',
          error: errorMsg,
          logs: stdout.concat(stderr),
        });
      }
    });
    
    // Handle process errors
    python.on('error', (err) => {
      clearTimeout(timeout);
      logger.error('Failed to start Python process:', err);
      resolve({
        status: 'error',
        error: `Failed to start Python: ${err.message}`,
        logs: stderr,
      });
    });
  });
}

/**
 * Validate and sanitize file path to prevent injection
 */
function sanitizeFilePath(filePath: string): string {
  // Resolve to absolute path
  const absolutePath = path.resolve(filePath);
  
  // Check that file exists
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }
  
  // Check that it's a file (not a directory)
  const stats = fs.statSync(absolutePath);
  if (!stats.isFile()) {
    throw new Error(`Path is not a file: ${absolutePath}`);
  }
  
  // Check extension (must be .xlsx or .xls)
  const ext = path.extname(absolutePath).toLowerCase();
  if (!['.xlsx', '.xls'].includes(ext)) {
    throw new Error(`Invalid file type: ${ext}. Must be .xlsx or .xls`);
  }
  
  return absolutePath;
}

/**
 * Execute ML training job
 */
export async function executeTrainJob(payload: TrainJobPayload): Promise<MLJobResult> {
  logger.info('=== Starting ML Training Job ===');
  logger.info(`File ID: ${payload.fileId}`);
  
  try {
    // Validate payload
    const validated = TrainJobPayloadSchema.parse(payload);
    
    // Sanitize file path
    const filePath = sanitizeFilePath(validated.filePath);
    
    // Execute Python training script
    const result = await executePythonScript(
      ['forecasting_engine.main', 'train', filePath],
      600000 // 10 minutes timeout
    );
    
    logger.info('=== ML Training Job Complete ===');
    
    return result;
    
  } catch (err: any) {
    logger.error('ML Training Job failed:', err);
    return {
      status: 'error',
      error: err.message || 'Unknown error',
    };
  }
}

/**
 * Execute ML prediction job
 */
export async function executePredictJob(payload: PredictJobPayload): Promise<MLJobResult> {
  logger.info('=== Starting ML Prediction Job ===');
  logger.info(`File ID: ${payload.fileId}`);
  logger.info(`Target Season: ${payload.targetSeason}`);
  logger.info(`Num Tiendas: ${payload.numTiendas}`);
  
  try {
    // Validate payload
    const validated = PredictJobPayloadSchema.parse(payload);
    
    // Sanitize file path
    const filePath = sanitizeFilePath(validated.filePath);
    
    // Execute Python prediction script
    const result = await executePythonScript(
      [
        'forecasting_engine.main',
        'predict',
        filePath,
        validated.targetSeason,
        validated.numTiendas.toString(),
      ],
      120000 // 2 minutes timeout for predictions
    );
    
    logger.info('=== ML Prediction Job Complete ===');
    
    return result;
    
  } catch (err: any) {
    logger.error('ML Prediction Job failed:', err);
    return {
      status: 'error',
      error: err.message || 'Unknown error',
    };
  }
}
