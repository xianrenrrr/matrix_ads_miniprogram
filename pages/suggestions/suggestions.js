// pages/suggestions/suggestions.js
Page({
  data: {
    template: null,
    suggestions: [
      { id: 1, title: '开场介绍', description: '友好的自我介绍', type: 'intro' },
      { id: 2, title: '产品展示', description: '突出产品特色', type: 'product' },
      { id: 3, title: '使用演示', description: '实际操作展示', type: 'demo' },
      { id: 4, title: '客户评价', description: '真实用户反馈', type: 'review' },
      { id: 5, title: '价格优势', description: '性价比说明', type: 'price' },
      { id: 6, title: '对比分析', description: '与同类产品对比', type: 'compare' },
      { id: 7, title: '使用场景', description: '适用情况介绍', type: 'scenario' },
      { id: 8, title: '购买引导', description: '引导用户行动', type: 'cta' },
      { id: 9, title: '感谢结尾', description: '感谢观看总结', type: 'closing' }
    ],
    selectedSuggestions: []
  },

  onLoad(options) {
    console.log('视频建议页面加载', options)
    
    // 获取模板信息
    if (options.templateId) {
      this.loadTemplate(options.templateId)
    }
  },

  // 加载模板信息
  loadTemplate(templateId) {
    const app = getApp()
    
    // 优先使用全局当前模板
    if (app.globalData.currentTemplate && app.globalData.currentTemplate.id === templateId) {
      this.setData({ template: app.globalData.currentTemplate })
      this.generateCustomSuggestions(app.globalData.currentTemplate)
      return
    }

    // 从模板列表中查找
    if (app.globalData.templates) {
      const template = app.globalData.templates.find(t => t.id === templateId)
      if (template) {
        this.setData({ template: template })
        this.generateCustomSuggestions(template)
        return
      }
    }
  },

  // 根据模板生成个性化建议
  generateCustomSuggestions(template) {
    const scenes = template.scenes || []
    const customSuggestions = this.data.suggestions.map((suggestion, index) => {
      const scene = scenes[index] || {}
      return {
        ...suggestion,
        sceneNumber: index + 1,
        scriptLine: scene.scriptLine || suggestion.description,
        duration: scene.sceneDuration || 10,
        personPosition: scene.personPosition || 'Center',
        gridOverlay: scene.screenGridOverlay || [index + 1],
        backgroundInstructions: scene.backgroundInstructions || '保持背景简洁',
        cameraInstructions: scene.specificCameraInstructions || '保持镜头稳定'
      }
    })

    this.setData({ suggestions: customSuggestions })
  },

  // 选择/取消选择建议
  toggleSuggestion(e) {
    const suggestionId = e.currentTarget.dataset.id
    const selectedSuggestions = [...this.data.selectedSuggestions]
    
    const index = selectedSuggestions.indexOf(suggestionId)
    if (index > -1) {
      // 取消选择
      selectedSuggestions.splice(index, 1)
    } else {
      // 选择建议
      selectedSuggestions.push(suggestionId)
    }
    
    this.setData({ selectedSuggestions })
  },

  // 查看建议详情
  viewSuggestionDetail(e) {
    const suggestionId = e.currentTarget.dataset.id
    const suggestion = this.data.suggestions.find(s => s.id === suggestionId)
    
    if (suggestion) {
      wx.showModal({
        title: suggestion.title,
        content: `${suggestion.description}\n\n推荐时长: ${suggestion.duration}秒\n人物位置: ${suggestion.personPosition}\n背景要求: ${suggestion.backgroundInstructions}`,
        showCancel: false
      })
    }
  },

  // 开始录制选中的建议
  startRecordingWithSuggestions() {
    if (this.data.selectedSuggestions.length === 0) {
      wx.showToast({
        title: '请选择至少一个建议',
        icon: 'none'
      })
      return
    }

    const app = getApp()
    const template = this.data.template
    const selectedSuggestions = this.data.selectedSuggestions.map(id => 
      this.data.suggestions.find(s => s.id === id)
    )

    // 创建自定义录制计划
    const customTemplate = {
      ...template,
      scenes: selectedSuggestions.map((suggestion, index) => ({
        sceneNumber: index + 1,
        sceneTitle: suggestion.title,
        sceneDuration: suggestion.duration,
        scriptLine: suggestion.scriptLine,
        personPosition: suggestion.personPosition,
        screenGridOverlay: suggestion.gridOverlay,
        backgroundInstructions: suggestion.backgroundInstructions,
        specificCameraInstructions: suggestion.cameraInstructions,
        movementInstructions: 'No Movement'
      }))
    }

    // 保存自定义模板到全局
    app.globalData.currentTemplate = customTemplate

    // 跳转到录制页面
    wx.navigateTo({
      url: `/pages/camera/camera?templateId=${template.id}`
    })
  },

  // 使用原始模板录制
  useOriginalTemplate() {
    const template = this.data.template
    if (template) {
      wx.navigateTo({
        url: `/pages/camera/camera?templateId=${template.id}`
      })
    }
  },

  // 返回模板选择页面
  goBack() {
    wx.navigateBack()
  }
})