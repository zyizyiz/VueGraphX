# 🛠 开发与贡献指南 (Development Guide)

[English](./DEVELOPMENT_en.md) | **简体中文**

感谢您对 VueGraphX 本开源项目的关注与贡献。为保持项目的高质和稳定，请想要参与核心代码贡献或二次开发的开发者，能够参考本文档。

## 前置环境准备

1. **Node.js**: 请使用 v18 或更高版本。
2. **包管理器**: 本项目使用 `npm` 管理依赖树。建议全局安装最新版。

```bash
git clone https://github.com/zyizyiz/VueGraphX.git
cd VueGraphX
npm install
```

## 项目可用脚本命令 (Scripts)

在 `package.json` 中，定义了完善的测试及构建指令：

- `npm run dev`：启动包裹 `playground` 组件的本地开发服务器页面（基于 Vite），用于直观预览和调试图形变化。
- `npm run build`：执行核心类库（Core Engine）的生产环境打包，生成至 `dist/` 目录。
- `npm run build:playground`：打包 Playground 用于 Github Pages 在线 Demo 部署。
- `npm run test`：运行 `vitest` 执行全量单元测试。
- `npm run test:watch`：针对开发过程中的实时测试。
- `npm run check:jsxgraph-3d`：针对性校验 JSXGraph 升级带来的底层 3D API 漂移问题。

## 🚀 核心渲染处理器（Handlers）开发规范

如果您计划**增加对新数学指令的支持**，请遵循以下规范：

### 1. 杜绝硬编码和 `if-else` 堆砌
核心渲染主方法 `Renderer.render` 不允许被直接修改增加特定逻辑。所有指令请使用 Handler 机制扩展。

### 2. 创建自定义的 Handler
在 `src/core/rendering/handlers` 下创建您的类文件：

```typescript
import type { RenderContext, RenderHandler } from '../types';

export class CustomFeatureHandler implements RenderHandler {
  // 定义高优先级，确保在通配拦截器之前被触发
  priority = 100;

  supports(ctx: RenderContext): boolean {
    // 根据 ctx.expression 或 ctx.mode 判定是否匹配
    return ctx.expression.startsWith('MyFeature');
  }

  handle(ctx: RenderContext) {
    // 1. 进行特定的参数提取
    // 2. 调用 ctx.board.create 创建图元
    // 3. 始终返回 JSXGraph 图元数组，或由于参数错误返回 null
    return [ /* JSXGraph Elements */ ];
  }
}
```

### 3. 注册处理器
在 `src/core/rendering/createDefaultRegistry.ts` 文件中，引入并添加您的类：

```typescript
import { CustomFeatureHandler } from './handlers/CustomFeatureHandler';

export function createDefaultRegistry(): RenderRegistry {
  const registry = new RenderRegistry();
  // 按照优先级顺序依次注册
  registry.register(new CustomFeatureHandler());
  // ... 其他 handlers
  return registry;
}
```

## 🧪 覆盖测试补充要求 (Coverage Testing)

每一次新增指令渲染支持，必须配套提供覆盖率保证测试案例。

请前往 `src/core/rendering/coverage/instructionCases.ts` 文件，添加您的指令对应的执行校验：

```typescript
{
  name: "自定义特色功能演示",
  mode: "2d", // 或 "3d"
  expression: "MyFeature((1,2), (3,4))",
  expectedHandler: CustomFeatureHandler.name, // 确保它命中了你的 Handler
  expectedElementName: "MyFeature" 
}
```
运行 `npm run test`，若通过，则证明指令能够被系统准确分发和执行并且具备回归测试保障。

## 代码提交规范

本项目支持常规的开源代码提交规范，建议使用标准的 Git Commit Message：
- `feat:` 新增功能
- `fix:` 修复 Bug
- `docs:` 编写或完善文档
- `refactor:` 代码重构（不改变现有逻辑）
- `test:` 补充单元测试

期待您的合并请求 (Pull Request)！
