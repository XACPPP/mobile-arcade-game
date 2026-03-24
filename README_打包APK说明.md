# 移动端豪华闯关版说明

## 文件结构
- `index.html`：页面入口
- `styles.css`：界面与移动端控制样式
- `game.js`：游戏逻辑

## 当前版本特性
- 移动端虚拟摇杆 + 动作按钮
- 3 段关卡推进，不再是单纯刷波次
- 多种敌人：步兵、盾兵、火箭兵、炮台、Boss
- 武器系统：MG、HMG、SG、FL(火焰枪)
- 武器箱、俘虏、坦克载具
- 暂停、重开、任务完成界面

## 本地运行
直接打开 `index.html` 即可。

如果浏览器限制本地文件脚本加载，也可以使用一个简单静态服务：

### Python
```bash
python3 -m http.server 8000
```
然后访问：
```text
http://localhost:8000/
```

## 后续打包 APK 的推荐路线
当前环境没有 Java / Android SDK，所以暂时不能直接编译 APK。

推荐后续做法：

### 方案一：Capacitor
1. 安装 Node.js
2. 初始化前端项目
3. 安装 Capacitor
4. 添加 Android 平台
5. 构建 APK

典型步骤：
```bash
npm init -y
npm install @capacitor/core @capacitor/cli
npx cap init mobile-arcade com.example.mobilearcade
npx cap add android
```

然后把本目录内容作为 web 资源放入 Capacitor 项目中。

### 方案二：Cordova
也可以使用 Cordova 打包 HTML5 项目为 APK。

## 建议的下一步优化
1. 加入音效与背景音乐
2. 增加敌人动画帧
3. 增加存档和关卡选择
4. 增加首领不同阶段技能
5. 做素材化 UI 图标和按钮
