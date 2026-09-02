module.exports = {
  apps: [
    {
      name: 'csc-os-api',
      script: 'dist/server.js',
      cwd: __dirname,

      // Cluster mode spreads incoming connections across one process per
      // CPU core — this is how a single Node process (which is otherwise
      // single-threaded) scales to use a multi-core server.
      exec_mode: 'cluster',
      instances: 'max',

      max_memory_restart: '400M',
      autorestart: true,
      watch: false,

      env_production: {
        NODE_ENV: 'production',
      },

      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // Restart on a schedule to recover from slow memory growth between
      // deploys — cheap insurance for a long-running Node process.
      cron_restart: '0 3 * * *',
    },

    // One-shot jobs, scheduled via PM2's own cron_restart rather than an
    // in-process setInterval (see reminderScheduler.service.ts /
    // analyticsEngine.service.ts for why). autorestart: false — these exit
    // after each run; PM2 just relaunches them on the next cron tick.
    {
      name: 'csc-os-job-reminders',
      script: 'dist/jobs/processReminders.job.js',
      cwd: __dirname,
      instances: 1,
      autorestart: false,
      cron_restart: '*/10 * * * *', // every 10 minutes
      env_production: { NODE_ENV: 'production' },
    },
    {
      name: 'csc-os-job-snapshot-analytics',
      script: 'dist/jobs/snapshotAnalytics.job.js',
      cwd: __dirname,
      instances: 1,
      autorestart: false,
      cron_restart: '5 0 * * *', // 00:05 daily — snapshots the just-finished day
      env_production: { NODE_ENV: 'production' },
    },
  ],
};
