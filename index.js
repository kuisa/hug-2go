const express = require("express");
const app = express();
const { exec, execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const port = process.env.SERVER_PORT || process.env.PORT || 7860;        
const UUID = process.env.UUID || '986e0d08-b275-4dd3-9e75-f3094b36fa2a';
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nz.abc.cn';     
const NEZHA_PORT = process.env.NEZHA_PORT || '5555';
const NEZHA_KEY = process.env.NEZHA_KEY || '';
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';
const ARGO_AUTH = process.env.ARGO_AUTH || '';
const SUB_PATH = process.env.SUB_PATH || 'sub';
const CFIP = process.env.CFIP || 'time.is';
const NAME = process.env.NAME || 'Hug';

function generateRandomName(prefix) {
  const randomString = crypto.randomBytes(4).toString('hex');
  return `${prefix}_${randomString}`;
}

function renameFile(originalName) {
  try {
    if (fs.existsSync(originalName)) {
      const newName = generateRandomName(originalName);
      fs.renameSync(originalName, newName);
      console.log(`Renamed ${originalName} to ${newName}`);
      return newName;
    }
    return originalName;
  } catch (error) {
    console.error(`Error renaming ${originalName}:`, error);
    return originalName;
  }
}

const renamedNpm = renameFile('npm');
const renamedWeb = renameFile('web');
const renamedBot = renameFile('bot');

// root route
app.get("/", function(req, res) {
  res.send("Hello world!");
});

const metaInfo = execSync(
  'curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
  { encoding: 'utf-8' }
);
const ISP = metaInfo.trim();

// sub subscription
app.get('/${SUB_PATH}', (req, res) => {
  const VMESS = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: '443', id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: ARGO_DOMAIN, path: '/vmess?ed=2048', tls: 'tls', sni: ARGO_DOMAIN, alpn: '', fp: 'chrome' };
  const vlessURL = `vless://${UUID}@${CFIP}:443?encryption=none&security=tls&sni=${ARGO_DOMAIN}&type=ws&fp=chrome&host=${ARGO_DOMAIN}&path=%2Fvless%3Fed%3D2048#${NAME}-${ISP}`;
  const vmessURL = `vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`;
  const trojanURL = `trojan://${UUID}@${CFIP}:443?security=tls&sni=${ARGO_DOMAIN}&fp=chrome&type=ws&host=${ARGO_DOMAIN}&path=%2Ftrojan%3Fed%3D2048#${NAME}-${ISP}`;
  
  const base64Content = Buffer.from(`${vlessURL}\n\n${vmessURL}\n\n${trojanURL}`).toString('base64');

  res.type('text/plain; charset=utf-8').send(base64Content);
});

// run-nezha
let NEZHA_TLS = '';
if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
  const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
  if (tlsPorts.includes(NEZHA_PORT)) {
    NEZHA_TLS = '--tls';
  } else {
    NEZHA_TLS = '';
  }
  const command = `nohup ./${renamedNpm} -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 &`;
  try {
    exec(command);
    console.log(`${renamedNpm} is running`);

    setTimeout(() => {
      runWeb();
    }, 2000);
  } catch (error) {
    console.error(`${renamedNpm} running error: ${error}`);
  }
} else {
  console.log('NEZHA variable is empty, skip running');
  runWeb();
}

// run-xr-ay
function runWeb() {
  const command1 = `nohup ./${renamedWeb} -c ./config.json >/dev/null 2>&1 &`;
  exec(command1, (error) => {
    if (error) {
      console.error(`${renamedWeb} running error: ${error}`);
    } else {
      console.log(`${renamedWeb} is running`);

      setTimeout(() => {
        runServer();
      }, 2000);
    }
  });
}

// run-server
function runServer() {
  const command2 = `nohup ./${renamedBot} tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &`;
  exec(command2, (error) => {
    if (error) {
      console.error(`${renamedBot} running error: ${error}`);
    } else {
      console.log(`${renamedBot} is running`);
    }
  });
}

app.listen(port, () => console.log(`App is listening on port ${port}!`));
