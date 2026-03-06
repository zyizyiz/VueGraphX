[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeGroup

# Interface: GraphShapeGroup

Defined in: [architecture/shapes/contracts.ts:548](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L548)

对一个或多个 JSXGraph 对象的受管分组封装。

## Properties

### id

> **id**: `string`

Defined in: [architecture/shapes/contracts.ts:552](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L552)

分组唯一 id。

***

### members

> **members**: readonly [`GraphShapeGroupMember`](GraphShapeGroupMember.md)[]

Defined in: [architecture/shapes/contracts.ts:557](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L557)

当前分组包含的成员列表。

***

### nativeGroup

> **nativeGroup**: `any`

Defined in: [architecture/shapes/contracts.ts:562](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L562)

若启用原生 group，则为对应 JSXGraph group；否则为 null。

## Methods

### getMember()

> **getMember**(`key`): [`GraphShapeGroupMember`](GraphShapeGroupMember.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:567](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L567)

返回指定 key 的成员。

#### Parameters

##### key

`string`

#### Returns

[`GraphShapeGroupMember`](GraphShapeGroupMember.md) \| `null`

***

### getObject()

> **getObject**(`key`): `any`

Defined in: [architecture/shapes/contracts.ts:572](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L572)

返回指定 key 对应的原始对象。

#### Parameters

##### key

`string`

#### Returns

`any`

***

### has()

> **has**(`key`): `boolean`

Defined in: [architecture/shapes/contracts.ts:577](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L577)

判断分组中是否存在指定 key。

#### Parameters

##### key

`string`

#### Returns

`boolean`

***

### keys()

> **keys**(): `string`[]

Defined in: [architecture/shapes/contracts.ts:582](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L582)

返回全部成员 key。

#### Returns

`string`[]

***

### pick()

> **pick**(`keys`): `GraphShapeGroup`

Defined in: [architecture/shapes/contracts.ts:587](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L587)

基于部分 key 创建子分组视图。

#### Parameters

##### keys

`string` | `string`[]

#### Returns

`GraphShapeGroup`

***

### forEach()

> **forEach**(`callback`, `keys?`): `void`

Defined in: [architecture/shapes/contracts.ts:592](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L592)

遍历一个或多个成员。

#### Parameters

##### callback

(`member`) => `void`

##### keys?

`string` | `string`[]

#### Returns

`void`

***

### setAttribute()

> **setAttribute**(`attributes`, `keys?`): `void`

Defined in: [architecture/shapes/contracts.ts:597](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L597)

批量设置成员属性。

#### Parameters

##### attributes

`Record`\<`string`, `unknown`\>

##### keys?

`string` | `string`[]

#### Returns

`void`

***

### setVisible()

> **setVisible**(`visible`, `keys?`): `void`

Defined in: [architecture/shapes/contracts.ts:602](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L602)

批量控制成员可见性。

#### Parameters

##### visible

`boolean`

##### keys?

`string` | `string`[]

#### Returns

`void`

***

### show()

> **show**(`keys?`): `void`

Defined in: [architecture/shapes/contracts.ts:607](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L607)

显示指定成员。

#### Parameters

##### keys?

`string` | `string`[]

#### Returns

`void`

***

### hide()

> **hide**(`keys?`): `void`

Defined in: [architecture/shapes/contracts.ts:612](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L612)

隐藏指定成员。

#### Parameters

##### keys?

`string` | `string`[]

#### Returns

`void`

***

### on()

> **on**(`eventName`, `handler`, `keys?`): () => `void`

Defined in: [architecture/shapes/contracts.ts:617](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L617)

绑定成员事件并返回解绑函数。

#### Parameters

##### eventName

`string`

##### handler

(`member`, ...`args`) => `void`

##### keys?

`string` | `string`[]

#### Returns

> (): `void`

##### Returns

`void`

***

### onHit()

> **onHit**(`handler`, `options?`): () => `void`

Defined in: [architecture/shapes/contracts.ts:622](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L622)

绑定命中事件辅助逻辑并返回解绑函数。

#### Parameters

##### handler

(`member`, ...`args`) => `void`

##### options?

[`GraphShapeGroupHitOptions`](GraphShapeGroupHitOptions.md)

#### Returns

> (): `void`

##### Returns

`void`

***

### bindSelectOnHit()

> **bindSelectOnHit**(`options?`): () => `void`

Defined in: [architecture/shapes/contracts.ts:627](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L627)

绑定命中即选中的交互。

#### Parameters

##### options?

[`GraphShapeGroupHitOptions`](GraphShapeGroupHitOptions.md)

#### Returns

> (): `void`

##### Returns

`void`

***

### bindDrag()

> **bindDrag**(`options?`): () => `void`

Defined in: [architecture/shapes/contracts.ts:632](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L632)

为一个或多个成员绑定拖拽交互。

#### Parameters

##### options?

[`GraphShapeGroupDragOptions`](GraphShapeGroupDragOptions.md)

#### Returns

> (): `void`

##### Returns

`void`

***

### off()

> **off**(`eventName?`, `keys?`): `void`

Defined in: [architecture/shapes/contracts.ts:637](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/contracts.ts#L637)

解绑指定事件；未传 eventName 时解绑全部。

#### Parameters

##### eventName?

`string`

##### keys?

`string` | `string`[]

#### Returns

`void`
