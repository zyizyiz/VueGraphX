[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / JXGView3D

# Interface: JXGView3D

Defined in: [types/engine.ts:93](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L93)

VueGraphX 在 3D 模式下使用的最小 view3d 接口。

## Extends

- `GeometryElement`

## Properties

### create()

> **create**: (`type`, `parents`, `attributes?`) => `GeometryElement`

Defined in: [types/engine.ts:97](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L97)

在当前 3D 视图中创建一个 JSXGraph 3D 元素。

#### Parameters

##### type

`string`

##### parents

`any`[]

##### attributes?

`any`

#### Returns

`GeometryElement`

***

### llftCorner

> **llftCorner**: \[`number`, `number`\]

Defined in: [types/engine.ts:98](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L98)

***

### size

> **size**: \[`number`, `number`\]

Defined in: [types/engine.ts:99](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L99)

***

### bbox3D

> **bbox3D**: \[\[`number`, `number`\], \[`number`, `number`\], \[`number`, `number`\]\]

Defined in: [types/engine.ts:100](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/types/engine.ts#L100)
