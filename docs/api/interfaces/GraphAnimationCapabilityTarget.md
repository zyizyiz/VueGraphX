[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / GraphAnimationCapabilityTarget

# Interface: GraphAnimationCapabilityTarget

Defined in: [architecture/shapes/composition.ts:280](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L280)

同时包含主动画别名与多轨动画集合的能力对象。

## Properties

### animation

> **animation**: [`AnimationCapabilityContract`](AnimationCapabilityContract.md)

Defined in: [architecture/shapes/composition.ts:282](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L282)

向后兼容的主动画轨道别名。当业务侧只关心单轨动画时可以直接消费这个字段。

***

### animations

> **animations**: [`AnimationCollectionCapabilityContract`](AnimationCollectionCapabilityContract.md)

Defined in: [architecture/shapes/composition.ts:285](https://github.com/zyizyiz/VueGraphX/blob/708b133750b40c4618f980ee3f1e94c99bc50898/src/architecture/shapes/composition.ts#L285)

完整的多轨动画集合。当图形同时暴露多条轨道时，业务侧应优先读取这里。
