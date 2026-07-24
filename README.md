# 社區門牌導引 PWA V18（文字導航可編輯版）

## 這一版的重點

- `index.html`：正式導航首頁
- `admin.html`：資料管理頁
- `data/community-data.json`：門牌、路線、禁止通行點與文字導航都集中在這個檔案
- 可針對每一個區塊，分別編輯汽車與機車的文字導航
- 每一行代表一個導航步驟
- 未填寫自訂文字時，正式頁會使用系統預設內容

## 文字導航管理

開啟：

`https://你的帳號.github.io/community-address-guide/admin.html`

進入「文字導航」：

1. 選擇區塊
2. 選擇汽車或機車
3. 每行輸入一個導航步驟
4. 到「匯入／匯出」下載新版 `community-data.json`
5. 到 GitHub 的 `data` 資料夾覆蓋同名檔案

可使用的變數：

- `{block}`：區塊名稱
- `{addresses}`：該區塊所有門牌
- `{address}`：使用者目前選取的門牌
- `{mode}`：汽車或機車

## GitHub 更新

第一次由 V17 升級 V18 時，請上傳並覆蓋整包內容。之後若只修改資料，通常只需覆蓋：

`data/community-data.json`
