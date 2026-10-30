// The only module in the frontend that talks to the server. Pages and
// components import from `src/api/`, never call `fetch` themselves.

export {
  addBook,
  BOOK_FIELD_KEYS,
  useAddBook,
  type BookFieldKey,
  type BookFields,
} from './books.ts'
export {
  COULDNT_SAVE_MESSAGE,
  parseIntentResponse,
  type ErrorCode,
  type FieldError,
  type IntentResult,
} from './envelope.ts'
export { sendIntent } from './intents.ts'
export { createQueryClient } from './queryClient.ts'
export {
  useCatalogView,
  useHomeView,
  viewKey,
  type CatalogView,
  type HomeView,
  type LibraryMeter,
  type ShelfBook,
  type ViewName,
  type ViewState,
} from './views.ts'
