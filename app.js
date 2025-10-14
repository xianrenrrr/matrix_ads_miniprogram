// app.js
const config = require('./utils/config.js')
const logger = require('./utils/logger')

App({
  onLaunch(options) {
    // 小程序启动时触发
    logger.log('Xpectra AI Mini Program Launch', options)

    // 检查是否有新版本
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      updateManager.onCheckForUpdate((res) => {
        logger.log('检查更新结果:', res.hasUpdate)
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

    // Just initialize login status, let pages handle routing
    this.checkLoginStatus()
  },

  onShow(options) {
    logger.log('Xpectra AI Mini Program Show', options)
    // No need to handle scene parameters here since login page is now the default entry point
    // and will handle all routing logic properly
  },

  onHide() {
    logger.log('Xpectra AI Mini Program Hide')
  },

  onError(msg) {
    logger.error('Mini Program Error:', msg)
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('access_token')
    const userInfo = wx.getStorageSync('user_info')

    if (token && userInfo) {
      this.globalData.isLoggedIn = true
      this.globalData.userInfo = userInfo
      // 暂时跳过token验证，直接认为已登录
      logger.log('用户已登录:', userInfo)
    } else {
      // 开发阶段：没有登录信息也不强制跳转登录
      this.globalData.isLoggedIn = false
      this.globalData.userInfo = null
      logger.warn('未检测到登录信息，暂时跳过登录流程')
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
        // Handle new ApiResponse format: {success, message, data, error}
        const isApiSuccess = res.data && res.data.success === true;
        const responseData = res.data && res.data.data ? res.data.data : {};

        if (res.statusCode === 200 && isApiSuccess) {
          this.globalData.userInfo = responseData;
          this.globalData.isLoggedIn = true;
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
