// pages/index/index.js
Page({
  data: {
    userInfo: null,
    isLoggedIn: false,
    stats: {
      availableTemplates: 0,
      recordedVideos: 0,
      publishedVideos: 0
    },
    recentTemplates: [],
    loading: true
  },

  onLoad() {
    console.log('首页加载')
    this.initPage()
  },

  onShow() {
    console.log('首页显示')
    this.refreshData()
  },

  // 初始化页面
  initPage() {
    const app = getApp()
    
    // 检查登录状态
    if (!app.globalData.isLoggedIn) {
      app.redirectToLogin()
      return
    }
    
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      userInfo: app.globalData.userInfo,
      loading: false
    })
    
    this.loadSubscribedTemplates()
    this.loadDashboardStats()
  },

  // 刷新数据
  refreshData() {
    this.loadSubscribedTemplates()
    this.loadDashboardStats()
  },

  // 加载已订阅的模板
  loadSubscribedTemplates() {
    const app = getApp()
    if (!app.globalData.isLoggedIn || !app.globalData.userInfo) {
      console.log('用户未登录，无法加载模板')
      return
    }

    const userId = app.globalData.userInfo.id
    console.log('开始加载用户模板，用户ID:', userId)

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-creator/users/${userId}/subscribed-templates`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        console.log('订阅模板响应:', res)
        if (res.statusCode === 200 && res.data) {
          const templates = res.data
          console.log('获取到的模板数量:', templates.length)
          
          // 更新统计数据
          this.setData({
            'stats.availableTemplates': templates.length,
            recentTemplates: templates.slice(0, 3) // 显示最近3个模板
          })
          
          // 更新全局模板数据
          app.globalData.templates = templates
        } else {
          console.log('获取模板失败:', res.data)
          wx.showToast({
            title: '获取模板失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('获取模板请求失败:', err)
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      }
    })
  },

  // 加载仪表板统计数据
  loadDashboardStats() {
    const app = getApp()
    if (!app.globalData.isLoggedIn || !app.globalData.userInfo) {
      console.log('用户未登录，无法加载统计数据')
      return
    }

    const userId = app.globalData.userInfo.id

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-creator/users/${userId}/dashboard`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        console.log('仪表板统计响应:', res)
        if (res.statusCode === 200 && res.data && res.data.success) {
          this.setData({
            stats: {
              availableTemplates: res.data.availableTemplates || 0,
              recordedVideos: res.data.recordedVideos || 0,
              publishedVideos: res.data.publishedVideos || 0
            }
          })
        } else {
          console.log('获取统计数据失败:', res.data)
        }
      },
      fail: (err) => {
        console.error('获取统计数据请求失败:', err)
      }
    })
  },

  // 选择模板进行录制
  selectTemplate(e) {
    const templateId = e.currentTarget.dataset.id
    console.log('选择模板ID:', templateId)
    
    const app = getApp()
    const templates = app.globalData.templates || []
    const template = templates.find(t => t.id === templateId)
    
    if (template) {
      // 保存选中的模板
      app.globalData.currentTemplate = template
      
      // 跳转到场景选择页面
      wx.navigateTo({
        url: `/pages/scene-selection/scene-selection?templateId=${template.id}&userId=${app.globalData.userInfo.id}`
      })
    } else {
      wx.showToast({
        title: '模板不存在',
        icon: 'none'
      })
    }
  },

  // 登录
  handleLogin() {
    const app = getApp()
    app.redirectToLogin()
  },


  // 查看全部模板
  viewAllTemplates() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.switchTab({
      url: '/pages/templates/templates'
    })
  },

  // 开始录制
  startRecording() {
    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    wx.switchTab({
      url: '/pages/templates/templates'
    })
  },

  // 退出登录
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.logout()
        }
      }
    })
  },


  // 下拉刷新
  onPullDownRefresh() {
    this.refreshData()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  }
})