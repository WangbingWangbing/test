const cfg = require('./config')

App({
  // TODO: global objects (course, student, appoint) should be removed by using the events of wx.navigateTo, new in 2.7.3 (Weixin 7.0.4, too new right now)
  g: {
    device        : wx.getSystemInfoSync(),
    optC          : 0,      // from options, set in app.js
    bInit         : false,  // set to true in init.js, if false, redirect to init/init
    user          : null,   // set in lib.js

    course        : null,   // set in home
    student       : null,   // set in myChildren and reserve
    appoint       : null,   // set in reserve.js, appntList
  },
  processOptions(options) {
    this.g.optC  = 0

    let params = null
    if(options.query.scene) {  // from 小程序二维码
      params = decodeURIComponent(options.query.scene)
    } else  {
      if(options.query.c) // from 群分享 or template
        this.g.optC = options.query.c
    }
    if(params) {
      console.log('params: ', params)
      params.split(';').forEach(item => {
        if(item.startsWith('c=')) {
          this.g.optC = item.substring(2)
        }
      })
    }
    console.log('optC: ', this.g.optC)
  },
  onLaunch(options) {
    console.log('app-onLaunch options: ', options)
    console.log('serverUrl: ',            cfg.serverUrl)
    console.log('wsUrl: ',                cfg.wsUrl)
    console.log('assetsFolder: ',         cfg.assetsFolder)
    console.log('device: ',               this.g.device)
    this.processOptions(options)
  },
  onShow(options) {
    console.log('app-onShow options: ', options)
    this.processOptions(options)
  },
  onError(msg) {
    console.log('app onError: ', msg)
  }
})