// 对象标签中英文映射字典
const labelDictionary = {
  // 人物
  'person': '人',
  'people': '人群',
  'face': '脸',
  'man': '男人',
  'woman': '女人',
  'child': '孩子',
  'baby': '婴儿',
  
  // 交通工具
  'car': '汽车',
  'vehicle': '车辆',
  'bus': '公交车',
  'truck': '卡车',
  'bicycle': '自行车',
  'motorcycle': '摩托车',
  'train': '火车',
  'airplane': '飞机',
  'boat': '船',
  
  // 动物
  'dog': '狗',
  'cat': '猫',
  'bird': '鸟',
  'horse': '马',
  'cow': '牛',
  'sheep': '羊',
  'elephant': '大象',
  'bear': '熊',
  'zebra': '斑马',
  'giraffe': '长颈鹿',
  
  // 日常用品
  'phone': '手机',
  'laptop': '笔记本电脑',
  'computer': '电脑',
  'keyboard': '键盘',
  'mouse': '鼠标',
  'book': '书',
  'bottle': '瓶子',
  'cup': '杯子',
  'chair': '椅子',
  'table': '桌子',
  'bed': '床',
  'couch': '沙发',
  'tv': '电视',
  'refrigerator': '冰箱',
  
  // 食物
  'food': '食物',
  'fruit': '水果',
  'apple': '苹果',
  'banana': '香蕉',
  'orange': '橙子',
  'sandwich': '三明治',
  'pizza': '披萨',
  'cake': '蛋糕',
  'donut': '甜甜圈',
  
  // 运动用品
  'ball': '球',
  'sports ball': '运动球',
  'baseball bat': '棒球棒',
  'tennis racket': '网球拍',
  'skateboard': '滑板',
  'surfboard': '冲浪板',
  'skis': '滑雪板',
  
  // 其他物品
  'backpack': '背包',
  'handbag': '手提包',
  'suitcase': '手提箱',
  'umbrella': '雨伞',
  'tie': '领带',
  'clock': '时钟',
  'vase': '花瓶',
  'scissors': '剪刀',
  'knife': '刀',
  'fork': '叉子',
  'spoon': '勺子',
  'bowl': '碗',
  
  // 建筑与场景
  'building': '建筑',
  'house': '房子',
  'bridge': '桥',
  'traffic light': '交通灯',
  'stop sign': '停止标志',
  'parking meter': '停车计时器',
  'bench': '长凳',
  
  // 自然物体
  'tree': '树',
  'flower': '花',
  'plant': '植物',
  'mountain': '山',
  'sky': '天空',
  'cloud': '云',
  'sun': '太阳',
  'moon': '月亮',
  
  // 通用/产品
  'product': '产品',
  'object': '物体',
  'item': '物品',
  'thing': '东西',
  'text': '文字',
  'logo': '标志',
  'brand': '品牌',
  'package': '包装',
  'box': '盒子',
  'container': '容器'
}

/**
 * 将英文标签翻译为中文
 * @param {string} label - 英文标签
 * @returns {string} 中文标签，如果没有找到映射则返回原标签
 */
function toZh(label) {
  if (!label) return label
  
  // 先尝试精确匹配（不区分大小写）
  const lowerLabel = label.toLowerCase().trim()
  if (labelDictionary[lowerLabel]) {
    return labelDictionary[lowerLabel]
  }
  
  // 尝试部分匹配（包含关系）
  for (const [key, value] of Object.entries(labelDictionary)) {
    if (lowerLabel.includes(key) || key.includes(lowerLabel)) {
      return value
    }
  }
  
  // 没有找到翻译，返回原标签
  return label
}

/**
 * 批量翻译标签
 * @param {Array<string>} labels - 英文标签数组
 * @returns {Object} 标签映射对象 {english: chinese}
 */
function batchToZh(labels) {
  const result = {}
  if (!Array.isArray(labels)) return result
  
  labels.forEach(label => {
    result[label] = toZh(label)
  })
  
  return result
}

/**
 * 获取所有支持的标签映射
 * @returns {Object} 完整的标签字典
 */
function getAllLabels() {
  return { ...labelDictionary }
}

module.exports = {
  toZh,
  batchToZh,
  getAllLabels,
  labelDictionary
}