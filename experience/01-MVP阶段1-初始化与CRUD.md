# 经验总结：MVP 阶段 1 —— 项目初始化与基础 CRUD

## 阶段目标
搭建 Next.js + Prisma + shadcn/ui 项目骨架，实现条目的增删改查、标签管理、封面上传。

---

## 一、项目初始化

### shadcn/ui 初始化
```bash
# 正确做法：使用 -d（defaults）自动使用 Next.js 模板
# 不要用 --base-color，新版本的 shadcn 不认识这个参数
yes "" | npx shadcn@latest init -d -f
```

**踩坑：**
- `shadcn init` 默认会在当前目录下创建 `next-app` 子目录，需要手动把文件移到根目录。
- 如果当前目录已有 README.md 等文件，会被覆盖。建议先备份。

### npm 缓存权限问题
如果报错 `EACCES: Your cache folder contains root-owned files`：
```bash
# 方案 A：设置本地缓存目录（不用 sudo）
mkdir -p ~/.npm-local-cache && npm config set cache ~/.npm-local-cache

# 方案 B：修复权限（需要 sudo）
sudo chown -R $(id -u):$(id -g) ~/.npm
```

---

## 二、Prisma 选型与配置

### 核心决策：Prisma 5.x > Prisma 7.x
- Prisma 7 目前是实验版本，API 频繁变化。
- Prisma 7 的 schema 不再支持 `url` 字段，需放到 `prisma.config.ts`。
- Prisma 7 的 `PrismaClient` 构造方式完全不同，要求传入 adapter。
- **结论：MVP 阶段用 Prisma 5.x 最稳妥。**

### Prisma 5 + SQLite 配置
```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

```bash
# .env
DATABASE_URL="file:./dev.db"
```

**踩坑：**
- Prisma 5 的 SQLite connector **不支持 `enum`**，需要把 enum 改成 `String`。
- 类型安全可以在 TypeScript 层维护（如 `lib/types.ts`），不需要 schema 层面的 enum。

### Prisma Client 单例模式
```ts
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

---

## 三、Next.js App Router API 开发

### 基本结构
```
app/api/items/route.ts        → GET / POST
app/api/items/[id]/route.ts   → GET / PUT / DELETE
app/api/tags/route.ts         → GET / POST
app/api/upload/route.ts       → POST（文件上传）
```

### 动态路由参数（Next.js 15+）
```ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // ...
}
```
- **注意：** Next.js 15 的 `params` 变成了 `Promise`，必须 `await`。

### 文件上传（MVP 本地存储方案）
```ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File;
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
  await writeFile(path.join(process.cwd(), "public", "uploads", fileName), buffer);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}
```

---

## 四、前端开发

### shadcn/ui 组件安装
```bash
npx shadcn@latest add button card input textarea label badge select dialog -y
```

### 通用依赖
```bash
npm install date-fns lucide-react
```

### Next.js 图片配置
```js
// next.config.mjs
const nextConfig = {
  images: { unoptimized: true }, // MVP 阶段避免配置外部图床
};
```

### 类型复用
把 `ItemType` 等类型抽到 `lib/types.ts`，避免多处重复定义：
```ts
export type ItemType = "BOOK" | "MOVIE" | "TV" | "GAME" | "PLACE";
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  BOOK: "书籍", MOVIE: "电影", TV: "剧集", GAME: "游戏", PLACE: "地点",
};
```

---

## 五、Git 与配置

### .gitignore 必加项
```
# env files
.env
.env*.local

# database
*.db
*.db-journal
```

---

## 六、开发流程 checklist

每阶段开始前：
1. [ ] 阅读相关文档，明确范围边界
2. [ ] 创建/更新任务列表（TaskCreate）
3. [ ] 检查上下文使用率，必要时先写经验总结

每阶段结束后：
1. [ ] 验证核心功能（curl / 浏览器）
2. [ ] 更新任务状态（TaskUpdate）
3. [ ] 写经验总结到 `experience/` 目录
4. [ ] 检查是否有重复定义、未使用的导入

---

## 七、当前已知问题 / 待优化

1. **数据库**：目前是 SQLite，后续迁移到 PostgreSQL（Supabase）时，可把 `String` 改回 `enum`。
2. **图片存储**：目前是本地 `public/uploads`，后续需迁移到 Cloudflare R2。
3. **长图生成**：未实现，MVP 阶段 3 再考虑 `html-to-image` 或 Puppeteer。
4. **用户系统**：目前无登录，MVP 阶段 1 默认单用户。
5. **Select 默认值**：首页筛选器的默认值显示为 "ALL" 而非"全部分类"，可后续优化 SelectValue 的渲染。
