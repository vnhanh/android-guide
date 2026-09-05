---
id: data-mid-android
title: Room Migrations, DataStore & Cache Invalidation (Mid, Android)
description: Room entities/DAOs/migrations you have actually tested, DataStore and the secure key-value boundary, cache lifetime and invalidation, and paging.
tags: [android, room, datastore, persistence, mid]
lang: en
status: complete
domain: 05-data-persistence-and-offline
band: M
platform: android
level: Mid
sidebar_position: 1
prerequisites: [fundamentals-mid-android, concurrency-mid-android]
outcomes:
  - "Ship a schema migration with a test that would fail if the migration were wrong"
counterpart: data-mid-ios
resources:
  - title: "Room migrations"
    url: "https://developer.android.com/training/data-storage/room/migrating-db-versions"
    date: "2025-03-01"
  - title: "DataStore"
    url: "https://developer.android.com/topic/libraries/architecture/datastore"
    date: "2025-03-01"
  - title: "Paging 3 library"
    url: "https://developer.android.com/topic/libraries/architecture/paging/v3-overview"
    date: "2024-11-01"
  - title: "Testing Room migrations"
    url: "https://developer.android.com/training/data-storage/room/migrating-db-versions#test"
    date: "2024-11-01"
---

# Room Migrations, DataStore & Cache Invalidation

> **Outcome.** Ship a schema migration with a test that would fail if the migration were wrong —
> not a migration that merely compiles and has never been run against real prior-version data.

## 1. Room: entities, DAOs, and migrations you have actually tested

```kotlin
@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val displayName: String,
    val email: String? = null, // added in version 2 — see migration below
)

@Dao
interface UserDao {
    @Query("SELECT * FROM users WHERE id = :id")
    suspend fun find(id: String): UserEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(user: UserEntity)
}
```

```kotlin
val MIGRATION_1_2 = object : Migration(1, 2) {
    override fun migrate(db: SupportSQLiteDatabase) {
        db.execSQL("ALTER TABLE users ADD COLUMN email TEXT")
    }
}
```

The migration above is trivial to get wrong in ways that only surface against real data — a
column added with the wrong default, a rename that silently drops data because SQLite's
`ALTER TABLE` support is limited compared to other engines. The outcome this article names is
specific: a migration test that runs the actual `Migration` object against a database file
seeded with **version-1 schema and real-shaped data**, then asserts the version-2 schema and
data are both correct.

```kotlin
@RunWith(AndroidJUnit4::class)
class MigrationTest {
    @get:Rule
    val helper = MigrationTestHelper(
        InstrumentationRegistry.getInstrumentation(),
        AppDatabase::class.java,
    )

    @Test
    fun migrate1To2_preservesExistingRowsAndAddsEmailColumn() {
        helper.createDatabase(TEST_DB, 1).apply {
            execSQL("INSERT INTO users (id, displayName) VALUES ('1', 'Alex')")
            close()
        }
        val db = helper.runMigrationsAndValidate(TEST_DB, 2, true, MIGRATION_1_2)
        val cursor = db.query("SELECT * FROM users WHERE id = '1'")
        cursor.moveToFirst()
        // If the migration silently dropped or corrupted the existing row, this fails —
        // a migration that merely "compiles" would not have caught that.
        assertEquals("Alex", cursor.getString(cursor.getColumnIndex("displayName")))
    }
}
```

## 2. DataStore and the secure key-value boundary

```kotlin
val Context.settingsDataStore by preferencesDataStore(name = "settings")

suspend fun saveNotificationsEnabled(context: Context, enabled: Boolean) {
    context.settingsDataStore.edit { it[booleanPreferencesKey("notifications_enabled")] = enabled }
}
```

> [!WARNING]
> `DataStore` (like its predecessor `SharedPreferences`) stores its backing file in the app's
> private storage — readable if the device is rooted or the backup is inspected, not encrypted
> at rest by default. It is the right tool for ordinary settings and flags. It is the **wrong**
> tool for a token, a credential, or anything that must remain confidential even against a
> compromised device — that boundary belongs to the Android Keystore-backed `EncryptedSharedPreferences`
> or, more directly, the Keystore APIs themselves (covered in domain 10's Mid article).

## 3. Cache lifetime and invalidation

```kotlin
data class CachedProfile(val profile: UserProfile, val fetchedAt: Instant)

class ProfileRepository(private val api: UserApi, private val dao: UserDao) {
    private val cacheTtl = Duration.ofMinutes(5)

    suspend fun getProfile(userId: String, forceRefresh: Boolean = false): UserProfile {
        val cached = dao.find(userId)
        val isStale = cached == null || Duration.between(cached.fetchedAt, Instant.now()) > cacheTtl
        if (!forceRefresh && !isStale) return cached!!.toDomain()

        val fresh = api.fetchProfile(userId)
        dao.insert(fresh.toEntity(fetchedAt = Instant.now()))
        return fresh.toDomain()
    }
}
```

> [!IMPORTANT]
> A cache with no stated invalidation rule is not a cache, it's a stale-data bug waiting for a
> report. "Cache lifetime" needs an explicit answer for every cached value: a TTL (as above), an
> explicit invalidation event (log out, a push notification saying this data changed), or both —
> "it refreshes eventually" is not a rule a reviewer can check.

## 4. Paging

```kotlin
class UserPagingSource(private val api: UserApi) : PagingSource<Int, UserProfile>() {
    override suspend fun load(params: LoadParams<Int>): LoadResult<Int, UserProfile> {
        val page = params.key ?: 1
        return try {
            val response = api.fetchUsers(page = page, pageSize = params.loadSize)
            LoadResult.Page(
                data = response.items,
                prevKey = if (page == 1) null else page - 1,
                nextKey = if (response.items.isEmpty()) null else page + 1,
            )
        } catch (e: IOException) {
            LoadResult.Error(e)
        }
    }
    override fun getRefreshKey(state: PagingState<Int, UserProfile>): Int? = null
}
```

## Pitfalls & trade-offs

- **A migration that compiles but was never run against seeded prior-version data.** Covered
  above — this is precisely what separates a migration that merely looks right from one that
  is proven right.
- **Storing a token or credential in `DataStore`/`SharedPreferences`.** Works until a security
  review or a rooted-device incident finds it — the Keystore boundary exists specifically for
  this class of data.
- **A cache with no stated invalidation rule.** "It refreshes eventually" cannot be reviewed or
  tested; a TTL or an explicit invalidation event can.
- **Reaching for manual pagination logic instead of the Paging library once a list is large
  enough to need real prefetching, placeholders, and retry behaviour.** The library exists
  because this is easy to get subtly wrong (duplicate items across page boundaries, lost scroll
  position) by hand.
