// list of my appointments

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    tabs : ["全部", "待付款", "待上课", "待评价"],
    idx  : 0,
    sliderLeft    : 20,
    sliderWidth   : 750/4-20*2,
    sliderOffset  : 0,
    appoints      : [],
    height        : 0,
    appointStatus : lib.appointStatus,
    STATUS_NOT_PAID    : lib.STATUS_NOT_PAID,
    STATUS_EXPIRED     : lib.STATUS_EXPIRED,
    STATUS_PAID        : lib.STATUS_PAID,
    STATUS_IN_CLASS    : lib.STATUS_IN_CLASS,
    STATUS_NO_FEEDBACK : lib.STATUS_NO_FEEDBACK,
    STATUS_FEEDBACK    : lib.STATUS_FEEDBACK,
  },
  l: {
    skip    : 0,
    limit   : 20,
    total   : 0,
    lastX   : 0,
    lastY   : 0,
    canMove : false,
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
    this.setData({ height: Math.floor(730 / app.g.device.windowWidth * app.g.device.windowHeight) })
    this.getList()
  },
  onShow() {
  },
  tabClick(e) {
    this.setData({
      idx         : e.currentTarget.id,
      sliderOffset: e.currentTarget.id * 750/4
    })
  },
  onTouchStart(e) {
    // console.log('onTouchStart: ', e.touches[0].pageX)
    this.l.lastX = e.touches[0].pageX
    this.l.lastY = e.touches[0].pageY
    this.l.canMove = true
  },
  onTouchMove(e) {
    if(this.l.canMove) {
      // console.log('onTouchMove: ', e.touches[0].pageX)
      let newX = e.touches[0].pageX
      let newY = e.touches[0].pageY
      if(Math.abs(newY - this.l.lastY) > 100) {
        return
      }
      if(newX - this.l.lastX > 50) {
        this.l.canMove = false
        if(this.data.idx > 0) {
          let idx = this.data.idx - 1
          this.setData({ idx, sliderOffset: idx * 750/4 })
        }
      } else if(newX - this.l.lastX < -50) {
        this.l.canMove = false
        if(this.data.idx < 4) {
          let idx = this.data.idx + 1
          this.setData({ idx, sliderOffset: idx * 750/4 })
        }
      }
    }
  },
  getList() {
    return lib.request(`/appoints?parentId=${app.g.user.parentId}&bHidden=0&$sort[createdAt]=-1&$limit=${this.l.limit}&$skip=${this.l.skip}`)
      .then(res => {
        this.l.total = res.total
        this.l.skip += this.l.limit
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const cutOffTime = new Date(today.getTime() + 1000 * 3600 * 24 * 2)
        res.data.forEach(item => {
          item.date = lib.formatDate(item.startTime)
          item.start = lib.formatTimeHHmm(item.startTime)
          item.end = lib.formatTimeHHmm(item.endTime)
          if(item.status == lib.STATUS_NOT_PAID) {
            if(new Date(item.startTime).getTime() < cutOffTime.getTime()) {
              item.status = lib.STATUS_EXPIRED
            }
          }
          else if(item.status == lib.STATUS_PAID) {
            if(new Date(item.startTime).getTime() < now.getTime()) {
              if(new Date(item.endTime).getTime() > now.getTime()) {
                item.status = lib.STATUS_IN_CLASS
              } else {
                item.status = lib.STATUS_NO_FEEDBACK
              }
            }
          }
        })
        // console.log('appopints: ', res.data)
        this.setData({ appoints: [...this.data.appoints, ...res.data] })
        let nNotPaid    = 0
        let nWaiting    = 0
        let nNoFeedback = 0
        this.data.appoints.forEach(item => {
          if(item.status == lib.STATUS_NOT_PAID || item.status == lib.STATUS_EXPIRED) {
            nNotPaid++
          } else if(item.status == lib.STATUS_PAID) {
            nWaiting++
          } else if(item.status == lib.STATUS_IN_CLASS || item.status == lib.STATUS_NO_FEEDBACK) {
            nNoFeedback++
          }
        })
        let tabs = ["全部", "待付款", "待上课", "待评价"]
        if(nNotPaid>0) {
          tabs[1] += `(${nNotPaid})`
        }
        if(nWaiting>0) {
          tabs[2] += `(${nWaiting})`
        }
        if(nNoFeedback>0) {
          tabs[3] += `(${nNoFeedback})`
        }
        this.setData({ tabs })
      })
      .catch(err => lib.errorHandler({ page: 'home', function: 'getList', error: err }))
  },
  onAppoint(e) {
    app.g.appoint = this.data.appoints[e.currentTarget.dataset.idx]
    wx.navigateTo({ url: '../appoint/appoint' })
  },
  onReachBottom() {
    if(this.data.idx == 0) {
      if(this.l.skip >= this.l.total) {
        wx.showToast({ title: '没有更多了', icon: 'success', duration: 1000 })
        return
      }
      this.getList()
    }
  },
  onPullDownRefresh() {
    wx.stopPullDownRefresh()
    this.l.skip = 0
    this.setData({ appoints: [] })
    this.getList()
  },
  onShareAppMessage: lib.shareApp
})