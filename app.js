// app.js
const config = require('./utils/config.js')

App({
  onLaunch() {
    // 小程序启动时触发
    console.log('Matrix Ads Mini Program Launch')
    
    // 检查是否有新版本
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新结果:', res.hasUpdate)
      })
      
      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })
    }
    
    // 初始化全局数据
    this.globalData = {
      userInfo: null,
      templates: [],
      currentTemplate: null,
      apiBaseUrl: config.api.baseUrl, // 使用配置文件中的API地址
      isLoggedIn: false
    }
    
    // 检查登录状态
    this.checkLoginStatus()
  },
  
  onShow() {
    console.log('Matrix Ads Mini Program Show')
  },
  
  onHide() {
    console.log('Matrix Ads Mini Program Hide')
  },
  
  onError(msg) {
    console.error('Mini Program Error:', msg)
  },
  
  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('access_token')
    const userInfo = wx.getStorageSync('user_info')
    
    if (token && userInfo) {
      this.globalData.isLoggedIn = true
      this.globalData.userInfo = userInfo
      // 暂时跳过token验证，直接认为已登录
      console.log('用户已登录:', userInfo)
    } else {
      // 没有登录信息，跳转到登录页
      this.redirectToLogin()
    }
  },
  
  // 验证token
  validateToken(token) {
    wx.request({
      url: `${this.globalData.apiBaseUrl}/auth/validate`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.statusCode === 200) {
          this.globalData.userInfo = res.data
          this.globalData.isLoggedIn = true
        } else {
          this.logout()
        }
      },
      fail: () => {
        this.logout()
      }
    })
  },
  
  // 登出
  logout() {
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    wx.removeStorageSync('access_token')
    wx.removeStorageSync('user_info')
    this.redirectToLogin()
  },

  // 跳转到登录页
  redirectToLogin() {
    wx.reLaunch({
      url: '/pages/login/login'
    })
  },
  
  // 全局数据
  globalData: {}
})