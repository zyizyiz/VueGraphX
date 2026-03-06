[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeDefinitionComposition

# Interface: GraphShapeDefinitionComposition\<Payload, StateType\>

Defined in: [architecture/shapes/composition.ts:259](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L259)

将输入负载转换为组合对象的图形定义辅助接口。

## Type Parameters

### Payload

`Payload` = `unknown`

### StateType

`StateType` = `unknown`

## Properties

### type

> **type**: `string`

Defined in: [architecture/shapes/composition.ts:263](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L263)

图形类型名。

***

### supportedModes

> **supportedModes**: [`EngineMode`](../type-aliases/EngineMode.md) \| [`EngineMode`](../type-aliases/EngineMode.md)[] \| `"all"`

Defined in: [architecture/shapes/composition.ts:268](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L268)

支持的引擎模式。

## Methods

### create()

> **create**(`context`, `payload?`): [`GraphShapeComposition`](GraphShapeComposition.md)\<`StateType`\> \| `null`

Defined in: [architecture/shapes/composition.ts:271](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L271)

将上下文和负载转换为组合对象。返回 null 表示当前负载不合法或当前定义决定不创建实例。

#### Parameters

##### context

[`GraphShapeContext`](GraphShapeContext.md)

##### payload?

`Payload`

#### Returns

[`GraphShapeComposition`](GraphShapeComposition.md)\<`StateType`\> \| `null`

***

### createFromDrop()?

> `optional` **createFromDrop**(`context`, `event`): [`GraphShapeComposition`](GraphShapeComposition.md)\<`StateType`\> \| `null`

Defined in: [architecture/shapes/composition.ts:274](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L274)

可选的拖拽创建入口。返回 null 表示本次拖拽事件不由当前定义处理。

#### Parameters

##### context

[`GraphShapeContext`](GraphShapeContext.md)

##### event

`DragEvent`

#### Returns

[`GraphShapeComposition`](GraphShapeComposition.md)\<`StateType`\> \| `null`
