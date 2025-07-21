// pages/login/login.js
Page({
  data: {
    loginMethod: 'password', // 'password' | 'qrcode'
    username: '',
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
      username: '',
      password: '',
      qrCodeScanning: false
    })
  },

  // 输入用户名
  onUsernameInput(e) {
    this.setData({ username: e.detail.value })
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({ password: e.detail.value })
  },

  // 切换密码可见性
  togglePasswordVisibility() {
    this.setData({ showPassword: !this.data.showPassword })
  },

  // 用户名密码登录
  handlePasswordLogin() {
    const { username, password } = this.data
    
    if (!username.trim()) {
      wx.showToast({
        title: '请输入用户名',
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
        username: username.trim(),
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

  // 扫码登录
  handleQRCodeLogin() {
    // 检查相机权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.camera'] === false) {
          // 用户拒绝过相机权限
          wx.showModal({
            title: '需要相机权限',
            content: '扫码登录需要使用相机，请在设置中开启相机权限',
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
      let loginData
      
      // 检查是否是JSON格式的二维码
      if (qrData.startsWith('{')) {
        loginData = JSON.parse(qrData)
      } else {
        // 检查是否是URL格式的二维码
        const url = new URL(qrData)
        const token = url.searchParams.get('token')
        const userId = url.searchParams.get('userId')
        
        if (token && userId) {
          loginData = { token, userId }
        } else {
          throw new Error('无效的二维码格式')
        }
      }
      
      if (!loginData.token) {
        throw new Error('二维码中缺少登录令牌')
      }
      
      // 使用二维码中的令牌进行登录验证
      this.verifyQRCodeLogin(loginData)
      
    } catch (error) {
      console.error('二维码解析失败:', error)
      wx.showModal({
        title: '二维码无效',
        content: '请扫描从网页端生成的有效登录二维码',
        showCancel: false
      })
    }
  },

  // 验证二维码登录
  verifyQRCodeLogin(loginData) {
    wx.showLoading({ title: '验证登录中...' })
    
    const app = getApp()
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/auth/qr-login`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        token: loginData.token,
        userId: loginData.userId,
        platform: 'miniprogram'
      },
      success: (res) => {
        console.log('二维码登录验证响应:', res)
        
        if (res.statusCode === 200 && res.data.success) {
          const { token, user } = res.data
          
          // 检查用户角色
          if (user.role !== 'content_creator') {
            wx.showModal({
              title: '登录失败',
              content: '此小程序仅供内容创作者使用',
              showCancel: false
            })
            return
          }
          
          // 保存登录信息
          wx.setStorageSync('access_token', token)
          wx.setStorageSync('user_info', user)
          
          // 更新全局状态
          app.globalData.isLoggedIn = true
          app.globalData.userInfo = user
          
          console.log('QR登录-全局登录状态已更新:', app.globalData.isLoggedIn)
          console.log('QR登录-全局用户信息:', app.globalData.userInfo)
          
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })
          
          // 立即跳转，不要延迟
          setTimeout(() => {
            this.redirectToHome()
          }, 1000)
          
        } else {
          wx.showModal({
            title: '登录失败',
            content: res.data.message || '二维码已过期或无效',
            showCancel: false
          })
        }
      },
      fail: (err) => {
        console.error('二维码登录验证失败:', err)
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
      title: '登录帮助',
      content: '用户名密码登录：使用网页端注册的账号信息\n\n二维码登录：在网页端登录后生成二维码进行快速登录',
      showCancel: false
    })
  }
})