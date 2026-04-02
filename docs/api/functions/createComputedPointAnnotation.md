[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / createComputedPointAnnotation

# Function: createComputedPointAnnotation()

> **createComputedPointAnnotation**(`key`, `resolve`, `options?`): [`GraphPointAnnotationSpec`](../interfaces/GraphPointAnnotationSpec.md)

Defined in: [architecture/shapes/composition.ts:657](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/composition.ts#L657)

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
