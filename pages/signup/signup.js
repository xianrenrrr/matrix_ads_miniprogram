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
    loading: false
  },

  onLoad(options) {
    console.log('注册页面加载, 参数:', options)
    
    // Handle both token (from QR code) and inviteData (from other sources)
    if (options.token) {
      // QR code scan with token parameter (group invite)
      console.log('通过二维码扫描进入，token:', options.token)
      
      this.setData({ 
        inviteInfo: {
          token: options.token,
          inviteToken: options.token,
          isGroupInvite: true
        },
        'formData.username': ''
      })
    } else if (options.inviteData) {
      // Legacy invite data format
      try {
        const inviteInfo = JSON.parse(decodeURIComponent(options.inviteData))
        console.log('解析邀请信息:', inviteInfo)
        
        this.setData({ 
          inviteInfo: inviteInfo,
          // For group invites, don't pre-fill username
          'formData.username': ''
        })
      } catch (error) {
        console.error('解析邀请数据失败:', error)
        wx.showModal({
          title: '数据错误',
          content: '邀请信息解析失败，请重新扫描二维码',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      }
    } else {
      wx.showModal({
        title: '参数错误',
        content: '缺少邀请信息，请重新扫描二维码',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
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
                // 返回登录页面
                wx.navigateBack()
              }
            })
          }, 1500)
          
        } else {
          // 注册失败 - Handle ApiResponse error format
          let errorMessage = '注册过程中出现错误，请稍后重试';
          
          if (res.data) {
            // 优先显示本地化 message，其次显示后端 error 详情
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

  // 返回登录页
  goBack() {
    wx.navigateBack()
  }
})
