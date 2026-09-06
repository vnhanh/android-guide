---
id: fundamentals-value-vs-reference-semantics
title: Value vs Reference Semantics, Across Five Languages
description: Whether copying, reassigning, or passing a value gives you an independent copy or another handle to the same thing, per language, and the copy-on-write and shallow-copy mechanics that make the answer non-obvious.
tags: [value-semantics, reference-semantics, mutability, kotlin, java, swift, dart, typescript, mid, senior]
lang: en
status: complete
domain: 01-programming-fundamentals
platform: shared
band: X
level: Mid
sidebar_position: 2
prerequisites: []
outcomes:
  - "Predict whether a mutation through one reference is visible through another, per language"
  - "Explain why Swift's copy-on-write collections don't pay a full-copy cost on every mutation, and name the one case where the shallow-copy trap still applies"
resources:
  - title: "Structures and classes — The Swift Programming Language"
    url: "https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/"
    date: "2025-06-01"
  - title: "Classes — Dart documentation"
    url: "https://dart.dev/language/classes"
    date: "2025-04-01"
---

# Value vs Reference Semantics, Across Five Languages

Handing someone a photocopy of a document and handing them your only key open onto two different
worlds: mark up the photocopy and the original is untouched; hand over the key and whatever they
do with it happens to the one door it opens. Every assignment, function argument, and property
store in your code is one of these two moves, and the language decides which one you get by
default. This article is that decision, per language, plus the two mechanisms — copy-on-write and
canonicalized constants — that let a language give you copy-like behavior without literally
copying, and the one failure shape (a "copy" that still shares a nested reference) that shows up
under a different name in every language here.

## Mid

**Interview question: "If you copy or reassign this value, do you get an independent copy?"**

The honest answer names the mechanism: value types copy on assignment, reference types share the
same underlying object, and most languages only give you one or the other per kind of type — not
a choice you make per variable.

```swift
// Swift — struct is a value type: assigning copies. class is a reference type: assigning shares.
struct Point { var x: Int; var y: Int }
var a = Point(x: 0, y: 0)
var b = a          // COPY — b is an independent value
b.x = 10
a.x                 // still 0 — mutating b never touched a

final class Counter { var value = 0 }
let c1 = Counter()
let c2 = c1         // SAME INSTANCE — c2 is another reference to c1's object
c2.value = 10
c1.value            // 10 — c1 and c2 point at the same object
```

**Kotlin, Java, and Dart all answer the same way: every user-defined type is a reference type.**
There is no user-facing "struct" — a `class`, a `data class`, a Dart class, all behave like
Swift's `class`. Only the JVM/Dart primitives (`Int`, `Boolean`, `int`, `double`, and so on) are
true value types, and that distinction is invisible to the programmer — you never choose it, it
just is.

```kotlin
// Kotlin — every user-defined type is a reference type. Assigning shares the same instance.
class Counter(var value: Int = 0)
val c1 = Counter()
val c2 = c1        // SAME INSTANCE — c2 is another reference to c1's object
c2.value = 10
c1.value           // 10
```

```java
// Java — identical shape. No structs; records (Java 16+) are still reference types under the
// hood, just with generated equals()/hashCode() — not a value-type copy on assignment.
class Counter { int value = 0; }
Counter c1 = new Counter();
Counter c2 = c1;   // SAME INSTANCE
c2.value = 10;
c1.value;          // 10
```

```dart
// Dart — same shape again. All user-defined types are reference types by default.
class Counter { int value = 0; }
final c1 = Counter();
final c2 = c1;     // SAME INSTANCE
c2.value = 10;
c1.value;          // 10
```

**TypeScript/JavaScript split the same way, just without a class-vs-struct vocabulary at all:**
primitives (`string`, `number`, `boolean`) copy by value; objects and arrays are always reference
types.

```typescript
// TypeScript — primitives copy by value, objects and arrays share by reference.
let x = 5;
let y = x;         // COPY — independent
y = 10;
x;                 // still 5

const obj1 = { value: 0 };
const obj2 = obj1; // SAME OBJECT — obj2 is another reference to obj1
obj2.value = 10;
obj1.value;        // 10
```

**Follow-up an interviewer asks next:** "So in Kotlin, Java, Dart, and TypeScript, is there any
way to get Swift's struct behavior?" No — not for a user-defined type. The closest each language
gets is calling a copy operation yourself (a Kotlin `data class.copy()`, a manual Dart/Java copy
constructor, a JS object spread), which copies the fields you asked for and nothing deeper — see
the Senior section for exactly where that stops being enough.

**Pitfall at this level:** a Kotlin-, Java-, or Dart-trained engineer moving to Swift usually
assumes "it's an object, so mutating it through one reference should be visible through another" —
which is exactly backwards for a Swift `struct`. The instinct that's correct in four of these five
languages is the one that misreads the fifth.

## Senior

**Interview question: "Your Swift `Array` is a struct — doesn't that mean every append is an
expensive full copy?"**

No, because of **copy-on-write (COW)**. Swift's standard collections (`Array`, `Dictionary`,
`Set`) are structs, but internally they share a single storage buffer across every holder until
one of them actually mutates it — only then does that holder get its own copy. That's how they
behave like true value types without paying the cost of an eager copy on every assignment.

