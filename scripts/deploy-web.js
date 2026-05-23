import FtpDeploy from 'ftp-deploy'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { cpSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

// Copy output views into web/ for FTP deployment
const outputsDir = join(root, 'resources', 'outputs')
const webDir = join(root, 'web')

if (existsSync(outputsDir)) {
  cpSync(outputsDir, join(webDir, 'outputs'), { recursive: true })
  console.log('Copied output views to web/')
}

const config = {
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

if (!config.password) {
  console.error('FTP_PASS environment variable is required')
  process.exit(1)
}

const ftpDeploy = new FtpDeploy()

ftpDeploy.on('uploading', data => {
  console.log(`Uploading ${data.filename} (${data.transferredFileCount}/${data.totalFilesCount})`)
})

ftpDeploy.deploy(config)
  .then(() => console.log('FTP deploy complete → timer.matlak.stream'))
  .catch(err => { console.error('FTP deploy failed:', err); process.exit(1) })
