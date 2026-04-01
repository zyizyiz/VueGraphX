[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeDefinition

# Interface: GraphShapeDefinition

Defined in: [architecture/shapes/contracts.ts:796](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L796)

注册到引擎中、用于创建某类图形的公共定义。

## Properties

### type

> **type**: `string`

Defined in: [architecture/shapes/contracts.ts:800](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L800)

图形类型名，也是 createShape 时使用的 entityType。

***

### supportedModes

> **supportedModes**: [`EngineMode`](../type-aliases/EngineMode.md) \| [`EngineMode`](../type-aliases/EngineMode.md)[] \| `"all"`

Defined in: [architecture/shapes/contracts.ts:805](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L805)

该图形定义允许出现的模式；传 all 表示所有模式均可使用。

***

### scene?

> `optional` **scene**: [`GraphShapeSceneDefinition`](GraphShapeSceneDefinition.md)\<`unknown`\>

Defined in: [architecture/shapes/contracts.ts:811](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L811)

可选的 scene document 参与声明。
只有声明了该字段的图形，才属于公共 scene import/export 的支持范围。

## Methods

### createShape()

> **createShape**(`context`, `payload?`): [`GraphShapeInstance`](GraphShapeInstance.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:816](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L816)

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

Defined in: [architecture/shapes/contracts.ts:821](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L821)

可选的拖拽创建入口；返回 null 表示当前定义不处理该事件。

#### Parameters

##### context

[`GraphShapeContext`](GraphShapeContext.md)

##### event

`DragEvent`

#### Returns

[`GraphShapeInstance`](GraphShapeInstance.md) \| `null`
