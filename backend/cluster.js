/**
 * Cluster Entry Point
 * Spawns one worker per CPU core, auto-restarts crashed workers
 * Run this instead of server.js in production: node cluster.js
 */

const cluster = require('cluster')
const os = require('os')
const logger = require('./utils/logger')

const WORKERS = process.env.WEB_CONCURRENCY || os.cpus().length

if (cluster.isPrimary) {
  logger.info(`🧠 Master process ${process.pid} started — spawning ${WORKERS} workers`)

  // Fork one worker per CPU core
  for (let i = 0; i < WORKERS; i++) {
    cluster.fork()
  }

  // Auto-restart any worker that crashes
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`⚠️  Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}) — restarting...`)
    cluster.fork()
  })

  cluster.on('online', (worker) => {
    logger.info(`✅ Worker ${worker.process.pid} is online`)
  })

} else {
  // Each worker runs the full server independently
  require('./server')
  logger.info(`🚀 Worker ${process.pid} started`)
}
