[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeSceneDefinition

# Interface: GraphShapeSceneDefinition\<Payload\>

Defined in: [architecture/shapes/contracts.ts:60](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L60)

显式声明某类图形可参与公共 scene document 合同的配置。

## Type Parameters

### Payload

`Payload` = `unknown`

## Properties

### normalizePayload()?

> `optional` **normalizePayload**: (`payload`) => `Payload`

Defined in: [architecture/shapes/contracts.ts:65](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L65)

在导入 scene 时对原始 payload 做归一化或校验。
可以抛出异常让调用方得到恢复失败 diagnostics。

#### Parameters

##### payload

`unknown`

#### Returns

`Payload`
