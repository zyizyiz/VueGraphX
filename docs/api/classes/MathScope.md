[**vuegraphx**](../README.md)

***

[vuegraphx](../README.md) / MathScope

# Class: MathScope

Defined in: [math/MathScope.ts:6](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/math/MathScope.ts#L6)

供表达式渲染器共享使用的可变求值作用域。

## Constructors

### Constructor

> **new MathScope**(): `MathScope`

#### Returns

`MathScope`

## Properties

### data

> **data**: `any` = `{}`

Defined in: [math/MathScope.ts:7](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/math/MathScope.ts#L7)

## Methods

### clear()

> **clear**(): `void`

Defined in: [math/MathScope.ts:12](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/math/MathScope.ts#L12)

清空作用域中保存的所有变量。

#### Returns

`void`

***

### evaluate()

> **evaluate**(`node`): `any`

Defined in: [math/MathScope.ts:19](https://github.com/zyizyiz/VueGraphX/blob/4b7129ef16e07c8334f02a2a510c37f3c77444ab/src/math/MathScope.ts#L19)

基于当前作用域执行一个编译后的 mathjs 节点。

#### Parameters

##### node

`MathNode`

#### Returns

`any`
