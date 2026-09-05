# Mobile Stack Technical Rules

This rule file defines technical standards for code examples across mobile stacks. **Android and
iOS are the two tracked platforms in the domain x band x platform taxonomy** (`ARCHITECTURE.md`,
`plan/domains.md`); React Native and Flutter code-standards below remain for any legacy or
cross-platform-comparison content but are not separate tracked domains.

---

## 🤖 1. Android (Kotlin & Jetpack Compose)

- **Language Version**: Kotlin 2.x standard idioms.
- **Asynchronous Execution**:
  - Prefer `Coroutines` & `Flow` (`StateFlow`, `SharedFlow`) over legacy RxJava or AsyncTasks.
  - Enforce structured concurrency (`viewModelScope`, `repeatOnLifecycle`).
  - Always specify appropriate Coroutine Dispatchers (`Dispatchers.IO`, `Dispatchers.Default`).
- **UI & State**:
  - Use **Jetpack Compose** with Unidirectional Data Flow (UDF).
  - Annotate data classes with `@Immutable` or `@Stable` when demonstrating recomposition optimization.
  - Avoid passing raw `Modifier` instances down deep tree hierarchies without default parameters.

---

## 🍎 2. iOS (Swift & SwiftUI)

- **Language Version**: Swift 6 with strict concurrency checks enabled.
- **Asynchronous Execution**:
  - Use `async/await`, `Task`, `TaskGroup`, and `Actor` model.
  - Mark UI-bound classes/views with `@MainActor`.
  - Ensure all data passed across concurrency boundaries conforms to `Sendable`.
- **UI & State**:
  - Use **SwiftUI** with `@Observable` macro (iOS 17+) or `ObservableObject` / `@Published` where backwards compatibility is discussed.
  - Maintain clean ARC memory management: prevent retain cycles in closures using `[weak self]`.

---

## ⚛️ 3. React Native (TypeScript & New Architecture)

- **Language Version**: TypeScript 5+ with strict mode enabled (`noImplicitAny`, `strictNullChecks`).
- **Architecture**:
  - Focus on React Native **New Architecture** (Fabric Renderer & TurboModules).
  - Highlight JSI (JavaScript Interface) benefits over legacy asynchronous JSON Bridge.
- **UI & Animations**:
  - Use **Reanimated 3+** worklets for 60/120 FPS UI-thread animations.
  - Avoid inline functions or heavy re-renders in list items (`FlashList` / `FlatList`).

---

## 💙 4. Flutter (Dart & Modern State Management)

- **Language Version**: Dart 3+ with sound null safety, record types, pattern matching, and sealed classes.
- **State Management**:
  - Focus on **Riverpod 2+** (`NotifierProvider`, `AsyncNotifier`) or **BLoC 8+**.
  - Avoid `setState` in complex domain components.
- **Rendering & Performance**:
  - Highlight **Impeller** graphics engine optimizations.
  - Use `const` constructors aggressively to minimize widget rebuilds.
