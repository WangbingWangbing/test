// home page (tab)

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    swipes  : [
      'https://bblegeo.oss-cn-beijing.aliyuncs.com/0/swipe1.jpeg?1',
      'https://bblegeo.oss-cn-beijing.aliyuncs.com/0/swipe2.jpeg?1',
      'https://bblegeo.oss-cn-beijing.aliyuncs.com/0/swipe3.jpeg?1'
    ],
    count   : 0,
    courses : [],
    ageImgs : lib.ageImgs
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
    this.getCourses()
  },
  onShow() {
    this.getAppointsCount()
  },
  getCourses() {
    return lib.request('/courses?$limit=50') //TODO: max 50 courses for now
      .then(res => this.setData({ courses: res.data }))
      .catch(err => lib.errorHandler({ page: 'home', function: 'getCourses', error: err }))
  },
  getAppointsCount() {
    return lib.request(
      `/appoints?parentId=${app.g.user.parentId}&$or[0][status]=${lib.STATUS_NOT_PAID}&$or[1][status]=${lib.STATUS_PAID}&$limit=0`) // only need total
      .then(res => this.setData({ count: res.total }))
      .catch(err => lib.errorHandler({ page: 'home', function: 'getAppointsCount', error: err }))
  },
  onCourse(e) {
    app.g.course = this.data.courses[e.currentTarget.dataset.idx]
    wx.navigateTo({ url: '../course/course' })
  },
  onPullDownRefresh() {
    wx.stopPullDownRefresh()
    this.getCourses()
    this.getAppointsCount()
  },
  onShareAppMessage: lib.shareApp
})