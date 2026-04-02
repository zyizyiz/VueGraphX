[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / AnimationCollectionCapabilityContract

# Interface: AnimationCollectionCapabilityContract

Defined in: [architecture/capabilities/contracts.ts:259](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L259)

单个图形暴露的一组动画轨道能力契约。

## Properties

### primaryTrackId?

> `optional` **primaryTrackId**: `string`

Defined in: [architecture/capabilities/contracts.ts:263](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L263)

默认主轨道 id；业务侧未指定轨道时通常使用它。

***

### tracks

> **tracks**: `Record`\<`string`, [`AnimationCapabilityContract`](AnimationCapabilityContract.md)\>

Defined in: [architecture/capabilities/contracts.ts:268](https://github.com/zyizyiz/VueGraphX/blob/9f72605fb698dc53077546b3d3b04f80b67b45d6/src/architecture/capabilities/contracts.ts#L268)

以轨道 id 为 key 的动画能力映射。
