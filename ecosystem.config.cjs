module.exports = {
    apps: [{
        name: 'DdosDetector',
        script: 'app.js',
        args: '--NOT-USED-path-watch=/data5/prosveta/logs/access/all-*.log --block-ips-file=/prosveta/blocked-ips.conf --allow-ips-file=/prosveta/allowed-ips.conf',
        instances: 'max',
        autorestart: true,
        watch: false,
        max_memory_restart: '16G',
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        output: '/dev/null',
        error: '/dev/null',
        log: '/prosveta/logs/ddos-detector/app.log',
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
