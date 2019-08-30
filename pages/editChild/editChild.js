// add/edit a child

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    student   : null,
    bNew      : true,
    startDate : lib.formatDate(new Date().getTime() - 1000*3600*24*365*10), // 10 years old
    endDate   : lib.formatDate(new Date().getTime() - 1000*3600*24*30)      // one month old
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
    const bNew = !app.g.student
    app.g.student = app.g.student || { bMale: false }
    this.setData({ student: app.g.student, bNew })
  },
  onName(e) {
    app.g.student.name = e.detail.value
  },
  onSex(e) {
    app.g.student.bMale = e.detail.value == 1
    this.setData({ student: app.g.student })
  },
  onBirthday(e) {
    app.g.student.birthday = e.detail.value
    this.setData({ student: app.g.student })
  },
  onSave() {
    if(!app.g.student.name) {
      lib.promisify(wx.showModal)({ title: '错误', content: '名字不能为空', showCancel: false })
      return
    }
    if(!app.g.student.birthday) {
      lib.promisify(wx.showModal)({ title: '错误', content: '生日不能为空', showCancel: false })
      return
    }
    if(this.data.bNew) {
      return lib.request('/students', 'POST', {
        ...app.g.student,
        parentId: app.g.user.parentId
      })
      .then(res => {
        // console.log('add student res: ', res)
        wx.navigateBack()
      })
      .catch(err => {
        lib.errorHandler({ page: 'editChild', function: 'onSave-create', error: err })
      })
    } else {
      return lib.request('/students/' + app.g.student.id, 'PUT', app.g.student)
        .then(res => {
          // console.log('edit student res: ', res)
          wx.navigateBack()
        })
        .catch(err => lib.errorHandler({ page: 'editChild', function: 'onSave-patch', error: err }))
      }
  },
  onShareAppMessage: lib.shareApp
})