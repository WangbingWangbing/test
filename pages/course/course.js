// course page, doesn't support pulldown refresh (no need right now)

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    course  : null,
    ageImgs : lib.ageImgs
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
    this.setData({ course: app.g.course })
  },
  onReady() {
    wx.setNavigationBarTitle({ title: app.g.course.title })
  },
  onPreview(e) {
    let url = this.data.course.desc[e.target.dataset.idx].image
    lib.promisify(wx.previewImage)({ urls: [url] })
  },
  onUnload() {
    app.g.course = null
  },
  onReachBottom() {
  },
  onPullDownRefresh() {
  },
  onShareAppMessage: lib.shareApp
})