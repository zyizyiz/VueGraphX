[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / BoardManager

# Class: BoardManager

Defined in: [board/BoardManager.ts:46](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L46)

供公共引擎门面调用的底层画板生命周期管理器。

## Constructors

### Constructor

> **new BoardManager**(`containerId`, `options?`): `BoardManager`

Defined in: [board/BoardManager.ts:58](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L58)

创建一个绑定到指定 DOM 容器 id 的画板管理器。

#### Parameters

##### containerId

`string`

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`BoardManager`

## Properties

### board

> **board**: `Board`

Defined in: [board/BoardManager.ts:47](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L47)

***

### view3d

> **view3d**: [`JXGView3D`](../interfaces/JXGView3D.md) \| `null` = `null`

Defined in: [board/BoardManager.ts:48](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L48)

***

### mode

> **mode**: [`EngineMode`](../type-aliases/EngineMode.md) = `'2d'`

Defined in: [board/BoardManager.ts:49](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L49)

## Methods

### initBoard()

> **initBoard**(): `void`

Defined in: [board/BoardManager.ts:87](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L87)

使用当前模式与配置初始化或重建 JSXGraph 画板。

#### Returns

`void`

***

### syncView3DToBoard()

> **syncView3DToBoard**(): `void`

Defined in: [board/BoardManager.ts:148](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L148)

#### Returns

`void`

***

### setMode()

> **setMode**(`mode`, `options?`): `boolean`

Defined in: [board/BoardManager.ts:170](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L170)

切换画板模式，并可选地替换全局画板配置。

#### Parameters

##### mode

[`EngineMode`](../type-aliases/EngineMode.md)

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`boolean`

***

### resetBoard()

> **resetBoard**(`options?`): `void`

Defined in: [board/BoardManager.ts:183](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L183)

在保留当前模式的前提下重建画板。

#### Parameters

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`void`

***

### destroy()

> **destroy**(): `void`

Defined in: [board/BoardManager.ts:193](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/board/BoardManager.ts#L193)

释放底层 JSXGraph 画板资源。

#### Returns

`void`
