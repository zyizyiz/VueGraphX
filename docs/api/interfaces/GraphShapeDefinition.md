[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeDefinition

# Interface: GraphShapeDefinition

Defined in: [architecture/shapes/contracts.ts:778](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L778)

注册到引擎中、用于创建某类图形的公共定义。

## Properties

### type

> **type**: `string`

Defined in: [architecture/shapes/contracts.ts:782](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L782)

图形类型名，也是 createShape 时使用的 entityType。

***

### supportedModes

> **supportedModes**: [`EngineMode`](../type-aliases/EngineMode.md) \| [`EngineMode`](../type-aliases/EngineMode.md)[] \| `"all"`

Defined in: [architecture/shapes/contracts.ts:787](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L787)

该图形定义允许出现的模式；传 all 表示所有模式均可使用。

## Methods

### createShape()

> **createShape**(`context`, `payload?`): [`GraphShapeInstance`](GraphShapeInstance.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:792](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L792)

基于上下文和负载创建图形实例。

#### Parameters

##### context

[`GraphShapeContext`](GraphShapeContext.md)

##### payload?

`unknown`

#### Returns

[`GraphShapeInstance`](GraphShapeInstance.md) \| `null`

***

### createFromDrop()?

> `optional` **createFromDrop**(`context`, `event`): [`GraphShapeInstance`](GraphShapeInstance.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:797](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L797)

可选的拖拽创建入口；返回 null 表示当前定义不处理该事件。

#### Parameters

##### context

[`GraphShapeContext`](GraphShapeContext.md)

##### event

`DragEvent`

#### Returns

[`GraphShapeInstance`](GraphShapeInstance.md) \| `null`
