// send feedback

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
  },
  l: {
    msg: null
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
  },
  onInput(e) {
    this.l.msg = e.detail.value
  },
  onSend() {
    let html = ''
    html += '用户微信昵称：' + app.g.user.wxNickName
    html += '  用户反馈：' + this.l.msg
    const email = {
      from    : 'support@techbiberon.com',
      to      : 'feedback@techbiberon.com',
      subject : '贝贝龙小程序-用户反馈',
      html
    }
    return lib.request('/email', 'POST', email)
      .then(() => lib.promisify(wx.showModal)({ title: '', content: '谢谢您的反馈', showCancel: false }))
      .then(() => wx.navigateBack())
      .catch(err=> lib.errorHandler({ page: 'feedback', function: 'onSend', error: err }))
  },
  onShareAppMessage: lib.shareApp
})