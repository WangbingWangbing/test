const cfg = require('../config')
const app = getApp()

const TOKEN_VALID_MS = 1000*3600*24*5 // 5 days
let jwt_token      = null
let jwt_expiration = 0    // milliseconds

const dateStrToInt = date => { // YYYY/MM/DD
  const dateArray = date.split('/')
  if(dateArray.length != 3) {
    console.log('error: dateArray length is not 3: ', dateArray)
    return
  }
  return 10000 * dateArray[0] + 100 * dateArray[1] + 1 * dateArray[2]
}

const errorHandler = err => {
  if(err.error.code === 401) { // not authenticated
    console.log('not authenticated')
    // relogin() // not needed
  } else {
    console.log('errorHandler: ', err)
    request('/errors', 'POST', { content: { mpName: cfg.mpName, version: cfg.version, ...err }})
  }
}

// YYYY/MM/DD
const formatDate = time => {
  if(time == null) return null
  let date   = new Date(time)
  let year   = date.getFullYear()
  let month  = date.getMonth() + 1
  let day    = date.getDate()
  return [year, month, day].map(formatNumber).join('/')
}

// YYYYMMDD
const formatDateInt = time => {
  const date = new Date(time)
  return date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate()
}

// MD
const formatDateMD = time => {
  if(time == null) return null
  let date   = new Date(time)
  let month  = date.getMonth() + 1
  let day    = date.getDate()
  return [month, day].join('/')
}

// YYYY/MM/DD HH:mm
const formatDateTime = time => {
  if(time == null) return null
  const date   = new Date(time)
  const year   = date.getFullYear()
  const month  = date.getMonth() + 1
  const day    = date.getDate()
  const hour   = date.getHours()
  const minute = date.getMinutes()
  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute].map(formatNumber).join(':')
}

// YYYY/MM/DD 星期D
const formatDateWithWeek = time => {
  if(time == null) return null
  const date   = new Date(time)
  const year   = date.getFullYear()
  const month  = date.getMonth() + 1
  const day    = date.getDate()
  const w      = date.getDay()
  let wDesc  = ''
  if(w==0) wDesc = '星期天'
  else if(w==1) wDesc = '星期一'
  else if(w==2) wDesc = '星期二'
  else if(w==3) wDesc = '星期三'
  else if(w==4) wDesc = '星期四'
  else if(w==5) wDesc = '星期五'
  else if(w==6) wDesc = '星期六'
  return [year, month, day].map(formatNumber).join('/') + ' ' + wDesc
}

// YYYY/MM/DD 周D
const formatDateWithWeek2 = time => {
  if(time == null) return null
  const date   = new Date(time)
  const year   = date.getFullYear()
  const month  = date.getMonth() + 1
  const day    = date.getDate()
  const w      = date.getDay()
  let wDesc  = ''
  if(w==0) wDesc = '周日'
  else if(w==1) wDesc = '周一'
  else if(w==2) wDesc = '周二'
  else if(w==3) wDesc = '周三'
  else if(w==4) wDesc = '周四'
  else if(w==5) wDesc = '周五'
  else if(w==6) wDesc = '周六'
  return [year, month, day].map(formatNumber).join('/') + ' ' + wDesc
}

// M/D 周D
const formatDateWithWeek3 = time => {
  if(time == null) return null
  const date   = new Date(time)
  const month  = date.getMonth() + 1
  const day    = date.getDate()
  const w      = date.getDay()
  let wDesc  = ''
  if(w==0) wDesc = '周日'
  else if(w==1) wDesc = '周一'
  else if(w==2) wDesc = '周二'
  else if(w==3) wDesc = '周三'
  else if(w==4) wDesc = '周四'
  else if(w==5) wDesc = '周五'
  else if(w==6) wDesc = '周六'
  return wDesc + ' ' + [month, day].join('-')
}

// DD or 0D
const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

// HH:mm
const formatTimeHHmm = time => {
  if(time == null) return null
  let date   = new Date(time)
  let hour   = date.getHours()
  let minute = date.getMinutes()
  return [hour, minute].map(formatNumber).join(':')
}

const getAgeInMonths = birthday => {
  return Math.floor((new Date() - new Date(birthday)) / (1000*3600*24*30))
}

