module.exports = {
  output: 'standalone',
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000/api',
  },
  reactStrictMode: true,
};