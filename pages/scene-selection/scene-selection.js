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
    loading: true
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
  },

  // Load template data
  loadTemplate: function() {
    var self = this;
    
    wx.showLoading({ title: t('loadingTemplate') });
    
    // First try to use template from globalData (similar to camera page)
    var app = getApp();
    if (app.globalData.currentTemplate && app.globalData.currentTemplate.id === this.data.templateId) {
      console.log('Using template from globalData:', app.globalData.currentTemplate);
      self.setData({
        template: app.globalData.currentTemplate,
        scenes: app.globalData.currentTemplate.scenes || [],
        loading: false
      });
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
        if (response.data && response.data.scenes) {
          console.log('Found scenes:', response.data.scenes.length);
          self.setData({
            template: response.data,
            scenes: response.data.scenes,
            loading: false
          });
        } else {
          console.log('No scenes found in response:', response.data);
          wx.showToast({
            title: t('templateNotFoundOrNoScenes'),
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

  // Load user's progress for this template using submittedVideos collection
  loadProgress: function() {
    var self = this;
    
    console.log('Loading progress for templateId:', this.data.templateId, 'userId:', this.data.userId);
    
    // Create composite video ID: userId_templateId
    var compositeVideoId = this.data.userId + '_' + this.data.templateId;
    console.log('Using composite video ID:', compositeVideoId);
    
    wx.request({
      url: config.API_BASE_URL + '/content-creator/scenes/submitted-videos/' + compositeVideoId,
      method: 'GET',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + wx.getStorageSync('access_token')
      },
      success: function(response) {
        console.log('Load submitted video response:', response);
        if (response.statusCode === 200 && response.data) {
          var videoData = response.data;
          var scenes = videoData.scenes || {};
          var progress = videoData.progress || null;
          
          console.log('Scenes data:', scenes);
          console.log('Progress data:', progress);
          
          // Convert scenes object to sceneMap format (keyed by scene number)
          var sceneMap = {};
          Object.keys(scenes).forEach(function(sceneKey) {
            var scene = scenes[sceneKey];
            if (scene && scene.sceneNumber) {
              sceneMap[scene.sceneNumber] = scene;
            }
          });
          
          console.log('Converted scene map:', sceneMap);
          
          self.setData({
            submissions: sceneMap,
            progress: progress
          });
        } else {
          console.log('No submission data found or API error');
          // Set empty data for new template (no submissions yet)
          self.setData({
            submissions: {},
            progress: null
          });
        }
      },
      fail: function(error) {
        console.error('Error loading submitted video:', error);
        // Set empty data - this is normal for first-time users
        self.setData({
          submissions: {},
          progress: null
        });
      }
    });
  },

  // Navigate to camera for specific scene
  recordScene: function(event) {
    var sceneIndex = event.currentTarget.dataset.index;
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

    var message = t('scene') + ' ' + sceneNumber + ' ' + t('status') + ': ' + submission.status;
    
    if (submission.similarityScore) {
      const raw = submission.similarityScore || 0;
      const similarity = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
      message += '\n' + t('aiSimilarity') + ': ' + similarity + '%';
    }
    
    if (submission.feedback && submission.feedback.length > 0) {
      message += '\n\n' + t('feedback') + ':\n';
      for (var i = 0; i < submission.feedback.length; i++) {
        message += '• ' + submission.feedback[i] + '\n';
      }
    }

    wx.showModal({
      title: t('sceneFeedback'),
      content: message,
      showCancel: true,
      confirmText: t('reRecord'),
      cancelText: t('cameraPermissionOk'),
      success: function(res) {
        if (res.confirm) {
          // Navigate to re-record
          this.recordScene({ currentTarget: { dataset: { index: sceneNumber - 1 } } });
        }
      }.bind(this)
    });
  },

  // Get scene status for display
  getSceneStatus: function(sceneNumber) {
    var submission = this.data.submissions[sceneNumber];
    if (!submission) return 'not-submitted';
    return submission.status;
  },

  // Get similarity score as percentage
  getSimilarityScore: function(sceneNumber) {
    var submission = this.data.submissions[sceneNumber];
    if (!submission || !submission.similarityScore) return 0;
    const raw = submission.similarityScore || 0;
    const similarity = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
    return similarity;
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
    // Reload progress when returning from camera
    this.loadProgress();
  }
});