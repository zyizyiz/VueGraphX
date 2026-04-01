[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / createComputedPointAnnotation

# Function: createComputedPointAnnotation()

> **createComputedPointAnnotation**(`key`, `resolve`, `options?`): [`GraphPointAnnotationSpec`](../interfaces/GraphPointAnnotationSpec.md)

Defined in: [architecture/shapes/composition.ts:657](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/composition.ts#L657)

基于延迟解析的点创建标注描述。

## Parameters

### key

`string`

### resolve

() => `any`

### options?

`Pick`\<[`GraphPointAnnotationSpec`](../interfaces/GraphPointAnnotationSpec.md), `"label"` \| `"attributes"`\>

## Returns

[`GraphPointAnnotationSpec`](../interfaces/GraphPointAnnotationSpec.md)
