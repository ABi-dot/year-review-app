# 年度回顾

记录你全年读过的书、看过的电影剧集、玩过的游戏、去过的地方，年底一键生成精美总结长图 + AI 个性化文案。

## 功能特性

### 核心记录
- **多类型作品管理**：书籍、电影、剧集、游戏、地点，支持评分、短评、标签、完成日期
- **豆瓣批量导入**：输入豆瓣用户 ID，一键导入全部书/影/剧标记记录（含评分、标签、评论）
- **智能搜索联想**：添加作品时输入名称，实时搜索豆瓣返回封面、导演/作者、年份，一键自动填充表单

### 年度总结
- **时间线视图**：按月展示全年作品，一目了然你的阅读/观影轨迹
- **统计图表**：类型分布、评分分布、月度趋势
- **AI 年度诗篇**：根据你的全年记录生成小红书风格的年度感悟文案
- **AI 年度人设**：生成四字标签（如"赛博游侠"）+ 精神画像解读
- **长图导出**：统计页一键生成高清长图，适合发朋友圈/小红书

### 智能推荐
- **热门推荐**：实时抓取豆瓣热门榜单（电影/剧集/书籍），秒出结果
- **猜你喜欢**：基于你的高分记录，AI 分析口味偏好，推荐跨类型作品
- **推荐封面**：每条推荐自动匹配豆瓣封面图

### 其他
- **明暗主题切换**：支持 light/dark/system 三种模式
- **响应式布局**：桌面端和移动端均可正常使用
- **图片代理**：豆瓣封面图自动走代理，解决防盗链问题

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 + TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 数据库 | Prisma + SQLite |
| AI | 自定义 API Endpoint，支持 OpenAI 兼容格式 / Anthropic Messages API 原生格式 |
| 部署 | Node.js + PM2（推荐）或 Vercel |

## 本地开发

```bash
# 1. 克隆项目
git clone <你的仓库地址>
cd year-review-app

# 2. 安装依赖
npm install

# 3. 初始化数据库
npx prisma migrate deploy
npx prisma generate

# 4. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

## 服务器部署

### 环境要求
- Node.js 18+
- npm 或 pnpm

### 1. 拉取代码
```bash
git clone <你的仓库地址>
cd year-review-app
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env，配置你的 AI API（可选，不配置则 AI 功能不可用）
```

`.env` 示例：
```
DATABASE_URL="file:./dev.db"

# AI 功能配置（支持 OpenAI 兼容格式和 Anthropic 原生格式）
# 示例：DeepSeek
# AI_API_ENDPOINT=https://api.deepseek.com/v1
# AI_API_KEY=sk-xxx
# AI_MODEL=deepseek-chat
```

### 4. 初始化数据库
```bash
npx prisma migrate deploy
npx prisma generate
```

### 5. 构建
```bash
npm run build
```

### 6. 启动（前台）
```bash
npm start
# 默认监听 3000 端口
```

### 7. 生产环境持久运行（推荐 PM2）
```bash
# 安装 PM2
npm install -g pm2

# 启动
pm2 start npm --name "year-review" -- start

# 保存配置
pm2 save
pm2 startup
```

### 8. Nginx 反向代理（可选）
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 注意事项
- **SQLite 数据库**：数据存储在 `prisma/dev.db`，如需持久化备份，请定期备份该文件
- **AI 功能**：AI 年度总结和"猜你喜欢"需要配置 AI API，热门推荐无需配置即可使用
- **图片代理**：服务器需要能访问外网（用于抓取豆瓣图片和榜单数据）
- **端口**：默认 3000，可通过环境变量 `PORT=xxxx npm start` 修改

## 文档索引

| 文档 | 内容 |
|------|------|
| [01-产品定位与核心价值](docs/01-产品定位与核心价值.md) | 目标用户、核心功能、差异化 |
| [02-技术路线](docs/02-技术路线.md) | 核心栈、部署方案、选型理由 |
| [03-外部平台对接策略](docs/03-外部平台对接策略.md) | 豆瓣、Steam、IGDB、地图等对接方案 |
| [04-MVP里程碑](docs/04-MVP里程碑.md) | 分阶段实现计划 |
| [05-产品创意与创新点](docs/05-产品创意与创新点.md) | 差异化功能、AI 增强、社交玩法 |
| [06-数据库设计草案](docs/06-数据库设计草案.md) | Prisma Schema、核心表结构 |
| [07-待解决问题与风险](docs/07-待解决问题与风险.md) | 未决事项、风险、后续思考 |
