/**
 * Name of the primary MongoDB connection.
 * Used by the connection setup, `MongooseModule.forFeature` and `@InjectModel`, so all three always match.
 */
export const MONGO_MAIN_CONNECTION = 'main'

/**
 * Page size used when a paginated query gives no `limit`.
 */
export const DEFAULT_PAGE_SIZE = 10
