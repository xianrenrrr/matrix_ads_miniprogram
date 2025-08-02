// pages/templates/templates.js
Page({
  data: {
    templates: [],
    loading: true,
    searchText: ''
  },

  onLoad() {
    console.log('模板页面加载')
    this.loadTemplates()
  },

  onShow() {
    console.log('模板页面显示')
    // 检查登录状态
    const app = getApp()
    if (!app.globalData.isLoggedIn) {
      app.redirectToLogin()
      return
    }
  },

  // 加载模板列表
  loadTemplates() {
    wx.showLoading({ title: '加载模板中...' })
    
    const app = getApp()
    if (!app.globalData.isLoggedIn || !app.globalData.userInfo) {
      wx.hideLoading()
      app.redirectToLogin()
      return
    }

    const userId = app.globalData.userInfo.id

    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-creator/users/${userId}/subscribed-templates`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        console.log('模板页面订阅模板响应:', res)
        if (res.statusCode === 200 && res.data) {
          const templates = res.data.map(template => ({
            ...template,
            isSubscribed: true, // 这些都是已订阅的模板
            duration: template.totalVideoLength,
            sceneCount: (template.scenes && template.scenes.length) || 0,
            difficulty: 'easy', // 可以根据场景数量判断难度
            thumbnail: (template.scenes && template.scenes[0] && template.scenes[0].exampleFrame) || '/assets/default-template.jpg'
          }))
          
          this.setData({
            templates: templates,
            loading: false
          })
          
          // 更新全局模板数据
          app.globalData.templates = templates
        } else {
          console.log('获取模板失败:', res.data)
          this.setData({
            templates: [],
            loading: false
          })
          wx.showToast({
            title: '获取模板失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('获取模板请求失败:', err)
        this.setData({
          templates: [],
          loading: false
        })
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },


  // 搜索模板
  onSearchInput(e) {
    this.setData({ searchText: e.detail.value })
    this.filterTemplates()
  },

  // 过滤模板
  filterTemplates() {
    // 这里可以实现搜索过滤逻辑
    console.log('过滤模板:', {
      searchText: this.data.searchText
    })
  },


  // 开始录制
  startRecording(e) {
    e.stopPropagation() // 阻止事件冒泡
    
    const templateId = e.currentTarget.dataset.id
    const template = this.data.templates.find(t => t.id === templateId)
    
    if (!template) {
      wx.showToast({
        title: '模板不存在',
        icon: 'none'
      })
      return
    }
    
    const app = getApp()
    
    // 保存选中的模板
    app.globalData.currentTemplate = template
    
    // 跳转到录制页面
    wx.navigateTo({
      url: `/pages/camera/camera?templateId=${template.id}`
    })
  },


  // 订阅模板
  subscribeTemplate(e) {
    e.stopPropagation() // 阻止事件冒泡
    
    const templateId = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '订阅模板',
      content: '请在网页端进行模板订阅操作',
      showCancel: false
    })
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadTemplates()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 1000)
  },

  // 获取难度标签颜色
  getDifficultyColor(difficulty) {
    const colors = {
      'easy': '#10b981',
      'medium': '#f59e0b',
      'hard': '#ef4444'
    }
    return colors[difficulty] || '#6b7280'
  },

  // 获取难度文本
  getDifficultyText(difficulty) {
    const texts = {
      'easy': '简单',
      'medium': '中等',
      'hard': '困难'
    }
    return texts[difficulty] || '未知'
  }
})