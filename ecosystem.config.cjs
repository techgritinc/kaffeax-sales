module.exports = {
  apps: [
    {
      name: 'kaffeax-sales',
      script: 'server.js',
      cwd: '/var/www/kaffeax-sales',
      env: {
        PORT: 3001,
        NODE_ENV: 'production',
      },
    },
  ],
};
