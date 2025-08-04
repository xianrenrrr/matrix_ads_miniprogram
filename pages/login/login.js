// pages/login/login.js
Page({
  data: {
    loginMethod: 'password', // 'password' | 'qrcode'
    phone: '',
    password: '',
    loading: false,
    qrCodeScanning: false,
    showPassword: false
  },

  onLoad() {
    console.log('登录页面加载')
    
    // 检查是否已经登录
    const app = getApp()
    if (app.globalData.isLoggedIn) {
      this.redirectToHome()
    }
  },

  // 切换登录方式
  switchLoginMethod(e) {
    const method = e.currentTarget.dataset.method
    this.setData({ 
      loginMethod: method,
      // 重置表单数据
      phone: '',
      password: '',
      qrCodeScanning: false
    })
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value })
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  // 切换密码可见性
  togglePasswordVisibility() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  // 手机号密码登录
  handlePasswordLogin() {
    const { phone, password } = this.data
    
    if (!phone.trim()) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }
    
    // 验证手机号格式
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      wx.showToast({
        title: '请输入有效的手机号',
        icon: 'none'
      })
      return
    }
    
    if (!password.trim()) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      })
      return
    }
    
    this.setData({ loading: true })
    
    const app = getApp()
    
    // 调用登录API
    wx.request({
      url: `${app.globalData.apiBaseUrl}/auth/login`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        phone: phone.trim(),
        password: password.trim(),
        platform: 'miniprogram'
      },
      success: (res) => {
        console.log('登录响应完整数据:', res)
        console.log('状态码:', res.statusCode)
        console.log('响应数据:', res.data)
        
        if (res.statusCode === 200) {
          if (res.data && res.data.success) {
            // 登录成功
            const { token, user } = res.data
            console.log('登录成功，用户信息:', user)
            
            // 检查用户角色
            if (user.role !== 'content_creator') {
              wx.showModal({
                title: '登录失败',
                content: '此小程序仅供内容创作者使用',
                showCancel: false
              })
              this.setData({ loading: false })
              return
            }
            
            // 保存登录信息
            wx.setStorageSync('access_token', token)
            wx.setStorageSync('user_info', user)
            
            // 更新全局状态
            app.globalData.isLoggedIn = true
            app.globalData.userInfo = user
            
            console.log('全局登录状态已更新:', app.globalData.isLoggedIn)
            console.log('全局用户信息:', app.globalData.userInfo)
            
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            })
            
            // 立即跳转，不要延迟
            setTimeout(() => {
              this.redirectToHome()
            }, 1000)
            
          } else {
            // 后端返回失败
            console.log('后端返回失败:', res.data)
            wx.showModal({
              title: '登录失败',
              content: (res.data && res.data.message) || '登录验证失败',
              showCancel: false
            })
          }
        } else {
          // HTTP状态码不是200
          console.log('HTTP错误:', res.statusCode, res.data)
          wx.showModal({
            title: '登录失败',
            content: `服务器错误 (${res.statusCode}): ${(res.data && res.data.message) || '请稍后重试'}`,
            showCancel: false
          })
        }
      },
      fail: (err) => {
        console.error('登录请求失败完整错误:', err)
        console.error('错误类型:', typeof err)
        console.error('错误消息:', err.errMsg)
        
        let errorMsg = '请检查网络连接后重试'
        if (err.errMsg) {
          if (err.errMsg.includes('timeout')) {
            errorMsg = '请求超时，请稍后重试'
          } else if (err.errMsg.includes('fail')) {
            errorMsg = `网络请求失败: ${err.errMsg}`
          }
        }
        
        wx.showModal({
          title: '网络错误',
          content: errorMsg,
          showCancel: false
        })
      },
      complete: () => {
        this.setData({ loading: false })
      }
    })
  },

  // 扫码注册
  handleQRCodeSignup() {
    // 检查相机权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera'] === false) {
          // 用户拒绝过相机权限
          wx.showModal({
            title: '需要相机权限',
            content: '扫码注册需要使用相机，请在设置中开启相机权限',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting()
              }
            }
          })
          return
        }
        
        // 开始扫码
        this.startQRCodeScan()
      }
    })
  },

  // 开始二维码扫描
  startQRCodeScan() {
    this.setData({ qrCodeScanning: true })
    
    wx.scanCode({
      scanType: ['qrCode'],
      success: (res) => {
        console.log('扫码结果:', res)
        this.handleQRCodeResult(res.result)
      },
      fail: (err) => {
        console.error('扫码失败:', err)
        if (err.errMsg !== 'scanCode:fail cancel') {
          wx.showToast({
            title: '扫码失败',
            icon: 'none'
          })
        }
      },
      complete: () => {
        this.setData({ qrCodeScanning: false })
      }
    })
  },

  // 处理二维码扫描结果
  handleQRCodeResult(qrData) {
    console.log('二维码数据:', qrData)
    
    try {
      // 解析二维码数据
      let inviteData
      
      // 检查是否是JSON格式的二维码（新的邀请格式）
      if (qrData.startsWith('{')) {
        inviteData = JSON.parse(qrData)
        
        // 检查是否是邀请注册二维码
        if (inviteData.type === 'signup_invite') {
          this.handleInviteSignup(inviteData)
          return
        }
      }
      
      // 检查是否是URL格式的二维码（旧的邀请链接格式）
      if (qrData.includes('invite-signup')) {
        const url = new URL(qrData)
        const token = url.searchParams.get('token')
        
        if (token) {
          this.handleInviteLinkSignup(token)
          return
        }
      }
      
      throw new Error('无效的邀请二维码格式')
      
    } catch (error) {
      console.error('二维码解析失败:', error)
      wx.showModal({
        title: '二维码无效',
        content: '请扫描管理员生成的有效邀请二维码',
        showCancel: false
      })
    }
  },

  // 处理邀请注册（新格式：JSON二维码）
  handleInviteSignup(inviteData) {
    wx.showModal({
      title: '确认注册',
      content: `您即将加入管理员 ${inviteData.managerName} 的团队，是否继续？`,
      confirmText: '确认注册',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 显示注册表单
          this.showSignupForm(inviteData)
        }
      }
    })
  },

  // 处理邀请链接注册（旧格式：URL链接）
  handleInviteLinkSignup(token) {
    wx.showLoading({ title: '验证邀请中...' })
    
    const app = getApp()
    
    // 先验证邀请是否有效
    wx.request({
      url: `${app.globalData.apiBaseUrl}/auth/validate-invite/${token}`,
      method: 'GET',
      success: (res) => {
        if (res.statusCode === 200 && res.data.success) {
          // 邀请有效，显示确认对话框
          wx.showModal({
            title: '确认注册',
            content: `您即将加入管理员 ${res.data.managerName} 的团队，是否继续？`,
            confirmText: '确认注册',
            cancelText: '取消',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 显示注册表单
                this.showSignupForm({
                  inviteToken: token,
                  managerName: res.data.managerName,
                  inviteeName: res.data.inviteeName
                })
              }
            }
          })
        } else {
          wx.showModal({
            title: '邀请无效',
            content: res.data.message || '邀请已过期或无效',
            showCancel: false
          })
        }
      },
      fail: (err) => {
        console.error('验证邀请失败:', err)
        wx.showModal({
          title: '网络错误',
          content: '请检查网络连接后重试',
          showCancel: false
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  // 显示注册表单
  showSignupForm(inviteData) {
    // 跳转到注册表单页面，传递邀请数据
    wx.navigateTo({
      url: `/pages/signup/signup?inviteData=${encodeURIComponent(JSON.stringify(inviteData))}`
    })
  },

  // 跳转到首页
  redirectToHome() {
    wx.reLaunch({
      url: '/pages/index/index'
    })
  },

  // 忘记密码
  handleForgotPassword() {
    wx.showModal({
      title: '忘记密码',
      content: '请联系管理员重置密码，或在网页端进行密码重置',
      showCancel: false
    })
  },

  // 注册账号
  handleRegister() {
    wx.showModal({
      title: '账号注册',
      content: '请在网页端进行账号注册，注册成功后即可使用小程序',
      confirmText: '知道了',
      showCancel: false
    })
  },

  // 显示帮助信息
  showHelp() {
    wx.showModal({
      title: '注册帮助',
      content: '用户名密码登录：使用已有的账号信息登录\n\n扫码注册：扫描管理员生成的邀请二维码进行快速注册加入团队',
      showCancel: false
    })
  }
})