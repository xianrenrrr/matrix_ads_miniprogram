// pages/scene-submission/scene-submission.js
/**
 * Scene Submission Page
 * Allows content creators to submit individual scenes instead of full videos
 */

var app = getApp();
var config = require('../../utils/config');

Page({
  data: {
    templateId: '',
    userId: '',
    template: null,
    scenes: [],
    currentSceneIndex: 0,
    currentScene: null,
    submissions: {},
    progress: null,
    
    // Recording state
    isRecording: false,
    recordingPath: '',
    recordingDuration: 0,
    
    // Upload state
    isUploading: false,
    uploadProgress: 0,
    
    // UI state
    showInstructions: true,
    showFeedback: false,
    feedbackData: null,
    
    // Camera settings
    cameraPosition: 'back',
    enableGrid: true,
    gridOverlay: []
  },

  onLoad(options) {
    var templateId = options.templateId;
    var userId = options.userId;
    
    if (!templateId || !userId) {
      wx.showToast({
        title: 'Missing parameters',
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
    
    wx.showLoading({ title: 'Loading template...' });
    
    wx.request({
      url: config.API_BASE_URL + '/content-manager/templates/' + this.data.templateId,
      method: 'GET',
      success: function(response) {
        if (response.data && response.data.scenes) {
          self.setData({
            template: response.data,
            scenes: response.data.scenes,
            currentScene: response.data.scenes[0]
          });
          
          self.setupSceneData();
        } else {
          wx.showToast({
            title: 'Template not found',
            icon: 'error'
          });
        }
      },
      fail: function(error) {
        console.error('Error loading template:', error);
        wx.showToast({
          title: 'Failed to load template',
          icon: 'error'
        });
      },
      complete: function() {
        wx.hideLoading();
      }
    });
  },

  // Load user's progress for this template
  loadProgress: function() {
    var self = this;
    
    wx.request({
      url: config.API_BASE_URL + '/content-creator/scenes/template/' + this.data.templateId + '/user/' + this.data.userId,
      method: 'GET',
      success: function(response) {
        if (response.data && response.data.success) {
          var sceneMap = response.data.sceneMap || {};
          var progress = response.data.progress;
          
          self.setData({
            submissions: sceneMap,
            progress: progress
          });

          // Find first incomplete scene
          self.findNextIncompleteScene();
        }
      },
      fail: function(error) {
        console.error('Error loading progress:', error);
      }
    });
  },

  // Setup current scene data and grid overlay
  setupSceneData: function() {
    var currentScene = this.data.currentScene;
    var currentSceneIndex = this.data.currentSceneIndex;
    
    if (!currentScene) return;

    // Set up grid overlay from scene data
    var gridOverlay = currentScene.screenGridOverlay || [];
    
    this.setData({
      gridOverlay: gridOverlay,
      enableGrid: gridOverlay.length > 0
    });
  },

  // Find the next scene that needs submission
  findNextIncompleteScene: function() {
    var scenes = this.data.scenes;
    var submissions = this.data.submissions;
    
    for (var i = 0; i < scenes.length; i++) {
      var sceneNumber = i + 1;
      var submission = submissions[sceneNumber];
      
      if (!submission || submission.status === 'rejected') {
        this.setData({
          currentSceneIndex: i,
          currentScene: scenes[i]
        });
        this.setupSceneData();
        return;
      }
    }
    
    // All scenes are complete
    this.setData({
      currentSceneIndex: 0,
      currentScene: scenes[0]
    });
  },

  // Navigate to specific scene
  selectScene: function(event) {
    var index = event.currentTarget.dataset.index;
    
    this.setData({
      currentSceneIndex: index,
      currentScene: this.data.scenes[index]
    });
    
    this.setupSceneData();
  },

  // Toggle scene instructions visibility
  toggleInstructions: function() {
    this.setData({
      showInstructions: !this.data.showInstructions
    });
  },

  // Start video recording
  startRecording: function() {
    var recorderManager = wx.getRecorderManager();
    
    recorderManager.start({
      duration: (this.data.currentScene.sceneDuration || 30) * 1000,
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 192000,
      format: 'mp4'
    });

    this.setData({
      isRecording: true,
      recordingDuration: 0
    });

    // Start recording timer
    var self = this;
    this.recordingTimer = setInterval(function() {
      self.setData({
        recordingDuration: self.data.recordingDuration + 1
      });
    }, 1000);
    recorderManager.onStop(function(res) {
      clearInterval(self.recordingTimer);
      
      self.setData({
        isRecording: false,
        recordingPath: res.tempFilePath
      });
      
      // Show recording preview
      self.showRecordingPreview();
    });

    recorderManager.onError(function(error) {
      clearInterval(self.recordingTimer);
      
      self.setData({
        isRecording: false
      });
      
      wx.showToast({
        title: 'Recording failed',
        icon: 'error'
      });
    });
  },

  // Stop video recording
  stopRecording: function() {
    var recorderManager = wx.getRecorderManager();
    recorderManager.stop();
  },

  // Show recording preview and options
  showRecordingPreview: function() {
    wx.showModal({
      title: 'Recording Complete',
      content: 'Scene ' + (this.data.currentSceneIndex + 1) + ' recorded (' + this.data.recordingDuration + 's). Submit this take or record again?',
      confirmText: 'Submit',
      cancelText: 'Re-record',
      success: function(res) {
        if (res.confirm) {
          this.submitScene();
        } else {
          // Clear recording and allow re-recording
          this.setData({
            recordingPath: '',
            recordingDuration: 0
          });
        }
      }.bind(this)
    });
  },

  // Submit current scene
  submitScene: function() {
    if (!this.data.recordingPath) {
      wx.showToast({
        title: 'No recording to submit',
        icon: 'error'
      });
      return;
    }

    var self = this;
    
    this.setData({
      isUploading: true,
      uploadProgress: 0
    });

    wx.showLoading({ title: 'Uploading scene...' });

    var uploadTask = wx.uploadFile({
      url: config.API_BASE_URL + '/content-creator/scenes/upload',
      filePath: this.data.recordingPath,
      name: 'file',
      formData: {
        templateId: this.data.templateId,
        userId: this.data.userId,
        sceneNumber: this.data.currentSceneIndex + 1,
        sceneTitle: this.data.currentScene.sceneTitle || ('Scene ' + (this.data.currentSceneIndex + 1))
      },
      success: function(response) {
        try {
          var result = JSON.parse(response.data);

          if (result.success) {
            wx.showToast({
              title: 'Scene submitted!',
              icon: 'success'
            });

            // Clear recording
            self.setData({
              recordingPath: '',
              recordingDuration: 0
            });

            // Show AI feedback if available
            if (result.aiSuggestions && result.aiSuggestions.length > 0) {
              self.showAIFeedback(result);
            }

            // Reload progress and move to next scene
            self.loadProgress();
            self.findNextIncompleteScene();

          } else {
            wx.showToast({
              title: result.message || 'Upload failed',
              icon: 'error'
            });
          }
        } catch (error) {
          console.error('Error parsing response:', error);
          wx.showToast({
            title: 'Upload failed',
            icon: 'error'
          });
        }
      },
      fail: function(error) {
        console.error('Error submitting scene:', error);
        wx.showToast({
          title: 'Upload failed',
          icon: 'error'
        });
      },
      complete: function() {
        self.setData({
          isUploading: false,
          uploadProgress: 0
        });
        wx.hideLoading();
      }
    });

    uploadTask.onProgressUpdate(function(res) {
      self.setData({
        uploadProgress: res.progress
      });
    });
  },

  // Show AI feedback modal
  showAIFeedback: function(submissionData) {
    this.setData({
      feedbackData: {
        similarityScore: submissionData.similarityScore,
        suggestions: submissionData.aiSuggestions,
        qualityMetrics: submissionData.sceneSubmission && submissionData.sceneSubmission.qualityMetrics
      },
      showFeedback: true
    });
  },

  // Close AI feedback modal
  closeFeedback: function() {
    this.setData({
      showFeedback: false,
      feedbackData: null
    });
  },

  // Toggle camera position
  switchCamera: function() {
    this.setData({
      cameraPosition: this.data.cameraPosition === 'back' ? 'front' : 'back'
    });
  },

  // Toggle grid overlay
  toggleGrid: function() {
    this.setData({
      enableGrid: !this.data.enableGrid
    });
  },

  // Get scene status for display
  getSceneStatus: function(sceneNumber) {
    var submission = this.data.submissions[sceneNumber];
    if (!submission) return 'not-submitted';
    return submission.status;
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

  // Format duration for display
  formatDuration: function(seconds) {
    var minutes = Math.floor(seconds / 60);
    var remainingSeconds = seconds % 60;
    return minutes + ':' + (remainingSeconds < 10 ? '0' : '') + remainingSeconds;
  },

  // Navigate back to template selection
  goBack: function() {
    wx.navigateBack({
      delta: 1
    });
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

  onUnload: function() {
    // Clean up timer if page is unloaded
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
    }
  }
});