// pages/camera/camera.js
Page({
  data: {
    selectedTemplate: null,
    currentScene: 0,
    isRecording: false,
    recordedVideos: [],
    cameraPosition: 'back', // 'front' | 'back'
    flashMode: 'off', // 'off' | 'on' | 'auto'
    recordTime: 0,
    maxRecordTime: 60,
    showOverlay: true,
    currentScript: '',
    sceneProgress: 0,
    // 九宫格网格
    gridOverlay: [], // 选中的网格块编号 [1,2,3,4,5,6,7,8,9]
    gridLabels: [], // 每个网格块的标签
    // 指导信息
    backgroundInstructions: '',
    cameraInstructions: '',
    movementInstructions: ''
  },

  onLoad(options) {
    console.log('录制页面加载', options)
    
    // 如果传入了模板ID，加载模板数据
    if (options.templateId) {
      this.loadTemplate(options.templateId)
    } else {
      // 显示模板选择
      this.showTemplateSelector()
    }
  },

  onShow() {
    console.log('录制页面显示')
    this.initCamera()
  },

  onHide() {
    console.log('录制页面隐藏')
    this.stopRecording()
  },

  // 初始化相机
  initCamera() {
    const cameraContext = wx.createCameraContext()
    this.cameraContext = cameraContext
    
    // 检查相机权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.camera']) {
          wx.authorize({
            scope: 'scope.camera',
            success: () => {
              console.log('相机权限获取成功')
            },
            fail: () => {
              wx.showModal({
                title: '需要相机权限',
                content: '请在设置中开启相机权限以使用录制功能',
                showCancel: false
              })
            }
          })
        }
      }
    })
  },

  // 加载模板
  loadTemplate(templateId) {
    const app = getApp()
    
    // 优先使用全局已选中的模板
    if (app.globalData.currentTemplate && app.globalData.currentTemplate.id === templateId) {
      this.setupTemplate(app.globalData.currentTemplate)
      return
    }
    
    // 从已加载的模板中查找
    if (app.globalData.templates) {
      const template = app.globalData.templates.find(t => t.id === templateId)
      if (template) {
        this.setupTemplate(template)
        return
      }
    }
    
    // 如果没有找到，从API加载
    wx.showLoading({ title: '加载模板中...' })
    
    wx.request({
      url: `${app.globalData.apiBaseUrl}/content-creator/templates/${templateId}`,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${wx.getStorageSync('access_token')}`
      },
      success: (res) => {
        console.log('加载模板响应:', res)
        if (res.statusCode === 200 && res.data) {
          this.setupTemplate(res.data)
        } else {
          wx.showToast({
            title: '模板加载失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('加载模板失败:', err)
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

  // 设置模板数据
  setupTemplate(template) {
    console.log('设置模板:', template)
    
    const scenes = template.scenes || []
    const currentScene = scenes[0] || {}
    
    this.setData({
      selectedTemplate: template,
      currentScene: 0,
      maxRecordTime: template.totalVideoLength || 30,
      currentScript: currentScene.scriptLine || '',
      sceneProgress: scenes.length > 0 ? 1 / scenes.length : 0,
      // 九宫格网格显示
      gridOverlay: currentScene.screenGridOverlay || [],
      gridLabels: currentScene.screenGridOverlayLabels || [],
      // 相机设置
      cameraPosition: this.getCameraPosition(currentScene.personPosition),
      // 指导信息
      backgroundInstructions: currentScene.backgroundInstructions || '',
      cameraInstructions: currentScene.specificCameraInstructions || '',
      movementInstructions: currentScene.movementInstructions || ''
    })
    
    console.log('模板设置完成，当前场景:', currentScene)
  },
  
  // 根据人物位置确定相机方向
  getCameraPosition(personPosition) {
    // 如果需要拍摄人物，通常使用前置摄像头
    if (personPosition && personPosition !== 'No Person') {
      return 'front'
    }
    return 'back'
  },

  // 显示模板选择器
  showTemplateSelector() {
    wx.showActionSheet({
      itemList: ['产品展示模板', '品牌故事模板', '用户评价模板'],
      success: (res) => {
        const templateIds = ['template1', 'template2', 'template3']
        this.loadTemplate(templateIds[res.tapIndex])
      },
      fail: () => {
        wx.navigateBack()
      }
    })
  },

  // 开始录制
  startRecording() {
    if (!this.data.selectedTemplate) {
      wx.showToast({
        title: '请先选择模板',
        icon: 'none'
      })
      return
    }

    const cameraContext = this.cameraContext
    
    cameraContext.startRecord({
      success: () => {
        console.log('开始录制')
        this.setData({ 
          isRecording: true,
          recordTime: 0
        })
        this.startTimer()
      },
      fail: (err) => {
        console.error('录制失败', err)
        wx.showToast({
          title: '录制失败',
          icon: 'none'
        })
      }
    })
  },

  // 停止录制
  stopRecording() {
    if (!this.data.isRecording) return

    const cameraContext = this.cameraContext
    
    cameraContext.stopRecord({
      success: (res) => {
        console.log('录制完成', res)
        this.setData({ isRecording: false })
        this.stopTimer()
        
        // 保存录制的视频
        this.saveRecordedVideo(res.tempVideoPath)
      },
      fail: (err) => {
        console.error('停止录制失败', err)
        this.setData({ isRecording: false })
        this.stopTimer()
      }
    })
  },

  // 保存录制的视频
  saveRecordedVideo(tempPath) {
    const currentScene = this.data.currentScene
    const template = this.data.selectedTemplate
    
    const videoData = {
      sceneNumber: currentScene + 1,
      sceneTitle: template.scenes[currentScene].sceneTitle,
      tempPath: tempPath,
      duration: this.data.recordTime,
      timestamp: Date.now()
    }
    
    const recordedVideos = [...this.data.recordedVideos]
    recordedVideos[currentScene] = videoData
    
    this.setData({ recordedVideos })
    
    wx.showModal({
      title: '录制完成',
      content: `场景 ${currentScene + 1} 录制完成，是否继续录制下一个场景？`,
      confirmText: '继续',
      cancelText: '完成',
      success: (res) => {
        if (res.confirm && currentScene + 1 < template.scenes.length) {
          this.nextScene()
        } else {
          this.finishRecording()
        }
      }
    })
  },

  // 下一个场景
  nextScene() {
    const currentScene = this.data.currentScene + 1
    const template = this.data.selectedTemplate
    
    if (currentScene < template.scenes.length) {
      const scene = template.scenes[currentScene]
      this.setData({
        currentScene,
        currentScript: scene.scriptLine || '',
        maxRecordTime: scene.sceneDuration || 30,
        cameraPosition: this.getCameraPosition(scene.personPosition),
        // 更新九宫格
        gridOverlay: scene.screenGridOverlay || [],
        gridLabels: scene.screenGridOverlayLabels || [],
        // 更新指导信息
        backgroundInstructions: scene.backgroundInstructions || '',
        cameraInstructions: scene.specificCameraInstructions || '',
        movementInstructions: scene.movementInstructions || ''
      })
      
      wx.showToast({
        title: `场景 ${currentScene + 1}: ${scene.sceneTitle || '录制'}`,
        icon: 'none'
      })
    }
  },

  // 上一个场景
  prevScene() {
    const currentScene = Math.max(0, this.data.currentScene - 1)
    const template = this.data.selectedTemplate
    const scene = template.scenes[currentScene]
    
    this.setData({
      currentScene,
      currentScript: scene.scriptLine || '',
      maxRecordTime: scene.sceneDuration || 30,
      cameraPosition: this.getCameraPosition(scene.personPosition),
      // 更新九宫格
      gridOverlay: scene.screenGridOverlay || [],
      gridLabels: scene.screenGridOverlayLabels || [],
      // 更新指导信息
      backgroundInstructions: scene.backgroundInstructions || '',
      cameraInstructions: scene.specificCameraInstructions || '',
      movementInstructions: scene.movementInstructions || ''
    })
    
  },

  // 完成录制
  finishRecording() {
    const recordedVideos = this.data.recordedVideos
    
    if (recordedVideos.length === 0) {
      wx.showToast({
        title: '请至少录制一个场景',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '录制完成',
      content: '是否上传视频？',
      success: (res) => {
        if (res.confirm) {
          this.uploadVideos()
        } else {
          wx.navigateBack()
        }
      }
    })
  },

  // 上传视频
  uploadVideos() {
    wx.showLoading({ title: '上传中...' })
    
    const app = getApp()
    const recordedVideos = this.data.recordedVideos
    
    // 模拟上传过程
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      })
      
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    }, 2000)
  },

  // 切换相机
  switchCamera() {
    const newPosition = this.data.cameraPosition === 'front' ? 'back' : 'front'
    this.setData({ cameraPosition: newPosition })
  },

  // 切换闪光灯
  toggleFlash() {
    const flashModes = ['off', 'on', 'auto']
    const currentIndex = flashModes.indexOf(this.data.flashMode)
    const nextIndex = (currentIndex + 1) % flashModes.length
    this.setData({ flashMode: flashModes[nextIndex] })
  },

  // 切换网格覆盖
  toggleOverlay() {
    this.setData({ showOverlay: !this.data.showOverlay })
  },

  // 开始计时器
  startTimer() {
    this.timer = setInterval(() => {
      const recordTime = this.data.recordTime + 1
      this.setData({ recordTime })
      
      // 自动停止录制
      if (recordTime >= this.data.maxRecordTime) {
        this.stopRecording()
      }
    }, 1000)
  },

  // 停止计时器
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  // 相机错误处理
  onCameraError(e) {
    console.error('相机错误', e)
    wx.showToast({
      title: '相机出现错误',
      icon: 'none'
    })
  },

  onUnload() {
    this.stopTimer()
  }
})