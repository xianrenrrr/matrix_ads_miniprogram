// pages/signup/signup.js
Page({
  data: {
    inviteInfo: {},
    formData: {
      username: '',
      phone: '',
      password: '',
      confirmPassword: '',
      city: ''
    },
    loading: false,
    agreed: false,
    showAgreementModal: false
  },

  onLoad(options) {
    console.log('注册页面加载, 参数:', options)

    // Extract group ID from scene parameter (WeChat QR code API)
    let groupId = null
    let token = null

    if (options.scene) {
      console.log('通过scene参数进入，scene:', options.scene)
      // URL decode the scene parameter first
      const decodedScene = decodeURIComponent(options.scene)
      // Parse scene parameter: "g=groupId"
      const sceneParams = decodedScene.split('&')
      for (const param of sceneParams) {
        const [key, value] = param.split('=')
        if (key === 'g') {
          // New format: group ID
          groupId = value
          console.log('从scene提取groupId:', value)
          break
        } else if (key === 't') {
          // Legacy format: short token, reconstruct full token
          token = value.startsWith('g') ? value.replace('g', 'group_') : value
          console.log('从短token重构:', value, '->', token)
          break
        } else if (key === 'token') {
          // Legacy format: full token
          token = value
          break
        }
      }
    } else if (options.groupId) {
      // Direct group ID parameter
      groupId = options.groupId
    } else if (options.token) {
      // Fallback: direct token parameter (for backward compatibility)
      token = options.token
    }

    // Handle group ID or token from QR code scan
    if (groupId) {
      console.log('通过二维码扫描进入，groupId:', groupId)
      // Fetch group info by group ID (new simple method)
      this.fetchGroupInfoById(groupId)
    } else if (token) {
      console.log('通过二维码扫描进入，token:', token)

      try {
        // 尝试解析JSON格式的token (legacy format)
        const inviteData = JSON.parse(decodeURIComponent(token))
        this.handleSignupWithInviteData(inviteData)
      } catch (error) {
        console.error('解析token失败，尝试从API获取群组信息:', error)
        // 如果解析失败，从API获取群组信息
        this.fetchGroupInfoByToken(token)
      }
    } else if (options.inviteData) {
      // Legacy invite data format
      try {
        const inviteInfo = JSON.parse(decodeURIComponent(options.inviteData))
        console.log('解析邀请信息:', inviteInfo)

        this.setData({ inviteInfo: inviteInfo })
      } catch (error) {
        console.error('解析邀请数据失败:', error)
        wx.showModal({
          title: '数据错误',
          content: '邀请信息解析失败，请重新扫描二维码',
          showCancel: false,
          success: () => {
            // Use reLaunch to ensure proper navigation
            wx.reLaunch({
              url: '/pages/login/login'
            })
          }
        })
      }
    } else {
      // No parameters - show QR scanning interface (default behavior)
      console.log('显示QR扫描界面')
      // Just show the QR scanning interface, no error
    }
  },

  // 输入处理
  onUsernameInput(e) {
    this.setData({ 'formData.username': e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ 'formData.phone': e.detail.value })
  },

  onPasswordInput(e) {
    this.setData({ 'formData.password': e.detail.value })
  },

  onConfirmPasswordInput(e) {
    this.setData({ 'formData.confirmPassword': e.detail.value })
  },

  onCityInput(e) {
    this.setData({ 'formData.city': e.detail.value })
  },

  // 验证表单
  validateForm() {
    const { username, phone, password, confirmPassword, city } = this.data.formData

    if (!username.trim()) {
      wx.showToast({ title: '请输入用户名', icon: 'none' })
      return false
    }

    if (username.trim().length < 2) {
      wx.showToast({ title: '用户名至少2个字符', icon: 'none' })
      return false
    }

    // 手机号校验（中国大陆）
    if (!phone.trim()) {
      wx.showToast({ title: '请输入手机号码', icon: 'none' })
      return false
    }
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      wx.showToast({ title: '请输入有效的手机号码', icon: 'none' })
      return false
    }

    if (!city.trim()) {
      wx.showToast({ title: '请输入城市', icon: 'none' })
      return false
    }

    if (!password.trim()) {
      wx.showToast({ title: '请设置密码', icon: 'none' })
      return false
    }

    if (password.length < 6) {
      wx.showToast({ title: '密码至少6个字符', icon: 'none' })
      return false
    }

    if (password !== confirmPassword) {
      wx.showToast({ title: '两次输入的密码不一致', icon: 'none' })
      return false
    }

    return true
  },

  // 处理注册
  handleSignup() {
    if (!this.validateForm()) {
      return
    }

    this.setData({ loading: true })

    const app = getApp()
    const { inviteInfo, formData } = this.data

    // 准备注册数据
    const signupData = {
      inviteToken: inviteInfo.inviteToken || inviteInfo.token,
      username: formData.username.trim(),
      phone: formData.phone.trim(),
      province: formData.city.trim(), // Use city as province for now
      city: formData.city.trim(),
      password: formData.password,
      role: 'content_creator'
    }

    console.log('发送注册请求:', signupData)

    wx.request({
      url: `${app.globalData.apiBaseUrl}/auth/invite-signup`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Accept-Language': (require('../../utils/translations').getLanguage() === 'zh') ? 'zh-CN,zh;q=0.9' : 'en-US,en;q=0.9'
      },
      data: signupData,
      success: (res) => {
        console.log('注册响应:', res)

        // Handle new ApiResponse format: {success, message, data, error}
        const isApiSuccess = res.data && res.data.success === true;
        const responseData = res.data && res.data.data ? res.data.data : {};

        if (res.statusCode === 200 && isApiSuccess) {
          // 注册成功
          wx.showToast({ title: '注册成功', icon: 'success' })

          // 显示成功信息并引导用户登录
          setTimeout(() => {
            // Use group info from response if available, otherwise fallback to invite info
            const groupName = responseData.groupName || inviteInfo.groupName || '团队';
            const managerName = responseData.managerName || inviteInfo.managerName || '管理员';
            const role = responseData.role || 'content_creator';
            const roleZh = role === 'content_manager' ? '内容管理员' : '内容创作者';

            wx.showModal({
              title: '恭喜！',
              content: `你已成为${roleZh}，加入「${groupName}」。\n管理员：${managerName}\n\n请使用刚才设置的账号和密码登录。`,
              confirmText: '去登录',
              showCancel: false,
              success: () => {
                // 重定向到登录页面（确保正确跳转）
                wx.reLaunch({
                  url: '/pages/login/login'
                })
              }
            })
          }, 1500)

        } else {
          // 注册失败 - Handle ApiResponse error format
          let errorMessage = '注册过程中出现错误，请稍后重试';

          if (res.data) {
            // Backend now handles proper i18n, so just use the returned error message
            errorMessage = res.data.message || res.data.error || errorMessage;
          }

          wx.showModal({
            title: '注册失败',
            content: errorMessage,
            showCancel: false
          })
        }
      },
      fail: (err) => {
        console.error('注册请求失败:', err)
        wx.showModal({
          title: '网络错误',
          content: '请检查网络连接后重试',
          showCancel: false
        })
      },
      complete: () => {
        this.setData({ loading: false })
      }
    })
  },

  // 通过group ID从API获取群组信息 (新方法，更简单)
  fetchGroupInfoById(groupId) {
    wx.showLoading({
      title: '获取群组信息...',
      mask: true
    })

    const app = getApp()

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-manager/groups/${groupId}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Accept-Language': (require('../../utils/translations').getLanguage() === 'zh') ? 'zh-CN,zh;q=0.9' : 'en-US,en;q=0.9'
      },
      success: (res) => {
        wx.hideLoading()
        console.log('获取群组信息响应:', res)

        if (res.statusCode === 200 && res.data && res.data.success === true) {
          const groupInfo = res.data.data || {}

          // 设置邀请信息
          this.setData({
            inviteInfo: {
              type: 'group_join',
              token: groupInfo.token,
              inviteToken: groupInfo.token,
              groupName: groupInfo.groupName || '团队',
              managerName: groupInfo.managerName || '管理员',
              groupId: groupInfo.id || groupId,
              description: groupInfo.description,
              memberCount: groupInfo.memberCount,
              isGroupInvite: true
            }
          })

          console.log('群组信息设置成功:', this.data.inviteInfo)
        } else {
          // 获取群组信息失败，使用默认值
          console.error('获取群组信息失败:', res.data)
          this.setData({
            inviteInfo: {
              groupId: groupId,
              groupName: '团队',
              managerName: '管理员',
              isGroupInvite: true
            }
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('获取群组信息失败:', err)

        // 网络错误，使用默认值
        this.setData({
          inviteInfo: {
            groupId: groupId,
            groupName: '团队',
            managerName: '管理员',
            isGroupInvite: true
          }
        })
      }
    })
  },

  // 通过token从API获取群组信息
  fetchGroupInfoByToken(token) {
    wx.showLoading({
      title: '获取群组信息...',
      mask: true
    })

    const app = getApp()

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-manager/groups/token/${token}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Accept-Language': (require('../../utils/translations').getLanguage() === 'zh') ? 'zh-CN,zh;q=0.9' : 'en-US,en;q=0.9'
      },
      success: (res) => {
        wx.hideLoading()
        console.log('获取群组信息响应:', res)

        if (res.statusCode === 200 && res.data && res.data.success === true) {
          const groupInfo = res.data.data || {}

          // 设置邀请信息
          this.setData({
            inviteInfo: {
              type: groupInfo.type || 'group_join',
              token: groupInfo.token || token,
              inviteToken: groupInfo.token || token,
              groupName: groupInfo.groupName || '团队',
              managerName: groupInfo.managerName || '管理员',
              groupId: groupInfo.groupId,
              description: groupInfo.description,
              memberCount: groupInfo.memberCount,
              isGroupInvite: true
            }
          })

          console.log('群组信息设置成功:', this.data.inviteInfo)
        } else {
          // 获取群组信息失败，使用默认值
          console.error('获取群组信息失败:', res.data)
          this.setData({
            inviteInfo: {
              token: token,
              inviteToken: token,
              groupName: '团队',
              managerName: '管理员',
              isGroupInvite: true
            }
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('获取群组信息失败:', err)

        // 网络错误，使用默认值
        this.setData({
          inviteInfo: {
            token: token,
            inviteToken: token,
            groupName: '团队',
            managerName: '管理员',
            isGroupInvite: true
          }
        })
      }
    })
  },

  // 开始扫描二维码
  startScan() {
    wx.scanCode({
      success: (res) => {
        console.log('扫码结果:', res)
        const result = res.result

        // 处理扫码结果，可能是 URL 或者直接的 token
        let inviteData = null

        if (result.includes('token=')) {
          // 从 URL 中提取 token
          const urlParams = new URLSearchParams(result.split('?')[1])
          const tokenParam = urlParams.get('token')

          try {
            // 尝试解析JSON格式的token
            inviteData = JSON.parse(decodeURIComponent(tokenParam))
          } catch (error) {
            console.error('解析token失败:', error)
            inviteData = { token: tokenParam }
          }
        } else {
          // 直接就是 token 或 JSON
          try {
            inviteData = JSON.parse(result)
          } catch (error) {
            inviteData = { token: result }
          }
        }

        if (inviteData) {
          // 使用扫码得到的邀请数据进行注册
          this.handleSignupWithInviteData(inviteData)
        } else {
          wx.showToast({
            title: '无效的邀请码',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('扫码失败:', err)
        if (err.errMsg !== 'scanCode:fail cancel') {
          wx.showToast({
            title: '扫码失败，请重试',
            icon: 'none'
          })
        }
      }
    })
  },

  // 使用邀请数据进行注册
  handleSignupWithInviteData(inviteData) {
    console.log('处理邀请数据:', inviteData)

    // 首先验证邀请token是否有效
    this.validateInviteToken(inviteData.token, inviteData)
  },

  // 验证邀请token
  validateInviteToken(token, originalData) {
    wx.showLoading({
      title: '验证邀请码...',
      mask: true
    })

    const app = getApp()

    wx.request({
      url: `${app.globalData.apiBaseUrl}/auth/validate-invite/${token}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Accept-Language': (require('../../utils/translations').getLanguage() === 'zh') ? 'zh-CN,zh;q=0.9' : 'en-US,en;q=0.9'
      },
      success: (res) => {
        wx.hideLoading()
        console.log('验证邀请码响应:', res)

        if (res.statusCode === 200 && res.data && res.data.success === true) {
          const responseData = res.data.data || {}

          // 设置邀请信息，优先使用服务器返回的数据
          this.setData({
            inviteInfo: {
              token: token,
              inviteToken: token,
              groupName: responseData.groupName || originalData.groupName || '团队',
              managerName: responseData.managerName || originalData.managerName || '管理员',
              groupId: originalData.groupId,
              isGroupInvite: true
            }
          })

          wx.showToast({
            title: '邀请码有效',
            icon: 'success'
          })
        } else {
          // 邀请码无效或过期
          let errorMessage = '邀请码无效或已过期'
          if (res.data && res.data.message) {
            errorMessage = res.data.message
          }

          wx.showModal({
            title: '邀请码验证失败',
            content: errorMessage,
            showCancel: false,
            success: () => {
              // 返回扫码界面
              this.setData({
                inviteInfo: {}
              })
            }
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        console.error('验证邀请码失败:', err)

        wx.showModal({
          title: '网络错误',
          content: '无法验证邀请码，请检查网络连接后重试',
          showCancel: false,
          success: () => {
            // 返回扫码界面
            this.setData({
              inviteInfo: {}
            })
          }
        })
      }
    })
  },


  // 执行QR码注册
  performQRSignup(token) {
    this.setData({ loading: true })

    const app = getApp()

    // QR码注册数据（不需要用户输入，直接使用token）
    const signupData = {
      inviteToken: token,
      // QR码注册不需要额外的用户信息，后端会从token中获取
    }

    console.log('QR注册数据:', signupData)

    wx.request({
      url: `${app.globalData.apiBaseUrl}/auth/signup`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: signupData,
      success: (res) => {
        console.log('QR注册响应:', res)

        if (res.statusCode === 200 && res.data && res.data.success === true) {
          // QR注册成功
          const responseData = res.data.data || {}

          wx.showToast({
            title: '注册成功！',
            icon: 'success',
            duration: 1500
          })

          setTimeout(() => {
            const groupName = responseData.groupName || '团队';
            const managerName = responseData.managerName || '管理员';
            const role = responseData.role || 'content_creator';
            const roleZh = role === 'content_manager' ? '内容管理员' : '内容创作者';

            wx.showModal({
              title: '恭喜！',
              content: `你已成为${roleZh}，加入「${groupName}」。\n管理员：${managerName}\n\n请使用微信登录或联系管理员获取登录方式。`,
              confirmText: '去登录',
              showCancel: false,
              success: () => {
                // 重定向到登录页面（确保正确跳转）
                wx.reLaunch({
                  url: '/pages/login/login'
                })
              }
            })
          }, 1500)

        } else {
          // QR注册失败
          let errorMessage = '注册过程中出现错误，请稍后重试';

          if (res.data) {
            // Backend now handles proper i18n, so just use the returned error message
            errorMessage = res.data.message || res.data.error || errorMessage;
          }

          wx.showModal({
            title: '注册失败',
            content: errorMessage,
            showCancel: false
          })
        }
      },
      fail: (err) => {
        console.error('QR注册请求失败:', err)
        wx.showModal({
          title: '网络错误',
          content: '请检查网络连接后重试',
          showCancel: false
        })
      },
      complete: () => {
        this.setData({ loading: false })
      }
    })
  },

  // 切换协议同意状态
  toggleAgreement() {
    this.setData({
      agreed: !this.data.agreed
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
  },

  // 返回登录页
  goBack() {
    console.log('Back button clicked')
    wx.navigateBack({
      delta: 1
    })
  }
})
