// appointment page: view, pay, cancel, feedback, etc.

const app = getApp()
const lib = require('../../utils/lib')
const io = require('../../utils/socket.io-mp')

Page({
  data: {
    appoint: null,
    status : lib.appointStatus,
    STATUS_NOT_PAID     : lib.STATUS_NOT_PAID,
    STATUS_EXPIRED      : lib.STATUS_EXPIRED,
    STATUS_PAID         : lib.STATUS_PAID,
    STATUS_IN_CLASS     : lib.STATUS_IN_CLASS,
    STATUS_NO_FEEDBACK  : lib.STATUS_NO_FEEDBACK,
    STATUS_FEEDBACK     : lib.STATUS_FEEDBACK,
    STATUS_CANCEL_ADMIN : lib.STATUS_CANCEL_ADMIN,
    STATUS_CANCEL_PARENT: lib.STATUS_CANCEL_PARENT,
    STATUS_CANCEL_SYSTEM: lib.STATUS_CANCEL_SYSTEM,
    feedbackItems     : [
      { name: '准时到达', value: '0' },
      { name: '穿着得体', value: '1' },
      { name: '专业尽职', value: '2' },
    ]
  },
  l: {
    payComplete   : false,
    feedbackStars : 0,
    feedbackInput : '',
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
    this.populate()
  },
  populate() {
    return Promise.resolve() // add objects (student, course1234) if needed
      .then(() => {
        if(!app.g.appoint.student) {
          return lib.request('/students/' + app.g.appoint.studentId)
        }
      })
      .then(res => {
        if(res) {
          app.g.appoint.student = res
        }
        if(!app.g.appoint.course1) {
          return lib.request('/courses/' + app.g.appoint.courseId1)
        }
      })
      .then(res => {
        if(res) {
          app.g.appoint.course1 = res
          app.g.appoint.course2 = res
        }
        if(!app.g.appoint.course3 && app.g.appoint.courseId3) {
          return lib.request('/courses/' + app.g.appoint.courseId3)
        }
      })
      .then(res => {
        if(res) {
          app.g.appoint.course3 = res
          if(!app.g.appoint.course4 && app.g.appoint.courseId4) {
            return lib.request('/courses/' + app.g.appoint.courseId4)
          }
        }
      })
      .then(res => {
        if(res) {
          app.g.appoint.course4 = res
        }
        let courseDesc = `${app.g.appoint.nSessions}个课时：${app.g.appoint.course1.title}（2课时）`
        let price = app.g.appoint.course1.price * 2
        if(app.g.appoint.nSessions >= 3) {
          courseDesc += `；${app.g.appoint.course3.title}（1课时）`
          price += app.g.appoint.course3.price
        }
        if(app.g.appoint.nSessions >= 4) {
          courseDesc += `；${app.g.appoint.course4.title}（1课时）`
          price += app.g.appoint.course4.price
        }
        app.g.appoint.courseDesc = courseDesc
        app.g.appoint.price = price
        if(app.g.appoint.status === lib.STATUS_FEEDBACK) { // use feeback to store a string
          app.g.appoint.feedback = `${app.g.appoint.feedbackStars}颗星`
          app.g.appoint.feedbackStrs.forEach(item => app.g.appoint.feedback += ' ' + item )
        }
        app.g.appoint.date = lib.formatDate(app.g.appoint.startTime)
        app.g.appoint.start = lib.formatTimeHHmm(app.g.appoint.startTime)
        app.g.appoint.end = lib.formatTimeHHmm(app.g.appoint.endTime)
        this.setData({ appoint: app.g.appoint })
      })
      .catch(err => lib.errorHandler({ page: 'appoint', function: 'populate', error: err }))
  },
  refresh() {
    return lib.request('/appoints/' + app.g.appoint.id)
      .then(res => {
        app.g.appoint = res
        this.populate()
      })
      .catch(err => lib.errorHandler({ page: 'appoint', function: 'refresh', error: err }))
  },
  onRemove() { // unpaid
    return lib.promisify(wx.showModal)({
      title     : '警告',
      content   : `您确定要删除预约吗？`,
      showCancel: true
    })
      .then(res => {
        if(res.confirm) {
          return lib.request('/appoints/' + this.data.appoint.id, 'DELETE')
            .then(() => wx.navigateBack())
            .catch(err => lib.errorHandler({ page: 'appoint', function: 'onRemove', error: err }))
        }
      })
  },
  onPay() {
    let takenClassRes = null
    let takenRoadRes1 = null
    let takenRoadRes2 = null
    const DAY = lib.formatDate(app.g.appoint.startTime)
    const min = new Date(DAY + ' ' + lib.DAY_START).getTime()
    const max = new Date(DAY + ' ' + lib.DAY_END).getTime()
    const bStartBefore = min < new Date(app.g.appoint.startTime).getTime()
    const bEndAfter    = max > new Date(app.g.appoint.endTime).getTime()
    const startBefore = new Date(Math.max(new Date(app.g.appoint.startTime).getTime() - 1000*60*lib.ROAD_MINUTES, min))
    const endAfter    = new Date(Math.min(new Date(app.g.appoint.endTime).getTime()   + 1000*60*lib.ROAD_MINUTES, max))
    wx.showLoading({ title: '核实时间中...', mask: true })
    return this.findTeachers()
      .then(teachers => {
        if(teachers.length == 0) {
          wx.hideLoading()
          return lib.promisify(wx.showModal)({ title: '', content: '对不起，您选的时间段全部被约了，请重新预约', showCancel: false })
            .then(() => {
              wx.switchTab({ url: '../reserve/reserve' })
              return Promise.reject('DO_NOT_HANDLE')
            })
        }
        const teacherAssigned = teachers[Math.floor(Math.random() * teachers.length)] // randomly selected
        const expiration = new Date(new Date().getTime() + 1000 * 60 * lib.RESERVE_MINUTES)
        lib.request('/takens', 'POST', {
          type      : lib.TAKEN_CLASS_RES,
          startTime : app.g.appoint.startTime,
          endTime   : app.g.appoint.endTime,
          slots     : lib.timeToSlots(app.g.appoint.startTime, app.g.appoint.endTime),
          expiration,
          teacherId : teacherAssigned.id,
          appointId : app.g.appoint.id,
        })
          .then(res => takenClassRes = res)
        if(bStartBefore) {
          lib.request('/takens', 'POST', {
            type      : lib.TAKEN_ROAD_RES,
            startTime : startBefore,
            endTime   : app.g.appoint.startTime,
            slots     : lib.timeToSlots(startBefore, app.g.appoint.startTime),
            expiration,
            teacherId : teacherAssigned.id,
            appointId : app.g.appoint.id,
          })
          .then(res => takenRoadRes1 = res)
        }
        if(bEndAfter) {
          lib.request('/takens', 'POST', {
            type      : lib.TAKEN_ROAD_RES,
            startTime : app.g.appoint.endTime,
            endTime   : endAfter,
            slots     : lib.timeToSlots(app.g.appoint.endTime, endAfter),
            expiration,
            teacherId : teacherAssigned.id,
            appointId : app.g.appoint.id,
          })
          .then(res => takenRoadRes2 = res)
        }
        return lib.request('/act', 'POST', {
          'action': 'preparePay',
          'value': {
            appointId : app.g.appoint.id,
            // vTotal  : app.g.appoint.price
            vTotal : 1, //TODO:
          }
        })
      })
      .then(preparePayRes => {
        const socket = io(lib.cfg.wsUrl)
        socket.on('connect', () => {
          console.log('socket connected: ', socket)
        })
        socket.on('disconnect', data => {
          console.log('socket disconnected: ', data)
        })
        socket.on('appoints patched', appoint => {
          console.log('appoints patched: ', appoint)
          if(appoint.parentId === app.g.user.parentId) { // error if without, why?
            // console.log('on appoint patched: ', appoint)
            wx.hideLoading()
            if(appoint.status === lib.STATUS_PAID) {
              app.g.appoint.status = lib.STATUS_PAID
              this.setData({ appoint: app.g.appoint })
              if(this.l.payComplete) {
                return lib.promisify(wx.showModal)({ title: '', content: '支付成功', showCancel: false })
                  .then(() => wx.switchTab({ url: '../home/home' }))
              }
            }
            if(appoint.status === lib.STATUS_CANCEL_SYSTEM) {
              app.g.appoint.status = lib.STATUS_CANCEL_SYSTEM
              this.setData({ appoint: app.g.appoint })
              if(this.l.payComplete) {
                return lib.promisify(wx.showModal)({ title: '', content: '对不起，您选的时间段全部被约了，已经退款，请重新预约', showCancel: false })
                  .then(() => wx.switchTab({ url: '../reserve/reserve' }))
              }
            }
            socket.close()
          }
        })
        this.l.payComplete = false
        wx.hideLoading()
        wx.showLoading({ title: '等待结果中...', mask: true })
        return lib.promisify(wx.requestPayment)(preparePayRes)
      })
      .then(res => { // pay success, waiting for server using socket above
        // console.log('appoint-onPay res: ', res)
        this.l.payComplete = true
        if(app.g.appoint.status == lib.STATUS_PAID) {
          return lib.promisify(wx.showModal)({ title: '', content: '支付成功', showCancel: false })
            .then(() => wx.switchTab({ url: '../home/home' }))
        }
        if(app.g.appoint.status == lib.STATUS_CANCEL_SYSTEM) {
          return lib.promisify(wx.showModal)({ title: '', content: '对不起，您选的时间段全部被约了，已经退款，请重新预约', showCancel: false })
            .then(() => wx.switchTab({ url: '../reserve/reserve' }))
        }
      })
      .catch(err => {
        wx.hideLoading()
        if(err == 'DO_NOT_HANDLE') {
          return
        }
        if(err.errMsg && err.errMsg.startsWith('requestPayment:fail')) {
          let msg = err.errMsg.substring('requestPayment:fail'.length + 1)
          if(msg == 'cancel') { // unreserve
            if(takenClassRes) lib.request('/takens/' + takenClassRes.id, 'DELETE')
            if(takenRoadRes1) lib.request('/takens/' + takenRoadRes1.id, 'DELETE')
            if(takenRoadRes2) lib.request('/takens/' + takenRoadRes2.id, 'DELETE')
            return
          } else { // if not user cancel, show error, maybe: 当前开发者绑定时间不足 24 小时，请过后重试
            lib.promisify(wx.showModal)({ title: '出错', content: msg, showCancel: false })
          }
        }
        lib.errorHandler({ page: 'appoint', function: 'onPay', error: err })
      })
  },
  findTeachers() {
    const DAY = lib.formatDate(app.g.appoint.startTime)
    const DAY_START = new Date(DAY + ' ' + lib.DAY_START).getTime()
    const DAY_END   = new Date(DAY + ' ' + lib.DAY_END).getTime()
    let classSlots = lib.timeToSlots(app.g.appoint.startTime, app.g.appoint.endTime)
    console.log('classSlots: ', classSlots)
    let roadSlots = []
    if(DAY_START < new Date(app.g.appoint.startTime).getTime()) {
      const startBefore = Math.max(new Date(app.g.appoint.startTime).getTime() - 1000*60*lib.ROAD_MINUTES, DAY_START)
      roadSlots.push(...lib.timeToSlots(startBefore, app.g.appoint.startTime))
    }
    if(DAY_END > new Date(app.g.appoint.endTime).getTime()) {
      const endAfter = Math.min(new Date(app.g.appoint.endTime).getTime() + 1000*60*lib.ROAD_MINUTES, DAY_END)
      roadSlots.push(...lib.timeToSlots(app.g.appoint.timeEnd, endAfter))
    }
    console.log('roadSlots: ', roadSlots)
    let teachers = []
    const dayStart = new Date(lib.formatDate(app.g.appoint.startTime))
    const dayEnd = new Date(dayStart.getTime() + 1000*3600*24)
    return lib.request('/teachers?bDeleted=0&userId[$gt]=0&$limit=50') // TODO: hard-coding
      .then(res => Promise.all(res.data.map(teacher => lib.request(
        `/takens?teacherId=${teacher.id}&startTime[$gt]=${dayStart.toISOString()}&startTime[$lt]=${dayEnd.toISOString()}&$limit=50`) // TODO: hard-coding, each teacher on each day
        .then(res => {
          if(!res.data.some(taken => {
            if(taken.appointId == app.g.appoint.id) {
              return false
            }
            if(taken.expiration && new Date(taken.expiration) < new Date()) { // expired
              return false
            }
            if(taken.type==lib.TAKEN_CLASS || taken.type==lib.TAKEN_CLASS_RES) {
              return taken.slots.some(slot=>classSlots.some(i=>i==slot)||roadSlots.some(i=>i==slot))
            }
            return taken.slots.some(slot=>classSlots.some(i=>i==slot))
          })) {
            teachers.push(teacher)
          }
        })))
      )
      .then(() => teachers)
      .catch(err => lib.errorHandler({ page: 'appoint', function: 'findTeacher', error: err }))
  },
  onCancel() {
    const bRefund = (new Date(this.data.appoint.startTime).getTime() - new Date().getTime()) > 1000*3600*lib.CANCEL_HOURS
    const msg = bRefund ? '您将获得全额退款' : '您不会获得退款'
    return lib.promisify(wx.showModal)({
      title     : '警告',
      content   : `您确定要取消预约吗？${msg}（提前${lib.CANCEL_HOURS}小时取消获得全额退款）`,
      showCancel: true
    })
      .then(res => {
        if(res.confirm) {
          return lib.request('/appoints' + this.data.appoint.id, 'PUT', { ...this.data.appoint, status: lib.STATUS_CANCEL_PARENT })
            .then(() => {
              app.g.appoint.status = lib.STATUS_CANCEL_PARENT
              this.setData({ appoint: app.g.appoint })
              lib.request(`/takens?appointId=${this.data.appoint.id}`)
                .then(res => res.data.forEach(item => lib.request('/takens/' + item.id, 'DELETE')))
              if(bRefund) {
                return lib.request(`/payments?appointId=${this.data.appoint.id}&$limit=1`)
                  .then(res => {
                    if(res.data.length == 0) {
                      return Promise.reject('failed to find payment for appointId: ', this.data.appoint.id)
                    }
                    return lib.request('/act', 'POST', {
                      'action': 'getRefund',
                      'value': { paymentId : res.data[0].id }
                    })
                  })
                  .then(res => {
                    if(res == 'SUCCESS') {
                      return lib.promisify(wx.showModal)({ title: '', content: '取消并退款成功', showCancel: false })
                    }
                    return lib.promisify(wx.showModal)({ title: '退款失败', content: res.data.error, showCancel: false })
                  })
              }
              return lib.promisify(wx.showModal)({ title: '', content: '取消成功', showCancel: false })
            })
            .then(() => wx.navigateBack())
            .catch(err => lib.errorHandler({ page: 'appoint', function: 'onRefund', error: err }))
        }
      })
  },
  onDelete() { // cancelled
    return lib.promisify(wx.showModal)({
      title     : '警告',
      content   : `您确定要删除预约吗？`,
      showCancel: true
    })
      .then(res => {
        if(res.confirm) {
          return lib.request('/appoints/' + this.data.appoint.id, 'PUT', { ...this.data.appoint, bHidden: true })
            .then(() => wx.navigateBack())
            .catch(err => lib.errorHandler({ page: 'appoint', function: 'onHide', error: err }))
        }
      })
  },
  onFeedbackStars(e) {
    this.l.feedbackStars = e.detail.value
  },
  onFeedbackChange(e) {
    // console.log('onFeedbackChange: ', e.detail.value)
    let feedbackItems = this.data.feedbackItems
    feedbackItems.forEach(item => item.checked = e.detail.value.some(jtem => jtem == item.value))
    this.setData({ feedbackItems })
  },
  onFeedbackInput(e) {
    this.l.feedbackInput = e.detail.value
  },
  onFeedbackSubmit() {
    // convert feedbackItems & feedbackInput to feedbackStrs
    let feedbackStrs = []
    this.data.feedbackItems.forEach(item => {
      if(item.checked) {
        feedbackStrs.push(item.name)
      }
    })
    if(this.l.feedbackInput) {
      feedbackStrs.push(this.l.feedbackInput)
    }
    return lib.request('/appoints/' + app.g.appoint.id, 'PUT', {
      ...app.g.appoint,
      status: lib.STATUS_FEEDBACK,
      feedbackStars: this.l.feedbackStars,
      feedbackStrs
    })
      .then(() => {
        app.g.appoint.status = lib.STATUS_FEEDBACK
        this.setData({ appoint: app.g.appoint })
        console.log('appoint: ', this.data.appoint)
      })
      .catch(err => lib.errorHandler({ page: 'appoint', function: 'onFeedbackSubmit', error: err }))
  },
  onPullDownRefresh() {
    wx.stopPullDownRefresh()
    this.refresh()
  },
  onShareAppMessage: lib.shareApp
})