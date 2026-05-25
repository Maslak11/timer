import FtpDeploy from 'ftp-deploy'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { cpSync, writeFileSync, existsSync, unlinkSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const webDir = join(root, 'web')

// Copy output views into web/outputs/ for FTP deployment
const outputsDir = join(root, 'resources', 'outputs')
if (existsSync(outputsDir)) {
  cpSync(outputsDir, join(webDir, 'outputs'), { recursive: true })
  console.log('Copied output views → web/outputs/')
}

// Generate api/config.php from environment variables (never stored in git)
const configPhp = `<?php
define('DB_HOST', '${process.env.DB_HOST || 'maslak.mysql.dhosting.pl'}');
define('DB_NAME', '${process.env.DB_NAME || 'oetoh9_timermat'}');
define('DB_USER', '${process.env.DB_USER || 'boh7oo_timermat'}');
define('DB_PASS', '${process.env.DB_PASS}');
`
if (!process.env.DB_PASS) {
  console.error('DB_PASS environment variable is required')
  process.exit(1)
}
writeFileSync(join(webDir, 'api', 'config.php'), configPhp)
console.log('Generated api/config.php from environment')

const ftpConfig = {
  user: process.env.FTP_USER || 'zaive4_timermat',
  password: process.env.FTP_PASS,
  host: process.env.FTP_HOST || 'maslak.ftp.dhosting.pl',
  port: 21,
  localRoot: webDir,
  remoteRoot: '/public_html/',
  include: ['*', '**/*'],
  exclude: [],
  deleteRemote: false,
  forcePasv: true,
  sftp: false
}

if (!ftpConfig.password) {
  console.error('FTP_PASS environment variable is required')
  process.exit(1)
}

const ftpDeploy = new FtpDeploy()
ftpDeploy.on('uploading', d => process.stdout.write(`\r  ${d.transferredFileCount}/${d.totalFilesCount} ${d.filename}`))

ftpDeploy.deploy(ftpConfig)
  .then(() => {
    console.log('\nFTP deploy complete → timer.matlak.stream')
    // Clean up generated config so credentials don't linger in working dir
    try { unlinkSync(join(webDir, 'api', 'config.php')) } catch {}
  })
  .catch(err => { console.error('\nFTP deploy failed:', err); process.exit(1) })
