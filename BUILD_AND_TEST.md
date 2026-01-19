# 构建和测试指南

## 开发环境设置

### 前置要求

1. **Node.js**: 安装最新的 LTS 版本
2. **Zotero 7 Beta**: 从 [https://www.zotero.org/support/beta_builds](https://www.zotero.org/support/beta_builds) 下载
3. **Git**: 用于版本控制

### 初始化项目

```bash
# 克隆项目
git clone https://github.com/mappedinfo/zotero-review.git
cd zotero-review

# 安装依赖
npm install

# 配置开发环境
cp .env.example .env
# 编辑 .env 文件，设置 Zotero 路径
```

### 配置 .env 文件

在 `.env` 文件中配置你的 Zotero 安装路径：

```bash
# macOS 示例
ZOTERO_PLUGIN_ZOTERO_BIN_PATH="/Applications/Zotero.app/Contents/MacOS/zotero"
ZOTERO_PLUGIN_PROFILE_PATH="~/Zotero/Profiles/xxxxx.dev"

# Windows 示例
# ZOTERO_PLUGIN_ZOTERO_BIN_PATH="C:\\Program Files\\Zotero\\zotero.exe"
# ZOTERO_PLUGIN_PROFILE_PATH="%APPDATA%\\Zotero\\Profiles\\xxxxx.dev"

# Linux 示例
# ZOTERO_PLUGIN_ZOTERO_BIN_PATH="/usr/lib/zotero/zotero"
# ZOTERO_PLUGIN_PROFILE_PATH="~/.zotero/profiles/xxxxx.dev"
```

## 开发和调试

### 启动开发服务器

```bash
npm start
```

这会：
1. 编译插件代码
2. 启动 Zotero
3. 自动加载插件
4. 监听文件变化并自动重新加载

### 热重载开发

文件修改后会自动：
1. 重新编译
2. 在 Zotero 中重新加载插件
3. 无需手动重启 Zotero

### 调试技巧

1. **查看日志**：
   - 在 Zotero 中：`帮助` > `调试输出记录` > `查看输出`
   - 使用 `ztoolkit.log()` 输出调试信息

2. **JavaScript 控制台**：
   - `工具` > `开发者` > `运行 JavaScript`
   - 可以直接运行代码测试功能

3. **检查变量**：
   ```javascript
   // 在 JavaScript 控制台中运行
   Zotero.ZoteroReview
   ```

## 构建发布版本

### 生产构建

```bash
npm run build
```

构建产物位于 `.scaffold/build/` 目录：
- `zotero-review-0.1.0.xpi`: 可安装的插件文件
- `addon/`: 未打包的插件文件

### 代码检查

```bash
# 检查代码格式和规范
npm run lint:check

# 自动修复代码格式问题
npm run lint:fix
```

### 类型检查

TypeScript 类型检查会在构建时自动运行：

```bash
npm run build
```

如果有类型错误，构建会失败并显示错误信息。

## 测试功能

### 手动测试清单

#### 1. 基础功能测试

- [ ] 插件成功加载
- [ ] 在"工具"菜单中看到"打开文献评审视图"选项
- [ ] 点击菜单项能打开评审Tab

#### 2. 字段管理测试

- [ ] 点击"管理字段"按钮打开列管理器
- [ ] 查看默认字段（相关性、质量评分、是否纳入、评审备注）
- [ ] 添加新字段：
  - [ ] 文本类型字段
  - [ ] 下拉选项类型字段（添加3-5个选项）
  - [ ] 数字类型字段
  - [ ] 布尔类型字段
- [ ] 编辑现有字段的名称
- [ ] 删除字段（确认提示）
- [ ] 保存后字段配置生效

#### 3. 表格显示测试

- [ ] 表格正确显示所有文献
- [ ] 固定列显示正确（ID、标题、作者、年份、期刊）
- [ ] 自定义字段列显示正确
- [ ] 表格可以滚动
- [ ] 点击行能在主窗口定位文献

#### 4. 数据编辑测试

- [ ] 下拉字段：选择不同值，自动保存
- [ ] 文本字段：输入文本，失去焦点后保存
- [ ] 数字字段：输入数字，自动保存
- [ ] 布尔字段：勾选/取消勾选，自动保存
- [ ] 刷新表格后数据保持

#### 5. 导出功能测试

- [ ] 点击"导出"按钮显示菜单
- [ ] 导出为CSV：
  - [ ] 选择保存位置
  - [ ] 文件成功保存
  - [ ] 用Excel打开查看数据正确
  - [ ] 中文字符显示正常
- [ ] 导出为JSON：
  - [ ] 文件成功保存
  - [ ] JSON格式正确
  - [ ] 包含字段定义和数据

#### 6. 统计信息测试

- [ ] 工具栏右侧显示统计信息
- [ ] 显示文献总数
- [ ] 显示已纳入文献数
- [ ] 修改"是否纳入"字段后统计更新

#### 7. 多语言测试

- [ ] 切换到中文界面，所有文本显示中文
- [ ] 切换到英文界面，所有文本显示英文

### 边界情况测试

- [ ] 空库（无文献）时打开评审视图
- [ ] 大量文献（>1000篇）时的性能
- [ ] 删除所有自定义字段
- [ ] 字段名称包含特殊字符
- [ ] 快速连续点击按钮
- [ ] 同时打开多个评审Tab

### 数据持久化测试

- [ ] 编辑数据后关闭Tab，重新打开数据保持
- [ ] 重启Zotero后数据保持
- [ ] 删除字段后该字段的数据被清除

## 已知问题和限制

### TypeScript 类型错误

某些全局对象（如 `Zotero`）的类型定义可能不完整，会产生 TypeScript 错误。这些错误不影响运行时功能。

### 性能优化

- 对于超过10000篇文献的库，建议使用集合功能筛选后再进行评审
- 大量自定义字段（>20个）可能影响表格渲染性能

### Tab API 限制

当前实现使用了 Zotero 的 Tab API，某些高级功能（如自定义Tab类型）可能需要 Zotero 核心支持。

## 常见问题排查

### 插件加载失败

1. 检查 Zotero 版本是否为 7.0+
2. 查看错误日志（帮助 > 调试输出记录）
3. 确认没有其他冲突的插件

### 表格不显示

1. 检查是否有文献在库中
2. 打开 JavaScript 控制台查看错误
3. 尝试刷新表格

### 数据保存失败

1. 检查 Zotero 数据目录的写入权限
2. 查看调试日志中的错误信息
3. 尝试重启 Zotero

### 导出失败

1. 确认有导出权限
2. 检查文件路径是否有效
3. 查看控制台错误信息

## 发布流程

### 准备发布

1. 更新版本号：
   ```bash
   # 编辑 package.json 中的 version 字段
   ```

2. 更新 CHANGELOG：
   - 记录新功能
   - 记录bug修复
   - 记录已知问题

3. 运行完整测试

### 创建发布

```bash
npm run release
```

这会：
1. 提示输入新版本号
2. 更新 package.json
3. 构建生产版本
4. 创建 git tag
5. 推送到 GitHub
6. 触发 GitHub Actions 自动发布

### GitHub Release

GitHub Actions 会自动：
1. 构建 XPI 文件
2. 创建 GitHub Release
3. 上传 XPI 作为 Release 资产
4. 更新 update.json

## 贡献指南

### 代码风格

- 使用 Prettier 格式化代码
- 遵循 ESLint 规则
- TypeScript 严格模式
- 注释使用中文或英文（保持一致）

### 提交信息

使用语义化提交信息：
- `feat:` 新功能
- `fix:` Bug修复
- `docs:` 文档更新
- `style:` 代码格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具

### Pull Request

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 编写测试
5. 更新文档
6. 提交 PR

## 技术栈

- **TypeScript**: 类型安全的开发
- **Zotero Plugin Toolkit**: 插件开发工具库
- **Zotero Types**: TypeScript 类型定义
- **ESBuild**: 快速构建
- **Prettier + ESLint**: 代码质量

## 相关资源

- [Zotero 7 开发文档](https://www.zotero.org/support/dev/zotero_7_for_developers)
- [插件开发指南](https://zotero-chinese.com/plugin-dev-guide/)
- [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit)
- [Zotero Types](https://github.com/windingwind/zotero-types)