const getAgeStr = birthday => {
  let years = 0
  let months = Math.floor((new Date() - new Date(birthday)) / (1000*3600*24*30))
  if (months >= 12) {
    years = Math.floor(months/12)
    months = months - years * 12
  }
  let res = ''
  if(years > 0)
    res += `${years}岁`
  if(months > 0)
    res += `${months}个月`
  return res
}

const getUser = () => {
  jwt_token      = wx.getStorageSync('jwt_token')
  jwt_expiration = wx.getStorageSync('jwt_expiration')
  let userId     = wx.getStorageSync('userId')
  if(!jwt_token || !jwt_expiration || jwt_expiration < new Date().getTime()) {
    return promisify(wx.login)()
      .then(res1 => promisify(wx.getUserInfo)()
        .then(res2 => login(res1.code, res2.encryptedData, res2.iv)))
  } else {
    return request('/users/' + userId)
      .then(res => {
        app.g.user = res
        if(app.g.user.parentId) {
          request('/parents/' + app.g.user.parentId).then(res => app.g.user.parent = res)
        }
        if(app.g.user.teacherId) {
          request('/teachers/' + app.g.user.teacherId).then(res => app.g.user.teacher = res)
        }
      })
  }
}

const isPhone = str => str && str.length == 11 && str[0] == 1

const login = (code, encryptedData, iv) => {
  wx.showLoading({ title: '登录中...' })
  return promisify(wx.request)({
    method: 'POST',
    url   : cfg.serverUrl + '/authentication',
    data  : {
    'mpName'        : cfg.mpName,
    'strategy'      : 'local',
    'username'      : 'a',  // must be of length 1
    'password'      : '1',  // must be of length 1
    'code'          : code,
    'encryptedData' : encryptedData,
    'iv'            : iv
  }})
    .then(res => {
      wx.hideLoading()
      // console.log('login res: ', res.data)
      if(!res.data.accessToken) {
        return Promise.reject({error: 'failed to login'})
      }
      jwt_token  = res.data.accessToken
      jwt_expiration = new Date().getTime() + TOKEN_VALID_MS
      app.g.user = res.data.user
      promisify(wx.setStorage)({ key: 'jwt_token',      data: jwt_token })
      promisify(wx.setStorage)({ key: 'jwt_expiration', data: jwt_expiration })
      promisify(wx.setStorage)({ key: 'userId',         data: app.g.user.id })
      if(app.g.user.parentId) {
        request('/parents/' + app.g.user.parentId).then(res => app.g.user.parent = res)
      }
      if(app.g.user.teacherId) {
        request('/teachers/' + app.g.user.teacherId).then(res => app.g.user.teacher = res)
      }
    })
    .then(() => console.log('user: ', app.g.user))
    .catch(err => { // if hit server, never called
      wx.hideLoading()
      console.log('failed to call authentication: ', err)
      return Promise.reject(err)
    })
}

const promisify = f => args => new Promise((resolve, reject) => f({ ...args, success: resolve, fail: reject }))

// method: OPTIONS, GET, HEAD, POST, PUT, DELETE, TRACE, CONNECT
// DO NOT USE PATCH, it works on Mac, fails on both Android and iPhone
const request = (url, method='GET', data={}) => {
  return Promise.resolve()
    .then(() => {
      if(!jwt_token || !jwt_expiration || jwt_expiration < new Date().getTime()) {
        return promisify(wx.login)()
          .then(res1 => promisify(wx.getUserInfo)()
            .then(res2 => login(res1.code, res2.encryptedData, res2.iv)))
      }
      return null
    })
    .then(() => promisify(wx.request)({
      method, data,
      url     : cfg.serverUrl + url,
      header  : { 'Authorization': 'Bearer ' + jwt_token }
    }))
    .then(res => res.data)
    .catch(err => {
      console.log('request error: ', err)
      if(err.errMsg.startsWith('request:fail')) {
        wx.showToast({ title: '网络连接不可用，请稍后再试', icon: 'none', duration: 3000 })
      }
    })
}

