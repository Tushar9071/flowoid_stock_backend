module.exports = {
  apps: [
    {
      name: "flow-stock-backend",
      script: "./dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      out_file: "./logs/pm2-out.log",
      error_file: "./logs/pm2-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      env_file: "/home/deploy/flowoid_stock_backend/.env",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT,
      },
    },
  ],
};
