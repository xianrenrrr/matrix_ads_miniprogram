// pages/templates/templates.js
Page({
  data: {
    templates: [],
    loading: true,
    searchText: '',
    selectedCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'product', name: '产品展示' },
      { id: 'brand', name: '品牌故事' },
      { id: 'review', name: '用户评价' },
      { id: 'tutorial', name: '教程说明' }
    ]
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
            duration: template.totalVideoLength || 30,
            sceneCount: (template.scenes && template.scenes.length) || 1,
            difficulty: 'easy', // 可以根据场景数量判断难度
            thumbnail: (template.scenes && template.scenes[0] && template.scenes[0].exampleFrame) || '/assets/default-template.jpg',
            category: this.getCategoryFromTemplate(template)
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

  // 根据模板内容判断分类
  getCategoryFromTemplate(template) {
    const title = template.templateTitle || ''
    const audience = template.targetAudience || ''
    const combined = (title + audience).toLowerCase()
    
    if (combined.includes('产品') || combined.includes('商品') || combined.includes('展示')) {
      return 'product'
    } else if (combined.includes('品牌') || combined.includes('故事') || combined.includes('介绍')) {
      return 'brand'
    } else if (combined.includes('评价') || combined.includes('反馈') || combined.includes('评论')) {
      return 'review'
    } else if (combined.includes('教程') || combined.includes('说明') || combined.includes('使用')) {
      return 'tutorial'
    }
    return 'all'
  },

  // 搜索模板
  onSearchInput(e) {
    this.setData({ searchText: e.detail.value })
    this.filterTemplates()
  },

  // 选择分类
  selectCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ selectedCategory: category })
    this.filterTemplates()
  },

  // 过滤模板
  filterTemplates() {
    // 这里可以实现搜索和分类过滤逻辑
    console.log('过滤模板:', {
      searchText: this.data.searchText,
      category: this.data.selectedCategory
    })
  },

  // 选择模板
  selectTemplate(e) {
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
    
    // 跳转到视频建议页面
    wx.navigateTo({
      url: `/pages/suggestions/suggestions?templateId=${template.id}`
    })
  },

  // 开始录制
  startRecording(template) {
    const app = getApp()
    
    // 保存选中的模板
    app.globalData.currentTemplate = template
    
    // 跳转到录制页面
    wx.navigateTo({
      url: `/pages/camera/camera?templateId=${template.id}`
    })
  },

  // 查看模板详情
  viewTemplateDetail(e) {
    const templateId = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/template-detail/template-detail?id=${templateId}`
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