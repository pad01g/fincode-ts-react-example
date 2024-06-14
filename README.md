# React + TypeScript + Vite

## install

```
npm install
```

## run

```
npm run dev
```

use test card: https://docs.fincode.jp/develop_support/test_resources

## access url format

access url using following url hash format:

```
http://localhost:5173/#p_test_XXXXXXXXXXXXXX,m_test_YYYYYYYYYYYYYY
```

## use server side javascript in browser for testing purpose

place following files in the same level directory `fake-https-proxy-agent`.

otherwise, server side code will not work.


`fake-https-proxy-agent/index.js`

```
export const HttpsProxyAgent = {}
```

`fake-https-proxy-agent/package.json`
```
{
  "name": "fake-https-proxy-agent",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
```

