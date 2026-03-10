[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphShapeGroup

# Interface: GraphShapeGroup

Defined in: [architecture/shapes/contracts.ts:583](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L583)

对一个或多个 JSXGraph 对象的受管分组封装。

## Properties

### id

> **id**: `string`

Defined in: [architecture/shapes/contracts.ts:587](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L587)

分组唯一 id。

***

### members

> **members**: readonly [`GraphShapeGroupMember`](GraphShapeGroupMember.md)[]

Defined in: [architecture/shapes/contracts.ts:592](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L592)

当前分组包含的成员列表。

***

### nativeGroup

> **nativeGroup**: `any`

Defined in: [architecture/shapes/contracts.ts:597](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L597)

若启用原生 group，则为对应 JSXGraph group；否则为 null。

## Methods

### getMember()

> **getMember**(`key`): [`GraphShapeGroupMember`](GraphShapeGroupMember.md) \| `null`

Defined in: [architecture/shapes/contracts.ts:602](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L602)

返回指定 key 的成员。

#### Parameters

##### key

`string`

#### Returns

[`GraphShapeGroupMember`](GraphShapeGroupMember.md) \| `null`

***

### getObject()

> **getObject**(`key`): `any`

Defined in: [architecture/shapes/contracts.ts:607](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L607)

返回指定 key 对应的原始对象。

#### Parameters

##### key

`string`

#### Returns

`any`

***

### getRenderNode()

> **getRenderNode**(`key`): `Element` \| `null`

Defined in: [architecture/shapes/contracts.ts:612](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L612)

返回指定 key 成员对应的底层渲染节点。

#### Parameters

##### key

`string`

#### Returns

`Element` \| `null`

***

### has()

> **has**(`key`): `boolean`

Defined in: [architecture/shapes/contracts.ts:617](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L617)

判断分组中是否存在指定 key。

#### Parameters

##### key

`string`

#### Returns

`boolean`

***

### keys()

> **keys**(): `string`[]

Defined in: [architecture/shapes/contracts.ts:622](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L622)

返回全部成员 key。

#### Returns

`string`[]

***

### pick()

> **pick**(`keys`): `GraphShapeGroup`

Defined in: [architecture/shapes/contracts.ts:627](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L627)

基于部分 key 创建子分组视图。

#### Parameters

##### keys

`string` | `string`[]

#### Returns

`GraphShapeGroup`

***

### forEach()

> **forEach**(`callback`, `keys?`): `void`

Defined in: [architecture/shapes/contracts.ts:632](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L632)

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

Defined in: [architecture/shapes/contracts.ts:637](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L637)

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

Defined in: [architecture/shapes/contracts.ts:642](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L642)

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

Defined in: [architecture/shapes/contracts.ts:647](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L647)

显示指定成员。

#### Parameters

##### keys?

`string` | `string`[]

#### Returns

`void`

***

### hide()

> **hide**(`keys?`): `void`

Defined in: [architecture/shapes/contracts.ts:652](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L652)

隐藏指定成员。

#### Parameters

##### keys?

`string` | `string`[]

#### Returns

`void`

***

### on()

> **on**(`eventName`, `handler`, `keys?`): () => `void`

Defined in: [architecture/shapes/contracts.ts:657](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L657)

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

Defined in: [architecture/shapes/contracts.ts:662](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L662)

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

### bindNativeEvent()

> **bindNativeEvent**(`eventName`, `handler`, `options?`): () => `void`

Defined in: [architecture/shapes/contracts.ts:668](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L668)

直接为成员的原生渲染节点绑定 DOM 事件。
适合多层透传、命中代理失效或需要更细粒度控制的场景。

#### Parameters

##### eventName

`string`

##### handler

(`member`, `event`, `node`) => `void`

##### options?

[`GraphShapeGroupNativeEventOptions`](GraphShapeGroupNativeEventOptions.md)

#### Returns

> (): `void`

##### Returns

`void`

***

### bindSelectOnHit()

> **bindSelectOnHit**(`options?`): () => `void`

Defined in: [architecture/shapes/contracts.ts:677](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L677)

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

Defined in: [architecture/shapes/contracts.ts:682](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L682)

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

Defined in: [architecture/shapes/contracts.ts:687](https://github.com/zyizyiz/VueGraphX/blob/5bee1dec6ecd05ac28e6fb1cd1de054ab497d0f4/src/architecture/shapes/contracts.ts#L687)

解绑指定事件；未传 eventName 时解绑全部。

#### Parameters

##### eventName?

`string`

##### keys?

`string` | `string`[]

#### Returns

`void`
