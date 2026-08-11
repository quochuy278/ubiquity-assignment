import { useLayoutEffect } from 'react';

export const APPLICATION_NAME = 'Ubiquity Todo';

function formatDocumentTitle(pageTitle?: string): string {
  return pageTitle ? `${pageTitle} | ${APPLICATION_NAME}` : APPLICATION_NAME;
}

export function useDocumentTitle(pageTitle?: string): void {
  const title = formatDocumentTitle(pageTitle);

  useLayoutEffect(() => {
    document.title = title;

    return () => {
      document.title = APPLICATION_NAME;
    };
  }, [title]);
}
