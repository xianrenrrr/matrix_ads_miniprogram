// pages/templates/templates.js
Page({
  data: {
    templates: [],
    allTemplates: [], // 保存所有模板数据
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
      url: `${app.globalData.apiBaseUrl}/content-creator/users/${userId}/assigned-templates`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        console.log('模板页面分配模板响应:', res)
        
        // Handle new ApiResponse format: {success, message, data, error}
        const isApiSuccess = res.data && res.data.success === true;
        const responseData = res.data && res.data.data ? res.data.data : [];
        
        if (res.statusCode === 200 && isApiSuccess) {
          const templates = responseData.map(template => ({
            ...template,
            isAssigned: true, // 这些都是已分配的模板
            duration: template.totalVideoLength,
            sceneCount: (template.scenes && template.scenes.length) || 0,
            difficulty: 'easy', // 可以根据场景数量判断难度
            thumbnail: (template.scenes && template.scenes[0] && template.scenes[0].exampleFrame) || '/assets/default-template.jpg'
          }))
          
          this.setData({
            templates: templates,
            allTemplates: templates, // 保存所有模板
            loading: false
          })
          
          // 更新全局模板数据
          app.globalData.templates = templates
        } else {
          const errorMessage = res.data && res.data.error ? res.data.error : '获取模板失败';
          console.log('获取模板失败:', errorMessage)
          this.setData({
            templates: [],
            allTemplates: [],
            loading: false
          })
          wx.showToast({
            title: errorMessage,
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('获取模板请求失败:', err)
        this.setData({
          templates: [],
          allTemplates: [],
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
    const { searchText, allTemplates } = this.data
    console.log('过滤模板:', { searchText, allTemplatesCount: allTemplates.length })
    
    if (!searchText.trim()) {
      // 如果搜索文本为空，显示所有模板
      this.setData({
        templates: allTemplates
      })
      return
    }
    
    // 根据搜索文本过滤模板
    const filteredTemplates = allTemplates.filter(template => {
      const searchLower = searchText.toLowerCase()
      return (
        (template.templateTitle && template.templateTitle.toLowerCase().includes(searchLower)) ||
        (template.targetAudience && template.targetAudience.toLowerCase().includes(searchLower)) ||
        (template.tone && template.tone.toLowerCase().includes(searchLower))
      )
    })
    
    console.log('过滤结果:', filteredTemplates.length)
    this.setData({
      templates: filteredTemplates
    })
  },


  // 开始录制
  startRecording(e) {
    console.log('开始录制按钮被点击', e)
    wx.showToast({
      title: '按钮点击成功！',
      icon: 'success'
    })
    
    const templateId = e.currentTarget.dataset.id
    console.log('模板ID:', templateId)
    
    if (!templateId) {
      console.log('没有模板ID')
      wx.showToast({
        title: '没有模板ID',
        icon: 'none'
      })
      return
    }
    
    const template = this.data.templates.find(t => t.id === templateId)
    console.log('找到的模板:', template)
    
    if (!template) {
      console.log('模板不存在')
      wx.showToast({
        title: '模板不存在',
        icon: 'none'
      })
      return
    }
    
    const app = getApp()
    
    // 保存选中的模板
    app.globalData.currentTemplate = template
    console.log('准备跳转到录制页面')
    
    // 跳转到场景选择页面
    wx.navigateTo({
      url: `/pages/scene-selection/scene-selection?templateId=${template.id}&userId=${app.globalData.userInfo.id}`,
      success: () => {
        console.log('跳转到场景录制页面成功')
        wx.showToast({
          title: '进入场景录制',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('跳转失败:', err)
        wx.showToast({
          title: `跳转失败: ${err.errMsg}`,
          icon: 'none'
        })
      }
    })
  },



  // 订阅模板

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