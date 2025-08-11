// pages/camera/camera.js
const { t } = require('../../utils/translations')

Page({
  data: {
    t: t, // Translation function
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
    showScriptSidebar: false, // 显示脚本侧边栏
    showRecordingCompleteModal: false, // 显示录制完成弹窗
    showUploadFailureModal: false, // 显示上传失败弹窗
    uploadErrorMessage: '', // 上传错误信息
    pendingUploadData: null, // 待上传的数据
    // 九宫格网格
    gridOverlay: [], // 选中的网格块编号 [1,2,3,4,5,6,7,8,9]
    gridLabels: [], // 每个网格块的标签
    // 指导信息
    backgroundInstructions: '',
    cameraInstructions: '',
    movementInstructions: '',
    // Translated strings for modal buttons
    reRecordText: t('reRecord'),
    submitSceneText: t('submitScene'),
    recordingCompleteText: t('recordingComplete'),
    recordingCompleteMessageText: t('recordingCompleteMessage'),
    durationText: t('duration'),
    secondsShortText: t('secondsShort')
  },

  onLoad(options) {
    console.log('录制页面加载', options)
    
    // 保存传入的参数
    this.setData({
      templateId: options.templateId,
      userId: options.userId,
      sceneIndex: parseInt(options.sceneIndex || '0'),
      sceneNumber: parseInt(options.sceneNumber || '1'),
      returnPage: options.returnPage || 'scene-selection'
    })
    
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
                title: t('cameraPermissionNeeded'),
                content: t('cameraPermissionMessage'),
                showCancel: false,
                confirmText: t('cameraPermissionOk')
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
    wx.showLoading({ title: t('loadingTemplate') })
    
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
            title: t('templateNotFound'),
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('加载模板失败:', err)
        wx.showToast({
          title: t('networkError'),
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
    const sceneIndex = this.data.sceneIndex || 0
    const currentScene = scenes[sceneIndex] || {}
    
    this.setData({
      selectedTemplate: template,
      currentScene: sceneIndex,
      maxRecordTime: currentScene.sceneDurationInSeconds || 30,
      currentScript: currentScene.scriptLine || '',
      sceneProgress: scenes.length > 0 ? (sceneIndex + 1) / scenes.length : 0,
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
    // 默认使用后置摄像头（拍摄其他人或物品）
    // 只有在特殊情况下才使用前置摄像头（比如自拍场景）
    if (personPosition && personPosition.includes('自拍') || personPosition === 'Selfie') {
      return 'front'
    }
    return 'back'  // 默认后置摄像头
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
        title: t('selectTemplate'),
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
          title: t('recordingFailed'),
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
    const sceneIndex = this.data.sceneIndex || 0
    const sceneNumber = this.data.sceneNumber || 1
    const template = this.data.selectedTemplate
    
    const videoData = {
      sceneNumber: sceneNumber,
      sceneTitle: template.scenes[sceneIndex].sceneTitle,
      tempPath: tempPath,
      duration: this.data.recordTime,
      timestamp: Date.now()
    }
    
    this.setData({ 
      currentRecording: videoData,
      showRecordingCompleteModal: true
    })
  },

  // 提交当前场景
  submitCurrentScene() {
    const recording = this.data.currentRecording
    if (!recording) {
      wx.showToast({
        title: t('noRecordingToSubmit'),
        icon: 'error'
      })
      return
    }

    wx.showLoading({ title: t('uploadingScene') })
    this.uploadSceneVideo(recording)
  },

  // 重录当前场景
  retakeScene() {
    this.setData({ 
      showRecordingCompleteModal: false,
      currentRecording: null,
      recordTime: 0
    })
  },

  // 上传场景视频
  uploadSceneVideo(recording) {
    const app = getApp()
    var config = require('../../utils/config')
    
    console.log('Starting scene upload:', {
      url: config.api.baseUrl + '/content-creator/scenes/upload',
      templateId: this.data.templateId,
      userId: this.data.userId,
      sceneNumber: recording.sceneNumber,
      filePath: recording.tempPath
    })
    
    wx.uploadFile({
      url: config.api.baseUrl + '/content-creator/scenes/upload',
      filePath: recording.tempPath,
      name: 'file',
      header: {
        'Authorization': 'Bearer ' + wx.getStorageSync('access_token'),
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      formData: {
        templateId: this.data.templateId,
        userId: this.data.userId,
        sceneNumber: recording.sceneNumber,
        sceneTitle: recording.sceneTitle || ('Scene ' + recording.sceneNumber)
      },
      success: (response) => {
        console.log('Upload response:', {
          statusCode: response.statusCode,
          data: response.data,
          header: response.header
        })
        
        try {
          var result = JSON.parse(response.data)
          wx.hideLoading()

          if (result.success) {
            console.log('Upload successful, showing AI feedback')
            // Show AI feedback if available
            this.showAIFeedback(result)
          } else {
            console.error('Upload failed with message:', result.message)
            wx.showToast({
              title: result.message || t('uploadFailed'),
              icon: 'error'
            })
          }
        } catch (error) {
          console.error('Error parsing response:', error, 'Raw response:', response.data)
          wx.hideLoading()
          wx.showToast({
            title: t('uploadFailedInvalidResponse'),
            icon: 'error'
          })
        }
      },
      fail: (error) => {
        console.error('Upload request failed:', error)
        wx.hideLoading()
        wx.showToast({
          title: t('networkErrorPrefix') + (error.errMsg || t('uploadFailed')),
          icon: 'error'
        })
      }
    })
  },

  // 显示AI反馈
  showAIFeedback(submissionData) {
    const similarity = Math.round((submissionData.similarityScore || 0) * 100)
    const suggestions = submissionData.aiSuggestions || []
    
    let message = t('sceneUploadSuccess') + '\n\n'
    message += t('similarityScore') + ': ' + similarity + '%\n'
    
    if (suggestions.length > 0) {
      message += '\n' + t('aiSuggestions') + ':\n'
      for (var i = 0; i < suggestions.length; i++) {
        message += '• ' + suggestions[i] + '\n'
      }
    }

    wx.showModal({
      title: t('aiAnalysisResults'),
      content: message,
      showCancel: true,
      confirmText: t('continueButton'),
      cancelText: t('reRecordButton'),
      success: (res) => {
        this.setData({ showRecordingCompleteModal: false })
        
        if (res.confirm) {
          this.returnToSceneSelection()
        } else {
          // Allow re-recording
          this.retakeScene()
        }
      }
    })
  },

  // 返回场景选择页面
  returnToSceneSelection() {
    const returnPage = this.data.returnPage
    if (returnPage === 'scene-selection') {
      wx.navigateBack({ delta: 1 })
    } else {
      wx.switchTab({ url: '/pages/templates/templates' })
    }
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

  // 切换脚本侧边栏显示
  toggleScriptSidebar() {
    this.setData({ showScriptSidebar: !this.data.showScriptSidebar })
  },

  // 重录当前场景（从模态框调用）
  retakeCurrentScene() {
    this.setData({ showRecordingCompleteModal: false })
    this.retakeScene()
  },

  // 提交场景（从模态框调用）
  submitScene() {
    this.setData({ showRecordingCompleteModal: false })
    this.submitCurrentScene()
  },


  // 返回上一页
  goBack() {
    console.log('返回按钮被点击')
    
    // 如果正在录制，先停止录制
    if (this.data.isRecording) {
      this.stopRecording()
    }
    
    this.returnToSceneSelection()
  },


  // 开始计时器
  startTimer() {
    this.timer = setInterval(() => {
      const recordTime = this.data.recordTime + 1
      this.setData({ recordTime })
      
      // 获取当前场景的时长限制
      const currentScene = this.data.selectedTemplate && this.data.selectedTemplate.scenes && this.data.selectedTemplate.scenes[this.data.currentScene]
      const sceneMaxTime = (currentScene && currentScene.sceneDurationInSeconds) || this.data.maxRecordTime
      
      // 自动停止录制
      if (recordTime >= sceneMaxTime) {
        console.log(`场景 ${this.data.currentScene + 1} 录制时间到达 ${sceneMaxTime} 秒，自动停止`)
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
      title: t('cameraError'),
      icon: 'none'
    })
  },

  onUnload() {
    this.stopTimer()
  }
})