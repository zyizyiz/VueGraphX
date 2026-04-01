[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeGroupDragOptions

# Interface: GraphShapeGroupDragOptions

Defined in: [architecture/shapes/contracts.ts:113](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L113)

## Properties

### keys?

> `optional` **keys**: `string` \| `string`[]

Defined in: [architecture/shapes/contracts.ts:117](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L117)

仅对指定 key 的成员启用拖拽。

***

### filter()?

> `optional` **filter**: (`member`, ...`args`) => `boolean`

Defined in: [architecture/shapes/contracts.ts:122](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L122)

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

Defined in: [architecture/shapes/contracts.ts:127](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L127)

是否在拖拽开始时自动选中所属图形。

***

### onStart()?

> `optional` **onStart**: (`member`, ...`args`) => `void`

Defined in: [architecture/shapes/contracts.ts:132](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L132)

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

Defined in: [architecture/shapes/contracts.ts:137](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L137)

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

Defined in: [architecture/shapes/contracts.ts:142](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/architecture/shapes/contracts.ts#L142)

拖拽结束回调。

#### Parameters

##### member

[`GraphShapeGroupMember`](GraphShapeGroupMember.md)

##### args

...`any`[]

#### Returns

`void`
