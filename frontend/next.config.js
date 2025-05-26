module.exports = {
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000/api',
  },
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'components');
    return config;
  },
};