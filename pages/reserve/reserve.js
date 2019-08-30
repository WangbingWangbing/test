// make a reservation

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    user      : null,
    students  : [],
    student   : null,     // selected student
    lengths   : [ 2, 3, 4],
    nSessions : 2,        // selected nSessions
    courses   : [],
    course1   : null,     // selected course1
    course3   : null,     // selected course3
    course4   : null,     // selected course4
    dateTimes : [[], []], // for display only
    dtIndices : [0, 0],   // for display only
    timeDesc  : '',
  },
  l: {
    dates     : [],       // contains teachers and times; teachers contains takens of that date; time contains bValid
    dateIdx   : 0,        // selected date
    timeIdx   : 0,        // selected time
    takens    : [],
    comments  : '',
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
    app.g.student = null // to prepare to go to editChild page
    this.refresh()
  },
  onShow() {
    // if(!app.g.bInit) return
    this.setData({ user: app.g.user })
  },
  refresh() {
    this.getChildren().then(() => this.getCourses())
    this.getTakens().then(() => this.getTeachers())
      .then(() => wx.hideLoading())   // hide loading from onPicker()
      .catch(() => wx.hideLoading())
  },
  getChildren() {
    return lib.request(`/students?parentId=${app.g.user.parentId}`)
      .then(res => {
        res.data.forEach(item => {
          item.desc = `${item.name} (${lib.getAgeStr(item.birthday)})`
          item.ageInMonths = lib.getAgeInMonths(item.birthday)
        })
        this.setData({ students: res.data })
        if(this.data.student && !this.data.students.some(item => item.id === this.data.student.id)) { // check if still an option
          this.setData({ student: null })
        }
        if(!this.data.student && this.data.students.length > 0) {
          this.setData({ student: this.data.students[0] })
        }
      })
      .catch(err => lib.errorHandler({ page: 'reserve', function: 'getChildren', error: err }))
  },
  getCourses() { // use student.ageInMonths
    if(!this.data.student) return
    return lib.request(`/courses?$limit=50&minMonths[$lte]=${this.data.student.ageInMonths}&maxMonths[$gte]=${this.data.student.ageInMonths}`) // TODO: hard-coding
      .then(res => {
        // res.data.forEach(item => {
        // })
        // console.log('getCourses res: ', res)
        this.setData({ courses: res.data })
        if(this.data.course1 && !this.data.courses.some(item => item.id === this.data.course1.id)) { // check if still an option
          this.setData({ course1: null })
        }
        if(!this.data.course1 && this.data.courses.length > 0) {
          this.setData({ course1: this.data.courses[0] })
        }
        if(this.data.course3 && !this.data.courses.some(item => item.id === this.data.course3.id)) { // check if still an option
          this.setData({ course3: null })
        }
        if(!this.data.course3 && this.data.courses.length > 0) {
          this.setData({ course3: this.data.courses[0] })
        }
        if(this.data.course4 && !this.data.courses.some(item => item.id === this.data.course4.id)) { // check if still an option
          this.setData({ course4: null })
        }
        if(!this.data.course4 && this.data.courses.length > 0) {
          this.setData({ course4: this.data.courses[0] })
        }
      })
      .catch(err => lib.errorHandler({ page: 'reserve', function: 'getCourses', error: err }))
  },
  getTakens(skip=0) {
    const today = new Date(lib.formatDate(new Date()))
    const start = new Date(today.getTime() + 1000 * 3600 * 24 * lib.DAYS_MIN)
    const end   = new Date(today.getTime() + 1000 * 3600 * 24 * (lib.DAYS_MAX+1))
    return lib.request(`/takens?$skip=${skip}&$limit=500&startTime[$gt]=${start.toISOString()}&startTime[$lt]=${end.toISOString()}`)
      .then(res => {
        res.data.forEach(taken => taken.dateInt = lib.formatDateInt(taken.startTime)) // not in DB anymore
        this.l.takens = [...this.l.takens, ...res.data]
        skip += 500
        if(res.total > skip) {
          return this.getTakens(skip)
        }
        // console.log('takens: ', this.l.takens)
      })
      .catch(err => lib.errorHandler({ page: 'reserve', function: 'getTakens', error: err }))
  },
  getTeachers() {
    return lib.request('/teachers?bDeleted=0&userId[$gt]=0&$limit=100') // TODO: hard-coding to 100 teachers
      .then(res => {
        const teachers = res.data
        const nowStr = lib.formatDate(new Date())
        let times= []
        const clock = new Date(nowStr + ' ' + lib.DAY_START)
        for(let i=0; i<20*60/lib.RES_MINUTES; i++) {
          const time = new Date(clock.getTime() + 1000*60 * lib.RES_MINUTES * i)
          if(time.getTime() < new Date(nowStr + ' ' + lib.DAY_END).getTime()) {
            times.push({
              start : lib.formatTimeHHmm(time),
              // end: // will be set in updateDateTimes
              bValid: true // will be updated in validateDateTimes()
            })
          }
        }
        this.l.dates = []
        const today = new Date(nowStr);
        for(let i=lib.DAYS_MIN; i<=lib.DAYS_MAX; i++) {
          let newTimes = []
          times.forEach(time => newTimes.push(Object.assign({}, time)))
          let newTeachers = []
          teachers.forEach(teacher => newTeachers.push(Object.assign({}, teacher)))
          const day = new Date(today.getTime() + 1000*3600*24 * i)
          this.l.dates.push({
            dateInt : lib.formatDateInt(day), // needed to compare with taken.dateInt
            date    : lib.formatDate(day),
            display : lib.formatDateWithWeek2(day),
            times   : newTimes,
            teachers: newTeachers
          })
        }
        // separate takens to each date and teacher
        this.l.dates.forEach(date => {
          date.teachers.forEach(teacher => {
            teacher.takens = []
            this.l.takens.forEach(taken => {
              if(taken.dateInt == date.dateInt && taken.teacherId == teacher.id) {
                teacher.takens.push(taken)
              }
            })
          })
        })
        this.validateDateTimes()
        this.updateDateTimes()
      })
      .catch(err => lib.errorHandler({ page: 'reserve', function: 'getTeachers', error: err }))
  },
  validateDateTimes() { // use this.data.nSessions
    const DAY = '2019/01/01'
    const DAY_START = new Date(DAY + ' ' + lib.DAY_START).getTime()
    const DAY_END   = new Date(DAY + ' ' + lib.DAY_END).getTime()
    const now = new Date().getTime()
    this.l.dates.forEach(date => {
      date.times.forEach(time => {
        const timeStart = new Date(DAY + ' ' + time.start)
        const timeEnd = new Date(timeStart.getTime() + 1000*60*lib.CLASS_MINUTES * this.data.nSessions)
        let classSlots = lib.timeToSlots(timeStart, timeEnd)
        let roadSlots = []
        if(DAY_START < timeStart.getTime()) {
          const startBefore = new Date(Math.max(timeStart.getTime() - 1000*60*lib.ROAD_MINUTES, DAY_START))
          roadSlots.push(...lib.timeToSlots(startBefore, timeStart))
        }
        if(DAY_END > timeEnd.getTime()) {
          const endAfter = new Date(Math.min(timeEnd.getTime() + 1000*60*lib.ROAD_MINUTES, DAY_END))
          roadSlots.push(...lib.timeToSlots(timeEnd, endAfter))
        }
        time.bValid = timeEnd <= DAY_END && date.teachers.some(teacher=>!teacher.takens.some(taken => {
          if(taken.expiration && new Date(taken.expiration).getTime() < now) { // expired
            return false
          }
          if(taken.type==lib.TAKEN_CLASS || taken.type==lib.TAKEN_CLASS_RES) {
            return taken.slots.some(slot=>classSlots.some(i=>i==slot)||roadSlots.some(i=>i==slot))
          }
          return taken.slots.some(slot=>classSlots.some(i=>i==slot))
        }))
      })
    })
    // console.log('dates: ', this.l.dates)
  },
  // use this.l.date, this.data.nSessions and this.l.dateIdx to update picker choices
  updateDateTimes() {
    let dateTimes = [[], []]
    this.l.dates.forEach(date => dateTimes[0].push({ desc: date.display, date: date.date }))
    this.l.dateIdx = Math.min(this.l.dateIdx, dateTimes[0].length-1)
    this.l.dates[this.l.dateIdx].times.forEach(time => {
      time.end = lib.formatTimeHHmm(new Date('2000/01/01 ' + time.start).getTime() + this.data.nSessions*60*1000*lib.CLASS_MINUTES)
      if(time.bValid) {
        dateTimes[1].push({ desc: `${time.start}-${time.end}`, start: time.start, end: time.end })
      }
    })
    if(dateTimes[1].length == 0) {
      // console.log('deleting a date from this.l.dates: ', this.l.dates[this.l.dateIdx])
      this.l.dates.splice(this.l.dateIdx, 1) // delete a date from this.l.dates
      if(this.l.dates.length == 0) {
        return lib.promisify(wx.showModal)({ title: '', content: '对不起，所有时间全部约满了，请明天再约', showCancel: false })
          .then(() => wx.switchTab({ url: '../home/home' }))
      } else {
        this.updateDateTimes()
      }
      return
    }
    this.l.timeIdx = Math.min(this.l.timeIdx, dateTimes[1].length-1)
    this.setData({
      dateTimes,
      dtIndices: [this.l.dateIdx, this.l.timeIdx],
      timeDesc: `${dateTimes[0][this.l.dateIdx].date} ${dateTimes[1][this.l.timeIdx].desc}`
    })
    // console.log('dateTimes: ', dateTimes)
    // console.log('dates: ', this.l.dates)
  },
  onStudent(e) {
    this.setData({ student: this.data.students[e.detail.value] })
    this.getCourses()
  },
  onLength(e) {
    this.setData({ nSessions: this.data.lengths[e.detail.value] })
    this.updateDateTimes()
  },
  onCourse1(e) {
    this.setData({ course1: this.data.courses[e.detail.value] })
  },
  onCourse3(e) {
    this.setData({ course3: this.data.courses[e.detail.value] })
  },
  onCourse4(e) {
    this.setData({ course4: this.data.courses[e.detail.value] })
  },
  onPicker() {
    if(!this.data.timeDesc) {
      wx.showLoading({ title: '获取数据中...', mask: false }) // will be hidden when refresh finishes
    }
  },
  onTime(e) {
    // console.log('onTime: ', e)
    this.l.timeIdx = e.detail.value[1]
    this.setData({ timeDesc: `${this.data.dateTimes[0][this.l.dateIdx].date} ${this.data.dateTimes[1][this.l.timeIdx].desc}` })
  },
  onColumnChange(e) {
    if(e.detail.column == 0) {
      this.l.dateIdx = e.detail.value
      this.updateDateTimes()
    }
  },
  onComments(e) {
    this.l.comments = e.detail.value
  },
  onSubmit() {
    let title = this.data.course1.title
    if(this.data.nSessions > 2) {
      if(this.data.course3 && this.data.course3.title !== title || this.data.course4 && this.data.course4.title !== title) {
        title += '等'
      }
    }
    let data = {
      status        : lib.STATUS_NOT_PAID,
      startTime     : new Date(this.data.dateTimes[0][this.l.dateIdx].date + ' ' + this.data.dateTimes[1][this.l.timeIdx].start),
      endTime       : new Date(this.data.dateTimes[0][this.l.dateIdx].date + ' ' + this.data.dateTimes[1][this.l.timeIdx].end),
      address       : app.g.user.parent.address,
      parentPhone   : app.g.user.phone,
      parentName    : app.g.user.parent.name || app.g.user.wxNickName,
      parentComments: this.l.comments,
      nSessions     : this.data.nSessions,
      title,
      courseId1     : this.data.course1.id,
      courseId2     : this.data.course1.id,
      courseId3     : this.data.course3 ? this.data.course3.id : 0,
      courseId4     : this.data.course4 ? this.data.course4.id : 0,
      parentId      : app.g.user.parent.id,
      studentId     : this.data.student.id,
    }
    return lib.request('/appoints', 'POST', data)
      .then(res => {
        if(res) {
          app.g.appoint = res
          // add objects
          app.g.appoint.student = this.data.student
          app.g.appoint.course1 = this.data.course1
          app.g.appoint.course2 = this.data.course1
          app.g.appoint.course3 = this.data.course3
          app.g.appoint.course4 = this.data.course4
          wx.navigateTo({ url: '../appoint/appoint' })
        }
      })
      .catch(err => lib.errorHandler({ page: 'reserve', function: 'onSubmit', error: err }))
  },
  onPullDownRefresh() {
    wx.stopPullDownRefresh()
    this.setData({
      user      : app.g.user,
      dtIndices : [0, 0],
      timeDesc  : '',
    })
    this.l.dateIdx = 0
    this.l.timeIdx = 0
    this.l.dates = []
    this.refresh()
  },

  onShareAppMessage: lib.shareApp
})