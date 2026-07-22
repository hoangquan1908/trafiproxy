// node-forge: thư viện crypto (RSA, X.509, cert, key…)
// fs: ghi file ra disk
// path: xử lý đường dẫn an toàn cross-platform

const fs = require('fs')
const path = require('path')
const forge = require('node-forge')

const certDir = path.resolve(__dirname, '../../certs');

function getCertDir() {
    return certDir;
}

//const certDir = path.resolve(__dirname, '../../certs');
// Cấu trúc bắt buộc của http-mitm-proxy:
// 1. Thư mục con /certs chứa file ca.pem
// 2. Thư mục con /keys chứa file ca.key.pem
const caKeyPath = path.join(certDir, 'keys', 'ca.private.key');
const caCertPath = path.join(certDir, 'certs', 'ca.public.certificates');

function getCaCertPath() {
  return caCertPath;
}

function ensureCA() {
  if (!fs.existsSync(path.join(certDir, 'keys'))) fs.mkdirSync(path.join(certDir, 'keys'), { recursive: true });
  if (!fs.existsSync(path.join(certDir, 'certs'))) fs.mkdirSync(path.join(certDir, 'certs'), { recursive: true });

  if (fs.existsSync(caKeyPath) && fs.existsSync(caCertPath)) {
    return {
      key: fs.readFileSync(caKeyPath),
      cert: fs.readFileSync(caCertPath)
    };
  }

  console.log('[CA] Generating CA...')

  //Tạo khoá RSA 2048
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + Date.now();
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10)

  const attrs = [
    { name: 'commonName', value: 'Trafexia MITM Proxy CA' },
    { name: 'organizationName', value: 'Trafexia-Project' },
    { name: 'countryName', value: 'VN' }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  // ca.js
cert.setExtensions([
  {
    name: 'basicConstraints',
    cA: true,
    critical: true // Bắt buộc phải là True để thiết bị hiểu đây là chứng chỉ gốc
  },
  {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true,
    critical: true
  },
  {
    name: 'extKeyUsage', // Thêm phần này để trình duyệt tin tưởng cho việc xác thực Server
    serverAuth: true,
    clientAuth: true,
    codeSigning: true,
    emailProtection: true,
    timeStamping: true
  },
  {
    name: 'subjectKeyIdentifier'
  }
]);
  // Ký chứng chỉ bằng chính khóa bí mật vừa tạo (Self-signed)
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Bước 5: Ghi file ra disk theo định dạng PEM
  const pemKey = forge.pki.privateKeyToPem(keys.privateKey);
  const pemCert = forge.pki.certificateToPem(cert);

  fs.writeFileSync(caKeyPath, pemKey);
  fs.writeFileSync(caCertPath, pemCert);

  console.log('[CA] Đã tạo thành công Root CA tại thư mục /certs');

  return {
    key: pemKey,
    cert: pemCert
  };
}

module.exports = { ensureCA, getCertDir, getCaCertPath };