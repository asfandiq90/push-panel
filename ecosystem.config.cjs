// PM2 process config for push-panel.
// IMPORTANT: instances=1 / fork mode. The app runs an in-process scheduler
// (scheduled campaigns + RSS polling) — running multiple instances would
// double-send notifications.
module.exports = {
  apps: [
    {
      name: "push-panel",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
