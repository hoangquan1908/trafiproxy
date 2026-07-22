const proxy = require('./proxy');
const { getCertDir } = require('../ca');

const DEFAULT_PORT = 8888;
const DEFAULT_HOST = '0.0.0.0';

function startProxy(port = DEFAULT_PORT, callback) {
    const certDir = getCertDir();
    return proxy.listen({
        port,
        host: DEFAULT_HOST,
        sslCaDir: certDir,
    }, callback);
}

function stopProxy(instance) {
    if (instance) instance.close();
}

module.exports = {
    startProxy,
    stopProxy,
    DEFAULT_PORT,
};