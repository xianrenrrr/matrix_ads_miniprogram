// components/custom-button/custom-button.js
Component({
  options: {
    addGlobalClass: true
  },
  externalClasses: ['ext-class'],
  /**
   * Component properties
   */
  properties: {
    text: {
      type: String,
      value: '按钮'
    },
    type: {
      type: String,
      value: 'primary' // primary, secondary, success, warning, danger, outline
    },
    size: {
      type: String,
      value: 'default' // mini, small, default, large
    },
    icon: {
      type: String,
      value: ''
    },
    disabled: {
      type: Boolean,
      value: false
    },
    extClass: {
      type: String,
      value: ''
    }
  },

  /**
   * Component initial data
   */
  data: {

  },

  /**
   * Component methods
   */
  methods: {
    handleTap: function(e) {
      if (this.properties.disabled) {
        return;
      }
      
      // Trigger custom event with all data
      this.triggerEvent('tap', {
        text: this.properties.text,
        type: this.properties.type,
        dataset: e.currentTarget.dataset
      }, { bubbles: false, composed: false, capturePhase: false });
    }
  }
});
