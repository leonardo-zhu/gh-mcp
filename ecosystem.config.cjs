module.exports = {
  apps: [
    {
      name: "gh-mcp",
      script: "dist/index.js",
      args: "--sse --host=0.0.0.0 --port=3000",
      cwd: process.env.PM2_CWD || process.cwd(),
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
