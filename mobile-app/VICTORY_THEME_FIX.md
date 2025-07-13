# ✅ Victory Theme 錯誤修復

## 問題描述
當按下 Progress tab 時出現錯誤：
```
Cannot read property 'material' of undefined
```

## 根本原因
我在 `LineChart.tsx` 中使用了不存在的 API：
- ❌ 錯誤：`theme={VictoryTheme.material}`
- Victory Native 可能沒有導出 `VictoryTheme` 或它沒有 `material` 屬性

## 修復方法
1. 從 import 中移除 `VictoryTheme`
2. 從 `<VictoryChart>` 中移除 `theme` 屬性

## 修復的檔案
- `/src/components/analytics/LineChart.tsx`
  - 移除 VictoryTheme import
  - 移除 theme 屬性

## 教訓
這是另一個關於「**不要假設 API 存在**」的例子：
1. 不要從其他庫（如 Victory for Web）複製代碼模式
2. 在使用前先檢查 React Native 版本的文檔
3. 測試每個新加入的功能

## 已更新文檔
- `API_PATHS_AND_VARIABLES.md` - 新增「Don't Assume Library APIs」警告
- `CLAUDE.md` - 記錄為第 11 點注意事項

## 額外修復
發現 Victory Native 需要 `react-native-svg` 作為 peer dependency：
```bash
npm install react-native-svg
```

## 結果
兩個問題都已修復：
1. 移除了不存在的 VictoryTheme.material
2. 安裝了缺少的 react-native-svg dependency

Analytics 畫面現在應該可以正常顯示。