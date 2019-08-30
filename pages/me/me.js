//

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    user     : null,
    nChildren: -1,
    version  : lib.cfg.version,
    server   : lib.cfg.assetsFolder,
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
  },
  onShow() {
    this.setData({ user: app.g.user })
    this.getChildrenCount()
  },
  getChildrenCount() {
    return lib.request(`/students?$limit=0&parentId=${app.g.user.parent.id}`)
      .then(res => this.setData({ nChildren: res.total }))
      .catch(err => lib.errorHandler({ page: 'me', function: 'count students', error: err }))
  },
  onPullDownRefresh() {
    wx.stopPullDownRefresh()
    return lib.getUser()
      .then(res => {
        this.setData({ user: app.g.user, nChildren: -1 })
        this.getChildrenCount()
      })
  },
  onShareAppMessage: lib.shareApp
})