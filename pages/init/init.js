// This page is always the first page to load

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    bLoading    : true,
    bAuthNeeded : false,
    user        : null,
    titleImg    : lib.cfg.mpImage,
  },
  l: { // local data, not for .wxml
    code : null,
  },
  onLoad() {
    app.g.bInit = true
    return lib.promisify(wx.getUserInfo)()
      .then(() => this.next())
      .catch(() => this.setData({ bAuthNeeded: true }))
  },
  onUserInfo(e) {
    if(e.detail.errMsg.indexOf('fail') >= 0) {
      return // user denied
    }
    this.setData({ bAuthNeeded: false })
    this.next()
  },
  next() {
    return lib.getUser()
      .then(() => {
        this.setData({ user: app.g.user, bLoading: false })
        wx.hideLoading()
        //--- Begin Notifying ---//
        //--- End Notifying ---//
        //--- Begin Routing ---//
        if(app.g.optC) {
          return lib.request('/courses/' + app.g.optC)
            .then(res => {
              app.g.course = res
              wx.redirectTo({ url: '../course/course' })
            })
        } else {
          wx.switchTab({ url: '../home/home' })
        }
        //--- End Routing ---//
      })
      .catch(err => {
        wx.hideLoading()
        lib.errorHandler({ page: 'init', function: 'login', err })
      })
  },
})