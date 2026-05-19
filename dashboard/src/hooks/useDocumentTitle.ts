import { useEffect } from 'react';

/**
 * Custom hook to set document title dynamically.
 * Automatically appends the Aeon Whatsapp suffix.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | Aeon Whatsapp`;

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
