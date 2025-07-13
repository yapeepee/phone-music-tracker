# Expo 除錯步驟 🔧

## 當前錯誤：StyleSheet doesn't exist

這個錯誤通常是因為：
1. Metro bundler 快取問題
2. 套件版本不相容
3. 循環依賴

## 解決步驟：

### 1. 完全重置 Metro Bundler
```bash
# 停止所有進程
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# 清除所有快取
rm -rf node_modules/.cache/
rm -rf .expo/
npx expo start --clear
```

### 2. 重新安裝依賴
```bash
cd /home/dialunds/music-tracker/mobile-app
rm -rf node_modules
rm package-lock.json
npm install
```

### 3. 測試最小化版本
如果還是有問題，可以暫時簡化 App.tsx 來測試：

```typescript
// 備份原本的 App.tsx
cp App.tsx App.tsx.backup

// 創建簡單版本
cat > App.tsx << 'EOF'
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Testing App</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
EOF
```

### 4. 使用 Windows IP 連接
確保使用正確的連接方式：
```
exp://192.168.8.196:8081
```

### 5. 檢查錯誤日誌
在 Expo Go 中：
- 搖動手機打開開發者選單
- 選擇 "Debug Remote JS"
- 在瀏覽器的 Console 中查看詳細錯誤

## 快速修復命令（依序執行）：

```bash
# 1. 清理並重新安裝
cd /home/dialunds/music-tracker/mobile-app
rm -rf node_modules .expo node_modules/.cache
npm install

# 2. 使用 reset cache 啟動
npx expo start -c

# 3. 如果還是不行，使用 tunnel 模式
npx expo start --tunnel
```

## 常見解決方案：

| 問題 | 解決方法 |
|------|----------|
| StyleSheet 錯誤 | 清除 Metro 快取 |
| 套件版本警告 | 使用 `expo install` 安裝相容版本 |
| 連接失敗 | 使用 tunnel 模式或檢查防火牆 |
| import 錯誤 | 檢查檔案路徑大小寫 |

## 最後手段：
如果以上都不行，可以：
1. 建立新的 Expo 專案測試
2. 逐步移植程式碼
3. 使用 Expo SDK 53 相容的套件版本