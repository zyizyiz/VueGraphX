[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / BoardManager

# Class: BoardManager

Defined in: [board/BoardManager.ts:47](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L47)

供公共引擎门面调用的底层画板生命周期管理器。

## Constructors

### Constructor

> **new BoardManager**(`containerId`, `options?`): `BoardManager`

Defined in: [board/BoardManager.ts:59](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L59)

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

Defined in: [board/BoardManager.ts:48](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L48)

***

### view3d

> **view3d**: [`JXGView3D`](../interfaces/JXGView3D.md) \| `null` = `null`

Defined in: [board/BoardManager.ts:49](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L49)

***

### mode

> **mode**: [`EngineMode`](../type-aliases/EngineMode.md) = `'2d'`

Defined in: [board/BoardManager.ts:50](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L50)

## Methods

### initBoard()

> **initBoard**(): `void`

Defined in: [board/BoardManager.ts:89](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L89)

使用当前模式与配置初始化或重建 JSXGraph 画板。

#### Returns

`void`

***

### syncView3DToBoard()

> **syncView3DToBoard**(): `void`

Defined in: [board/BoardManager.ts:150](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L150)

#### Returns

`void`

***

### setMode()

> **setMode**(`mode`, `options?`): `boolean`

Defined in: [board/BoardManager.ts:172](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L172)

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

Defined in: [board/BoardManager.ts:185](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L185)

在保留当前模式的前提下重建画板。

#### Parameters

##### options?

[`GraphXOptions`](../interfaces/GraphXOptions.md)

#### Returns

`void`

***

### destroy()

> **destroy**(): `void`

Defined in: [board/BoardManager.ts:195](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/board/BoardManager.ts#L195)

释放底层 JSXGraph 画板资源。

#### Returns

`void`
