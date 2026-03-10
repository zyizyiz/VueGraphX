[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / createComputedPointAnnotation

# Function: createComputedPointAnnotation()

> **createComputedPointAnnotation**(`key`, `resolve`, `options?`): [`GraphPointAnnotationSpec`](../interfaces/GraphPointAnnotationSpec.md)

Defined in: [architecture/shapes/composition.ts:621](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/composition.ts#L621)

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
