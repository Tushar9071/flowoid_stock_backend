module.exports = {
  apps: [
    {
      name: "flow-stock-backend",
      script: "./dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env_file: "/home/deploy/flowoid_stock_backend/.env",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
