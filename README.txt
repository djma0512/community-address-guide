社區門牌導引 PWA V16
====================

GitHub Pages 上傳方式
--------------------
1. 將本資料夾「裡面的所有檔案與 icons 資料夾」上傳到同一個 GitHub Repository 根目錄。
2. 確認首頁檔名是 index.html，不要只上傳壓縮檔。
3. 在 Repository 的 Settings → Pages 中，選擇 Deploy from a branch。
4. Branch 選 main，Folder 選 /(root)，按 Save。
5. 等待 GitHub Pages 網址發布完成後，用 Safari 開啟。

iPhone 安裝
-----------
Safari 開啟網站 → 分享 → 加入主畫面 → 加入。

重要提醒
--------
- PWA 與離線功能必須透過 HTTPS 網址使用，直接點本機 HTML 不會啟用 Service Worker。
- 第一次開啟需要有網路，成功載入一次後，主要頁面與門牌資料即可離線開啟。
- 日後更新時請修改 sw.js 裡 CACHE_NAME 的版本，例如 v16-2，使用者才會取得新快取。
- community-map-data.json 是正式資料檔；community-map-data-v16.json 是版本備份。
