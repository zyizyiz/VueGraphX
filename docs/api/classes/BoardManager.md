[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / BoardManager

# Class: BoardManager

Defined in: [board/BoardManager.ts:7](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/board/BoardManager.ts#L7)

供公共引擎门面调用的底层画板生命周期管理器。

## Constructors

### Constructor

> **new BoardManager**(`containerId`, `options?`): `BoardManager`

Defined in: [board/BoardManager.ts:18](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/board/BoardManager.ts#L18)

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

Defined in: [board/BoardManager.ts:8](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/board/BoardManager.ts#L8)

***

### view3d

> **view3d**: [`JXGView3D`](../interfaces/JXGView3D.md) \| `null` = `null`

Defined in: [board/BoardManager.ts:9](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/board/BoardManager.ts#L9)

***

### mode

> **mode**: [`EngineMode`](../type-aliases/EngineMode.md) = `'2d'`

Defined in: [board/BoardManager.ts:10](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/board/BoardManager.ts#L10)

## Methods

### initBoard()

> **initBoard**(): `void`

Defined in: [board/BoardManager.ts:40](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/board/BoardManager.ts#L40)

使用当前模式与配置初始化或重建 JSXGraph 画板。

#### Returns

`void`

***

### setMode()

> **setMode**(`mode`, `options?`): `boolean`

Defined in: [board/BoardManager.ts:80](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/board/BoardManager.ts#L80)

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

Defined in: [board/BoardManager.ts:93](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/board/BoardManager.ts#L93)

在保留当前模式的前提下重建画板。

#### Parameters

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`void`

***

### destroy()

> **destroy**(): `void`

Defined in: [board/BoardManager.ts:103](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/board/BoardManager.ts#L103)

释放底层 JSXGraph 画板资源。

#### Returns

`void`
