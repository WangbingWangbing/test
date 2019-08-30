// all URLs should not end with /

const dev = {
  serverUrl     : 'http://localhost:3090',
  wsUrl         : 'ws://localhost:3090',
  assetsFolder  : 'dev'
}

const beta = {
  serverUrl     : 'https://servicebeta.biberonegeo.com',
  wsUrl         : 'wss://servicebeta.biberonegeo.com',
  assetsFolder  : 'beta'
}

const production = {
  serverUrl     : 'https://service.biberonegeo.com',
  wsUrl         : 'wss://service.biberonegeo.com',
  assetsFolder  : 'production'
}

const alpha1 = {
  serverUrl     : 'https://service1.biberonegeo.com',
  wsUrl         : 'wss://service1.biberonegeo.com',
  assetsFolder  : 'alpha1'
}

const alpha2 = {
  serverUrl     : 'https://service2.biberonegeo.com',
  wsUrl         : 'wss://service2.biberonegeo.com',
  assetsFolder  : 'alpha2'
}

// const env = dev
// const env = alpha1
// const env = alpha2
const env = beta
// const env = production

module.exports = {
  mpName      : 'mpParent',       // used in auth
  mpTitle     : '智慧爱宝',        // used in sharing
  mpImage     : 'https://bblegeo.oss-cn-beijing.aliyuncs.com/0/titleParent.jpeg', // used in login, sharing
  tencent     : false,            // must be false before upload code
  version     : '0.28.d6b9',      // first 4 letters of git commit ID
  serverUrl   : env.serverUrl,
  wsUrl       : env.wsUrl,
  assetsFolder: env.assetsFolder, // folder name on OSS
}