// pages/login/login.js
Page({
  data: {
    agreed: false,
    showAgreementModal: false
  },

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
    })
  },

  // 手机登录
  handlePhoneLogin() {
    // 跳转到手机登录页面
    wx.navigateTo({
      url: '/pages/phone-login/phone-login'
    })
  },

  // 扫码注册
  handleQRSignup() {
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
    wx.showToast({
      title: '已同意用户协议',
      icon: 'success'
    })
  }
});