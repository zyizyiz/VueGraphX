[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphPointAnnotationSource

# Type Alias: GraphPointAnnotationSource

> **GraphPointAnnotationSource** = \{ `kind`: `"point"`; `point`: `any`; \} \| \{ `kind`: `"intersection"`; `elements`: `any`[]; `index?`: `number`; \} \| \{ `kind`: `"midpoint"`; `points`: \[`any`, `any`\]; \} \| \{ `kind`: `"computed"`; `resolve`: () => `any`; \}

Defined in: [architecture/shapes/contracts.ts:218](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/shapes/contracts.ts#L218)

标注点支持的来源类型。

## Type Declaration

\{ `kind`: `"point"`; `point`: `any`; \}

### kind

> **kind**: `"point"`

直接使用现有点对象作为标注来源。

### point

> **point**: `any`

对应的点对象。

\{ `kind`: `"intersection"`; `elements`: `any`[]; `index?`: `number`; \}

### kind

> **kind**: `"intersection"`

使用多个元素的交点作为标注来源。

### elements

> **elements**: `any`[]

参与求交的元素列表。

### index?

> `optional` **index**: `number`

取第几个交点，默认为第一个。

\{ `kind`: `"midpoint"`; `points`: \[`any`, `any`\]; \}

### kind

> **kind**: `"midpoint"`

使用两点中点作为标注来源。

### points

> **points**: \[`any`, `any`\]

构成中点的两端点。

\{ `kind`: `"computed"`; `resolve`: () => `any`; \}

### kind

> **kind**: `"computed"`

使用一个惰性解析函数作为来源。

### resolve()

> **resolve**: () => `any`

运行时返回目标点对象的函数。

#### Returns

`any`
