const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    ['/_api', '/_services'],
    createProxyMiddleware({
      target: 'https://site-alfw4.powerappsportals.com',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('Proxying:', req.method, req.path);
      },
    })
  );
};
