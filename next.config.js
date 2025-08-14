// next.config.js
const path = require('path');

module.exports = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    config.resolve.alias['@/types'] = path.resolve(__dirname, 'src/types');
    typedRoutes: true;
    return config;
  },
};