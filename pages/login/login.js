// pages/login/login.js
Page({
  data: {
    agreed: false,
    showAgreementModal: false
  },

  onLoad(options) {
    console.log('登录页加载，参数:', options)

    // If there's a scene parameter (QR code scan), ALWAYS redirect to signup
    // Even existing users need to join the new group via signup flow
    if (options && options.scene) {
      console.log('✅ 检测到QR码扫描，重定向到注册页面加入群组:', options.scene)
      wx.redirectTo({
        url: `/pages/signup/signup?scene=${options.scene}`
      })
      return
    }

    // No QR code - check if user is already logged in for normal app launch
    const token = wx.getStorageSync('access_token')
    const userInfo = wx.getStorageSync('user_info')

    if (token && userInfo) {
      console.log('✅ 用户已登录，重定向到首页')
      wx.redirectTo({
        url: '/pages/index/index'
      })
      return
    }

    console.log('❌ 用户未登录，显示登录页面')

    // Restore agreement state from storage
    const agreed = wx.getStorageSync('terms_agreed') || false
    this.setData({ agreed })
  },

  // 切换协议同意状态
  toggleAgreement() {
    const next = !this.data.agreed
    this.setData({ agreed: next })
    wx.setStorageSync('terms_agreed', next)
  },

  // 手机登录
  handlePhoneLogin() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户使用协议', icon: 'none' })
      return
    }
    // 跳转到手机登录页面
    wx.navigateTo({
      url: '/pages/phone-login/phone-login'
    })
  },

  // 扫码注册
  handleQRSignup() {
    if (!this.data.agreed) {
      wx.showToast({ title: '请先同意用户使用协议', icon: 'none' })
      return
    }
    // 跳转到扫码注册页面
    wx.navigateTo({
      url: '/pages/signup/signup'
    })
  },

  // 显示用户协议
  showUserAgreement() {
    this.setData({
      showAgreementModal: true
    })
  },

  // 隐藏用户协议
  hideUserAgreement() {
    this.setData({
      showAgreementModal: false
    })
  },

  // 同意协议并关闭
  agreeAndClose() {
    this.setData({
      agreed: true,
      showAgreementModal: false
    })
    wx.setStorageSync('terms_agreed', true)
    wx.showToast({
      title: '已同意用户协议',
      icon: 'success'
    })
  }
});
