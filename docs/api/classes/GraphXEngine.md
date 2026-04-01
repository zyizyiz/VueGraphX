[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphXEngine

# Class: GraphXEngine

Defined in: [engine/GraphXEngine.ts:218](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L218)

面向使用方的公共引擎门面，负责画板生命周期、指令渲染、图形注册与能力执行。

## Constructors

### Constructor

> **new GraphXEngine**(`containerId`, `options?`): `GraphXEngine`

Defined in: [engine/GraphXEngine.ts:236](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L236)

创建一个绑定到指定 DOM 容器 id 的引擎实例。containerId 指向目标 DOM 容器，该容器应当已经具备明确的宽高，options 会在初始化画板时透传给 JSXGraph。

#### Parameters

##### containerId

`string`

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`GraphXEngine`

## Methods

### registerHiddenLineSource()

> **registerHiddenLineSource**(`ownerId`, `source`): [`GraphHiddenLineSourceHandle`](../interfaces/GraphHiddenLineSourceHandle.md)

Defined in: [engine/GraphXEngine.ts:255](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L255)

#### Parameters

##### ownerId

`string`

##### source

[`GraphHiddenLineSourceDescriptor`](../interfaces/GraphHiddenLineSourceDescriptor.md)

#### Returns

[`GraphHiddenLineSourceHandle`](../interfaces/GraphHiddenLineSourceHandle.md)

***

### removeHiddenLineSource()

> **removeHiddenLineSource**(`sourceId`): `boolean`

Defined in: [engine/GraphXEngine.ts:262](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L262)

#### Parameters

##### sourceId

`string`

#### Returns

`boolean`

***

### clearHiddenLineSources()

> **clearHiddenLineSources**(`ownerId?`): `void`

Defined in: [engine/GraphXEngine.ts:266](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L266)

#### Parameters

##### ownerId?

`string`

#### Returns

`void`

***

### getHiddenLineSceneSnapshot()

> **getHiddenLineSceneSnapshot**(): [`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

Defined in: [engine/GraphXEngine.ts:275](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L275)

#### Returns

[`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

***

### getHiddenLineOptions()

> **getHiddenLineOptions**(): [`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

Defined in: [engine/GraphXEngine.ts:279](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L279)

#### Returns

[`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

***

### setHiddenLineOptions()

> **setHiddenLineOptions**(`options?`): [`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

Defined in: [engine/GraphXEngine.ts:284](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L284)

更新当前引擎的 hidden-line 配置，并立即返回最新 runtime snapshot。

#### Parameters

##### options?

[`GraphHiddenLineOptions`](../interfaces/GraphHiddenLineOptions.md)

#### Returns

[`GraphHiddenLineSceneSnapshot`](../interfaces/GraphHiddenLineSceneSnapshot.md)

***

### registerShape()

> **registerShape**(`definition`): `void`

Defined in: [engine/GraphXEngine.ts:312](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L312)

按公共类型注册一个图形定义。definition.type 会作为 createShape 的调用入口。

#### Parameters

##### definition

[`GraphShapeDefinition`](../interfaces/GraphShapeDefinition.md)

#### Returns

`void`

***

### registerShapes()

> **registerShapes**(`definitions`): `void`

Defined in: [engine/GraphXEngine.ts:318](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L318)

按顺序批量注册多个图形定义。definitions 中的每一项都会按 registerShape 的规则依次注册。

#### Parameters

##### definitions

`Iterable`\<[`GraphShapeDefinition`](../interfaces/GraphShapeDefinition.md)\>

#### Returns

`void`

***

### subscribeCapabilities()

> **subscribeCapabilities**(`listener`): () => `void`

Defined in: [engine/GraphXEngine.ts:362](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L362)

订阅选中项与能力变化。订阅后会立即收到一次当前快照，返回值是一个取消订阅函数。

#### Parameters

##### listener

[`GraphCapabilityListener`](../type-aliases/GraphCapabilityListener.md)

#### Returns

> (): `void`

##### Returns

`void`

***

### getCapabilitySnapshot()

> **getCapabilitySnapshot**(): [`GraphCapabilitySnapshot`](../interfaces/GraphCapabilitySnapshot.md)

Defined in: [engine/GraphXEngine.ts:371](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L371)

返回当前选中项及其标准化能力列表。返回结果同时包含 selection 和 capabilities 两部分。

#### Returns

[`GraphCapabilitySnapshot`](../interfaces/GraphCapabilitySnapshot.md)

***

### getSelection()

> **getSelection**(): [`GraphSelectionSnapshot`](../interfaces/GraphSelectionSnapshot.md) \| `null`

Defined in: [engine/GraphXEngine.ts:393](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L393)

返回当前选中的实体快照；如果没有选中项则返回 null。

#### Returns

[`GraphSelectionSnapshot`](../interfaces/GraphSelectionSnapshot.md) \| `null`

***

### getCapabilities()

> **getCapabilities**(): [`GraphCapabilityDescriptor`](../interfaces/GraphCapabilityDescriptor.md)[]

Defined in: [engine/GraphXEngine.ts:398](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L398)

返回当前选中项可用的能力列表。

#### Returns

[`GraphCapabilityDescriptor`](../interfaces/GraphCapabilityDescriptor.md)[]

***

### executeCapability()

> **executeCapability**(`capabilityId`, `payload?`): `boolean`

Defined in: [engine/GraphXEngine.ts:403](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L403)

在当前选中项上执行指定能力。capabilityId 通常来自 GraphCapabilityDescriptor.id，payload 会原样透传给能力执行器；返回 true 表示执行成功，没有选中项或能力不可用时返回 false。

#### Parameters

##### capabilityId

`string`

##### payload?

`unknown`

#### Returns

`boolean`

***

### createShape()

> **createShape**(`entityType`, `payload?`, `options?`): `boolean`

Defined in: [engine/GraphXEngine.ts:411](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L411)

根据已注册的图形类型创建一个实例。entityType 对应注册时 definition.type，payload 会透传给图形定义的 createShape；返回 true 表示创建成功，否则表示当前类型不存在、当前模式不可用或定义主动拒绝创建。options.select 默认为 true，可用于关闭创建后自动选中。

#### Parameters

##### entityType

`string`

##### payload?

`unknown`

##### options?

[`GraphCreateShapeOptions`](../interfaces/GraphCreateShapeOptions.md)

#### Returns

`boolean`

***

### notifyCapabilityChange()

> **notifyCapabilityChange**(): `void`

Defined in: [engine/GraphXEngine.ts:418](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L418)

主动通知能力订阅者拉取一份新的快照。一般由引擎内部在状态变化后自动调用，图形作者通常通过 context.notifyChange 或 api.notifyChange 间接触发。

#### Returns

`void`

***

### handleDropEvent()

> **handleDropEvent**(`e`): `void`

Defined in: [engine/GraphXEngine.ts:543](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L543)

让已注册图形有机会基于拖拽事件创建实例。第一个返回非空实例的图形定义会接管这次拖拽创建。

#### Parameters

##### e

`DragEvent`

#### Returns

`void`

***

### setMode()

> **setMode**(`mode`, `options?`): `void`

Defined in: [engine/GraphXEngine.ts:556](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L556)

切换引擎模式，并在需要时重建画板。切换模式会清空当前 shape 实例、命令渲染结果以及数学变量；如果传入 options，则会替换当前全局画板配置。

#### Parameters

##### mode

[`EngineMode`](../type-aliases/EngineMode.md)

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`void`

***

### resetBoard()

> **resetBoard**(`options?`): `void`

Defined in: [engine/GraphXEngine.ts:573](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L573)

重建画板并清空当前运行时状态。如果传入 options，则会替换当前全局画板配置。

#### Parameters

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`void`

***

### clearVariables()

> **clearVariables**(): `void`

Defined in: [engine/GraphXEngine.ts:588](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L588)

清空共享数学作用域中的变量。

#### Returns

`void`

***

### executeCommand()

> **executeCommand**(`id`, `expression`, `color?`, `extraOptions?`): `void`

Defined in: [engine/GraphXEngine.ts:593](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L593)

执行一条表达式或指令，并将生成的元素记录到指定 id 下。相同 id 的命令会先移除旧结果再重新渲染，color 和 extraOptions 会继续透传给底层渲染器。

#### Parameters

##### id

`string`

##### expression

`string`

##### color?

`string` = `'#0ea5e9'`

##### extraOptions?

`any`

#### Returns

`void`

***

### removeCommand()

> **removeCommand**(`id`): `void`

Defined in: [engine/GraphXEngine.ts:619](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L619)

移除某个指令 id 关联的全部渲染元素。

#### Parameters

##### id

`string`

#### Returns

`void`

***

### exportScene()

> **exportScene**(): [`GraphSceneExportResult`](../interfaces/GraphSceneExportResult.md)

Defined in: [engine/GraphXEngine.ts:624](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L624)

导出当前引擎的公开 scene document。

#### Returns

[`GraphSceneExportResult`](../interfaces/GraphSceneExportResult.md)

***

### loadScene()

> **loadScene**(`input`): [`GraphSceneLoadResult`](../interfaces/GraphSceneLoadResult.md)

Defined in: [engine/GraphXEngine.ts:715](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L715)

加载一个 scene document，并以整体替换的方式恢复当前引擎内容。

#### Parameters

##### input

`string` | [`GraphSceneDocument`](../interfaces/GraphSceneDocument.md)

#### Returns

[`GraphSceneLoadResult`](../interfaces/GraphSceneLoadResult.md)

***

### clearBoard()

> **clearBoard**(): `void`

Defined in: [engine/GraphXEngine.ts:1054](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1054)

通过重建画板来清空当前内容。

#### Returns

`void`

***

### registerAnimationTask()

> **registerAnimationTask**(`taskId`, `task`): `void`

Defined in: [engine/GraphXEngine.ts:1059](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1059)

向共享动画帧调度器注册一个任务。task 每帧执行一次；当它返回 false 时，引擎会自动移除该任务。

#### Parameters

##### taskId

`string`

##### task

(`timestamp`) => `boolean` \| `void`

#### Returns

`void`

***

### unregisterAnimationTask()

> **unregisterAnimationTask**(`taskId`): `void`

Defined in: [engine/GraphXEngine.ts:1065](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1065)

从共享动画帧调度器中移除一个任务。

#### Parameters

##### taskId

`string`

#### Returns

`void`

***

### destroy()

> **destroy**(): `void`

Defined in: [engine/GraphXEngine.ts:1075](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1075)

释放画板资源并清空已注册的运行时状态。

#### Returns

`void`

***

### forceUpdate()

> **forceUpdate**(): `void`

Defined in: [engine/GraphXEngine.ts:1086](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1086)

触发一次完整的 JSXGraph 画板刷新。

#### Returns

`void`

***

### resize()

> **resize**(`width?`, `height?`): `void`

Defined in: [engine/GraphXEngine.ts:1096](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1096)

安全地调整当前画板的渲染尺寸。如果在混合层或监听容器调整大小，使用此方法能避免用 `resetBoard` 导致的灾难性“死循环重建”。
如果不传递 width 和 height，引擎将自动探测当前绑定的 DOM 容器实际大小进行重置。

#### Parameters

##### width?

`number`

##### height?

`number`

#### Returns

`void`

***

### getBoard()

> **getBoard**(): `Board` \| `null`

Defined in: [engine/GraphXEngine.ts:1119](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1119)

返回底层 JSXGraph 画板实例。若当前尚未初始化成功，则返回 null。

#### Returns

`Board` \| `null`

***

### getViewport()

> **getViewport**(): [`GraphViewport`](../interfaces/GraphViewport.md)

Defined in: [engine/GraphXEngine.ts:1124](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1124)

返回当前画板视口尺寸，返回值以像素为单位。

#### Returns

[`GraphViewport`](../interfaces/GraphViewport.md)

***

### projectUserPoint()

> **projectUserPoint**(`point`): [`GraphScreenPoint`](../interfaces/GraphScreenPoint.md) \| `null`

Defined in: [engine/GraphXEngine.ts:1133](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1133)

将二维用户坐标点投影到屏幕坐标系。若当前无法完成投影，则返回 null。

#### Parameters

##### point

\[`number`, `number`\]

#### Returns

[`GraphScreenPoint`](../interfaces/GraphScreenPoint.md) \| `null`

***

### projectPoint3D()

> **projectPoint3D**(`point`): [`GraphScreenPoint`](../interfaces/GraphScreenPoint.md) \| `null`

Defined in: [engine/GraphXEngine.ts:1145](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1145)

借助当前 view3d 将三维点投影到屏幕坐标系。当前不在 3D 模式或无法投影时返回 null。

#### Parameters

##### point

\[`number`, `number`, `number`\]

#### Returns

[`GraphScreenPoint`](../interfaces/GraphScreenPoint.md) \| `null`

***

### projectUserBounds()

> **projectUserBounds**(`points`): [`GraphScreenBounds`](../interfaces/GraphScreenBounds.md) \| `null`

Defined in: [engine/GraphXEngine.ts:1160](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1160)

投影一组二维点，并返回其屏幕包围盒。若没有有效投影点，则返回 null。

#### Parameters

##### points

\[`number`, `number`\][]

#### Returns

[`GraphScreenBounds`](../interfaces/GraphScreenBounds.md) \| `null`

***

### project3DBounds()

> **project3DBounds**(`points`): [`GraphScreenBounds`](../interfaces/GraphScreenBounds.md) \| `null`

Defined in: [engine/GraphXEngine.ts:1165](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1165)

投影一组三维点，并返回其屏幕包围盒。若没有有效投影点，则返回 null。

#### Parameters

##### points

\[`number`, `number`, `number`\][]

#### Returns

[`GraphScreenBounds`](../interfaces/GraphScreenBounds.md) \| `null`

***

### getBoundsAnchor()

> **getBoundsAnchor**(`bounds`, `anchor?`): [`GraphScreenPoint`](../interfaces/GraphScreenPoint.md)

Defined in: [engine/GraphXEngine.ts:1170](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1170)

根据屏幕包围盒解析一个锚点位置。anchor 默认为 center。

#### Parameters

##### bounds

[`GraphScreenBounds`](../interfaces/GraphScreenBounds.md)

##### anchor?

[`GraphScreenAnchor`](../type-aliases/GraphScreenAnchor.md) = `'center'`

#### Returns

[`GraphScreenPoint`](../interfaces/GraphScreenPoint.md)

***

### clampScreenPoint()

> **clampScreenPoint**(`point`, `padding?`): [`GraphScreenPoint`](../interfaces/GraphScreenPoint.md)

Defined in: [engine/GraphXEngine.ts:1198](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1198)

将屏幕坐标点限制在视口内，便于悬浮 UI 不越界。padding 用于为四周预留安全边距。

#### Parameters

##### point

[`GraphScreenPoint`](../interfaces/GraphScreenPoint.md)

##### padding?

[`GraphViewportPadding`](../interfaces/GraphViewportPadding.md) = `{}`

#### Returns

[`GraphScreenPoint`](../interfaces/GraphScreenPoint.md)

***

### getView3D()

> **getView3D**(): `any`

Defined in: [engine/GraphXEngine.ts:1324](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/engine/GraphXEngine.ts#L1324)

当引擎运行在 3D 模式时，返回当前激活的 JSXGraph view3d 实例。当前不是 3D 模式时通常返回 null。

#### Returns

`any`
