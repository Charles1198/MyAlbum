# 技术实现文档

## 1、目标与原则
### 1.1 目标
- 支撑“首页即作品列表 + 详情弹窗”的极简网站形态
- 移动端优先，兼顾电脑端
- 图片加载快、交互流畅、可长期维护与扩展
- 具备后台管理能力，提供图片管理页（查询/上传/编辑/删除）

### 1.2 原则
- 前端以展示体验与性能为第一优先级
- 数据与图片资源组织清晰、可版本化
- 能静态化就静态化，降低运维复杂度
- 安全优先：管理端需要鉴权，避免管理接口暴露

## 2、技术选型（确定：Nuxt + OSS + 元数据 JSON）
### 2.1 前端框架
- 选择：Nuxt 4（Vue 3）
- 选择理由：
  - Vue 技术栈匹配
- SSR 可为分享 URL 提供稳定的 title/description/OG 元信息
- 可在同仓库内实现 /admin1198（管理端）与服务端 API

### 2.2 UI 与样式
- 选择：Tailwind CSS
- 主题：暗色/亮色可切换，默认跟随系统

### 2.3 状态与数据请求
- 建议：useFetch（Nuxt）+ 轻量封装（对 /api 的统一错误处理与类型约束）

### 2.4 图片瀑布流实现
- 选择：Masonry（自实现列分发式，多列渲染，无第三方布局库）
- 约束：定宽列（约 300px/列），按屏幕宽度自适应列数，保持图片原始比例

### 2.5 部署与存储
- 前端与 API：阿里云 ECS 自建部署（Nginx 反代 + Node SSR）
- 图片与元数据：阿里云 OSS（可配 CDN）
- 数据库：不使用；使用 OSS 元数据 JSON 作为“唯一真源”

## 3、目录结构（建议）
### 3.1 仓库结构建议
- doc/：文档
- src/：前端源码
- public/：静态资源（仅少量站点资源，如头像/背景图）
- scripts/：数据处理脚本（如 EXIF 提取、缩略图生成、数据导入）

### 3.2 前端目录建议（示例）
- src/pages 或 src/app：路由与页面（取决于框架）
  - /：作品列表页（含详情弹窗）
-  - /admin1198：图片管理页（列表/上传/编辑）
- src/components：通用组件（瀑布流、弹窗、图片卡片等）
- src/features：按业务拆分（photos、tags、admin、auth 等）
- src/styles：主题与全局样式
- src/lib：工具方法与 SDK（请求封装、权限判断等）

## 4、图片与数据组织（OSS + 元数据 JSON）
### 4.1 图片尺寸与产物
- 仅两档：thumbnail / original
- 缩略图生成策略：
  - 目标宽度（例如 600px 或 800px，按设备与列宽决定）
  - 格式（WebP/AVIF 优先，保底 JPEG）

### 4.2 数据模型落地
- Photo
  - id、title、description、takenAt、location、tags
  - images：thumbnail、original
  - exif：camera、lens、focalLength、aperture、shutter、iso
  - isPublic：公开性（字段保留，后续若开启私密访问可直接启用）

### 4.3 数据来源与组织方式
- 选择：OSS 元数据 JSON（不使用数据库）
- OSS 目录建议
  - photos/original/{id}.{ext}
  - photos/thumbnail/{id}.{ext}
  - meta/photos.json
- 元数据文件（meta/photos.json）
  - 内容：Photo[]（包含 description、tags、isPublic 等）
- 写入方式：仅由 /admin1198 后台写入与维护
  - 并发策略：更新 photos.json 时使用 ETag/If-Match（或版本号字段）避免覆盖写
- 列表页数据来源
  - 列表：从 photos.json 读取并展示

### 4.4 分享 URL 与弹窗定位
- 约定：/ 作为唯一页面
- 使用查询参数或 hash 表示当前作品：
  - 示例：/?photo=PHOTO_ID
  - 进入页面后自动打开对应作品弹窗

## 5、后台管理方案（自建 /admin1198 + OSS 元数据 JSON）
### 5.1 能力范围
- 图片管理页（/admin1198）
  - 查询：查询所有图片，支持分页与筛选
  - 上传：上传原图，填写图片描述与标签数组
  - 编辑：编辑图片描述与标签数组
  - 删除：删除图片（含资源与数据）
- 上传与处理：原图上传、自动生成缩略图、自动提取 EXIF
- 访问控制：管理员登录/鉴权

