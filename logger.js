import { config } from 'dotenv';
config();
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { DateTime } from 'luxon';

const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${level}]: ${message} ${metaString}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({
      format: () =>
        DateTime.now()
          .setZone('America/Sao_Paulo')
          .toFormat('yyyy-LL-dd HH:mm:ss')
    }),
    colorize(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    // Daily rotating file transport
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: false,
      maxFiles: '14d',
      level: process.env.FILE_LOG_LEVEL || 'info'
    })
  ],
  exitOnError: false,
});

export default logger;
