[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphXEngine

# Class: GraphXEngine

Defined in: [engine/GraphXEngine.ts:39](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L39)

面向使用方的公共引擎门面，负责画板生命周期、指令渲染、图形注册与能力执行。

## Constructors

### Constructor

> **new GraphXEngine**(`containerId`, `options?`): `GraphXEngine`

Defined in: [engine/GraphXEngine.ts:52](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L52)

创建一个绑定到指定 DOM 容器 id 的引擎实例。containerId 指向目标 DOM 容器，该容器应当已经具备明确的宽高，options 会在初始化画板时透传给 JSXGraph。

#### Parameters

##### containerId

`string`

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`GraphXEngine`

## Methods

### registerShape()

> **registerShape**(`definition`): `void`

Defined in: [engine/GraphXEngine.ts:63](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L63)

按公共类型注册一个图形定义。definition.type 会作为 createShape 的调用入口。

#### Parameters

##### definition

[`GraphShapeDefinition`](../interfaces/GraphShapeDefinition.md)

#### Returns

`void`

***

### registerShapes()

> **registerShapes**(`definitions`): `void`

Defined in: [engine/GraphXEngine.ts:69](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L69)

按顺序批量注册多个图形定义。definitions 中的每一项都会按 registerShape 的规则依次注册。

#### Parameters

##### definitions

`Iterable`\<[`GraphShapeDefinition`](../interfaces/GraphShapeDefinition.md)\>

#### Returns

`void`

***

### subscribeCapabilities()

> **subscribeCapabilities**(`listener`): () => `void`

Defined in: [engine/GraphXEngine.ts:105](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L105)

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

Defined in: [engine/GraphXEngine.ts:114](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L114)

返回当前选中项及其标准化能力列表。返回结果同时包含 selection 和 capabilities 两部分。

#### Returns

[`GraphCapabilitySnapshot`](../interfaces/GraphCapabilitySnapshot.md)

***

### getSelection()

> **getSelection**(): [`GraphSelectionSnapshot`](../interfaces/GraphSelectionSnapshot.md) \| `null`

Defined in: [engine/GraphXEngine.ts:135](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L135)

返回当前选中的实体快照；如果没有选中项则返回 null。

#### Returns

[`GraphSelectionSnapshot`](../interfaces/GraphSelectionSnapshot.md) \| `null`

***

### getCapabilities()

> **getCapabilities**(): [`GraphCapabilityDescriptor`](../interfaces/GraphCapabilityDescriptor.md)[]

Defined in: [engine/GraphXEngine.ts:140](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L140)

返回当前选中项可用的能力列表。

#### Returns

[`GraphCapabilityDescriptor`](../interfaces/GraphCapabilityDescriptor.md)[]

***

### executeCapability()

> **executeCapability**(`capabilityId`, `payload?`): `boolean`

Defined in: [engine/GraphXEngine.ts:145](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L145)

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

> **createShape**(`entityType`, `payload?`): `boolean`

Defined in: [engine/GraphXEngine.ts:153](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L153)

根据已注册的图形类型创建一个实例。entityType 对应注册时 definition.type，payload 会透传给图形定义的 createShape；返回 true 表示创建成功，否则表示当前类型不存在、当前模式不可用或定义主动拒绝创建。

#### Parameters

##### entityType

`string`

##### payload?

`unknown`

#### Returns

`boolean`

***

### notifyCapabilityChange()

> **notifyCapabilityChange**(): `void`

Defined in: [engine/GraphXEngine.ts:163](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L163)

主动通知能力订阅者拉取一份新的快照。一般由引擎内部在状态变化后自动调用，图形作者通常通过 context.notifyChange 或 api.notifyChange 间接触发。

#### Returns

`void`

***

### handleDropEvent()

> **handleDropEvent**(`e`): `void`

Defined in: [engine/GraphXEngine.ts:248](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L248)

让已注册图形有机会基于拖拽事件创建实例。第一个返回非空实例的图形定义会接管这次拖拽创建。

#### Parameters

##### e

`DragEvent`

#### Returns

`void`

***

### setMode()

> **setMode**(`mode`, `options?`): `void`

Defined in: [engine/GraphXEngine.ts:259](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L259)

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

Defined in: [engine/GraphXEngine.ts:271](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L271)

重建画板并清空当前运行时状态。如果传入 options，则会替换当前全局画板配置。

#### Parameters

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`void`

***

### clearVariables()

> **clearVariables**(): `void`

Defined in: [engine/GraphXEngine.ts:281](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L281)

清空共享数学作用域中的变量。

#### Returns

`void`

***

### executeCommand()

> **executeCommand**(`id`, `expression`, `color?`, `extraOptions?`): `void`

Defined in: [engine/GraphXEngine.ts:286](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L286)

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

Defined in: [engine/GraphXEngine.ts:302](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L302)

移除某个指令 id 关联的全部渲染元素。

#### Parameters

##### id

`string`

#### Returns

`void`

***

### clearBoard()

> **clearBoard**(): `void`

Defined in: [engine/GraphXEngine.ts:308](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L308)

通过重建画板来清空当前内容。

#### Returns

`void`

***

### registerAnimationTask()

> **registerAnimationTask**(`taskId`, `task`): `void`

Defined in: [engine/GraphXEngine.ts:313](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L313)

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

Defined in: [engine/GraphXEngine.ts:319](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L319)

从共享动画帧调度器中移除一个任务。

#### Parameters

##### taskId

`string`

#### Returns

`void`

***

### destroy()

> **destroy**(): `void`

Defined in: [engine/GraphXEngine.ts:329](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L329)

释放画板资源并清空已注册的运行时状态。

#### Returns

`void`

***

### forceUpdate()

> **forceUpdate**(): `void`

Defined in: [engine/GraphXEngine.ts:339](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L339)

触发一次完整的 JSXGraph 画板刷新。

#### Returns

`void`

***

### getBoard()

> **getBoard**(): `Board` \| `null`

Defined in: [engine/GraphXEngine.ts:346](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L346)

返回底层 JSXGraph 画板实例。若当前尚未初始化成功，则返回 null。

#### Returns

`Board` \| `null`

***

### getViewport()

> **getViewport**(): [`GraphViewport`](../interfaces/GraphViewport.md)

Defined in: [engine/GraphXEngine.ts:351](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L351)

返回当前画板视口尺寸，返回值以像素为单位。

#### Returns

[`GraphViewport`](../interfaces/GraphViewport.md)

***

### projectUserPoint()

> **projectUserPoint**(`point`): [`GraphScreenPoint`](../interfaces/GraphScreenPoint.md) \| `null`

Defined in: [engine/GraphXEngine.ts:360](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L360)

将二维用户坐标点投影到屏幕坐标系。若当前无法完成投影，则返回 null。

#### Parameters

##### point

\[`number`, `number`\]

#### Returns

[`GraphScreenPoint`](../interfaces/GraphScreenPoint.md) \| `null`

***

### projectPoint3D()

> **projectPoint3D**(`point`): [`GraphScreenPoint`](../interfaces/GraphScreenPoint.md) \| `null`

Defined in: [engine/GraphXEngine.ts:372](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L372)

借助当前 view3d 将三维点投影到屏幕坐标系。当前不在 3D 模式或无法投影时返回 null。

#### Parameters

##### point

\[`number`, `number`, `number`\]

#### Returns

[`GraphScreenPoint`](../interfaces/GraphScreenPoint.md) \| `null`

***

### projectUserBounds()

> **projectUserBounds**(`points`): [`GraphScreenBounds`](../interfaces/GraphScreenBounds.md) \| `null`

Defined in: [engine/GraphXEngine.ts:382](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L382)

投影一组二维点，并返回其屏幕包围盒。若没有有效投影点，则返回 null。

#### Parameters

##### points

\[`number`, `number`\][]

#### Returns

[`GraphScreenBounds`](../interfaces/GraphScreenBounds.md) \| `null`

***

### project3DBounds()

> **project3DBounds**(`points`): [`GraphScreenBounds`](../interfaces/GraphScreenBounds.md) \| `null`

Defined in: [engine/GraphXEngine.ts:387](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L387)

投影一组三维点，并返回其屏幕包围盒。若没有有效投影点，则返回 null。

#### Parameters

##### points

\[`number`, `number`, `number`\][]

#### Returns

[`GraphScreenBounds`](../interfaces/GraphScreenBounds.md) \| `null`

***

### getBoundsAnchor()

> **getBoundsAnchor**(`bounds`, `anchor?`): [`GraphScreenPoint`](../interfaces/GraphScreenPoint.md)

Defined in: [engine/GraphXEngine.ts:392](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L392)

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

Defined in: [engine/GraphXEngine.ts:420](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L420)

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

Defined in: [engine/GraphXEngine.ts:515](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/engine/GraphXEngine.ts#L515)

当引擎运行在 3D 模式时，返回当前激活的 JSXGraph view3d 实例。当前不是 3D 模式时通常返回 null。

#### Returns

`any`
