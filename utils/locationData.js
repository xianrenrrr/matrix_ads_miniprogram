// utils/locationData.js - 中国省市数据
const locationData = {
  // 23个省
  provinces: [
    { code: 'hebei', name: '河北省' },
    { code: 'shanxi', name: '山西省' },
    { code: 'liaoning', name: '辽宁省' },
    { code: 'jilin', name: '吉林省' },
    { code: 'heilongjiang', name: '黑龙江省' },
    { code: 'jiangsu', name: '江苏省' },
    { code: 'zhejiang', name: '浙江省' },
    { code: 'anhui', name: '安徽省' },
    { code: 'fujian', name: '福建省' },
    { code: 'jiangxi', name: '江西省' },
    { code: 'shandong', name: '山东省' },
    { code: 'henan', name: '河南省' },
    { code: 'hubei', name: '湖北省' },
    { code: 'hunan', name: '湖南省' },
    { code: 'guangdong', name: '广东省' },
    { code: 'hainan', name: '海南省' },
    { code: 'sichuan', name: '四川省' },
    { code: 'guizhou', name: '贵州省' },
    { code: 'yunnan', name: '云南省' },
    { code: 'shaanxi', name: '陕西省' },
    { code: 'gansu', name: '甘肃省' },
    { code: 'qinghai', name: '青海省' },
    { code: 'taiwan', name: '台湾省' },
    
    // 5个自治区
    { code: 'neimenggu', name: '内蒙古自治区' },
    { code: 'guangxi', name: '广西壮族自治区' },
    { code: 'xizang', name: '西藏自治区' },
    { code: 'ningxia', name: '宁夏回族自治区' },
    { code: 'xinjiang', name: '新疆维吾尔自治区' },
    
    // 4个直辖市
    { code: 'beijing', name: '北京市' },
    { code: 'tianjin', name: '天津市' },
    { code: 'shanghai', name: '上海市' },
    { code: 'chongqing', name: '重庆市' },
    
    // 2个特别行政区
    { code: 'hongkong', name: '香港特别行政区' },
    { code: 'macao', name: '澳门特别行政区' }
  ]
}

module.exports = locationData