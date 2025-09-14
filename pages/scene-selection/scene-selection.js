// pages/scene-selection/scene-selection.js
/**
 * Scene Selection Page
 * Shows all scenes for a template and allows user to select which scene to record
 */

var app = getApp();
var config = require('../../utils/config');
const { t } = require('../../utils/translations');

Page({
  data: {
    t: t, // Translation function
    templateId: '',
    userId: '',
    template: null,
    scenes: [],
    submissions: {},
    progress: null,
    loading: true,
    videoUrl: null,
    // Sanitized template fields for display (avoid leading colons)
    templateDisplay: null
  },

  onLoad: function(options) {
    var templateId = options.templateId;
    var userId = options.userId;
    
    if (!templateId || !userId) {
      wx.showToast({
        title: t('missingParameters'),
        icon: 'error'
      });
      return;
    }

    this.setData({
      templateId: templateId,
      userId: userId
    });

    this.loadTemplate();
    this.loadProgress();
    
    // Mark that initial load is complete
    this.setData({ hasLoadedOnce: true });
  },

  // Load template data
  loadTemplate: function() {
    var self = this;
    
    wx.showLoading({ title: t('loadingTemplate') });
    
    // First try to use template from globalData (similar to camera page)
    var app = getApp();
    if (app.globalData.currentTemplate && app.globalData.currentTemplate.id === this.data.templateId) {
      console.log('Using template from globalData:', app.globalData.currentTemplate);
      console.log('GlobalData template videoUrl:', app.globalData.currentTemplate.videoUrl);
      console.log('GlobalData template videoId:', app.globalData.currentTemplate.videoId);
      
      // Process scenes with computed button text
      var processedScenes = (app.globalData.currentTemplate.scenes || []).map(function(scene, index) {
        scene.buttonText = '录制';
        scene.buttonType = 'primary';
        return scene;
      });
      
      self.setData({
        template: app.globalData.currentTemplate,
        scenes: processedScenes,
        loading: false,
        templateDisplay: self.buildTemplateDisplay(app.globalData.currentTemplate)
      });
      
      // If template has videoId but no videoUrl, fetch the video URL
      if (app.globalData.currentTemplate.videoId && !app.globalData.currentTemplate.videoUrl) {
        self.fetchVideoUrl(app.globalData.currentTemplate.videoId);
      }
      
      wx.hideLoading();
      return;
    }
    
    // If not in globalData, fetch from API
    wx.request({
      url: config.API_BASE_URL + '/content-manager/templates/' + this.data.templateId,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + wx.getStorageSync('access_token')
      },
      success: function(response) {
        console.log('Template API response:', response);
        
        // Handle new ApiResponse format: {success, message, data, error}
        const isApiSuccess = response.data && response.data.success === true;
        const responseData = response.data && response.data.data ? response.data.data : {};
        
        if (response.statusCode === 200 && isApiSuccess && responseData.scenes) {
          console.log('Found scenes:', responseData.scenes.length);
          console.log('Template videoUrl:', responseData.videoUrl);
          console.log('Template data:', responseData);
          
          // Process scenes with computed button text
          var processedScenes = responseData.scenes.map(function(scene, index) {
            scene.buttonText = '录制';
            scene.buttonType = 'primary';
            return scene;
          });
          
          self.setData({
            template: responseData,
            scenes: processedScenes,
            loading: false,
            templateDisplay: self.buildTemplateDisplay(responseData)
          });
        } else {
          const errorMessage = response.data && response.data.error ? response.data.error : t('templateNotFoundOrNoScenes');
          console.log('Template load failed:', errorMessage);
          wx.showToast({
            title: errorMessage,
            icon: 'error'
          });
          self.setData({ loading: false });
        }
      },
      fail: function(error) {
        console.error('Error loading template:', error);
        wx.showToast({
          title: t('failedToLoadTemplate'),
          icon: 'error'
        });
        self.setData({ loading: false });
      },
      complete: function() {
        wx.hideLoading();
      }
    });
  },

  // Helper: remove leading full-width/half-width colons and whitespace
  stripLeading: function(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/^[\s:：]+/, '');
  },

  // Build sanitized fields for display card
  buildTemplateDisplay: function(tpl) {
    const strip = this.stripLeading;
    const seconds = typeof tpl.totalVideoLength === 'number' ? tpl.totalVideoLength : '';
    return {
      videoPurpose: strip(tpl.videoPurpose || ''),
      tone: strip(tpl.tone || ''),
      totalVideoLength: seconds, // append unit in WXML
      videoFormat: strip(tpl.videoFormat || ''),
      lightingRequirements: strip(tpl.lightingRequirements || ''),
      backgroundMusic: strip(tpl.backgroundMusic || '')
    };
  },

  // Load user's progress for this template using submittedVideos collection
  loadProgress: function() {
    var self = this;
    
    console.log('Loading progress for templateId:', this.data.templateId, 'userId:', this.data.userId);
    
    // Create composite video ID: userId_templateId
    var compositeVideoId = this.data.userId + '_' + this.data.templateId;
    const logger = require('../../utils/logger');
    logger.log('Using composite video ID:', compositeVideoId);
    
    wx.request({
      url: config.API_BASE_URL + '/content-creator/scenes/submitted-videos/' + compositeVideoId,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + wx.getStorageSync('access_token')
      },
      success: function(response) {
        logger.log('Load submitted video response:', response);
        
        // The API returns data directly at response.data level with success flag
        const isApiSuccess = response.data && response.data.success === true;
        
        if (response.statusCode === 200 && isApiSuccess) {
          // Data is directly in response.data, not response.data.data
          var videoData = response.data;
          var scenes = videoData.scenes || {};
          var progress = videoData.progress || null;
          
          // Convert scenes object to sceneMap format (keyed by scene number)
          var sceneMap = {};
          Object.keys(scenes).forEach(function(sceneKey) {
            var scene = scenes[sceneKey];
            if (scene && scene.sceneNumber) {
              // Pre-compute similarity score percentage
              var similarityPercent = null;
              if (scene.similarityScore != null) {
                var raw = scene.similarityScore;
                similarityPercent = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
              }
              
              // Add computed values to scene object
              scene.similarityPercent = similarityPercent;
              scene.hasScore = similarityPercent != null;
              
              // Normalize status: if a submission exists, show 已通过 or 未通过
              var hasSubmission = !!scene.videoUrl || !!scene.sceneId || !!scene.status;
              var statusText = '未提交';
              var statusClass = 'status-pending';
              if (hasSubmission) {
                if (scene.status === 'approved') { statusText = '已通过'; statusClass = 'status-approved'; }
                else { statusText = '未通过'; statusClass = 'status-rejected'; }
              }
              scene.statusText = statusText;
              scene.statusClass = statusClass;
              scene.statusColor = self.getSceneStatusColor(scene.status || 'not-submitted');
              
              sceneMap[scene.sceneNumber] = scene;
            }
          });
          
          self.setData({
            submissions: sceneMap,
            progress: progress
          });
          
          // Update button states based on submissions
          self.updateButtonStates();
        } else if (response.statusCode === 404) {
          logger.log('No submission found for this template - this is normal for new users');
          // Set empty data for new template (no submissions yet)
          self.setData({
            submissions: {},
            progress: null
          });
        } else {
          logger.warn('API error or unexpected response');
          // Set empty data
          self.setData({
            submissions: {},
            progress: null
          });
        }
      },
      fail: function(error) {
        const log = require('../../utils/logger');
        log.error('Error loading submitted video:', error);
        // Set empty data - this is normal for first-time users
        self.setData({
          submissions: {},
          progress: null
        });
      }
    });
  },

  // Video playback control for scene segments
  onVideoPlay: function(e) {
    const sceneIndex = e.currentTarget.dataset.sceneIndex;
    const startTime = e.currentTarget.dataset.startTime / 1000; // Convert to seconds
    const endTime = e.currentTarget.dataset.endTime / 1000;
    
    // Get video context
    const videoContext = wx.createVideoContext(`sceneVideo${sceneIndex}`);
    
    // Seek to start time
    videoContext.seek(startTime);
    
    // Set timer to pause at end time
    this.setVideoTimer(videoContext, endTime - startTime);
  },

  onVideoTimeUpdate: function(e) {
    const sceneIndex = e.currentTarget.dataset.sceneIndex;
    const startTime = e.currentTarget.dataset.startTime / 1000;
    const endTime = e.currentTarget.dataset.endTime / 1000;
    const currentTime = e.detail.currentTime;
    
    // Pause video if it goes beyond scene end time
    if (currentTime >= endTime) {
      const videoContext = wx.createVideoContext(`sceneVideo${sceneIndex}`);
      videoContext.pause();
      videoContext.seek(startTime); // Reset to start
    }
  },

  setVideoTimer: function(videoContext, duration) {
    setTimeout(() => {
      videoContext.pause();
    }, duration * 1000);
  },

  // Navigate to camera for specific scene
  recordScene: function(event) {
    var dataset = event.detail.dataset || event.currentTarget.dataset;
    var sceneIndex = dataset.index;
    var scene = this.data.scenes[sceneIndex];
    
    if (!scene) {
      wx.showToast({
        title: t('sceneNotFound'),
        icon: 'error'
      });
      return;
    }

    wx.navigateTo({
      url: '/pages/camera/camera?templateId=' + this.data.templateId + 
           '&userId=' + this.data.userId + 
           '&sceneIndex=' + sceneIndex +
           '&sceneNumber=' + (sceneIndex + 1) +
           '&returnPage=scene-selection'
    });
  },

  // View scene feedback/results
  viewSceneFeedback: function(event) {
    var sceneNumber = event.currentTarget.dataset.sceneNumber;
    var submission = this.data.submissions[sceneNumber];
    
    if (!submission) {
      wx.showToast({
        title: t('noSubmissionFound'),
        icon: 'none'
      });
      return;
    }

    // If we have a sceneId, fetch full details
    if (submission.sceneId) {
      this.fetchSceneDetails(submission.sceneId, sceneNumber);
    } else {
      // Fallback to simple display if no sceneId
      this.showSceneFeedbackModal(submission, sceneNumber);
    }
  },

  // Fetch full scene details with AI suggestions
  fetchSceneDetails: function(sceneId, sceneNumber) {
    var self = this;
    wx.showLoading({ title: t('loadingSceneDetails') });
    
    wx.request({
      url: config.API_BASE_URL + '/content-creator/scenes/' + sceneId,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + wx.getStorageSync('access_token')
      },
      success: function(response) {
        wx.hideLoading();
        console.log('Scene details response:', response);
        
        const isApiSuccess = response.data && response.data.success === true;
        const sceneData = response.data && response.data.data ? response.data.data : {};
        
        if (response.statusCode === 200 && isApiSuccess) {
          self.showSceneFeedbackModal(sceneData, sceneNumber);
        } else {
          // Fallback to basic submission data
          self.showSceneFeedbackModal(self.data.submissions[sceneNumber], sceneNumber);
        }
      },
      fail: function(error) {
        wx.hideLoading();
        console.error('Error fetching scene details:', error);
        // Fallback to basic submission data
        self.showSceneFeedbackModal(self.data.submissions[sceneNumber], sceneNumber);
      }
    });
  },

  // Show scene feedback modal with detailed information
  showSceneFeedbackModal: function(submission, sceneNumber) {
    var message = t('scene') + ' ' + sceneNumber + '\n';
    message += t('status') + ': ' + this.getStatusText(submission.status) + '\n\n';
    
    // Show similarity score
    if (submission.similarityScore !== undefined) {
      const raw = submission.similarityScore || 0;
      const similarity = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
      message += t('aiSimilarity') + ': ' + similarity + '%\n\n';
    }
    
    // Show AI suggestions
    if (submission.aiSuggestions && submission.aiSuggestions.length > 0) {
      message += t('aiSuggestions') + ':\n';
      for (var i = 0; i < submission.aiSuggestions.length; i++) {
        message += '• ' + submission.aiSuggestions[i] + '\n';
      }
      message += '\n';
    }
    
    // Show feedback if any
    if (submission.feedback && submission.feedback.length > 0) {
      message += t('managerFeedback') + ':\n';
      for (var i = 0; i < submission.feedback.length; i++) {
        message += '• ' + submission.feedback[i] + '\n';
      }
    }

    // Show modal with options based on status
    var showCancel = submission.status !== 'approved';
    var confirmText = submission.status === 'approved' ? t('cameraPermissionOk') : t('reRecord');
    
    wx.showModal({
      title: t('sceneDetails'),
      content: message,
      showCancel: showCancel,
      confirmText: confirmText,
      cancelText: t('close'),
      success: function(res) {
        if (res.confirm && submission.status !== 'approved') {
          // Navigate to re-record
          this.recordScene({ currentTarget: { dataset: { index: sceneNumber - 1 } } });
        }
      }.bind(this)
    });
  },

  // Get localized status text
  getStatusText: function(status) {
    switch(status) {
      case 'approved': return t('statusApproved');
      case 'pending': return t('statusPending');
      case 'rejected': return t('statusRejected');
      default: return status;
    }
  },



  // Get scene status color
  getSceneStatusColor: function(status) {
    switch (status) {
      case 'approved': return '#10B981'; // green
      case 'pending': return '#F59E0B';  // yellow
      case 'rejected': return '#EF4444'; // red
      default: return '#9CA3AF';         // gray
    }
  },

  // View overall progress
  viewProgress: function() {
    var progress = this.data.progress;
    if (!progress) {
      wx.showToast({
        title: 'No progress data',
        icon: 'none'
      });
      return;
    }

    var message = 'Progress: ' + progress.approved + '/' + progress.totalScenes + ' scenes approved\n' +
                   'Pending: ' + progress.pending + '\n' +
                   'Completion: ' + Math.round(progress.completionPercentage) + '%';
    
    wx.showModal({
      title: 'Template Progress',
      content: message,
      showCancel: false,
      confirmText: 'OK'
    });
  },

  // Navigate back to templates
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
  },

  onShow: function() {
    // Only reload progress if we're returning from camera (not initial load)
    // This prevents duplicate API calls on page load
    if (this.data.hasLoadedOnce) {
      this.loadProgress();
    }
  },

  // Update button states based on submission status
  updateButtonStates: function() {
    var scenes = this.data.scenes.map((scene, index) => {
      var sceneNumber = index + 1;
      var submission = this.data.submissions[sceneNumber];
      
      if (submission) {
        switch (submission.status) {
          case 'approved':
            scene.buttonText = '重新录制';
            scene.buttonType = 'success';
            break;
          case 'pending':
            scene.buttonText = '重新录制';
            scene.buttonType = 'primary';
            break;
          case 'rejected':
            scene.buttonText = '修改重录';
            scene.buttonType = 'primary';
            break;
          default:
            scene.buttonText = '录制';
            scene.buttonType = 'primary';
        }
      } else {
        scene.buttonText = '录制';
        scene.buttonType = 'primary';
      }
      
      return scene;
    });
    
    this.setData({ scenes: scenes });
  },

  // Fetch video URL by videoId
  fetchVideoUrl: function(videoId) {
    var self = this;
    var token = wx.getStorageSync('access_token');
    var streamUrl = config.API_BASE_URL + '/content-manager/videos/' + videoId + '/stream';
    
    console.log('Getting signed video URL for videoId:', videoId);
    console.log('Using stream URL:', streamUrl);
    console.log('Using token:', token ? 'EXISTS' : 'MISSING');
    
    wx.request({
      url: streamUrl,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      success: function(response) {
        console.log('Video stream response:', response);
        console.log('Response statusCode:', response.statusCode);
        console.log('Response data:', response.data);
        
        // Handle ApiResponse format: {success, message, data, error}
        const isApiSuccess = response.data && response.data.success === true;
        const signedUrl = response.data && response.data.data ? response.data.data : null;
        
        if (response.statusCode === 200 && isApiSuccess && signedUrl) {
          console.log('Got signed video URL:', signedUrl);
          
          self.setData({
            videoUrl: signedUrl
          });
          
          console.log('Video URL set successfully, ready for scene examples');
        } else {
          console.log('Failed to get signed video URL - statusCode:', response.statusCode);
          console.log('API success:', isApiSuccess);
          console.log('Response data:', response.data);
          
          const errorMessage = response.data && response.data.error ? response.data.error : '视频链接获取失败';
          wx.showToast({
            title: errorMessage,
            icon: 'error'
          });
        }
      },
      fail: function(error) {
        console.error('Error fetching signed video URL:', error);
        wx.showToast({
          title: '网络错误',
          icon: 'error'
        });
      }
    });
  },

  // Play scene example video segment
  playSceneExample: function(event) {
    var dataset = event.detail.dataset || event.currentTarget.dataset;
    var sceneIndex = parseInt(dataset.index);
    var startTime = parseInt(dataset.startTime) || 0;
    var endTime = parseInt(dataset.endTime) || 3000;
    
    console.log('[DEBUG 2025-09-02] playSceneExample - sceneIndex:', sceneIndex);
    console.log('[DEBUG 2025-09-02] playSceneExample - scenes array:', this.data.scenes);
    console.log('[DEBUG 2025-09-02] playSceneExample - scenes length:', this.data.scenes ? this.data.scenes.length : 'null');
    
    if (!this.data.scenes || sceneIndex >= this.data.scenes.length || sceneIndex < 0) {
      console.log('Scene index out of bounds:', sceneIndex, 'scenes length:', this.data.scenes ? this.data.scenes.length : 0);
      return;
    }
    
    var scene = this.data.scenes[sceneIndex];
    var template = this.data.template;
    var videoUrl = this.data.videoUrl || (template && template.videoUrl);
    
    console.log('Scene object:', scene);
    
    if (!scene) {
      console.log('Scene object is null/undefined for index:', sceneIndex);
      return;
    }
    
    if (!videoUrl) {
      wx.showToast({
        title: '视频链接正在获取中...',
        icon: 'loading',
        duration: 1500
      });
      return;
    }
    
    console.log('Playing scene example with signed URL:', videoUrl);
    
    // Store current scene info for modal
    this.setData({
      currentExampleScene: {
        index: sceneIndex,
        title: (scene && scene.sceneTitle) || '场景 ' + (sceneIndex + 1),
        startTimeMs: startTime,
        endTimeMs: endTime,
        videoUrl: videoUrl
      },
      showExampleModal: true
    });
    
    // Auto-play video after modal shows
    setTimeout(() => {
      this.playExampleVideo();
    }, 100);
  },
  
  // Play the example video from start time
  playExampleVideo: function() {
    if (!this.data.currentExampleScene) return;
    const startTime = this.data.currentExampleScene.startTimeMs / 1000;
    const segments = require('../../utils/videoSegments');
    segments.ensureStartOnPlay('exampleVideo', startTime);
    try { wx.createVideoContext('exampleVideo').play(); } catch (e) {}
  },
  
  // Ensure position is correct as soon as metadata is loaded
  onExampleVideoLoaded: function() {
    if (!this.data.currentExampleScene) return;
    const startTime = this.data.currentExampleScene.startTimeMs / 1000;
    const segments = require('../../utils/videoSegments');
    segments.ensureStartOnLoaded('exampleVideo', startTime);
  },
  
  // Always start at scene beginning when user presses Play
  onExampleVideoPlay: function() {
    if (!this.data.currentExampleScene) return;
    const startTime = this.data.currentExampleScene.startTimeMs / 1000;
    const segments = require('../../utils/videoSegments');
    segments.ensureStartOnPlay('exampleVideo', startTime);
  },
  
  // Handle example video time update (stop at end, no loop)
  onExampleVideoTimeUpdate: function(e) {
    if (!this.data.currentExampleScene) return;
    const segments = require('../../utils/videoSegments');
    const endTime = this.data.currentExampleScene.endTimeMs / 1000;
    const startTime = this.data.currentExampleScene.startTimeMs / 1000;
    if (e.detail.currentTime >= endTime) {
      segments.stopAtEnd('exampleVideo', endTime, startTime);
    }
  },
  
  // Close example modal
  closeExampleModal: function() {
    const videoContext = wx.createVideoContext('exampleVideo');
    videoContext.pause();
    
    this.setData({
      showExampleModal: false,
      currentExampleScene: null
    });
  },
  
  // Handle video error
  onVideoError: function(e) {
    console.error('Video error:', e.detail);
    wx.showToast({
      title: '视频加载失败',
      icon: 'none'
    });
  }
});
