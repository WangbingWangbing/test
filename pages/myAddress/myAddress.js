// edit my address

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    user: null,
  },
  l: {
    address: null,
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
    this.setData({ user: app.g.user })
  },
  onAddress(e) {
    this.l.address = e.detail.value
  },
  onSave() {
    app.g.user.parent.address = this.l.address
    return lib.request('/parents/' + app.g.user.parent.id, 'PUT', { ...app.g.user.parent, address: this.l.address })
      .then(() => wx.navigateBack())
      .catch(err => lib.errorHandler({ page: 'myAddress', function: 'onSave', error: err }))
  },
  onShareAppMessage: lib.shareApp
})