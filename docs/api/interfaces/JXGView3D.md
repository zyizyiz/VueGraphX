[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / JXGView3D

# Interface: JXGView3D

Defined in: [types/engine.ts:87](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L87)

VueGraphX 在 3D 模式下使用的最小 view3d 接口。

## Extends

- `GeometryElement`

## Properties

### create()

> **create**: (`type`, `parents`, `attributes?`) => `GeometryElement`

Defined in: [types/engine.ts:91](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L91)

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

Defined in: [types/engine.ts:92](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L92)

***

### size

> **size**: \[`number`, `number`\]

Defined in: [types/engine.ts:93](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L93)

***

### bbox3D

> **bbox3D**: \[\[`number`, `number`\], \[`number`, `number`\], \[`number`, `number`\]\]

Defined in: [types/engine.ts:94](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/types/engine.ts#L94)
