const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    user        : null,
    count       : 0,
    iSmsValid   : 0,
  },
  l: {
    iptPhone: null,
    phone   : null,  // after sms confirmation
    iptSms  : null,
    smsValue: null,  // from server
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
    this.setData({ user: app.g.user })
  },
  onIptPhone(e) {
    this.l.iptPhone = e.detail.value
  },
  countDown() {
    if(this.data.count > 0) {
      this.setData({ count: this.data.count-1 })
      setTimeout(this.countDown, 1000)
    }
  },
  onSendSms() {
    if(!lib.isPhone(this.l.iptPhone)) {
      lib.promisify(wx.showModal)({ title: '错误', content: '手机号码无效', showCancel: false })
      return
    }
    this.setData({ count: 60 })
    setTimeout(this.countDown, 1000)
    return lib.request('/act', 'POST', {
      action: 'sendSms',
      value : { phone: this.l.iptPhone }
    })
      .then(res => {
        this.l.smsValue = res.value
      })
      .catch(err => {
        if(err.code == 'isv.MOBILE_NUMBER_ILLEGAL' || err.code == 'isv.MOBILE_COUNT_OVER_LIMIT')
          lib.promisify(wx.showModal)({ title: '错误', content: '手机号码无效', showCancel: false })
        else if(err.code == 'isv.AMOUNT_NOT_ENOUGH')
          lib.promisify(wx.showModal)({ title: '错误', content: '账户余额不足', showCancel: false })
        else
          lib.errorHandler({ page: 'init', function: 'onSendSms', err })
      })
  },
  onIptSms(e) {
    if(!this.l.iptPhone)
      return ''
    this.l.iptSms = e.detail.value
    if(this.l.iptSms.length === 6) {
      this.setData({ iSmsValid: this.l.iptSms * 7 + 13 === this.l.smsValue ? 1 : -1 })
      if(this.data.iSmsValid === 1) {
        this.l.phone = this.l.iptPhone
      }
    } else {
      this.setData({ iSmsValid: 0 })
    }
  },
  onSave() {
    app.g.user.phone = this.l.phone
    this.setData({ user: app.g.user })
    delete app.g.user.password
    return lib.request('/users/' + app.g.user.id, 'PUT', { ...app.g.user, phone: this.l.phone })
      .then(() => {
        wx.navigateBack()
      })
      .catch(err => lib.errorHandler({ page: 'myPhone', function: 'onSave', error: err }))
  },
  onShareAppMessage: lib.shareApp
})