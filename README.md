# 社區門牌導引 PWA V17（可維護版）

## 這一版的重點

- `index.html`：正式導航首頁
- `admin.html`：資料管理頁
- `data/community-data.json`：所有可維護資料集中在這一個檔案
- `css/`：畫面樣式
- `js/`：程式功能
- `assets/community-map.png`：社區地圖
- `sw.js`：PWA 離線快取

## 第一次更新到 GitHub

將本資料夾內的所有內容上傳到 Repository 根目錄，覆蓋 V16 同名檔案。
GitHub Pages 設定不需要更改，網址與 QR Code 也不會改變。

## 以後修改資料（最簡單）

1. 開啟：`https://djma0512.github.io/community-address-guide/admin.html`
2. 修改基本文字、門牌、禁止通行點或路線。
3. 點「下載新版 community-data.json」。
4. GitHub 進入 `community-address-guide/data/`。
5. 點 Add file → Upload files，上傳新版 `community-data.json` 並 Commit。
6. 約 1～3 分鐘後重新開啟網站。

因 V17 對 JSON 採用「有網路先讀最新版」策略，單純修改資料通常不必更改 `sw.js`。

## 注意

`admin.html` 無法直接寫入 GitHub，這是 GitHub Pages 靜態網站的限制；它會幫你產生正確 JSON，最後只需覆蓋一個檔案。
