[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeGroupDragOptions

# Interface: GraphShapeGroupDragOptions

Defined in: [architecture/shapes/contracts.ts:95](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L95)

## Properties

### keys?

> `optional` **keys**: `string` \| `string`[]

Defined in: [architecture/shapes/contracts.ts:99](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L99)

仅对指定 key 的成员启用拖拽。

***

### filter()?

> `optional` **filter**: (`member`, ...`args`) => `boolean`

Defined in: [architecture/shapes/contracts.ts:104](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L104)

运行时过滤是否允许某个成员参与拖拽。

#### Parameters

##### member

[`GraphShapeGroupMember`](GraphShapeGroupMember.md)

##### args

...`any`[]

#### Returns

`boolean`

***

### selectOnStart?

> `optional` **selectOnStart**: `boolean`

Defined in: [architecture/shapes/contracts.ts:109](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L109)

是否在拖拽开始时自动选中所属图形。

***

### onStart()?

> `optional` **onStart**: (`member`, ...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:114](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L114)

拖拽开始回调。

#### Parameters

##### member

[`GraphShapeGroupMember`](GraphShapeGroupMember.md)

##### args

...`any`[]

#### Returns

`void`

***

### onMove()?

> `optional` **onMove**: (`member`, ...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:119](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L119)

拖拽移动回调。

#### Parameters

##### member

[`GraphShapeGroupMember`](GraphShapeGroupMember.md)

##### args

...`any`[]

#### Returns

`void`

***

### onEnd()?

> `optional` **onEnd**: (`member`, ...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:124](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L124)

拖拽结束回调。

#### Parameters

##### member

[`GraphShapeGroupMember`](GraphShapeGroupMember.md)

##### args

...`any`[]

#### Returns

`void`
