module.exports = {
  apps : [{
    name: 'DdosDetector',
    script: 'app.js',
    args: '--log-path=/data/prosveta/logs/access',
    instances: '1',
    autorestart: true,
    watch: false,
    max_memory_restart: '16G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    output: '/dev/null',
    error:  '/dev/null',
    log:    '/data/prosveta/logs/ddos-detector/app.log',
    merge_logs: true,
    time: true,
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};