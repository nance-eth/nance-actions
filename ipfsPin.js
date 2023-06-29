require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API = 'https://ipfs.infura.io:5001/api/v0';
const IPFS_GATEWAY = process.env.IPFS_GATEWAY || 'https://ipfs.io';
const owner = 'nance-eth';
const repo = 'nance-actions';
const filePath = 'README.md';

const AUTH_HEADER = `Basic ${Buffer.from(
  `${process.env.INFURA_IPFS_ID}:${process.env.INFURA_IPFS_SECRET}`,
).toString('base64')}`;

// https://github.com/jbx-protocol/juice-interface/blob/main/src/lib/infura/ipfs.ts
async function dotPin(dataIn, encoding = 'utf-8') {
  console.log(`Pinning to IPFS`);
  const data = Buffer.from(dataIn, encoding);
  const formData = new FormData();
  formData.append('file', data);
  return axios({
    method: 'post',
    url: `${API}/add`,
    headers: {
      'Authorization': AUTH_HEADER,
      'Content-Type': 'multipart/form-data',
    },
    data: formData
  }).then((res) => {
    const cid = res.data.Hash;
    console.log(`IPFS CID: ${cid}`);
    return cid;
  }).catch((e) => {
    console.error(e);
  });
}

async function writeCIDToReadme(cid) {
  console.log(`Writing CID to ${filePath}`);
  const { sha, oldContent } = await axios({
    method: 'get',
    url: `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    headers: {
      'Authorization': `Bearer ${process.env.MY_GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }).then((res) => {
    return { sha: res.data.sha, oldContent: res.data.content.replaceAll('\n', '') };
  }).catch((e) => {
    console.error(e);
  });
  const content = Buffer.from(`${IPFS_GATEWAY}/ipfs/${cid}`).toString('base64')
  if (content === oldContent) { console.log('no updates skip readme push'); return; }
  return axios({
    method: 'put',
    url: `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    data: {
      message: 'Update README.md',
      content,
      branch: 'main',
      sha,
    },
    headers: {
      'Authorization': `Bearer ${process.env.MY_GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
  })
}

async function main() {
  const file = fs.readFileSync(process.argv[2]);
  const cid = await dotPin(file);
  console.log(await writeCIDToReadme(cid));
}

main();