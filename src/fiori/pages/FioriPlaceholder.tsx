import { DynamicPage, DynamicPageTitle, Title, IllustratedMessage } from '@ui5/webcomponents-react';
import { titleForPage } from '../shell/fioriNavConfig';

// Routed fallback for Fiori pages not yet implemented as real UI5 screens.
// Replaced page-by-page as each workspace is built out.
export default function FioriPlaceholder({ pageId }: { pageId: string }) {
  const title = titleForPage(pageId);
  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">{title}</Title></DynamicPageTitle>}
    >
      <IllustratedMessage name="UnableToLoad" titleText={`${title} — în pregătire`}
        subtitleText="Această pagină Fiori (UI5) este în curs de implementare." />
    </DynamicPage>
  );
}