### 5.2 候选实现路径
- 选择：自建后台
  - 管理端路由：/admin1198
  - 管理端 API：/api/admin/*
  - 存储：OSS（图片 + meta/photos.json）

### 5.4 管理端接口设计（建议）
- 鉴权（管理员）
  - POST /api/auth/login：使用管理员密码登录，成功后写入 HttpOnly Cookie（有效期 7 天）
  - POST /api/auth/logout：清除 Cookie
- GET /api/auth/me：获取当前登录状态（用于前端守卫 /admin1198）
- 元数据
  - GET /api/photos：作品列表（从 meta/photos.json 读取）
  - GET /api/photos/:id：作品详情（用于弹窗与 SEO 元信息）
  - GET /api/admin/photos：管理端列表（需要鉴权）
  - PATCH /api/admin/photos/:id：更新（description、tags 等），并写回 meta/photos.json
  - DELETE /api/admin/photos/:id：删除（删 OSS 原图/缩略图 + 从 meta/photos.json 删除）
- 上传（服务端转发）
  - POST /api/admin/photos：上传原图并创建记录
    - 服务端处理：生成 id、写入 OSS original、生成并写入 thumbnail、提取 EXIF、更新 meta/photos.json
  - 说明：不走直传可降低前端复杂度；后续若遇到大图与带宽压力再切直传

## 6、关键实现点清单
- 瀑布流：列宽固定、列数自适应、滚动性能与图片懒加载
- 弹窗：近全屏展示、路由参数联动、前后切换与键盘快捷键
- 图片：缩略图优先加载、原图按需加载、缓存策略
- SEO：作品分享 URL 的标题/描述/OG 元信息生成策略
- 管理端：列表查询、批量操作（可选）、上传与编辑表单体验
- 元数据：photos.json 的并发更新与回滚策略（避免覆盖写、保证可恢复）
- 安全：管理员鉴权、避免原图直链滥用

## 7、待确认（你填写）
- 最终前端框架：Nuxt 4
- 数据方案：OSS + 元数据 JSON（meta/photos.json）
- 管理端路由：/admin1198
- 样式方案：
- 鉴权方案（管理员登录）：管理员密码 + HttpOnly Cookie（服务端签名会话，有效期 7 天）

## 8、落地约定清单
### 8.1 OSS 约定
- Bucket：待定
- Region：待定
- 域名：
  - 站点域名：待定
  - 图片域名（可选 CDN）：待定
- 目录前缀
  - photos/original/
  - photos/thumbnail/
  - meta/photos.json
- 建议开启
  - OSS 版本控制（便于误删回滚）
  - 生命周期规则（可选：清理临时上传/历史版本）

### 8.2 元数据文件约定（meta/photos.json）
- 组织方式：单文件数组（Photo[]）
- 更新策略：ETag/If-Match（防止并发覆盖写）
- 排序策略
  - 默认按 takenAt 倒序
  - 如需手动置顶/排序，新增字段 order（数字越大越靠前）

#### 8.2.1 Photo Schema
- id：string（唯一，建议 uuid）
- title：string（上传时必填）
- description：string（上传时必填）
- takenAt：string（可选，ISO 8601，例如 2026-05-16T12:34:56+08:00）
- location：string（可选）
- tags：string[]（可选）
- images
  - original：string（可选，OSS key 或完整 URL）
  - thumbnail：string（可选，OSS key 或完整 URL）
- exif
  - camera：string（可选）
  - lens：string（可选）
  - focalLength：string（可选）
  - aperture：string（可选）
  - shutter：string（可选）
  - iso：number（可选）
- isPublic：boolean（可选，默认 true，后续若启用私密访问使用）
- createdAt：string（可选，ISO 8601）
- updatedAt：string（可选，ISO 8601）
- order：number（可选，默认 0）

#### 8.2.2 meta/photos.json 示例

```json
[
  {
    "id": "7e83b2d6-6f8c-4d9c-9b1e-9a1f2a8d2e4a",
    "title": "Charles的相册",
    "description": "夜晚的街头。",
    "takenAt": "2026-05-16T21:30:00+08:00",
    "location": "Shanghai",
    "tags": ["夜景", "街头"],
    "images": {
      "original": "photos/original/7e83b2d6-6f8c-4d9c-9b1e-9a1f2a8d2e4a.jpg",
      "thumbnail": "photos/thumbnail/7e83b2d6-6f8c-4d9c-9b1e-9a1f2a8d2e4a.jpg"
    },
    "exif": {
      "camera": "Sony A7M4",
      "lens": "FE 35mm F1.8",
      "focalLength": "35mm",
      "aperture": "f/1.8",
      "shutter": "1/125",
      "iso": 800
    },
    "isPublic": true,
    "order": 0,
    "createdAt": "2026-05-16T22:00:00+08:00",
    "updatedAt": "2026-05-16T22:00:00+08:00"
  }
]
```

### 8.3 ID 与命名规则
- id 生成：uuid（上传时由服务端生成）
- 文件命名：以 id 作为文件名，避免重名与迁移成本

### 8.4 上传流水线（/admin1198）
- 输入：原图文件 + title + description
- 服务端处理顺序（建议）
  - 校验文件类型与大小
  - 生成 id
  - 写入 OSS original
  - 生成 thumbnail 并写入 OSS
  - 提取 EXIF（写入 meta/photos.json）
  - 读 photos.json（带 ETag）→ 合并写回（If-Match）
- 回滚策略
  - 若 photos.json 写回失败：删除本次上传的 OSS original/thumbnail，或将其移动到临时目录等待人工处理

### 8.5 photos.json 并发更新约定
- 服务端更新流程（建议）
  - GET meta/photos.json 获取内容 + ETag
  - PUT meta/photos.json（携带 If-Match: <etag>）
  - 若返回 412：提示“数据已被更新，请刷新后重试”

### 8.6 Masonry 落地约定
- 实现：自实现列分发式 Masonry（按“最短列优先”把 Photo 分配到 N 列中渲染）
- 列宽：约 300px/列（以实际 CSS 变量为准）
- 列数：基于容器宽度与列宽计算（向下取整，最少 1 列）
- 图片比例：按原始宽高比渲染（thumbnail 先占位，原图在弹窗按需加载）

### 8.7 SEO/OG 约定
- 分享参数：/?photo=PHOTO_ID
- SSR 元信息来源：服务端根据 photo id 从 meta/photos.json 查找 title/description
- OG 图片：优先使用 thumbnail（加载更快，尺寸更可控）

### 8.8 运维与安全约定
- 必须启用 HTTPS
- 登录接口限流（例如基于 IP 的简单限流）
- 管理接口仅接受带有效 Cookie 的请求
- 备份：定期备份 meta/photos.json（例如每日拉取到本机或另一个 OSS 路径）