const shareApp = () => {
  let title = cfg.mpTitle
  let imageUrl = cfg.mpImage
  let path = '/pages/init/init'
  if(cfg.mpName == 'mpParent' && app.g.course) {
    title = app.g.course.title
    imageUrl = app.g.course.titleImg
    path += '?c=' + app.g.course.id
  }
  return {
    title, imageUrl, path,
    success : res => console.log('shareApp res: ', res),
    fail    : err => {
      if(!err.errMsg.includes('fail cancel'))
        errorHandler({ page: 'lib', function: 'shareApp', err })
    }
  }
}

const timeIntToStr = i => `${Math.floor(i/100)}:${i%100}`

const timeStrToInt = time => { // HH:mm
  let timeArray = time.split(':')
  return 100 * timeArray[0] + 1 * timeArray[1]
}

const timeToSlots = (start, end) => {
  start = new Date(start)
  end   = new Date(end)
  const startSlot = (start.getHours() * 60 + start.getMinutes()) / 15
  const endSlot   = (end.getHours()   * 60 + end.getMinutes())   / 15
  let slots = []
  for(let i=startSlot; i<endSlot; i++) {
    slots.push(i)
  }
  return slots
}

module.exports = {
  ageImgs: {
    '3-9个月': '../../images/age1.png',
    '10-18个月': '../../images/age2.png',
    '19个月-6岁': '../../images/age3.png'
  },
  // begin same as server
  STATUS_NOT_PAID      : 10, // [0,49], ordered
    STATUS_EXPIRED     : 11, // [0,49], ordered derived from 10, not used on server
  STATUS_PAID          : 20, // [0,49], ordered
    STATUS_IN_CLASS    : 21, // [0,49], ordered derived from 20, not used on server
    STATUS_NO_FEEDBACK : 22, // [0,49], ordered derived from 20, not used on server
  STATUS_FEEDBACK      : 30, // [0,49], ordered
  STATUS_CANCEL_ADMIN  : 50, // >=50, not ordered
  STATUS_CANCEL_PARENT : 51, // >=50, not ordered
  STATUS_CANCEL_SYSTEM : 52, // >=50, not ordered
  TAKEN_CLASS          : 10,
  TAKEN_ROAD           : 11,
  TAKEN_CLASS_RES      : 20, // RES for reservation
  TAKEN_ROAD_RES       : 21,
  TAKEN_TIME_OFF       : 30,
  DAYS_MIN             : 2,
  DAYS_MAX             : 14,
  DAYS_MAX_TEACHER     : 21,
  DAY_START            : '09:00',
  DAY_END              : '21:00',
  RES_MINUTES          : 30, // minutes
  CLASS_MINUTES        : 45, // minutes
  ROAD_MINUTES         : 90, // minutes
  RESERVE_MINUTES      : 2,  // minutes
  CANCEL_HOURS         : 48,
  // end same as server
  appointStatus: {
    10: { text: '待支付', desc: '待支付',       color: '#9C3848' },
    11: { text: '已过期', desc: '已过期',       color: '#FFAD69' },
    20: { text: '待上课', desc: '待上课',       color: '#046865' },
    21: { text: '上课中', desc: '上课中',       color: '#DA2C38' },
    22: { text: '待评价', desc: '待评价',       color: '#59114D' },
    30: { text: '已评价', desc: '已评价',       color: '#0F0A0A' },
    50: { text: '已取消', desc: '已取消-管理员', color: '#3E505B' },
    51: { text: '已取消', desc: '已取消-家长',   color: '#3E505B' },
    52: { text: '已取消', desc: '已取消-系统',   color: '#3E505B' }
  },
  takenStatus: {
    10: { color: '#D86E6E' },
    11: { color: '#F0C987' },
    20: { color: '#FFA5AB' },
    21: { color: '#F9DBBD' },
    30: { color: '#89BD9E' },
  },

  cfg,

  dateStrToInt,
  errorHandler,
  formatDate,
  formatDateInt,
  formatDateMD,
  formatDateTime,
  formatDateWithWeek,
  formatDateWithWeek2,
  formatDateWithWeek3,
  formatNumber,
  formatTimeHHmm,
  getAgeInMonths,
  getAgeStr,
  getUser,
  login,
  promisify,
  isPhone,
  request,
  shareApp,
  timeIntToStr,
  timeStrToInt,
  timeToSlots,
}
