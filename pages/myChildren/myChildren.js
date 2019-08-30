// my children

const app = getApp()
const lib = require('../../utils/lib')

Page({
  data: {
    students: [],
  },
  onLoad() {
    if(!app.g.bInit) wx.reLaunch({ url: '../init/init' })
    wx.showShareMenu({ withShareTicket: true })
  },
  onShow() {
    this.getList()
  },
  getList() {
    return lib.request(`/students?parentId=${app.g.user.parentId}`)
      .then(res => {
        res.data.forEach(item => {
          item.age = lib.getAgeStr(item.birthday)
        })
        this.setData({ students: res.data })
      })
      .catch(err => lib.errorHandler({ page: 'myChildren', function: 'getList', error: err }))
  },
  onAdd() {
    app.g.student = null
    wx.navigateTo({ url: '../editChild/editChild' })
  },
  onEdit(e) {
    app.g.student = this.data.students[e.currentTarget.dataset.idx]
    wx.navigateTo({ url: '../editChild/editChild' })
  },
  onDelete(e) {
    let student = this.data.students[e.currentTarget.dataset.idx]
    return lib.promisify(wx.showModal)({
      title     : '警告',
      content   : `您确定要删除${student.name}？`,
      showCancel: true
    })
      .then(res => {
        if(res.confirm) {
          return lib.request(`/appoints?$limit=0&studentId=${student.id}`)
            .then(res => {
              // console.log('query appoints result: ', res)
              if(res.total > 0) {
                lib.promisify(wx.showModal)({ title: '', content: '对不起，孩子有预约或者上过课，不能删除', showCancel: false })
                return
              }
              return lib.request('/students/' + student.id, 'DELETE')
            })
            .then(res => {
              if(res) {
                // console.log('delete result: ', res)
                let students = this.data.students
                students.splice(e.currentTarget.dataset.idx, 1 )
                this.setData({ students })
              }
            })
            .catch(err => lib.errorHandler({ page: 'myChildren', function: 'onDelete', error: err }))
        }
      })
  },
  onShareAppMessage: lib.shareApp
})