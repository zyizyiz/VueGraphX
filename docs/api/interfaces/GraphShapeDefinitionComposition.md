[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeDefinitionComposition

# Interface: GraphShapeDefinitionComposition\<Payload, StateType\>

Defined in: [architecture/shapes/composition.ts:276](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/composition.ts#L276)

将输入负载转换为组合对象的图形定义辅助接口。

## Type Parameters

### Payload

`Payload` = `unknown`

### StateType

`StateType` = `unknown`

## Properties

### type

> **type**: `string`

Defined in: [architecture/shapes/composition.ts:280](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/composition.ts#L280)

图形类型名。

***

### supportedModes

> **supportedModes**: [`EngineMode`](../type-aliases/EngineMode.md) \| [`EngineMode`](../type-aliases/EngineMode.md)[] \| `"all"`

Defined in: [architecture/shapes/composition.ts:285](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/composition.ts#L285)

支持的引擎模式。

***

### scene?

> `optional` **scene**: [`GraphShapeSceneDefinition`](GraphShapeSceneDefinition.md)\<`Payload`\>

Defined in: [architecture/shapes/composition.ts:290](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/composition.ts#L290)

可选的 scene document 参与声明。

## Methods

### create()

> **create**(`context`, `payload?`): [`GraphShapeComposition`](GraphShapeComposition.md)\<`StateType`\> \| `null`

Defined in: [architecture/shapes/composition.ts:293](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/composition.ts#L293)

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

Defined in: [architecture/shapes/composition.ts:296](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/composition.ts#L296)

可选的拖拽创建入口。返回 null 表示本次拖拽事件不由当前定义处理。

#### Parameters

##### context

[`GraphShapeContext`](GraphShapeContext.md)

##### event

`DragEvent`

#### Returns

[`GraphShapeComposition`](GraphShapeComposition.md)\<`StateType`\> \| `null`
