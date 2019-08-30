// edit my name

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    user : null,
  },
  l: {
    name: null
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
    this.setData({ user: app.g.user })
  },
  onName(e) {
    this.l.name = e.detail.value
  },
  onSave(e) {
    app.g.user.parent.name = this.l.name
    return lib.request('/parents/' + app.g.user.parent.id, 'PUT', { ...app.g.user.parent, name: this.l.name })
      .then(() => wx.navigateBack())
      .catch(err => lib.errorHandler({ page: 'myName', function: 'onSave', error: err }))
  },
  onShareAppMessage: lib.shareApp
})