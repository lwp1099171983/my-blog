🎨 整体视觉风格 (Overall Aesthetic)
核心主题：90年代复古视窗系统（Retro 90s OS / Windows 95 风格）与像素艺术（Pixel Art）的结合。

色彩调色板：采用高度统一的单色调/双色调紫色系（Monochromatic Lavender/Purple）。背景通常是较深的紫罗兰色，窗口和内容区是浅紫色或灰白色，文字为深紫色或黑色。

字体排版：标题和系统 UI 元素强制使用像素字体（Pixelated Fonts），正文为了保证可读性，使用边缘锐利的无衬线字体（Sans-serif）或高清渲染的像素字体。

📐 全局布局架构 (Global Layout Structure)
整个网站被设计成一个“电脑桌面”（Web-as-a-desktop）的概念：

桌面背景 (Background)：一张全屏的像素风风景图（如城市夜景或赛博朋克风的建筑轮廓），带有点阵过渡效果。

左侧侧边栏 (Desktop Icons)：垂直排列的系统图标，代表导航菜单。图标为复古像素风，包含：Home（电脑）、Work（文件夹）、Blog（记事本）、Services（表格）、Art（调色板）、About（人物头像）、Contact（信封）。最底部有一个复古的“网站访问量计数器（Hit Counter）”。

底部任务栏 (Taskbar)：横跨底部的经典系统任务栏。左侧是类似“开始”按钮的网站 Logo/Home 键；中间显示当前打开的窗口标签（如 Introduction, Clients 等）；最右侧是“设置（Settings）”按钮。

悬浮窗口 (Floating Windows)：内容主要承载于可拖拽的 GUI 窗口中。每个窗口都有顶部的标题栏（包含标题文字，以及右侧的最小化、最大化、关闭按钮）。窗口具有明显的 1px 深色边框和右侧/底部的复古阴影，呈现出经典的 3D 凸起效果。

🖼️ 核心页面场景描述 (Page Specifics)
1. 首页 (Home Page)

由多个平铺在桌面的窗口组成：

简介窗口 (Introduction)：包含一段个人介绍文本、一张像素风的个人头像，以及一张展示以往作品缩略图的拼图。

客户窗口 (Clients)：网格状排列的客户 Logo，每个 Logo 都被处理成了带有像素边框的卡片。

最近文章窗口 (Recent Posts)：列表视图，每一行是一个独立的按钮块，包含发布日期和文章标题。

2. 博客文章列表页 (Blog Index)

Posts 窗口：主干窗口，展示文章列表，右上角有一个复古的 RSS 订阅图标。

Tags 窗口：展示文章标签，标签样式为紧凑的药丸状/矩形按钮（如 accessibility, css, design 等），密铺在窗口内。

Webring 窗口：包含三个复古按钮（Previous website, Random website, Next website），用于友情链接跳转。

3. 文章阅读页 (Post Reading View)

最大化窗口模式：阅读状态下，窗口“最大化”占据几乎整个屏幕，只留出顶部标题栏、左侧边栏和底部任务栏。

内容区：背景为纯浅紫色，视觉非常干净。顶部是巨大的像素风文章标题和日期，下方用一条像素虚线（Dashed line）作为分割线。正文段落排版舒适，行距适中，链接带有经典的下划线。

✨ 关键 UI 细节提示 (Key UI Details for AI)
边框与阴影：所有 UI 元素（按钮、窗口、输入框）都要严格遵循“左上高光、右下阴影”的经典 Windows 9x 拟物化边框逻辑。

无圆角：彻底放弃现代 UI 的圆角（Border-radius: 0），所有元素的转角必须是绝对的直角（90度）。

低保真质感：图片和头像需要应用抖动算法（Dithering）或降低色彩深度，以匹配整体的低分辨率复古感。