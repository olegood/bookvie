// The only module in the frontend that talks to the server. Pages and
// components import from `src/api/`, never call `fetch` themselves.

export {
  addBook,
  BOOK_FIELD_KEYS,
  deleteBook,
  editBook,
  setSpineColor,
  useAddBook,
  useDeleteBook,
  useEditBook,
  useSetSpineColor,
  type AddBookOptions,
  type BookFieldKey,
  type BookFields,
  type BookSaveOptions,
  type EditBookOptions,
} from './books.ts'
export {
  COULDNT_SAVE_MESSAGE,
  parseIntentResponse,
  type DuplicateMatch,
  type ErrorCode,
  type FieldError,
  type IntentResult,
} from './envelope.ts'
export {
  COULDNT_EXPORT_MESSAGE,
  ExportError,
  exportAll,
  refreshLastExport,
} from './export.ts'
export { sendIntent } from './intents.ts'
export { restore } from './restore.ts'
export { createQueryClient } from './queryClient.ts'
export {
  useBackupView,
  useBookView,
  useCatalogView,
  useHomeView,
  viewKey,
  type BackupView,
  type BookDetailView,
  type BookReading,
  type BookViewState,
  type CatalogView,
  type CurrentReading,
  type HomeMainBook,
  type HomeView,
  type LibraryMeter,
  type ShelfBook,
  type ViewName,
  type ViewState,
} from './views.ts'
