import { Request, Response, NextFunction } from 'express';

// Custom logger interface
interface LoggerOptions {
  logRequests?: boolean;
  logResponses?: boolean;
  logErrors?: boolean;
  includeBody?: boolean;
  includeHeaders?: boolean;
}

// Default logger options
const defaultOptions: LoggerOptions = {
  logRequests: true,
  logResponses: true,
  logErrors: true,
  includeBody: false,
  includeHeaders: false
};

// Format timestamp
const formatTimestamp = (): string => {
  return new Date().toISOString();
};

// Format request log
const formatRequestLog = (req: Request, options: LoggerOptions): string => {
  const timestamp = formatTimestamp();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  
  let log = `[${timestamp}] ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`;
  
  if (options.includeHeaders) {
    const headers = JSON.stringify(req.headers);
    log += ` - Headers: ${headers}`;
  }
  
  if (options.includeBody && req.body && Object.keys(req.body).length > 0) {
    const body = JSON.stringify(req.body);
    log += ` - Body: ${body}`;
  }
  
  return log;
};

// Format response log
const formatResponseLog = (req: Request, res: Response, responseTime: number, options: LoggerOptions): string => {
  const timestamp = formatTimestamp();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const statusCode = res.statusCode;
  const contentLength = res.get('Content-Length') || '0';
  
  return `[${timestamp}] ${method} ${url} - Status: ${statusCode} - Content-Length: ${contentLength} - Response Time: ${responseTime}ms`;
};

// Format error log
const formatErrorLog = (req: Request, error: any, responseTime: number): string => {
  const timestamp = formatTimestamp();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const errorMessage = error.message || 'Unknown error';
  const errorStack = error.stack || '';
  
  return `[${timestamp}] ERROR ${method} ${url} - Error: ${errorMessage} - Response Time: ${responseTime}ms\nStack: ${errorStack}`;
};

// Main logger middleware
export const apiLogger = (options: LoggerOptions = {}) => {
  const config = { ...defaultOptions, ...options };
  
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log request
    if (config.logRequests) {
      console.log(`📥 REQUEST: ${formatRequestLog(req, config)}`);
    }
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data: any) {
      const responseTime = Date.now() - startTime;
      
      if (config.logResponses) {
        console.log(`📤 RESPONSE: ${formatResponseLog(req, res, responseTime, config)}`);
      }
      
      return originalJson.call(this, data);
    };
    
    // Override res.send to log response
    const originalSend = res.send;
    res.send = function(data: any) {
      const responseTime = Date.now() - startTime;
      
      if (config.logResponses) {
        console.log(`📤 RESPONSE: ${formatResponseLog(req, res, responseTime, config)}`);
      }
      
      return originalSend.call(this, data);
    };
    
    // Handle errors
    res.on('error', (error: any) => {
      const responseTime = Date.now() - startTime;
      
      if (config.logErrors) {
        console.error(`❌ ERROR: ${formatErrorLog(req, error, responseTime)}`);
      }
    });
    
    next();
  };
};

// Simple request logger (lightweight version)
export const simpleLogger = (req: Request, res: Response, next: NextFunction) => {
  const timestamp = formatTimestamp();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
  
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    const statusEmoji = statusCode >= 400 ? '❌' : statusCode >= 300 ? '⚠️' : '✅';
    console.log(`${statusEmoji} [${timestamp}] ${method} ${url} - Status: ${statusCode} - Time: ${responseTime}ms`);
  });
  
  next();
};

// Error logger middleware
export const errorLogger = (error: any, req: Request, res: Response, next: NextFunction) => {
  const timestamp = formatTimestamp();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const errorMessage = error.message || 'Unknown error';
  
  console.error(`❌ [${timestamp}] ERROR ${method} ${url} - ${errorMessage}`);
  console.error(`Stack trace:`, error.stack);
  
  next(error);
};

// Performance logger
export const performanceLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = (seconds * 1000 + nanoseconds / 1000000).toFixed(2);
    
    if (parseFloat(responseTime) > 1000) { // Log slow requests (>1s)
      console.warn(`🐌 SLOW REQUEST: ${req.method} ${req.originalUrl} - ${responseTime}ms`);
    }
  });
  
  next();
}; 