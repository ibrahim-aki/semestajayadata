// This file augments the `process.env` type definition to include
// environment variables provided by the execution environment.

// The `declare global` block allows us to augment existing global types.
// We are augmenting the `NodeJS.ProcessEnv` interface, which is the standard
// type for `process.env` when using TypeScript with Node.js type definitions.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VITE_FIREBASE_API_KEY: string;
      VITE_FIREBASE_AUTH_DOMAIN: string;
      VITE_FIREBASE_PROJECT_ID: string;
      VITE_FIREBASE_STORAGE_BUCKET: string;
      VITE_FIREBASE_MESSAGING_SENDER_ID: string;
      VITE_FIREBASE_APP_ID: string;
    }
  }
}

// Adding an empty export statement converts this file into a module,
// which is a requirement for using `declare global`.
export {};