```swift
var original = [1, 2, 3]
var copy = original       // no copy yet — both share the same buffer internally
copy.append(4)             // mutation triggers the actual copy, now they diverge
original                   // [1, 2, 3] — untouched
```

Given two variables holding the same array, the answer to "does mutating one affect the other" is
always "no, they diverge on first mutation" — a specific, statable fact, not "it depends" the way
it genuinely does for two references to the same class instance. (What makes a Swift `class`
instance itself safe to share across concurrent mutators is a separate topic — ARC and retain
cycles are covered in the Memory Management article, not here.)

**Dart's `const` canonicalization is a different mechanism aimed at a different problem.** A Dart
`const` constructor doesn't give you copy-on-assignment — it deduplicates: two `const` expressions
with the same arguments produce the *identical instance*, and that instance is deeply immutable, so
there's nothing to accidentally mutate through the "other" reference because neither reference can
mutate it at all.

```dart
const p1 = Point(1, 2);
const p2 = Point(1, 2);
identical(p1, p2);   // true — same canonical instance, not a copy
```

Contrast that explicitly with Swift: a Swift struct gives you an independent copy that you're then
free to mutate independently; a Dart `const` object gives you a shared instance that no one can
mutate at all. Same goal — remove shared-mutable-state bugs — two different mechanisms.

**The shallow-copy trap is the strongest cross-language insight in this article: it is the exact
same failure shape in three unrelated-looking places.**

```kotlin
// Kotlin — data class.copy() is shallow. The mutable/reference property escapes the "copy."
data class Cart(val items: MutableList<String>)
val a = Cart(mutableListOf("apple"))
val b = a.copy()          // new Cart instance, but items is the SAME list reference
b.items.add("banana")
a.items                    // ["apple", "banana"] — a saw the mutation too
```

```swift
// Swift — a struct's own stored properties are copied, but a class property nested inside
// is a reference, and that reference is what gets "copied" — i.e., shared.
final class Basket { var items: [String] = [] }
struct Cart { var basket: Basket }
var a = Cart(basket: Basket())
var b = a                  // struct copied, but b.basket is the SAME Basket instance as a.basket
b.basket.items.append("banana")
a.basket.items              // ["banana"] — a saw the mutation too
```

```typescript
// TypeScript — object spread is a SHALLOW copy. A nested object/array is shared, not duplicated.
const cart1 = { items: ['apple'] };
const cart2 = { ...cart1 };   // new top-level object, but items is the SAME array reference
cart2.items.push('banana');
cart1.items;                   // ['apple', 'banana'] — cart1 saw the mutation too
```

All three fail for the same reason: the copy operation only copies one level deep, and a nested
reference type rides along unchanged. The fix is also the same shape in all three — copy nested
reference types explicitly (a deep copy, `structuredClone`, or immutable-by-convention properties
so there's nothing mutable to leak), or avoid holding a reference type as a property of something
you intend to treat as a value at all.

**Follow-up:** "So how do you actually avoid the shallow-copy trap?" Prefer immutable properties
(a Kotlin `List` rather than `MutableList`, a `readonly` TypeScript field, a Swift struct that
avoids nesting a `class`) so there's no mutable reference left to leak; when a deep copy is
genuinely required, do it explicitly (`structuredClone` in JS, a hand-written deep-copy
initializer elsewhere) rather than trusting the language's shallow default to be enough.

## Cross-language comparison table

| | Kotlin | Java | Swift | Dart | TypeScript |
|---|---|---|---|---|---|
| Default for user types | reference | reference | value (via struct) | reference | reference |
| True value types | primitives only | primitives only | struct, enum, tuple | primitives + const-canonicalized | primitives only |
| Copy-on-write collections | no | no | yes (Array, Dictionary, Set) | no | no |
| Shallow-copy trap | `data class.copy()` | manual copy constructors | struct holding a class | const doesn't apply — mutation not allowed | object spread `{...obj}` |

## Pitfalls & trade-offs

- **Mid:** assuming "it's an object, so a mutation through one reference is visible through
  another" — true in Kotlin, Java, Dart, and for JS/TS objects, backwards for a Swift `struct`.
- **Mid:** reaching for a Swift `class` out of habit when a `struct` expresses the intent better —
  value types remove a whole category of shared-mutable-state bugs for free; a `class` should be a
  deliberate choice (identity matters, or copying is genuinely expensive), not a default carried
  over from another language.
- **Senior:** believing a Swift struct's copy-on-write collections mean *every* nested value inside
  it is safe from the shallow-copy trap — COW protects the collection's own storage, not a `class`
  property sitting next to it in the same struct.
- **Senior:** treating `data class.copy()`, a manual copy constructor, or an object spread as a
  deep copy without checking whether any property is itself a reference type — the same trap,
  three languages, one fix: copy nested reference types explicitly or keep them immutable.
- **Senior:** confusing Dart's `const` canonicalization with copy-on-assignment — `const` removes
  mutation entirely by sharing one deeply-immutable instance; it solves the same class of bug as
  Swift value semantics through the opposite mechanism (shared-but-frozen, not copied-and-free).
