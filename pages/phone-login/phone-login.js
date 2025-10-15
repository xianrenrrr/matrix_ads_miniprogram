// pages/phone-login/phone-login.js
Page({
  data: {
    phone: '',
    password: '',
    loading: false
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({
      phone: e.detail.value
    })
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    })
  },

  // 处理登录
  handleLogin() {
    const { phone, password } = this.data

    // 验证手机号
    if (!phone.trim()) {
      wx.showToast({
        title: '请输入手机号',
        icon: 'none'
      })
      return
    }

    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      wx.showToast({
        title: '请输入有效的手机号',
        icon: 'none'
      })
      return
    }

    // 验证密码
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
        if (res.statusCode === 200 && res.data && res.data.success === true) {
          const responseData = res.data.data || {}

          if (responseData) {
            const { token, user } = responseData

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

            wx.showToast({
              title: '登录成功',
              icon: 'success'
            })

            // 跳转到首页
            setTimeout(() => {
              wx.reLaunch({
                url: '/pages/index/index'
              })
            }, 1000)

          } else {
            let errorMessage = '登录验证失败'
            if (res.data) {
              errorMessage = res.data.error || res.data.message || errorMessage
            }

            // Translate common English error messages to Chinese
            if (typeof errorMessage === 'string') {
              const lower = errorMessage.toLowerCase();
              if (lower.includes('invalid credentials')) {
                errorMessage = '用户名或密码错误';
              } else if (lower.includes('user not found')) {
                errorMessage = '用户不存在';
              } else if (lower.includes('password incorrect')) {
                errorMessage = '密码错误';
              } else if (lower.includes('account locked')) {
                errorMessage = '账户已被锁定';
              } else if (lower.includes('bad request')) {
                errorMessage = '请求参数错误';
              }
            }

            wx.showModal({
              title: '登录失败',
              content: errorMessage,
              showCancel: false
            })
          }
        } else {
          wx.showModal({
            title: '登录失败',
            content: `服务器错误 (${res.statusCode}): ${(res.data && res.data.message) || '请稍后重试'}`,
            showCancel: false
          })
        }
      },
      fail: (err) => {
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

  // 返回上一页
  goBack() {
    // Use reLaunch to ensure proper navigation
    wx.reLaunch({
      url: '/pages/login/login'
    })
  }
});