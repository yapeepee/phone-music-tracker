# ✅ Victory Native API 錯誤修復

## 問題描述
當按下 Progress tab 時出現錯誤：
```
React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s undefined
```

錯誤發生在 LineChart.tsx 第 56 行，使用 `<VictoryContainer` 和 `<VictoryAxis` 時。

## 根本原因
我假設 `victory-native` 會有傳統的 Victory 圖表 API（如 VictoryChart, VictoryAxis, VictoryLine 等），但實際上：

1. **victory-native v41+ 實際上是 victory-native-xl** - 一個完全重寫的圖表庫
2. 使用 React Native Skia 和 Reanimated 來達到更好的性能
3. API 完全不同，沒有傳統的 Victory 組件

## 修復方法
將 LineChart 組件從舊的 Victory API 改寫為新的 CartesianChart API：

### 舊的（錯誤）：
```tsx
import { VictoryChart, VictoryLine, VictoryAxis, VictoryLabel, VictoryContainer } from 'victory-native';

<VictoryChart containerComponent={<VictoryContainer />}>
  <VictoryAxis />
  <VictoryLine data={data} />
</VictoryChart>
```

### 新的（正確）：
```tsx
import { CartesianChart, Line } from 'victory-native';

<CartesianChart data={data} xKey="x" yKeys={["y"]}>
  {({ points }) => (
    <Line points={points.y} color={color} strokeWidth={2} />
  )}
</CartesianChart>
```

## 修復的檔案
- `/src/components/analytics/LineChart.tsx` - 完全重寫使用新 API

## 教訓
這是另一個關於「**檢查實際的 library exports**」的例子：
1. 不要根據 library 名稱假設 API
2. victory-native v41+ 不是傳統的 Victory Native
3. 在使用前檢查實際導出的組件
4. 版本號可能表示重大 API 變更

## 已更新文檔
- `API_PATHS_AND_VARIABLES.md` - 新增 "Check Library Versions and APIs" 警告
- 記錄了 victory-native v41+ 實際上是 victory-native-xl

## 額外資訊
新的 victory-native-xl 主要導出：
- `CartesianChart` - 用於線圖、柱狀圖、區域圖
- `Pie.Chart` - 用於圓餅圖
- `PolarChart` - 用於極座標圖
- 各種圖表類型組件：`Line`, `Bar`, `Area`, `Scatter` 等

## 結果
LineChart 現在使用正確的 API，應該可以正常顯示圖表。

## 更新：Font Configuration 錯誤
新的錯誤：`TypeError: xAxis.font.getGlyphIDs is not a function`

### 問題
CartesianChart 的 axisOptions.font 配置格式不正確。新 API 期望不同的 font 對象格式。

### 解決方案
暫時移除所有 axisOptions 配置，使用預設樣式：
```tsx
// ❌ 錯誤 - font 格式不正確
axisOptions={{
  font: { size: 12, color: '#666' },
  formatXLabel: formatXTick,
  // ...
}}

// ✅ 正確 - 暫時使用預設設定
// 不設定 axisOptions
```

### 教訓
1. 新的 victory-native-xl API 文檔不完整
2. 配置選項格式可能與預期不同
3. 遇到未知 API 時，先從最簡單的配置開始